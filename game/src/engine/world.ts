import castJson from '../data/cast.json';
import { MAPS, OBJECTS, type Condition, type Dir, type Npc, type WorldMap } from './overworld';

/**
 * The world that changes with the story (M4b World track): rooms that open when a sanctuary wing
 * is restored or a story flag is set, people who move about (home, then visits), and the
 * Patchlings living in the sanctuary wandering its rooms. Pure: the overworld scene asks.
 */
export interface WorldState { wings: string[]; flags?: string[] }

/** Does the condition hold? (Every part given must.) */
export function met(c: Condition | undefined, s: WorldState) {
  if (!c) return true;
  if (c.wing && !s.wings.includes(c.wing)) return false;
  if (c.flag && !(s.flags ?? []).includes(c.flag)) return false;
  return true;
}

/** An object still standing in the way until its condition holds (rubble in an archway), on this tile. */
export function gateAt(map: WorldMap, x: number, y: number, s: WorldState) {
  return map.objects.find((o) => {
    if (!o.until || met(o.until, s)) return false;
    const d = OBJECTS[o.kind];
    return x >= o.x && x < o.x + d.wx && y >= o.y && y < o.y + d.wy;
  }) ?? null;
}

/**
 * The recurring cast (data/cast.json): everyone has a home; a visit whose condition holds moves
 * them (the last one that holds wins), so people met on the journey can turn up in the sanctuary.
 * `talk` on a visit replaces their lines while they're there.
 */
export interface Place { map: string; x: number; y: number; dir?: Dir }
export interface Visit extends Place { when: Condition; talk?: string }
export interface CastMember { name: string; sprite: string; talk: string; home: Place; visits?: Visit[]; heal?: boolean }
export const CAST = Object.fromEntries(Object.entries(castJson.people)) as Record<string, CastMember>;

/** Where someone is right now, and what they'll say. */
export function whereIs(id: string, s: WorldState): { at: Place; talk: string } {
  const c = CAST[id];
  if (!c) throw new Error(`Unknown cast member: ${id}`);
  const visit = [...(c.visits ?? [])].reverse().find((v) => met(v.when, s));
  return { at: visit ?? c.home, talk: visit?.talk ?? c.talk };
}

/** Everyone on a map right now: the map's own people plus whoever of the cast is here. */
export function peopleOn(map: WorldMap, s: WorldState): Npc[] {
  const cast = Object.keys(CAST).flatMap((id) => {
    const { at, talk } = whereIs(id, s);
    if (at.map !== map.id) return [];
    return [{ id, x: at.x, y: at.y, dir: at.dir, sprite: CAST[id].sprite, talk, heal: CAST[id].heal }];
  });
  return [...map.npcs, ...cast];
}

/** Every roaming spot in the sanctuary, map by map (alphabetical), in the order they fill. */
const ROAM_SPOTS = Object.values(MAPS).sort((a, b) => a.id.localeCompare(b.id)).flatMap((m) => m.roam.map((r) => ({ map: m.id, ...r })));

/**
 * Patchlings in storage live in the sanctuary (bible §7): they're dealt into its roaming spots in
 * storage order (only the ones that have follower art, `canShow`). Returns the ones on this map.
 */
export function roamersOn<T extends { species: string }>(mapId: string, stored: T[], canShow: (species: string) => boolean = () => true) {
  const shown = stored.filter((m) => canShow(m.species));
  return ROAM_SPOTS.slice(0, shown.length).map((spot, i) => ({ ...spot, member: shown[i] })).filter((r) => r.map === mapId);
}
