import tilesJson from '../data/tiles.json';
import type { Rng } from './rng';
import { SPECIES } from './data';

/** The overworld as data (M4): grid maps, 4-direction steps, warps between maps, tall grass. */
export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 },
};

export interface TileData { color: string; accent: string; solid?: boolean; encounter?: boolean }
export const TILES = tilesJson.tiles as Record<string, TileData>;
export const TILE_IDS = Object.keys(TILES);

export interface Warp { x: number; y: number; to: string; tx: number; ty: number }
/** Read with the A button while facing it. */
export interface Sign { x: number; y: number; text: string }
export interface EncounterTable { rate: number; levels: [number, number]; table: { species: string; weight: number }[] }

export interface MapData {
  id: string;
  name: string;
  legend: Record<string, string>;
  rows: string[];
  spawn: { x: number; y: number };
  warps?: Warp[];
  signs?: Sign[];
  encounters?: EncounterTable;
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
  encounters?: EncounterTable;
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
  return { id: raw.id, name: raw.name, width, height: tiles.length, tiles, spawn: raw.spawn, warps: raw.warps ?? [], signs: raw.signs ?? [], encounters: raw.encounters };
}

const mapFiles = import.meta.glob('../data/maps/*.json', { eager: true, import: 'default' }) as Record<string, MapData>;
export const MAPS: Record<string, WorldMap> = Object.fromEntries(Object.values(mapFiles).map((m) => [m.id, loadMap(m)]));

export function tileAt(map: WorldMap, x: number, y: number): TileData | null {
  const kind = map.tiles[y]?.[x];
  return kind ? TILES[kind] : null;
}

export function isBlocked(map: WorldMap, x: number, y: number) {
  const t = tileAt(map, x, y);
  return !t || !!t.solid;
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
  if (isBlocked(map, x, y) || blocked(x, y)) return { moved: false, pos: { ...pos, dir }, warped: false, grass: false };
  const warp = map.warps.find((w) => w.x === x && w.y === y);
  if (warp) return { moved: true, pos: { map: warp.to, x: warp.tx, y: warp.ty, dir }, warped: true, grass: false };
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

/** Where a new game starts. */
export const START: Position = { map: 'hollow_rest', ...MAPS.hollow_rest.spawn, dir: 'down' };
