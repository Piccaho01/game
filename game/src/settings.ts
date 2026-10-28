import { partyMode, type Progress } from './engine/progress';
import { isMuted, setMuted } from './ui/sfx';

/**
 * Player settings (M6): sound, text speed and squad/solo. They belong to the device, not the save,
 * so the title screen can change them before there is a game, and a new game keeps them.
 * Squad/solo is also written into the save (`progress.settings.party`), where older builds kept it.
 */
export type TextSpeed = 'slow' | 'normal' | 'fast';
export type Party = 'squad' | 'solo';

/** Milliseconds per letter in the text box. */
export const CHAR_MS: Record<TextSpeed, number> = { slow: 34, normal: 18, fast: 6 };
/** How long a line that moves on by itself stays up, as a share of the normal hold. */
export const HOLD_SCALE: Record<TextSpeed, number> = { slow: 1.4, normal: 1, fast: 0.6 };

const SPEED_KEY = 'patchlings.textSpeed';
const PARTY_KEY = 'patchlings.party';

function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* not saved */ }
}

export function textSpeed(): TextSpeed {
  const v = read(SPEED_KEY);
  return v === 'slow' || v === 'fast' ? v : 'normal';
}
export function setTextSpeed(s: TextSpeed) { write(SPEED_KEY, s); }

/** Squad (all four walk the map) or solo; a save from before this setting moved keeps its own choice. */
export function party(p?: Progress | null): Party {
  const v = read(PARTY_KEY);
  if (v === 'squad' || v === 'solo') return v;
  return p ? partyMode(p) : 'squad';
}
export function setParty(m: Party, p?: Progress | null) {
  write(PARTY_KEY, m);
  if (p) p.settings = { ...p.settings, party: m };
}

export function soundOn() { return !isMuted(); }
export function setSound(on: boolean) { setMuted(!on); }
