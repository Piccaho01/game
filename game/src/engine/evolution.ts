import { SPECIES } from './data';
import { createBattler, movesAtLevel } from './battler';
import { recordOwned, SQUAD, type CharacterId, type DexChange, type Member, type Progress } from './progress';

/**
 * Evolution (M6): a Patchling that reaches its species' `evolves.level` evolves after the battle
 * (scenes/EvolveScene.ts). The player can stop it; it asks again at its next level, like BW.
 * Evolving keeps its level, bond, experience and damage, learns the new form's moves for its
 * level, and opens the new form's bestiary entry as owned.
 */
export interface EvolutionDue {
  uid: number;
  /** Whose team it's on; null for the sanctuary. */
  owner: CharacterId | null;
  from: string;
  to: string;
}

/** What it evolves into now, if it's ready (and wasn't stopped at this level). */
export function evolutionOf(m: Member): string | null {
  const evo = SPECIES[m.species]?.evolves;
  if (!evo || !SPECIES[evo.to] || m.level < evo.level) return null;
  if (m.evoStop !== undefined && m.level <= m.evoStop) return null;
  return evo.to;
}

/** Every Patchling ready to evolve: the leader's team first, then the others, then the sanctuary. */
export function pendingEvolutions(p: Progress): EvolutionDue[] {
  const owners = [p.leader, ...SQUAD.filter((c) => c !== p.leader)];
  const out: EvolutionDue[] = [];
  const add = (m: Member, owner: CharacterId | null) => {
    const to = evolutionOf(m);
    if (to) out.push({ uid: m.uid, owner, from: m.species, to });
  };
  for (const c of owners) for (const m of p.teams[c]) add(m, c);
  for (const m of p.sanctuary) add(m, null);
  return out;
}

export function findMember(p: Progress, uid: number): Member | undefined {
  return [...SQUAD.flatMap((c) => p.teams[c]), ...p.sanctuary].find((m) => m.uid === uid);
}

/** Evolves it in place. Returns the moves it learned and the new entry's bestiary change. */
export function evolve(p: Progress, uid: number): { from: string; to: string; learned: string[]; change: DexChange | null } | null {
  const m = findMember(p, uid);
  const to = m && evolutionOf(m);
  if (!m || !to) return null;
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
