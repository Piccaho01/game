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
  /** hitBoost: x1.5 power if the user was hit earlier this battle (Severance). reveal: shows the foe's next move (Vigil Beam). */
  flags?: { contact?: boolean; kick?: boolean; bite?: boolean; charge?: boolean; ignoresProtect?: boolean; recoil?: number; critIfSlowed?: boolean; hitBoost?: boolean; reveal?: boolean };
  desc: string;
}

export interface AbilityData { name: string; desc: string }

/** Weather (Chapter 1): rain for now. Maps roll it (engine/weather.ts); battles and evolutions read it. */
export type Weather = 'rain';

/**
 * One way a species evolves (bible §7 'line shapes are free'): at a `level`, or when an `item` is
 * used on it from the bag; `weather`, `bond` and `flag` are extra conditions. A species with more
 * than one trigger branches.
 */
export interface EvoTrigger { to: string; level?: number; item?: string; weather?: Weather; bond?: 'strong' | 'steady'; flag?: string }

export interface SpeciesData {
  dex: number;
  name: string;
  types: TypeId[];
  ability: string;
  sprite?: string;
  base: Stats;
  learnset: [number, string][];
  evolves?: EvoTrigger | EvoTrigger[];
  /** A rare Patchling's bestiary quest (data/quests.json): its page stays incomplete until it's done. */
  quest?: string;
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

/** A species' evolution triggers as a list (the data allows one object or a list). */
export function evoTriggers(species: string): EvoTrigger[] {
  const e = SPECIES[species]?.evolves;
  return !e ? [] : Array.isArray(e) ? e : [e];
}
