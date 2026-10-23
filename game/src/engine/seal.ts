import sealsJson from '../data/seals.json';
import type { TypeId } from './data';

/** The seal (bible §7): a short timing minigame. Weaken the target, then tap on each beat. */
export interface SealPattern { name: string; leadMs: number; beats: number[]; desc: string }
export type Grade = 'perfect' | 'good' | 'miss';
/** How well the seal took: a better seal means a stronger bond. Sloppy seals still work. */
export type Bond = 'strong' | 'steady' | 'wary';
export interface SealWindows { perfect: number; good: number }
export interface SealResult { grades: Grade[]; strays: number; score: number; sealed: boolean; bond: Bond | null }

const DATA = sealsJson as unknown as {
  windows: { perfect: [number, number]; good: [number, number] };
  scoring: { perfect: number; good: number; stray: number; sealAt: number; sealAtFullHp: number; strongAt: number; steadyAt: number };
  patterns: Record<TypeId | 'default', SealPattern>;
};
export const SEAL_PATTERNS = DATA.patterns;

export function sealPattern(type: TypeId): SealPattern {
  return DATA.patterns[type] ?? DATA.patterns.default;
}

/** Timing windows (± ms) for a target at `hpFrac` of its HP: the weaker it is, the easier the seal. */
export function sealWindows(hpFrac: number): SealWindows {
  const t = 1 - Math.max(0, Math.min(1, hpFrac));
  const lerp = ([full, empty]: [number, number]) => Math.round(full + (empty - full) * t);
  return { perfect: lerp(DATA.windows.perfect), good: lerp(DATA.windows.good) };
}

/**
 * Grades taps (ms on the same clock as `beats`) against the beats. Each tap takes the earliest
 * beat still open within the good window; taps that land on no beat are strays. A healthier
 * target (`hpFrac`) needs a cleaner seal to take.
 */
export function judgeSeal(beats: readonly number[], taps: readonly number[], w: SealWindows, hpFrac = 0): SealResult {
  const grades: (Grade | null)[] = beats.map(() => null);
  let strays = 0;
  for (const t of [...taps].sort((a, b) => a - b)) {
    const i = beats.findIndex((b, j) => grades[j] === null && Math.abs(t - b) <= w.good);
    if (i < 0) { strays++; continue; }
    grades[i] = Math.abs(t - beats[i]) <= w.perfect ? 'perfect' : 'good';
  }
  return scoreSeal(grades.map((g) => g ?? 'miss'), strays, hpFrac);
}

export function scoreSeal(grades: Grade[], strays: number, hpFrac = 0): SealResult {
  const s = DATA.scoring;
  const sealAt = s.sealAt + (s.sealAtFullHp - s.sealAt) * Math.max(0, Math.min(1, hpFrac));
  const points = grades.reduce((p, g) => p + (g === 'perfect' ? s.perfect : g === 'good' ? s.good : 0), 0) + strays * s.stray;
  const score = Math.max(0, points / grades.length);
  const sealed = score >= sealAt;
  const bond: Bond | null = !sealed ? null : score >= s.strongAt ? 'strong' : score >= s.steadyAt ? 'steady' : 'wary';
  return { grades, strays, score, sealed, bond };
}
