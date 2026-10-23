import { describe, expect, it } from 'vitest';
import { Battle } from '../src/engine/battle';
import { createBattler } from '../src/engine/battler';
import { createRng } from '../src/engine/rng';

describe('team battles', () => {
  it('switching takes the turn and the foe hits whoever comes in', () => {
    const b = new Battle([createBattler('furnaxol', 8), createBattler('gobbin', 8)], createBattler('zapail', 5), createRng(3));
    b.intro();
    const before = b.team[1].hp;
    const ev = b.runTurn({ kind: 'switch', index: 1 });
    expect(ev).toContainEqual({ kind: 'switch', index: 1 });
    expect(ev).toContainEqual({ kind: 'text', text: 'Come back, Furnaxol!' });
    expect(b.player.name).toBe('Gobbin');
    expect(b.active).toBe(1);
    expect(ev.some((e) => e.kind === 'text' && e.text.startsWith('The wild Zapail used'))).toBe(true);
    expect(b.team[1].hp).toBeLessThanOrEqual(before);
  });

  it('switching out clears stat changes', () => {
    const b = new Battle([createBattler('furnaxol', 8, ['stoke']), createBattler('gobbin', 8)], createBattler('zapail', 5), createRng(1));
    b.runTurn({ kind: 'move', index: 0 });
    expect(b.team[0].stages.spa).toBeGreaterThan(0);
    b.runTurn({ kind: 'switch', index: 1 });
    expect(b.team[0].stages.spa).toBe(0);
  });

  it('a faint with others left asks for a free switch; the last faint loses', () => {
    const b = new Battle([createBattler('sprigby', 3), createBattler('zapail', 3)], createBattler('vitric', 40), createRng(2));
    b.intro();
    b.runTurn({ kind: 'move', index: 0 });
    expect(b.needsSwitch).toBe(true);
    expect(b.outcome).toBeNull();
    expect(b.canSeal()).toBe(false);
    expect(() => b.runTurn({ kind: 'move', index: 0 })).toThrow();
    const ev = b.forceSwitch(1);
    expect(ev).toEqual([{ kind: 'switch', index: 1 }, { kind: 'text', text: 'Go! Zapail!' }]);
    while (!b.outcome) b.runTurn({ kind: 'move', index: b.usableMoves('player')[0] ?? 0 });
    expect(b.outcome).toBe('lose');
  });

  it('leads with the first Patchling that can fight', () => {
    const fainted = createBattler('furnaxol', 8);
    fainted.hp = 0;
    const b = new Battle([fainted, createBattler('gobbin', 8)], createBattler('zapail', 5), createRng(1));
    expect(b.intro()[1]).toEqual({ kind: 'text', text: 'Go! Gobbin!' });
    expect(b.player.name).toBe('Gobbin');
  });

  it("can't switch to a fainted or active slot, or while charging", () => {
    const b = new Battle([createBattler('gauslug', 30, ['rail_shell']), createBattler('gobbin', 30)], createBattler('zapail', 5, ['zap']), createRng(1));
    expect(() => b.runTurn({ kind: 'switch', index: 0 })).toThrow();
    b.runTurn({ kind: 'move', index: 0 });
    expect(b.player.volatile.chargingMove).toBe('rail_shell');
    expect(b.canSwitch()).toBe(false);
  });
});
