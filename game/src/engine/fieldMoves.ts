import obstaclesJson from '../data/obstacles.json';
import { addItem, ITEMS } from './items';
import type { CharacterId, Progress } from './progress';

/**
 * Field moves (bible §7): obstacles only one friend can clear (Dani's Shield shifts boulders,
 * Haydon's Taunt baits guards, Nolan's Patch Up fixes machines, Callum's Scan reads Relic
 * writing), so the story makes you switch leaders. Cleared ones are saved in `progress.cleared`.
 */
export type ObstacleKind = 'boulder' | 'guard' | 'broken' | 'sealed';
export interface KindData { needs: CharacterId; move: string; blocked: string; hint: string; clear: string; shout: string }
export interface Obstacle {
  id: string; map: string; x: number; y: number; kind: ObstacleKind;
  /** A prop drawn on the tile (art/locations/out/graded). */
  art?: string;
  /** A person standing there instead (an NPC sprite id: a stand pose, or `placeholder:#rrggbb`), facing `dir`. */
  sprite?: string; dir?: 'up' | 'down' | 'left' | 'right';
  /** Which way they go once cleared (the officer storms off down the stairs). */
  leaves?: 'up' | 'down' | 'left' | 'right';
  /** The art of a map piece this stands in for (the broken bridge): hidden until cleared, `art` drawn in its place. */
  replaces?: string;
  /** No picture of its own: it is the map object already on the tile (the CRT stone). */
  onObject?: boolean;
  /** Dialogue ids (dialogue.json / world_dialogue.json): said instead of the kind's `blocked` line, and after it's cleared. */
  blockedTalk?: string; clearTalk?: string;
  reward?: { item: string; n?: number };
  /** Obstacle ids that must be cleared first (a quest's steps in order); until then `waitTalk` is said. */
  after?: string[]; waitTalk?: string;
  /** Story flags set when it's cleared, and a story scene played after (data/cutscenes). */
  sets?: string[]; scene?: string;
  /** Looking at it counts as sighting this Patchling (Wardeye's dim lantern). */
  sights?: string;
  /** Said instead of the kind's `clear` line (the rod isn't a door that opens). */
  clearLine?: string;
  /** A map event played once it's cleared, before `scene` (the storm coming back: scenes/OverworldScene.ts). */
  event?: 'storm';
}

const DATA = obstaclesJson as unknown as { kinds: Record<ObstacleKind, KindData>; obstacles: Obstacle[] };
export const OBSTACLE_KINDS = DATA.kinds;
export const OBSTACLES = DATA.obstacles;

/** The obstacles still standing on a map. */
export function obstaclesOn(mapId: string, p: Progress) {
  const done = new Set(p.cleared ?? []);
  return OBSTACLES.filter((o) => o.map === mapId && !done.has(o.id));
}

export function obstacleAt(list: Obstacle[], x: number, y: number) {
  return list.find((o) => o.x === x && o.y === y) ?? null;
}

/** Who can clear it. */
export function needs(o: Obstacle): CharacterId {
  return DATA.kinds[o.kind].needs;
}

/**
 * The leader tries the obstacle: cleared (saved, reward in the bag) if they have the field move,
 * otherwise the hint naming who could. Returns what happened, for the scene to show.
 */
export function tryObstacle(p: Progress, o: Obstacle): { cleared: boolean; lines: string[]; reward?: string; talk?: string; waiting?: boolean } {
  const k = DATA.kinds[o.kind];
  const done = new Set(p.cleared ?? []);
  // A later step of a quest: its line until the earlier ones are done (whoever leads).
  if (o.after?.some((id) => !done.has(id))) return { cleared: false, lines: [], talk: o.waitTalk ?? o.blockedTalk, waiting: true };
  if (p.leader !== k.needs) return { cleared: false, lines: o.blockedTalk ? [k.hint] : [k.blocked, k.hint], talk: o.blockedTalk };
  p.cleared = [...new Set([...(p.cleared ?? []), o.id])];
  if (o.sets) p.flags = [...new Set([...(p.flags ?? []), ...o.sets])];
  let reward: string | undefined;
  if (o.reward) {
    addItem(p, o.reward.item, o.reward.n ?? 1);
    const n = o.reward.n ?? 1;
    reward = `Found ${n > 1 ? `${n} ` : 'a '}${ITEMS[o.reward.item].name}${n > 1 ? 's' : ''}!`;
  }
  return { cleared: true, lines: [o.clearLine ?? k.clear], reward, talk: o.clearTalk };
}
