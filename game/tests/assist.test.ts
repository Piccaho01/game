import { describe, expect, it } from 'vitest';
import { Battle } from '../src/engine/battle';
import { createBattler } from '../src/engine/battler';
import { CHARACTERS } from '../src/engine/progress';
import { createRng } from '../src/engine/rng';

const battle = (seed = 1) => new Battle([createBattler('furnaxol', 8)], createBattler('gobbin', 5), createRng(seed));

describe('leader assists', () => {
  it('every character has an assist', () => {
    expect(Object.values(CHARACTERS).map((c) => c.assist.id)).toEqual(['scan', 'patch_up', 'taunt', 'shield']);
  });

  it('once per battle, and free: the foe does not act', () => {
    const b = battle();
    const ev = b.assist('taunt', 'Haydon');
    expect(b.canAssist()).toBe(false);
    expect(() => b.assist('taunt', 'Haydon')).toThrow();
    expect(ev.some((e) => e.kind === 'text' && e.text.startsWith('The wild Gobbin used'))).toBe(false);
    expect(b.turn).toBe(0);
  });

  it('Scan reveals types and weaknesses', () => {
    const b = battle();
    const ev = b.assist('scan', 'Callum');
    expect(b.scanned).toBe(true);
    expect(ev).toContainEqual({ kind: 'scan' });
    expect(ev).toContainEqual({ kind: 'text', text: 'Type: Water.' });
    expect(ev).toContainEqual({ kind: 'text', text: 'Weak to: Plant, Spark.' });
  });

  it('Patch Up heals half and cures status', () => {
    const b = battle();
    b.player.hp = 1;
    b.player.status = 'psn';
    b.assist('patch_up', 'Nolan');
    expect(b.player.hp).toBe(1 + Math.ceil(b.player.stats.hp / 2));
    expect(b.player.status).toBeNull();
  });

  it('Taunt drops Defense and Sp. Def', () => {
    const b = battle();
    b.assist('taunt', 'Haydon');
    expect(b.foe.stages).toMatchObject({ def: -1, spd: -1 });
  });

  it('Shield halves the next hit only', () => {
    const hit = (shield: boolean) => {
      const b = new Battle([createBattler('furnaxol', 20, ['stoke'])], createBattler('gobbin', 20, ['needle_bite']), createRng(7));
      if (shield) b.assist('shield', 'Dani');
      const before = b.player.hp;
      b.runTurn({ kind: 'move', index: 0 });
      return { dmg: before - b.player.hp, shielded: b.player.volatile.shielded };
    };
    const plain = hit(false);
    const shielded = hit(true);
    expect(shielded.dmg).toBeLessThan(plain.dmg);
    expect(shielded.shielded).toBe(false);
  });
});
