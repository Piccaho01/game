import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { COLORS, TEXT_COLORS, TEXT_SIZE, shade } from './theme';
import { pixelText } from './text';

/**
 * The UI kit: every window, button and list is built from these, so a screen only lays things
 * out. Shapes are drawn on the logical pixel grid (stepped corners, 1px stitches) so the menus
 * read as pixel art next to the sprites.
 */

type G = Phaser.GameObjects.Graphics;

/** A filled rect with stepped (pixel) corners of radius r. */
export function pxRect(g: G, x: number, y: number, w: number, h: number, color: number, r = 2, alpha = 1) {
  g.fillStyle(color, alpha);
  if (r <= 0 || w < 2 * r || h < 2 * r) {
    g.fillRect(x, y, w, h);
    return g;
  }
  g.fillRect(x, y + r, w, h - 2 * r);
  for (let i = 0; i < r; i++) {
    const inset = r - i;
    g.fillRect(x + inset, y + i, w - 2 * inset, 1);
    g.fillRect(x + inset, y + h - 1 - i, w - 2 * inset, 1);
  }
  return g;
}

/** A dashed 1px line around a rect: the stitching that holds every panel together. */
export function stitches(g: G, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  g.fillStyle(color, alpha);
  for (let i = 2; i < w - 2; i += 4) {
    g.fillRect(x + i, y, 2, 1);
    g.fillRect(x + i, y + h - 1, 2, 1);
  }
  for (let i = 2; i < h - 2; i += 4) {
    g.fillRect(x, y + i, 1, 2);
    g.fillRect(x + w - 1, y + i, 1, 2);
  }
  return g;
}

export type PanelTone = 'paper' | 'metal';

/**
 * A window: ink outline, a 2px drop shade, stitched inside the edge. Paper panels carry text
 * (dialogue, HP, cards); metal panels frame things on dark screens.
 */
export function drawPanel(g: G, x: number, y: number, w: number, h: number, tone: PanelTone = 'paper') {
  const fill = tone === 'paper' ? COLORS.paper : COLORS.metal;
  const under = tone === 'paper' ? COLORS.paperShade : COLORS.ink;
  const stitch = tone === 'paper' ? COLORS.stitch : COLORS.metalLight;
  pxRect(g, x - 1, y - 1, w + 2, h + 4, COLORS.ink, 3);
  pxRect(g, x, y + 2, w, h, under, 2);
  pxRect(g, x, y, w, h, fill, 2);
  stitches(g, x + 3, y + 3, w - 6, h - 6, stitch);
  return g;
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, tone: PanelTone = 'paper') {
  return drawPanel(scene.add.graphics(), x, y, w, h, tone);
}

/** A strip of tape stuck across a panel's top edge, carrying a title (or a speaker's name). */
export function tapeLabel(scene: Phaser.Scene, x: number, y: number, text: string, color: number = COLORS.tape) {
  const c = scene.add.container(x, y);
  const t = pixelText(scene, 6, 3, text, { color: TEXT_COLORS.ink, size: TEXT_SIZE.small });
  const w = Math.ceil(t.width) + 12;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.ink, 0.35).fillRect(1, 2, w, 11);
  g.fillStyle(color).fillRect(0, 0, w, 11);
  g.fillStyle(shade(color, 0.4)).fillRect(0, 0, w, 1);
  // Torn ends.
  g.fillStyle(shade(color, -0.25));
  for (let i = 0; i < 11; i += 2) {
    g.fillRect(0, i, 1, 1);
    g.fillRect(w - 1, i + 1, 1, 1);
  }
  c.add([g, t]);
  return c;
}

/** A small coloured tag: types, status, "LEAD". */
export function chip(scene: Phaser.Scene, x: number, y: number, text: string, color: number) {
  const c = scene.add.container(x, y);
  const t = pixelText(scene, 4, 2, text.toUpperCase(), { color: TEXT_COLORS.light, size: TEXT_SIZE.tiny, shadow: '#00000080' });
  const w = Math.ceil(t.width) + 8;
  const g = scene.add.graphics();
  pxRect(g, -1, -1, w + 2, 11, COLORS.ink, 1);
  pxRect(g, 0, 0, w, 9, color, 1);
  g.fillStyle(shade(color, 0.3)).fillRect(1, 0, w - 2, 1);
  c.add([g, t]);
  c.setSize(w, 9);
  return c;
}

export interface ButtonOpts {
  /** Label text size. */
  size?: number;
  /** A second, smaller line under the label. */
  sub?: string;
  /** For tests: found by name in the scene's menu container. */
  name?: string;
  /** Marks the current pick: a gold frame instead of ink. */
  selected?: boolean;
}

/**
 * A chunky touch button centred on (x, y). Without onTap it is drawn switched off. It sinks 2px
 * while held, and fires on release.
 */
export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, color: number,
  onTap?: () => void, opts: ButtonOpts = {},
) {
  const c = scene.add.container(x, y);
  if (opts.name) c.setName(opts.name);
  const face = onTap ? color : COLORS.off;
  const left = -Math.floor(w / 2);
  const top = -Math.floor(h / 2);
  const g = scene.add.graphics();
  if (opts.selected) pxRect(g, left - 3, top - 3, w + 6, h + 8, COLORS.gold, 4);
  pxRect(g, left - 1, top - 1, w + 2, h + 4, COLORS.ink, 3);
  pxRect(g, left, top + 2, w, h, shade(face, -0.35), 2);
  pxRect(g, left, top, w, h, face, 2);
  // Light catches the top edge; big buttons get the stitched seam.
  g.fillStyle(shade(face, 0.35)).fillRect(left + 2, top + 1, w - 4, 1);
  if (h >= 22 && w >= 40) stitches(g, left + 3, top + 3, w - 6, h - 6, shade(face, 0.25), 0.7);
  c.add(g);
  const textY = opts.sub ? -5 : 0;
  c.add(pixelText(scene, 0, textY, label, { color: onTap ? TEXT_COLORS.light : TEXT_COLORS.off, size: opts.size ?? TEXT_SIZE.body, shadow: onTap ? '#00000090' : undefined }).setOrigin(0.5));
  if (opts.sub) c.add(pixelText(scene, 0, 9, opts.sub, { color: onTap ? '#f4f0e4' : TEXT_COLORS.off, size: TEXT_SIZE.small }).setOrigin(0.5));
  if (onTap) {
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => c.setY(y + 2));
    c.on('pointerout', () => c.setY(y));
    c.on('pointerup', () => { c.setY(y); onTap(); });
  }
  return c;
}

/** An empty slot in a list (a free team place): a dashed outline, nothing to tap. */
export function emptySlot(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const g = scene.add.graphics();
  stitches(g, x - Math.floor(w / 2), y - Math.floor(h / 2), w, h, COLORS.metalLight);
  return g;
}

/** A thin meter (HP, progress): ink frame, dark track, a fill with a highlight line. */
export class Meter {
  private g: G;
  constructor(scene: Phaser.Scene, private x: number, private y: number, private w: number, private h = 4) {
    this.g = scene.add.graphics();
  }

  get graphics() { return this.g; }

  draw(frac: number, color: number) {
    const { g, x, y, w, h } = this;
    const f = Math.max(0, Math.min(1, frac));
    g.clear();
    g.fillStyle(COLORS.ink).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(COLORS.metal).fillRect(x, y, w, h);
    const fw = f > 0 ? Math.max(1, Math.ceil(w * f)) : 0;
    if (fw) {
      g.fillStyle(color).fillRect(x, y, fw, h);
      g.fillStyle(shade(color, 0.45)).fillRect(x, y, fw, 1);
    }
  }
}

/**
 * The touch screen's backdrop: a dark board with a faint grid, like the back of PATCH's
 * screen. `y` is the top of the screen it fills.
 */
export function screenBackdrop(scene: Phaser.Scene, y = SCREEN_H) {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.screen).fillRect(0, y, SCREEN_W, SCREEN_H);
  g.fillStyle(COLORS.screenGrid);
  for (let gy = 8; gy < SCREEN_H; gy += 16) g.fillRect(0, y + gy, SCREEN_W, 1);
  for (let gx = 8; gx < SCREEN_W; gx += 16) g.fillRect(gx, y, 1, SCREEN_H);
  return g;
}

/** The bar between the two screens: a gunmetal hinge, bolted on. */
export function hinge(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(10);
  const y = SCREEN_H - 2;
  g.fillStyle(COLORS.ink).fillRect(0, y, SCREEN_W, 4);
  g.fillStyle(COLORS.metal).fillRect(0, y + 1, SCREEN_W, 2);
  for (const bx of [6, SCREEN_W - 8]) {
    g.fillStyle(COLORS.metalLight).fillRect(bx, y + 1, 2, 2);
  }
  return g;
}

/** A plain dark top screen for menus, with a soft vignette band at the top. */
export function menuBackdrop(scene: Phaser.Scene, color: number = COLORS.screen) {
  const g = scene.add.graphics();
  g.fillStyle(color).fillRect(0, 0, SCREEN_W, SCREEN_H);
  g.fillStyle(shade(color, 0.06));
  for (let y = 0; y < SCREEN_H; y += 4) g.fillRect(0, y, SCREEN_W, 1);
  return g;
}

/**
 * Where a named button in `container` is on the page (CSS px), so e2e tests can tap it like a
 * finger would.
 */
export function buttonPagePoint(scene: Phaser.Scene, container: Phaser.GameObjects.Container, name: string) {
  const obj = container.list.find((o) => (o as Phaser.GameObjects.Container).name === name) as Phaser.GameObjects.Container | undefined;
  if (!obj) return null;
  const rect = scene.game.canvas.getBoundingClientRect();
  const sx = rect.width / scene.game.canvas.width;
  const sy = rect.height / scene.game.canvas.height;
  return { x: rect.left + (obj.x + container.x) * ZOOM * sx, y: rect.top + (obj.y + container.y) * ZOOM * sy };
}

/**
 * PATCH's CRT head as a small portrait (bible §6): cream casing, blue screen with dot eyes and a
 * flat-line mouth, antenna with a red light. Centred on (x, y); about 44x40.
 */
export function patchPortrait(scene: Phaser.Scene, x: number, y: number) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  // Antenna and its blinking light.
  g.fillStyle(COLORS.ink).fillRect(5, -26, 1, 8);
  // Casing, with a strip of tape across one corner.
  pxRect(g, -23, -19, 46, 38, COLORS.ink, 3);
  pxRect(g, -22, -18, 44, 36, COLORS.paper, 2);
  g.fillStyle(COLORS.paperShade).fillRect(-20, 13, 40, 3);
  g.fillStyle(COLORS.tape).fillRect(13, -18, 9, 4).fillRect(16, -14, 6, 2);
  // Screen.
  pxRect(g, -18, -14, 36, 26, COLORS.ink, 2);
  pxRect(g, -17, -13, 34, 24, 0x1d4f9a, 2);
  g.fillStyle(0x2a62b8);
  for (let sy = -12; sy < 10; sy += 2) g.fillRect(-16, sy, 32, 1);
  // Face: dot eyes, flat-line mouth.
  g.fillStyle(COLORS.crtLight).fillRect(-8, -5, 3, 4).fillRect(5, -5, 3, 4).fillRect(-6, 4, 12, 1);
  // Bolts.
  g.fillStyle(COLORS.stitch).fillRect(-20, -16, 1, 1).fillRect(19, 14, 1, 1).fillRect(-20, 14, 1, 1);
  const light = scene.add.rectangle(5, -27, 3, 3, 0xe8483a);
  scene.tweens.add({ targets: light, alpha: 0.25, duration: 500, yoyo: true, repeat: -1, hold: 400 });
  c.add([g, light]);
  return c;
}

export type PadDir = 'up' | 'down' | 'left' | 'right';

/**
 * A touch D-pad centred on (x, y), `size` px across. Hold an arm to walk; sliding the thumb to
 * another arm turns. `onChange` gets the held direction, or null when let go.
 */
export function dpad(scene: Phaser.Scene, x: number, y: number, size: number, onChange: (d: PadDir | null) => void) {
  const c = scene.add.container(x, y);
  const arm = Math.floor(size / 3);
  const half = Math.floor(size / 2);
  const g = scene.add.graphics();
  const drawPad = (held: PadDir | null) => {
    g.clear();
    // The cross: ink outline, a shade below, metal face.
    for (const [rx, ry, rw, rh] of [[-half, -Math.floor(arm / 2), size, arm], [-Math.floor(arm / 2), -half, arm, size]]) {
      pxRect(g, rx - 1, ry - 1, rw + 2, rh + 4, COLORS.ink, 3);
      pxRect(g, rx, ry + 2, rw, rh, shade(COLORS.metalLight, -0.4), 2);
    }
    for (const [rx, ry, rw, rh] of [[-half, -Math.floor(arm / 2), size, arm], [-Math.floor(arm / 2), -half, arm, size]]) {
      pxRect(g, rx, ry, rw, rh, COLORS.metalLight, 2);
    }
    // Arrows; the held arm lights up.
    const arrows: Record<PadDir, [number, number]> = { up: [0, -half + 9], down: [0, half - 9], left: [-half + 9, 0], right: [half - 9, 0] };
    for (const [d, [ax, ay]] of Object.entries(arrows) as [PadDir, [number, number]][]) {
      g.fillStyle(d === held ? COLORS.gold : COLORS.paper);
      for (let i = 0; i < 4; i++) {
        if (d === 'up') g.fillRect(ax - i, ay - 2 + i, 2 * i + 1, 1);
        if (d === 'down') g.fillRect(ax - i, ay + 2 - i, 2 * i + 1, 1);
        if (d === 'left') g.fillRect(ax - 2 + i, ay - i, 1, 2 * i + 1);
        if (d === 'right') g.fillRect(ax + 2 - i, ay - i, 1, 2 * i + 1);
      }
    }
    g.fillStyle(shade(COLORS.metalLight, -0.2)).fillRect(-3, -3, 6, 6);
  };
  drawPad(null);
  c.add(g);
  let held: PadDir | null = null;
  const set = (d: PadDir | null) => {
    if (d === held) return;
    held = d;
    drawPad(d);
    onChange(d);
  };
  const dirAt = (p: Phaser.Input.Pointer) => {
    const dx = p.worldX - c.x - (c.parentContainer?.x ?? 0);
    const dy = p.worldY - c.y - (c.parentContainer?.y ?? 0);
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return held;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  };
  c.setSize(size + 12, size + 12).setInteractive();
  c.on('pointerdown', (p: Phaser.Input.Pointer) => set(dirAt(p)));
  c.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) set(dirAt(p)); });
  c.on('pointerup', () => set(null));
  c.on('pointerout', () => set(null));
  return c;
}
