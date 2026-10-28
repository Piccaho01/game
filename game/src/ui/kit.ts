import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { COLORS, TEXT_COLORS, TEXT_SIZE, shade } from './theme';
import { pixelText } from './text';
import { sfx } from './sfx';

/**
 * The UI kit ("Workshop A+"): every window, button and list is built from these, so a screen only
 * lays things out. Sprites and backdrops are pixel art; the UI is drawn crisp at the full screen
 * resolution (smooth rounded shapes, hairline outlines), like the owner's approved mockup.
 */

type G = Phaser.GameObjects.Graphics;

/** A filled rounded rect (smooth corners of radius about r). */
export function pxRect(g: G, x: number, y: number, w: number, h: number, color: number, r = 2, alpha = 1) {
  g.fillStyle(color, alpha);
  const rr = Math.min(r * 1.25, w / 2, h / 2);
  if (rr <= 0.5) g.fillRect(x, y, w, h);
  else g.fillRoundedRect(x, y, w, h, rr);
  return g;
}

/** A dashed hairline around a rect (free slots, the seal pad). */
export function stitches(g: G, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  g.fillStyle(color, alpha * 0.8);
  const t = 0.67;
  for (let i = 3; i < w - 3; i += 5) {
    g.fillRect(x + i, y, 2.5, t);
    g.fillRect(x + i, y + h - t, 2.5, t);
  }
  for (let i = 3; i < h - 3; i += 5) {
    g.fillRect(x, y + i, t, 2.5);
    g.fillRect(x + w - t, y + i, t, 2.5);
  }
  return g;
}

/**
 * A card: a soft drop shadow, a hairline ink outline, the fill, and a faint light edge along the
 * top. The building block of panels, buttons and cards.
 */
export function card(g: G, x: number, y: number, w: number, h: number, fill: number, r = 5, opts: { lip?: number; shadow?: boolean; outline?: number } = {}) {
  if (opts.shadow !== false) g.fillStyle(0x000000, 0.28).fillRoundedRect(x, y + 1.5, w, h + (opts.lip ?? 0), r);
  g.fillStyle(opts.outline ?? COLORS.ink).fillRoundedRect(x - 0.67, y - 0.67, w + 1.33, h + 1.33 + (opts.lip ?? 0), r + 0.6);
  if (opts.lip) g.fillStyle(shade(fill, -0.32)).fillRoundedRect(x, y, w, h + opts.lip, r);
  g.fillStyle(fill).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0xffffff, 0.14).fillRoundedRect(x + 1, y + 0.67, w - 2, Math.min(h / 2, 8), { tl: r - 1, tr: r - 1, bl: 0, br: 0 });
  return g;
}

export type PanelTone = 'paper' | 'metal';

/**
 * A window: ink outline, a 2px drop shade, stitched inside the edge. Paper panels carry text
 * (dialogue, HP, cards); metal panels frame things on dark screens.
 */
export function drawPanel(g: G, x: number, y: number, w: number, h: number, tone: PanelTone = 'paper') {
  const fill = tone === 'paper' ? 0xf8f1de : COLORS.metal;
  card(g, x, y, w, h, fill, 6, { lip: tone === 'paper' ? 1.5 : 0 });
  return g;
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, tone: PanelTone = 'paper') {
  return drawPanel(scene.add.graphics(), x, y, w, h, tone);
}

/**
 * A label on a panel's top edge: a title, or a speaker's name. A dark pill with a rust tick (the
 * default) or a pill in `color`.
 */
export function tapeLabel(scene: Phaser.Scene, x: number, y: number, text: string, color: number = COLORS.ink) {
  const c = scene.add.container(x, y);
  const dark = color === COLORS.ink || color === COLORS.tape;
  const fill = dark ? COLORS.ink : color;
  const t = pixelText(scene, 9, 2.5, text, { color: dark ? '#f8f1de' : TEXT_COLORS.light, size: TEXT_SIZE.small, display: true });
  const w = Math.ceil(t.width) + 14;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.25).fillRoundedRect(0, 1.5, w, 11, 5.5);
  g.fillStyle(fill).fillRoundedRect(0, 0, w, 11, 5.5);
  g.fillStyle(dark ? COLORS.rust : 0xffffff, dark ? 1 : 0.5).fillRoundedRect(4, 3.5, 2.5, 4, 1);
  c.add([g, t]);
  return c;
}

/** A small coloured tag: types, status, "LEAD". */
export function chip(scene: Phaser.Scene, x: number, y: number, text: string, color: number) {
  const c = scene.add.container(x, y);
  const t = pixelText(scene, 4, 2, text.toUpperCase(), { color: TEXT_COLORS.light, size: TEXT_SIZE.tiny, display: true });
  const w = Math.ceil(t.width) + 8;
  const g = scene.add.graphics();
  g.fillStyle(color).fillRoundedRect(0, 0, w, 9, 3);
  g.fillStyle(0xffffff, 0.18).fillRoundedRect(0.67, 0.5, w - 1.33, 3.5, { tl: 2.5, tr: 2.5, bl: 0, br: 0 });
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
 * A touch button centred on (x, y): a rounded card with a lip, the label in the display font and
 * an optional hint under it in the body font. Without onTap it is drawn switched off. It sinks
 * while held and pops back on release (with a tap sound); a selected button wears a gold ring.
 */
export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, color: number,
  onTap?: () => void, opts: ButtonOpts = {},
) {
  const c = scene.add.container(x, y);
  if (opts.name) c.setName(opts.name);
  const face = onTap ? color : COLORS.off;
  const left = -w / 2;
  const top = -h / 2;
  const r = Math.min(6, h / 2.6);
  const g = scene.add.graphics();
  if (opts.selected) {
    g.fillStyle(COLORS.gold).fillRoundedRect(left - 2.5, top - 2.5, w + 5, h + 7, r + 2.5);
  }
  card(g, left, top, w, h - 2, face, r, { lip: 2.5, shadow: !opts.selected });
  c.add(g);
  const textY = opts.sub ? -5 : -1;
  const size = opts.size ?? (w < 70 ? TEXT_SIZE.small : TEXT_SIZE.body);
  c.add(pixelText(scene, 0, textY, label, { color: onTap ? TEXT_COLORS.light : TEXT_COLORS.off, size, shadow: onTap ? '#00000070' : undefined, display: true }).setOrigin(0.5));
  if (opts.sub) c.add(pixelText(scene, 0, 6, opts.sub, { color: onTap ? '#f4f0e4' : TEXT_COLORS.off, size: TEXT_SIZE.small }).setOrigin(0.5));
  if (onTap) {
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { c.setY(y + 1.5); c.setScale(0.97); });
    c.on('pointerout', () => { c.setY(y); c.setScale(1); });
    c.on('pointerup', () => {
      c.setY(y);
      c.setScale(1);
      scene.tweens.add({ targets: c, scale: { from: 1.05, to: 1 }, duration: 140, ease: 'Back.easeOut' });
      sfx('tap');
      onTap();
    });
  }
  return c;
}

/** An empty slot in a list (a free team place): a dashed outline, nothing to tap. */
export function emptySlot(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 0.035).fillRoundedRect(x - w / 2, y - h / 2, w, h, 5);
  stitches(g, x - w / 2, y - h / 2, w, h, COLORS.metalLight);
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
    g.fillStyle(COLORS.ink).fillRoundedRect(x - 1, y - 1, w + 2, h + 2, (h + 2) / 2);
    g.fillStyle(0x2a2c3e).fillRoundedRect(x, y, w, h, h / 2);
    const fw = f > 0 ? Math.max(h, w * f) : 0;
    if (fw) {
      g.fillStyle(color).fillRoundedRect(x, y, fw, h, h / 2);
      g.fillStyle(0xffffff, 0.3).fillRoundedRect(x + 1, y + 0.4, fw - 2, Math.max(0.8, h / 3), h / 4);
    }
  }
}

/**
 * The touch screen's backdrop: a dark board with a faint grid, like the back of PATCH's
 * screen. `y` is the top of the screen it fills.
 */
export function screenBackdrop(scene: Phaser.Scene, y = SCREEN_H) {
  const g = scene.add.graphics();
  g.fillStyle(0x1e2036).fillRect(0, y, SCREEN_W, SCREEN_H);
  g.fillStyle(0x2c2f4e);
  for (let gy = 6; gy < SCREEN_H; gy += 10) {
    for (let gx = (gy / 10) % 2 ? 6 : 1; gx < SCREEN_W; gx += 10) g.fillCircle(gx, y + gy, 0.6);
  }
  return g;
}

/** The bar between the two screens: a gunmetal hinge, bolted on. */
export function hinge(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(10);
  const y = SCREEN_H - 1.5;
  g.fillStyle(0x0b0c16).fillRect(0, y, SCREEN_W, 3);
  g.fillStyle(0x353849).fillRect(0, y + 0.67, SCREEN_W, 1);
  return g;
}

/** A plain dark top screen for menus, with a soft vignette band at the top. */
export function menuBackdrop(scene: Phaser.Scene, color: number = 0x171828) {
  const g = scene.add.graphics();
  g.fillStyle(color).fillRect(0, 0, SCREEN_W, SCREEN_H);
  g.fillStyle(0xffffff, 0.025);
  for (let i = -SCREEN_H; i < SCREEN_W; i += 14) g.fillTriangle(i, SCREEN_H, i + 6, SCREEN_H, i + 6 + SCREEN_H, 0).fillTriangle(i, SCREEN_H, i + 6 + SCREEN_H, 0, i + SCREEN_H, 0);
  return g;
}

/**
 * Segmented tabs centred on (x, y): a dark track with the active tab as a raised pill. Each tab is
 * a named container (`tab-<id>`) so tests can tap it.
 */
export function tabs<T extends string>(scene: Phaser.Scene, x: number, y: number, w: number, items: { id: T; label: string }[], active: T, onPick: (id: T) => void, color: number = COLORS.rust) {
  const out: Phaser.GameObjects.GameObject[] = [];
  const h = 20;
  const track = scene.add.graphics();
  track.fillStyle(0x0b0c16, 0.85).fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
  track.lineStyle(0.67, 0x3a3d5c).strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
  out.push(track);
  const tw = (w - 4) / items.length;
  items.forEach((it, i) => {
    const cx = x - w / 2 + 2 + tw * i + tw / 2;
    const c = scene.add.container(cx, y).setName(`tab-${it.id}`);
    const on = it.id === active;
    if (on) {
      const g = scene.add.graphics();
      g.fillStyle(0x000000, 0.3).fillRoundedRect(-tw / 2, -h / 2 + 2 + 1, tw, h - 4, (h - 4) / 2);
      g.fillStyle(color).fillRoundedRect(-tw / 2, -h / 2 + 2, tw, h - 4, (h - 4) / 2);
      g.fillStyle(0xffffff, 0.18).fillRoundedRect(-tw / 2 + 2, -h / 2 + 2.5, tw - 4, 4, 2);
      c.add(g);
    }
    c.add(pixelText(scene, 0, -0.5, it.label, { color: on ? TEXT_COLORS.light : '#9a9cc0', size: TEXT_SIZE.small, display: true }).setOrigin(0.5));
    c.setSize(tw, h).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => { if (!on) { sfx('tap'); onPick(it.id); } });
    out.push(c);
  });
  return out;
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
 * The isometric D-pad: four arms on the diagonals, the way the leader walks on the isometric map.
 * Up-right is the grid's 'up' (-y), down-right 'right' (+x), down-left 'down' (+y), up-left
 * 'left' (-x). Hold to walk; sliding the thumb turns; `onChange` gets null when let go.
 */
export function isoPad(scene: Phaser.Scene, x: number, y: number, size: number, onChange: (d: PadDir | null) => void) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const r = Math.floor(size * 0.24);
  const off = Math.floor(size * 0.26);
  const arms: Record<PadDir, [number, number]> = { up: [off, -off], right: [off, off], down: [-off, off], left: [-off, -off] };
  /** A diamond (a square on its corner) of radius rr centred on (cx, cy). */
  const diamond = (cx: number, cy: number, rr: number, col: number, dy = 0, alpha = 1) => {
    g.fillStyle(col, alpha).fillPoints([{ x: cx, y: cy - rr + dy }, { x: cx + rr, y: cy + dy }, { x: cx, y: cy + rr + dy }, { x: cx - rr, y: cy + dy }], true);
  };
  const drawPad = (held: PadDir | null) => {
    g.clear();
    // A soft round base under the four arms.
    g.fillStyle(0x000000, 0.25).fillCircle(0, 2, off + r + 4);
    g.fillStyle(0x2a2d48).fillCircle(0, 0, off + r + 4);
    g.lineStyle(0.67, 0x3d4166).strokeCircle(0, 0, off + r + 4);
    diamond(0, 0, r * 0.7, 0x1a1c30);
    for (const [d, [ax, ay]] of Object.entries(arms) as [PadDir, [number, number]][]) {
      const on = d === held;
      diamond(ax, ay, r + 0.8, COLORS.ink, on ? 1 : 2.5);
      diamond(ax, ay, r, shade(0x5a5f80, -0.35), on ? 1 : 2);
      diamond(ax, ay, r, on ? COLORS.rust : 0x5a5f80, on ? 1 : 0);
      diamond(ax, ay - r * 0.35, r * 0.45, 0xffffff, on ? 1 : 0, 0.12);
      // An arrow pointing out along the diagonal.
      const sx = Math.sign(ax), sy = Math.sign(ay);
      const tx = ax + sx * r * 0.35, ty = ay + sy * r * 0.35 + (on ? 1 : 0);
      g.fillStyle(on ? 0xffffff : 0xd8d2bd).fillTriangle(tx + sx * 3.5, ty + sy * 3.5, tx - sx * 2.5, ty + sy * 3.5, tx + sx * 3.5, ty - sy * 2.5);
    }
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
  const dirAt = (p: Phaser.Input.Pointer): PadDir | null => {
    const dx = p.worldX - c.x - (c.parentContainer?.x ?? 0);
    const dy = p.worldY - c.y - (c.parentContainer?.y ?? 0);
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return held;
    return dx >= 0 ? (dy < 0 ? 'up' : 'right') : (dy < 0 ? 'left' : 'down');
  };
  c.setSize(size + 12, size + 12).setInteractive();
  c.on('pointerdown', (p: Phaser.Input.Pointer) => set(dirAt(p)));
  c.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) set(dirAt(p)); });
  c.on('pointerup', () => set(null));
  c.on('pointerout', () => set(null));
  return c;
}

export interface RowOpts {
  name?: string;
  title: string;
  sub?: string;
  /** Text on the right edge (a level, PP, points). */
  right?: string;
  color: number;
  /** On the left: a whole sprite (a friend's walk frame, a Patchling), or a short text badge. */
  icon?: { key: string; frame?: number | string; trainer?: boolean; silhouette?: boolean } | { text: string };
  /** A thin bar under the title (HP, progress). */
  meter?: { frac: number; color: number };
  selected?: boolean;
  onTap?: () => void;
  /** Drawn in full colour though it has no tap (an info card). */
  passive?: boolean;
  /** Title size, when the default (by width) is too big for long names. */
  titleSize?: number;
}

/**
 * A list row centred on (x, y): an icon box on the left (a face, a Patchling, a type), the title in
 * the display font, a hint or a bar under it, and text on the right. Rows are the menus' main
 * building block (picks, teams, moves, wings).
 */
export function listRow(scene: Phaser.Scene, x: number, y: number, w: number, h: number, o: RowOpts) {
  const c = scene.add.container(x, y);
  if (o.name) c.setName(o.name);
  const on = !!o.onTap || !!o.passive;
  const face = on ? o.color : COLORS.off;
  const left = -w / 2;
  const top = -h / 2;
  const r = Math.min(6, h / 3);
  const g = scene.add.graphics();
  if (o.selected) g.fillStyle(COLORS.gold).fillRoundedRect(left - 2.5, top - 2.5, w + 5, h + 6, r + 2.5);
  card(g, left, top, w, h - 1.5, face, r, { lip: 2, shadow: !o.selected });
  c.add(g);
  let tx = left + 7;
  if (o.icon && 'text' in o.icon) {
    // A text badge (a move's type) in a small box.
    const box = h - 7;
    const bx = left + 3.5;
    const by = top + 2.5;
    const ib = scene.add.graphics();
    ib.fillStyle(shade(face, -0.3)).fillRoundedRect(bx, by, box, box, r - 1.5);
    ib.fillStyle(0x000000, 0.15).fillRoundedRect(bx, by + box - 3, box, 3, { tl: 0, tr: 0, bl: r - 1.5, br: r - 1.5 });
    c.add([ib, pixelText(scene, bx + box / 2, by + box / 2, o.icon.text, { color: TEXT_COLORS.light, size: TEXT_SIZE.small, display: true }).setOrigin(0.5)]);
    tx = bx + box + 6;
  } else if (o.icon && scene.textures.exists(o.icon.key)) {
    // The whole sprite standing in the row (it may poke above the top edge), with a soft drop
    // shadow behind it and a contact shadow at its feet.
    const frame = o.icon.frame ?? firstFrame(scene, o.icon.key);
    const b = spriteBounds(scene, o.icon.key, frame);
    const target = o.icon.trainer ? h + 3 : h - 1;
    const scale = Math.min(target / b.h, (h * 1.25) / b.w);
    const feetY = top + h - 4.5;
    const cx = left + 6 + (b.w * scale) / 2;
    const ox = (b.x + b.w / 2) / b.fw;
    const oy = (b.y + b.h) / b.fh;
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.3).fillEllipse(cx, feetY, b.w * scale * 0.95, Math.max(3, h * 0.16));
    shadow.fillStyle(0x000000, 0.18).fillEllipse(cx, feetY, b.w * scale * 1.3, Math.max(4, h * 0.24));
    const drop = scene.add.image(cx + 1.5, feetY + 1, o.icon.key, frame).setOrigin(ox, oy).setScale(scale).setTintFill(0x000000).setAlpha(0.3);
    const img = scene.add.image(cx, feetY, o.icon.key, frame).setOrigin(ox, oy).setScale(scale);
    if (o.icon.silhouette) img.setTintFill(0x14141e);
    else if (!on) img.setTint(0x8a8ca0);
    c.add([shadow, drop, img]);
    tx = cx + (b.w * scale) / 2 + 6;
  }
  const hasLower = !!(o.sub || o.meter);
  const title = pixelText(scene, tx, hasLower ? -7.5 : -4, o.title, { color: on ? TEXT_COLORS.light : TEXT_COLORS.off, size: o.titleSize ?? (w < 110 ? TEXT_SIZE.small : TEXT_SIZE.body), shadow: on ? '#00000060' : undefined, display: true });
  c.add(title);
  if (o.sub) c.add(pixelText(scene, tx, o.meter ? 4.5 : 1.5, o.sub, { color: on ? '#f4f0e4' : TEXT_COLORS.off, size: TEXT_SIZE.small }));
  // The right-hand text (a level) sits by the title; when a long title would run into it, it drops
  // to the meter's line and the meter makes room.
  let rightLow = false;
  let right: Phaser.GameObjects.Text | null = null;
  if (o.right) {
    right = pixelText(scene, -left - 7, hasLower ? -7 : -4, o.right, { color: on ? '#f4f0e4' : TEXT_COLORS.off, size: TEXT_SIZE.small, display: true }).setOrigin(1, 0);
    c.add(right);
    if (title.width > right.x - right.width - 3 - tx) {
      if (o.meter) { rightLow = true; right.setOrigin(1, 0.5).setY(7); }
      else if (!o.sub) { title.setY(-6); right.setOrigin(1, 0.5).setY(5.5); }   // a count drops to the corner
      else title.setFontSize(`${TEXT_SIZE.small}px`);
    }
  }
  if (o.meter) {
    const mw = w / 2 - 8 - tx - (rightLow && right ? right.width + 4 : 0);
    const my = rightLow ? 5.5 : 2;
    const mg = scene.add.graphics();
    mg.fillStyle(0x000000, 0.35).fillRoundedRect(tx, my, mw, 3, 1.5);
    const f = Math.max(0, Math.min(1, o.meter.frac));
    if (f > 0) mg.fillStyle(o.meter.color).fillRoundedRect(tx, my, Math.max(3, mw * f), 3, 1.5);
    c.add(mg);
  }
  if (o.onTap) {
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { c.setY(y + 1.5); c.setScale(0.98); });
    c.on('pointerout', () => { c.setY(y); c.setScale(1); });
    c.on('pointerup', () => {
      c.setY(y);
      c.setScale(1);
      scene.tweens.add({ targets: c, scale: { from: 1.04, to: 1 }, duration: 140, ease: 'Back.easeOut' });
      sfx('tap');
      o.onTap!();
    });
  }
  return c;
}

/** A small heading over a group on the touch screen. */
export function sectionLabel(scene: Phaser.Scene, x: number, y: number, text: string) {
  return pixelText(scene, x, y, text.toUpperCase(), { color: '#8f93bd', size: TEXT_SIZE.tiny, display: true }).setOrigin(0.5, 0);
}

/** A friend standing in a row: their whole walk sprite, facing the viewer. */
export function faceIcon(walkTexture: string) {
  return { key: walkTexture, frame: 0, trainer: true };
}

/** A Patchling standing in a row: its whole front sprite (a black silhouette if not seen yet). */
export function monIcon(frontTexture: string, silhouette = false) {
  return { key: frontTexture, silhouette };
}

/** An animated sprite's first frame (pxl atlases name frames <name>_<n>); undefined for a plain image. */
export function firstFrame(scene: Phaser.Scene, key: string): string | undefined {
  const names = scene.textures.get(key).getFrameNames();
  if (names.length < 2) return undefined;
  return [...names].sort((a, b) => Number(a.split('_').pop()) - Number(b.split('_').pop()))[0];
}

const boundsCache = new Map<string, { x: number; y: number; w: number; h: number; fw: number; fh: number }>();

/** The opaque part of a texture frame (cached), so a sprite can be sized by its body, not its canvas. */
export function spriteBounds(scene: Phaser.Scene, key: string, frame?: string | number) {
  const id = `${key}#${frame ?? ''}`;
  const hit = boundsCache.get(id);
  if (hit) return hit;
  const f = scene.textures.getFrame(key, frame);
  const fw = f.cutWidth, fh = f.cutHeight;
  let out = { x: 0, y: 0, w: fw, h: fh, fw, fh };
  try {
    const cv = document.createElement('canvas');
    cv.width = fw;
    cv.height = fh;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, fw, fh, 0, 0, fw, fh);
    const d = ctx.getImageData(0, 0, fw, fh).data;
    let x0 = fw, y0 = fh, x1 = -1, y1 = -1;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        if (d[(y * fw + x) * 4 + 3] > 20) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 >= 0) out = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, fw, fh };
  } catch { /* unreadable texture: use the whole frame */ }
  boundsCache.set(id, out);
  return out;
}

/** A big round button (A): a disc with a lip, the letter in the middle. */
export function roundButton(scene: Phaser.Scene, x: number, y: number, radius: number, label: string, color: number, onTap: () => void, name: string) {
  const c = scene.add.container(x, y).setName(name);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.3).fillCircle(0, 3, radius + 1);
  g.fillStyle(COLORS.ink).fillCircle(0, 1.5, radius + 0.7);
  g.fillStyle(shade(color, -0.35)).fillCircle(0, 2.5, radius);
  g.fillStyle(color).fillCircle(0, 0, radius);
  g.fillStyle(0xffffff, 0.16).fillEllipse(0, -radius * 0.45, radius * 1.3, radius * 0.7);
  c.add([g, pixelText(scene, 0, -1, label, { color: TEXT_COLORS.light, size: TEXT_SIZE.title, shadow: '#00000080', display: true }).setOrigin(0.5)]);
  c.setSize(radius * 2, radius * 2).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => { c.setY(y + 2); c.setScale(0.95); });
  c.on('pointerout', () => { c.setY(y); c.setScale(1); });
  c.on('pointerup', () => { c.setY(y); c.setScale(1); scene.tweens.add({ targets: c, scale: { from: 1.06, to: 1 }, duration: 160, ease: 'Back.easeOut' }); sfx('tap'); onTap(); });
  return c;
}
