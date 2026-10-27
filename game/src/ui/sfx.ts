/**
 * Sound effects, synthesised with Web Audio (no files to load): short chiptune blips in the DS
 * spirit. Browsers only allow sound after a tap, so the context starts on the first one.
 * `?mute` (or the saved setting) silences everything.
 */
export type Sfx =
  | 'tap' | 'back' | 'confirm' | 'error' | 'text'
  | 'hit' | 'super' | 'weak' | 'faint' | 'heal' | 'statUp' | 'statDown'
  | 'swish' | 'cutin' | 'banner'
  | 'beat' | 'perfect' | 'good' | 'miss' | 'sealed';

type Wave = OscillatorType;
/** One tone: wave, start and end pitch (Hz), length and start offset (s), volume. */
interface Tone { wave: Wave; from: number; to?: number; dur: number; at?: number; vol?: number }

const SOUNDS: Record<Sfx, Tone[] | 'noise'> = {
  tap: [{ wave: 'square', from: 880, to: 1320, dur: 0.05, vol: 0.12 }],
  back: [{ wave: 'square', from: 660, to: 440, dur: 0.07, vol: 0.1 }],
  confirm: [{ wave: 'square', from: 660, dur: 0.06, vol: 0.12 }, { wave: 'square', from: 990, dur: 0.09, at: 0.06, vol: 0.12 }],
  error: [{ wave: 'square', from: 200, to: 150, dur: 0.14, vol: 0.12 }],
  text: [{ wave: 'square', from: 1200, dur: 0.018, vol: 0.04 }],
  hit: 'noise',
  super: [{ wave: 'sawtooth', from: 300, to: 60, dur: 0.22, vol: 0.18 }, { wave: 'square', from: 1200, to: 400, dur: 0.12, vol: 0.08 }],
  weak: [{ wave: 'triangle', from: 260, to: 180, dur: 0.12, vol: 0.14 }],
  faint: [{ wave: 'square', from: 520, to: 70, dur: 0.6, vol: 0.12 }],
  heal: [0, 1, 2, 3].map((i) => ({ wave: 'triangle' as Wave, from: 523 * 2 ** (i * 4 / 12), dur: 0.09, at: i * 0.07, vol: 0.14 })),
  statUp: [{ wave: 'square', from: 400, to: 1200, dur: 0.25, vol: 0.08 }],
  statDown: [{ wave: 'square', from: 1100, to: 300, dur: 0.25, vol: 0.08 }],
  swish: [{ wave: 'sawtooth', from: 180, to: 900, dur: 0.12, vol: 0.06 }],
  cutin: [{ wave: 'sawtooth', from: 150, to: 1000, dur: 0.18, vol: 0.08 }, { wave: 'square', from: 784, dur: 0.08, at: 0.2, vol: 0.12 }, { wave: 'square', from: 1175, dur: 0.16, at: 0.28, vol: 0.12 }],
  banner: [{ wave: 'square', from: 523, dur: 0.07, vol: 0.1 }, { wave: 'square', from: 659, dur: 0.07, at: 0.07, vol: 0.1 }, { wave: 'square', from: 784, dur: 0.12, at: 0.14, vol: 0.1 }],
  beat: [{ wave: 'triangle', from: 440, dur: 0.05, vol: 0.08 }],
  perfect: [{ wave: 'square', from: 1046, dur: 0.05, vol: 0.12 }, { wave: 'square', from: 1568, dur: 0.08, at: 0.05, vol: 0.12 }],
  good: [{ wave: 'square', from: 784, dur: 0.07, vol: 0.1 }],
  miss: [{ wave: 'square', from: 180, to: 120, dur: 0.1, vol: 0.1 }],
  sealed: [0, 1, 2, 3, 4].map((i) => ({ wave: 'square' as Wave, from: [523, 659, 784, 1046, 1318][i], dur: i === 4 ? 0.3 : 0.08, at: i * 0.08, vol: 0.11 })),
};

let ctx: AudioContext | null = null;
let muted = (() => {
  try { return new URLSearchParams(location.search).has('mute') || localStorage.getItem('patchlings.mute') === '1'; } catch { return false; }
})();

/** Starts audio on the first tap (call once at boot). */
export function unlockAudio() {
  const start = () => {
    try {
      ctx ??= new AudioContext();
      void ctx.resume();
    } catch { /* no audio on this device */ }
  };
  window.addEventListener('pointerdown', start, { once: true });
  window.addEventListener('keydown', start, { once: true });
}

export function isMuted() { return muted; }

export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('patchlings.mute', m ? '1' : '0'); } catch { /* not saved */ }
}

export function sfx(name: Sfx) {
  if (muted || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const out = ctx.destination;
  const sound = SOUNDS[name];
  if (sound === 'noise') {
    // A hit: a burst of filtered noise with a falling thump under it.
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.22;
    src.connect(g).connect(out);
    src.start(now);
    play(ctx, { wave: 'square', from: 160, to: 50, dur: 0.12, vol: 0.14 }, now);
    return;
  }
  for (const t of sound) play(ctx, t, now);
}

function play(c: AudioContext, t: Tone, now: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  const start = now + (t.at ?? 0);
  o.type = t.wave;
  o.frequency.setValueAtTime(t.from, start);
  if (t.to) o.frequency.exponentialRampToValueAtTime(t.to, start + t.dur);
  g.gain.setValueAtTime(t.vol ?? 0.1, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + t.dur + 0.02);
}
