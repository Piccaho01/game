import { describe, expect, it } from 'vitest';
import { DIALOGUE_IDS } from '../src/engine/dialogue';
import { findPath, isBlocked, MAPS, objectAction, OBJECTS, step, type Position } from '../src/engine/overworld';
import { CAST, gateAt, met, peopleOn, roamersOn, whereIs } from '../src/engine/world';

const HOUSES = ['callum_house', 'nolan_house', 'haydon_shed', 'dani_house'];
const SANCTUARY = ['sanctuary_hall', 'sanctuary_workshop', 'sanctuary_roots'];
const fresh = { wings: [] as string[] };
const restored = { wings: ['root_hall'] };

/** From a map's door warp into a room, then straight back out the way you came in. */
function roundTrip(from: Position, dir: Position['dir']) {
  const into = step(from, dir);
  expect(into.warped, `into from ${from.map} ${from.x},${from.y}`).toBe(true);
  const room = MAPS[into.pos.map];
  // you arrive on the doormat, facing in; the way out is off the front edge
  expect(room.tiles[into.pos.y][into.pos.x]).toBe('mat');
  const out = step(into.pos, 'down');
  expect(out.warped).toBe(true);
  return { room: room.id, back: out.pos };
}

describe('interiors', () => {
  it('every house in Hollow Rest can be walked into and out of, coming back to its door', () => {
    const town = MAPS.hollow_rest;
    const seen = new Set<string>();
    for (const w of town.warps.filter((w) => MAPS[w.to].interior)) {
      for (const d of ['up', 'down', 'left', 'right'] as const) {
        const from = { map: 'hollow_rest', x: w.x - (d === 'right' ? 1 : d === 'left' ? -1 : 0), y: w.y - (d === 'down' ? 1 : d === 'up' ? -1 : 0), dir: d };
        if (isBlocked(town, from.x, from.y) || !step(from, d).warped) continue;
        const { room, back } = roundTrip(from, d);
        seen.add(room);
        expect(back).toMatchObject({ map: 'hollow_rest', x: from.x, y: from.y });
        // you come out facing away from the door, so the next step doesn't walk you back in
        expect(step(back, back.dir).warped).toBe(false);
      }
    }
    expect([...seen].sort()).toEqual([...HOUSES, 'sanctuary_hall'].sort());
  });

  it('rooms are cut-aways, small enough to see at once', () => {
    for (const id of [...HOUSES, ...SANCTUARY]) {
      const m = MAPS[id];
      expect(m.interior, id).toBe(true);
      expect(m.width * m.height, id).toBeLessThanOrEqual(100);
      expect(m.encounters, id).toBeUndefined();
    }
  });

  it('every sign, object line and talk in the rooms has its lines', () => {
    for (const id of [...HOUSES, ...SANCTUARY]) {
      for (const s of MAPS[id].signs) if (s.talk) expect(DIALOGUE_IDS, `${id} sign`).toContain(s.talk);
      for (const o of MAPS[id].objects) {
        const t = OBJECTS[o.kind].talk;
        if (t) expect(DIALOGUE_IDS, `${id} ${o.kind}`).toContain(t);
      }
    }
  });

  it('furniture reads its line from any side', () => {
    const room = MAPS.callum_house;
    const bag = room.objects.find((o) => o.kind === 'in_table_bag')!;
    expect(objectAction(room, { map: room.id, x: bag.x - 1, y: bag.y, dir: 'right' })?.talk).toBe('callum_bag');
    expect(objectAction(room, { map: room.id, x: bag.x, y: bag.y + 1, dir: 'up' })?.talk).toBe('callum_bag');
  });
});

describe('the sanctuary base', () => {
  const hall = MAPS.sanctuary_hall;
  const mat = hall.spawn;

  it('the entrance hall has the CRT stones (wings), the storage terminal and four beds, all reachable', () => {
    const find = (pred: (k: string) => boolean) => hall.objects.filter((o) => pred(o.kind));
    expect(find((k) => OBJECTS[k].opens === 'sanctuary')).toHaveLength(1);
    expect(find((k) => OBJECTS[k].opens === 'storage')).toHaveLength(1);
    expect(find((k) => !!OBJECTS[k].rest)).toHaveLength(4);
    const blocked = (x: number, y: number) => !!gateAt(hall, x, y, fresh);
    for (const o of find((k) => !!(OBJECTS[k].opens || OBJECTS[k].rest))) {
      const d = OBJECTS[o.kind];
      const near = [];
      for (let y = o.y - 1; y <= o.y + d.wy; y++) for (let x = o.x - 1; x <= o.x + d.wx; x++) near.push({ x, y });
      expect(near.some((t) => !isBlocked(hall, t.x, t.y) && findPath(hall.id, mat, t, blocked)), o.kind).toBe(true);
    }
  });

  it('PATCH\'s workshop is open from the start; Root Hall waits behind rubble until its wing is restored', () => {
    const toWorkshop = hall.warps.find((w) => w.to === 'sanctuary_workshop')!;
    const toRoots = hall.warps.find((w) => w.to === 'sanctuary_roots')!;
    const blockedNow = (x: number, y: number) => !!gateAt(hall, x, y, fresh);
    const inFront = (w: { x: number; y: number }) => (w.y < 0 ? { x: w.x, y: 0 } : { x: 0, y: w.y });
    expect(findPath(hall.id, mat, inFront(toWorkshop), blockedNow)).not.toBeNull();
    // the arch to Root Hall: rubble in front of it until root_hall is restored
    expect(gateAt(hall, inFront(toRoots).x, inFront(toRoots).y, fresh)?.kind).toBe('in_rubble');
    expect(findPath(hall.id, mat, inFront(toRoots), blockedNow)).toBeNull();
    expect(gateAt(hall, inFront(toRoots).x, inFront(toRoots).y, restored)).toBeNull();
    const open = (x: number, y: number) => !!gateAt(hall, x, y, restored);
    expect(findPath(hall.id, mat, inFront(toRoots), open)).not.toBeNull();
    const into = step({ map: hall.id, ...inFront(toRoots), dir: 'up' }, 'up', open);
    expect(into.pos.map).toBe('sanctuary_roots');
    // and back out of Root Hall to the arch
    expect(step(into.pos, 'down').pos).toMatchObject({ map: hall.id, ...inFront(toRoots) });
  });

  it('conditions need every part: a wing and a story flag', () => {
    expect(met(undefined, fresh)).toBe(true);
    expect(met({ wing: 'root_hall' }, fresh)).toBe(false);
    expect(met({ wing: 'root_hall' }, restored)).toBe(true);
    expect(met({ wing: 'root_hall', flag: 'met_wayfarers' }, restored)).toBe(false);
    expect(met({ wing: 'root_hall', flag: 'met_wayfarers' }, { ...restored, flags: ['met_wayfarers'] })).toBe(true);
  });
});

describe('the recurring cast', () => {
  it('everyone has lines, stands on open ground, and their home map exists', () => {
    for (const [id, c] of Object.entries(CAST)) {
      expect(DIALOGUE_IDS, id).toContain(c.talk);
      for (const p of [c.home, ...(c.visits ?? [])]) {
        expect(MAPS[p.map], `${id} ${p.map}`).toBeDefined();
        expect(isBlocked(MAPS[p.map], p.x, p.y), `${id} at ${p.map}`).toBe(false);
        expect(gateAt(MAPS[p.map], p.x, p.y, restored), `${id} at ${p.map}`).toBeNull();
      }
      for (const v of c.visits ?? []) if (v.talk) expect(DIALOGUE_IDS, id).toContain(v.talk);
    }
  });

  it('the old keeper stays in town until Root Hall is restored, then visits it', () => {
    expect(whereIs('elder', fresh).at.map).toBe('hollow_rest');
    expect(peopleOn(MAPS.hollow_rest, fresh).map((n) => n.id)).toContain('elder');
    expect(whereIs('elder', restored)).toMatchObject({ at: { map: 'sanctuary_roots' }, talk: 'elder_roots' });
    expect(peopleOn(MAPS.hollow_rest, restored).map((n) => n.id)).not.toContain('elder');
    expect(peopleOn(MAPS.sanctuary_roots, restored).map((n) => n.id)).toContain('elder');
  });

  it('family is at home: Nolan\'s dad in the basement, Dani\'s mamá in the casa', () => {
    expect(peopleOn(MAPS.nolan_house, fresh).map((n) => n.id)).toEqual(['nolan_dad']);
    expect(peopleOn(MAPS.dani_house, fresh).map((n) => n.id)).toEqual(['dani_mama']);
  });
});

describe('Patchlings living in the sanctuary', () => {
  const stored = [{ uid: 1, species: 'sprigby' }, { uid: 2, species: 'orbitot' }, { uid: 3, species: 'gobbin' }];
  it('wander its rooms, first the entrance hall, only the ones with follower art', () => {
    const shown = (sp: string) => sp !== 'orbitot';
    const here = roamersOn('sanctuary_hall', stored, shown);
    expect(here.map((r) => r.member.uid)).toEqual([1, 3]);
    for (const r of here) expect(isBlocked(MAPS.sanctuary_hall, r.x, r.y)).toBe(false);
    expect(roamersOn('hollow_rest', stored)).toEqual([]);
  });
});

describe('Route 1 (isometric)', () => {
  const r1 = MAPS.route1;
  it('keeps its tall grass, encounters and battle backdrop; the road runs from Hollow Rest to the closed checkpoint', () => {
    expect(r1.battle).toBe('route1');
    expect(r1.encounters?.table.map((t) => t.species).sort()).toEqual(['fledjet', 'orbitot']);
    const booth = r1.objects.find((o) => o.kind === 'r1_booth')!;
    const d = OBJECTS.r1_booth;
    const fronts = [];
    for (let i = 0; i < d.wx; i++) fronts.push({ x: booth.x + i, y: booth.y + d.wy }, { x: booth.x + i, y: booth.y - 1 });
    for (let j = 0; j < d.wy; j++) fronts.push({ x: booth.x + d.wx, y: booth.y + j }, { x: booth.x - 1, y: booth.y + j });
    expect(fronts.some((f) => !isBlocked(r1, f.x, f.y) && findPath('route1', r1.spawn, f))).toBe(true);
    let grass = 0;
    for (let y = 0; y < r1.height; y++) for (let x = 0; x < r1.width; x++) if (r1.tiles[y][x] === 'tall' && findPath('route1', r1.spawn, { x, y })) grass++;
    expect(grass).toBeGreaterThanOrEqual(30);
  });

  it('the bridge crosses the stream', () => {
    const bridge = r1.objects.find((o) => o.kind === 'r1_bridge')!;
    expect(r1.tiles[bridge.y][bridge.x + 1]).toBe('bridge');
    expect(findPath('route1', { x: bridge.x, y: bridge.y }, { x: bridge.x + 2, y: bridge.y })).toEqual(['right', 'right']);
  });
});
