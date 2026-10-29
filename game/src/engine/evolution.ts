import { evoTriggers, SPECIES, type EvoTrigger, type Weather } from './data';
import { createBattler, movesAtLevel } from './battler';
import { recordOwned, SQUAD, type CharacterId, type DexChange, type Member, type Progress } from './progress';

/**
 * Evolution (M6, triggers from Chapter 1): a Patchling evolves after a battle when one of its
 * species' level triggers is met (scenes/EvolveScene.ts); the player can stop it and it asks again
 * at its next level, like BW. Item triggers fire from the bag instead (`itemEvolution`) and can't
 * be stopped; the item is used up when it evolves. Evolving keeps its level, bond, experience and
 * damage, learns the new form's moves for its level, and opens the new form's bestiary entry as owned.
 */
export interface EvolutionDue {
  uid: number;
  /** Whose team it's on; null for the sanctuary. */
  owner: CharacterId | null;
  from: string;
  to: string;
  /** Evolving with this item from the bag (no STOP; used up when it evolves). */
  item?: string;
}

/** What the conditions are checked against: the weather where the player is, and the story flags. */
export interface EvoContext { weather?: Weather | null; flags?: readonly string[] }

function conditionsMet(t: EvoTrigger, m: Member, ctx: EvoContext) {
  if (!SPECIES[t.to]) return false;
  if (t.weather && ctx.weather !== t.weather) return false;
  if (t.flag && !ctx.flags?.includes(t.flag)) return false;
  if (t.bond === 'strong' && m.bond !== 'strong') return false;
  if (t.bond === 'steady' && m.bond === 'wary') return false;
  return true;
}

/** What it evolves into now by levelling, if it's ready (and wasn't stopped at this level). */
export function evolutionOf(m: Member, ctx: EvoContext = {}): string | null {
  if (m.evoStop !== undefined && m.level <= m.evoStop) return null;
  const t = evoTriggers(m.species).find((e) => e.level !== undefined && m.level >= e.level && !e.item && conditionsMet(e, m, ctx));
  return t?.to ?? null;
}

/** What using this item on it would evolve it into, or null (it has no use on this one). */
export function itemEvolution(m: Member, item: string, ctx: EvoContext = {}): string | null {
  const t = evoTriggers(m.species).find((e) => e.item === item && (e.level === undefined || m.level >= e.level) && conditionsMet(e, m, ctx));
  return t?.to ?? null;
}

/** The evolution an item starts from the bag, or null. */
export function useEvolutionItem(p: Progress, uid: number, item: string, ctx: EvoContext = {}): EvolutionDue | null {
  const m = findMember(p, uid);
  const to = m && itemEvolution(m, item, ctx);
  if (!m || !to) return null;
  const owner = SQUAD.find((c) => p.teams[c].some((x) => x.uid === uid)) ?? null;
  return { uid, owner, from: m.species, to, item };
}

/** Every Patchling ready to evolve: the leader's team first, then the others, then the sanctuary. */
export function pendingEvolutions(p: Progress, ctx: EvoContext = { flags: p.flags }): EvolutionDue[] {
  const owners = [p.leader, ...SQUAD.filter((c) => c !== p.leader)];
  const out: EvolutionDue[] = [];
  const add = (m: Member, owner: CharacterId | null) => {
    const to = evolutionOf(m, ctx);
    if (to) out.push({ uid: m.uid, owner, from: m.species, to });
  };
  for (const c of owners) for (const m of p.teams[c]) add(m, c);
  for (const m of p.sanctuary) add(m, null);
  return out;
}

export function findMember(p: Progress, uid: number): Member | undefined {
  return [...SQUAD.flatMap((c) => p.teams[c]), ...p.sanctuary].find((m) => m.uid === uid);
}

/**
 * Evolves it in place into `to` (one of its triggers' forms; by default whatever its level
 * triggers say now). Returns the moves it learned and the new entry's bestiary change.
 */
export function evolve(p: Progress, uid: number, to?: string): { from: string; to: string; learned: string[]; change: DexChange | null } | null {
  const m = findMember(p, uid);
  if (!m) return null;
  to ??= evolutionOf(m, { flags: p.flags }) ?? undefined;
  if (!to || !evoTriggers(m.species).some((e) => e.to === to)) return null;
  const from = m.species;
  // A hurt Patchling keeps its damage, not its old HP number.
  if (m.hp !== undefined && m.hp > 0) {
    const max = (s: string) => createBattler(s, m.level, undefined, m.bond).stats.hp;
    m.hp = Math.max(1, m.hp + max(to) - max(from));
  }
  const before = new Set(movesAtLevel(from, m.level));
  m.species = to;
  delete m.evoStop;
  const learned = movesAtLevel(to, m.level).filter((id) => !before.has(id));
  return { from, to, learned, change: recordOwned(p, to, m.bond, true) };
}

/** The player stopped it: it stays as it is until its next level. */
export function stopEvolution(p: Progress, uid: number) {
  const m = findMember(p, uid);
  if (m) m.evoStop = m.level;
}
