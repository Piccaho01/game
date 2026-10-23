import dialogueJson from '../data/dialogue.json';
import type { CharacterId } from './progress';

/** Who says what (data/dialogue.json). */
export interface Line { who?: string; text: string }
interface Entry { lines: Line[]; byLeader?: Partial<Record<CharacterId, Line[]>> }

const DIALOGUE = Object.fromEntries(Object.entries(dialogueJson).filter(([k]) => !k.startsWith('_'))) as Record<string, Entry>;

/** The lines for a talk, in the leader's version when there is one. */
export function linesFor(id: string, leader: CharacterId): Line[] {
  const e = DIALOGUE[id];
  if (!e) throw new Error(`Unknown dialogue: ${id}`);
  return e.byLeader?.[leader] ?? e.lines;
}

export const DIALOGUE_IDS = Object.keys(DIALOGUE);
