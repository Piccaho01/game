import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { evoTriggers, MOVES, SPECIES, TYPES } from '../engine/data';
import { linesFor } from '../engine/dialogue';
import { evolve, findMember, stopEvolution, type EvolutionDue } from '../engine/evolution';
import { useItem } from '../engine/items';
import { variantLook } from '../ui/variantFx';
import { CHARACTERS, type Progress } from '../engine/progress';
import { saveProgress } from '../save';
import { DialogBox } from '../ui/dialog';
import { button, buttonPagePoint, faceIcon, hinge, listRow, monIcon, screenBackdrop, tapeLabel } from '../ui/kit';
import { sfx } from '../ui/sfx';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { tweenAsync, wait } from '../ui/widgets';
import { frontKey, idleAnimKey, monScale, walkKey } from './BootScene';

/**
 * The evolve scene (M6; restyled M7 as PATCH "recompiling" the Patchling, the owner's pick):
 * a dark grid stage with scanlines and a terminal readout, "What? X is evolving!", the Patchling
 * flickers between its two forms as white silhouettes with RGB-split and slice glitches, faster
 * and faster while the progress bar fills, breaks into pixels that pull back together, then a
 * flash and the new form drawn in by a scan line. STOP (the
 * touch screen) holds it back until its next level. Plays each queued evolution in turn, then
 * goes on to `next`. `preview`: a test run on a species that touches no save (?evolve=<species>).
 */
export interface EvolveData {
  queue: EvolutionDue[];
  next: { scene: string; data?: object };
  preview?: boolean;
}
type Step = 'intro' | 'morph' | 'reveal' | 'done' | 'stopped';

const BOTTOM = SCREEN_H;
const CENTRE = { x: SCREEN_W / 2, y: 128 };
const STAGE_TEXT: Record<string, string> = {
  sighted: 'sighted. New entry!', tracked: 'is now Tracked.', studied: 'is now Studied.', sealed: 'is now Sealed.', bonded: 'is now Bonded!',
};

export class EvolveScene extends Phaser.Scene {
  private data0!: EvolveData;
  private progress?: Progress;
  private step: Step = 'intro';
  private stopAsked = false;
  private mon!: Phaser.GameObjects.Sprite;
  private dialog!: DialogBox;
  private bottom!: Phaser.GameObjects.Container;
  private glow!: Phaser.GameObjects.Graphics;
  private ghosts: Phaser.GameObjects.Sprite[] = [];
  private term!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Graphics;
  private termLines: string[] = [];
  private col = 0xffffff;

  constructor() { super('evolve'); }

  init(data: EvolveData) {
    this.data0 = data;
    this.step = 'intro';
    this.stopAsked = false;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.progress = this.registry.get('progress') as Progress | undefined;
    const due = this.data0.queue[0];
    if (!due) {
      this.finish();
      return;
    }
    this.drawBackdrop(due.from);
    // RGB-split ghosts behind the Patchling, shown while it glitches.
    this.ghosts = [0xff3df0, 0x3df6ff].map((tint) => this.add.sprite(CENTRE.x, CENTRE.y, frontKey(due.from)).setOrigin(0.5, 1).setTintFill(tint).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD));
    this.mon = this.add.sprite(CENTRE.x, CENTRE.y, frontKey(due.from)).setOrigin(0.5, 1);
    this.playIdle(due.from);
    this.drawOverlay(due);
    this.dialog = new DialogBox(this, 10);
    screenBackdrop(this, BOTTOM);
    hinge(this);
    this.bottom = this.add.container(0, BOTTOM);
    this.drawBottom(due);
    this.expose();
    void this.run(due);
  }

  /** PATCH's render space: a dark sky with stars, a perspective grid floor in the type colour, a halo. */
  private drawBackdrop(species: string) {
    const col = hexToNum(TYPES[SPECIES[species].types[0]].color);
    this.col = col;
    const g = this.add.graphics();
    const horizon = 92;
    for (let y = 0; y < SCREEN_H; y += 4) {
      const t = y / SCREEN_H;
      g.fillStyle(Phaser.Display.Color.GetColor(8 + t * 10, 6 + t * 8, 20 + t * 22), 1).fillRect(0, y, SCREEN_W, 4);
    }
    for (let i = 0; i < 40; i++) {
      const st = this.add.rectangle(Phaser.Math.Between(2, SCREEN_W - 2), Phaser.Math.Between(2, horizon - 4), 1, 1, 0xffffff, Phaser.Math.FloatBetween(0.3, 0.9));
      this.tweens.add({ targets: st, alpha: 0.1, duration: Phaser.Math.Between(600, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }
    // The grid floor: lines fanning from a vanishing point, rows scrolling toward the viewer.
    const floor = this.add.graphics();
    floor.lineStyle(1, shade(col, -0.25), 0.55);
    for (let i = -10; i <= 10; i++) floor.lineBetween(CENTRE.x + i * 6, horizon, CENTRE.x + i * 46, SCREEN_H);
    floor.lineStyle(1, shade(col, 0.1), 0.8).lineBetween(0, horizon, SCREEN_W, horizon);
    const rows = this.add.graphics();
    let phase = 0;
    this.time.addEvent({ delay: 60, loop: true, callback: () => {
      phase = (phase + 0.06) % 1;
      rows.clear().lineStyle(1, shade(col, -0.2), 0.5);
      for (let k = 0; k < 7; k++) {
        const t = (k + phase) / 7;
        const y = horizon + (SCREEN_H - horizon) * t * t;
        rows.lineBetween(0, y, SCREEN_W, y);
      }
    } });
    this.glow = this.add.graphics({ x: CENTRE.x, y: CENTRE.y - 40 }).setAlpha(0.35);
    this.glow.fillStyle(col, 0.1).fillCircle(0, 0, 70).fillStyle(col, 0.16).fillCircle(0, 0, 48).fillStyle(0xffffff, 0.08).fillCircle(0, 0, 30);
    this.tweens.add({ targets: this.glow, scale: 1.08, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    g.fillStyle(0x000000, 0.4).fillEllipse(CENTRE.x, CENTRE.y, 90, 14);
    // A soft ring on the floor under the Patchling.
    const ring = this.add.ellipse(CENTRE.x, CENTRE.y, 70, 12).setStrokeStyle(1, shade(col, 0.3), 0.7);
    this.tweens.add({ targets: ring, scaleX: 1.15, scaleY: 1.15, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1 });
  }

  /** Scanlines over the stage, and PATCH's terminal readout with a progress bar (top right). */
  private drawOverlay(due: EvolutionDue) {
    const lines = this.add.graphics().setDepth(5);
    for (let y = 0; y < SCREEN_H; y += 2) lines.fillStyle(0x000000, 0.16).fillRect(0, y, SCREEN_W, 1);
    const sweep = this.add.rectangle(0, 0, SCREEN_W, 10, 0xffffff, 0.035).setOrigin(0, 0).setDepth(5);
    this.tweens.add({ targets: sweep, y: SCREEN_H, duration: 3200, repeat: -1 });
    this.term = this.add.text(SCREEN_W - 6, 6, '', { fontFamily: 'monospace', fontSize: '7px', color: '#7dffb0', align: 'right', lineSpacing: 0 })
      .setOrigin(1, 0).setDepth(6).setResolution(ZOOM).setAlpha(0.85);
    this.bar = this.add.graphics().setDepth(6);
    this.termLines = [`PATCH v0.9 :: ${SPECIES[due.from].name.toUpperCase()}.pl`];
    this.setProgress(0);
  }

  private log(line: string) {
    this.termLines = [...this.termLines.slice(-3), line];
    this.term?.setText(this.termLines.join('\n'));
  }

  private setProgress(p: number) {
    if (!this.bar) return;
    const w = 70;
    const x = SCREEN_W - 6 - w;
    const y = 44;
    this.bar.clear().fillStyle(0x000000, 0.5).fillRect(x - 1, y - 1, w + 2, 5).fillStyle(0x7dffb0, 0.9).fillRect(x, y, Math.round(w * p), 3);
    this.term?.setText(this.termLines.join('\n'));
  }

  /** One glitch beat: RGB ghosts jump apart, and a few slices of the sprite tear sideways. */
  private glitch(power: number) {
    const key = this.mon.texture.key;
    const frame = this.mon.frame.name;
    const sc = this.mon.scaleX;
    this.ghosts.forEach((gh, i) => {
      gh.setTexture(key, frame).setScale(sc, this.mon.scaleY).setAlpha(0.55).setPosition(this.mon.x + (i ? 1 : -1) * Phaser.Math.Between(1, 1 + power), this.mon.y);
      this.tweens.add({ targets: gh, alpha: 0, duration: 120 });
    });
    const fw = this.mon.frame.width;
    const fh = this.mon.frame.height;
    for (let k = 0; k < 1 + power; k++) {
      const band = Phaser.Math.Between(2, 6) / sc;
      const top = Phaser.Math.Between(0, Math.max(0, Math.floor(fh - band)));
      const sl = this.add.sprite(this.mon.x + Phaser.Math.Between(-4, 4) * (1 + power / 2), this.mon.y, key, frame)
        .setOrigin(0.5, 1).setScale(sc, this.mon.scaleY).setCrop(0, top, fw, band).setTintFill(k % 2 ? 0x3df6ff : 0xffffff).setDepth(2);
      this.time.delayedCall(70, () => sl.destroy());
    }
  }

  /** The Patchling breaks into pixels that fly out and get pulled back in. */
  private async scatter() {
    const b = this.mon.getBounds();
    const bits: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 70; i++) {
      const x = Phaser.Math.Between(Math.round(b.left + 4), Math.round(b.right - 4));
      const y = Phaser.Math.Between(Math.round(b.top + 4), Math.round(b.bottom - 2));
      bits.push(this.add.rectangle(x, y, 2, 2, i % 4 ? 0xffffff : i % 8 ? this.col : 0x3df6ff).setDepth(3));
    }
    this.mon.setAlpha(0);
    await Promise.all(bits.map((r) => tweenAsync(this, { targets: r, x: r.x + Phaser.Math.Between(-60, 60), y: r.y + Phaser.Math.Between(-50, 30), duration: 380, ease: 'Quad.easeOut' })));
    await Promise.all(bits.map((r, i) => tweenAsync(this, { targets: r, x: CENTRE.x + Phaser.Math.Between(-3, 3), y: CENTRE.y - 40 + Phaser.Math.Between(-3, 3), duration: 300 + (i % 10) * 12, ease: 'Quad.easeIn' })));
    bits.forEach((r) => r.destroy());
  }

  /** The new form drawn top to bottom behind a bright scan line. */
  private async scanIn() {
    const fw = this.mon.frame.width;
    const fh = this.mon.frame.height;
    const sc = this.mon.scaleY;
    const top = this.mon.y - fh * sc;
    const line = this.add.rectangle(CENTRE.x, top, 120, 2, 0xffffff, 0.9).setDepth(4);
    const glowLine = this.add.rectangle(CENTRE.x, top, 120, 6, this.col, 0.4).setDepth(4);
    this.mon.setAlpha(1);
    const o = { t: 0 };
    await tweenAsync(this, { targets: o, t: 1, duration: 520, ease: 'Sine.easeInOut', onUpdate: () => {
      this.mon.setCrop(0, 0, fw, fh * o.t);
      line.y = glowLine.y = top + fh * sc * o.t;
    } });
    this.mon.setCrop();
    line.destroy();
    glowLine.destroy();
  }

  private playIdle(species: string) {
    this.mon.anims.stop();
    // A shiny or Prototype evolves into its new form's shiny or Prototype look.
    const due = this.data0.queue[0];
    const m = this.progress && due ? findMember(this.progress, due.uid) : undefined;
    const look = variantLook(this, species, frontKey(species), idleAnimKey(species), m?.variant);
    this.mon.setTexture(look.key).setScale(monScale(this, frontKey(species)));
    if (look.anim) this.mon.play(look.anim);
  }

  /** Whose Patchling it is, and STOP while it changes. */
  private drawBottom(due: EvolutionDue) {
    this.bottom.removeAll(true);
    const who = due.owner ? CHARACTERS[due.owner] : null;
    const evolved = this.step === 'reveal' && !this.stopAsked || this.step === 'done';
    this.bottom.add(listRow(this, 128, 26, 236, 34, {
      title: who ? `${who.name}'s ${SPECIES[evolved ? due.to : due.from].name}` : SPECIES[evolved ? due.to : due.from].name,
      sub: `${who ? '' : 'In the sanctuary · '}Lv${this.level(due)} · ${evolved ? 'evolved!' : this.step === 'stopped' ? 'stayed as it is' : 'evolving'}`,
      color: who ? shade(hexToNum(who.color), -0.2) : TONES.patch,
      icon: due.owner ? faceIcon(walkKey(due.owner)) : monIcon(frontKey(evolved ? due.to : due.from)), passive: true, name: 'owner',
    }));
    // An item evolution can't be stopped (the item is already in use, like BW's stones).
    if ((this.step === 'intro' || this.step === 'morph') && !due.item) {
      this.bottom.add(pixelText(this, 128, 74, 'Not ready for it?', { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0.5));
      this.bottom.add(button(this, 128, 108, 160, 44, 'STOP', TONES.act, () => { this.stopAsked = true; sfx('back'); }, { sub: 'It asks again next level', name: 'stop' }));
    } else if (this.step === 'done' || this.step === 'stopped') {
      const more = this.data0.queue.length > 1;
      this.bottom.add(button(this, 128, 108, 180, 44, 'CONTINUE', TONES.go, () => this.nextOne(), { sub: more ? `${this.data0.queue.length - 1} more evolving` : undefined, name: 'continue' }));
    }
    if (this.isPlaceholder(due.to) && (this.step === 'reveal' || this.step === 'done') && !this.stopAsked) {
      this.bottom.add(pixelText(this, 128, 160, 'Placeholder art: this form isn\'t drawn yet.', { color: TEXT_COLORS.off, size: TEXT_SIZE.tiny }).setOrigin(0.5));
    }
  }

  private level(due: EvolutionDue) {
    if (this.data0.preview || !this.progress) return evoTriggers(due.from).find((t) => t.to === due.to)?.level ?? 1;
    const m = [...Object.values(this.progress.teams).flat(), ...this.progress.sanctuary].find((x) => x.uid === due.uid);
    return m?.level ?? 1;
  }

  private isPlaceholder(species: string) {
    return this.registry.has(`placeholder:${frontKey(species)}`);
  }

  private async run(due: EvolutionDue) {
    const fromName = SPECIES[due.from].name;
    const toName = SPECIES[due.to].name;
    await wait(this, 400);
    await this.dialog.show(`What? ${fromName} is evolving!`, { hold: 1400 });
    if (this.stopAsked) return this.stopped(due);
    this.step = 'morph';
    this.mon.anims.stop();
    this.mon.setTintFill(0xffffff);
    this.tweens.add({ targets: this.glow, alpha: 1, duration: 800 });
    this.dialog.prompt(`${fromName} is evolving...`);
    this.log('> recompiling...');
    const toKey = SPECIES[due.to].name.toUpperCase();
    const steps = ['> unpacking sprite', '> patching stats', `> linking ${toKey}`, '> rebuilding bones', '> optimising cuteness', '> do not unplug'];
    // The flicker: old and new form swap, each beat shorter, with a rising blip and a glitch.
    let gap = 420;
    let showNew = false;
    let beat = 0;
    while (gap > 34) {
      if (this.stopAsked) return this.stopped(due);
      showNew = !showNew;
      const sp = showNew ? due.to : due.from;
      const sc = monScale(this, frontKey(sp));
      this.mon.setTexture(frontKey(sp), this.firstFrame(sp));
      this.mon.setScale(sc * (showNew ? 1.04 : 1), sc);
      this.glitch(Math.min(4, Math.floor(beat / 4)));
      if (beat % 3 === 0) this.log(steps[Math.floor(beat / 3) % steps.length]);
      this.setProgress(Math.min(1, (420 - gap) / (420 - 34)));
      sfx('beat');
      beat++;
      await wait(this, gap);
      gap *= 0.86;
    }
    if (this.stopAsked) return this.stopped(due);
    // Bang: it breaks into pixels, they pull together, a flash, the new form scans in.
    this.step = 'reveal';
    this.setProgress(1);
    this.log('> build OK');
    await this.scatter();
    this.cameras.main.flash(500, 255, 255, 255);
    this.cameras.main.shake(180, 0.006);
    sfx('sealed');
    this.mon.clearTint();
    this.playIdle(due.to);
    this.burst();
    void tweenAsync(this, { targets: this.glow, alpha: 0.35, duration: 900 });
    await this.scanIn();
    this.log(`> hello, ${SPECIES[due.to].name}`);
    await tweenAsync(this, { targets: this.mon, y: CENTRE.y - 6, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    const r = this.data0.preview || !this.progress ? null : evolve(this.progress, due.uid, due.to);
    if (r && due.item && this.progress) useItem(this.progress, due.item);
    if (this.progress && !this.data0.preview) saveProgress(this.progress);
    this.drawBottom(due);
    this.addTag(toName);
    await this.dialog.show(`Congratulations! ${fromName} evolved into ${toName}!`, { waitForTap: true });
    for (const m of r?.learned ?? []) {
      sfx('heal');
      await this.dialog.show(`${toName} learned ${MOVES[m].name}!`, { waitForTap: true });
    }
    if (r?.change) await this.dialog.show(`Bestiary: ${toName} ${STAGE_TEXT[r.change.to]}`, { waitForTap: true });
    const lines = due.owner ? linesFor('evolve_react', due.owner) : linesFor('evolve_sanctuary', 'callum');
    for (const l of lines) await this.dialog.show(l.text, { speaker: l.who, waitForTap: true });
    this.step = 'done';
    this.drawBottom(due);
  }

  private async stopped(due: EvolutionDue) {
    this.step = 'reveal';
    this.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(0.35);
    this.mon.setAlpha(1).clearTint();
    this.playIdle(due.from);
    this.log('> build cancelled');
    if (this.progress && !this.data0.preview) {
      stopEvolution(this.progress, due.uid);
      saveProgress(this.progress);
    }
    sfx('weak');
    await this.dialog.show(`Huh? ${SPECIES[due.from].name} stopped evolving.`, { waitForTap: true });
    this.dialog.prompt('It\'ll try again when it next levels up.');
    this.step = 'stopped';
    this.drawBottom(due);
  }

  private addTag(name: string) {
    const t = tapeLabel(this, 8, 8, name.toUpperCase(), COLORS.rust).setDepth(6).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 300 });
  }

  private burst() {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const s = this.add.rectangle(CENTRE.x, CENTRE.y - 40, 2, 2, i % 3 ? 0xffffff : i % 2 ? 0x3df6ff : this.col);
      this.tweens.add({ targets: s, x: CENTRE.x + Math.cos(a) * 90, y: CENTRE.y - 40 + Math.sin(a) * 70, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
    }
  }

  private firstFrame(species: string) {
    const names = this.textures.get(frontKey(species)).getFrameNames();
    if (!names.length) return undefined;
    return names.sort((a, b) => Number(a.split('_').pop()) - Number(b.split('_').pop()))[0];
  }

  private nextOne() {
    if (this.step !== 'done' && this.step !== 'stopped') return;
    const rest = this.data0.queue.slice(1);
    if (rest.length) this.scene.restart({ ...this.data0, queue: rest });
    else this.finish();
  }

  private finish() {
    const cam = this.cameras.main;
    cam.fadeOut(250, 16, 16, 24);
    cam.once('camerafadeoutcomplete', () => this.scene.start(this.data0.next.scene, this.data0.next.data));
  }

  private expose() {
    (window as unknown as Record<string, unknown>).__evolve = {
      step: () => this.step,
      queue: () => this.data0.queue.length,
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
  }
}
