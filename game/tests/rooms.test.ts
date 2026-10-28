import { describe, expect, it } from 'vitest';
import { findPath, isBlocked, MAPS } from '../src/engine/overworld';
import castJson from '../src/data/cast.json';

type Spot = { map: string; x: number; y: number };
const cast = castJson as unknown as { people: Record<string, { home: Spot; visits?: Spot[] }> };

// The rooms painted from the owner's concepts (art/tools/rooms.json): furniture is solid, so check
// nothing anyone needs ended up behind it.
const ROOMS = ['callum_house', 'nolan_house', 'dani_house', 'haydon_shed', 'sanctuary_hall', 'sanctuary_workshop', 'sanctuary_roots'];
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

describe('rooms', () => {
  for (const id of ROOMS) {
    it(`${id}: every sign can be read, and everyone has open floor to stand on`, () => {
      const map = MAPS[id];
      const reach = (x: number, y: number) => !isBlocked(map, x, y) && findPath(id, map.spawn, { x, y }) !== null;
      // A piece covering several tiles has a sign on each; one readable tile is enough.
      const groups = new Map<string, typeof map.signs>();
      for (const s of map.signs) groups.set(JSON.stringify([s.talk, s.text]), [...(groups.get(JSON.stringify([s.talk, s.text])) ?? []), s]);
      for (const [what, signs] of groups) expect(signs.some((s) => SIDES.some(([dx, dy]) => reach(s.x + dx, s.y + dy))), what).toBe(true);
      for (const r of map.roam ?? []) expect(reach(r.x, r.y), `roam spot ${r.x},${r.y}`).toBe(true);
      for (const p of Object.values(cast.people)) {
        for (const spot of [p.home, ...(p.visits ?? [])]) {
          if (spot.map === id) expect(reach(spot.x, spot.y), `cast spot ${spot.x},${spot.y}`).toBe(true);
        }
      }
    });
  }
});
