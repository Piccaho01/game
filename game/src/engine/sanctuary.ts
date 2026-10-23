import sanctuaryJson from '../data/sanctuary.json';
import type { Line } from './dialogue';
import { sanctuaryPoints, type Progress } from './progress';

/** Sanctuary wings (data/sanctuary.json): restored with sanctuary points, in order. */
export interface Wing { id: string; name: string; points: number; desc: string; patch: Line[] }
export const WINGS = sanctuaryJson.wings as Wing[];

export type WingState = 'restored' | 'ready' | 'locked';

/** Restored, ready (enough points, and every wing before it restored), or locked. */
export function wingState(p: Progress, id: string): WingState {
  const i = WINGS.findIndex((w) => w.id === id);
  if (i < 0) throw new Error(`Unknown wing: ${id}`);
  if (p.wings.includes(id)) return 'restored';
  const before = WINGS.slice(0, i).every((w) => p.wings.includes(w.id));
  return before && sanctuaryPoints(p) >= WINGS[i].points ? 'ready' : 'locked';
}

/** Restores a ready wing; returns false if it isn't ready. */
export function restoreWing(p: Progress, id: string) {
  if (wingState(p, id) !== 'ready') return false;
  p.wings.push(id);
  return true;
}
