import charactersJson from '../data/characters.json';
import progressJson from '../data/progress.json';
import { BESTIARY, SPECIES, type StatusId } from './data';
import { createBattler, type Battler } from './battler';
import type { AssistId } from './battle';
import { MAPS, type Position } from './overworld';
import type { Bond } from './seal';

/**
 * The player's progress (bible §6, §7): each of the four friends has their own team of six, the
 * sanctuary holds the rest (shared: any friend can withdraw any of them), and the bestiary.
 */
export const STAGES = ['sighted', 'tracked', 'studied', 'sealed', 'bonded'] as const;
export type Stage = (typeof STAGES)[number];

export type CharacterId = 'callum' | 'nolan' | 'haydon' | 'dani';
export interface CharacterData { name: string; role: string; color: string; field: string; assist: { id: AssistId; name: string; short: string; desc: string; shout: string; accent: string }; line: string }
export const CHARACTERS = charactersJson.characters as Record<CharacterId, CharacterData>;
/** The squad in SWITCH order. */
export const SQUAD = Object.keys(CHARACTERS) as CharacterId[];

/** `hp`/`status`: carried between wild battles; missing means full health and no status. */
export interface Member { uid: number; species: string; level: number; bond: Bond; hp?: number; status?: StatusId | null }
/** `scans`: Callum's Scan, which counts toward Studied. */
export interface DexRecord { encounters: number; defeats: number; seals: number; strongBonds: number; scans: number }
export interface Progress {
  version: 3;
  /** The friend leading (bible §6): the one you walk as, whose team battles and whose assist applies. */
  leader: CharacterId;
  nextUid: number;
  teams: Record<CharacterId, Member[]>;
  /** Shared storage. */
  sanctuary: Member[];
  bestiary: Record<string, DexRecord>;
  /** Sanctuary wings restored (engine/sanctuary.ts), in order. */
  wings: string[];
  /** Where the leader stands in the overworld; missing until they first walk out. */
  pos?: Position;
  settings?: Settings;
  /** Story scenes seen and other story flags (engine/story.ts). */
  flags?: string[];
}

/**
 * Player options. `party`: 'squad' shows all four friends walking in line; 'solo' shows only the
 * leader and their Patchling (the others still appear in cutscenes). Missing means the defaults.
 */
export interface Settings { party?: 'squad' | 'solo' }
export function partyMode(p: Progress): 'squad' | 'solo' {
  return p.settings?.party === 'solo' ? 'solo' : 'squad';
}

const EMPTY_RECORD: DexRecord = { encounters: 0, defeats: 0, seals: 0, strongBonds: 0, scans: 0 };

type Condition = Partial<Record<keyof DexRecord, number>>;
const RULES = progressJson as unknown as {
  teamSize: number; starters: string[]; defaultStarters: Record<CharacterId, string>; starterLevel: number; starterBond: Bond;
  stages: Record<Stage, Condition>;
  bondBoost: Record<Bond, number>;
};
export const TEAM_SIZE = RULES.teamSize;
export const STARTERS = RULES.starters;
export const BOND_BOOST = RULES.bondBoost;

export const DEFAULT_STARTERS = RULES.defaultStarters;

/** Who takes which starter (one each), keeping the defaults for the rest: `leader` gets `starter`, and whoever had it by default gets the leader's. */
export function assignStarters(starter: string, leader: CharacterId): Record<CharacterId, string> {
  const out = { ...DEFAULT_STARTERS };
  const had = SQUAD.find((c) => out[c] === starter);
  if (had) out[had] = out[leader];
  out[leader] = starter;
  return out;
}

/** A new game: one starter per friend (`starters`), or a single starter for the leader with the defaults for the rest. */
export function newProgress(starters: string | Partial<Record<CharacterId, string>>, leader: CharacterId = 'callum'): Progress {
  if (!CHARACTERS[leader]) throw new Error(`Unknown character: ${leader}`);
  const picks = typeof starters === 'string' ? assignStarters(starters, leader) : { ...DEFAULT_STARTERS, ...starters };
  for (const c of SQUAD) if (!SPECIES[picks[c]]) throw new Error(`Unknown Patchling: ${picks[c]}`);
  let uid = 1;
  const teams = Object.fromEntries(SQUAD.map((c) => [c, [{ uid: uid++, species: picks[c], level: RULES.starterLevel, bond: RULES.starterBond }]])) as Record<CharacterId, Member[]>;
  // PATCH hands over the starters already bonded, so their whole entries are open.
  const bestiary: Record<string, DexRecord> = {};
  for (const c of SQUAD) bestiary[picks[c]] = { ...EMPTY_RECORD, encounters: 1, seals: 1, strongBonds: RULES.starterBond === 'strong' ? 1 : 0 };
  return { version: 3, leader, nextUid: uid, teams, sanctuary: [], wings: [], bestiary, flags: [] };
}

/** The leader's team: the one that battles. */
export function leaderTeam(p: Progress) {
  return p.teams[p.leader];
}

/** SWITCH: the next friend in the squad takes the lead. */
export function switchLeader(p: Progress, to?: CharacterId) {
  p.leader = to ?? SQUAD[(SQUAD.indexOf(p.leader) + 1) % SQUAD.length];
  return p.leader;
}

/** Sends one of the leader's team to the sanctuary (PATCH looks after it: back to full). The last one stays. */
export function deposit(p: Progress, uid: number) {
  const team = leaderTeam(p);
  const i = team.findIndex((m) => m.uid === uid);
  if (i < 0 || team.length <= 1) return false;
  const [m] = team.splice(i, 1);
  delete m.hp;
  delete m.status;
  p.sanctuary.push(m);
  return true;
}

/** Takes any Patchling from the sanctuary onto the leader's team, if there is room. */
export function withdraw(p: Progress, uid: number) {
  const team = leaderTeam(p);
  const i = p.sanctuary.findIndex((m) => m.uid === uid);
  if (i < 0 || team.length >= TEAM_SIZE) return false;
  team.push(...p.sanctuary.splice(i, 1));
  return true;
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

/** A sealed Patchling joins the leader's team, or goes straight to the sanctuary when that team is full. */
export function recordSeal(p: Progress, species: string, level: number, bond: Bond) {
  const member: Member = { uid: p.nextUid++, species, level, bond };
  const where: 'team' | 'sanctuary' = leaderTeam(p).length < TEAM_SIZE ? 'team' : 'sanctuary';
  (where === 'team' ? leaderTeam(p) : p.sanctuary).push(member);
  const changes = [bump(p, species, 'seals'), bond === 'strong' ? bump(p, species, 'strongBonds') : null].filter((c): c is DexChange => !!c);
  // Two bumps can both move the stage; report the whole move once.
  const change = changes.length ? { species, from: changes[0].from, to: changes[changes.length - 1].to } : null;
  return { member, where, change };
}

/** The leader's team as battlers, with the HP and status they were left with. */
export function teamBattlers(p: Progress): Battler[] {
  return leaderTeam(p).map((m) => {
    const b = createBattler(m.species, m.level, undefined, m.bond);
    if (m.hp !== undefined) b.hp = Math.max(0, Math.min(b.stats.hp, m.hp));
    b.status = m.status ?? null;
    return b;
  });
}

/** After a battle: each member keeps the HP and status it ended with (team order is unchanged). */
export function keepBattleDamage(p: Progress, team: Battler[]) {
  leaderTeam(p).forEach((m, i) => {
    const b = team[i];
    if (!b) return;
    m.hp = b.hp >= b.stats.hp ? undefined : b.hp;
    m.status = b.hp > 0 ? b.status : null;
    if (m.hp === undefined) delete m.hp;
    if (!m.status) delete m.status;
  });
}

/** PATCH patches up everyone's team. */
export function healTeam(p: Progress) {
  for (const m of SQUAD.flatMap((c) => p.teams[c])) {
    delete m.hp;
    delete m.status;
  }
}

/** Can the leader's team fight? (Someone is still standing.) */
export function canBattle(p: Progress) {
  return teamBattlers(p).some((b) => b.hp > 0);
}

/**
 * Loads saved progress, dropping anything that no longer matches the data (renamed species).
 * Older saves had one team: it goes to its leader, and the other three get the remaining starters.
 */
export function parseProgress(raw: unknown): Progress | null {
  type Raw = Omit<Progress, 'version' | 'leader' | 'teams'> & { version: number; leader?: string; team?: Member[]; teams?: Partial<Record<string, Member[]>> };
  const p = raw as Raw | null;
  if (!p || ![1, 2, 3].includes(p.version) || !Array.isArray(p.sanctuary) || typeof p.bestiary !== 'object') return null;
  // Version 1 saves came before the character pick: they belong to Callum.
  const leader = (p.leader && p.leader in CHARACTERS ? p.leader : 'callum') as CharacterId;
  const ok = (m: Member) => !!SPECIES[m?.species] && m.level > 0 && ['strong', 'steady', 'wary'].includes(m.bond)
    && (m.hp === undefined || (typeof m.hp === 'number' && m.hp >= 0));
  const list = (ms: unknown) => (Array.isArray(ms) ? (ms as Member[]).filter(ok) : []);
  let nextUid = typeof p.nextUid === 'number' ? p.nextUid : 1;
  let teams: Record<CharacterId, Member[]>;
  let bestiary = p.bestiary as Record<string, Partial<DexRecord>>;
  if (p.version < 3) {
    const team = list(p.team);
    if (team.length === 0) return null;
    const used = new Set([...team, ...list(p.sanctuary)].map((m) => m.uid));
    nextUid = Math.max(nextUid, ...used) + 1;
    const picks = assignStarters(STARTERS.includes(team[0].species) ? team[0].species : DEFAULT_STARTERS[leader], leader);
    bestiary = { ...bestiary };
    teams = Object.fromEntries(SQUAD.map((c) => {
      if (c === leader) return [c, team];
      // A starter they bring is bonded, like PATCH's handover.
      bestiary[picks[c]] = { ...EMPTY_RECORD, ...bestiary[picks[c]] };
      const r = bestiary[picks[c]] as DexRecord;
      r.encounters = Math.max(1, r.encounters);
      r.seals = Math.max(1, r.seals);
      if (RULES.starterBond === 'strong') r.strongBonds = Math.max(1, r.strongBonds);
      return [c, [{ uid: nextUid++, species: picks[c], level: RULES.starterLevel, bond: RULES.starterBond }]];
    })) as Record<CharacterId, Member[]>;
  } else {
    teams = Object.fromEntries(SQUAD.map((c) => [c, list(p.teams?.[c])])) as Record<CharacterId, Member[]>;
    if (teams[leader].length === 0) return null;
  }
  // Records saved before a counter existed get it at 0.
  const dex = Object.fromEntries(Object.entries(bestiary).filter(([id]) => SPECIES[id])
    .map(([id, r]) => [id, { ...EMPTY_RECORD, ...r }]));
  // A position on a map that no longer exists (or off its edge) is dropped: the game starts them at the spawn.
  const map = p.pos && MAPS[p.pos.map];
  const pos = map && p.pos!.x >= 0 && p.pos!.y >= 0 && p.pos!.x < map.width && p.pos!.y < map.height ? p.pos : undefined;
  const wings = Array.isArray(p.wings) ? p.wings.filter((w): w is string => typeof w === 'string') : [];
  // Saves from before the story have no flags: they count as past the opening ('opening', engine/story.ts).
  const flags = Array.isArray(p.flags) ? p.flags.filter((f): f is string => typeof f === 'string') : ['opening'];
  const { team: _old, settings: rawSettings, ...rest } = p;
  const settings: Settings = {};
  if (rawSettings?.party === 'solo' || rawSettings?.party === 'squad') settings.party = rawSettings.party;
  return { ...rest, version: 3, leader, nextUid, teams, sanctuary: list(p.sanctuary), bestiary: dex, pos, wings, flags, ...(Object.keys(settings).length ? { settings } : {}) };
}
