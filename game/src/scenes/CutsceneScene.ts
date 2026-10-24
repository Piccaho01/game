import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { FRIENDS, isCard, isLine, SCENES, speaker, type CardsScene, type CastId, type LineStep, type SpeakerId, type Then } from '../engine/cutscene';
import { DialogBox } from '../ui/dialog';
import { button, buttonPagePoint, hinge, patchPortrait, screenBackdrop, tapeLabel } from '../ui/kit';
import { pixelText } from '../ui/text';
import { hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { tweenAsync, wait } from '../ui/widgets';
import { cardKey, walkKey } from './BootScene';

const BOTTOM = SCREEN_H;
/** Where each of the cast stands on the touch screen: the four at 2x in a row, PATCH's CRT head on the right. */
const SLOTS: Record<CastId, [number, number]> = { callum: [30, 94], nolan: [74, 94], haydon: [118, 94], dani: [162, 94], patch: [222, 52] };
const DIM = 0x5c5c6c;

/** The tape colour for a speaker's name: their own tape, or their outfit colour washed out. */
export function tapeColor(id: SpeakerId) {
  const s = speaker(id);
  return s.tape ? hexToNum(s.tape) : shade(hexToNum(s.color), 0.5);
}

/**
 * Where a card scene hands over when it ends (or is skipped).
 * HOOK (Track A, branch claude/m4b-squad): 'starters' is the "who takes which starter" screen,
 * then the 'starters_done' cards, then 'leader' (the leader pick). Until that screen lands both
 * go to the current pick (NewGameScene: leader, then one starter).
 */
export function handOff(scene: Phaser.Scene, then: Then) {
  scene.scene.start('newgame', { from: then });
}

/**
 * A story told on the owner's illustrated cards (data/cutscenes.json, kind 'cards'): the card on
 * the top screen; on the touch screen, everyone in the scene standing in a row (whoever talks
 * hops, the rest dim), the text box with the speaker's name taped on, and SKIP.
 */
export class CutsceneScene extends Phaser.Scene {
  private id = 'opening';
  private story!: CardsScene;
  private index = 0;
  private card = '';
  private done = false;
  private image!: Phaser.GameObjects.Image;
  /** Covers the top screen for fades (black, or white after a blast). */
  private veil!: Phaser.GameObjects.Rectangle;
  private spot!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private ui!: Phaser.GameObjects.Container;
  private title?: Phaser.GameObjects.Container;
  private cast = new Map<CastId, Phaser.GameObjects.Image | Phaser.GameObjects.Container>();
  private dialog!: DialogBox;

  constructor() { super('cutscene'); }

  init(data: { id?: string }) {
    this.id = data?.id && SCENES[data.id]?.kind === 'cards' ? data.id : 'opening';
  }

  create() {
    this.story = SCENES[this.id] as CardsScene;
    this.index = 0;
    this.card = '';
    this.done = false;
    this.cast.clear();
    this.title = undefined;
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.image = this.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setVisible(false);
    this.spot = this.add.graphics().setDepth(2);
    this.fx = this.add.graphics().setDepth(3);
    this.veil = this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x000000).setOrigin(0, 0).setDepth(4);
    screenBackdrop(this, BOTTOM).setDepth(20);
    hinge(this).setDepth(21);
    this.ui = this.add.container(0, BOTTOM).setDepth(22);
    this.ui.add(pixelText(this, 12, 172, 'tap to continue', { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0, 0.5));
    this.ui.add(button(this, 206, 172, 84, 26, 'SKIP', TONES.neutral, () => this.finish(), { name: 'skip' }));
    this.dialog = new DialogBox(this, 25, { y: BOTTOM + 106, lines: 3 });
    this.dialog.hide();
    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => this.dialog.advance());
    kb?.on('keydown-ENTER', () => this.dialog.advance());
    (window as unknown as Record<string, unknown>).__cutscene = {
      id: () => this.id,
      step: () => this.index,
      card: () => this.card,
      talking: () => this.dialog.open,
      buttonAt: (name: string) => buttonPagePoint(this, this.ui, name),
    };
    void this.run();
  }

  private async run() {
    const steps = this.story.steps;
    for (this.index = 0; this.index < steps.length; this.index++) {
      if (this.done) return;
      const step = steps[this.index];
      if (isCard(step)) await this.showCard(step.card, step.title, step.cast ?? FRIENDS);
      else if (isLine(step)) await this.line(step);
      else if ('fx' in step) {
        if (step.fx === 'boom') await this.boom();
        else if (step.fx === 'dissolve') await this.dissolve();
        else if (step.fx === 'flash') await this.flash();
        else this.cameras.main.shake(400, 0.008);
      }
    }
    this.finish();
  }

  // ---------- cards ----------

  private async showCard(card: string, title: string | undefined, cast: CastId[]) {
    this.dialog.hide();
    this.spot.clear();
    if (this.veil.alpha < 1) {
      this.veil.setFillStyle(0x000000);
      await tweenAsync(this, { targets: this.veil, alpha: 1, duration: 260 });
    }
    if (this.done) return;
    this.card = card;
    this.image.setTexture(cardKey(card)).setVisible(true);
    this.title?.destroy();
    this.title = undefined;
    if (title) {
      this.title = tapeLabel(this, 0, 4, title);
      this.title.x = SCREEN_W - 8 - this.title.getBounds().width;
      this.ui.add(this.title);
    }
    this.setCast(cast);
    await tweenAsync(this, { targets: this.veil, alpha: 0, duration: 420 });
    await wait(this, 250);
  }

  private setCast(ids: CastId[]) {
    for (const o of this.cast.values()) o.destroy();
    this.cast.clear();
    for (const id of ids) {
      const [x, y] = SLOTS[id];
      if (id === 'patch') this.cast.set(id, patchPortrait(this, x, y));
      else if (this.textures.exists(walkKey(id))) {
        // Facing right, towards PATCH: walk sheet row 0 (down-left), mirrored.
        this.cast.set(id, this.add.image(x, y, walkKey(id), 0).setOrigin(0.5, 1).setScale(2).setFlipX(true));
      } else continue;
      this.ui.add(this.cast.get(id)!);
    }
  }

  /** Whoever talks stands bright and hops; everyone else dims. Narration lights everyone. */
  private highlight(who: SpeakerId) {
    const all = who === 'system' || !this.cast.has(who as CastId);
    for (const [id, o] of this.cast) {
      const on = all || id === who;
      if (o instanceof Phaser.GameObjects.Image) {
        if (on) o.clearTint();
        else o.setTint(DIM);
      } else o.setAlpha(on ? 1 : 0.45);
      if (id === who) {
        const [, y] = SLOTS[id];
        this.tweens.killTweensOf(o);
        o.y = y;
        this.tweens.add({ targets: o, y: y - 3, duration: 90, yoyo: true });
      }
    }
  }

  /** Dims the card except a circle (PATCH naming each starter on its pedestal). */
  private focus(f?: [number, number, number]) {
    this.spot.clear();
    if (!f) return;
    const [cx, cy, r] = f;
    this.spot.fillStyle(0x05060e, 0.6);
    for (let y = 0; y < SCREEN_H; y++) {
      const dy = y + 0.5 - cy;
      if (Math.abs(dy) >= r) { this.spot.fillRect(0, y, SCREEN_W, 1); continue; }
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      this.spot.fillRect(0, y, cx - half, 1).fillRect(cx + half, y, SCREEN_W - cx - half, 1);
    }
  }

  private async line(step: LineStep) {
    this.highlight(step.who);
    this.focus(step.focus);
    const s = speaker(step.who);
    await this.dialog.show(step.text, { speaker: s.name || undefined, speakerColor: tapeColor(step.who), waitForTap: !step.cut });
  }

  // ---------- effects ----------

  /** PATCH overheats mid-word: the card glitches, shakes and burns out to white. */
  private async boom() {
    const colours = [0x4aa8ff, 0xc2502f, 0xf2c14e, 0xffffff, 0x1c1b29];
    this.cameras.main.shake(900, 0.01);
    for (let i = 0; i < 10 && !this.done; i++) {
      this.fx.clear();
      for (let k = 0; k < 8; k++) {
        this.fx.fillStyle(colours[(i + k) % colours.length], 0.85);
        this.fx.fillRect(Phaser.Math.Between(0, SCREEN_W - 40), Phaser.Math.Between(0, SCREEN_H - 8), Phaser.Math.Between(20, 120), Phaser.Math.Between(2, 8));
      }
      await wait(this, 70);
    }
    this.fx.clear();
    this.dialog.hide();
    this.veil.setFillStyle(0xffffff).setAlpha(1);
    await wait(this, 500);
  }

  /** The room comes apart square by square: blue pixels over the card, then black. */
  private async dissolve() {
    this.dialog.hide();
    this.cameras.main.flash(300, 255, 255, 255);
    const size = 16;
    const cells: [number, number][] = [];
    for (let y = 0; y < SCREEN_H; y += size) for (let x = 0; x < SCREEN_W; x += size) cells.push([x, y]);
    Phaser.Utils.Array.Shuffle(cells);
    const blues = [0x1d4f9a, 0x2a62b8, 0x4aa8ff, 0x9cc8f0];
    const per = Math.ceil(cells.length / 14);
    for (let i = 0; i < cells.length && !this.done; i += per) {
      for (const [x, y] of cells.slice(i, i + per)) this.fx.fillStyle(blues[(x + y) % blues.length]).fillRect(x, y, size, size);
      await wait(this, 60);
    }
    await wait(this, 200);
    this.veil.setFillStyle(0x000000).setAlpha(1);
    this.fx.clear();
    await wait(this, 600);
  }

  private async flash() {
    this.veil.setFillStyle(0xffffff).setAlpha(1);
    await tweenAsync(this, { targets: this.veil, alpha: 0, duration: 300 });
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    handOff(this, this.story.then);
  }
}
