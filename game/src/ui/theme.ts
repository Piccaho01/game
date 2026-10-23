/**
 * The game's own look: "patched together", like PATCH himself. Cream plates, rust-red and faded
 * blue panels held on with stitches and tape, gunmetal frames, a CRT-blue glow for PATCH's
 * voice. Every screen takes its colours and text sizes from here.
 */
export const COLORS = {
  /** Outlines and the darkest shadow. */
  ink: 0x1c1b29,
  /** Dark panels and frames. */
  metal: 0x353849,
  metalLight: 0x4b4f66,
  /** Touch-screen background and its grid. */
  screen: 0x20223a,
  screenGrid: 0x2b2e4c,
  /** Light panels (dialogue, HP boxes, cards). */
  paper: 0xf3ead2,
  paperShade: 0xd8c9a2,
  stitch: 0xbca77a,
  /** Tape strips and labels. */
  tape: 0xe9d9a8,
  /** PATCH's CRT face. */
  crt: 0x4aa8ff,
  crtLight: 0xa6d8ff,
  rust: 0xc2502f,
  gold: 0xf2c14e,
  go: 0x2f9e7f,
  danger: 0xd94a3d,
  off: 0x55576a,
} as const;

/** Button tones by job, so every screen agrees on what a colour means. */
export const TONES = {
  /** Confirm, continue, move forward. */
  go: COLORS.go,
  /** The big action on a screen (FIGHT). */
  act: COLORS.rust,
  /** The leader's assist and PATCH things. */
  patch: 0x3a78c8,
  /** Seals and the bestiary. */
  seal: 0x7a52b8,
  /** Back, tabs, secondary choices. */
  neutral: COLORS.metalLight,
  /** Can't be used right now. */
  off: COLORS.off,
} as const;

/** CSS colour strings for text. */
export const TEXT_COLORS = {
  ink: '#1c1b29',
  inkSoft: '#5a5470',
  light: '#ffffff',
  dim: '#a8acc8',
  off: '#9a9cb0',
  crt: '#a6d8ff',
  gold: '#f2c14e',
  rust: '#c2502f',
  good: '#7ee0a8',
} as const;

/** Press Start 2P sizes (logical px). 8 is body text; 6 is the smallest that stays readable on a phone. */
export const TEXT_SIZE = { title: 16, heading: 10, body: 8, small: 6, tiny: 5 } as const;

export const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
export const hexToNum = (c: string) => parseInt(c.replace('#', ''), 16);

/** Mixes a colour toward white (amount > 0) or black (amount < 0); amount in -1..1. */
export function shade(color: number, amount: number) {
  const t = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const ch = (s: number) => Math.round(((color >> s) & 0xff) + (t - ((color >> s) & 0xff)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
