import { SPECIES } from './data';
import { createBattler, movesAtLevel } from './battler';
import { CHARACTERS, SQUAD, type CharacterId, type Member, type Progress } from './progress';

/**
 * Experience and levels (bible §7, "Experience: shared, no grinding"): every Patchling on all four
 * teams gets the full experience from each battle, and those resting in sanctuary storage get half.
 * Medium-fast curve (level³); a foe is worth a fifth of its base stat total, times its level, over 5
 * (BW's own divisor; was 7 until the M5 balance pass, which made levelling too slow for the slice).
 */
export const MAX_LEVEL = 100;

export function xpForLevel(level: number) {
  return Math.min(level, MAX_LEVEL) ** 3;
}

export function xpOf(m: Member) {
  return m.xp ?? xpForLevel(m.level);
}

/** How far a Patchling is through its current level, 0..1. */
export function levelProgress(m: Member) {
  if (m.level >= MAX_LEVEL) return 1;
  const from = xpForLevel(m.level);
  return Math.max(0, Math.min(1, (xpOf(m) - from) / (xpForLevel(m.level + 1) - from)));
}

/** Experience for beating (or sealing) a foe. */
export function xpYield(species: string, level: number) {
  const b = SPECIES[species].base;
  const baseExp = Math.round((b.hp + b.atk + b.def + b.spa + b.spd + b.spe) / 5);
  return Math.max(1, Math.floor((baseExp * level) / 5));
}

export interface LevelUp {
  uid: number;
  /** Whose team it's on; null for the sanctuary. */
  owner: CharacterId | null;
  species: string;
  from: number;
  to: number;
  /** Moves it learned on the way. */
  learned: string[];
}

/** Gives a Patchling experience; it levels up as far as it reaches, keeping any damage it carries. */
export function gainXp(m: Member, amount: number): { from: number; to: number; learned: string[] } {
  const from = m.level;
  m.xp = xpOf(m) + amount;
  while (m.level < MAX_LEVEL && m.xp >= xpForLevel(m.level + 1)) m.level++;
  if (m.level !== from) {
    // A hurt Patchling keeps its damage, not its old HP number.
    if (m.hp !== undefined) {
      const grow = createBattler(m.species, m.level, undefined, m.bond).stats.hp - createBattler(m.species, from, undefined, m.bond).stats.hp;
      if (m.hp > 0) m.hp += grow;
    }
  }
  const before = new Set(movesAtLevel(m.species, from));
  const learned = m.level === from ? [] : movesAtLevel(m.species, m.level).filter((id) => !before.has(id));
  return { from, to: m.level, learned };
}

/** Shares a battle's experience: full to all four teams, half to the sanctuary. Returns every level-up. */
export function awardXp(p: Progress, amount: number): LevelUp[] {
  const ups: LevelUp[] = [];
  const give = (m: Member, n: number, owner: CharacterId | null) => {
    const r = gainXp(m, n);
    if (r.to !== r.from) ups.push({ uid: m.uid, owner, species: m.species, ...r });
  };
  for (const c of SQUAD) for (const m of p.teams[c]) give(m, amount, c);
  for (const m of p.sanctuary) give(m, Math.floor(amount / 2), null);
  return ups;
}

/** "Nolan's Zapail" / "Zapail in the sanctuary", for messages. */
export function whose(u: LevelUp) {
  const name = SPECIES[u.species].name;
  return u.owner ? `${CHARACTERS[u.owner].name}'s ${name}` : `${name} (sanctuary)`;
}
