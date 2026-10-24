import charactersJson from '../data/characters.json';
import progressJson from '../data/progress.json';
import { BESTIARY, SPECIES, type StatusId } from './data';
import { createBattler, type Battler } from './battler';
import type { AssistId } from './battle';
import { MAPS, type Position } from './overworld';
import type { Bond } from './seal';

/** The player's progress (bible §7): a team of six, the sanctuary for the rest, and the bestiary. */
export const STAGES = ['sighted', 'tracked', 'studied', 'sealed', 'bonded'] as const;
export type Stage = (typeof STAGES)[number];

export type CharacterId = 'callum' | 'nolan' | 'haydon' | 'dani';
export interface CharacterData { name: string; role: string; color: string; field: string; assist: { id: AssistId; name: string; short: string; desc: string }; line: string }
export const CHARACTERS = charactersJson.characters as Record<CharacterId, CharacterData>;

/** `hp`/`status`: carried between wild battles; missing means full health and no status. */
export interface Member { uid: number; species: string; level: number; bond: Bond; hp?: number; status?: StatusId | null }
/** `scans`: Callum's Scan, which counts toward Studied. */
export interface DexRecord { encounters: number; defeats: number; seals: number; strongBonds: number; scans: number }
export interface Progress {
  version: 2;
  /** The character leading (bible §6); swapping leaders and their own teams come in M4. */
  leader: CharacterId;
  nextUid: number;
  team: Member[];
  sanctuary: Member[];
  bestiary: Record<string, DexRecord>;
  /** Sanctuary wings restored (engine/sanctuary.ts), in order. */
  wings: string[];
  /** Where the leader stands in the overworld; missing until they first walk out. */
  pos?: Position;
  /**
   * Overworld story scenes already played (engine/cutscene.ts). Missing on saves from before the
   * story scenes (and on test shortcuts): those games are past them, so none play.
   */
  story?: string[];
}

const EMPTY_RECORD: DexRecord = { encounters: 0, defeats: 0, seals: 0, strongBonds: 0, scans: 0 };

type Condition = Partial<Record<keyof DexRecord, number>>;
const RULES = progressJson as unknown as {
  teamSize: number; starters: string[]; starterLevel: number; starterBond: Bond;
  stages: Record<Stage, Condition>;
  bondBoost: Record<Bond, number>;
};
export const TEAM_SIZE = RULES.teamSize;
export const STARTERS = RULES.starters;
export const BOND_BOOST = RULES.bondBoost;

export function newProgress(starter: string, leader: CharacterId = 'callum'): Progress {
  if (!SPECIES[starter]) throw new Error(`Unknown Patchling: ${starter}`);
  if (!CHARACTERS[leader]) throw new Error(`Unknown character: ${leader}`);
  return {
    version: 2, leader, nextUid: 2,
    team: [{ uid: 1, species: starter, level: RULES.starterLevel, bond: RULES.starterBond }],
    sanctuary: [],
    wings: [],
    story: [],
    // PATCH hands over the starter already bonded, so its whole entry is open.
    bestiary: { [starter]: { encounters: 1, defeats: 0, seals: 1, strongBonds: RULES.starterBond === 'strong' ? 1 : 0, scans: 0 } },
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
  const r = (p.bestiary[species] ??= { ...EMPTY_RECORD });
  const from = stageOf(r);
  r[field]++;
  const to = stageOf(r)!;
  return to !== from ? { species, from, to } : null;
}

export function recordEncounter(p: Progress, species: string) { return bump(p, species, 'encounters'); }
export function recordDefeat(p: Progress, species: string) { return bump(p, species, 'defeats'); }
export function recordScan(p: Progress, species: string) { return bump(p, species, 'scans'); }

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

/** The team as battlers, with the HP and status they were left with. */
export function teamBattlers(p: Progress): Battler[] {
  return p.team.map((m) => {
    const b = createBattler(m.species, m.level, undefined, m.bond);
    if (m.hp !== undefined) b.hp = Math.max(0, Math.min(b.stats.hp, m.hp));
    b.status = m.status ?? null;
    return b;
  });
}

/** After a battle: each member keeps the HP and status it ended with (team order is unchanged). */
export function keepBattleDamage(p: Progress, team: Battler[]) {
  p.team.forEach((m, i) => {
    const b = team[i];
    if (!b) return;
    m.hp = b.hp >= b.stats.hp ? undefined : b.hp;
    m.status = b.hp > 0 ? b.status : null;
    if (m.hp === undefined) delete m.hp;
    if (!m.status) delete m.status;
  });
}

export function healTeam(p: Progress) {
  for (const m of p.team) {
    delete m.hp;
    delete m.status;
  }
}

/** Can the team fight? (Someone is still standing.) */
export function canBattle(p: Progress) {
  return teamBattlers(p).some((b) => b.hp > 0);
}

/** Loads saved progress, dropping anything that no longer matches the data (renamed species). */
export function parseProgress(raw: unknown): Progress | null {
  const p = raw as (Omit<Progress, 'version' | 'leader'> & { version: number; leader?: string }) | null;
  if (!p || (p.version !== 1 && p.version !== 2) || !Array.isArray(p.team) || !Array.isArray(p.sanctuary) || typeof p.bestiary !== 'object') return null;
  // Version 1 saves came before the character pick: they belong to Callum.
  const leader = (p.leader && p.leader in CHARACTERS ? p.leader : 'callum') as CharacterId;
  const ok = (m: Member) => !!SPECIES[m?.species] && m.level > 0 && ['strong', 'steady', 'wary'].includes(m.bond)
    && (m.hp === undefined || (typeof m.hp === 'number' && m.hp >= 0));
  const team = p.team.filter(ok);
  if (team.length === 0) return null;
  // Records saved before a counter existed get it at 0.
  const bestiary = Object.fromEntries(Object.entries(p.bestiary).filter(([id]) => SPECIES[id])
    .map(([id, r]) => [id, { ...EMPTY_RECORD, ...(r as Partial<DexRecord>) }]));
  // A position on a map that no longer exists (or off its edge) is dropped: the game starts them at the spawn.
  const map = p.pos && MAPS[p.pos.map];
  const pos = map && p.pos!.x >= 0 && p.pos!.y >= 0 && p.pos!.x < map.width && p.pos!.y < map.height ? p.pos : undefined;
  const wings = Array.isArray(p.wings) ? p.wings.filter((w): w is string => typeof w === 'string') : [];
  const story = Array.isArray(p.story) ? p.story.filter((s): s is string => typeof s === 'string') : undefined;
  return { ...p, version: 2, leader, team, sanctuary: p.sanctuary.filter(ok), bestiary, pos, wings, story };
}
