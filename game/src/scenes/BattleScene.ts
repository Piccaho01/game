import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { Battle, type BattleEvent, type PlayerAction, type Side } from '../engine/battle';
import { createBattler } from '../engine/battler';
import { MOVES, SPECIES, TYPES, type StatusId } from '../engine/data';
import { createRng } from '../engine/rng';
import { sealPattern, sealWindows, type Bond, type SealResult } from '../engine/seal';
import { pixelText } from '../ui/text';
import { backIdleAnimKey, backKey, frontKey, idleAnimKey } from './BootScene';
import { SealMinigame } from './SealMinigame';

interface BattleInit { player: string; foe: string; seed?: number }
type Phase = 'intro' | 'menu' | 'fight' | 'playing' | 'sealing' | 'over';

const PLAYER_LEVEL = 8;
const FOE_LEVEL = 5;
/** Wild foes the "Next battle" button cycles through. */
const FOE_ROTATION = ['sprigby', 'zapail', 'gobbin'];
const STATUS_COLORS: Record<StatusId, number> = { brn: 0xe8603c, par: 0xd8b020, psn: 0xa050c0, slp: 0x8890a0 };
const BOTTOM = SCREEN_H;
const BOND_NAMES: Record<Bond, string> = { strong: 'Strong bond', steady: 'Steady bond', wary: 'Wary' };
const CHAR_MS = 18;
const LINE_HOLD_MS = 700;

/** BW layout: battle on the top screen, touch menu on the bottom screen. */
export class BattleScene extends Phaser.Scene {
  private battle!: Battle;
  private params!: BattleInit;
  private phase: Phase = 'intro';
  private sprites!: Record<Side, Phaser.GameObjects.Sprite>;
  private hpBoxes!: Record<Side, HpBox>;
  private message!: MessageBox;
  private menu!: Phaser.GameObjects.Container;
  private log: string[] = [];
  private bond: Bond | null = null;
  private sealGame?: SealMinigame;
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
    this.battle = new Battle(createBattler(this.params.player, PLAYER_LEVEL), createBattler(this.params.foe, FOE_LEVEL), createRng(seed));

    this.drawBackdrop();
    this.sprites = {
      foe: this.addBattler('foe', 192, 100),
      // Back sprites arrive in M2; until then the front sprite is mirrored to face the foe.
      player: this.addBattler('player', 66, 158),
    };
    this.hpBoxes = { foe: new HpBox(this, 6, 10, 'foe'), player: new HpBox(this, 136, 104, 'player') };
    this.hpBoxes.foe.set(this.battle.foe);
    this.hpBoxes.player.set(this.battle.player);
    this.message = new MessageBox(this);
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

  private addBattler(side: Side, x: number, y: number) {
    const species = this.battle.sides[side].species;
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
    const g = this.add.graphics();
    g.fillStyle(0x282838).fillRect(0, BOTTOM, SCREEN_W, SCREEN_H);
    for (let y = 0; y < SCREEN_H; y += 8) g.fillStyle(y % 16 ? 0x2e2e40 : 0x323246).fillRect(0, BOTTOM + y, SCREEN_W, 4);
    g.fillStyle(0x101018).fillRect(0, BOTTOM - 2, SCREEN_W, 4);
  }

  private clearMenu() { this.menu.removeAll(true); }

  private showMainMenu() {
    this.phase = 'menu';
    this.clearMenu();
    const p = this.battle.player;
    this.message.prompt(`What will ${p.name} do?`);
    this.menu.add(button(this, 128, 76, 200, 84, 'FIGHT', 0xd04040, () => this.showFightMenu(), { size: 16, name: 'fight' }));
    const canSeal = this.battle.canSeal();
    this.menu.add(button(this, 44, 160, 76, 40, 'SEAL', canSeal ? 0x9050c0 : 0x505058, canSeal ? () => this.trySeal() : undefined, { name: 'seal' }));
    this.menu.add(button(this, 128, 166, 76, 32, 'RUN', 0x4070c0, () => this.choose({ kind: 'run' }), { name: 'run' }));
    this.menu.add(button(this, 212, 160, 76, 40, 'TEAM', 0x707080, undefined, { sub: 'soon' }));
  }

  private showFightMenu() {
    this.phase = 'fight';
    this.clearMenu();
    const p = this.battle.player;
    const usable = new Set(this.battle.usableMoves('player'));
    p.moves.forEach((slot, i) => {
      const m = MOVES[slot.id];
      const color = m.type ? Phaser.Display.Color.HexStringToColor(TYPES[m.type].color).color : 0x808080;
      const x = 66 + (i % 2) * 124;
      const y = 40 + Math.floor(i / 2) * 64;
      const ok = usable.has(i);
      this.menu.add(button(this, x, y, 118, 56, m.name, ok ? color : 0x505058, ok ? () => this.choose({ kind: 'move', index: i }) : undefined, {
        sub: `${m.type ? TYPES[m.type].name : '-'}  PP ${slot.pp}/${slot.maxPp}`,
        name: `move${i}`,
      }));
    });
    if (usable.size === 0) {
      this.menu.add(button(this, 128, 104, 160, 40, 'STRUGGLE', 0x808080, () => this.choose({ kind: 'move', index: 0 }), { name: 'move0' }));
    }
    this.menu.add(button(this, 128, 172, 120, 28, 'BACK', 0x505060, () => this.showMainMenu(), { name: 'back' }));
  }

  private showEndMenu() {
    this.phase = 'over';
    this.clearMenu();
    const outcome = this.battle.outcome;
    const title = outcome === 'win' ? 'You won!' : outcome === 'lose' ? 'You blacked out...' : outcome === 'sealed' ? 'Sealed!' : 'Got away.';
    this.menu.add(pixelText(this, 128, 40, title, { color: '#ffffff', size: 16 }).setOrigin(0.5));
    if (this.bond) this.menu.add(pixelText(this, 128, 62, BOND_NAMES[this.bond], { color: '#d0b0ff' }).setOrigin(0.5));
    const next = FOE_ROTATION[(FOE_ROTATION.indexOf(this.params.foe) + 1) % FOE_ROTATION.length];
    this.menu.add(button(this, 128, 104, 200, 44, 'NEXT BATTLE', 0x40a060, () => this.restart(next), { sub: `vs ${SPECIES[next].name}`, name: 'next' }));
    this.menu.add(button(this, 128, 158, 200, 36, 'REMATCH', 0x505060, () => this.restart(this.params.foe), { name: 'rematch' }));
  }

  private restart(foe: string) {
    this.scene.restart({ player: this.params.player, foe });
  }

  // ---------- flow ----------

  private async playIntro() {
    this.clearMenu();
    await this.playEvents(this.battle.intro());
    this.showMainMenu();
  }

  private async choose(action: PlayerAction) {
    if (this.phase !== 'menu' && this.phase !== 'fight') return;
    this.phase = 'playing';
    this.clearMenu();
    this.menu.add(pixelText(this, 128, 96, 'tap to speed up', { color: '#8888a0' }).setOrigin(0.5));
    await this.playEvents(this.battle.runTurn(action));
    if (this.battle.outcome) this.showEndMenu();
    else this.showMainMenu();
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
    await this.playEvents(this.battle.seal(result));
    if (this.battle.outcome) this.showEndMenu();
    else this.showMainMenu();
  }

  private async playEvents(events: BattleEvent[]) {
    for (const e of events) {
      switch (e.kind) {
        case 'text':
          this.log.push(e.text);
          await this.message.show(e.text);
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
      bond: () => this.bond,
      sealBeatsIn: () => this.sealGame?.msToBeats() ?? null,
      lastSeal: () => this.lastSeal,
      log: () => [...this.log],
      hp: () => ({ player: this.battle.player.hp, foe: this.battle.foe.hp }),
      /** Centre of a named bottom-screen button in page (CSS) pixels, for real taps in e2e. */
      buttonAt: (name: string) => {
        const obj = this.menu.list.find((o) => (o as Phaser.GameObjects.Container).name === name) as Phaser.GameObjects.Container | undefined;
        if (!obj) return null;
        const rect = this.game.canvas.getBoundingClientRect();
        const sx = rect.width / this.game.canvas.width;
        const sy = rect.height / this.game.canvas.height;
        return { x: rect.left + obj.x * ZOOM * sx, y: rect.top + (obj.y + BOTTOM) * ZOOM * sy };
      },
    };
  }
}

// ---------- widgets ----------

class HpBox {
  hp = 0;
  private maxHp = 1;
  private bar: Phaser.GameObjects.Rectangle;
  private nums?: Phaser.GameObjects.Text;
  private name: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.Container;
  private readonly barW = 64;

  constructor(private scene: Phaser.Scene, x: number, y: number, side: Side) {
    const w = 114;
    const h = side === 'player' ? 38 : 28;
    const g = scene.add.graphics();
    g.fillStyle(0x202020).fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 4);
    g.fillStyle(0xf8f8f0).fillRoundedRect(x, y, w, h, 3);
    g.fillStyle(0xd8d8c8).fillRect(x + 3, y + h - 4, w - 6, 2);
    this.name = pixelText(scene, x + 6, y + 5, '');
    g.fillStyle(0x404040).fillRoundedRect(x + 30, y + 15, this.barW + 20, 9, 2);
    pixelText(scene, x + 33, y + 17, 'HP', { color: '#f8c040', size: 5 });
    g.fillStyle(0x303030).fillRect(x + 46, y + 17, this.barW, 5);
    this.bar = scene.add.rectangle(x + 46, y + 17, this.barW, 5, 0x48d848).setOrigin(0, 0);
    if (side === 'player') this.nums = pixelText(scene, x + w - 6, y + 26, '').setOrigin(1, 0);
    this.status = scene.add.container(x + 6, y + 16);
  }

  set(b: { name: string; level: number; hp: number; stats: { hp: number }; status: StatusId | null }) {
    this.name.setText(`${b.name}  Lv${b.level}`);
    this.hp = b.hp;
    this.maxHp = b.stats.hp;
    this.draw(b.hp);
    this.setStatus(b.status);
  }

  setStatus(status: StatusId | null) {
    this.status.removeAll(true);
    if (!status) return;
    this.status.add(this.scene.add.rectangle(0, 0, 22, 9, STATUS_COLORS[status]).setOrigin(0, 0));
    this.status.add(pixelText(this.scene, 11, 2, status.toUpperCase(), { color: '#ffffff', size: 6 }).setOrigin(0.5, 0));
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
    this.bar.width = Math.ceil(this.barW * frac);
    this.bar.fillColor = frac > 0.5 ? 0x48d848 : frac > 0.2 ? 0xf8c030 : 0xf04838;
    this.nums?.setText(`${hp}/${this.maxHp}`);
  }
}

class MessageBox {
  private text: Phaser.GameObjects.Text;
  private skip?: () => void;

  constructor(private scene: Phaser.Scene) {
    const y = SCREEN_H - 46;
    const g = scene.add.graphics().setDepth(5);
    g.fillStyle(0x283048).fillRect(0, y, SCREEN_W, 46);
    g.fillStyle(0xf8f8f8).fillRoundedRect(4, y + 4, SCREEN_W - 8, 38, 4);
    g.lineStyle(2, 0x5878a8).strokeRoundedRect(4, y + 4, SCREEN_W - 8, 38, 4);
    this.text = pixelText(scene, 12, y + 10, '', { wrap: SCREEN_W - 24 }).setDepth(6);
    // A tap anywhere skips typing or the pause after a line.
    scene.input.on('pointerdown', () => this.skip?.());
  }

  /** A line that stays up while the player chooses. */
  prompt(line: string) {
    this.text.setText(line);
  }

  /** Types the line out, then waits briefly (or for a tap) before resolving. */
  show(line: string) {
    return new Promise<void>((resolve) => {
      let done = false;
      let hold: Phaser.Time.TimerEvent | undefined;
      this.text.setText('');
      // Driven by elapsed time, not frames, so slow devices skip letters instead of crawling.
      const counter = { shown: 0 };
      const typer = this.scene.tweens.add({
        targets: counter, shown: line.length, duration: line.length * CHAR_MS,
        onUpdate: () => this.text.setText(line.slice(0, Math.floor(counter.shown))),
        onComplete: () => finishTyping(),
      });
      const finish = () => {
        if (done) return;
        done = true;
        hold?.remove();
        this.skip = undefined;
        resolve();
      };
      const finishTyping = () => {
        if (hold) return;
        typer.stop();
        this.text.setText(line);
        hold = this.scene.time.delayedCall(LINE_HOLD_MS, finish);
        this.skip = finish;
      };
      this.skip = finishTyping;
    });
  }
}

function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, color: number,
  onTap?: () => void, opts: { size?: number; sub?: string; name?: string } = {},
) {
  const c = scene.add.container(x, y);
  if (opts.name) c.setName(opts.name);
  const light = Phaser.Display.Color.ValueToColor(color).lighten(18).color;
  const dark = Phaser.Display.Color.ValueToColor(color).darken(30).color;
  const g = scene.add.graphics();
  g.fillStyle(0x101018).fillRoundedRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 4, 8);
  g.fillStyle(dark).fillRoundedRect(-w / 2, -h / 2 + 2, w, h, 7);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 7);
  g.fillStyle(light).fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, Math.min(8, h / 4), 3);
  c.add(g);
  const textY = opts.sub ? -6 : 0;
  c.add(pixelText(scene, 0, textY, label, { color: onTap ? '#ffffff' : '#b0b0b8', size: opts.size ?? 8, shadow: '#00000080' }).setOrigin(0.5));
  if (opts.sub) c.add(pixelText(scene, 0, 10, opts.sub, { color: '#f0f0f0', size: 6 }).setOrigin(0.5));
  if (onTap) {
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => c.setY(y + 2));
    c.on('pointerout', () => c.setY(y));
    c.on('pointerup', () => { c.setY(y); onTap(); });
  }
  return c;
}

function wait(scene: Phaser.Scene, ms: number) {
  return new Promise<void>((r) => scene.time.delayedCall(ms, r));
}

function tweenAsync(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig) {
  return new Promise<void>((r) => scene.tweens.add({ ...config, onComplete: () => r() }));
}
