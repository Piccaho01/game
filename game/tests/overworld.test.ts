import { describe, expect, it } from 'vitest';
import { isBlocked, loadMap, MAPS, rollEncounter, START, step, TILES, type Position } from '../src/engine/overworld';
import { createRng } from '../src/engine/rng';

describe('maps', () => {
  it('every map loads, has its spawn on open ground, and its warps land on open ground', () => {
    expect(Object.keys(MAPS).sort()).toEqual(['hollow_rest', 'route1']);
    for (const map of Object.values(MAPS)) {
      expect(isBlocked(map, map.spawn.x, map.spawn.y), `${map.id} spawn`).toBe(false);
      for (const w of map.warps) {
        expect(MAPS[w.to], `${map.id} warp target`).toBeDefined();
        expect(isBlocked(map, w.x, w.y), `${map.id} warp tile`).toBe(false);
        expect(isBlocked(MAPS[w.to], w.tx, w.ty), `${map.id} -> ${w.to} landing`).toBe(false);
      }
    }
  });

  it('rejects typos', () => {
    const base = { id: 'x', name: 'X', legend: { '.': 'grass' }, spawn: { x: 0, y: 0 } };
    expect(() => loadMap({ ...base, rows: ['..', '.'] })).toThrow(/row 1/);
    expect(() => loadMap({ ...base, rows: ['.?'] })).toThrow(/unknown tile/);
    expect(() => loadMap({ ...base, rows: ['..'], encounters: { rate: 1, levels: [1, 1], table: [{ species: 'nope', weight: 1 }] } })).toThrow(/nope/);
  });

  it('tall grass is the only encounter tile', () => {
    expect(Object.entries(TILES).filter(([, t]) => t.encounter).map(([id]) => id)).toEqual(['tall']);
  });
});

describe('movement', () => {
  it('steps on open ground, turns without moving into walls', () => {
    const a = step(START, 'left');
    expect(a.moved).toBe(true);
    expect(a.pos).toMatchObject({ x: START.x - 1, y: START.y, dir: 'left' });
    const corner: Position = { map: 'hollow_rest', x: 1, y: 15, dir: 'down' };
    const b = step(corner, 'left');
    expect(b.moved).toBe(false);
    expect(b.pos).toEqual({ ...corner, dir: 'left' });
  });

  it('extra blockers (NPCs) stop a step', () => {
    expect(step(START, 'up', (x, y) => x === START.x && y === START.y - 1).moved).toBe(false);
  });

  it('walks from Hollow Rest to Route 1 and back', () => {
    let pos: Position = { map: 'hollow_rest', x: 10, y: 15, dir: 'down' };
    const out = step(pos, 'down');
    expect(out.warped).toBe(true);
    expect(out.pos).toMatchObject({ map: 'route1', x: 10, y: 1 });
    pos = { ...out.pos };
    const back = step(pos, 'up');
    expect(back.pos).toMatchObject({ map: 'hollow_rest', x: 10, y: 15 });
  });

  it('flags tall grass', () => {
    // Route 1 (2,2) is tall grass; step into it from (1,2).
    const r = step({ map: 'route1', x: 1, y: 2, dir: 'right' }, 'right');
    expect(r.grass).toBe(true);
  });
});

describe('encounters', () => {
  it('Route 1 gives Orbitot and Fledjet at the listed levels, at about the listed rate', () => {
    const rng = createRng(1);
    const hits = Array.from({ length: 4000 }, () => rollEncounter(MAPS.route1, rng)).filter((e) => e !== null);
    expect(hits.length / 4000).toBeGreaterThan(0.09);
    expect(hits.length / 4000).toBeLessThan(0.15);
    expect(new Set(hits.map((h) => h.species))).toEqual(new Set(['orbitot', 'fledjet']));
    expect(hits.every((h) => h.level >= 3 && h.level <= 5)).toBe(true);
  });

  it('a map without an encounter table never rolls one', () => {
    const rng = createRng(1);
    expect(Array.from({ length: 100 }, () => rollEncounter(MAPS.hollow_rest, rng)).every((e) => e === null)).toBe(true);
  });
});

describe('saved position', () => {
  it('keeps a position on a real map and drops one that is not', async () => {
    const { newProgress, parseProgress } = await import('../src/engine/progress');
    const p = newProgress('gobbin');
    expect(parseProgress({ ...p, pos: { map: 'route1', x: 3, y: 4, dir: 'up' } })?.pos).toEqual({ map: 'route1', x: 3, y: 4, dir: 'up' });
    expect(parseProgress({ ...p, pos: { map: 'atlantis', x: 3, y: 4, dir: 'up' } })?.pos).toBeUndefined();
    expect(parseProgress({ ...p, pos: { map: 'route1', x: 99, y: 4, dir: 'up' } })?.pos).toBeUndefined();
  });
});
