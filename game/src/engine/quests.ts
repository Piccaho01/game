import questsJson from '../data/quests.json';
import { SPECIES } from './data';
import type { Progress } from './progress';

/** Bestiary quests (data/quests.json, bible §7): the steps of a rare Patchling's world task. */
export interface QuestStep { text: string; cleared?: string; flag?: string; sighted?: string }
export interface Quest { name: string; steps: QuestStep[] }
export const QUESTS = (questsJson as unknown as { quests: Record<string, Quest> }).quests;

export function stepDone(p: Progress, s: QuestStep) {
  if (s.cleared) return !!p.cleared?.includes(s.cleared);
  if (s.flag) return !!p.flags?.includes(s.flag);
  if (s.sighted) return (p.bestiary[s.sighted]?.encounters ?? 0) > 0;
  return false;
}

/** A species' quest with each step ticked, or null if it has none. */
export function questOf(p: Progress, species: string): { name: string; steps: { text: string; done: boolean }[]; done: boolean } | null {
  const q = SPECIES[species]?.quest ? QUESTS[SPECIES[species].quest!] : undefined;
  if (!q) return null;
  const steps = q.steps.map((s) => ({ text: s.text, done: stepDone(p, s) }));
  return { name: q.name, steps, done: steps.every((s) => s.done) };
}
