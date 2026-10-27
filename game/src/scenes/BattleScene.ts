import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { Battle, type BattleEvent, type PlayerAction, type Side } from '../engine/battle';
import { createBattler } from '../engine/battler';
import { CHARACTERS, healTeam, keepBattleDamage, leaderTeam, recordDefeat, recordEncounter, recordScan, recordSeal, teamBattlers, type DexChange, type Progress } from '../engine/progress';
import { HEAL_SPOT } from '../engine/overworld';
import { effectiveness } from '../engine/typeChart';
import { MOVES, SPECIES, TYPES } from '../engine/data';
import { createRng } from '../engine/rng';
import { sealPattern, sealWindows, type Bond, type SealResult } from '../engine/seal';
import { DialogBox } from '../ui/dialog';
import { button, buttonPagePoint, hinge, listRow, monIcon, pxRect, screenBackdrop } from '../ui/kit';
import { assistBar, assistCutIn, banner, commandButton, gloveDecal, InfoCard, runDecal, scrollDecal, teamDecal } from '../ui/battleKit';
import { sfx } from '../ui/sfx';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { tweenAsync, wait } from '../ui/widgets';
import { saveProgress } from '../save';
import { applyScroll, count, ITEMS, scrollsInBag, scrollWindows, useItem } from '../engine/items';
import { awardXp, levelProgress, whose, xpYield } from '../engine/levels';
import { itemKey } from './BootScene';
import { backIdleAnimKey, backKey, battleBgKey, frontKey, idleAnimKey, trainerKey, walkKey } from './BootScene';
import { SealMinigame } from './SealMinigame';

/**
 * `from: 'overworld'`: a wild encounter, which goes back to the same spot when it ends.
 * `bg`: the location's backdrop (the map's `battle`); test battles use Hollow Rest's.
 */
interface BattleInit { foe: string; seed?: number; level?: number; from?: 'overworld'; bg?: string }
type Phase = 'intro' | 'menu' | 'fight' | 'team' | 'scrolls' | 'switching' | 'playing' | 'sealing' | 'over';

const FOE_LEVEL = 5;
/** Wild foes the "Next battle" button cycles through: Route 1's commons first, then the starters. */
const FOE_ROTATION = ['orbitot', 'fledjet', 'sprigby', 'zapail', 'gobbin', 'furnaxol'];
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
  private hpBoxes!: Record<Side, InfoCard>;
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
    // Every screen eases in.
    this.cameras.main.fadeIn(180, 16, 16, 24);
    const seed = this.params.seed ?? Math.floor(Math.random() * 2 ** 31);
    this.progress = this.registry.get('progress') as Progress;
    // The whole team comes along; the lead goes out first. Everyone is healed between battles for now.
    // Wild battles from the overworld carry HP between fights; test battles (?foe=) start fresh.
    const team = this.params.from === 'overworld'
      ? teamBattlers(this.progress)
      : leaderTeam(this.progress).map((m) => createBattler(m.species, m.level, undefined, m.bond));
    this.battle = new Battle(team, createBattler(this.params.foe, this.params.level ?? FOE_LEVEL), createRng(seed));
    this.introEvents = this.battle.intro();

    this.drawBackdrop();
    this.sprites = {
      foe: this.addBattler('foe', 192, 100),
      player: this.addBattler('player', 66, 158),
    };
    this.hpBoxes = { foe: new InfoCard(this, 'foe', 10), player: new InfoCard(this, 'player', 102) };
    this.setCard('foe', this.battle.foe);
    this.setCard('player', this.battle.player);
    this.showXp();
    this.message = new DialogBox(this);
    this.drawBottomScreen();
    this.menu = this.add.container(0, BOTTOM);

    this.exposeForTests();
    void this.playIntro();
  }

  // ---------- top screen ----------

  /** The player card's XP bar for the active Patchling. */
  private showXp(index = this.battle.active) {
    const m = leaderTeam(this.progress)[index];
    this.hpBoxes.player.setXp(m ? levelProgress(m) : 0);
  }

  private setCard(side: Side, b: Parameters<InfoCard['set']>[0]) {
    this.hpBoxes[side].set(b, (t) => shade(hexToNum(TYPES[t as keyof typeof TYPES].color), -0.15), (t) => TYPES[t as keyof typeof TYPES].name);
  }

  /** The location's backdrop (the owner's drawings) with soft platforms; plain bands if it has none. */
  private drawBackdrop() {
    const key = battleBgKey(this.params.bg ?? 'hollow_rest');
    if (this.textures.exists(key)) {
      this.add.image(0, 0, key).setOrigin(0, 0);
      const g = this.add.graphics();
      g.fillStyle(0x1c1b29, 0.22).fillEllipse(192, 99, 120, 24);
      g.fillStyle(0xffffff, 0.08).fillEllipse(192, 96, 104, 14);
      g.fillStyle(0x1c1b29, 0.22).fillEllipse(66, 158, 156, 32);
      g.fillStyle(0xffffff, 0.08).fillEllipse(66, 154, 136, 18);
      return;
    }
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
    // The question moves to the touch screen, next to the leader's face; the top screen stays clear.
    this.message.hide();
    const leaderId = this.progress.leader;
    const leader = CHARACTERS[leaderId];
    this.drawHeader(leaderId, `What will ${p.name} do?`);
    const scrolls = scrollsInBag(this.progress).reduce((n, id) => n + count(this.progress, id), 0);
    const canSeal = this.battle.canSeal() && scrolls > 0;
    const canSwitch = this.battle.canSwitch();
    const ready = this.battle.switchable().length;
    const moves = this.battle.usableMoves('player').length;
    this.menu.add(commandButton(this, 66, 64, 116, 36, {
      label: 'FIGHT', hint: moves ? `${moves} move${moves === 1 ? '' : 's'}` : 'Struggle', color: 0xc94f2c, icon: 'fight', name: 'fight',
      decal: (sc, w) => gloveDecal(sc, w / 2 - 22, 0), onTap: () => this.showFightMenu(),
    }));
    this.menu.add(commandButton(this, 190, 64, 116, 36, {
      label: 'SEAL', hint: !this.battle.canSeal() ? 'Not now' : scrolls ? `${scrolls} scroll${scrolls === 1 ? '' : 's'}` : 'No scrolls', color: 0x7a52b8, icon: 'seal', name: 'seal',
      decal: (sc, w) => scrollDecal(sc, w / 2 - 20, 0), onTap: canSeal ? () => this.showScrollMenu() : undefined,
    }));
    this.menu.add(commandButton(this, 66, 108, 116, 36, {
      label: 'TEAM', hint: canSwitch ? `${ready} ready` : 'No one else', color: 0x3a78c8, icon: 'team', name: 'team',
      decal: (sc, w) => teamDecal(sc, w / 2 - 18, 4, this.battle.team.map((b) => frontKey(b.species))),
      onTap: canSwitch ? () => this.showTeamMenu(false) : undefined,
    }));
    this.menu.add(commandButton(this, 190, 108, 116, 36, {
      label: 'RUN', hint: 'Get away', color: 0x4b4f66, icon: 'run', name: 'run',
      decal: (sc, w) => runDecal(sc, -w / 2 - 10, w / 2 + 10, 4, frontKey(p.species)), onTap: () => this.choose({ kind: 'run' }),
    }));
    // The leader's assist: once per battle, and free (the Patchling still moves this turn).
    this.menu.add(assistBar(this, 128, 150, 236, 20, {
      name: leader.assist.name, short: leader.assist.short, onTap: this.battle.canAssist() ? () => this.useAssist() : undefined,
    }));
  }

  /** The touch screen's header card: the leader's face, their name, the question. */
  private drawHeader(leaderId: keyof typeof CHARACTERS, text: string) {
    const leader = CHARACTERS[leaderId];
    const g = this.add.graphics();
    pxRect(g, 5, 5, 246, 30, COLORS.ink, 4);
    pxRect(g, 6, 6, 244, 27, COLORS.paperShade, 3);
    pxRect(g, 6, 6, 244, 25, 0xf8f1de, 3);
    pxRect(g, 6, 6, 28, 25, hexToNum(leader.color), 3);
    g.fillStyle(COLORS.ink).fillRect(34, 6, 1, 25);
    this.menu.add(g);
    if (this.textures.exists(walkKey(leaderId))) {
      // Head and shoulders from their walk sprite.
      this.menu.add(this.add.image(20, 4, walkKey(leaderId), 0).setOrigin(0.5, 0).setCrop(0, 2, 24, 27));
    }
    this.menu.add(pixelText(this, 41, 10, leader.name.toUpperCase(), { color: TEXT_COLORS.rust, size: TEXT_SIZE.tiny, display: true }));
    this.menu.add(pixelText(this, 41, 17, text, { size: TEXT_SIZE.body }));
  }

  private async useAssist() {
    if (this.phase !== 'menu' || !this.battle.canAssist()) return;
    this.phase = 'playing';
    this.clearMenu();
    const leader = CHARACTERS[this.progress.leader];
    await assistCutIn(this, {
      color: shade(hexToNum(leader.color), -0.1), accent: hexToNum(leader.assist.accent), trainerKey: trainerKey(this.progress.leader),
      word: `${leader.assist.name}!`, line: leader.assist.shout,
    });
    await this.playEvents(this.battle.assist(leader.assist.id, leader.name));
    if (leader.assist.id === 'scan') await this.record(recordScan(this.progress, this.battle.foe.species));
    this.showMainMenu();
  }

  /** Pick a Patchling to send in. Forced after a faint (no BACK, no foe turn). */
  private showTeamMenu(forced: boolean) {
    this.phase = forced ? 'switching' : 'team';
    this.clearMenu();
    if (forced) this.message.prompt('Who will you send in next?');
    else this.message.prompt(`Who should swap in for ${this.battle.player.name}?`);
    const ok = new Set(this.battle.switchable());
    this.battle.team.forEach((b, i) => {
      const x = 66 + (i % 2) * 124;
      const y = 26 + Math.floor(i / 2) * 44;
      const color = shade(hexToNum(TYPES[b.types[0]].color), -0.3);
      const sub = i === this.battle.active ? 'In battle' : b.hp <= 0 ? 'Fainted' : `HP ${b.hp}/${b.stats.hp}`;
      const f = b.hp / b.stats.hp;
      this.menu.add(listRow(this, x, y, 118, 38, {
        title: b.name, sub, right: `Lv${b.level}`, color, icon: monIcon(frontKey(b.species)),
        meter: { frac: f, color: f > 0.5 ? 0x5fe0a8 : f > 0.2 ? 0xf2c14e : 0xff6a5a },
        onTap: ok.has(i) ? () => (forced ? this.sendIn(i) : this.choose({ kind: 'switch', index: i })) : undefined, name: `member${i}`,
      }));
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
    this.message.prompt(`What will ${p.name} use?`);
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
      this.menu.add(listRow(this, x, y, 118, 52, {
        title: m.name, titleSize: TEXT_SIZE.small, sub: `PP ${slot.pp}/${slot.maxPp}${hint}`, color, icon: { text: m.type ? TYPES[m.type].name.slice(0, 3).toUpperCase() : '-' },
        meter: { frac: slot.pp / slot.maxPp, color: 0xffffff },
        onTap: ok ? () => this.choose({ kind: 'move', index: i }) : undefined, name: `move${i}`,
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
      // Blacking out wakes you up at PATCH's, healed.
      const notice = this.battle.outcome === 'lose' ? 'blackout' : undefined;
      this.menu.add(button(this, 128, 104, 200, 44, 'CONTINUE', TONES.go, () => this.scene.start('overworld', { notice }), { name: 'continue' }));
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
    // Both slide onto their platforms, the cards follow, then the banner sweeps across.
    const foe = this.sprites.foe;
    const me = this.sprites.player;
    const fx = foe.x;
    const mx = me.x;
    foe.setX(fx + 170);
    me.setX(mx - 170);
    sfx('swish');
    await Promise.all([
      tweenAsync(this, { targets: foe, x: fx, duration: 420, ease: 'Cubic.easeOut' }),
      tweenAsync(this, { targets: me, x: mx, duration: 420, delay: 80, ease: 'Cubic.easeOut' }),
      this.hpBoxes.foe.slideIn(200),
      this.hpBoxes.player.slideIn(300),
    ]);
    await banner(this, `A WILD ${this.battle.foe.name.toUpperCase()}!`);
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
    if (this.params.from === 'overworld') {
      keepBattleDamage(this.progress, this.battle.team);
      if (this.battle.outcome === 'lose') {
        healTeam(this.progress);
        this.progress.pos = { ...HEAL_SPOT };
      }
      saveProgress(this.progress);
    }
    const foe = this.battle.foe;
    if (this.battle.outcome === 'win') await this.record(recordDefeat(this.progress, foe.species));
    if (this.battle.outcome === 'sealed' && this.bond) {
      const { where, change } = recordSeal(this.progress, foe.species, foe.level, this.bond);
      await this.say(where === 'team' ? `${foe.name} joined your team!` : `Your team is full, so ${foe.name} went to the sanctuary.`);
      await this.record(change);
    }
    if (this.battle.outcome === 'win' || this.battle.outcome === 'sealed') await this.shareXp(xpYield(foe.species, foe.level));
    this.showEndMenu();
  }

  /** Experience for everyone (bible §7): the active Patchling's bar fills, level-ups are announced. */
  private async shareXp(amount: number) {
    const active = leaderTeam(this.progress)[this.battle.active];
    const before = active ? levelProgress(active) : 0;
    const beforeLevel = active?.level ?? 0;
    const ups = awardXp(this.progress, amount);
    saveProgress(this.progress);
    await this.say(`All four teams gained ${amount} XP!`);
    if (active) await this.hpBoxes.player.animateXp(before, levelProgress(active), active.level - beforeLevel);
    const mine = ups.filter((u) => u.owner === this.progress.leader);
    for (const u of mine) {
      sfx('heal');
      await this.say(`${whose(u).replace(/^.*'s /, '')} grew to Lv${u.to}!`);
      for (const m of u.learned) await this.say(`${whose(u).replace(/^.*'s /, '')} learned ${MOVES[m].name}!`);
    }
    const others = ups.filter((u) => u.owner !== this.progress.leader);
    if (others.length === 1) await this.say(`${whose(others[0])} grew to Lv${others[0].to}!`);
    else if (others.length > 1) await this.say(`${others.length} Patchlings on the other teams levelled up too!`);
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

  /** Pick a seal scroll from the bag (the SEAL button). */
  private showScrollMenu() {
    if (this.phase !== 'menu') return;
    this.phase = 'scrolls';
    this.clearMenu();
    this.message.prompt(`Which scroll for ${this.battle.foe.name}?`);
    const ids = scrollsInBag(this.progress).slice(0, 8);
    ids.forEach((id, i) => {
      const it = ITEMS[id];
      this.menu.add(listRow(this, 66 + (i % 2) * 124, 22 + Math.floor(i / 2) * 34, 118, 30, {
        title: it.name.replace(' Scroll', ''), titleSize: it.name.length > 16 ? TEXT_SIZE.tiny : TEXT_SIZE.small, sub: it.short, right: `x${count(this.progress, id)}`,
        color: shade(hexToNum(it.color), -0.45), icon: { key: itemKey(id) }, onTap: () => void this.trySeal(id), name: `scroll-${id}`,
      }));
    });
    this.menu.add(button(this, 128, 172, 120, 28, 'BACK', TONES.neutral, () => this.showMainMenu(), { name: 'back' }));
  }

  /** The seal with a scroll: its windows, an echo of the beat, extra tries, then its say on the result. */
  private async trySeal(scrollId: string) {
    if (this.phase !== 'scrolls') return;
    const it = ITEMS[scrollId];
    const fx = it.effect;
    this.phase = 'sealing';
    this.clearMenu();
    const foe = this.battle.foe;
    const hpFrac = foe.hp / foe.stats.hp;
    const pattern = sealPattern(foe.types[0]);
    const windows = scrollWindows(sealWindows(hpFrac), fx, foe.types);
    const s = this.sprites.foe;
    if (fx.echo) await this.echoBeat(pattern.beats);
    let result: SealResult | null = null;
    const tries = Math.max(1, fx.tries ?? 1);
    for (let t = 0; t < tries; t++) {
      this.message.prompt(t === 0 ? `${it.name}! Tap as each ring lands.` : `Try ${t + 1} of ${tries}!`);
      const game = new SealMinigame(this, { x: s.x, y: s.y - 26 }, pattern, windows, hpFrac, TYPES[foe.types[0]].color);
      this.sealGame = game;
      result = applyScroll(await game.play(), fx, foe.types);
      this.sealGame = undefined;
      if (result.sealed) break;
    }
    this.lastSeal = result;
    this.phase = 'playing';
    // Used up, unless a Rain Check failed (it's "rescheduled").
    if (result!.sealed || !fx.keepOnFail) useItem(this.progress, scrollId);
    saveProgress(this.progress);
    if (!result!.sealed && fx.glass) await this.say(`The ${it.name} shattered!`);
    if (!result!.sealed && fx.keepOnFail) await this.say(`The ${it.name} got rescheduled. You still have it.`);
    this.hpBefore = this.battle.team.map((b) => b.hp);
    await this.playEvents(this.battle.seal(result!));
    await this.next();
  }

  /** Echo Scroll: the beat plays once, with a pulse on the foe, before the real seal. */
  private async echoBeat(beats: number[]) {
    this.message.prompt('Listen to the beat...');
    const s = this.sprites.foe;
    const ring = this.add.circle(s.x, s.y - 26, 16).setStrokeStyle(1.5, 0xffffff).setDepth(4).setAlpha(0);
    for (let i = 0; i < beats.length; i++) {
      await wait(this, i === 0 ? 400 : beats[i] - beats[i - 1]);
      sfx('beat');
      ring.setAlpha(1).setScale(1.4);
      this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 220 });
    }
    await wait(this, 600);
    ring.destroy();
  }

  private async playEvents(events: BattleEvent[]) {
    for (const e of events) {
      switch (e.kind) {
        case 'text':
          if (/super effective/i.test(e.text)) this.superFlash();
          else if (/not very effective/i.test(e.text)) sfx('weak');
          await this.say(e.text);
          break;
        case 'move':
          await this.lunge(e.side);
          break;
        case 'hp':
          await Promise.all([this.flash(e.side, e.hp < this.hpBoxes[e.side].hp), this.hpBoxes[e.side].animateTo(e.hp, e.maxHp)]);
          break;
        case 'status':
          this.hpBoxes[e.side].statusTag(e.status);
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
          sfx('sealed');
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

  /** A super-effective hit: the top screen flashes white. */
  private superFlash() {
    sfx('super');
    const f = this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0xffffff).setOrigin(0).setDepth(20).setAlpha(0.85);
    this.tweens.add({ targets: f, alpha: 0, duration: 260, onComplete: () => f.destroy() });
  }

  private async flash(side: Side, hurt: boolean) {
    if (!hurt) {
      sfx('heal');
      return;
    }
    sfx('hit');
    const s = this.sprites[side];
    const x = s.x;
    // A quick shake as the hit lands.
    void tweenAsync(this, { targets: s, x: { from: x - 3, to: x + 3 }, duration: 40, yoyo: true, repeat: 2, onComplete: () => s.setX(x) });
    for (let i = 0; i < 3; i++) {
      s.setAlpha(0);
      await wait(this, 60);
      s.setAlpha(1);
      await wait(this, 60);
    }
  }

  private async statFlash(side: Side, up: boolean) {
    sfx(up ? 'statUp' : 'statDown');
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
    this.setCard('player', { ...b, hp: this.hpBefore[index] ?? b.hp, status: b.status });
    this.showXp(index);
    await tweenAsync(this, { targets: s, scaleX: scale, scaleY: scale, duration: 220, ease: 'Back.easeOut' });
  }

  private faint(side: Side) {
    sfx('faint');
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
