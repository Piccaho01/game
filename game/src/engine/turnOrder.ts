import { effectiveStat, type Battler } from './battler';
import { MOVES } from './data';
import type { Rng } from './rng';

export interface Action { side: 'player' | 'foe'; battler: Battler; moveId: string; priority?: number }

export function movePriority(b: Battler, moveId: string): number {
  const m = MOVES[moveId];
  let p = m.priority ?? 0;
  // Spring Heel: kicks go first on the first turn out.
  if (b.ability === 'spring_heel' && m.flags?.kick && b.volatile.turnsOut === 0) p += 1;
  return p;
}

/** Higher priority first, then higher effective Speed, then a coin flip. */
export function orderActions(actions: Action[], rng: Rng): Action[] {
  const keyed = actions.map((a) => ({
    a,
    p: a.priority ?? movePriority(a.battler, a.moveId),
    s: effectiveStat(a.battler, 'spe'),
    tie: rng.next(),
  }));
  keyed.sort((x, y) => y.p - x.p || y.s - x.s || x.tie - y.tie);
  return keyed.map((k) => k.a);
}
