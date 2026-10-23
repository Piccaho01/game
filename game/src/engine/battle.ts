import { effectiveStat, type Battler } from './battler';
import { calcDamage } from './damage';
import { MOVES, STRUGGLE_ID, type MoveData, type MoveEffect, type StageStat, type StatusId } from './data';
import type { Rng } from './rng';
import type { Bond, SealResult } from './seal';
import { orderActions, type Action } from './turnOrder';
import { effectiveness, effectivenessText } from './typeChart';
import { TYPES, type TypeId } from './data';

export type Side = 'player' | 'foe';
export type Outcome = 'win' | 'lose' | 'fled' | 'sealed';

/** What the scene plays back, in order. State events carry the new value so playback needs no engine access. */
export type BattleEvent =
  | { kind: 'text'; text: string }
  | { kind: 'move'; side: Side; moveId: string }
  | { kind: 'hp'; side: Side; hp: number; maxHp: number }
  | { kind: 'status'; side: Side; status: StatusId | null }
  | { kind: 'stat'; side: Side; stat: StageStat; delta: number }
  | { kind: 'faint'; side: Side }
  | { kind: 'sealed'; bond: Bond }
  /** Scan revealed the foe (the fight menu can show effectiveness from now on). */
  | { kind: 'scan' }
  /** The player's active Patchling changed to team[index]. */
  | { kind: 'switch'; index: number }
  | { kind: 'end'; outcome: Outcome };

export type AssistId = 'scan' | 'patch_up' | 'taunt' | 'shield';
export type PlayerAction = { kind: 'move'; index: number } | { kind: 'switch'; index: number } | { kind: 'run' };

const STAT_NAMES: Record<StageStat, string> = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
const BOND_TEXT: Record<Bond, string> = {
  strong: 'A perfect seal! {name} trusts you already.',
  steady: '{name} seems settled in.',
  wary: 'A sloppy seal... {name} is eyeing you.',
};
const STATUS_TEXT: Record<StatusId, string> = { brn: 'was burned!', par: 'is paralysed! It may be unable to move!', psn: 'was poisoned!', slp: 'fell asleep!' };

export class Battle {
  readonly sides: Record<Side, Battler>;
  /** The player's team; `sides.player` is the active one. */
  readonly team: Battler[];
  active = 0;
  /** The active Patchling fainted and others can still fight: the player must pick one (`forceSwitch`). */
  needsSwitch = false;
  /** The leader's assist is once per battle. */
  assistUsed = false;
  /** Scan has revealed the foe. */
  scanned = false;
  outcome: Outcome | null = null;
  turn = 0;
  private events: BattleEvent[] = [];

  constructor(player: Battler | Battler[], foe: Battler, private rng: Rng, private wild = true) {
    this.team = Array.isArray(player) ? player : [player];
    if (this.team.length === 0) throw new Error('Empty team');
    this.sides = { player: this.team[0], foe };
  }

  /** Team slots that could come in now (alive and not already out). */
  switchable(): number[] {
    return this.team.flatMap((b, i) => (b.hp > 0 && i !== this.active ? [i] : []));
  }

  get player() { return this.sides.player; }
  get foe() { return this.sides.foe; }

  /** Display name used at the start of a sentence. */
  label(side: Side): string {
    const b = this.sides[side];
    return side === 'foe' ? `${this.wild ? 'The wild' : 'The foe'} ${b.name}` : b.name;
  }

  intro(): BattleEvent[] {
    // Lead with the first Patchling that can still fight.
    const first = this.team.findIndex((b) => b.hp > 0);
    if (first > 0) { this.active = first; this.sides.player = this.team[first]; }
    return [{ kind: 'text', text: `A wild ${this.foe.name} appeared!` }, { kind: 'text', text: `Go! ${this.player.name}!` }];
  }

  /** Move ids the player can pick right now (indexes into battler.moves). */
  usableMoves(side: Side): number[] {
    return this.sides[side].moves.flatMap((m, i) => (m.pp > 0 ? [i] : []));
  }

  /** Simple wild AI: usually the hardest-hitting move, sometimes anything. */
  chooseFoeMove(): string {
    const b = this.foe;
    if (b.volatile.chargingMove) return b.volatile.chargingMove;
    const usable = this.usableMoves('foe');
    if (usable.length === 0) return STRUGGLE_ID;
    if (this.rng.chance(30)) return b.moves[usable[this.rng.int(0, usable.length - 1)]].id;
    const score = (id: string) => {
      const m = MOVES[id];
      if (m.category === 'status') return 20;
      const stab = m.type && b.types.includes(m.type) ? 1.5 : 1;
      return m.power * (m.hits ? (m.hits[0] + m.hits[1]) / 2 : 1) * stab * effectiveness(m.type, this.player.types);
    };
    return usable.map((i) => b.moves[i].id).reduce((best, id) => (score(id) > score(best) ? id : best));
  }

  runTurn(action: PlayerAction): BattleEvent[] {
    if (this.outcome) throw new Error('Battle is over');
    if (this.needsSwitch) throw new Error('Pick a Patchling first');
    this.events = [];
    this.turn++;

    if (action.kind === 'switch') {
      // Switching takes the turn; the foe gets a free hit on whoever comes in.
      this.doSwitch(action.index, true);
      this.foeOnlyTurn();
      return this.events;
    }

    if (action.kind === 'run') {
      if (!this.wild) {
        this.say("You can't run from this one!");
        return this.events;
      }
      if (this.foe.ability === 'gravity_well') {
        this.say(`${this.label('foe')}'s Gravity Well holds you in place! You can't run!`);
        this.foeOnlyTurn();
        return this.events;
      }
      this.say('Got away safely!');
      this.finish('fled');
      return this.events;
    }

    const actions: Action[] = [
      { side: 'player', battler: this.player, moveId: this.playerMoveId(action.index) },
      { side: 'foe', battler: this.foe, moveId: this.chooseFoeMove() },
    ];
    for (const act of orderActions(actions, this.rng)) {
      if (this.outcome || this.needsSwitch) break;
      if (act.battler.hp <= 0) continue;
      this.act(act.side, act.moveId);
      this.checkFaints();
    }
    if (!this.outcome) this.endOfTurn();
    this.player.volatile.turnsOut++;
    this.foe.volatile.turnsOut++;
    return this.events;
  }

  /** A seal needs a wild target and the player's Patchling free to act (not mid-charge). */
  canSeal(): boolean {
    return this.wild && !this.outcome && !this.needsSwitch && !this.player.volatile.chargingMove;
  }

  /** A voluntary switch needs someone to switch to, and no two-turn move locked in. */
  canSwitch(): boolean {
    return !this.outcome && !this.needsSwitch && !this.player.volatile.chargingMove && this.switchable().length > 0;
  }

  /** The player's seal attempt (the minigame already played): sealed ends the battle, a failed seal costs the turn. */
  seal(result: SealResult): BattleEvent[] {
    if (this.outcome) throw new Error('Battle is over');
    if (this.needsSwitch) throw new Error('Pick a Patchling first');
    this.events = [];
    if (!this.wild) {
      this.say("The seal won't take on someone else's Patchling!");
      return this.events;
    }
    this.turn++;
    if (result.sealed && result.bond) {
      this.say(`Gotcha! ${this.foe.name} was sealed!`);
      this.push({ kind: 'sealed', bond: result.bond });
      this.say(BOND_TEXT[result.bond].replace('{name}', this.foe.name));
      this.finish('sealed');
      return this.events;
    }
    this.say(`Argh! ${this.label('foe')} broke the seal!`);
    this.foeOnlyTurn();
    return this.events;
  }

  canAssist(): boolean {
    return !this.assistUsed && !this.outcome && !this.needsSwitch;
  }

  /**
   * The leader's battle command (bible §6): once per battle, and free: the player still picks a
   * move this turn. `leader` is the character's name for the text.
   */
  assist(id: AssistId, leader: string): BattleEvent[] {
    if (!this.canAssist()) throw new Error('Assist not available');
    this.events = [];
    this.assistUsed = true;
    const p = this.player;
    switch (id) {
      case 'scan': {
        this.scanned = true;
        this.say(`${leader} scanned ${this.label('foe').replace(/^The/, 'the')}!`);
        this.push({ kind: 'scan' });
        const types = this.foe.types;
        const by = (pick: (m: number) => boolean) => (Object.keys(TYPES) as TypeId[]).filter((t) => pick(effectiveness(t, types))).map((t) => TYPES[t].name);
        this.say(`Type: ${types.map((t) => TYPES[t].name).join('/')}.`);
        const weak = by((m) => m > 1);
        const resist = by((m) => m < 1);
        this.say(`Weak to: ${weak.join(', ') || 'nothing'}.`);
        if (resist.length) this.say(`Resists: ${resist.join(', ')}.`);
        break;
      }
      case 'patch_up': {
        this.say(`${leader} patched up ${p.name}!`);
        const heal = Math.min(p.stats.hp - p.hp, Math.ceil(p.stats.hp / 2));
        if (heal > 0) {
          p.hp += heal;
          this.push({ kind: 'hp', side: 'player', hp: p.hp, maxHp: p.stats.hp });
        }
        if (p.status) {
          p.status = null;
          p.sleepTurns = 0;
          this.push({ kind: 'status', side: 'player', status: null });
        }
        this.say(heal > 0 ? `${p.name} recovered ${heal} HP.` : `${p.name} was already fine. ${leader} did it anyway.`);
        break;
      }
      case 'taunt':
        this.say(`${leader} taunted ${this.label('foe').replace(/^The/, 'the')}! "Nah, that's cap."`);
        this.changeStat('foe', 'def', -1);
        this.changeStat('foe', 'spd', -1);
        break;
      case 'shield':
        p.volatile.shielded = true;
        this.say(`${leader} stepped in front of ${p.name}! The next hit will be softened.`);
        break;
    }
    return this.events;
  }

  /** After the active Patchling faints: send in another. Free, no foe turn. */
  forceSwitch(index: number): BattleEvent[] {
    if (!this.needsSwitch) throw new Error('No switch needed');
    this.events = [];
    this.needsSwitch = false;
    this.doSwitch(index, false);
    return this.events;
  }

  private doSwitch(index: number, recall: boolean) {
    const next = this.team[index];
    if (!next || next.hp <= 0 || index === this.active) throw new Error(`Team slot ${index} can't come in`);
    const out = this.player;
    // Leaving the field clears stat changes and charges (status stays), as in BW.
    out.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    out.volatile = { charged: false, chargingMove: null, hardened: false, shielded: false, turnsOut: 0 };
    if (recall) this.say(`Come back, ${out.name}!`);
    this.active = index;
    this.sides.player = next;
    this.push({ kind: 'switch', index });
    this.say(`Go! ${next.name}!`);
  }

  /** A turn where only the foe acts (after a switch or a broken seal). */
  private foeOnlyTurn() {
    this.act('foe', this.chooseFoeMove());
    this.checkFaints();
    if (!this.outcome && !this.needsSwitch) this.endOfTurn();
    this.player.volatile.turnsOut++;
    this.foe.volatile.turnsOut++;
  }

  private playerMoveId(index: number): string {
    const b = this.player;
    if (b.volatile.chargingMove) return b.volatile.chargingMove;
    if (this.usableMoves('player').length === 0) return STRUGGLE_ID;
    const slot = b.moves[index];
    if (!slot || slot.pp <= 0) throw new Error(`Move ${index} is not usable`);
    return slot.id;
  }

  private act(side: Side, moveId: string) {
    const user = this.sides[side];
    // Sleep and paralysis can stop the move.
    if (user.status === 'slp') {
      if (user.sleepTurns > 0) {
        user.sleepTurns--;
        this.say(`${this.label(side)} is fast asleep.`);
        return;
      }
      user.status = null;
      this.push({ kind: 'status', side, status: null });
      this.say(`${this.label(side)} woke up!`);
    }
    if (user.status === 'par' && this.rng.chance(25)) {
      this.say(`${this.label(side)} is paralysed! It can't move!`);
      user.volatile.chargingMove = null;
      return;
    }
    this.useMove(side, moveId);
  }

  private useMove(side: Side, moveId: string) {
    const foeSide: Side = side === 'player' ? 'foe' : 'player';
    const user = this.sides[side];
    const target = this.sides[foeSide];
    const move = MOVES[moveId];

    const firing = user.volatile.chargingMove === moveId;
    if (!firing) {
      const slot = user.moves.find((m) => m.id === moveId);
      if (slot) slot.pp--;
    }
    if (move.flags?.charge && !firing) {
      user.volatile.chargingMove = moveId;
      this.say(`${this.label(side)} began charging ${move.name}!`);
      return;
    }
    user.volatile.chargingMove = null;

    this.say(`${this.label(side)} used ${move.name}!`);
    this.push({ kind: 'move', side, moveId });

    if (move.accuracy !== null && !this.rng.chance(move.accuracy)) {
      this.say(`${this.label(side)}'s attack missed!`);
      this.applyEffects(side, move.onMiss ?? []);
      return;
    }

    if (move.category === 'status') {
      if (move.type === 'fire' && user.ability === 'kiln_heart') user.volatile.hardened = true;
      this.applyEffects(side, move.effects ?? []);
      return;
    }

    const eff = effectiveness(move.type, target.types);
    if (eff === 0) {
      if (move.type === 'spark') user.volatile.charged = false;
      this.say(`It doesn't affect ${this.label(foeSide).replace(/^The/, 'the')}...`);
      return;
    }

    const hits = move.hits ? this.rng.int(move.hits[0], move.hits[1]) : 1;
    let landed = 0;
    let dealt = 0;
    for (let i = 0; i < hits && target.hp > 0; i++) {
      const { damage, crit } = calcDamage(user, target, move, this.rng, {
        powerMod: this.powerMod(user, move),
        damageMod: this.damageMod(target),
        // Orbit Punch: a slowed foe can't dodge the fist coming back.
        crit: move.flags?.critIfSlowed && target.stages.spe < 0 ? true : undefined,
      });
      target.volatile.hardened = false;
      if (target.volatile.shielded) {
        target.volatile.shielded = false;
        this.say(`The shield took the edge off!`);
      }
      const applied = Math.min(damage, target.hp);
      target.hp -= applied;
      dealt += applied;
      landed++;
      this.push({ kind: 'hp', side: foeSide, hp: target.hp, maxHp: target.stats.hp });
      if (crit) this.say('A critical hit!');
      this.onHit(side, foeSide, move);
    }
    if (move.type === 'spark') user.volatile.charged = false;
    const effText = effectivenessText(eff);
    if (effText) this.say(effText);
    if (hits > 1) this.say(`Hit ${landed} time${landed === 1 ? '' : 's'}!`);

    if (move.flags?.recoil && user.hp > 0) {
      const recoil = Math.max(1, Math.floor(user.stats.hp * move.flags.recoil));
      user.hp = Math.max(0, user.hp - recoil);
      this.push({ kind: 'hp', side, hp: user.hp, maxHp: user.stats.hp });
      this.say(`${this.label(side)} is hit with recoil!`);
    }
    if (move.type === 'fire' && user.ability === 'kiln_heart') user.volatile.hardened = true;
    if (dealt > 0) this.applyEffects(side, move.effects ?? []);
  }

  private powerMod(user: Battler, move: MoveData): number {
    let mod = 1;
    if (move.type === 'spark' && user.volatile.charged) mod *= 2;
    if (user.ability === 'ambush_jaw' && move.flags?.bite && user.volatile.turnsOut === 0) mod *= 1.5;
    return mod;
  }

  private damageMod(target: Battler): number {
    let mod = 1;
    if (target.volatile.hardened) mod *= 0.75;
    if (target.volatile.shielded) mod *= 0.5;
    if (target.ability === 'capacitor' && target.volatile.chargingMove) mod *= 0.5;
    return mod;
  }

  /** Abilities that react to being hit. */
  private onHit(attackerSide: Side, targetSide: Side, move: MoveData) {
    const attacker = this.sides[attackerSide];
    const target = this.sides[targetSide];
    if (target.ability === 'static' && move.flags?.contact && attacker.hp > 0 && this.rng.chance(30)) {
      this.say(`${this.label(targetSide)}'s Static!`);
      this.inflict(attackerSide, 'par');
    }
    if (target.ability === 'induction' && move.type === 'spark' && target.hp > 0 && !target.volatile.charged) {
      target.volatile.charged = true;
      this.say(`${this.label(targetSide)}'s coil soaked up the charge!`);
    }
  }

  private applyEffects(side: Side, effects: MoveEffect[]) {
    const foeSide: Side = side === 'player' ? 'foe' : 'player';
    for (const e of effects) {
      const targetSide = e.target === 'self' ? side : foeSide;
      if (this.sides[targetSide].hp <= 0) continue;
      if ('chance' in e && e.chance !== undefined && !this.rng.chance(e.chance)) continue;
      if (e.kind === 'stat') {
        if (e.if?.foeType && !this.sides[foeSide].types.includes(e.if.foeType)) continue;
        for (const [stat, delta] of Object.entries(e.stats) as [StageStat, number][]) this.changeStat(targetSide, stat, delta);
      } else if (e.kind === 'status') {
        this.inflict(targetSide, e.status, e.chance === undefined);
      } else if (e.kind === 'charge') {
        this.sides[targetSide].volatile.charged = true;
        this.say(`${this.label(targetSide)} is crackling with static!`);
      }
    }
  }

  private changeStat(side: Side, stat: StageStat, delta: number) {
    const b = this.sides[side];
    const before = b.stages[stat];
    const after = Math.max(-6, Math.min(6, before + delta));
    const name = `${this.label(side)}'s ${STAT_NAMES[stat]}`;
    if (after === before) {
      this.say(`${name} won't go any ${delta > 0 ? 'higher' : 'lower'}!`);
      return;
    }
    b.stages[stat] = after;
    this.push({ kind: 'stat', side, stat, delta: after - before });
    const size = Math.abs(after - before) >= 2 ? ' sharply' : '';
    this.say(`${name}${size} ${delta > 0 ? 'rose' : 'fell'}!`);
  }

  /** `announceFail`: say so when a guaranteed status move doesn't stick. */
  private inflict(side: Side, status: StatusId, announceFail = false) {
    const b = this.sides[side];
    const immune =
      (status === 'brn' && b.types.includes('fire')) ||
      (status === 'par' && b.types.includes('spark')) ||
      (status === 'psn' && b.types.includes('metal'));
    if (b.status || immune) {
      if (announceFail) this.say('But it failed!');
      return;
    }
    b.status = status;
    if (status === 'slp') b.sleepTurns = this.rng.int(1, 3);
    this.push({ kind: 'status', side, status });
    this.say(`${this.label(side)} ${STATUS_TEXT[status]}`);
  }

  private endOfTurn() {
    for (const side of ['player', 'foe'] as Side[]) {
      const b = this.sides[side];
      if (b.hp <= 0 || (b.status !== 'brn' && b.status !== 'psn')) continue;
      const dmg = Math.max(1, Math.floor(b.stats.hp / (b.status === 'brn' ? 16 : 8)));
      b.hp = Math.max(0, b.hp - dmg);
      this.push({ kind: 'hp', side, hp: b.hp, maxHp: b.stats.hp });
      this.say(`${this.label(side)} is hurt by its ${b.status === 'brn' ? 'burn' : 'poison'}!`);
      this.checkFaints();
      if (this.outcome || this.needsSwitch) return;
    }
  }

  private checkFaints() {
    if (this.outcome || this.needsSwitch) return;
    for (const side of ['foe', 'player'] as Side[]) {
      if (this.sides[side].hp > 0) continue;
      this.push({ kind: 'faint', side });
      this.say(`${this.label(side)} fainted!`);
    }
    // A wild battle is one Patchling, so its faint wins; the player loses when the whole team is down.
    if (this.foe.hp <= 0) this.finish('win');
    else if (this.player.hp <= 0) {
      if (this.switchable().length > 0) this.needsSwitch = true;
      else this.finish('lose');
    }
  }

  private finish(outcome: Outcome) {
    this.outcome = outcome;
    this.push({ kind: 'end', outcome });
  }

  private say(text: string) { this.events.push({ kind: 'text', text }); }
  private push(e: BattleEvent) { this.events.push(e); }

  /** Effective Speed, exposed for UI hints and tests. */
  speedOf(side: Side) { return effectiveStat(this.sides[side], 'spe'); }
}
