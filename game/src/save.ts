import { parseProgress, type Progress } from './engine/progress';

/** Progress lives in the browser so it survives closing the tab (one save per device). */
const KEY = 'patchlings.save.v1';

/** The saved game, or null for a new one. */
export function loadProgress(): Progress | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseProgress(JSON.parse(raw)) : null;
  } catch {
    // Private mode or a corrupt save: start fresh rather than crash.
    return null;
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage full or blocked: the game still plays, it just won't remember.
  }
}

export function clearProgress() {
  try { localStorage.removeItem(KEY); } catch { /* nothing saved */ }
}
