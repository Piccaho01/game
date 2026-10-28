import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { SPECIES } from '../engine/data';
import { MAPS, START } from '../engine/overworld';
import { CHARACTERS, SQUAD, stageOf, type Progress } from '../engine/progress';
import { clearProgress } from '../save';
import { button, buttonPagePoint, faceIcon, hinge, listRow, screenBackdrop } from '../ui/kit';
import { settingsPanel, speedPreview } from '../ui/settingsPanel';
import { sfx } from '../ui/sfx';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { battleBgKey, titleKey, walkKey } from './BootScene';

/** The game's name (owner's pick, 2026-10-28): a small PROJECT over a big PATCH on the logo. */
export const GAME_TITLE = 'Project Patch';
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

  /** Hollow Rest at golden hour, PATCH on the title runestone, the squad in front of him. */
  private drawTop() {
    if (this.textures.exists(battleBgKey('hollow_rest'))) this.add.image(0, 0, battleBgKey('hollow_rest')).setOrigin(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0x0d0e1a, 0.35).fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.fillStyle(0x0d0e1a, 0.45).fillRect(0, SCREEN_H - 20, SCREEN_W, 20);
    // PATCH leaning on the runestone (the owner's art), the name carved in its panel, his
    // shoulder vent still smoking; the four stand in front of his legs, a third of his height.
    const art = this.add.container(4, 0);
    art.add(this.add.image(0, SCREEN_H + 20, titleKey('patch_runestone')).setOrigin(0, 1));
    this.carveTitle(art, 59, 127);
    this.tweens.add({ targets: art, y: -1, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({ delay: 520, loop: true, callback: () => this.puff(art.x + 92, art.y + 18) });
    const xs = [136, 168, 200, 232];
    SQUAD.forEach((id, i) => {
      const key = this.textures.exists(titleKey(id)) ? titleKey(id) : walkKey(id);
      this.add.image(xs[i], SCREEN_H - 3, key, key === walkKey(id) ? 0 : undefined).setOrigin(0.5, 1).setFlipX(i >= 2);
    });
  }

  /** PROJECT PATCH cut into the stone's blank panel: dark grooves, a pale lower lip, a faint rune glow. */
  private carveTitle(into: Phaser.GameObjects.Container, cx: number, cy: number) {
    const line = (text: string, y: number, size: number) => {
      // A blue halo (the runes' glow) round dark grooves with a pale lower lip.
      const halo = this.add.container(0, 0).setAlpha(0.5);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        halo.add(pixelText(this, cx + dx, y + dy, text, { color: '#7fd0ff', size, display: true }).setOrigin(0.5));
      }
      this.tweens.add({ targets: halo, alpha: 1, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const lip = pixelText(this, cx, y + 1, text, { color: '#d8d4cc', size, display: true }).setOrigin(0.5);
      const cut = pixelText(this, cx, y, text, { color: '#1f2029', size, display: true }).setOrigin(0.5);
      into.add([halo, lip, cut]);
    };
    line('PROJECT', cy - 14, 6);
    line('PATCH', cy + 2, 9);
    const g = this.add.graphics();
    g.fillStyle(0x3a3c48).fillRect(cx - 16, cy + 14, 32, 1).fillRect(cx - 16, cy - 25, 32, 1);
    g.fillStyle(0xb9b6b0).fillRect(cx - 16, cy + 15, 32, 1).fillRect(cx - 16, cy - 24, 32, 1);
    into.add(g);
  }

  /** A grey puff rising off PATCH's scorched shoulder vent. */
  private puff(x: number, y: number) {
    const s = this.add.rectangle(x + Phaser.Math.Between(-1, 1), y, 3, 3, 0xc8c8cc, 0.8);
    this.tweens.add({ targets: s, y: y - 18, x: s.x + Phaser.Math.Between(-4, 3), scale: 2, alpha: 0, duration: 1600, ease: 'Sine.easeOut', onComplete: () => s.destroy() });
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
      const where = (p.pos && MAPS[p.pos.map]?.name) ?? MAPS[START.map].name;
      this.bottom.add(listRow(this, 128, 34, 220, 46, {
        title: 'CONTINUE', sub: `${lead.name} leads · ${where} · ${seen} seen`,
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
