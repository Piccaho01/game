import { effectiveStat, type Battler } from './battler';
import type { MoveData } from './data';
import type { Rng } from './rng';
import { effectiveness } from './typeChart';

/** Crit chance by crit stage (Gen 6+ table). */
const CRIT_CHANCE = [1 / 24, 1 / 8, 1 / 2, 1];

export interface DamageResult { damage: number; effectiveness: number; crit: boolean }

export interface DamageOptions {
  /** Extra power multiplier from abilities or volatiles (charged, Ambush Jaw...). */
  powerMod?: number;
  /** Extra multiplier on the final damage (Kiln Heart, Capacitor...). */
  damageMod?: number;
  /** Force or forbid a critical hit (tests). */
  crit?: boolean;
  /** Force the random roll, 85-100 (tests). */
  roll?: number;
}

/**
 * Pokémon-style damage:
 *   base = floor(floor(floor(2L/5 + 2) * Power * A / D) / 50) + 2
 *   then x random(0.85-1.00), x1.5 STAB, x type, x1.5 crit, x0.5 burn (physical).
 */
export function calcDamage(attacker: Battler, defender: Battler, move: MoveData, rng: Rng, opts: DamageOptions = {}): DamageResult {
  const eff = effectiveness(move.type, defender.types);
  if (move.category === 'status' || eff === 0) return { damage: 0, effectiveness: eff, crit: false };

  const crit = opts.crit ?? rng.next() < CRIT_CHANCE[Math.min(move.critStage ?? 0, 3)];
  const physical = move.category === 'physical';
  const atkStat = physical ? 'atk' : 'spa';
  const defStat = physical ? 'def' : 'spd';
  // Crits ignore the attacker's drops and the defender's boosts.
  const atkStage = crit ? Math.max(0, attacker.stages[atkStat]) : attacker.stages[atkStat];
  const defStage = crit ? Math.min(0, defender.stages[defStat]) : defender.stages[defStat];
  const a = effectiveStat(attacker, atkStat, atkStage);
  const d = Math.max(1, effectiveStat(defender, defStat, defStage));
  const power = Math.floor(move.power * (opts.powerMod ?? 1));

  let dmg = Math.floor(Math.floor((Math.floor((2 * attacker.level) / 5 + 2) * power * a) / d) / 50) + 2;
  dmg = Math.floor((dmg * (opts.roll ?? rng.int(85, 100))) / 100);
  if (move.type !== null && attacker.types.includes(move.type)) dmg = Math.floor(dmg * 1.5);
  dmg = Math.floor(dmg * eff);
  if (crit) dmg = Math.floor(dmg * 1.5);
  if (physical && attacker.status === 'brn') dmg = Math.floor(dmg / 2);
  dmg = Math.floor(dmg * (opts.damageMod ?? 1));
  return { damage: Math.max(1, dmg), effectiveness: eff, crit };
}
