import { effectiveStat, type Battler } from './battler';
import { MOVES, type Weather } from './data';
import type { Rng } from './rng';

export interface Action { side: 'player' | 'foe'; battler: Battler; moveId: string; priority?: number }

export function movePriority(b: Battler, moveId: string): number {
  const m = MOVES[moveId];
  let p = m.priority ?? 0;
  // Spring Heel: kicks go first on the first turn out.
  if (b.ability === 'spring_heel' && m.flags?.kick && b.volatile.turnsOut === 0) p += 1;
  // Slipstream: everything goes first on the first turn out.
  if (b.ability === 'slipstream' && b.volatile.turnsOut === 0) p += 1;
  return p;
}

/** Speed in battle: the stat with its stages, and Thunderhead's 1.5x in rain. */
export function battleSpeed(b: Battler, weather: Weather | null = null): number {
  const s = effectiveStat(b, 'spe');
  return b.ability === 'thunderhead' && weather === 'rain' ? Math.floor(s * 1.5) : s;
}

/** Higher priority first, then higher effective Speed, then a coin flip. */
export function orderActions(actions: Action[], rng: Rng, weather: Weather | null = null): Action[] {
  const keyed = actions.map((a) => ({
    a,
    p: a.priority ?? movePriority(a.battler, a.moveId),
    s: battleSpeed(a.battler, weather),
    tie: rng.next(),
  }));
  keyed.sort((x, y) => y.p - x.p || y.s - x.s || x.tie - y.tie);
  return keyed.map((k) => k.a);
}
