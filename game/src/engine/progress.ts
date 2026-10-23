import progressJson from '../data/progress.json';
import { BESTIARY, SPECIES } from './data';
import type { Bond } from './seal';

/** The player's progress (bible §7): a team of six, the sanctuary for the rest, and the bestiary. */
export const STAGES = ['sighted', 'tracked', 'studied', 'sealed', 'bonded'] as const;
export type Stage = (typeof STAGES)[number];

export interface Member { uid: number; species: string; level: number; bond: Bond }
export interface DexRecord { encounters: number; defeats: number; seals: number; strongBonds: number }
export interface Progress {
  version: 1;
  nextUid: number;
  team: Member[];
  sanctuary: Member[];
  bestiary: Record<string, DexRecord>;
}

type Condition = Partial<Record<keyof DexRecord, number>>;
const RULES = progressJson as unknown as {
  teamSize: number; starterLevel: number; starterBond: Bond;
  stages: Record<Stage, Condition>;
  bondBoost: Record<Bond, number>;
};
export const TEAM_SIZE = RULES.teamSize;
export const BOND_BOOST = RULES.bondBoost;

export function newProgress(starter: string): Progress {
  if (!SPECIES[starter]) throw new Error(`Unknown Patchling: ${starter}`);
  return {
    version: 1, nextUid: 2,
    team: [{ uid: 1, species: starter, level: RULES.starterLevel, bond: RULES.starterBond }],
    sanctuary: [],
    // PATCH hands over the starter already bonded, so its whole entry is open.
    bestiary: { [starter]: { encounters: 1, defeats: 0, seals: 1, strongBonds: RULES.starterBond === 'strong' ? 1 : 0 } },
  };
}

/** Highest stage reached, or null if never seen. Stages can be skipped (seal on first sight). */
export function stageOf(r: DexRecord | undefined): Stage | null {
  if (!r) return null;
  let best: Stage | null = null;
  for (const s of STAGES) {
    if (Object.entries(RULES.stages[s]).some(([k, n]) => r[k as keyof DexRecord] >= (n as number))) best = s;
  }
  return best;
}

/** Lore lines unlocked for a species, in stage order. */
export function loreOf(p: Progress, species: string): { stage: Stage; text: string }[] {
  const stage = stageOf(p.bestiary[species]);
  if (!stage) return [];
  return STAGES.slice(0, STAGES.indexOf(stage) + 1).map((s) => ({ stage: s, text: BESTIARY[species][s] }));
}

/** Sanctuary points: every bestiary entry is worth its stage (sighted 1 ... bonded 5). */
export function sanctuaryPoints(p: Progress): number {
  return Object.values(p.bestiary).reduce((n, r) => n + STAGES.indexOf(stageOf(r)!) + 1, 0);
}

/** What changed in the bestiary when a record moved. */
export interface DexChange { species: string; from: Stage | null; to: Stage }

function bump(p: Progress, species: string, field: keyof DexRecord): DexChange | null {
  const r = (p.bestiary[species] ??= { encounters: 0, defeats: 0, seals: 0, strongBonds: 0 });
  const from = stageOf(r);
  r[field]++;
  const to = stageOf(r)!;
  return to !== from ? { species, from, to } : null;
}

export function recordEncounter(p: Progress, species: string) { return bump(p, species, 'encounters'); }
export function recordDefeat(p: Progress, species: string) { return bump(p, species, 'defeats'); }

/** A sealed Patchling joins the team, or goes straight to the sanctuary when the team is full. */
export function recordSeal(p: Progress, species: string, level: number, bond: Bond) {
  const member: Member = { uid: p.nextUid++, species, level, bond };
  const where: 'team' | 'sanctuary' = p.team.length < TEAM_SIZE ? 'team' : 'sanctuary';
  p[where].push(member);
  const changes = [bump(p, species, 'seals'), bond === 'strong' ? bump(p, species, 'strongBonds') : null].filter((c): c is DexChange => !!c);
  // Two bumps can both move the stage; report the whole move once.
  const change = changes.length ? { species, from: changes[0].from, to: changes[changes.length - 1].to } : null;
  return { member, where, change };
}

/** Loads saved progress, dropping anything that no longer matches the data (renamed species). */
export function parseProgress(raw: unknown): Progress | null {
  const p = raw as Progress | null;
  if (!p || p.version !== 1 || !Array.isArray(p.team) || !Array.isArray(p.sanctuary) || typeof p.bestiary !== 'object') return null;
  const ok = (m: Member) => !!SPECIES[m?.species] && m.level > 0 && ['strong', 'steady', 'wary'].includes(m.bond);
  const team = p.team.filter(ok);
  if (team.length === 0) return null;
  const bestiary = Object.fromEntries(Object.entries(p.bestiary).filter(([id]) => SPECIES[id]));
  return { ...p, team, sanctuary: p.sanctuary.filter(ok), bestiary };
}
