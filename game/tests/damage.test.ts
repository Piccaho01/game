import { describe, expect, it } from 'vitest';
import { calcStats, createBattler } from '../src/engine/battler';
import { calcDamage } from '../src/engine/damage';
import { MOVES } from '../src/engine/data';
import { createRng } from '../src/engine/rng';

const rng = createRng(1);
const fixed = { crit: false, roll: 100 };

describe('stats', () => {
  it('follows the level formula', () => {
    const s = calcStats({ hp: 44, atk: 50, def: 43, spa: 65, spd: 50, spe: 58 }, 10);
    expect(s).toEqual({ hp: 28, atk: 15, def: 13, spa: 18, spd: 15, spe: 16 });
  });
});

describe('damage', () => {
  it('matches the formula by hand (STAB, super effective, max roll)', () => {
    const furnaxol = createBattler('furnaxol', 10); // spa 18
    const sprigby = createBattler('sprigby', 10); // spd 14
    expect(sprigby.stats.spd).toBe(14);
    // floor(floor(6 * 40 * 18 / 14) / 50) + 2 = floor(308 / 50) + 2 = 8; x1.5 STAB = 12; x2 = 24
    const r = calcDamage(furnaxol, sprigby, MOVES.ember_puff, rng, fixed);
    expect(r).toEqual({ damage: 24, effectiveness: 2, crit: false });
  });

  it('applies the random roll, crit and resistances', () => {
    const furnaxol = createBattler('furnaxol', 10);
    const sprigby = createBattler('sprigby', 10);
    // min roll: floor(8 * 0.85) = 6; x1.5 = 9; x2 = 18
    expect(calcDamage(furnaxol, sprigby, MOVES.ember_puff, rng, { crit: false, roll: 85 }).damage).toBe(18);
    // crit: 8 -> 12 -> 24 -> 36
    expect(calcDamage(furnaxol, sprigby, MOVES.ember_puff, rng, { crit: true, roll: 100 }).damage).toBe(36);
    // resisted: Sprigby's Sprout Swipe on Furnaxol is x0.5
    expect(calcDamage(sprigby, furnaxol, MOVES.sprout_swipe, rng, fixed).effectiveness).toBe(0.5);
  });

  it('halves physical damage when burned and ignores status moves', () => {
    const sprigby = createBattler('sprigby', 20);
    const gobbin = createBattler('gobbin', 20);
    const normal = calcDamage(sprigby, gobbin, MOVES.sprout_swipe, rng, fixed).damage;
    sprigby.status = 'brn';
    const burned = calcDamage(sprigby, gobbin, MOVES.sprout_swipe, rng, fixed).damage;
    expect(burned).toBe(Math.floor(normal / 2));
    expect(calcDamage(sprigby, gobbin, MOVES.jitter_bounce, rng, fixed).damage).toBe(0);
  });

  it('status moves do no damage; a resisted hit still does at least 1', () => {
    // No type is immune since the M5 balance pass (Spark -> Rock went from 0 to 0.5).
    const zapail = createBattler('zapail', 5);
    const vitric = createBattler('vitric', 50);
    const hit = calcDamage(zapail, vitric, MOVES.zap, rng, fixed);
    expect(hit.effectiveness).toBe(0.5);
    expect(hit.damage).toBeGreaterThanOrEqual(1);
    const gobbin = createBattler('gobbin', 2);
    const tank = createBattler('vitric', 100);
    expect(calcDamage(gobbin, tank, MOVES.throat_glow, rng, fixed).damage).toBe(0);
    expect(calcDamage(createBattler('sprigby', 1), tank, MOVES.sprout_swipe, rng, fixed).damage).toBeGreaterThanOrEqual(1);
  });

  it('crits deal 1.5x and stat stages scale', () => {
    const a = createBattler('gobbin', 30);
    const d = createBattler('furnaxol', 30);
    const base = calcDamage(a, d, MOVES.brine_spit, rng, fixed).damage;
    const crit = calcDamage(a, d, MOVES.brine_spit, rng, { crit: true, roll: 100 }).damage;
    expect(crit).toBeGreaterThanOrEqual(Math.floor(base * 1.5) - 1);
    expect(crit).toBeLessThanOrEqual(Math.ceil(base * 1.5) + 1);
    a.stages.spa = 2;
    expect(calcDamage(a, d, MOVES.brine_spit, rng, fixed).damage).toBeGreaterThan(base * 1.8);
  });

  it('applies power and damage modifiers', () => {
    const a = createBattler('zapail', 20);
    const d = createBattler('gobbin', 20);
    const base = calcDamage(a, d, MOVES.zap, rng, fixed).damage;
    expect(calcDamage(a, d, MOVES.zap, rng, { ...fixed, powerMod: 2 }).damage).toBeGreaterThan(base * 1.8);
    expect(calcDamage(a, d, MOVES.zap, rng, { ...fixed, damageMod: 0.5 }).damage).toBe(Math.floor(base * 0.5));
  });

  it('rolls stay inside 85-100%', () => {
    const a = createBattler('furnaxol', 30);
    const d = createBattler('gobbin', 30);
    const max = calcDamage(a, d, MOVES.ember_puff, rng, fixed).damage;
    const r = createRng(7);
    for (let i = 0; i < 200; i++) {
      const dmg = calcDamage(a, d, MOVES.ember_puff, r, { crit: false }).damage;
      expect(dmg).toBeLessThanOrEqual(max);
      expect(dmg).toBeGreaterThanOrEqual(Math.floor(max * 0.85) - 1);
    }
  });
});
