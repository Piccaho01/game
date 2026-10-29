import type { Weather } from './data';
import type { Progress } from './progress';
import type { Rng } from './rng';

/**
 * Weather (Chapter 1; bible §7 habitat effects). A map can have a weather rule (its JSON
 * `weather`): the chance it's raining when you walk in, re-rolled every few minutes, and what it
 * needs first (a story flag such as the storm coming back, or a restored wing). The roll is saved
 * per map so leaving for a battle and coming back keeps the same sky.
 */
export interface WeatherRule {
  kind: Weather;
  /** 0-1: how often it's on when rolled. */
  chance: number;
  /** Minutes before it's rolled again (default 4). */
  minutes?: number;
  /** Story flags needed before it can happen at all. */
  after?: string[];
  /** Or a restored sanctuary wing. */
  wing?: string;
}

/** A map's sky right now: its kind (null = clear), when it's rolled again, and statics beaten under it. */
export interface Sky { kind: Weather | null; until: number; beaten?: string[] }

/** Can this rule happen yet? */
export function weatherUnlocked(rule: WeatherRule, p: Progress) {
  return (rule.after ?? []).every((f) => p.flags?.includes(f)) && (!rule.wing || p.wings.includes(rule.wing));
}

/** The weather on a map now, rolling it when it's due (saved in p.weather). */
export function skyOn(p: Progress, mapId: string, rule: WeatherRule | undefined, rng: Rng, now = Date.now()): Sky {
  const clear: Sky = { kind: null, until: Infinity };
  if (!rule || !weatherUnlocked(rule, p)) return clear;
  const saved = p.weather?.[mapId];
  if (saved && saved.until > now) return saved;
  const sky: Sky = { kind: rng.next() < rule.chance ? rule.kind : null, until: now + (rule.minutes ?? 4) * 60_000 };
  p.weather = { ...p.weather, [mapId]: sky };
  return sky;
}

/** The weather where the player stands (no roll: what was last rolled there, if still current). */
export function weatherHere(p: Progress, now = Date.now()): Weather | null {
  const sky = p.pos && p.weather?.[p.pos.map];
  return sky && sky.until > now ? sky.kind : null;
}

/** Forces a map's weather (the storm cutscene, tests, ?weather=). */
export function setSky(p: Progress, mapId: string, kind: Weather | null, minutes = 4, now = Date.now()) {
  p.weather = { ...p.weather, [mapId]: { kind, until: now + minutes * 60_000 } };
}

/** A static Patchling (Wardeye) beaten under this sky: it's gone until the weather is rolled again. */
export function markBeaten(p: Progress, mapId: string, id: string) {
  const sky = p.weather?.[mapId];
  if (sky) sky.beaten = [...new Set([...(sky.beaten ?? []), id])];
}

/** Parses a saved weather record, dropping anything malformed. */
export function parseWeather(raw: unknown): Record<string, Sky> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, Sky> = {};
  for (const [id, s] of Object.entries(raw as Record<string, Partial<Sky>>)) {
    if (!s || typeof s.until !== 'number' || (s.kind !== null && s.kind !== 'rain')) continue;
    out[id] = { kind: s.kind, until: s.until, ...(Array.isArray(s.beaten) ? { beaten: s.beaten.filter((b) => typeof b === 'string') } : {}) };
  }
  return out;
}
