import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { CHARACTERS, SQUAD, type CharacterId } from '../engine/progress';
import { SCRIPTS, speakerColor, speakerName, stepsFor, type Speaker, type Step } from '../engine/story';
import { DialogBox } from '../ui/dialog';
import { button, buttonPagePoint, card, hinge, patchPortrait, pxRect, screenBackdrop, tapeLabel } from '../ui/kit';
import { sfx, type Sfx } from '../ui/sfx';
import { pixelText } from '../ui/text';
import { COLORS, css, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { tweenAsync, wait } from '../ui/widgets';
import { walkKey } from './BootScene';

/** The owner's cutscene cards, fitted to the top screen (art/tools/card2screen.py): 384x288, shown at 2/3. */
const cardFiles = import.meta.glob('../../art/cutscenes/out/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const CARDS: Record<string, string> = Object.fromEntries(
  Object.entries(cardFiles).map(([path, url]) => [path.split('/').pop()!.replace(/\.png$/, ''), url]),
);
const cardKey = (id: string) => `card:${id}`;

const BOTTOM = SCREEN_H;
/** The touch screen: the beat's title and SKIP, the five of them standing, the text box. */
const CAST_FLOOR = BOTTOM + 98;
const BOX = { x: 6, y: BOTTOM + 112, w: SCREEN_W - 12, h: 60, lines: 3 };
/** The phone the group chat shows on (top screen). */
const PHONE = { x: 52, y: 6, w: 152, h: 180 };
const BUBBLE_W = 112;
const PATCH_SCREEN = 0x1d4f9a;

export interface CutsceneData {
  id: string;
  /** Who took which starter (for `reactions`). */
  picks?: Partial<Record<CharacterId, string>>;
  /** Played over another scene (the map, the pick screen): the top screen stays theirs unless a card comes up. */
  overlay?: boolean;
  onDone?: () => void;
}

/**
 * Plays a story scene over the calling scene (which pauses) and resolves when it ends or is
 * skipped. The hook other scenes use: `await playCutscene(this, 'first_step')`.
 */
export function playCutscene(from: Phaser.Scene, id: string, extra: Omit<CutsceneData, 'id' | 'overlay' | 'onDone'> = {}) {
  return new Promise<void>((resolve) => {
    from.scene.pause();
    from.scene.launch('cutscene', { ...extra, id, overlay: true, onDone: () => { from.scene.resume(); resolve(); } } satisfies CutsceneData);
    from.scene.bringToTop('cutscene');
  });
}

/**
 * Cutscenes (Track B): the owner's cards on the top screen, the lines on the touch screen with
 * who's talking (any of the four, PATCH, Connor, narration), the group chat on a phone, tap to
 * advance, SKIP. Full-screen for the opening; an overlay for scenes on the map.
 */
export class CutsceneScene extends Phaser.Scene {
  private data0!: CutsceneData;
  private steps: Step[] = [];
  private index = 0;
  private ended = false;
  private cardImg?: Phaser.GameObjects.Image;
  private spot?: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private ui!: Phaser.GameObjects.Container;
  private cast = new Map<string, Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject>();
  private castBase = new Map<string, number>();
  private titleTape?: Phaser.GameObjects.Container;
  private dialog!: DialogBox;
  private hint!: Phaser.GameObjects.Text;
  private phone?: { root: Phaser.GameObjects.Container; list: Phaser.GameObjects.Container; count: Phaser.GameObjects.Text; h: number; title: string };
  private tapped?: () => void;

  constructor() { super('cutscene'); }

  init(data: CutsceneData) {
    this.data0 = data;
  }

  preload() {
    const ids = new Set(SCRIPTS[this.data0.id]?.steps.map((s) => s.card).filter((c): c is string => !!c));
    for (const id of ids) if (CARDS[id] && !this.textures.exists(cardKey(id))) this.load.image(cardKey(id), CARDS[id]);
  }

  create() {
    const script = SCRIPTS[this.data0.id];
    if (!script) throw new Error(`Unknown cutscene: ${this.data0.id}`);
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.steps = stepsFor(script, this.data0.picks);
    this.index = 0;
    this.ended = false;
    this.cardImg = undefined;
    this.spot = undefined;
    this.phone = undefined;
    this.cast.clear();
    this.castBase.clear();
    const overlay = !!this.data0.overlay;
    // Full-screen: black until the first card. Over the map: a catch-all so taps never reach it.
    const blocker = this.add.rectangle(0, 0, SCREEN_W, SCREEN_H * 2, 0x000000, overlay ? 0.001 : 1).setOrigin(0, 0).setDepth(-10).setInteractive();
    blocker.on('pointerdown', () => this.tapped?.());
    this.fx = this.add.graphics().setDepth(9);
    screenBackdrop(this, BOTTOM).setDepth(20);
    hinge(this).setDepth(21);
    this.ui = this.add.container(0, BOTTOM).setDepth(22);
    this.ui.add(button(this, 222, 15, 52, 20, 'SKIP', TONES.neutral, () => this.skip(), { name: 'skip', size: TEXT_SIZE.small }));
    this.drawCast();
    this.dialog = new DialogBox(this, 24, BOX);
    this.dialog.hide();
    this.hint = pixelText(this, SCREEN_W / 2, BOTTOM + 181, 'tap to continue', { color: TEXT_COLORS.dim, size: TEXT_SIZE.tiny }).setOrigin(0.5).setDepth(23);
    this.tweens.add({ targets: this.hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    this.input.keyboard?.on('keydown-SPACE', () => { this.dialog.advance(); this.tapped?.(); });
    this.input.keyboard?.on('keydown-ENTER', () => { this.dialog.advance(); this.tapped?.(); });
    this.input.keyboard?.on('keydown-ESC', () => this.skip());
    (window as unknown as Record<string, unknown>).__cutscene = {
      id: () => this.data0.id,
      step: () => this.index,
      steps: () => this.steps.length,
      done: () => this.ended,
      buttonAt: (name: string) => buttonPagePoint(this, this.ui, name),
    };
    void this.run();
  }

  // ---------- the touch screen ----------

  /** The four and PATCH standing in a row on the touch screen; whoever talks steps forward. */
  private drawCast() {
    const floor = this.add.graphics().setDepth(21);
    floor.fillStyle(0x000000, 0.25).fillRoundedRect(8, CAST_FLOOR - 4, SCREEN_W - 16, 8, 4);
    SQUAD.forEach((id, i) => {
      const x = 30 + i * 44;
      const sh = this.add.ellipse(x, CAST_FLOOR, 26, 5, 0x000000, 0.35).setDepth(21);
      void sh;
      if (this.textures.exists(walkKey(id))) {
        const img = this.add.image(x, CAST_FLOOR + 1, walkKey(id), 0).setOrigin(0.5, 1).setScale(2).setDepth(22);
        this.cast.set(id, img);
      } else {
        this.cast.set(id, pixelText(this, x, CAST_FLOOR - 30, CHARACTERS[id].name[0], { color: TEXT_COLORS.light, size: 24 }).setOrigin(0.5).setDepth(22));
      }
    });
    const patch = patchPortrait(this, 222, CAST_FLOOR - 26).setDepth(22);
    this.cast.set('patch', patch);
    for (const [id, o] of this.cast) this.castBase.set(id, o.y);
  }

  /** The speaker steps up and the rest dim a little; narration and the chat light nobody. */
  private focus(who?: Speaker) {
    for (const [id, o] of this.cast) {
      const on = !who || !this.cast.has(who) || id === who;
      this.tweens.killTweensOf(o);
      const base = this.castBase.get(id)!;
      this.tweens.add({ targets: o, y: id === who ? base - 4 : base, duration: 120, ease: 'Quad.easeOut' });
      const tint = on ? 0xffffff : 0x7c7f98;
      if ('setTint' in o) (o as unknown as Phaser.GameObjects.Image).setTint(tint);
      else (o as Phaser.GameObjects.Container).list.forEach((c) => (c as Phaser.GameObjects.Graphics).setAlpha(on ? 1 : 0.6));
    }
  }

  private setTitle(text?: string) {
    if (!text) return;
    this.titleTape?.destroy();
    this.titleTape = tapeLabel(this, 8, 9, text.toUpperCase());
    this.ui.add(this.titleTape);
    this.titleTape.setAlpha(0).x = -20;
    this.tweens.add({ targets: this.titleTape, x: 8, alpha: 1, duration: 220, ease: 'Quad.easeOut' });
  }

  // ---------- running ----------

  private async run() {
    // The first card fades up from black.
    for (this.index = 0; this.index < this.steps.length; this.index++) {
      if (this.ended) return;
      await this.play(this.steps[this.index]);
    }
    this.end();
  }

  private async play(st: Step) {
    this.setTitle(st.title);
    if (st.sfx) sfx(st.sfx as Sfx);
    if (st.card) await this.showCard(st.card, st.enter ?? 'fade');
    if (this.ended) return;
    if (st.spot !== undefined) this.setSpot(st.spot);
    if (st.phone === 'open') await this.openPhone(st.members ?? 4);
    if (st.fx) await this.effect(st.fx);
    if (this.ended) return;
    if (st.chat && st.text) {
      await this.chatLine(st.chat, st.text);
      if (st.members !== undefined) this.setMembers(st.members);
      if (st.auto) await wait(this, st.auto);
      else await this.waitTap();
    } else if (st.who && st.text) {
      this.focus(st.who);
      const name = speakerName(st.who);
      await this.dialog.show(st.text, {
        speaker: name || undefined,
        color: name ? shade(hexToNum(speakerColor(st.who)), -0.15) : undefined,
        textColor: st.who === 'narration' ? TEXT_COLORS.inkSoft : undefined,
        waitForTap: !st.auto,
        hold: st.auto,
      });
    }
    if (st.phone === 'close') await this.closePhone();
  }

  private waitTap() {
    return new Promise<void>((resolve) => {
      this.tapped = () => { this.tapped = undefined; sfx('text'); resolve(); };
    });
  }

  private async showCard(id: string, enter: 'fade' | 'slide' | 'cut') {
    const key = cardKey(id);
    const old = this.cardImg;
    const img = this.textures.exists(key)
      ? this.add.image(0, 0, key).setOrigin(0, 0).setScale(SCREEN_W / this.textures.get(key).getSourceImage().width)
      : this.placeholderCard(id);
    img.setDepth(0);
    this.cardImg = img as Phaser.GameObjects.Image;
    this.setSpot(null);
    if (enter === 'cut' || !old) {
      old?.destroy();
      if (enter === 'fade' || (!old && enter !== 'cut')) {
        img.setAlpha(0);
        await tweenAsync(this, { targets: img, alpha: 1, duration: 600 });
      }
      return;
    }
    if (enter === 'slide') {
      sfx('swish');
      img.x = SCREEN_W;
      await Promise.all([
        tweenAsync(this, { targets: img, x: 0, duration: 380, ease: 'Cubic.easeInOut' }),
        tweenAsync(this, { targets: old, x: -SCREEN_W, duration: 380, ease: 'Cubic.easeInOut' }),
      ]);
    } else {
      img.setAlpha(0);
      await tweenAsync(this, { targets: old, alpha: 0, duration: 300 });
      await tweenAsync(this, { targets: img, alpha: 1, duration: 500 });
    }
    old.destroy();
  }

  /** A card that hasn't been drawn yet: its name on a dark board (never invented art). */
  private placeholderCard(id: string) {
    const g = this.add.graphics();
    g.fillStyle(0x15172a).fillRect(0, 0, SCREEN_W, SCREEN_H);
    const t = pixelText(this, SCREEN_W / 2, SCREEN_H / 2, `[card ${id}]`, { color: TEXT_COLORS.dim, size: TEXT_SIZE.small });
    t.setOrigin(0.5);
    const c = this.add.container(0, 0, [g, t]);
    return c as unknown as Phaser.GameObjects.Image;
  }

  /** Dims the card except one box (PATCH naming a starter), with a gold frame round it. */
  private setSpot(r: [number, number, number, number] | null) {
    this.spot?.destroy();
    this.spot = undefined;
    if (!r) return;
    const [x, y, w, h] = r;
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x0b0c16, 0.6);
    g.fillRect(0, 0, SCREEN_W, y).fillRect(0, y + h, SCREEN_W, SCREEN_H - y - h).fillRect(0, y, x, h).fillRect(x + w, y, SCREEN_W - x - w, h);
    g.lineStyle(1, COLORS.gold).strokeRoundedRect(x, y, w, h, 4);
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 200 });
    this.spot = g;
  }

  private async effect(fx: Step['fx']) {
    const cam = this.cameras.main;
    if (fx === 'shake') cam.shake(500, 0.008);
    else if (fx === 'flash') cam.flash(400, 255, 255, 255);
    else if (fx === 'boom') {
      // The room comes apart square by square: blue pixel blocks, a white flash, then black.
      sfx('super');
      cam.shake(900, 0.012);
      const colours = [0x4aa8ff, 0x1d4f9a, 0xa6d8ff, 0xffffff, 0x2a62b8];
      for (let i = 0; i < 14; i++) {
        for (let k = 0; k < 10 + i * 4; k++) {
          const s = 4 * Phaser.Math.Between(1, 4);
          this.fx.fillStyle(colours[(i + k) % colours.length], 0.95);
          this.fx.fillRect(4 * Phaser.Math.Between(0, SCREEN_W / 4), 4 * Phaser.Math.Between(0, SCREEN_H / 4), s, s);
        }
        await wait(this, 55);
        if (this.ended) return;
      }
      cam.flash(700, 255, 255, 255);
      this.fx.clear().fillStyle(0x000000).fillRect(0, 0, SCREEN_W, SCREEN_H);
      this.cardImg?.destroy();
      this.cardImg = undefined;
      this.setSpot(null);
      await wait(this, 1100);
      this.fx.clear();
    }
  }

  // ---------- the group chat ----------

  private async openPhone(members: number) {
    const title = SCRIPTS[this.data0.id].chatTitle ?? 'THE BOYS';
    const root = this.add.container(0, 0).setDepth(6);
    const g = this.add.graphics();
    // The leader's phone: a dark slab with a screen, the chat's header bar on top.
    g.fillStyle(0x000000, 0.35).fillRoundedRect(PHONE.x - 2, PHONE.y + 3, PHONE.w + 4, PHONE.h, 12);
    card(g, PHONE.x - 4, PHONE.y - 2, PHONE.w + 8, PHONE.h + 4, 0x101220, 11);
    g.fillStyle(0x15172a).fillRoundedRect(PHONE.x, PHONE.y + 2, PHONE.w, PHONE.h - 4, 8);
    g.fillStyle(0x1b1e36);
    for (let y = PHONE.y + 24; y < PHONE.y + PHONE.h - 4; y += 4) g.fillRect(PHONE.x + 1, y, PHONE.w - 2, 1);
    pxRect(g, PHONE.x, PHONE.y + 2, PHONE.w, 20, COLORS.metal, 4);
    g.fillStyle(COLORS.ink).fillRect(PHONE.x, PHONE.y + 22, PHONE.w, 1);
    root.add(g);
    root.add(tapeLabel(this, PHONE.x + 6, PHONE.y + 6, title));
    const count = pixelText(this, PHONE.x + PHONE.w - 6, PHONE.y + 8, '', { color: TEXT_COLORS.dim, size: TEXT_SIZE.tiny }).setOrigin(1, 0);
    root.add(count);
    const list = this.add.container(0, 0);
    const mask = this.make.graphics({}, false).fillStyle(0xffffff).fillRect(PHONE.x, PHONE.y + 23, PHONE.w, PHONE.h - 27);
    list.setMask(mask.createGeometryMask());
    root.add(list);
    this.phone = { root, list, count, h: 0, title };
    this.setMembers(members);
    root.y = SCREEN_H;
    this.focus(undefined);
    await tweenAsync(this, { targets: root, y: 0, duration: 320, ease: 'Back.easeOut' });
  }

  private setMembers(n: number) {
    this.phone?.count.setText(`${n} members`);
  }

  private async closePhone() {
    const p = this.phone;
    if (!p) return;
    await tweenAsync(this, { targets: p.root, y: SCREEN_H, duration: 260, ease: 'Quad.easeIn' });
    p.root.destroy();
    this.phone = undefined;
  }

  private chatColour(from: Speaker) {
    if (from === 'patch') return PATCH_SCREEN;
    return shade(hexToNum(speakerColor(from)), -0.15);
  }

  /** "typing..." from whoever's next, then their message at the bottom; older ones scroll up. */
  private async chatLine(from: Speaker, text: string) {
    if (!this.phone) await this.openPhone(4);
    const p = this.phone!;
    if (from !== 'system') {
      const dots = this.add.container(PHONE.x + 6, 0);
      const g = this.add.graphics();
      pxRect(g, 0, 0, 28, 12, this.chatColour(from), 4);
      dots.add(g);
      for (let i = 0; i < 3; i++) {
        const d = this.add.rectangle(8 + i * 6, 6, 2, 2, 0xffffff);
        this.tweens.add({ targets: d, alpha: 0.2, duration: 220, yoyo: true, repeat: -1, delay: i * 110 });
        dots.add(d);
      }
      this.place(dots, 16);
      await wait(this, 380 + Math.min(500, text.length * 10));
      p.h -= 16;
      dots.destroy();
      if (this.ended) return;
    }
    sfx(from === 'system' ? 'tap' : 'banner');
    const c = this.add.container(0, 0);
    if (from === 'system') {
      c.add(pixelText(this, PHONE.x + PHONE.w / 2, 0, text, { color: TEXT_COLORS.dim, size: TEXT_SIZE.tiny }).setOrigin(0.5, 0));
      this.place(c, 12);
      return;
    }
    const col = this.chatColour(from);
    const isPatch = from === 'patch';
    const name = pixelText(this, PHONE.x + 8, 0, speakerName(from), { color: isPatch ? TEXT_COLORS.crt : css(shade(col, 0.45)), size: TEXT_SIZE.tiny });
    const body = pixelText(this, PHONE.x + 12, 11, text, { color: isPatch ? TEXT_COLORS.crt : TEXT_COLORS.light, size: TEXT_SIZE.small, wrap: BUBBLE_W - 12 });
    const w = Math.min(BUBBLE_W, Math.ceil(body.width) + 12);
    const h = Math.ceil(body.height) + 7;
    const g = this.add.graphics();
    pxRect(g, PHONE.x + 5, 8, w + 2, h + 2, COLORS.ink, 4);
    pxRect(g, PHONE.x + 6, 9, w, h, col, 3);
    g.fillStyle(shade(col, 0.25)).fillRect(PHONE.x + 9, 10, w - 6, 1);
    c.add([g, name, body]);
    this.place(c, h + 13);
    c.setAlpha(0);
    c.x = -6;
    this.tweens.add({ targets: c, alpha: 1, x: 0, duration: 140 });
  }

  private place(c: Phaser.GameObjects.Container, h: number) {
    const p = this.phone!;
    p.list.add(c);
    const top = PHONE.y + 28;
    c.y = top + p.h;
    p.h += h;
    const overflow = top + p.h - (PHONE.y + PHONE.h - 6);
    this.tweens.add({ targets: p.list, y: overflow > 0 ? -overflow : 0, duration: 140 });
  }

  // ---------- the end ----------

  private skip() {
    if (this.ended) return;
    sfx('confirm');
    this.end();
  }

  private end() {
    if (this.ended) return;
    this.ended = true;
    this.tapped = undefined;
    const next = SCRIPTS[this.data0.id].next;
    if (this.data0.overlay) {
      // Back to the scene underneath as it was (a camera fade would black out the map too).
      const done = this.data0.onDone;
      this.scene.stop();
      done?.();
      return;
    }
    const cam = this.cameras.main;
    cam.fadeOut(260, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => this.scene.start(next?.scene ?? 'overworld', next?.data));
  }
}
