import tilesJson from '../data/tiles.json';
import objectsJson from '../data/objects.json';
import type { Rng } from './rng';
import { SPECIES, type Weather } from './data';
import type { WeatherRule } from './weather';

/**
 * The overworld as data (M4): grid maps with ground heights, 4-direction steps (on screen the grid
 * is drawn isometric: +x runs down-right, +y down-left), stairs between heights, objects with
 * footprints, warps between maps, tall grass.
 */
export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 },
};

export interface TileData { color: string; accent: string; solid?: boolean; encounter?: boolean }
export const TILES = tilesJson.tiles as Record<string, TileData>;
export const TILE_IDS = Object.keys(TILES);

/** Something standing on the map (data/objects.json): a set piece, a tree, a prop. */
export interface ObjectDef {
  art: string; wx: number; wy: number; decal?: boolean; walkable?: boolean;
  door?: [number, number]; doorText?: string; opens?: Opens;
  /** Read with A while facing any of its tiles (furniture, props): one line, or a dialogue id (`talk`, with per-leader versions). */
  text?: string; talk?: string;
  /** A bed: resting on it patches up every team. */
  rest?: boolean;
  /** Placed by its footprint's front corner even when 1x1 (the interior placeholder boxes fill their tile). */
  box?: boolean;
}
/** Screens an object opens: the sanctuary's wings (the CRT stones) or its storage (the terminal). */
export type Opens = 'sanctuary' | 'storage';
export const OBJECTS = Object.fromEntries(Object.entries(objectsJson.objects)) as Record<string, ObjectDef>;
/**
 * Placed by its footprint's top corner (the tile with the lowest x and y). `until`: it stands only
 * until that wing is restored or that story flag is set (rubble in a sanctuary archway): see
 * engine/world.ts. Such objects aren't part of the fixed map (`objectAt` skips them).
 */
export interface PlacedObject { kind: string; x: number; y: number; until?: Condition }
/** A wing restored (engine/sanctuary.ts) and/or a story flag set; every part given must hold. */
export interface Condition { wing?: string; flag?: string }

/**
 * Stepping onto (x, y) moves to tx, ty on another map, facing `dir` (or the way you walked).
 * A warp may sit on a building's door tile (inside its footprint: walk into the door) or just
 * off a room's edge (walk out through the doorway): either way it's entered from the tile next to it.
 */
export interface Warp { x: number; y: number; to: string; tx: number; ty: number; dir?: Dir; /** Only walking this way goes in (a door has one side). */ enter?: Dir }
/** Read with the A button while facing it (`talk`: a dialogue id); `opens` a screen instead. May sit just off the map (a picture on a room's back wall). */
export interface Sign { x: number; y: number; text?: string; talk?: string; opens?: Opens; rest?: boolean }
/**
 * Someone standing on the map. `sprite`: 'walk:<id>' (a walk sheet), 'patch' (PATCH, big), or
 * 'placeholder:#rrggbb' until their sprite is drawn. `talk`: a data/dialogue.json id. `w`: tiles
 * wide (PATCH takes two). `heal`: talking heals the team. (The four friends aren't NPCs: they
 * follow the leader, see `lineUp`.)
 */
export interface Npc {
  id: string; x: number; y: number; w?: number; dir?: Dir; sprite: string; talk: string;
  heal?: boolean;
}
/** One row of a table; `levels` overrides the table's (the uncommon comes in a bit higher). */
export interface EncounterRow { species: string; weight: number; levels?: [number, number] }
/** Tall-grass encounters; `weather` swaps in another table while that weather is on (rain brings Voltcalf). */
export interface EncounterTable { rate: number; levels: [number, number]; table: EncounterRow[]; weather?: Partial<Record<Weather, { table: EncounterRow[] }>> }

/**
 * A Patchling standing on a map tile that you talk to for a battle (Wardeye at the storm-rod): it
 * shows once its story `after` flags are set, only in its `weather`, and not after it's sealed.
 * Beaten, it's gone until the weather is rolled again (engine/weather.ts markBeaten).
 */
export interface StaticEncounter { id: string; x: number; y: number; species: string; level: number; after?: string[]; weather?: Weather; talk?: string }

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
  /** Its weather (engine/weather.ts). */
  weather?: WeatherRule;
  statics?: StaticEncounter[];
  /** Battle backdrop for fights here (art/battle/out/<id>.png). */
  battle?: string;
  /** A room (art/tools/iso_map.py bakes it as a cut-away: floor, two back walls, no sky). */
  interior?: Record<string, unknown>;
  /** A room painted from the owner's concept (art/tools/room_concept.py): an interior too. */
  concept?: string;
  /** Where Patchlings living in the sanctuary's storage wander (engine/world.ts roamers). */
  roam?: { x: number; y: number }[];
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
  weather?: WeatherRule;
  statics: StaticEncounter[];
  battle?: string;
  interior: boolean;
  roam: { x: number; y: number }[];
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
  for (const e of [...raw.encounters?.table ?? [], ...Object.values(raw.encounters?.weather ?? {}).flatMap((w) => w?.table ?? []), ...raw.statics ?? []]) {
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
    signs: raw.signs ?? [], npcs: raw.npcs ?? [], z, objects, healSpot: raw.healSpot, encounters: raw.encounters, weather: raw.weather, statics: raw.statics ?? [], battle: raw.battle,
    interior: !!(raw.interior || raw.concept), roam: raw.roam ?? [],
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

/** The object whose footprint covers this tile, if any (not counting ones that only stand `until` something: engine/world.ts gateAt). */
export function objectAt(map: WorldMap, x: number, y: number) {
  return map.objects.find((o) => {
    if (o.until) return false;
    const d = OBJECTS[o.kind];
    return x >= o.x && x < o.x + d.wx && y >= o.y && y < o.y + d.wy;
  }) ?? null;
}

export function isBlocked(map: WorldMap, x: number, y: number) {
  const t = tileAt(map, x, y);
  if (!t || t.solid || heightAt(map, x, y) === 0) return true;
  const o = objectAt(map, x, y);
  return !!o && !OBJECTS[o.kind].walkable;
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

/** One grid step. `blocked` lets the scene add things the map doesn't know about (NPCs). */
export function step(pos: Position, dir: Dir, blocked: (x: number, y: number) => boolean = () => false): StepResult {
  const map = MAPS[pos.map];
  const x = pos.x + DIRS[dir].dx;
  const y = pos.y + DIRS[dir].dy;
  // Into a door, or out through a room's doorway: the warp is checked before what's solid. A door
  // with its one side (`enter`) can sit up a step from the path (Nolan's porch on its raised lot).
  const warp = map.warps.find((w) => w.x === x && w.y === y);
  const inside = x >= 0 && y >= 0 && x < map.width && y < map.height;
  if (warp && (!warp.enter || warp.enter === dir) && !blocked(x, y) && (!inside || warp.enter || canClimb(map, pos.x, pos.y, x, y))) {
    return { moved: true, pos: { map: warp.to, x: warp.tx, y: warp.ty, dir: warp.dir ?? dir }, warped: true, grass: false };
  }
  if (isBlocked(map, x, y) || blocked(x, y) || !canClimb(map, pos.x, pos.y, x, y)) return { moved: false, pos: { ...pos, dir }, warped: false, grass: false };
  return { moved: true, pos: { map: pos.map, x, y, dir }, warped: false, grass: !!tileAt(map, x, y)?.encounter };
}

/** After a step into tall grass: a wild Patchling, or null. The weather picks the table. */
export function rollEncounter(map: WorldMap, rng: Rng, weather: Weather | null = null): { species: string; level: number } | null {
  const e = map.encounters;
  const table = (weather && e?.weather?.[weather]?.table) || e?.table;
  if (!e || !table || table.length === 0 || rng.next() >= e.rate) return null;
  const total = table.reduce((n, t) => n + t.weight, 0);
  let roll = rng.next() * total;
  const pick = table.find((t) => (roll -= t.weight) < 0) ?? table[table.length - 1];
  const [lo, hi] = pick.levels ?? e.levels;
  return { species: pick.species, level: rng.int(lo, hi) };
}

/** The static Patchling showing on this tile now, if any (story flags, weather, not sealed, not beaten under this sky). */
export function staticAt(map: WorldMap, x: number, y: number, p: { flags?: string[]; bestiary: Record<string, { seals: number }>; weather?: Record<string, { kind: Weather | null; until: number; beaten?: string[] }> }, now = Date.now()) {
  const sky = p.weather?.[map.id];
  const weather = sky && sky.until > now ? sky.kind : null;
  return map.statics.find((s) => s.x === x && s.y === y
    && (s.after ?? []).every((f) => p.flags?.includes(f))
    && (!s.weather || s.weather === weather)
    && !(p.bestiary[s.species]?.seals > 0)
    && !sky?.beaten?.includes(s.id)) ?? null;
}

/** The tile in front of the player (what the A button reads or talks to). */
export function facing(pos: Position) {
  return { x: pos.x + DIRS[pos.dir].dx, y: pos.y + DIRS[pos.dir].dy };
}

export function signAt(map: WorldMap, x: number, y: number) {
  return map.signs.find((s) => s.x === x && s.y === y) ?? null;
}

/** What A does facing an object: open a screen, read it (furniture), rest (a bed), or knock (its door line, from its door tile). */
export function objectAction(map: WorldMap, pos: Position): { text?: string; talk?: string; opens?: Opens; rest?: boolean } | null {
  const { x, y } = facing(pos);
  const o = objectAt(map, x, y);
  if (!o) return null;
  const d = OBJECTS[o.kind];
  if (d.opens) return { opens: d.opens };
  if (d.text || d.talk || d.rest) return { text: d.text, talk: d.talk, rest: d.rest };
  if (d.door && d.doorText && pos.x === o.x + d.door[0] && pos.y === o.y + d.door[1]) return { text: d.doorText };
  return null;
}

/** The shortest walk between two tiles on one map (for tests, and NPCs later); null if none. */
export function findPath(mapId: string, from: { x: number; y: number }, to: { x: number; y: number }, blocked: (x: number, y: number) => boolean = () => false): Dir[] | null {
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
      const r = step({ map: mapId, x: c.x, y: c.y, dir: d }, d, blocked);
      if (!r.moved || r.warped) continue;
      const k = key(r.pos.x, r.pos.y);
      if (prev.has(k)) continue;
      prev.set(k, { k: key(c.x, c.y), d });
      queue.push({ x: r.pos.x, y: r.pos.y });
    }
  }
  return null;
}

/** Who is on the map right now. */
export function npcsFor(map: WorldMap) {
  return [...map.npcs];
}

/** Where a follower stands, and which way they face. */
export interface Spot { x: number; y: number; dir: Dir }
const BACK: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/**
 * The other three in a line behind the leader on arrival (new map, after a battle): back the way
 * the leader faces while the ground allows, otherwise bunched on the last open tile.
 */
export function lineUp(pos: Position, n: number, blocked: (x: number, y: number) => boolean = () => false): Spot[] {
  const out: Spot[] = [];
  let at: Position = pos;
  for (let i = 0; i < n; i++) {
    const res = step({ ...at, dir: BACK[pos.dir] }, BACK[pos.dir], blocked);
    if (res.moved && !res.warped) at = { ...res.pos, dir: pos.dir };
    out.push({ x: at.x, y: at.y, dir: pos.dir });
  }
  return out;
}

/** After the leader steps off `from`: each follower takes the place of the one ahead, facing where they went. */
export function followStep(trail: Spot[], from: Spot): Spot[] {
  const ahead = [from, ...trail];
  return trail.map((s, i) => {
    const t = ahead[i];
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dir: Dir = dx === 0 && dy === 0 ? t.dir : Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    return { x: t.x, y: t.y, dir };
  });
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
