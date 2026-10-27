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
export interface Obstacle { id: string; map: string; x: number; y: number; kind: ObstacleKind; art?: string; reward?: { item: string; n?: number } }

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
export function tryObstacle(p: Progress, o: Obstacle): { cleared: boolean; lines: string[]; reward?: string } {
  const k = DATA.kinds[o.kind];
  if (p.leader !== k.needs) return { cleared: false, lines: [k.blocked, k.hint] };
  p.cleared = [...new Set([...(p.cleared ?? []), o.id])];
  let reward: string | undefined;
  if (o.reward) {
    addItem(p, o.reward.item, o.reward.n ?? 1);
    const n = o.reward.n ?? 1;
    reward = `Found ${n > 1 ? `${n} ` : 'a '}${ITEMS[o.reward.item].name}${n > 1 ? 's' : ''}!`;
  }
  return { cleared: true, lines: [k.clear], reward };
}
