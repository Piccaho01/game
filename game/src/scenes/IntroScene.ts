import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import introJson from '../data/intro.json';
import { CHARACTERS, type CharacterId } from '../engine/progress';
import { DialogBox } from '../ui/dialog';
import { button, buttonPagePoint, hinge, pxRect, screenBackdrop, tapeLabel } from '../ui/kit';
import { pixelText } from '../ui/text';
import { COLORS, css, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { wait } from '../ui/widgets';
import { standKey, walkKey } from './BootScene';

type From = CharacterId | 'patch' | 'system';
interface ChatLine { from: From; text: string }
const INTRO = introJson as { chatTitle: string; chat: ChatLine[]; meet: { who: string; text: string }[] };

const BOTTOM = SCREEN_H;
const CHAT_TOP = 22;
const CHAT_BOTTOM = SCREEN_H - 6;
const BUBBLE_W = 168;
const PATCH_SCREEN = 0x1d4f9a;
const TYPING_MS = 420;
const READ_MS = 900;

/**
 * The opening (M4 step 5). Part one: the friends' group chat on the top screen, where Callum
 * adds his AI and it builds a world until it overheats and blows up. Part two: PATCH, standing
 * over his crash site in Hollow Rest, explains the mess. Then the leader and starter pick.
 */
export class IntroScene extends Phaser.Scene {
  private chat!: Phaser.GameObjects.Container;
  private chatH = 0;
  private hurry = false;
  private skipped = false;
  private part: 'chat' | 'boom' | 'meet' | 'done' = 'chat';
  private bottom!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Text;

  constructor() { super('intro'); }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.part = 'chat';
    this.hurry = false;
    this.skipped = false;
    this.chatH = 0;
    this.drawPhone();
    screenBackdrop(this, BOTTOM).setDepth(20);
    hinge(this);
    this.bottom = this.add.container(0, BOTTOM).setDepth(21);
    this.hint = pixelText(this, 128, 70, 'tap to hurry them up', { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0.5);
    this.bottom.add(this.hint);
    this.bottom.add(button(this, 200, 168, 92, 28, 'SKIP', TONES.neutral, () => this.finish(), { name: 'skip' }));
    this.input.on('pointerdown', () => { this.hurry = true; });
    (window as unknown as Record<string, unknown>).__intro = {
      part: () => this.part,
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
    void this.run();
  }

  private async run() {
    await this.playChat();
    if (this.skipped) return;
    this.part = 'boom';
    await this.boom();
    if (this.skipped) return;
    this.part = 'meet';
    await this.meet();
    this.finish();
  }

  // ---------- part one: the group chat ----------

  private drawPhone() {
    const g = this.add.graphics();
    g.fillStyle(0x15172a).fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.fillStyle(0x1b1e36);
    for (let y = 0; y < SCREEN_H; y += 4) g.fillRect(0, y, SCREEN_W, 1);
    this.chat = this.add.container(0, 0).setDepth(1);
    // The chat's header bar sits on top, so older messages scroll up underneath it.
    const bar = this.add.graphics().setDepth(5);
    pxRect(bar, 0, 0, SCREEN_W, 18, COLORS.metal, 0);
    bar.fillStyle(COLORS.ink).fillRect(0, 18, SCREEN_W, 1);
    tapeLabel(this, 8, 4, INTRO.chatTitle).setDepth(6);
    pixelText(this, SCREEN_W - 8, 6, '4 members', { color: TEXT_COLORS.dim, size: TEXT_SIZE.tiny }).setOrigin(1, 0).setDepth(6);
  }

  private pause(ms: number) {
    return wait(this, this.hurry ? ms / 4 : ms);
  }

  private async playChat() {
    for (const line of INTRO.chat) {
      if (this.skipped) return;
      this.hurry = false;
      if (line.from !== 'system') {
        const dots = this.addTyping(line.from);
        await this.pause(TYPING_MS + Math.min(600, line.text.length * 12));
        dots.destroy();
        this.chatH -= dots.getData('h') as number;
      }
      if (this.skipped) return;
      await this.addMessage(line);
      await this.pause(READ_MS);
    }
  }

  private colourOf(from: From) {
    if (from === 'patch') return PATCH_SCREEN;
    if (from === 'system') return COLORS.metal;
    return shade(hexToNum(CHARACTERS[from].color), -0.15);
  }

  private nameOf(from: From) {
    return from === 'patch' ? 'PATCH' : from === 'system' ? '' : CHARACTERS[from].name;
  }

  /** A "typing..." bubble for whoever is about to speak. */
  private addTyping(from: From) {
    const c = this.add.container(10, 0);
    const g = this.add.graphics();
    pxRect(g, -1, -1, 30, 14, COLORS.ink, 3);
    pxRect(g, 0, 0, 28, 12, this.colourOf(from), 2);
    c.add(g);
    for (let i = 0; i < 3; i++) {
      const d = this.add.rectangle(8 + i * 6, 6, 2, 2, 0xffffff);
      this.tweens.add({ targets: d, alpha: 0.2, duration: 220, yoyo: true, repeat: -1, delay: i * 110 });
      c.add(d);
    }
    this.place(c, 16);
    return c;
  }

  /** Adds a message at the bottom of the chat and scrolls everything above it up. */
  private async addMessage(line: ChatLine) {
    const c = this.add.container(0, 0);
    if (line.from === 'system') {
      const t = pixelText(this, SCREEN_W / 2, 0, line.text, { color: TEXT_COLORS.dim, size: TEXT_SIZE.tiny }).setOrigin(0.5, 0);
      c.add(t);
      this.place(c, 12);
      return;
    }
    const isPatch = line.from === 'patch';
    const name = pixelText(this, 12, 0, this.nameOf(line.from), { color: isPatch ? TEXT_COLORS.crt : css(shade(hexToNum(isPatch ? '#4aa8ff' : CHARACTERS[line.from as CharacterId].color), 0.35)), size: TEXT_SIZE.tiny });
    const text = pixelText(this, 16, 12, line.text, { color: isPatch ? TEXT_COLORS.crt : TEXT_COLORS.light, size: TEXT_SIZE.small, wrap: BUBBLE_W - 12 });
    const w = Math.min(BUBBLE_W, Math.ceil(text.width) + 12);
    const h = Math.ceil(text.height) + 9;
    const g = this.add.graphics();
    pxRect(g, 9, 8, w + 2, h + 3, COLORS.ink, 3);
    pxRect(g, 10, 9, w, h, this.colourOf(line.from), 2);
    g.fillStyle(shade(this.colourOf(line.from), 0.25)).fillRect(12, 10, w - 4, 1);
    if (isPatch) {
      // PATCH talks from a CRT: scan lines across his bubble.
      g.fillStyle(0x2a62b8);
      for (let y = 12; y < h + 8; y += 2) g.fillRect(11, y, w - 2, 1);
    }
    c.add([g, name, text]);
    this.place(c, h + 14);
  }

  private place(c: Phaser.GameObjects.Container, h: number) {
    c.setData('h', h);
    this.chat.add(c);
    c.y = CHAT_TOP + this.chatH;
    this.chatH += h;
    const overflow = CHAT_TOP + this.chatH - CHAT_BOTTOM;
    this.chat.y = overflow > 0 ? -overflow : 0;
  }

  /** PATCH overheats mid-word: the screen glitches, shakes and burns out to white. */
  private async boom() {
    const cam = this.cameras.main;
    const glitch = this.add.graphics().setDepth(30);
    const colours = [0x4aa8ff, 0xc2502f, 0xf2c14e, 0xffffff, 0x1c1b29];
    cam.shake(900, 0.01);
    for (let i = 0; i < 9; i++) {
      glitch.clear();
      for (let k = 0; k < 7; k++) {
        glitch.fillStyle(colours[(i + k) % colours.length], 0.85);
        glitch.fillRect(Phaser.Math.Between(0, SCREEN_W - 40), Phaser.Math.Between(0, SCREEN_H - 8), Phaser.Math.Between(20, 120), Phaser.Math.Between(2, 8));
      }
      await wait(this, 70);
    }
    cam.flash(700, 255, 255, 255);
    glitch.clear();
    this.chat.setVisible(false);
    await wait(this, 500);
    cam.fadeOut(500, 0, 0, 0);
    await wait(this, 900);
  }

  // ---------- part two: PATCH meets them ----------

  private async meet() {
    const cam = this.cameras.main;
    // Clear the phone; the touch screen and the hinge (depth 10+) stay.
    [...this.children.list].filter((o) => (o as unknown as Phaser.GameObjects.Components.Depth).depth < 10).forEach((o) => o.destroy());
    this.drawCrashSite();
    this.hint.setText('tap to continue');
    const dialog = new DialogBox(this, 25);
    cam.fadeIn(700, 0, 0, 0);
    await wait(this, 800);
    for (const l of INTRO.meet) {
      if (this.skipped) return;
      await dialog.show(l.text, { speaker: l.who, waitForTap: true });
    }
  }

  /** Night in Hollow Rest: the crater PATCH made, smoke, PATCH, and the four of them coming round. */
  private drawCrashSite() {
    const g = this.add.graphics();
    const sky = [0x141a33, 0x1a2140, 0x222a4c, 0x2b3458];
    sky.forEach((c, i) => g.fillStyle(c).fillRect(0, i * 14, SCREEN_W, 14));
    g.fillStyle(0xf3ead2);
    for (const [x, y] of [[20, 8], [64, 22], [110, 6], [150, 30], [200, 12], [236, 26], [88, 40]]) g.fillRect(x, y, 1, 1);
    // Hill line and grass.
    g.fillStyle(0x2e4a34).fillRect(0, 56, SCREEN_W, SCREEN_H - 56);
    g.fillStyle(0x3a5c3c).fillRect(0, 62, SCREEN_W, SCREEN_H - 62);
    g.fillStyle(0x45693f).fillRect(0, 74, SCREEN_W, SCREEN_H - 74);
    // The crater, behind them: scorched ring, dark centre, a trench running off to the left.
    g.fillStyle(0x3a2e24).fillEllipse(132, 100, 100, 30);
    g.fillStyle(0x241c18).fillEllipse(132, 100, 76, 20);
    g.fillStyle(0x15110f).fillEllipse(132, 101, 48, 11);
    g.fillStyle(0x3a2e24).fillRect(30, 96, 56, 7);
    g.fillStyle(0x241c18).fillRect(30, 98, 56, 3);
    // Debris: bent panels in PATCH's colours.
    for (const [x, y, w, h, c] of [[104, 90, 8, 4, 0xc2502f], [158, 94, 6, 5, 0x5a84c0], [92, 106, 7, 3, 0xe8dcc0], [170, 106, 5, 3, 0x5a84c0]] as const) {
      pxRect(g, x - 1, y - 1, w + 2, h + 2, COLORS.ink, 0);
      g.fillStyle(c).fillRect(x, y, w, h);
    }
    // Smoke rising from the middle.
    for (let i = 0; i < 6; i++) {
      const puff = this.add.circle(132 + Phaser.Math.Between(-6, 6), 98, Phaser.Math.Between(3, 6), 0xb8b2a2, 0.5);
      this.tweens.add({ targets: puff, y: 30, x: puff.x + Phaser.Math.Between(-10, 14), alpha: 0, scale: 2.4, duration: 2600, delay: i * 430, repeat: -1 });
    }
    // Everyone at 2x, so PATCH stands about twice their height.
    if (this.textures.exists(standKey('patch'))) this.add.image(208, 146, standKey('patch')).setOrigin(0.5, 1).setScale(2);
    // Walk sheet rows: 0 down, 2 right (towards PATCH).
    const friends: [CharacterId, number, number, number][] = [['haydon', 22, 136, 2], ['callum', 52, 140, 2], ['nolan', 82, 138, 0], ['dani', 36, 150, 2]];
    for (const [id, x, y, row] of friends) {
      if (this.textures.exists(walkKey(id))) this.add.image(x, y, walkKey(id), row * 3).setOrigin(0.5, 1).setScale(2);
    }
  }

  private finish() {
    if (this.part === 'done') return;
    this.part = 'done';
    this.skipped = true;
    this.scene.start('newgame');
  }
}
