import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { MOVES, SPECIES, TYPES } from '../engine/data';
import { linesFor } from '../engine/dialogue';
import { evolve, stopEvolution, type EvolutionDue } from '../engine/evolution';
import { CHARACTERS, type Progress } from '../engine/progress';
import { saveProgress } from '../save';
import { DialogBox } from '../ui/dialog';
import { button, buttonPagePoint, faceIcon, hinge, listRow, monIcon, screenBackdrop, tapeLabel } from '../ui/kit';
import { sfx } from '../ui/sfx';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { tweenAsync, wait } from '../ui/widgets';
import { frontKey, idleAnimKey, walkKey } from './BootScene';

/**
 * The evolve scene (M6), BW style: "What? X is evolving!", the Patchling flickers between its
 * two forms as white silhouettes, faster and faster, then a flash and the new form. STOP (the
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
    this.mon = this.add.sprite(CENTRE.x, CENTRE.y, frontKey(due.from)).setOrigin(0.5, 1);
    this.playIdle(due.from);
    this.dialog = new DialogBox(this, 10);
    screenBackdrop(this, BOTTOM);
    hinge(this);
    this.bottom = this.add.container(0, BOTTOM);
    this.drawBottom(due);
    this.expose();
    void this.run(due);
  }

  /** A dark stage with slow rays in the old form's type colour and drifting sparks. */
  private drawBackdrop(species: string) {
    const col = hexToNum(TYPES[SPECIES[species].types[0]].color);
    const g = this.add.graphics();
    g.fillStyle(0x0d0e1a).fillRect(0, 0, SCREEN_W, SCREEN_H);
    const rays = this.add.graphics({ x: CENTRE.x, y: CENTRE.y - 40 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillStyle(i % 2 ? shade(col, -0.55) : shade(col, -0.7), 0.6);
      rays.fillTriangle(0, 0, Math.cos(a) * 220, Math.sin(a) * 220, Math.cos(a + 0.26) * 220, Math.sin(a + 0.26) * 220);
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 24000, repeat: -1 });
    this.glow = this.add.graphics({ x: CENTRE.x, y: CENTRE.y - 40 }).setAlpha(0);
    this.glow.fillStyle(0xffffff, 0.12).fillCircle(0, 0, 60).fillStyle(0xffffff, 0.18).fillCircle(0, 0, 40);
    for (let i = 0; i < 18; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(10, SCREEN_W - 10), Phaser.Math.Between(10, SCREEN_H - 50), 1, 1, 0xffffff, 0.8);
      this.tweens.add({ targets: s, y: s.y - 30, alpha: 0, duration: Phaser.Math.Between(1800, 3600), repeat: -1, delay: Phaser.Math.Between(0, 2000) });
    }
    g.fillStyle(0x000000, 0.35).fillEllipse(CENTRE.x, CENTRE.y, 90, 14);
  }

  private playIdle(species: string) {
    this.mon.anims.stop();
    this.mon.setTexture(frontKey(species));
    if (this.anims.exists(idleAnimKey(species))) this.mon.play(idleAnimKey(species));
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
    if (this.step === 'intro' || this.step === 'morph') {
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
    if (this.data0.preview || !this.progress) return SPECIES[due.from].evolves?.level ?? 1;
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
    // The flicker: old and new form swap, each beat shorter, with a rising blip.
    let gap = 420;
    let showNew = false;
    while (gap > 34) {
      if (this.stopAsked) return this.stopped(due);
      showNew = !showNew;
      this.mon.setTexture(frontKey(showNew ? due.to : due.from), this.firstFrame(showNew ? due.to : due.from));
      this.mon.setScale(showNew ? 1.04 : 1, 1);
      sfx('beat');
      await wait(this, gap);
      gap *= 0.86;
    }
    if (this.stopAsked) return this.stopped(due);
    // Bang: a flash, the new form, sparkles.
    this.step = 'reveal';
    this.cameras.main.flash(500, 255, 255, 255);
    sfx('sealed');
    this.mon.setScale(1).clearTint();
    this.playIdle(due.to);
    this.burst();
    void tweenAsync(this, { targets: this.glow, alpha: 0, duration: 900 });
    await tweenAsync(this, { targets: this.mon, y: CENTRE.y - 6, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    const r = this.data0.preview || !this.progress ? null : evolve(this.progress, due.uid);
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
    this.glow.setAlpha(0);
    this.mon.setScale(1).clearTint();
    this.playIdle(due.from);
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
      const s = this.add.rectangle(CENTRE.x, CENTRE.y - 40, 2, 2, i % 3 ? 0xffffff : COLORS.gold);
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
