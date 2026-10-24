import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { sanctuaryPoints, type Progress } from '../engine/progress';
import { restoreWing, wingState, WINGS, type WingState } from '../engine/sanctuary';
import { saveProgress } from '../save';
import { DialogBox } from '../ui/dialog';
import { button, buttonPagePoint, chip, hinge, menuBackdrop, Meter, panel, patchPortrait, screenBackdrop, tapeLabel } from '../ui/kit';
import { pixelText } from '../ui/text';
import { COLORS, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';

const BOTTOM = SCREEN_H;
const STATE_CHIP: Record<WingState, [string, number]> = {
  restored: ['restored', COLORS.go], ready: ['ready', 0xc8901c], locked: ['locked', COLORS.off],
};

/**
 * The sanctuary (bible §7): wings restored with sanctuary points. Top screen: the chosen wing;
 * touch screen: the wings and RESTORE. Opened from the storage terminal in the sanctuary hall.
 */
export class SanctuaryScene extends Phaser.Scene {
  private progress!: Progress;
  private top!: Phaser.GameObjects.Container;
  private bottom!: Phaser.GameObjects.Container;
  private selected = WINGS[0].id;
  private dialog!: DialogBox;
  private busy = false;

  constructor() { super('sanctuary'); }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.progress = this.registry.get('progress') as Progress;
    this.busy = false;
    this.selected = (WINGS.find((w) => wingState(this.progress, w.id) !== 'restored') ?? WINGS[WINGS.length - 1]).id;
    menuBackdrop(this);
    panel(this, 6, 8, SCREEN_W - 12, SCREEN_H - 19, 'paper');
    screenBackdrop(this, BOTTOM);
    hinge(this);
    this.top = this.add.container(0, 0);
    this.bottom = this.add.container(0, BOTTOM);
    this.dialog = new DialogBox(this, 30);
    this.dialog.hide();
    this.render();
    (window as unknown as Record<string, unknown>).__sanctuary = {
      wings: () => [...this.progress.wings],
      busy: () => this.busy,
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
  }

  private render() {
    this.renderBottom();
    this.renderTop();
  }

  private renderBottom() {
    this.bottom.removeAll(true);
    const pts = sanctuaryPoints(this.progress);
    this.bottom.add(pixelText(this, 128, 10, `Sanctuary points: ${pts}`, { color: TEXT_COLORS.light, size: TEXT_SIZE.body, shadow: '#000000' }).setOrigin(0.5, 0));
    WINGS.forEach((w, i) => {
      const state = wingState(this.progress, w.id);
      const sub = state === 'restored' ? 'RESTORED' : state === 'ready' ? 'READY TO RESTORE' : `${Math.min(pts, w.points)}/${w.points} pts`;
      const color = state === 'restored' ? COLORS.go : state === 'ready' ? TONES.patch : COLORS.metalLight;
      this.bottom.add(button(this, 128, 44 + i * 36, 232, 30, w.name, color, () => { this.selected = w.id; this.render(); },
        { sub, name: `wing-${w.id}`, selected: this.selected === w.id }));
    });
    this.bottom.add(button(this, 66, 172, 120, 28, 'BACK', TONES.neutral, () => this.scene.start('overworld'), { name: 'back' }));
    if (wingState(this.progress, this.selected) === 'ready') {
      this.bottom.add(button(this, 190, 172, 120, 28, 'RESTORE', TONES.go, () => void this.restore(), { name: 'restore' }));
    }
  }

  private renderTop() {
    this.top.removeAll(true);
    const w = WINGS.find((x) => x.id === this.selected)!;
    const state = wingState(this.progress, w.id);
    const pts = sanctuaryPoints(this.progress);
    this.top.add(tapeLabel(this, 14, 2, 'SANCTUARY'));
    this.top.add(pixelText(this, 18, 20, w.name, { size: TEXT_SIZE.heading }));
    const [label, color] = STATE_CHIP[state];
    this.top.add(chip(this, 18, 36, label, color));
    // How close it is: points against the wing's cost.
    const meter = new Meter(this, 18, 52, 150, 5);
    meter.draw(state === 'restored' ? 1 : Math.min(1, pts / w.points), state === 'locked' ? COLORS.crt : COLORS.go);
    this.top.add(meter.graphics);
    this.top.add(pixelText(this, 174, 51, state === 'restored' ? 'done' : `${Math.min(pts, w.points)}/${w.points}`, { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small }));
    this.top.add(pixelText(this, 18, 66, w.desc, { size: TEXT_SIZE.small, wrap: 220 }));
    // PATCH weighs in at the bottom of the card.
    this.top.add(patchPortrait(this, 40, 140));
    const hint = state === 'restored' ? w.patch[0].text
      : state === 'ready' ? 'Enough points. Tap RESTORE. I\'ll hold the torch.'
      : WINGS.indexOf(w) > 0 && wingState(this.progress, WINGS[WINGS.indexOf(w) - 1].id) !== 'restored'
        ? 'One wing at a time. I\'m a robot, not a miracle.'
        : 'Fill the bestiary to earn points. Every stage counts.';
    this.top.add(pixelText(this, 72, 124, hint, { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small, wrap: 166 }));
  }

  private async restore() {
    if (this.busy || !restoreWing(this.progress, this.selected)) return;
    this.busy = true;
    saveProgress(this.progress);
    this.cameras.main.flash(500, 166, 216, 255);
    this.render();
    for (const l of WINGS.find((w) => w.id === this.selected)!.patch) await this.dialog.show(l.text, { speaker: l.who, waitForTap: true });
    this.dialog.hide();
    this.busy = false;
  }
}
