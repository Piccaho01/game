import { describe, expect, it } from 'vitest';
import { TYPES, TYPE_CHART, type TypeId } from '../src/engine/data';
import { effectiveness, effectivenessText } from '../src/engine/typeChart';

const ALL = Object.keys(TYPES) as TypeId[];

describe('type chart', () => {
  it('has all 10 types and only known types in the chart', () => {
    expect(ALL).toHaveLength(10);
    for (const atk of Object.keys(TYPE_CHART)) {
      expect(ALL).toContain(atk);
      for (const [def, mult] of Object.entries(TYPE_CHART[atk as TypeId])) {
        expect(ALL).toContain(def);
        expect([0, 0.5, 2]).toContain(mult);
      }
    }
  });

  it('keeps the starter triangle: Fire > Plant > Water > Fire', () => {
    expect(effectiveness('fire', ['plant'])).toBe(2);
    expect(effectiveness('plant', ['water'])).toBe(2);
    expect(effectiveness('water', ['fire'])).toBe(2);
    expect(effectiveness('plant', ['fire'])).toBe(0.5);
    expect(effectiveness('water', ['plant'])).toBe(0.5);
    expect(effectiveness('fire', ['water'])).toBe(0.5);
  });

  it('multiplies dual types', () => {
    expect(effectiveness('fire', ['plant', 'wind'])).toBe(2); // 2 x 1
    expect(effectiveness('ice', ['plant', 'wind'])).toBe(4);
    expect(effectiveness('fire', ['water', 'rock'])).toBe(0.25);
    expect(effectiveness('spark', ['water', 'rock'])).toBe(1); // 2 x 0.5
  });

  it('defaults to neutral and treats typeless as neutral', () => {
    expect(effectiveness('fire', ['dark'])).toBe(1);
    expect(effectiveness(null, ['rock'])).toBe(1);
  });

  it('gives the right battle text', () => {
    expect(effectivenessText(2)).toMatch(/super effective/);
    expect(effectivenessText(0.5)).toMatch(/not very/);
    expect(effectivenessText(0)).toMatch(/no effect/);
    expect(effectivenessText(1)).toBeNull();
  });
});
