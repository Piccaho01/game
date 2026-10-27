import { describe, expect, it } from 'vitest';
import {
  canClimb, DIRS, findPath, heightAt, isBlocked, loadMap, MAPS, objectAction, objectAt, OBJECTS, rollEncounter, stairAxis, START, step, TILES, type Position,
} from '../src/engine/overworld';
import { createRng } from '../src/engine/rng';

describe('maps', () => {
  it('every map loads, has its spawn on open ground, and its warps land on open ground', () => {
    expect(Object.keys(MAPS)).toEqual(expect.arrayContaining(['hollow_rest', 'route1', 'callum_house', 'sanctuary_hall']));
    for (const map of Object.values(MAPS)) {
      expect(isBlocked(map, map.spawn.x, map.spawn.y), `${map.id} spawn`).toBe(false);
      for (const w of map.warps) {
        expect(MAPS[w.to], `${map.id} warp target`).toBeDefined();
        // open ground, a door tile in a building's footprint, or just off a room's edge: entered from a neighbour
        const entries = (['up', 'down', 'left', 'right'] as const).filter((d) => {
          const from = { x: w.x - DIRS[d].dx, y: w.y - DIRS[d].dy };
          return !isBlocked(map, from.x, from.y) && step({ map: map.id, ...from, dir: d }, d).warped;
        });
        expect(entries.length, `${map.id} -> ${w.to} can be walked into`).toBeGreaterThan(0);
        expect(isBlocked(MAPS[w.to], w.tx, w.ty), `${map.id} -> ${w.to} landing`).toBe(false);
      }
    }
  });

  it('rejects typos', () => {
    const base = { id: 'x', name: 'X', legend: { '.': 'grass' }, spawn: { x: 0, y: 0 } };
    expect(() => loadMap({ ...base, rows: ['..', '.'] })).toThrow(/row 1/);
    expect(() => loadMap({ ...base, rows: ['.?'] })).toThrow(/unknown tile/);
    expect(() => loadMap({ ...base, rows: ['..'], encounters: { rate: 1, levels: [1, 1], table: [{ species: 'nope', weight: 1 }] } })).toThrow(/nope/);
    expect(() => loadMap({ ...base, rows: ['..'], heights: ['1'] })).toThrow(/heights/);
    expect(() => loadMap({ ...base, rows: ['..'], objects: [{ kind: 'castle', x: 0, y: 0 }] })).toThrow(/castle/);
    expect(() => loadMap({ ...base, rows: ['..'], objects: [{ kind: 'cottage', x: 1, y: 0 }] })).toThrow(/off the map/);
  });

  it('tall grass is the only encounter tile', () => {
    expect(Object.entries(TILES).filter(([, t]) => t.encounter).map(([id]) => id)).toEqual(['tall']);
  });

  it('a map without heights is flat', () => {
    expect(heightAt(MAPS.route1, 5, 5)).toBe(1);
  });
});

describe('Hollow Rest', () => {
  const town = MAPS.hollow_rest;

  it('buildings are solid, the sunflowers are not', () => {
    const cottage = town.objects.find((o) => o.kind === 'cottage')!;
    expect(isBlocked(town, cottage.x, cottage.y)).toBe(true);
    const flowers = town.objects.find((o) => o.kind === 'sunflowers')!;
    expect(objectAt(town, flowers.x, flowers.y)?.kind).toBe('sunflowers');
    expect(isBlocked(town, flowers.x, flowers.y)).toBe(false);
  });

  it('the ground under every object is level', () => {
    for (const o of town.objects) {
      const d = OBJECTS[o.kind];
      const zs = new Set<number>();
      for (let y = o.y; y < o.y + d.wy; y++) for (let x = o.x; x < o.x + d.wx; x++) zs.add(heightAt(town, x, y));
      expect(zs.size, o.kind).toBe(1);
    }
  });

  it('you only change height on stairs, along them', () => {
    let stairs: [number, number] | null = null;
    for (let y = 0; y < town.height && !stairs; y++) for (let x = 0; x < town.width; x++) if (stairAxis(town, x, y)) { stairs = [x, y]; break; }
    expect(stairs).not.toBeNull();
    const [sx, sy] = stairs!;
    const axis = stairAxis(town, sx, sy)!;
    const [tx, ty] = axis === 'y' ? [sx, sy - 1] : [sx - 1, sy];
    expect(heightAt(town, tx, ty)).toBe(heightAt(town, sx, sy) + 1);
    expect(canClimb(town, sx, sy, tx, ty)).toBe(true);
    expect(canClimb(town, tx, ty, sx, sy)).toBe(true);
    // a cliff with no stairs can't be climbed
    let cliff: [number, number, number, number] | null = null;
    for (let y = 1; y < town.height && !cliff; y++) {
      for (let x = 0; x < town.width; x++) {
        if (heightAt(town, x, y) > 0 && heightAt(town, x, y - 1) === heightAt(town, x, y) + 1 && town.tiles[y][x] !== 'stairs') { cliff = [x, y, x, y - 1]; break; }
      }
    }
    expect(canClimb(town, ...cliff!)).toBe(false);
  });

  it('from the spawn you can walk to the sanctuary, to PATCH, and off the island to Route 1', () => {
    const spawn = town.spawn;
    expect(findPath('hollow_rest', spawn, town.healSpot!)).not.toBeNull();
    const exit = town.warps[0];
    const path = findPath('hollow_rest', spawn, { x: exit.x - 1, y: exit.y }) ?? findPath('hollow_rest', spawn, { x: exit.x, y: exit.y - 1 });
    expect(path).not.toBeNull();
    for (const n of town.npcs) expect(isBlocked(town, n.x, n.y), n.id).toBe(false);
  });

  it('A at a door reads its line; walking in goes inside (the sanctuary too)', () => {
    const casa = town.objects.find((o) => o.kind === 'casa')!;
    // casa's door tile is in front of its +y face: facing up into the casa
    const at: Position = { map: 'hollow_rest', x: casa.x, y: casa.y + 3, dir: 'up' };
    expect(objectAction(town, at)?.text).toMatch(/Dani/);
    expect(step(at, 'up').pos.map).toBe('dani_house');
    const sanct = town.objects.find((o) => o.kind === 'sanctuary')!;
    expect(step({ map: 'hollow_rest', x: sanct.x + 1, y: sanct.y + 4, dir: 'up' }, 'up').pos.map).toBe('sanctuary_hall');
  });
});

describe('movement', () => {
  it('steps on open ground, turns without moving into walls', () => {
    const a = step({ ...START }, 'left');
    expect(a.moved).toBe(true);
    expect(a.pos).toMatchObject({ x: START.x - 1, y: START.y, dir: 'left' });
    const r1: Position = { map: 'route1', x: 1, y: 1, dir: 'down' };
    const b = step(r1, 'left');
    expect(b.moved).toBe(false);
    expect(b.pos).toEqual({ ...r1, dir: 'left' });
  });

  it('extra blockers (NPCs) stop a step', () => {
    expect(step(START, 'up', (x, y) => x === START.x && y === START.y - 1).moved).toBe(false);
  });

  it('walks from Hollow Rest to Route 1 and back', () => {
    const exit = MAPS.hollow_rest.warps[0];
    const from: Position = { map: 'hollow_rest', x: exit.x - 1, y: exit.y, dir: 'right' };
    const out = step(from, 'right');
    expect(out.warped).toBe(true);
    expect(out.pos).toMatchObject({ map: 'route1', x: exit.tx, y: exit.ty });
    const back = step({ map: 'route1', x: 10, y: 1, dir: 'up' }, 'up');
    expect(back.pos).toMatchObject({ map: 'hollow_rest', x: MAPS.route1.warps[0].tx, y: MAPS.route1.warps[0].ty });
  });

  it('flags tall grass', () => {
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
