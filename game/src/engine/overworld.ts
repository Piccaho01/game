import tilesJson from '../data/tiles.json';
import objectsJson from '../data/objects.json';
import type { Rng } from './rng';
import { SPECIES } from './data';
import castJson from '../data/cast.json';
import type { CharacterId } from './progress';

/**
 * The overworld as data (M4): grid maps with ground heights, 4-direction steps (on screen the grid
 * is drawn isometric: +x runs down-right, +y down-left), stairs between heights, objects with
 * footprints, warps between maps, tall grass. Interiors (M4b) are maps too: a room with back
 * walls, entered by walking into a building from its door tile.
 */
export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 },
};

export interface TileData { color: string; accent: string; solid?: boolean; encounter?: boolean }
export const TILES = tilesJson.tiles as Record<string, TileData>;
export const TILE_IDS = Object.keys(TILES);

/**
 * Something standing on the map (data/objects.json): a set piece, a tree, a prop, furniture.
 * `enter`: walking into it from its door tile goes inside (that map's spawn). `text`: what A reads
 * facing any side of it. `heal`: A there heals the team (the sanctuary's beds).
 */
export interface ObjectDef {
  art: string; wx: number; wy: number; decal?: boolean; walkable?: boolean;
  door?: [number, number]; doorText?: string; opens?: 'sanctuary'; enter?: string; text?: string; heal?: boolean;
}
export const OBJECTS = Object.fromEntries(Object.entries(objectsJson.objects)) as Record<string, ObjectDef>;
/**
 * Placed by its footprint's top corner (the tile with the lowest x and y). `text` replaces the
 * kind's own. `until`: there until that flag holds (rubble cleared by a restored wing); `when`:
 * only there once it holds.
 */
export interface PlacedObject { kind: string; x: number; y: number; text?: string; until?: string; when?: string }

/**
 * Story state the world reads: 'wing:<id>' once a sanctuary wing is restored, any other name a
 * story flag (engine/progress.ts flagsOf). The default knows nothing: a fresh game.
 */
export type Flags = (flag: string) => boolean;
export const NO_FLAGS: Flags = () => false;

/** Is this thing here right now (its `when`/`unless`/`until` flags)? */
export function present(t: { when?: string; unless?: string; until?: string }, flags: Flags) {
  return (!t.when || flags(t.when)) && (!t.unless || !flags(t.unless)) && (!t.until || !flags(t.until));
}

/**
 * Stepping onto (x, y) goes to another map. A warp may sit just off the map's edge: walking into
 * a room's archway or out through its open front. `dir`: facing on arrival (else the step's).
 */
export interface Warp { x: number; y: number; to: string; tx: number; ty: number; dir?: Dir }
/** Read with the A button while facing it; `opens` a screen instead (the sanctuary's CRT stones). */
export interface Sign { x: number; y: number; text?: string; opens?: 'sanctuary' }
/**
 * Someone standing on the map. `sprite`: 'walk:<id>' (a walk sheet), 'patch' (PATCH, big), or
 * 'placeholder:#rrggbb' until their sprite is drawn. `talk`: a data/dialogue.json id. `w`: tiles
 * wide (PATCH takes two). `friend`: one of the four, only there while someone else leads.
 * `heal`: talking heals the team.
 */
export interface Npc {
  id: string; x: number; y: number; w?: number; dir?: Dir; sprite: string; talk: string;
  friend?: CharacterId; heal?: boolean; when?: string; unless?: string;
}
export interface EncounterTable { rate: number; levels: [number, number]; table: { species: string; weight: number }[] }

export interface MapData {
  id: string;
  name: string;
  legend: Record<string, string>;
  rows: string[];
  spawn: { x: number; y: number };
  warps?: Warp[];
  signs?: Sign[];
  npcs?: Npc[];
  /** Ground level per tile, one digit each (0 = no ground: the sky past the island's edge). All 1 if missing. */
  heights?: string[];
  objects?: PlacedObject[];
  /** Where you wake up after blacking out (the map with one is the heal spot). */
  healSpot?: { x: number; y: number; dir: Dir };
  encounters?: EncounterTable;
  /** A room (M4b): floor and back walls instead of an island in the sky (art/tools/iso_map.py). */
  interior?: { floor: string; wall: string };
}

export interface WorldMap {
  id: string;
  name: string;
  width: number;
  height: number;
  /** tiles[y][x] = tile kind id. */
  tiles: string[][];
  spawn: { x: number; y: number };
  warps: Warp[];
  signs: Sign[];
  npcs: Npc[];
  /** z[y][x]: ground level (0 = none). */
  z: number[][];
  objects: PlacedObject[];
  healSpot?: { x: number; y: number; dir: Dir };
  encounters?: EncounterTable;
  interior: boolean;
}

/** Turns a map file into a grid, failing loudly on typos (unknown legend chars, ragged rows). */
export function loadMap(raw: MapData): WorldMap {
  const width = raw.rows[0]?.length ?? 0;
  const tiles = raw.rows.map((row, y) => {
    if (row.length !== width) throw new Error(`${raw.id}: row ${y} is ${row.length} wide, expected ${width}`);
    return [...row].map((ch, x) => {
      const kind = raw.legend[ch];
      if (!kind || !TILES[kind]) throw new Error(`${raw.id}: unknown tile '${ch}' at ${x},${y}`);
      return kind;
    });
  });
  for (const e of raw.encounters?.table ?? []) {
    if (!SPECIES[e.species]) throw new Error(`${raw.id}: unknown Patchling ${e.species} in encounters`);
  }
  const z = raw.heights
    ? raw.heights.map((row, y) => {
      if (row.length !== width) throw new Error(`${raw.id}: heights row ${y} is ${row.length} wide, expected ${width}`);
      return [...row].map(Number);
    })
    : tiles.map((row) => row.map(() => 1));
  if (z.length !== tiles.length) throw new Error(`${raw.id}: ${z.length} height rows for ${tiles.length} rows`);
  const objects = raw.objects ?? [];
  for (const o of objects) {
    const d = OBJECTS[o.kind];
    if (!d) throw new Error(`${raw.id}: unknown object ${o.kind}`);
    if (o.x < 0 || o.y < 0 || o.x + d.wx > width || o.y + d.wy > tiles.length) throw new Error(`${raw.id}: ${o.kind} at ${o.x},${o.y} is off the map`);
  }
  return {
    id: raw.id, name: raw.name, width, height: tiles.length, tiles, spawn: raw.spawn, warps: raw.warps ?? [],
    signs: raw.signs ?? [], npcs: raw.npcs ?? [], z, objects, healSpot: raw.healSpot, encounters: raw.encounters,
    interior: !!raw.interior,
  };
}

const mapFiles = import.meta.glob('../data/maps/*.json', { eager: true, import: 'default' }) as Record<string, MapData>;
export const MAPS: Record<string, WorldMap> = Object.fromEntries(Object.values(mapFiles).map((m) => [m.id, loadMap(m)]));

export function tileAt(map: WorldMap, x: number, y: number): TileData | null {
  const kind = map.tiles[y]?.[x];
  return kind ? TILES[kind] : null;
}

export function heightAt(map: WorldMap, x: number, y: number) {
  return map.z[y]?.[x] ?? 0;
}

function covers(o: PlacedObject, x: number, y: number) {
  const d = OBJECTS[o.kind];
  return x >= o.x && x < o.x + d.wx && y >= o.y && y < o.y + d.wy;
}

/** The object whose footprint covers this tile, if any (and if it's there right now). */
export function objectAt(map: WorldMap, x: number, y: number, flags: Flags = NO_FLAGS) {
  return map.objects.find((o) => present(o, flags) && covers(o, x, y)) ?? null;
}

export function isBlocked(map: WorldMap, x: number, y: number, flags: Flags = NO_FLAGS) {
  const t = tileAt(map, x, y);
  if (!t || t.solid || heightAt(map, x, y) === 0) return true;
  const o = objectAt(map, x, y, flags);
  return !!o && !OBJECTS[o.kind].walkable;
}

/** The tile you stand on to knock on (or walk into) a placed building. */
export function doorTile(o: PlacedObject) {
  const d = OBJECTS[o.kind].door;
  return d ? { x: o.x + d[0], y: o.y + d[1] } : null;
}

/**
 * Stairs climb toward the neighbour one level up, -y ('y') or -x ('x'): the one the path carries
 * on into, else any higher one. Same rule as the baker (art/tools/iso_map.py).
 */
export function stairAxis(map: WorldMap, x: number, y: number): 'x' | 'y' | null {
  if (map.tiles[y]?.[x] !== 'stairs') return null;
  const z = heightAt(map, x, y);
  const up = ([['y', x, y - 1], ['x', x - 1, y]] as const).filter(([, nx, ny]) => heightAt(map, nx, ny) === z + 1);
  const onPath = up.filter(([, nx, ny]) => ['path', 'exit'].includes(map.tiles[ny]?.[nx]));
  return (onPath[0] ?? up[0])?.[0] ?? null;
}

/** Can you walk from one tile to its neighbour? Same height, or up and down along a stairway. */
export function canClimb(map: WorldMap, ax: number, ay: number, bx: number, by: number) {
  const za = heightAt(map, ax, ay);
  const zb = heightAt(map, bx, by);
  if (za === zb) return true;
  if (Math.abs(za - zb) !== 1) return false;
  // the stairs are the lower tile; the move must run along their axis into (or out of) the top
  const [lx, ly, hx, hy] = za < zb ? [ax, ay, bx, by] : [bx, by, ax, ay];
  const axis = stairAxis(map, lx, ly);
  return (axis === 'y' && hx === lx && hy === ly - 1) || (axis === 'x' && hy === ly && hx === lx - 1);
}

export interface Position { map: string; x: number; y: number; dir: Dir }

export interface StepResult {
  /** False when something is in the way (the player only turns). */
  moved: boolean;
  pos: Position;
  /** Stepping onto a warp moves to another map; pos is already on the far side. */
  warped: boolean;
  /** Landed in tall grass: roll for an encounter. */
  grass: boolean;
}

/**
 * One grid step. `blocked` lets the scene add things the map doesn't know about (NPCs); `flags`
 * says which gated things are there (rubble, visitors).
 */
export function step(pos: Position, dir: Dir, blocked: (x: number, y: number) => boolean = () => false, flags: Flags = NO_FLAGS): StepResult {
  const map = MAPS[pos.map];
  const x = pos.x + DIRS[dir].dx;
  const y = pos.y + DIRS[dir].dy;
  const stay = { moved: false, pos: { ...pos, dir }, warped: false, grass: false };
  const warp = map.warps.find((w) => w.x === x && w.y === y);
  const offMap = x < 0 || y < 0 || x >= map.width || y >= map.height;
  if (warp && offMap) return { moved: true, pos: { map: warp.to, x: warp.tx, y: warp.ty, dir: warp.dir ?? dir }, warped: true, grass: false };
  if (isBlocked(map, x, y, flags) || blocked(x, y) || !canClimb(map, pos.x, pos.y, x, y)) {
    // Walking into a building from its door tile goes inside.
    const o = objectAt(map, x, y, flags);
    const door = o && doorTile(o);
    const inside = o && OBJECTS[o.kind].enter;
    if (inside && door && door.x === pos.x && door.y === pos.y && MAPS[inside]) {
      return { moved: true, pos: { map: inside, ...MAPS[inside].spawn, dir }, warped: true, grass: false };
    }
    return stay;
  }
  if (warp) return { moved: true, pos: { map: warp.to, x: warp.tx, y: warp.ty, dir: warp.dir ?? dir }, warped: true, grass: false };
  return { moved: true, pos: { map: pos.map, x, y, dir }, warped: false, grass: !!tileAt(map, x, y)?.encounter };
}

/** After a step into tall grass: a wild Patchling, or null. */
export function rollEncounter(map: WorldMap, rng: Rng): { species: string; level: number } | null {
  const e = map.encounters;
  if (!e || e.table.length === 0 || rng.next() >= e.rate) return null;
  const total = e.table.reduce((n, t) => n + t.weight, 0);
  let roll = rng.next() * total;
  const pick = e.table.find((t) => (roll -= t.weight) < 0) ?? e.table[e.table.length - 1];
  return { species: pick.species, level: rng.int(e.levels[0], e.levels[1]) };
}

/** The tile in front of the player (what the A button reads or talks to). */
export function facing(pos: Position) {
  return { x: pos.x + DIRS[pos.dir].dx, y: pos.y + DIRS[pos.dir].dy };
}

export function signAt(map: WorldMap, x: number, y: number) {
  return map.signs.find((s) => s.x === x && s.y === y) ?? null;
}

/**
 * What A does facing an object: open a screen (the storage terminal), read it (furniture, from
 * any side; a building's door line, from its door tile), and maybe heal (a bed).
 */
export function objectAction(map: WorldMap, pos: Position, flags: Flags = NO_FLAGS): { text?: string; opens?: 'sanctuary'; heal?: boolean } | null {
  const { x, y } = facing(pos);
  const o = objectAt(map, x, y, flags);
  if (!o) return null;
  const d = OBJECTS[o.kind];
  if (d.opens) return { opens: d.opens };
  const text = o.text ?? d.text;
  if (text) return { text, heal: d.heal };
  const door = doorTile(o);
  if (door && d.doorText && pos.x === door.x && pos.y === door.y) return { text: d.doorText };
  return null;
}

/** The shortest walk between two tiles on one map (for tests, and NPCs later); null if none. */
export function findPath(mapId: string, from: { x: number; y: number }, to: { x: number; y: number }, blocked: (x: number, y: number) => boolean = () => false, flags: Flags = NO_FLAGS): Dir[] | null {
  const map = MAPS[mapId];
  const key = (x: number, y: number) => y * map.width + x;
  const prev = new Map<number, { k: number; d: Dir } | null>([[key(from.x, from.y), null]]);
  const queue = [{ x: from.x, y: from.y }];
  while (queue.length) {
    const c = queue.shift()!;
    if (c.x === to.x && c.y === to.y) {
      const dirs: Dir[] = [];
      let k = key(c.x, c.y);
      for (let p = prev.get(k); p; p = prev.get(k)) { dirs.unshift(p.d); k = p.k; }
      return dirs;
    }
    for (const d of Object.keys(DIRS) as Dir[]) {
      const r = step({ map: mapId, x: c.x, y: c.y, dir: d }, d, blocked, flags);
      if (!r.moved || r.warped) continue;
      const k = key(r.pos.x, r.pos.y);
      if (prev.has(k)) continue;
      prev.set(k, { k: key(c.x, c.y), d });
      queue.push({ x: r.pos.x, y: r.pos.y });
    }
  }
  return null;
}

/**
 * The recurring cast (data/cast.json): people with a home spot and visits. A visit whose `when`
 * holds moves them there (the last one listed wins), so people met on the journey turn up in the
 * sanctuary as the story goes on; `talk` there replaces their home line.
 */
export interface Spot { map: string; x: number; y: number; dir?: Dir }
export interface CastMember { sprite: string; talk: string; home: Spot; visits?: (Spot & { when: string; talk?: string })[] }
export const CAST = castJson.people as unknown as Record<string, CastMember>;

/** Where a cast member is right now, and what they say there. */
export function castSpot(c: CastMember, flags: Flags): Spot & { talk: string } {
  const visit = [...(c.visits ?? [])].reverse().find((v) => flags(v.when));
  return visit ? { ...visit, talk: visit.talk ?? c.talk } : { ...c.home, talk: c.talk };
}

/**
 * Who is on the map right now: its own people whose flags hold (the friend who is leading isn't
 * also waiting around), plus whoever of the cast is here.
 */
export function npcsFor(map: WorldMap, leader: CharacterId, flags: Flags = NO_FLAGS): Npc[] {
  const own = map.npcs.filter((n) => n.friend !== leader && present(n, flags));
  const cast = Object.entries(CAST).flatMap(([id, c]) => {
    const s = castSpot(c, flags);
    return s.map === map.id ? [{ id, x: s.x, y: s.y, dir: s.dir, sprite: c.sprite, talk: s.talk }] : [];
  });
  return [...own, ...cast];
}

export function npcAt(npcs: Npc[], x: number, y: number) {
  return npcs.find((n) => y === n.y && x >= n.x && x < n.x + (n.w ?? 1)) ?? null;
}

/** Where a new game starts. */
export const START: Position = { map: 'hollow_rest', ...MAPS.hollow_rest.spawn, dir: 'down' };

/** Where you wake up after the whole team faints. */
export const HEAL_SPOT: Position = (() => {
  const map = Object.values(MAPS).find((m) => m.healSpot);
  return map ? { map: map.id, x: map.healSpot!.x, y: map.healSpot!.y, dir: map.healSpot!.dir } : START;
})();
