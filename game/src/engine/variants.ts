import shiniesJson from '../data/shinies.json';
import { evoTriggers, SPECIES } from './data';
import type { Variant } from './progress';
import type { Rng } from './rng';

/**
 * Shinies and Prototypes (bible §7, owner's rule 2026-10-29), cosmetic only. Every wild
 * Patchling rolls: a Prototype (PATCH's scrapped first draft, still in the code) about 1 in 8192,
 * else a shiny about 1 in 512. A shiny wears its line's second palette (data/shinies.json: the
 * owner picks one of the options per line); a Prototype is the sanctuary's colourway, dark stone
 * with its accents in pulsing screen blue (ui/variantFx.ts). Neither changes stats.
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
/** The Prototype colourway: stone (hue, saturation, lightness = base + l x scale) and the blue its accents turn. */
export interface PrototypeLook { stone: { hue: number; sat: number; base: number; scale: number }; blue: { hue: number; sat: number }; accents: number; glow: string }
const DATA = shiniesJson as unknown as { lines: Record<string, ShinyLine>; prototype: PrototypeLook };
export const PROTOTYPE_LOOK = DATA.prototype;

/**
 * A sprite's accent colours for its Prototype: its brightest, most saturated colours (saturation x
 * lightness), taking colours from the top until they cover `share` of its pixels. `counts`: colour
 * (0xrrggbb) -> pixel count.
 */
export function accentColours(counts: Map<number, number>, share = PROTOTYPE_LOOK.accents): Set<number> {
  const score = (c: number) => {
    const [, s, l] = rgbToHsl(c >> 16, (c >> 8) & 255, c & 255);
    return l < 0.17 ? 0 : s * l;
  };
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const out = new Set<number>();
  let run = 0;
  for (const c of [...counts.keys()].sort((a, b) => score(b) - score(a))) {
    if (run > total * share || score(c) < 0.2) break;
    out.add(c);
    run += counts.get(c)!;
  }
  return out;
}

/** One colour of a Prototype: outlines stay, accents go the sanctuary blue, the rest dark stone. */
export function prototypePixel(r: number, g: number, b: number, accent: boolean, look = PROTOTYPE_LOOK): [number, number, number] {
  const [, , l] = rgbToHsl(r, g, b);
  if (l < 0.17) return [r, g, b];
  const out = accent
    ? hslToRgb(look.blue.hue, look.blue.sat, Math.min(0.62, 0.22 + l * 0.45))
    : hslToRgb(look.stone.hue, look.stone.sat, Math.min(0.85, look.stone.base + l * look.stone.scale));
  return out.map((v) => Math.round(Math.max(0, Math.min(255, v)))) as [number, number, number];
}

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

/** One colour through a shiny recolour (outlines, near-black and greys under 12% saturation stay put). */
export function recolorPixel(r: number, g: number, b: number, rc: Recolor): [number, number, number] {
  if (rc.keep?.some((k) => { const [kr, kg, kb] = hex(k); return Math.abs(kr - r) + Math.abs(kg - g) + Math.abs(kb - b) < 6; })) return [r, g, b];
  let [h, s, l] = rgbToHsl(r, g, b);
  if (l < 0.17) return [r, g, b];
  if (s > 0.12) {
    h += rc.hue ?? 0;
    s = Math.min(1, s * (rc.sat ?? 1));
  }
  l = Math.min(1, l * (rc.light ?? 1));
  const out = hslToRgb(h, s, l);
  return out.map((v) => Math.round(Math.max(0, Math.min(255, v)))) as [number, number, number];
}
