import { describe, expect, it } from 'vitest';
import { Battle } from '../src/engine/battle';
import { createBattler } from '../src/engine/battler';
import { TYPES, type TypeId } from '../src/engine/data';
import { createRng } from '../src/engine/rng';
import { judgeSeal, scoreSeal, sealPattern, sealWindows, SEAL_PATTERNS } from '../src/engine/seal';

describe('seal patterns', () => {
  it('every type has a pattern with rising beats starting at 0', () => {
    for (const t of Object.keys(TYPES) as TypeId[]) {
      const p = sealPattern(t);
      expect(p.beats[0]).toBe(0);
      for (let i = 1; i < p.beats.length; i++) expect(p.beats[i]).toBeGreaterThan(p.beats[i - 1]);
    }
  });

  it('the first four types have their own patterns', () => {
    for (const t of ['fire', 'water', 'plant', 'spark'] as TypeId[]) expect(sealPattern(t)).not.toBe(SEAL_PATTERNS.default);
  });

  it('beats in a pattern are further apart than the widest good window, so taps never fight over beats', () => {
    const w = sealWindows(0);
    for (const p of Object.values(SEAL_PATTERNS)) {
      for (let i = 1; i < p.beats.length; i++) expect(p.beats[i] - p.beats[i - 1], p.name).toBeGreaterThan(w.good);
    }
  });
});

describe('seal judging', () => {
  const beats = [0, 500, 1000, 1500];
  const w = { perfect: 50, good: 120 };

  it('perfect taps give a strong bond', () => {
    const r = judgeSeal(beats, [5, 495, 1010, 1500], w);
    expect(r.grades).toEqual(['perfect', 'perfect', 'perfect', 'perfect']);
    expect(r).toMatchObject({ sealed: true, bond: 'strong', strays: 0 });
  });

  it('late taps are good, missed beats are misses, taps between beats are strays', () => {
    const r = judgeSeal(beats, [100, 750, 1490], w);
    expect(r.grades).toEqual(['good', 'miss', 'miss', 'perfect']);
    expect(r.strays).toBe(1);
  });

  it('two taps on one beat: the second is a stray, not the next beat', () => {
    const r = judgeSeal(beats, [0, 20], w);
    expect(r.grades[1]).toBe('miss');
    expect(r.strays).toBe(1);
  });

  it('a sloppy seal still works but the Patchling is wary; too sloppy breaks', () => {
    expect(scoreSeal(['good', 'good', 'good', 'miss'], 0)).toMatchObject({ sealed: true, bond: 'wary' });
    expect(scoreSeal(['good', 'miss', 'miss', 'miss'], 0)).toMatchObject({ sealed: false, bond: null });
  });

  it('mashing is not a strategy', () => {
    const mash = Array.from({ length: 40 }, (_, i) => i * 40);
    expect(judgeSeal(beats, mash, w).sealed).toBe(false);
  });

  it('a healthy target needs a cleaner seal', () => {
    const grades = ['perfect', 'good', 'good', 'miss'] as const;
    expect(scoreSeal([...grades], 0, 0.1).sealed).toBe(true);
    expect(scoreSeal([...grades], 0, 1).sealed).toBe(false);
  });

  it('a weaker target gives wider windows', () => {
    expect(sealWindows(0.1).good).toBeGreaterThan(sealWindows(1).good);
    expect(sealWindows(0.1).perfect).toBeGreaterThan(sealWindows(1).perfect);
  });
});

describe('seal in battle', () => {
  const sealed = scoreSeal(['perfect', 'good', 'good'], 0);
  const broken = scoreSeal(['miss', 'miss', 'good'], 0);

  it('a good seal ends the battle with the bond', () => {
    const b = new Battle(createBattler('furnaxol', 8), createBattler('sprigby', 5), createRng(1));
    expect(b.canSeal()).toBe(true);
    const ev = b.seal(sealed);
    expect(ev).toContainEqual({ kind: 'sealed', bond: 'steady' });
    expect(b.outcome).toBe('sealed');
  });

  it('a broken seal costs the turn: the foe acts', () => {
    const b = new Battle(createBattler('furnaxol', 8), createBattler('zapail', 5), createRng(2));
    const ev = b.seal(broken);
    expect(b.outcome).toBeNull();
    expect(ev.some((e) => e.kind === 'text' && e.text.startsWith('The wild Zapail used'))).toBe(true);
  });

  it("can't seal a trainer's Patchling", () => {
    const b = new Battle(createBattler('furnaxol', 8), createBattler('sprigby', 5), createRng(1), false);
    expect(b.canSeal()).toBe(false);
    b.seal(sealed);
    expect(b.outcome).toBeNull();
  });
});
