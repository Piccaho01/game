import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { SPECIES } from '../engine/data';
import { MAPS } from '../engine/overworld';
import { CHARACTERS, leaderTeam, sanctuaryPoints, stageOf, type Progress } from '../engine/progress';
import { button, buttonPagePoint, faceIcon, listRow, monIcon, panel, screenBackdrop, tapeLabel } from '../ui/kit';
import { partyBlurb, settingsPanel, speedPreview } from '../ui/settingsPanel';
import { sfx } from '../ui/sfx';
import { pixelText } from '../ui/text';
import { hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { frontKey, walkKey } from './BootScene';

/** What the overworld hands the pause menu: how to save (with its position) and where each choice goes. */
export interface PauseData {
  save: () => void;
  resume: () => void;
  journal: () => void;
  title: () => void;
}
type View = 'menu' | 'settings';

/**
 * The pause menu (M6), over the overworld (which is paused underneath): the top screen dims the
 * map and shows where you are and how far along; the touch screen has RESUME, JOURNAL, SETTINGS,
 * SAVE and QUIT TO TITLE. The game also saves by itself after every change.
 */
export class PauseScene extends Phaser.Scene {
  private hooks!: PauseData;
  private view: View = 'menu';
  private top!: Phaser.GameObjects.Container;
  private bottom!: Phaser.GameObjects.Container;
  private preview?: Phaser.GameObjects.Container;
  private progress!: Progress;
  private savedAt = 0;

  constructor() { super('pause'); }

  init(data: PauseData) {
    this.hooks = data;
    this.view = 'menu';
    this.savedAt = 0;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.progress = this.registry.get('progress') as Progress;
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x0d0e1a, 0.55).setOrigin(0, 0);
    screenBackdrop(this, SCREEN_H);
    this.top = this.add.container(0, 0);
    this.bottom = this.add.container(0, SCREEN_H);
    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', () => this.resume());
    kb?.on('keydown-P', () => this.resume());
    this.render();
    sfx('confirm');
    (window as unknown as Record<string, unknown>).__pause = {
      view: () => this.view,
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
  }

  private render() {
    this.top.removeAll(true);
    this.bottom.removeAll(true);
    if (this.view === 'settings') {
      this.top.add(panel(this, 8, 8, SCREEN_W - 16, 92, 'paper'));
      this.top.add(tapeLabel(this, 16, 2, 'SETTINGS'));
      this.top.add(pixelText(this, 18, 22, partyBlurb(this.progress), { size: TEXT_SIZE.small, wrap: 216 }));
      this.preview = speedPreview(this, this.preview);
      settingsPanel(this, this.bottom, 22, this.progress, () => this.render());
      this.bottom.add(button(this, 66, 172, 120, 28, 'BACK', TONES.neutral, () => { this.view = 'menu'; this.render(); }, { name: 'back' }));
      return;
    }
    this.preview?.destroy();
    this.preview = undefined;
    this.renderSummary();
    const b = (x: number, y: number, w: number, h: number, label: string, tone: number, fn: () => void, name: string, sub?: string) =>
      this.bottom.add(button(this, x, y, w, h, label, tone, fn, { name, sub }));
    b(128, 28, 236, 36, 'RESUME', TONES.go, () => this.resume(), 'resume');
    b(66, 76, 118, 40, 'JOURNAL', TONES.seal, () => this.leave(this.hooks.journal), 'journal', 'Teams, bestiary, bag');
    b(190, 76, 118, 40, 'SETTINGS', TONES.patch, () => { this.view = 'settings'; this.render(); }, 'settings', 'Sound, text, squad');
    b(66, 124, 118, 36, 'SAVE', TONES.neutral, () => this.save(), 'save', this.savedAt ? 'Saved!' : 'Saves by itself too');
    b(190, 124, 118, 36, 'QUIT TO TITLE', TONES.neutral, () => { this.hooks.save(); this.leave(this.hooks.title); }, 'title', 'Your game is saved');
    this.bottom.add(pixelText(this, 128, 166, 'Esc or P also pauses.', { color: TEXT_COLORS.off, size: TEXT_SIZE.tiny }).setOrigin(0.5));
  }

  /** Where the squad is and how far along: the leader, their lead Patchling, the sanctuary. */
  private renderSummary() {
    const p = this.progress;
    const lead = CHARACTERS[p.leader];
    const mon = leaderTeam(p)[0];
    const seen = Object.keys(SPECIES).filter((id) => stageOf(p.bestiary[id])).length;
    this.top.add(panel(this, 8, 8, SCREEN_W - 16, 108, 'paper'));
    const where = p.pos ? MAPS[p.pos.map]?.name : undefined;
    this.top.add(tapeLabel(this, 16, 2, where ? `PAUSED · ${where.toUpperCase()}` : 'PAUSED'));
    this.top.add(listRow(this, 128, 46, 220, 30, {
      title: `${lead.name} leads`, sub: `${lead.role} · ${lead.assist.name}`, color: shade(hexToNum(lead.color), -0.2), icon: faceIcon(walkKey(p.leader)), passive: true, name: 'lead',
    }));
    if (mon) {
      this.top.add(listRow(this, 128, 80, 220, 30, {
        title: SPECIES[mon.species].name, sub: `Lv${mon.level} · team of ${leaderTeam(p).length}`, color: TONES.seal, icon: monIcon(frontKey(mon.species)), passive: true, name: 'mon',
      }));
    }
    this.top.add(pixelText(this, 20, 102, `Sanctuary ${sanctuaryPoints(p)} pts · ${p.wings.length} wing${p.wings.length === 1 ? '' : 's'} · ${seen} seen`, { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small }));
  }

  private save() {
    this.hooks.save();
    this.savedAt = Date.now();
    sfx('heal');
    this.render();
  }

  private resume() {
    if (this.view === 'settings') { this.view = 'menu'; this.render(); return; }
    this.leave(this.hooks.resume);
  }

  private leave(then: () => void) {
    sfx('back');
    this.scene.stop();
    then();
  }
}
