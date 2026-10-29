import { describe, expect, it } from 'vitest';
import { Battle } from '../src/engine/battle';
import { createBattler, movesAtLevel } from '../src/engine/battler';
import { ABILITIES, BESTIARY, evoTriggers, MOVES, SPECIES } from '../src/engine/data';
import { createRng } from '../src/engine/rng';

describe('data', () => {
  it('every species references real moves, abilities, evolutions and lore', () => {
    expect(Object.keys(SPECIES)).toHaveLength(21);
    for (const [id, sp] of Object.entries(SPECIES)) {
      expect(ABILITIES[sp.ability], `${id} ability`).toBeDefined();
      for (const [, m] of sp.learnset) expect(MOVES[m], `${id} move ${m}`).toBeDefined();
      for (const t of evoTriggers(id)) expect(SPECIES[t.to], `${id} evolves into ${t.to}`).toBeDefined();
      expect(BESTIARY[id], `${id} lore`).toBeDefined();
    }
  });

  it('knows the last four moves learned', () => {
    expect(movesAtLevel('furnaxol', 1)).toEqual(['ember_puff', 'stoke']);
    expect(movesAtLevel('furnaxol', 13)).toEqual(['stoke', 'glassblow', 'shard_toss', 'kiln_vent']);
  });
});

describe('battle', () => {
  it('Furnaxol beats a wild Sprigby (the M1 placeholder battle) on every seed', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const battle = new Battle(createBattler('furnaxol', 8), createBattler('sprigby', 5), createRng(seed));
      let turns = 0;
      while (!battle.outcome && turns++ < 30) {
        const glass = battle.player.moves.findIndex((m) => m.id === 'glassblow' && m.pp > 0);
        battle.runTurn({ kind: 'move', index: glass >= 0 ? glass : battle.usableMoves('player')[0] });
      }
      expect(battle.outcome, `seed ${seed}`).toBe('win');
    }
  });

  it('emits text, hp and end events and ends on a faint', () => {
    const battle = new Battle(createBattler('furnaxol', 30, ['kiln_vent']), createBattler('sprigby', 2), createRng(5));
    const events = battle.runTurn({ kind: 'move', index: 0 });
    expect(events[0]).toMatchObject({ kind: 'text' });
    expect(events.some((e) => e.kind === 'hp' && e.side === 'foe')).toBe(true);
    expect(events.at(-1)).toEqual({ kind: 'end', outcome: 'win' });
    expect(() => battle.runTurn({ kind: 'move', index: 0 })).toThrow();
  });

  it('spends PP and falls back to Struggle', () => {
    const battle = new Battle(createBattler('gobbin', 50, ['throat_glow']), createBattler('vitric', 50), createRng(2));
    battle.player.moves[0].pp = 1;
    battle.runTurn({ kind: 'move', index: 0 });
    expect(battle.player.moves[0].pp).toBe(0);
    expect(battle.usableMoves('player')).toEqual([]);
    const events = battle.runTurn({ kind: 'move', index: 0 });
    expect(events).toContainEqual({ kind: 'text', text: 'Gobbin used Struggle!' });
  });

  it('stat moves change stages and clamp at +6', () => {
    const battle = new Battle(createBattler('furnaxol', 50, ['stoke']), createBattler('gobbin', 5, ['throat_glow']), createRng(4));
    for (let i = 0; i < 7; i++) battle.runTurn({ kind: 'move', index: 0 });
    expect(battle.player.stages.spa).toBe(6);
  });

  it('Rail Shell charges for a turn, then fires', () => {
    const battle = new Battle(createBattler('gauslug', 40, ['rail_shell']), createBattler('vitric', 60, ['stoke']), createRng(9));
    const first = battle.runTurn({ kind: 'move', index: 0 });
    expect(first.some((e) => e.kind === 'text' && e.text.includes('began charging'))).toBe(true);
    expect(battle.foe.hp).toBe(battle.foe.stats.hp);
    expect(battle.player.moves[0].pp).toBe(4);
    battle.runTurn({ kind: 'move', index: 0 });
    expect(battle.player.volatile.chargingMove).toBeNull();
    expect(battle.player.moves[0].pp).toBe(4);
  });

  it('burn deals end-of-turn damage; Fire types cannot be burned', () => {
    const battle = new Battle(createBattler('gobbin', 20, ['throat_glow']), createBattler('furnaxol', 20, ['stoke']), createRng(1));
    battle.player.status = 'brn';
    battle.runTurn({ kind: 'move', index: 0 });
    expect(battle.player.hp).toBe(battle.player.stats.hp - Math.floor(battle.player.stats.hp / 16));
  });

  it('Static Rub doubles the next Spark move', () => {
    const battle = new Battle(createBattler('zapail', 20, ['static_rub', 'zap']), createBattler('gobbin', 100, ['throat_glow']), createRng(1));
    battle.runTurn({ kind: 'move', index: 0 });
    expect(battle.player.volatile.charged).toBe(true);
    battle.runTurn({ kind: 'move', index: 1 });
    expect(battle.player.volatile.charged).toBe(false);
  });

  it('running from a wild battle ends it', () => {
    const battle = new Battle(createBattler('furnaxol', 5), createBattler('sprigby', 5), createRng(1));
    expect(battle.runTurn({ kind: 'run' }).at(-1)).toEqual({ kind: 'end', outcome: 'fled' });
  });

  it('is deterministic for a seed', () => {
    const play = () => {
      const b = new Battle(createBattler('gobbin', 10), createBattler('zapail', 10), createRng(42));
      const log: unknown[] = [];
      while (!b.outcome) log.push(...b.runTurn({ kind: 'move', index: b.usableMoves('player')[0] ?? 0 }));
      return log;
    };
    expect(play()).toEqual(play());
  });
});
