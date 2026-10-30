import { describe, expect, it } from 'vitest';
import { evolutionOf, evolve, findMember, pendingEvolutions, stopEvolution } from '../src/engine/evolution';
import { createBattler, movesAtLevel } from '../src/engine/battler';
import { evoTriggers, SPECIES } from '../src/engine/data';
import { ITEMS } from '../src/engine/items';
import { gainXp, xpForLevel } from '../src/engine/levels';
import { leaderTeam, newProgress, parseProgress, recordSeal, SQUAD, type Member } from '../src/engine/progress';

const mem = (species: string, level: number, extra: Partial<Member> = {}): Member => ({ uid: 99, species, level, bond: 'strong', ...extra });

describe('evolutionOf', () => {
  it('is null below the evolution level and the next form from it on', () => {
    expect(evolutionOf(mem('furnaxol', 15))).toBeNull();
    expect(evolutionOf(mem('furnaxol', 16))).toBe('cullet');
    expect(evolutionOf(mem('furnaxol', 30))).toBe('cullet');
  });

  it('is null for a final stage', () => {
    expect(evolutionOf(mem('vitric', 100))).toBeNull();
  });

  it('is held back at the level it was stopped on, and asks again one level later', () => {
    expect(evolutionOf(mem('furnaxol', 16, { evoStop: 16 }))).toBeNull();
    expect(evolutionOf(mem('furnaxol', 17, { evoStop: 16 }))).toBe('cullet');
  });
});

describe('pendingEvolutions', () => {
  it('lists the leader first, then the others in squad order, then the sanctuary', () => {
    const p = newProgress('furnaxol', 'nolan');
    for (const c of SQUAD) p.teams[c][0].level = 20;
    for (const c of SQUAD) p.teams[c][0].species = 'furnaxol';
    p.sanctuary.push(mem('furnaxol', 20, { uid: 50 }), mem('furnaxol', 5, { uid: 51 }));
    const due = pendingEvolutions(p);
    expect(due.map((d) => d.owner)).toEqual(['nolan', 'callum', 'haydon', 'dani', null]);
    expect(due.at(-1)).toMatchObject({ uid: 50, from: 'furnaxol', to: 'cullet' });
  });

  it('is empty when nobody is ready', () => {
    expect(pendingEvolutions(newProgress('furnaxol'))).toEqual([]);
  });
});

describe('evolve', () => {
  function ready(extra: Partial<Member> = {}) {
    const p = newProgress('furnaxol');
    const m = leaderTeam(p)[0];
    m.species = 'furnaxol';
    m.level = 16;
    m.xp = xpForLevel(16) + 7;
    Object.assign(m, extra);
    return { p, m };
  }

  it('changes species in place and keeps level, bond, xp and uid', () => {
    const { p, m } = ready({ bond: 'steady' });
    const uid = m.uid;
    const r = evolve(p, uid)!;
    expect(r).toMatchObject({ from: 'furnaxol', to: 'cullet' });
    expect(findMember(p, uid)).toBe(m);
    expect(m).toMatchObject({ species: 'cullet', level: 16, bond: 'steady', xp: xpForLevel(16) + 7, uid });
  });

  it('keeps damage: hp rises by the max-HP difference', () => {
    const { p, m } = ready({ hp: 20 });
    const max = (s: string) => createBattler(s, 16, undefined, 'strong').stats.hp;
    evolve(p, m.uid);
    expect(m.hp).toBe(20 + max('cullet') - max('furnaxol'));
  });

  it('leaves a fainted member at 0 and a full-health one without an hp value', () => {
    const a = ready({ hp: 0 });
    evolve(a.p, a.m.uid);
    expect(a.m.hp).toBe(0);
    const b = ready();
    evolve(b.p, b.m.uid);
    expect(b.m.hp).toBeUndefined();
  });

  it('clears evoStop', () => {
    const { p, m } = ready({ level: 18, evoStop: 17 });
    evolve(p, m.uid);
    expect(m.evoStop).toBeUndefined();
  });

  it('reports the moves the new form learns at that level', () => {
    const { p, m } = ready();
    const before = movesAtLevel('furnaxol', 16);
    const r = evolve(p, m.uid)!;
    expect(r.learned).toEqual(movesAtLevel('cullet', 16).filter((id) => !before.includes(id)));
    expect(r.learned).toContain('molten_marbles');
  });

  it('opens the new entry as owned and reports the stage move', () => {
    const { p, m } = ready();
    expect(p.bestiary.cullet).toBeUndefined();
    const r = evolve(p, m.uid)!;
    expect(p.bestiary.cullet).toMatchObject({ encounters: 1, seals: 1, strongBonds: 1 });
    expect(r.change).toMatchObject({ species: 'cullet', from: null });
    expect(r.change!.to).not.toBe('sighted');
  });

  it('does not count a strong bond for a steady one', () => {
    const { p, m } = ready({ bond: 'steady' });
    evolve(p, m.uid);
    expect(p.bestiary.cullet.strongBonds).toBe(0);
  });

  it('reports no change when the entry was already at its top stage', () => {
    const { p, m } = ready();
    p.bestiary.cullet = { encounters: 9, defeats: 9, seals: 9, strongBonds: 9, scans: 9 };
    const r = evolve(p, m.uid)!;
    expect(r.change).toBeNull();
    expect(p.bestiary.cullet).toMatchObject({ encounters: 10, seals: 10, strongBonds: 10 });
  });

  it('works for a Patchling in the sanctuary', () => {
    const { p } = ready();
    p.sanctuary.push(mem('zapail', 16, { uid: 77 }));
    expect(evolve(p, 77)).toMatchObject({ to: 'tesnail' });
    expect(p.sanctuary[0].species).toBe('tesnail');
  });

  it('returns null when it is not ready or the uid is unknown', () => {
    const p = newProgress('furnaxol');
    expect(evolve(p, leaderTeam(p)[0].uid)).toBeNull();
    expect(evolve(p, 12345)).toBeNull();
  });
});

describe('stopEvolution', () => {
  it('holds it at this level and it is pending again one level up', () => {
    const p = newProgress('furnaxol');
    const m = leaderTeam(p)[0];
    gainXp(m, xpForLevel(16) - xpForLevel(8));
    expect(pendingEvolutions(p)).toHaveLength(1);
    stopEvolution(p, m.uid);
    expect(m.evoStop).toBe(16);
    expect(pendingEvolutions(p)).toEqual([]);
    gainXp(m, xpForLevel(17) - xpForLevel(16));
    expect(m.level).toBe(17);
    expect(pendingEvolutions(p)).toHaveLength(1);
  });

  it('ignores an unknown uid', () => {
    const p = newProgress('furnaxol');
    expect(() => stopEvolution(p, 4242)).not.toThrow();
  });
});

describe('saving evoStop', () => {
  it('survives a save and load', () => {
    const p = newProgress('furnaxol');
    leaderTeam(p)[0].level = 16;
    stopEvolution(p, leaderTeam(p)[0].uid);
    const q = parseProgress(JSON.parse(JSON.stringify(p)))!;
    expect(leaderTeam(q)[0].evoStop).toBe(16);
  });

  it('drops a member whose evoStop is not a number, keeping the rest', () => {
    const p = newProgress('furnaxol');
    recordSeal(p, 'orbitot', 3, 'steady');
    const bad = leaderTeam(p)[1];
    (bad as unknown as { evoStop: string }).evoStop = '16';
    const q = parseProgress(JSON.parse(JSON.stringify(p)))!;
    expect(leaderTeam(q)).toHaveLength(1);
    expect(leaderTeam(q)[0].species).toBe('furnaxol');
  });

  it('refuses a save whose only leader member has a bad evoStop', () => {
    const p = newProgress('furnaxol');
    (leaderTeam(p)[0] as unknown as { evoStop: string }).evoStop = 'x';
    expect(parseProgress(JSON.parse(JSON.stringify(p)))).toBeNull();
  });
});

describe('evolution data', () => {
  const chains = Object.keys(SPECIES).flatMap((id) => evoTriggers(id).map((t) => [id, t] as const));

  it('has evolutions and every target exists, at a sensible level or with a real item', () => {
    expect(chains.length).toBeGreaterThan(0);
    for (const [id, t] of chains) {
      expect(SPECIES[t.to], id).toBeDefined();
      if (t.level !== undefined) expect(t.level, id).toBeGreaterThan(1);
      if (t.item) expect(ITEMS[t.item], `${id} item`).toBeDefined();
      expect(t.level !== undefined || !!t.item, `${id} has a trigger`).toBe(true);
    }
  });

  it('keeps the dex order going forward', () => {
    for (const [id, t] of chains) expect(SPECIES[t.to].dex, id).toBeGreaterThan(SPECIES[id].dex);
  });
});
