import itemsJson from '../data/items.json';
import type { TypeId } from './data';
import type { Progress } from './progress';
import { scoreBond, type SealResult, type SealWindows } from './seal';

/** Items (data/items.json): seal scrolls for now. The bag is shared by the four friends. */
export interface ScrollEffect {
  window?: number; types?: TypeId[]; typeWindow?: number; bond?: number;
  glass?: boolean; echo?: boolean; tries?: number; keepOnFail?: boolean;
}
export interface ItemData { name: string; kind: 'scroll'; color: string; short: string; desc: string; effect: ScrollEffect }

const DATA = itemsJson as unknown as { start: Record<string, number>; refill: Record<string, number>; items: Record<string, ItemData> };
export const ITEMS = DATA.items;
export const ITEM_IDS = Object.keys(ITEMS);
export const START_BAG = DATA.start;

export function count(p: Progress, id: string) {
  return p.items?.[id] ?? 0;
}

/** The scrolls in the bag, in the data's order. */
export function scrollsInBag(p: Progress) {
  return ITEM_IDS.filter((id) => ITEMS[id].kind === 'scroll' && count(p, id) > 0);
}

export function addItem(p: Progress, id: string, n = 1) {
  if (!ITEMS[id]) throw new Error(`Unknown item: ${id}`);
  p.items = { ...p.items, [id]: count(p, id) + n };
}

/** Uses one up; false if there is none. */
export function useItem(p: Progress, id: string) {
  if (count(p, id) <= 0) return false;
  const left = count(p, id) - 1;
  const items = { ...p.items };
  if (left > 0) items[id] = left; else delete items[id];
  p.items = items;
  return true;
}

/** PATCH tops the basic scrolls back up when he heals; returns how many he added. */
export function refillScrolls(p: Progress) {
  let added = 0;
  for (const [id, n] of Object.entries(DATA.refill)) {
    const have = count(p, id);
    if (have < n) { addItem(p, id, n - have); added += n - have; }
  }
  return added;
}

/** The timing windows with a scroll's help against a foe of these types. */
export function scrollWindows(w: SealWindows, effect: ScrollEffect, foeTypes: readonly TypeId[]): SealWindows {
  let k = effect.window ?? 1;
  if (effect.types && effect.typeWindow && foeTypes.some((t) => effect.types!.includes(t))) k *= effect.typeWindow;
  return { perfect: Math.round(w.perfect * k), good: Math.round(w.good * k) };
}

/** A seal's result after the scroll has its say (Glass breaks on a miss and rewards a perfect run; Gilded lifts the bond). */
export function applyScroll(r: SealResult, effect: ScrollEffect, foeTypes: readonly TypeId[]): SealResult {
  if (effect.glass) {
    if (r.grades.some((g) => g === 'miss')) return { ...r, sealed: false, bond: null };
    if (r.grades.every((g) => g === 'perfect')) return { ...r, sealed: true, bond: 'strong' };
  }
  let bonus = effect.bond ?? 0;
  if (effect.types && !foeTypes.some((t) => effect.types!.includes(t)) && effect.typeWindow) bonus = 0;
  if (!r.sealed || bonus <= 0) return r;
  return { ...r, bond: scoreBond(r.score + bonus) };
}

/** Normalises a saved bag: known items with a positive whole count. */
export function parseBag(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(raw as Record<string, unknown>)) {
    if (ITEMS[id] && typeof n === 'number' && n > 0) out[id] = Math.floor(n);
  }
  return out;
}
