import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { Battle, type BattleEvent, type PlayerAction, type Side } from '../engine/battle';
import { createBattler } from '../engine/battler';
import { CHARACTERS, recordDefeat, recordEncounter, recordScan, recordSeal, type DexChange, type Progress } from '../engine/progress';
import { effectiveness } from '../engine/typeChart';
import { MOVES, SPECIES, TYPES, type StatusId } from '../engine/data';
import { createRng } from '../engine/rng';
import { sealPattern, sealWindows, type Bond, type SealResult } from '../engine/seal';
import { DialogBox } from '../ui/dialog';
import { button, buttonPagePoint, chip, drawPanel, hinge, Meter, screenBackdrop } from '../ui/kit';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { tweenAsync, wait } from '../ui/widgets';
import { saveProgress } from '../save';
import { backIdleAnimKey, backKey, frontKey, idleAnimKey } from './BootScene';
import { SealMinigame } from './SealMinigame';

/** `from: 'overworld'`: a wild encounter, which goes back to the same spot when it ends. */
interface BattleInit { foe: string; seed?: number; level?: number; from?: 'overworld' }
type Phase = 'intro' | 'menu' | 'fight' | 'team' | 'switching' | 'playing' | 'sealing' | 'over';

const FOE_LEVEL = 5;
/** Wild foes the "Next battle" button cycles through: Route 1's commons first, then the starters. */
const FOE_ROTATION = ['orbitot', 'fledjet', 'sprigby', 'zapail', 'gobbin', 'furnaxol'];
const STATUS_COLORS: Record<StatusId, number> = { brn: 0xe8603c, par: 0xc89a18, psn: 0x9a4ab8, slp: 0x7a8098 };
const BOTTOM = SCREEN_H;
const STAGE_TEXT: Record<string, string> = {
  sighted: 'sighted. New entry!', tracked: 'is now Tracked.', studied: 'is now Studied.', sealed: 'is now Sealed.', bonded: 'is now Bonded!',
};
const BOND_NAMES: Record<Bond, string> = { strong: 'Strong bond', steady: 'Steady bond', wary: 'Wary' };

/** BW layout: battle on the top screen, touch menu on the bottom screen. */
export class BattleScene extends Phaser.Scene {
  private battle!: Battle;
  private params!: BattleInit;
  private phase: Phase = 'intro';
  private sprites!: Record<Side, Phaser.GameObjects.Sprite>;
  private hpBoxes!: Record<Side, HpBox>;
  private message!: DialogBox;
  private menu!: Phaser.GameObjects.Container;
  private log: string[] = [];
  private bond: Bond | null = null;
  private sealGame?: SealMinigame;
  private progress!: Progress;
  private introEvents: BattleEvent[] = [];
  /** Team HP when the current events were made, so a Patchling switching in shows its HP before the foe's hit. */
  private hpBefore: number[] = [];
  private lastSeal: SealResult | null = null;

  constructor() { super('battle'); }

  init(data: BattleInit) {
    this.params = data;
    this.phase = 'intro';
    this.log = [];
    this.bond = null;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    const seed = this.params.seed ?? Math.floor(Math.random() * 2 ** 31);
    this.progress = this.registry.get('progress') as Progress;
    // The whole team comes along; the lead goes out first. Everyone is healed between battles for now.
    const team = this.progress.team.map((m) => createBattler(m.species, m.level, undefined, m.bond));
    this.battle = new Battle(team, createBattler(this.params.foe, this.params.level ?? FOE_LEVEL), createRng(seed));
    this.introEvents = this.battle.intro();

    this.drawBackdrop();
    this.sprites = {
      foe: this.addBattler('foe', 192, 100),
      player: this.addBattler('player', 66, 158),
    };
    this.hpBoxes = { foe: new HpBox(this, 6, 10, 'foe'), player: new HpBox(this, 136, 104, 'player') };
    this.hpBoxes.foe.set(this.battle.foe);
    this.hpBoxes.player.set(this.battle.player);
    this.message = new DialogBox(this);
    this.drawBottomScreen();
    this.menu = this.add.container(0, BOTTOM);

    this.exposeForTests();
    void this.playIntro();
  }

  // ---------- top screen ----------

  private drawBackdrop() {
    const g = this.add.graphics();
    const bands = [0x78b8e8, 0x88c4ec, 0x9cd0f0, 0xb4dcf0];
    bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * 18, SCREEN_W, 18));
    g.fillStyle(0xcfe8c8).fillRect(0, 72, SCREEN_W, 8);
    g.fillStyle(0x88c070).fillRect(0, 80, SCREEN_W, SCREEN_H - 80);
    g.fillStyle(0x78b060).fillRect(0, 118, SCREEN_W, SCREEN_H - 118);
    // Platforms
    g.fillStyle(0x5c9448).fillEllipse(192, 98, 116, 26);
    g.fillStyle(0x6ca858).fillEllipse(192, 96, 108, 20);
    g.fillStyle(0x5c9448).fillEllipse(66, 156, 150, 34);
    g.fillStyle(0x6ca858).fillEllipse(66, 153, 140, 26);
  }

  private addBattler(side: Side, x: number, y: number, species = this.battle.sides[side].species) {
    // BW shows your own Patchling from behind at 2x; species without a back sprite yet use the
    // front one mirrored.
    if (side === 'player' && this.textures.exists(backKey(species))) {
      const b = this.add.sprite(x, y + 8, backKey(species)).setOrigin(0.5, 1).setScale(2);
      if (this.anims.exists(backIdleAnimKey(species))) b.play(backIdleAnimKey(species));
      return b;
    }
    const s = this.add.sprite(x, y, frontKey(species)).setOrigin(0.5, 1);
    if (this.anims.exists(idleAnimKey(species))) s.play(idleAnimKey(species));
    if (side === 'player') s.setFlipX(true);
    if (this.registry.get(`placeholder:${frontKey(species)}`) !== undefined) {
      s.setData('label', pixelText(this, x, y - 14, 'placeholder', { color: '#ffffff', size: 6, shadow: '#000000' }).setOrigin(0.5, 0).setDepth(1));
    }
    return s;
  }

  // ---------- bottom screen ----------

  private drawBottomScreen() {
    screenBackdrop(this, BOTTOM);
    hinge(this);
  }

  private clearMenu() { this.menu.removeAll(true); }

  private showMainMenu() {
    this.phase = 'menu';
    this.clearMenu();
    const p = this.battle.player;
    this.message.prompt(`What will ${p.name} do?`);
    // The leader's assist: once per battle, and free (the Patchling still moves this turn).
    const leader = CHARACTERS[this.progress.leader];
    const canAssist = this.battle.canAssist();
    this.menu.add(button(this, 128, 24, 232, 30, `${leader.name.toUpperCase()}: ${leader.assist.name.toUpperCase()}`, TONES.patch,
      canAssist ? () => this.useAssist() : undefined, { sub: canAssist ? `${leader.assist.short} (once, free)` : 'used this battle', name: 'assist' }));
    this.menu.add(button(this, 128, 90, 200, 72, 'FIGHT', TONES.act, () => this.showFightMenu(), { size: TEXT_SIZE.title, name: 'fight' }));
    const canSeal = this.battle.canSeal();
    this.menu.add(button(this, 44, 160, 76, 40, 'SEAL', TONES.seal, canSeal ? () => this.trySeal() : undefined, { name: 'seal' }));
    this.menu.add(button(this, 128, 166, 76, 32, 'RUN', TONES.neutral, () => this.choose({ kind: 'run' }), { name: 'run' }));
    const canSwitch = this.battle.canSwitch();
    this.menu.add(button(this, 212, 160, 76, 40, 'TEAM', TONES.go, canSwitch ? () => this.showTeamMenu(false) : undefined, { name: 'team' }));
  }

  private async useAssist() {
    if (this.phase !== 'menu' || !this.battle.canAssist()) return;
    this.phase = 'playing';
    this.clearMenu();
    const leader = CHARACTERS[this.progress.leader];
    await this.playEvents(this.battle.assist(leader.assist.id, leader.name));
    if (leader.assist.id === 'scan') await this.record(recordScan(this.progress, this.battle.foe.species));
    this.showMainMenu();
  }

  /** Pick a Patchling to send in. Forced after a faint (no BACK, no foe turn). */
  private showTeamMenu(forced: boolean) {
    this.phase = forced ? 'switching' : 'team';
    this.clearMenu();
    if (forced) this.message.prompt('Who will you send in next?');
    const ok = new Set(this.battle.switchable());
    this.battle.team.forEach((b, i) => {
      const x = 66 + (i % 2) * 124;
      const y = 26 + Math.floor(i / 2) * 44;
      const color = shade(hexToNum(TYPES[b.types[0]].color), -0.3);
      const sub = i === this.battle.active ? 'IN BATTLE' : b.hp <= 0 ? 'FAINTED' : `HP ${b.hp}/${b.stats.hp}`;
      this.menu.add(button(this, x, y, 118, 38, `${b.name} Lv${b.level}`, color,
        ok.has(i) ? () => (forced ? this.sendIn(i) : this.choose({ kind: 'switch', index: i })) : undefined, { sub, name: `member${i}` }));
    });
    if (!forced) this.menu.add(button(this, 128, 172, 120, 28, 'BACK', TONES.neutral, () => this.showMainMenu(), { name: 'back' }));
  }

  private async sendIn(index: number) {
    if (this.phase !== 'switching') return;
    this.phase = 'playing';
    this.clearMenu();
    this.hpBefore = this.battle.team.map((b) => b.hp);
    await this.playEvents(this.battle.forceSwitch(index));
    this.showMainMenu();
  }

  /** After a turn's events: the battle ended, a fainted Patchling needs replacing, or back to the menu. */
  private async next() {
    if (this.battle.outcome) await this.afterBattle();
    else if (this.battle.needsSwitch) this.showTeamMenu(true);
    else this.showMainMenu();
  }

  private showFightMenu() {
    this.phase = 'fight';
    this.clearMenu();
    const p = this.battle.player;
    const usable = new Set(this.battle.usableMoves('player'));
    p.moves.forEach((slot, i) => {
      const m = MOVES[slot.id];
      const color = m.type ? shade(hexToNum(TYPES[m.type].color), -0.22) : TONES.neutral;
      const x = 66 + (i % 2) * 124;
      const y = 40 + Math.floor(i / 2) * 64;
      const ok = usable.has(i);
      // After Scan, moves show how well they land on the foe.
      const mult = this.battle.scanned && m.category !== 'status' ? effectiveness(m.type, this.battle.foe.types) : 1;
      const hint = mult === 1 ? '' : mult === 0 ? '  x0' : mult > 1 ? `  x${mult}` : '  x½';
      this.menu.add(button(this, x, y, 118, 56, m.name, color, ok ? () => this.choose({ kind: 'move', index: i }) : undefined, {
        sub: `${m.type ? TYPES[m.type].name : '-'}  PP ${slot.pp}/${slot.maxPp}${hint}`,
        name: `move${i}`,
      }));
    });
    if (usable.size === 0) {
      this.menu.add(button(this, 128, 104, 160, 40, 'STRUGGLE', TONES.neutral, () => this.choose({ kind: 'move', index: 0 }), { name: 'move0' }));
    }
    this.menu.add(button(this, 128, 172, 120, 28, 'BACK', TONES.neutral, () => this.showMainMenu(), { name: 'back' }));
  }

  private showEndMenu() {
    this.phase = 'over';
    this.clearMenu();
    const outcome = this.battle.outcome;
    const title = outcome === 'win' ? 'You won!' : outcome === 'lose' ? 'You blacked out...' : outcome === 'sealed' ? 'Sealed!' : 'Got away.';
    this.menu.add(pixelText(this, 128, 34, title, { color: TEXT_COLORS.light, size: TEXT_SIZE.title, shadow: '#000000' }).setOrigin(0.5));
    if (this.bond) this.menu.add(pixelText(this, 128, 58, BOND_NAMES[this.bond], { color: TEXT_COLORS.gold }).setOrigin(0.5));
    if (this.params.from === 'overworld') {
      this.menu.add(button(this, 128, 104, 200, 44, 'CONTINUE', TONES.go, () => this.scene.start('overworld'), { name: 'continue' }));
      this.menu.add(button(this, 128, 160, 120, 32, 'JOURNAL', TONES.seal, () => this.scene.start('journal', { from: 'overworld' }), { name: 'journal' }));
      return;
    }
    // Test battles (?foe=) cycle through the wild Patchlings.
    const next = FOE_ROTATION[(FOE_ROTATION.indexOf(this.params.foe) + 1) % FOE_ROTATION.length];
    this.menu.add(button(this, 128, 100, 200, 40, 'NEXT BATTLE', TONES.go, () => this.restart(next), { sub: `vs ${SPECIES[next].name}`, name: 'next' }));
    this.menu.add(button(this, 70, 156, 104, 36, 'REMATCH', TONES.neutral, () => this.restart(this.params.foe), { name: 'rematch' }));
    this.menu.add(button(this, 186, 156, 104, 36, 'JOURNAL', TONES.seal, () => this.scene.start('journal', { foe: this.params.foe }), { name: 'journal' }));
  }

  private restart(foe: string) {
    this.scene.restart({ foe });
  }

  // ---------- flow ----------

  private async playIntro() {
    this.clearMenu();
    await this.playEvents(this.introEvents);
    await this.record(recordEncounter(this.progress, this.battle.foe.species));
    this.showMainMenu();
  }

  /** Saves progress and announces a bestiary stage change, if any. */
  private async record(change: DexChange | null) {
    saveProgress(this.progress);
    if (change) await this.say(`Bestiary: ${SPECIES[change.species].name} ${STAGE_TEXT[change.to]}`);
  }

  private async say(text: string) {
    this.log.push(text);
    await this.message.show(text);
  }

  /** After the battle: a defeat or a seal moves the bestiary; a seal adds to the team or sanctuary. */
  private async afterBattle() {
    const foe = this.battle.foe;
    if (this.battle.outcome === 'win') await this.record(recordDefeat(this.progress, foe.species));
    if (this.battle.outcome === 'sealed' && this.bond) {
      const { where, change } = recordSeal(this.progress, foe.species, foe.level, this.bond);
      await this.say(where === 'team' ? `${foe.name} joined your team!` : `Your team is full, so ${foe.name} went to the sanctuary.`);
      await this.record(change);
    }
    this.showEndMenu();
  }

  private async choose(action: PlayerAction) {
    if (this.phase !== 'menu' && this.phase !== 'fight' && this.phase !== 'team') return;
    this.phase = 'playing';
    this.clearMenu();
    this.menu.add(pixelText(this, 128, 96, 'tap to speed up', { color: TEXT_COLORS.dim }).setOrigin(0.5));
    this.hpBefore = this.battle.team.map((b) => b.hp);
    await this.playEvents(this.battle.runTurn(action));
    await this.next();
  }

  private async trySeal() {
    if (this.phase !== 'menu') return;
    this.phase = 'sealing';
    this.clearMenu();
    const foe = this.battle.foe;
    const hpFrac = foe.hp / foe.stats.hp;
    this.message.prompt(`Seal ${foe.name}! Tap as each ring lands.`);
    const s = this.sprites.foe;
    const game = new SealMinigame(this, { x: s.x, y: s.y - 26 }, sealPattern(foe.types[0]), sealWindows(hpFrac), hpFrac, TYPES[foe.types[0]].color);
    this.sealGame = game;
    const result = await game.play();
    this.sealGame = undefined;
    this.lastSeal = result;
    this.phase = 'playing';
    this.hpBefore = this.battle.team.map((b) => b.hp);
    await this.playEvents(this.battle.seal(result));
    await this.next();
  }

  private async playEvents(events: BattleEvent[]) {
    for (const e of events) {
      switch (e.kind) {
        case 'text':
          await this.say(e.text);
          break;
        case 'move':
          await this.lunge(e.side);
          break;
        case 'hp':
          await Promise.all([this.flash(e.side, e.hp < this.hpBoxes[e.side].hp), this.hpBoxes[e.side].animateTo(e.hp, e.maxHp)]);
          break;
        case 'status':
          this.hpBoxes[e.side].setStatus(e.status);
          break;
        case 'stat':
          await this.statFlash(e.side, e.delta > 0);
          break;
        case 'faint':
          await this.faint(e.side);
          break;
        case 'scan':
          await this.statFlash('foe', true);
          break;
        case 'switch':
          await this.swapIn(e.index);
          break;
        case 'sealed':
          this.bond = e.bond;
          await this.sealAway();
          break;
        case 'end':
          break;
      }
    }
  }

  private lunge(side: Side) {
    const s = this.sprites[side];
    const dx = side === 'player' ? 10 : -10;
    return tweenAsync(this, { targets: s, x: s.x + dx, y: s.y + (side === 'player' ? -4 : 4), duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }

  private async flash(side: Side, hurt: boolean) {
    if (!hurt) return;
    const s = this.sprites[side];
    for (let i = 0; i < 3; i++) {
      s.setAlpha(0);
      await wait(this, 60);
      s.setAlpha(1);
      await wait(this, 60);
    }
  }

  private async statFlash(side: Side, up: boolean) {
    const s = this.sprites[side];
    s.setTintFill(up ? 0x80c0ff : 0xff8080);
    await wait(this, 120);
    s.clearTint();
    await wait(this, 80);
  }

  /** The outgoing Patchling shrinks away (unless it already fainted) and the new one pops in. */
  private async swapIn(index: number) {
    const old = this.sprites.player;
    if (old.alpha > 0) await tweenAsync(this, { targets: old, scaleX: 0, scaleY: 0, duration: 200, ease: 'Quad.easeIn' });
    (old.getData('label') as Phaser.GameObjects.Text | undefined)?.destroy();
    old.destroy();
    const b = this.battle.team[index];
    const s = this.addBattler('player', 66, 158, b.species);
    const scale = s.scaleX;
    s.setScale(0);
    this.sprites.player = s;
    this.hpBoxes.player.set({ ...b, hp: this.hpBefore[index] ?? b.hp, status: b.status });
    await tweenAsync(this, { targets: s, scaleX: scale, scaleY: scale, duration: 220, ease: 'Back.easeOut' });
  }

  private faint(side: Side) {
    const s = this.sprites[side];
    s.stop();
    const label = s.getData('label') as Phaser.GameObjects.Text | undefined;
    return tweenAsync(this, { targets: label ? [s, label] : s, y: '+=40', alpha: 0, duration: 400, ease: 'Quad.easeIn' });
  }

  /** The sealed Patchling glows its type colour and shrinks into the seal. */
  private async sealAway() {
    const s = this.sprites.foe;
    s.stop();
    s.setTintFill(Phaser.Display.Color.HexStringToColor(TYPES[this.battle.foe.types[0]].color).color);
    await tweenAsync(this, { targets: s, scaleX: 0, scaleY: 0, y: s.y - 26, duration: 450, ease: 'Back.easeIn' });
    s.setVisible(false);
  }

  private exposeForTests() {
    (window as unknown as Record<string, unknown>).__battle = {
      phase: () => this.phase,
      outcome: () => this.battle.outcome,
      foe: () => ({ species: this.battle.foe.species, level: this.battle.foe.level }),
      bond: () => this.bond,
      active: () => this.battle.player.name,
      sealBeatsIn: () => this.sealGame?.msToBeats() ?? null,
      lastSeal: () => this.lastSeal,
      log: () => [...this.log],
      hp: () => ({ player: this.battle.player.hp, foe: this.battle.foe.hp }),
      /** Centre of a named bottom-screen button in page (CSS) pixels, for real taps in e2e. */
      buttonAt: (name: string) => buttonPagePoint(this, this.menu, name),
    };
  }
}

// ---------- widgets ----------

class HpBox {
  hp = 0;
  private maxHp = 1;
  private meter: Meter;
  private nums?: Phaser.GameObjects.Text;
  private name: Phaser.GameObjects.Text;
  private level: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.Container;

  constructor(private scene: Phaser.Scene, x: number, y: number, side: Side) {
    const w = 114;
    const h = side === 'player' ? 38 : 30;
    drawPanel(scene.add.graphics(), x, y, w, h, 'paper');
    this.name = pixelText(scene, x + 8, y + 6, '');
    this.level = pixelText(scene, x + w - 7, y + 8, '', { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small }).setOrigin(1, 0);
    const tag = scene.add.graphics();
    tag.fillStyle(COLORS.ink).fillRect(x + 31, y + 17, 15, 8);
    pixelText(scene, x + 33, y + 18, 'HP', { color: TEXT_COLORS.gold, size: TEXT_SIZE.tiny });
    this.meter = new Meter(scene, x + 46, y + 19, w - 54, 4);
    if (side === 'player') this.nums = pixelText(scene, x + w - 7, y + 27, '', { size: TEXT_SIZE.small }).setOrigin(1, 0);
    this.status = scene.add.container(x + 7, y + 16);
  }

  set(b: { name: string; level: number; hp: number; stats: { hp: number }; status: StatusId | null }) {
    this.name.setText(b.name);
    this.level.setText(`Lv${b.level}`);
    this.hp = b.hp;
    this.maxHp = b.stats.hp;
    this.draw(b.hp);
    this.setStatus(b.status);
  }

  setStatus(status: StatusId | null) {
    this.status.removeAll(true);
    if (status) this.status.add(chip(this.scene, 0, 0, status, STATUS_COLORS[status]));
  }

  animateTo(hp: number, maxHp: number) {
    this.maxHp = maxHp;
    const from = this.hp;
    this.hp = hp;
    const counter = { v: from };
    return tweenAsync(this.scene, {
      targets: counter, v: hp, duration: Math.min(800, 200 + Math.abs(from - hp) * 25),
      onUpdate: () => this.draw(Math.round(counter.v)),
    });
  }

  private draw(hp: number) {
    const frac = Math.max(0, hp / this.maxHp);
    this.meter.draw(frac, frac > 0.5 ? 0x48c860 : frac > 0.2 ? 0xf2b630 : 0xe8483a);
    this.nums?.setText(`${hp}/${this.maxHp}`);
  }
}
