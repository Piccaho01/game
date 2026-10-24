import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { SPECIES, TYPES } from '../engine/data';
import { CHARACTERS, deposit, leaderTeam, sanctuaryPoints, TEAM_SIZE, withdraw, type Member, type Progress } from '../engine/progress';
import { restoreWing, wingState, WINGS, type WingState } from '../engine/sanctuary';
import { saveProgress } from '../save';
import { DialogBox } from '../ui/dialog';
import { button, buttonPagePoint, chip, emptySlot, hinge, menuBackdrop, Meter, panel, patchPortrait, screenBackdrop, tapeLabel } from '../ui/kit';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { frontKey, idleAnimKey } from './BootScene';

const BOTTOM = SCREEN_H;
type Tab = 'wings' | 'storage';
/** Sanctuary Patchlings per page in STORAGE. */
const STORE_PER_PAGE = 5;
const BOND_NAMES = { strong: 'Strong bond', steady: 'Steady bond', wary: 'Wary' } as const;
const STATE_CHIP: Record<WingState, [string, number]> = {
  restored: ['restored', COLORS.go], ready: ['ready', 0xc8901c], locked: ['locked', COLORS.off],
};

/**
 * The sanctuary (bible §7). WINGS: restored with sanctuary points (top screen: the chosen wing).
 * STORAGE: the shared storage, where the leader deposits and withdraws (any friend can take any
 * Patchling). Opened from the old CRT stones at the sanctuary.
 */
export class SanctuaryScene extends Phaser.Scene {
  private progress!: Progress;
  private top!: Phaser.GameObjects.Container;
  private bottom!: Phaser.GameObjects.Container;
  private selected = WINGS[0].id;
  private dialog!: DialogBox;
  private busy = false;
  private tab: Tab = 'wings';
  /** STORAGE: the picked Patchling (by uid) and the storage page. */
  private picked: number | null = null;
  private page = 0;

  constructor() { super('sanctuary'); }

  init(data: { tab?: Tab }) {
    this.tab = data?.tab ?? 'wings';
    this.picked = null;
    this.page = 0;
  }

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
      tab: () => this.tab,
      team: () => leaderTeam(this.progress).map((m) => m.species),
      storage: () => this.progress.sanctuary.map((m) => m.species),
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
  }

  private render() {
    this.renderBottom();
    this.renderTop();
  }

  private renderBottom() {
    this.bottom.removeAll(true);
    const tabBtn = (x: number, t: Tab, label: string) =>
      button(this, x, 14, 120, 20, label, this.tab === t ? TONES.patch : TONES.neutral, () => { this.tab = t; this.picked = null; this.render(); }, { name: `tab-${t}`, selected: this.tab === t });
    this.bottom.add([tabBtn(66, 'wings', 'WINGS'), tabBtn(190, 'storage', 'STORAGE')]);
    this.bottom.add(button(this, 66, 172, 120, 28, 'BACK', TONES.neutral, () => this.scene.start('overworld'), { name: 'back' }));
    if (this.tab === 'wings') this.renderWings();
    else this.renderStorage();
  }

  private renderWings() {
    const pts = sanctuaryPoints(this.progress);
    this.bottom.add(pixelText(this, 128, 32, `Sanctuary points: ${pts}`, { color: TEXT_COLORS.light, size: TEXT_SIZE.small, shadow: '#000000' }).setOrigin(0.5, 0));
    WINGS.forEach((w, i) => {
      const state = wingState(this.progress, w.id);
      const sub = state === 'restored' ? 'RESTORED' : state === 'ready' ? 'READY TO RESTORE' : `${Math.min(pts, w.points)}/${w.points} pts`;
      const color = state === 'restored' ? COLORS.go : state === 'ready' ? TONES.patch : COLORS.metalLight;
      this.bottom.add(button(this, 128, 60 + i * 32, 232, 26, w.name, color, () => { this.selected = w.id; this.render(); },
        { sub, name: `wing-${w.id}`, selected: this.selected === w.id }));
    });
    if (wingState(this.progress, this.selected) === 'ready') {
      this.bottom.add(button(this, 190, 172, 120, 28, 'RESTORE', TONES.go, () => void this.restore(), { name: 'restore' }));
    }
  }

  /** Left: the leader's team; right: the shared storage. Tap one, then DEPOSIT or WITHDRAW. */
  private renderStorage() {
    const p = this.progress;
    const team = leaderTeam(p);
    const pages = Math.max(1, Math.ceil(p.sanctuary.length / STORE_PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    const head = { color: TEXT_COLORS.dim, size: TEXT_SIZE.small };
    this.bottom.add(pixelText(this, 66, 30, `${CHARACTERS[p.leader].name}'s team`, head).setOrigin(0.5, 0));
    this.bottom.add(pixelText(this, 190, 30, `Storage (${p.sanctuary.length})`, head).setOrigin(0.5, 0));
    const slot = (m: Member, x: number, y: number, name: string) => button(this, x, y, 118, 16, `${SPECIES[m.species].name} Lv${m.level}`,
      shade(hexToNum(TYPES[SPECIES[m.species].types[0]].color), -0.3), () => { this.picked = this.picked === m.uid ? null : m.uid; this.render(); },
      { size: TEXT_SIZE.small, name, selected: this.picked === m.uid });
    for (let i = 0; i < TEAM_SIZE; i++) {
      const y = 50 + i * 20;
      this.bottom.add(team[i] ? slot(team[i], 66, y, `team${i}`) : emptySlotAt(this, 66, y));
    }
    const shown = p.sanctuary.slice(this.page * STORE_PER_PAGE, (this.page + 1) * STORE_PER_PAGE);
    for (let i = 0; i < STORE_PER_PAGE; i++) {
      const y = 50 + i * 20;
      this.bottom.add(shown[i] ? slot(shown[i], 190, y, `store${i}`) : emptySlotAt(this, 190, y));
    }
    if (p.sanctuary.length === 0) this.bottom.add(pixelText(this, 190, 70, 'Empty.\nSeals go here\nwhen a team is full.', { color: TEXT_COLORS.dim, size: TEXT_SIZE.tiny }).setOrigin(0.5, 0).setAlign('center'));
    if (pages > 1) {
      const turn = (d: number) => () => { this.page = (this.page + d + pages) % pages; this.picked = null; this.render(); };
      this.bottom.add(button(this, 150, 150, 30, 16, '<', TONES.neutral, turn(-1), { size: TEXT_SIZE.small, name: 'store-prev' }));
      this.bottom.add(pixelText(this, 190, 150, `${this.page + 1}/${pages}`, head).setOrigin(0.5));
      this.bottom.add(button(this, 230, 150, 30, 16, '>', TONES.neutral, turn(1), { size: TEXT_SIZE.small, name: 'store-next' }));
    }
    const inTeam = team.some((m) => m.uid === this.picked);
    const inStore = p.sanctuary.some((m) => m.uid === this.picked);
    if (inTeam) {
      const ok = team.length > 1;
      this.bottom.add(button(this, 190, 172, 120, 28, 'DEPOSIT', TONES.go, ok ? () => this.move(() => deposit(p, this.picked!)) : undefined, { name: 'deposit' }));
    } else if (inStore) {
      const ok = team.length < TEAM_SIZE;
      this.bottom.add(button(this, 190, 172, 120, 28, 'WITHDRAW', TONES.go, ok ? () => this.move(() => withdraw(p, this.picked!)) : undefined, { name: 'withdraw' }));
    }
  }

  private move(act: () => boolean) {
    if (!act()) return;
    saveProgress(this.progress);
    this.picked = null;
    this.render();
  }

  private renderTop() {
    this.top.removeAll(true);
    if (this.tab === 'storage') {
      this.renderPicked();
      return;
    }
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

  /** STORAGE's top screen: the picked Patchling, or PATCH explaining the shelves. */
  private renderPicked() {
    const p = this.progress;
    this.top.add(tapeLabel(this, 14, 2, 'STORAGE'));
    const team = leaderTeam(p);
    const m = [...team, ...p.sanctuary].find((x) => x.uid === this.picked);
    if (!m) {
      this.top.add(patchPortrait(this, 40, 140));
      const line = team.length >= TEAM_SIZE && p.sanctuary.length ? `${CHARACTERS[p.leader].name}'s team is full. Deposit one first.`
        : 'Shared shelves. Any of you can take any of them. Ask nicely.';
      this.top.add(pixelText(this, 18, 30, 'Tap one on the team to deposit it,\nor one in storage to withdraw it.', { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small }));
      this.top.add(pixelText(this, 72, 124, line, { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small, wrap: 166 }));
      return;
    }
    const sp = SPECIES[m.species];
    this.top.add(panel(this, 14, 112, 76, 12, 'metal'));
    const s = this.add.sprite(52, 118, frontKey(m.species)).setOrigin(0.5, 1);
    if (this.anims.exists(idleAnimKey(m.species))) s.play(idleAnimKey(m.species));
    this.top.add(s);
    this.top.add(pixelText(this, 100, 18, sp.name, { size: TEXT_SIZE.heading }));
    sp.types.forEach((t, i) => this.top.add(chip(this, 100 + i * 38, 32, TYPES[t].name, shade(hexToNum(TYPES[t].color), -0.2))));
    this.top.add(pixelText(this, 100, 48, `Lv${m.level}  ${BOND_NAMES[m.bond]}`, { color: TEXT_COLORS.rust, size: TEXT_SIZE.small }));
    const where = team.includes(m) ? `On ${CHARACTERS[p.leader].name}'s team.` : 'Resting in the sanctuary.';
    this.top.add(pixelText(this, 100, 62, where, { size: TEXT_SIZE.small, wrap: 140 }));
    if (team.includes(m) && team.length <= 1) this.top.add(pixelText(this, 100, 78, 'Last one on the team: it stays.', { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small, wrap: 140 }));
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

/** A free place in a storage list. */
function emptySlotAt(scene: Phaser.Scene, x: number, y: number) {
  return emptySlot(scene, x, y, 118, 16);
}
