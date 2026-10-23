import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W } from '../config';
import { judgeSeal, type Grade, type SealPattern, type SealResult, type SealWindows } from '../engine/seal';
import { pxRect, stitches } from '../ui/kit';
import { COLORS } from '../ui/theme';
import { pixelText } from '../ui/text';

const COUNT_IN_MS = 1200;
const TARGET_R = 16;
const START_R = 46;
const GRADE_COLORS: Record<Grade, string> = { perfect: '#fff070', good: '#a0e8ff', miss: '#ff7060' };

/**
 * The seal (bible §7) as played: rings close on the target, tap anywhere as each one lands.
 * Live feedback follows the same rules as `judgeSeal`, which makes the final call.
 */
export class SealMinigame {
  private g: Phaser.GameObjects.Graphics;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private taps: number[] = [];
  private live: (Grade | null)[];
  private t0 = 0;
  private color: number;

  constructor(
    private scene: Phaser.Scene,
    private at: { x: number; y: number },
    private pattern: SealPattern,
    private windows: SealWindows,
    private hpFrac: number,
    typeColor: string,
  ) {
    this.color = Phaser.Display.Color.HexStringToColor(typeColor).color;
    this.live = pattern.beats.map(() => null);
    this.g = scene.add.graphics().setDepth(3);
    this.objects.push(this.g);
  }

  play(): Promise<SealResult> {
    const { scene, pattern } = this;
    // Bottom screen: the whole screen is the tap pad.
    const pad = scene.add.graphics();
    pad.fillStyle(COLORS.ink, 0.6).fillRect(0, SCREEN_H, SCREEN_W, SCREEN_H);
    pxRect(pad, 16, SCREEN_H + 44, SCREEN_W - 32, SCREEN_H - 60, this.color, 3, 0.18);
    stitches(pad, 19, SCREEN_H + 47, SCREEN_W - 38, SCREEN_H - 66, this.color);
    this.objects.push(
      pad,
      pixelText(scene, SCREEN_W / 2, SCREEN_H + 14, `${pattern.name} seal`, { color: '#ffffff', size: 10, shadow: '#000000' }).setOrigin(0.5, 0),
      pixelText(scene, SCREEN_W / 2, SCREEN_H + 30, pattern.desc, { color: '#c0c0d8', size: 6, wrap: SCREEN_W - 24 }).setOrigin(0.5, 0),
      pixelText(scene, SCREEN_W / 2, SCREEN_H + 112, 'TAP!', { color: '#ffffff', size: 24, shadow: '#000000' }).setOrigin(0.5),
    );
    const cue = pixelText(scene, this.at.x, this.at.y - 40, 'Ready...', { color: '#ffffff', size: 8, shadow: '#000000' }).setOrigin(0.5).setDepth(4);
    this.objects.push(cue);
    scene.time.delayedCall(COUNT_IN_MS * 0.6, () => cue.setText('Seal!'));
    scene.time.delayedCall(COUNT_IN_MS + 200, () => cue.destroy());

    this.t0 = scene.time.now + COUNT_IN_MS + pattern.leadMs;
    const end = pattern.beats[pattern.beats.length - 1] + this.windows.good + 400;

    return new Promise((resolve) => {
      const onTap = () => this.tap(scene.time.now - this.t0);
      const onUpdate = () => {
        const t = scene.time.now - this.t0;
        this.draw(t);
        this.markMisses(t);
        if (t > end) {
          scene.input.off('pointerdown', onTap);
          scene.events.off('update', onUpdate);
          const result = judgeSeal(pattern.beats, this.taps, this.windows, this.hpFrac);
          for (const o of this.objects) o.destroy();
          resolve(result);
        }
      };
      scene.input.on('pointerdown', onTap);
      scene.events.on('update', onUpdate);
    });
  }

  /** Ms from now until each beat (for tests that tap on the beat). */
  msToBeats(): number[] {
    const t = this.scene.time.now - this.t0;
    return this.pattern.beats.map((b) => b - t);
  }

  private tap(t: number) {
    this.taps.push(t);
    const { beats } = this.pattern;
    const i = beats.findIndex((b, j) => this.live[j] === null && Math.abs(t - b) <= this.windows.good);
    if (i < 0) {
      // Taps before the first ring arrives are nerves, not strays worth shouting about.
      if (t > -this.pattern.leadMs) this.pop('?', '#8888a0');
      return;
    }
    const grade: Grade = Math.abs(t - beats[i]) <= this.windows.perfect ? 'perfect' : 'good';
    this.live[i] = grade;
    this.pop(grade.toUpperCase(), GRADE_COLORS[grade]);
  }

  private markMisses(t: number) {
    this.pattern.beats.forEach((b, i) => {
      if (this.live[i] === null && t > b + this.windows.good) {
        this.live[i] = 'miss';
        this.pop('MISS', GRADE_COLORS.miss);
      }
    });
  }

  private draw(t: number) {
    const { g, at, pattern } = this;
    g.clear();
    // The seal: a ring of the target's type colour, filling in as beats land.
    const done = this.live.filter((x) => x === 'perfect' || x === 'good').length;
    g.fillStyle(this.color, 0.12 + 0.5 * (done / pattern.beats.length)).fillCircle(at.x, at.y, TARGET_R);
    g.lineStyle(2, this.color).strokeCircle(at.x, at.y, TARGET_R);
    g.lineStyle(1, 0xffffff, 0.6).strokeCircle(at.x, at.y, TARGET_R - 4);
    pattern.beats.forEach((b, i) => {
      if (this.live[i] !== null) return;
      const left = b - t;
      if (left > pattern.leadMs || left < -this.windows.good) return;
      const r = TARGET_R + (START_R - TARGET_R) * Math.max(0, left) / pattern.leadMs;
      g.lineStyle(2, 0xffffff, Math.min(1, 1.4 - left / pattern.leadMs)).strokeCircle(at.x, at.y, r);
    });
  }

  private pop(text: string, color: string) {
    const p = pixelText(this.scene, this.at.x, this.at.y - TARGET_R - 8, text, { color, size: 8, shadow: '#000000' }).setOrigin(0.5).setDepth(4);
    this.objects.push(p);
    this.scene.tweens.add({ targets: p, y: p.y - 12, alpha: 0, duration: 500, onComplete: () => p.destroy() });
  }
}
