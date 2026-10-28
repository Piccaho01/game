import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { SPECIES } from '../engine/data';
import { CHARACTERS, sanctuaryPoints, SQUAD, stageOf, type Progress } from '../engine/progress';
import { clearProgress } from '../save';
import { button, buttonPagePoint, faceIcon, hinge, listRow, pxRect, screenBackdrop, stitches } from '../ui/kit';
import { settingsPanel, speedPreview } from '../ui/settingsPanel';
import { sfx } from '../ui/sfx';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { battleBgKey, standKey, trainerKey, walkKey } from './BootScene';

/** The game's name until the owner picks one (bible §12, open question). */
export const GAME_TITLE = 'PATCHLINGS';
type View = 'press' | 'menu' | 'confirm' | 'settings';

/**
 * The title screen (M6): the four friends and PATCH under the logo on the top screen; the touch
 * screen goes "TAP TO START" → CONTINUE (with the save's summary) / NEW GAME / SETTINGS.
 * NEW GAME over a save asks first.
 */
export class TitleScene extends Phaser.Scene {
  private view: View = 'press';
  private bottom!: Phaser.GameObjects.Container;
  private preview?: Phaser.GameObjects.Container;
  private progress: Progress | null = null;

  constructor() { super('title'); }

  init(data: { view?: View }) {
    this.view = data?.view ?? 'press';
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.progress = (this.registry.get('progress') as Progress | undefined) ?? null;
    this.drawTop();
    screenBackdrop(this, SCREEN_H);
    hinge(this);
    this.bottom = this.add.container(0, SCREEN_H);
    this.input.keyboard?.on('keydown-ENTER', () => { if (this.view === 'press') this.show('menu'); });
    this.input.keyboard?.on('keydown-SPACE', () => { if (this.view === 'press') this.show('menu'); });
    this.render();
    (window as unknown as Record<string, unknown>).__title = {
      view: () => this.view,
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
  }

  /** Hollow Rest at golden hour, the logo, and the squad lined up with PATCH in the middle. */
  private drawTop() {
    if (this.textures.exists(battleBgKey('hollow_rest'))) this.add.image(0, 0, battleBgKey('hollow_rest')).setOrigin(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0x0d0e1a, 0.35).fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.fillStyle(0x0d0e1a, 0.45).fillRect(0, SCREEN_H - 20, SCREEN_W, 20);
    if (this.textures.exists(standKey('patch'))) {
      const patch = this.add.image(128, SCREEN_H - 6, standKey('patch')).setOrigin(0.5, 1).setScale(1.5);
      this.tweens.add({ targets: patch, y: patch.y - 1.5, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const xs = [30, 78, 178, 226];
    SQUAD.forEach((id, i) => {
      const key = this.textures.exists(trainerKey(id)) ? trainerKey(id) : walkKey(id);
      const img = this.add.image(xs[i], SCREEN_H - 4, key, key === walkKey(id) ? 0 : undefined).setOrigin(0.5, 1).setFlipX(i >= 2);
      if (key === walkKey(id)) img.setScale(2);
      else img.setScale(0.85);
    });
    // The logo: a cream plate, taped and stitched, with the name in rust over ink.
    const plate = this.add.container(128, 38);
    const p = this.add.graphics();
    pxRect(p, -96, -22, 192, 44, COLORS.ink, 5);
    pxRect(p, -94, -20, 188, 40, COLORS.paper, 4);
    p.fillStyle(COLORS.paperShade).fillRect(-92, 14, 184, 4);
    stitches(p, -90, -16, 180, 32, COLORS.stitch);
    p.fillStyle(COLORS.tape, 0.95).fillRect(-100, -24, 22, 8).fillRect(80, 16, 22, 8);
    plate.add(p);
    plate.add(pixelText(this, 1, -3, GAME_TITLE, { color: TEXT_COLORS.ink, size: TEXT_SIZE.title, display: true }).setOrigin(0.5));
    plate.add(pixelText(this, 0, -4, GAME_TITLE, { color: TEXT_COLORS.rust, size: TEXT_SIZE.title, display: true }).setOrigin(0.5));
    plate.add(pixelText(this, 0, 11, 'a world nobody wrote on purpose', { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.tiny }).setOrigin(0.5));
    this.tweens.add({ targets: plate, angle: { from: -1.2, to: 1.2 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private show(v: View) {
    this.view = v;
    sfx(v === 'menu' ? 'confirm' : 'tap');
    this.render();
  }

  private render() {
    this.bottom.removeAll(true);
    if (this.view !== 'settings') { this.preview?.destroy(); this.preview = undefined; }
    if (this.view === 'press') return this.renderPress();
    if (this.view === 'menu') return this.renderMenu();
    if (this.view === 'confirm') return this.renderConfirm();
    this.renderSettings();
  }

  private renderPress() {
    const t = pixelText(this, 128, 88, 'TAP TO START', { color: TEXT_COLORS.gold, size: TEXT_SIZE.heading, shadow: '#000000', display: true }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    this.bottom.add(t);
    this.bottom.add(pixelText(this, 128, 178, 'v0.6 · playtest build', { color: TEXT_COLORS.off, size: TEXT_SIZE.tiny }).setOrigin(0.5));
    // Anywhere on either screen.
    const hit = this.add.zone(0, -SCREEN_H, SCREEN_W, SCREEN_H * 2).setOrigin(0, 0).setInteractive().setName('start');
    hit.once('pointerup', () => this.show('menu'));
    this.bottom.add(hit);
  }

  private renderMenu() {
    const p = this.progress;
    if (p) {
      const lead = CHARACTERS[p.leader];
      const seen = Object.keys(SPECIES).filter((id) => stageOf(p.bestiary[id])).length;
      this.bottom.add(listRow(this, 128, 34, 220, 46, {
        title: 'CONTINUE', sub: `${lead.name} leads · ${sanctuaryPoints(p)} pts · ${seen} seen`,
        color: shade(hexToNum(lead.color), -0.2), icon: faceIcon(walkKey(p.leader)), onTap: () => this.go('overworld'), name: 'continue',
      }));
    }
    const y = p ? 92 : 64;
    this.bottom.add(button(this, 128, y, 220, 38, 'NEW GAME', p ? TONES.neutral : TONES.go, () => (p ? this.show('confirm') : this.newGame()), { name: 'new-game' }));
    this.bottom.add(button(this, 128, y + 48, 220, 34, 'SETTINGS', TONES.patch, () => this.show('settings'), { sub: 'Sound, text speed, squad/solo', name: 'settings' }));
  }

  private renderConfirm() {
    this.bottom.add(pixelText(this, 128, 34, 'Start a new game?', { color: TEXT_COLORS.light, size: TEXT_SIZE.heading }).setOrigin(0.5));
    this.bottom.add(pixelText(this, 128, 54, 'Your save on this device will be erased.\nAll four teams, the bestiary, the sanctuary.', { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0.5).setAlign('center'));
    this.bottom.add(button(this, 128, 104, 220, 36, 'ERASE AND START OVER', COLORS.danger, () => this.newGame(), { name: 'confirm-new' }));
    this.bottom.add(button(this, 128, 150, 220, 32, 'KEEP MY SAVE', TONES.go, () => this.show('menu'), { name: 'cancel-new' }));
  }

  private renderSettings() {
    settingsPanel(this, this.bottom, 22, this.progress, () => this.render());
    this.bottom.add(button(this, 66, 172, 120, 28, 'BACK', TONES.neutral, () => this.show('menu'), { name: 'back' }));
    // The top screen shows a line at the chosen text speed.
    this.preview = speedPreview(this, this.preview);
  }

  private newGame() {
    clearProgress();
    this.registry.remove('progress');
    this.go('intro');
  }

  private go(scene: string) {
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => this.scene.start(scene));
  }
}
