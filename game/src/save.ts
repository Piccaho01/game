import { newProgress, parseProgress, type Progress } from './engine/progress';

/** Progress lives in the browser so it survives closing the tab (one save per device). */
const KEY = 'patchlings.save.v1';

export function loadProgress(starter: string): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? parseProgress(JSON.parse(raw)) : null;
    if (p) return p;
  } catch {
    // Private mode or a corrupt save: start fresh rather than crash.
  }
  return newProgress(starter);
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
