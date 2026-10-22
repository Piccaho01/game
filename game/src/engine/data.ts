import typesJson from '../data/types.json';
import movesJson from '../data/moves.json';
import abilitiesJson from '../data/abilities.json';
import patchlingsJson from '../data/patchlings.json';
import bestiaryJson from '../data/bestiary.json';

export type TypeId = 'fire' | 'water' | 'plant' | 'rock' | 'wind' | 'spark' | 'ice' | 'dark' | 'metal' | 'relic';
export type StatId = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type StageStat = Exclude<StatId, 'hp'>;
export type StatusId = 'brn' | 'par' | 'psn' | 'slp';
export type Stats = Record<StatId, number>;

export interface TypeData { name: string; color: string }

export type MoveEffect =
  | { kind: 'status'; status: StatusId; chance?: number; target: 'foe' | 'self' }
  | { kind: 'stat'; stats: Partial<Record<StageStat, number>>; chance?: number; target: 'foe' | 'self'; if?: { foeType?: TypeId } }
  | { kind: 'charge'; target: 'self' };

export interface MoveData {
  name: string;
  /** null = typeless (only the internal Struggle fallback). */
  type: TypeId | null;
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number | null;
  pp: number;
  priority?: number;
  critStage?: number;
  hits?: [number, number];
  effects?: MoveEffect[];
  onMiss?: MoveEffect[];
  flags?: { contact?: boolean; kick?: boolean; bite?: boolean; charge?: boolean; ignoresProtect?: boolean; recoil?: number };
  desc: string;
}

export interface AbilityData { name: string; desc: string }

export interface SpeciesData {
  dex: number;
  name: string;
  types: TypeId[];
  ability: string;
  sprite?: string;
  base: Stats;
  learnset: [number, string][];
  evolves?: { to: string; level: number };
}

export interface BestiaryEntry { sighted: string; tracked: string; studied: string; sealed: string; bonded: string }

export const TYPES = typesJson.types as Record<TypeId, TypeData>;
export const TYPE_CHART = typesJson.chart as Record<TypeId, Partial<Record<TypeId, number>>>;
export const ABILITIES = abilitiesJson.abilities as Record<string, AbilityData>;
export const SPECIES = patchlingsJson.patchlings as unknown as Record<string, SpeciesData>;
export const BESTIARY = bestiaryJson.entries as Record<string, BestiaryEntry>;

/** Used when a Patchling has no PP left in any move. Typeless; hurts the user. */
export const STRUGGLE_ID = 'struggle';
export const MOVES: Record<string, MoveData> = {
  ...(movesJson.moves as unknown as Record<string, MoveData>),
  [STRUGGLE_ID]: {
    name: 'Struggle', type: null, category: 'physical', power: 50, accuracy: null, pp: 1,
    flags: { contact: true, recoil: 0.25 }, desc: 'Used only when out of PP. Hurts the user.',
  },
};
