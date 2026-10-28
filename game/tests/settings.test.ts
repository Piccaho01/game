import { beforeEach, describe, expect, it } from 'vitest';
import { CHAR_MS, HOLD_SCALE, party, setParty, setSound, setTextSpeed, soundOn, textSpeed } from '../src/settings';
import { newProgress } from '../src/engine/progress';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as unknown as Storage;
  setSound(true);
});

describe('text speed', () => {
  it('defaults to normal and round-trips slow and fast', () => {
    expect(textSpeed()).toBe('normal');
    setTextSpeed('slow');
    expect(textSpeed()).toBe('slow');
    setTextSpeed('fast');
    expect(textSpeed()).toBe('fast');
  });

  it('falls back to normal on junk', () => {
    store.set('patchlings.textSpeed', 'ludicrous');
    expect(textSpeed()).toBe('normal');
  });

  it('is slower letter by letter from fast to slow', () => {
    expect(CHAR_MS.slow).toBeGreaterThan(CHAR_MS.normal);
    expect(CHAR_MS.normal).toBeGreaterThan(CHAR_MS.fast);
    expect(HOLD_SCALE.slow).toBeGreaterThan(HOLD_SCALE.fast);
  });
});

describe('party', () => {
  it('is squad with nothing stored and no save', () => {
    expect(party()).toBe('squad');
    expect(party(null)).toBe('squad');
  });

  it('falls back to the save when nothing is stored', () => {
    const p = newProgress('furnaxol');
    expect(party(p)).toBe('squad');
    p.settings = { party: 'solo' };
    expect(party(p)).toBe('solo');
  });

  it('prefers the stored choice over the save', () => {
    const p = newProgress('furnaxol');
    p.settings = { party: 'solo' };
    store.set('patchlings.party', 'squad');
    expect(party(p)).toBe('squad');
  });

  it('setParty stores it and writes it into the save', () => {
    const p = newProgress('furnaxol');
    setParty('solo', p);
    expect(party()).toBe('solo');
    expect(p.settings?.party).toBe('solo');
  });

  it('setParty without a save only stores it', () => {
    setParty('solo');
    expect(party()).toBe('solo');
  });
});

describe('sound', () => {
  it('can be turned off and on', () => {
    expect(soundOn()).toBe(true);
    setSound(false);
    expect(soundOn()).toBe(false);
    setSound(true);
    expect(soundOn()).toBe(true);
  });
});
