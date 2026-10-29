import shiniesJson from '../data/shinies.json';
import { evoTriggers, SPECIES } from './data';
import type { Variant } from './progress';
import type { Rng } from './rng';

/**
 * Shinies and Prototypes (bible §7, owner's rule 2026-10-29), cosmetic only. Every wild
 * Patchling rolls: a Prototype (PATCH's scrapped first draft, still in the code) about 1 in 8192,
 * else a shiny about 1 in 512. A shiny wears its line's second palette (data/shinies.json: the
 * owner picks one of the options per line); a Prototype gets the washed-out draft palette and a
 * live glitch (ui/variantFx.ts). Neither changes stats.
 */
export const SHINY_ODDS = 512;
export const PROTOTYPE_ODDS = 8192;

export function rollVariant(rng: Rng): Variant | undefined {
  if (rng.next() < 1 / PROTOTYPE_ODDS) return 'prototype';
  if (rng.next() < 1 / SHINY_ODDS) return 'shiny';
  return undefined;
}

/** A colour shift: hue turned by `hue` degrees, saturation and lightness scaled; `keep` colours (eyes, outlines) stay. */
export interface Recolor { hue?: number; sat?: number; light?: number; keep?: string[] }
interface ShinyLine { options: Recolor[]; pick: number }
const DATA = shiniesJson as unknown as { lines: Record<string, ShinyLine>; prototype: Recolor & { tint: string; mix: number } };
export const PROTOTYPE_LOOK = DATA.prototype;

/** The first form of a species' line (shiny palettes are per line). */
export function lineRoot(species: string): string {
  for (const [id] of Object.entries(SPECIES)) {
    if (evoTriggers(id).some((t) => t.to === species)) return lineRoot(id);
  }
  return species;
}

/** The shiny palette for a species (its line's picked option), or option `i` for the review sheet. */
export function shinyRecolor(species: string, i?: number): Recolor {
  const line = DATA.lines[lineRoot(species)];
  if (!line) return { hue: 150 };
  return line.options[i ?? line.pick] ?? line.options[0];
}

export function shinyOptions(species: string): Recolor[] {
  return DATA.lines[lineRoot(species)]?.options ?? [{ hue: 150 }];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** One colour through a recolour (outlines, near-black and greys under 12% saturation stay put). */
export function recolorPixel(r: number, g: number, b: number, rc: Recolor & { tint?: string; mix?: number }): [number, number, number] {
  if (rc.keep?.some((k) => { const [kr, kg, kb] = hex(k); return Math.abs(kr - r) + Math.abs(kg - g) + Math.abs(kb - b) < 6; })) return [r, g, b];
  let [h, s, l] = rgbToHsl(r, g, b);
  if (l < 0.17 && !rc.tint) return [r, g, b];
  if (s > 0.12 || rc.tint) {
    h += rc.hue ?? 0;
    s = Math.min(1, s * (rc.sat ?? 1));
  }
  l = Math.min(1, l * (rc.light ?? 1));
  let out = hslToRgb(h, s, l);
  if (rc.tint && rc.mix) {
    const t = hex(rc.tint);
    out = out.map((v, i) => v + (t[i] - v) * rc.mix!) as [number, number, number];
  }
  return out.map((v) => Math.round(Math.max(0, Math.min(255, v)))) as [number, number, number];
}
