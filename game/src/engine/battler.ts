import { MOVES, SPECIES, type StageStat, type Stats, type StatusId, type TypeId } from './data';

export interface MoveSlot { id: string; pp: number; maxPp: number }

export interface Battler {
  species: string;
  name: string;
  level: number;
  types: TypeId[];
  ability: string;
  stats: Stats;
  hp: number;
  moves: MoveSlot[];
  status: StatusId | null;
  sleepTurns: number;
  stages: Record<StageStat, number>;
  volatile: {
    /** Next Spark move deals double damage (Static Rub, Induction). */
    charged: boolean;
    /** Two-turn move waiting to fire. */
    chargingMove: string | null;
    /** Kiln Heart: next hit taken is reduced. */
    hardened: boolean;
    /** Turns this battler has been in battle (0 on its first turn). */
    turnsOut: number;
  };
}

/** Gen-3-style stat formula without IVs/EVs (bond boosts arrive with the seal in M3). */
export function calcStats(base: Stats, level: number): Stats {
  const other = (b: number) => Math.floor((2 * b * level) / 100) + 5;
  return {
    hp: Math.floor((2 * base.hp * level) / 100) + level + 10,
    atk: other(base.atk), def: other(base.def), spa: other(base.spa),
    spd: other(base.spd), spe: other(base.spe),
  };
}

/** The last four moves learned at or below `level`. */
export function movesAtLevel(speciesId: string, level: number): string[] {
  const learned = SPECIES[speciesId].learnset.filter(([lv]) => lv <= level).map(([, id]) => id);
  return [...new Set(learned)].slice(-4);
}

export function createBattler(speciesId: string, level: number, moveIds?: string[]): Battler {
  const sp = SPECIES[speciesId];
  if (!sp) throw new Error(`Unknown Patchling: ${speciesId}`);
  const stats = calcStats(sp.base, level);
  const ids = moveIds ?? movesAtLevel(speciesId, level);
  for (const id of ids) if (!MOVES[id]) throw new Error(`Unknown move: ${id}`);
  return {
    species: speciesId, name: sp.name, level, types: [...sp.types], ability: sp.ability, stats,
    hp: stats.hp,
    moves: ids.map((id) => ({ id, pp: MOVES[id].pp, maxPp: MOVES[id].pp })),
    status: null, sleepTurns: 0,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    volatile: { charged: false, chargingMove: null, hardened: false, turnsOut: 0 },
  };
}

export function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

export function effectiveStat(b: Battler, stat: StageStat, stage = b.stages[stat]): number {
  let v = b.stats[stat] * stageMultiplier(stage);
  if (stat === 'spe' && b.status === 'par') v *= 0.5;
  return Math.floor(v);
}
