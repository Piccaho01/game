import cutscenesJson from '../data/cutscenes.json';
import { DIRS, MAPS, canClimb, isBlocked, type Dir } from './overworld';
import { CHARACTERS, type CharacterId } from './progress';

/**
 * Story scenes as data (data/cutscenes.json): illustrated cards, the friends standing together on
 * the overworld, the group chat. Pure: the scenes read it, tests check it.
 */
export type SpeakerId = CharacterId | 'patch' | 'connor' | 'system';
export type CastId = CharacterId | 'patch';
export type Fx = 'boom' | 'dissolve' | 'flash' | 'shake';

export interface LineStep { who: SpeakerId; text: string; cut?: boolean; focus?: [number, number, number] }
export interface CardStep { card: string; title?: string; cast?: CastId[] }
export type Step =
  | LineStep
  | CardStep
  | { fx: Fx }
  | { walk: Partial<Record<CastId, Dir[]>> }
  | { face: Partial<Record<CastId, Dir>> }
  | { members: number }
  | { phone: 'away' };

/** Where a 'cards' scene goes next: the starter assignment, the leader pick. */
export type Then = 'starters' | 'leader';

interface Base { steps: Step[] }
export interface CardsScene extends Base { kind: 'cards'; then: Then }
export interface StageScene extends Base { kind: 'stage'; map: string; camera: [number, number]; cast: Partial<Record<CastId, [number, number, Dir]>> }
export interface ChatScene extends Base { kind: 'chat'; map: string; zone: { x: number; y: number; w: number; h: number }; title: string; members: number }
export type Scene = CardsScene | StageScene | ChatScene;

const RAW = cutscenesJson as unknown as { speakers: Record<string, { name: string; color: string; tape?: string }>; scenes: Record<string, Scene> };
export const SCENES = RAW.scenes;

/** The four friends in the order they're always drawn. */
export const FRIENDS = Object.keys(CHARACTERS) as CharacterId[];

export interface Speaker { name: string; color: string; tape?: string }

/** Name and colours for whoever is talking: the four from characters.json, the rest from cutscenes.json. */
export function speaker(id: SpeakerId): Speaker {
  if (id in CHARACTERS) {
    const c = CHARACTERS[id as CharacterId];
    return { name: c.name, color: c.color };
  }
  const s = RAW.speakers[id];
  if (!s) throw new Error(`Unknown speaker: ${id}`);
  return s;
}

export const isLine = (s: Step): s is LineStep => 'who' in s;
export const isCard = (s: Step): s is CardStep => 'card' in s;

/** Story scenes that play on the overworld (the save remembers which have played). */
export const OVERWORLD_SCENES = Object.entries(SCENES).filter(([, s]) => s.kind !== 'cards').map(([id]) => id);

/** Where everyone stands at the end of a stage scene, after all its walks. */
export function castAfter(scene: StageScene) {
  const at = Object.fromEntries(Object.entries(scene.cast).map(([id, [x, y, dir]]) => [id, { x, y, dir }])) as Partial<Record<CastId, { x: number; y: number; dir: Dir }>>;
  for (const step of scene.steps) {
    if ('walk' in step) {
      for (const [id, dirs] of Object.entries(step.walk) as [CastId, Dir[]][]) {
        const p = at[id]!;
        for (const d of dirs) { p.x += DIRS[d].dx; p.y += DIRS[d].dy; p.dir = d; }
      }
    }
    if ('face' in step) for (const [id, d] of Object.entries(step.face) as [CastId, Dir][]) at[id]!.dir = d;
  }
  return at;
}

/** Which chat scene (if any) starts when the leader steps onto this tile. */
export function chatAt(mapId: string, x: number, y: number, played: string[]) {
  return Object.entries(SCENES).find(([id, s]) => s.kind === 'chat' && s.map === mapId && !played.includes(id)
    && x >= s.zone.x && x < s.zone.x + s.zone.w && y >= s.zone.y && y < s.zone.y + s.zone.h)?.[0] ?? null;
}

/** Problems with a scene (unknown speakers, walks through walls); empty when it's fine. For tests. */
export function checkScene(id: string, cards: string[]): string[] {
  const s = SCENES[id];
  const errs: string[] = [];
  const cast = new Set<string>(s.kind === 'stage' ? Object.keys(s.cast) : []);
  for (const [i, step] of s.steps.entries()) {
    const at = `${id} step ${i}`;
    if (isLine(step)) {
      try { speaker(step.who); } catch { errs.push(`${at}: unknown speaker ${step.who}`); }
      if (!step.text) errs.push(`${at}: empty line`);
    }
    if (isCard(step)) {
      if (s.kind !== 'cards') errs.push(`${at}: a card outside a cards scene`);
      if (!cards.includes(step.card)) errs.push(`${at}: no card art ${step.card}`);
      for (const c of step.cast ?? []) if (!(c in CHARACTERS) && c !== 'patch') errs.push(`${at}: unknown cast ${c}`);
    }
    for (const key of ['walk', 'face'] as const) {
      if (!(key in step)) continue;
      if (s.kind !== 'stage') errs.push(`${at}: ${key} outside a stage scene`);
      for (const who of Object.keys((step as Record<string, object>)[key])) if (!cast.has(who)) errs.push(`${at}: ${who} is not in the cast`);
    }
  }
  if (s.kind === 'cards' && !isCard(s.steps[0])) errs.push(`${id}: a cards scene starts with a card`);
  if (s.kind === 'stage') {
    const map = MAPS[s.map];
    if (!map) return [...errs, `${id}: unknown map ${s.map}`];
    for (const id2 of FRIENDS) if (!s.cast[id2]) errs.push(`${id}: ${id2} is missing (all four are in every scene)`);
    // Walk everyone along their paths: every tile open ground, every step one a player could take.
    const pos = Object.fromEntries(Object.entries(s.cast).map(([k, [x, y]]) => [k, { x, y }]));
    for (const [k, p] of Object.entries(pos)) if (isBlocked(map, p.x, p.y)) errs.push(`${id}: ${k} starts on a blocked tile ${p.x},${p.y}`);
    for (const step of s.steps) {
      if (!('walk' in step)) continue;
      for (const [k, dirs] of Object.entries(step.walk) as [string, Dir[]][]) {
        for (const d of dirs) {
          const p = pos[k];
          const nx = p.x + DIRS[d].dx;
          const ny = p.y + DIRS[d].dy;
          if (isBlocked(map, nx, ny) || !canClimb(map, p.x, p.y, nx, ny)) errs.push(`${id}: ${k} can't step ${d} from ${p.x},${p.y}`);
          p.x = nx;
          p.y = ny;
        }
      }
    }
    const end = Object.entries(pos).filter(([k]) => k !== 'patch').map(([, p]) => `${p.x},${p.y}`);
    if (new Set(end).size !== end.length) errs.push(`${id}: two friends end on the same tile`);
  }
  if (s.kind === 'chat') {
    const map = MAPS[s.map];
    if (!map) errs.push(`${id}: unknown map ${s.map}`);
    else if (s.zone.x < 0 || s.zone.y < 0 || s.zone.x + s.zone.w > map.width || s.zone.y + s.zone.h > map.height) errs.push(`${id}: zone off the map`);
  }
  return errs;
}
