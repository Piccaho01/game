import { describe, expect, it } from 'vitest';
import { createBattler } from '../src/engine/battler';
import { createRng } from '../src/engine/rng';
import { orderActions } from '../src/engine/turnOrder';

const rng = createRng(3);

describe('turn order', () => {
  it('faster Patchling goes first', () => {
    const fast = createBattler('zapail', 20);
    const slow = createBattler('gobbin', 20);
    const order = orderActions([
      { side: 'player', battler: slow, moveId: 'bubble_snap' },
      { side: 'foe', battler: fast, moveId: 'zap' },
    ], rng);
    expect(order.map((a) => a.side)).toEqual(['foe', 'player']);
  });

  it('priority beats speed', () => {
    const fast = createBattler('zapail', 20);
    const slow = createBattler('sprigby', 5);
    slow.volatile.turnsOut = 3;
    const order = orderActions([
      { side: 'foe', battler: fast, moveId: 'zap' },
      { side: 'player', battler: slow, moveId: 'springy_hop' },
    ], rng);
    expect(order[0].side).toBe('player');
  });

  it('paralysis halves speed and stages scale it', () => {
    const a = createBattler('zapail', 20);
    const b = createBattler('gobbin', 20);
    a.status = 'par';
    let order = orderActions([{ side: 'player', battler: a, moveId: 'zap' }, { side: 'foe', battler: b, moveId: 'bubble_snap' }], rng);
    expect(order[0].side).toBe('foe');
    a.stages.spe = 2;
    order = orderActions([{ side: 'player', battler: a, moveId: 'zap' }, { side: 'foe', battler: b, moveId: 'bubble_snap' }], rng);
    expect(order[0].side).toBe('player');
  });

  it('Spring Heel gives kicks priority only on the first turn out', () => {
    const sprig = createBattler('sprigby', 5);
    const fast = createBattler('zapail', 50);
    const run = () => orderActions([
      { side: 'foe', battler: fast, moveId: 'zap' },
      { side: 'player', battler: sprig, moveId: 'gust_kick' },
    ], rng)[0].side;
    expect(run()).toBe('player');
    sprig.volatile.turnsOut = 1;
    expect(run()).toBe('foe');
  });

  it('breaks speed ties randomly, both ways', () => {
    const seen = new Set<string>();
    const r = createRng(11);
    for (let i = 0; i < 50; i++) {
      const order = orderActions([
        { side: 'player', battler: createBattler('gobbin', 10), moveId: 'bubble_snap' },
        { side: 'foe', battler: createBattler('gobbin', 10), moveId: 'bubble_snap' },
      ], r);
      seen.add(order[0].side);
    }
    expect(seen.size).toBe(2);
  });
});
