import { TYPE_CHART, type TypeId } from './data';

/** Multiplier for a move of `moveType` hitting a defender with `defender` types (dual types multiply). */
export function effectiveness(moveType: TypeId | null, defender: readonly TypeId[]): number {
  if (moveType === null) return 1;
  return defender.reduce((m, t) => m * (TYPE_CHART[moveType][t] ?? 1), 1);
}

export function effectivenessText(mult: number): string | null {
  if (mult === 0) return 'It had no effect...';
  if (mult > 1) return "It's super effective!";
  if (mult < 1) return "It's not very effective...";
  return null;
}
