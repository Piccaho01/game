import sanctuaryJson from '../data/sanctuary.json';
import type { Line } from './dialogue';
import { SQUAD, type Progress } from './progress';

/**
 * Sanctuary wings (data/sanctuary.json), restored in order, each opened by the story (owner's
 * call, Chapter 1): `after` story flags set by its chapter's quest, `owned` Patchlings the four
 * have between them. `needs`: what PATCH says it's waiting on.
 */
export interface Wing { id: string; name: string; desc: string; patch: Line[]; after?: string[]; owned?: number; needs: string }
export const WINGS = sanctuaryJson.wings as Wing[];

export type WingState = 'restored' | 'ready' | 'locked';

/** How many Patchlings the four have: every team and the sanctuary. */
export function ownedCount(p: Progress) {
  return SQUAD.reduce((n, c) => n + p.teams[c].length, 0) + p.sanctuary.length;
}

/** Has the story opened this wing yet? */
export function wingOpened(p: Progress, w: Wing) {
  return (w.after ?? []).every((f) => p.flags?.includes(f)) && ownedCount(p) >= (w.owned ?? 0);
}

/** Restored, ready (the story has opened it, and every wing before it is restored), or locked. */
export function wingState(p: Progress, id: string): WingState {
  const i = WINGS.findIndex((w) => w.id === id);
  if (i < 0) throw new Error(`Unknown wing: ${id}`);
  if (p.wings.includes(id)) return 'restored';
  const before = WINGS.slice(0, i).every((w) => p.wings.includes(w.id));
  return before && wingOpened(p, WINGS[i]) ? 'ready' : 'locked';
}

/** Restores a ready wing; returns false if it isn't ready. */
export function restoreWing(p: Progress, id: string) {
  if (wingState(p, id) !== 'ready') return false;
  p.wings.push(id);
  return true;
}
