import { describe, expect, it } from 'vitest';
import { CAST, castSpot, findPath, isBlocked, MAPS, npcsFor, objectAction, OBJECTS, step, type Position } from '../src/engine/overworld';
import { flagsOf, newProgress } from '../src/engine/progress';

const town = MAPS.hollow_rest;
const doorOf = (kind: string) => {
  const o = town.objects.find((b) => b.kind === kind)!;
  const d = OBJECTS[kind];
  return { x: o.x + d.door![0], y: o.y + d.door![1], into: OBJECTS[kind].enter! };
};
/** The way you walk into a building from its door tile. */
const walkIn = (kind: string) => {
  const d = OBJECTS[kind];
  return d.door![0] === d.wx ? 'left' : d.door![1] === d.wy ? 'up' : d.door![0] === -1 ? 'right' : 'down';
};

describe('houses', () => {
  for (const kind of ['cottage', 'casa', 'suburb', 'shed', 'sanctuary']) {
    it(`walking into the ${kind} from its door goes inside, and out again lands on the door`, () => {
      const door = doorOf(kind);
      const dir = walkIn(kind);
      const inside = step({ map: 'hollow_rest', x: door.x, y: door.y, dir }, dir);
      expect(inside.warped).toBe(true);
      expect(inside.pos).toMatchObject({ map: door.into, ...MAPS[door.into].spawn });
      const room = MAPS[door.into];
      expect(room.interior).toBe(true);
      // the way out is the warp back to town, just past the room's open front
      const out = room.warps.find((w) => w.to === 'hollow_rest')!;
      expect(out).toMatchObject({ tx: door.x, ty: door.y });
      const back = (['up', 'down', 'left', 'right'] as const).map((d) => step({ ...inside.pos, dir: d }, d)).find((r) => r.warped)!;
      expect(back.pos).toMatchObject({ map: 'hollow_rest', x: door.x, y: door.y });
      expect(isBlocked(town, back.pos.x, back.pos.y)).toBe(false);
    });
  }

  it("walking into a building from anywhere but its door doesn't go in", () => {
    const o = town.objects.find((b) => b.kind === 'cottage')!;
    // its +x face, the tile beside the door
    const at: Position = { map: 'hollow_rest', x: o.x + 2, y: o.y, dir: 'left' };
    if (!isBlocked(town, at.x, at.y)) expect(step(at, 'left').moved).toBe(false);
  });

  it('furniture is read from any side, with the inside jokes', () => {
    const room = MAPS.callum_house;
    const bag = room.objects.find((o) => o.text?.includes('Triple Cheese'))!;
    expect(objectAction(room, { map: room.id, x: bag.x, y: bag.y + 1, dir: 'up' })?.text).toMatch(/Triple Cheese/);
    expect(objectAction(room, { map: room.id, x: bag.x - 1, y: bag.y, dir: 'right' })?.text).toMatch(/Triple Cheese/);
  });
});

describe('the sanctuary base', () => {
  const hall = MAPS.sanctuary_hall;
  const fresh = newProgress('furnaxol');
  const restored = { ...newProgress('furnaxol'), wings: ['root_hall'] };

  it('the storage terminal opens the sanctuary screen; a bedroll heals', () => {
    const t = hall.objects.find((o) => o.kind === 'terminal')!;
    expect(objectAction(hall, { map: hall.id, x: t.x, y: t.y + 1, dir: 'up' })?.opens).toBe('sanctuary');
    const bed = hall.objects.find((o) => o.kind === 'bedroll')!;
    const by = [{ x: bed.x - 1, y: bed.y, dir: 'right' as const }, { x: bed.x, y: bed.y + 1, dir: 'up' as const }].find((p) => !isBlocked(hall, p.x, p.y))!;
    expect(objectAction(hall, { map: hall.id, ...by })?.heal).toBe(true);
  });

  it("PATCH's workshop is open from the start", () => {
    expect(findPath(hall.id, hall.spawn, { x: 0, y: 3 })).not.toBeNull();
    expect(step({ map: hall.id, x: 0, y: 3, dir: 'left' }, 'left').pos.map).toBe('sanctuary_workshop');
  });

  it('rubble blocks Root Hall until the wing is restored', () => {
    const arch = hall.warps.find((w) => w.to === 'sanctuary_root_hall')!;
    const front = { x: arch.x, y: arch.y + 1 };
    expect(isBlocked(hall, front.x, front.y, flagsOf(fresh))).toBe(true);
    expect(findPath(hall.id, hall.spawn, front, undefined, flagsOf(fresh))).toBeNull();
    expect(isBlocked(hall, front.x, front.y, flagsOf(restored))).toBe(false);
    expect(findPath(hall.id, hall.spawn, front, undefined, flagsOf(restored))).not.toBeNull();
    const through = step({ map: hall.id, ...front, dir: 'up' }, 'up', undefined, flagsOf(restored));
    expect(through.pos).toMatchObject({ map: 'sanctuary_root_hall', ...MAPS.sanctuary_root_hall.spawn });
  });

  it('the old keeper moves into the hall once Root Hall is restored', () => {
    const where = (p: typeof fresh) => npcsFor(hall, 'callum', flagsOf(p)).map((n) => n.id);
    expect(where(fresh)).not.toContain('elder');
    expect(where(restored)).toContain('elder');
    expect(npcsFor(town, 'callum', flagsOf(fresh)).map((n) => n.id)).toContain('elder');
    expect(npcsFor(town, 'callum', flagsOf(restored)).map((n) => n.id)).not.toContain('elder');
  });

  it('every cast member stands on open ground wherever they are', () => {
    for (const [id, c] of Object.entries(CAST)) {
      for (const s of [c.home, ...(c.visits ?? [])]) {
        expect(MAPS[s.map], `${id} on ${s.map}`).toBeDefined();
        expect(isBlocked(MAPS[s.map], s.x, s.y, (f) => f === ('when' in s ? s.when : '')), `${id} at ${s.map} ${s.x},${s.y}`).toBe(false);
      }
      expect(castSpot(c, () => false).map).toBe(c.home.map);
    }
  });
});

describe('story flags', () => {
  it('reads wings and story flags from progress', () => {
    const p = { ...newProgress('gobbin'), wings: ['root_hall'], flags: ['met_connor'] };
    const f = flagsOf(p);
    expect(f('wing:root_hall')).toBe(true);
    expect(f('wing:tide_gallery')).toBe(false);
    expect(f('met_connor')).toBe(true);
    expect(f('nope')).toBe(false);
    expect(flagsOf(newProgress('gobbin'))('met_connor')).toBe(false);
  });
});
