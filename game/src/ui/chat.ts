import Phaser from 'phaser';
import { speaker, type SpeakerId } from '../engine/cutscene';
import { pxRect, tapeLabel } from './kit';
import { pixelText } from './text';
import { COLORS, css, hexToNum, shade, TEXT_COLORS, TEXT_SIZE } from './theme';
import { wait } from './widgets';

export interface ChatLine { who: SpeakerId; text: string }

const PATCH_SCREEN = 0x1d4f9a;
const TYPING_MS = 420;
const READ_MS = 900;
const BAR_H = 18;

/**
 * THE BOYS group chat: bubbles with a "typing..." wait before each, older messages scrolling up
 * under the header. Drawn in a rect on the top screen (a phone popping up over the overworld).
 * Taps hurry it along (`hurry`).
 */
export class ChatPhone {
  readonly root: Phaser.GameObjects.Container;
  private chat: Phaser.GameObjects.Container;
  private chatH = 0;
  private count: Phaser.GameObjects.Text;
  private mask: Phaser.GameObjects.Graphics;
  private readonly top: number;
  private readonly bottom: number;
  private readonly bubbleW: number;
  /** Set by a tap: the next waits run four times faster. */
  hurry = false;
  stopped = false;

  constructor(private scene: Phaser.Scene, x: number, y: number, private w: number, h: number, title: string, members: number, depth = 8) {
    this.root = scene.add.container(x, y).setDepth(depth);
    const g = scene.add.graphics();
    // A phone: ink bezel, dark screen with scan lines.
    pxRect(g, -3, -3, w + 6, h + 6, COLORS.ink, 4);
    pxRect(g, -2, -2, w + 4, h + 4, COLORS.metal, 3);
    g.fillStyle(0x15172a).fillRect(0, 0, w, h);
    g.fillStyle(0x1b1e36);
    for (let ly = 0; ly < h; ly += 4) g.fillRect(0, ly, w, 1);
    this.chat = scene.add.container(0, 0);
    // Older messages scroll up under the header, and never out of the phone.
    // (The mask stays where the phone ends up: slide it in empty, fade it out.)
    this.mask = scene.make.graphics({}, false).fillStyle(0xffffff).fillRect(x, y + BAR_H, w, h - BAR_H);
    this.chat.setMask(this.mask.createGeometryMask());
    const bar = scene.add.graphics();
    pxRect(bar, 0, 0, w, BAR_H, COLORS.metal, 0);
    bar.fillStyle(COLORS.ink).fillRect(0, BAR_H, w, 1);
    this.count = pixelText(scene, w - 8, 6, '', { color: TEXT_COLORS.dim, size: TEXT_SIZE.tiny }).setOrigin(1, 0);
    this.root.add([g, this.chat, bar, tapeLabel(scene, 8, 4, title), this.count]);
    this.members(members);
    this.top = BAR_H + 4;
    this.bottom = h - 6;
    this.bubbleW = Math.min(168, w - 24);
  }

  members(n: number) {
    this.count.setText(`${n} members`);
  }

  private pause(ms: number) {
    return wait(this.scene, this.hurry ? ms / 4 : ms);
  }

  /** One line: a typing bubble for a while (not for system lines), then the message. */
  async say(line: ChatLine) {
    this.hurry = false;
    if (line.who !== 'system') {
      const dots = this.addTyping(line.who);
      await this.pause(TYPING_MS + Math.min(600, line.text.length * 12));
      // Read its height before it goes: a destroyed object has no data.
      this.chatH -= dots.getData('h') as number;
      dots.destroy();
    }
    if (this.stopped) return;
    this.addMessage(line);
    await this.pause(READ_MS);
  }

  destroy() {
    this.stopped = true;
    this.root.destroy();
    this.mask.destroy();
  }

  private colourOf(who: SpeakerId) {
    if (who === 'patch') return PATCH_SCREEN;
    if (who === 'system') return COLORS.metal;
    return shade(hexToNum(speaker(who).color), -0.15);
  }

  /** A "typing..." bubble for whoever is about to speak. */
  private addTyping(who: SpeakerId) {
    const c = this.scene.add.container(10, 0);
    const g = this.scene.add.graphics();
    pxRect(g, -1, -1, 30, 14, COLORS.ink, 3);
    pxRect(g, 0, 0, 28, 12, this.colourOf(who), 2);
    c.add(g);
    for (let i = 0; i < 3; i++) {
      const d = this.scene.add.rectangle(8 + i * 6, 6, 2, 2, 0xffffff);
      this.scene.tweens.add({ targets: d, alpha: 0.2, duration: 220, yoyo: true, repeat: -1, delay: i * 110 });
      c.add(d);
    }
    this.place(c, 16);
    return c;
  }

  /** Adds a message at the bottom of the chat and scrolls everything above it up. */
  private addMessage(line: ChatLine) {
    const { scene } = this;
    const c = scene.add.container(0, 0);
    if (line.who === 'system') {
      c.add(pixelText(scene, this.w / 2, 0, line.text, { color: TEXT_COLORS.dim, size: TEXT_SIZE.tiny }).setOrigin(0.5, 0));
      this.place(c, 12);
      return;
    }
    const isPatch = line.who === 'patch';
    const who = speaker(line.who);
    const name = pixelText(scene, 12, 0, who.name, { color: isPatch ? TEXT_COLORS.crt : css(shade(hexToNum(who.color), 0.35)), size: TEXT_SIZE.tiny });
    const text = pixelText(scene, 16, 12, line.text, { color: isPatch ? TEXT_COLORS.crt : TEXT_COLORS.light, size: TEXT_SIZE.small, wrap: this.bubbleW - 12 });
    const w = Math.min(this.bubbleW, Math.ceil(text.width) + 12);
    const h = Math.ceil(text.height) + 9;
    const g = scene.add.graphics();
    pxRect(g, 9, 8, w + 2, h + 3, COLORS.ink, 3);
    pxRect(g, 10, 9, w, h, this.colourOf(line.who), 2);
    g.fillStyle(shade(this.colourOf(line.who), 0.25)).fillRect(12, 10, w - 4, 1);
    if (isPatch) {
      // PATCH talks from a CRT: scan lines across his bubble.
      g.fillStyle(0x2a62b8);
      for (let sy = 12; sy < h + 8; sy += 2) g.fillRect(11, sy, w - 2, 1);
    }
    c.add([g, name, text]);
    this.place(c, h + 14);
  }

  private place(c: Phaser.GameObjects.Container, h: number) {
    c.setData('h', h);
    this.chat.add(c);
    c.y = this.top + this.chatH;
    this.chatH += h;
    const overflow = this.top + this.chatH - this.bottom;
    this.chat.y = overflow > 0 ? -overflow : 0;
  }
}
