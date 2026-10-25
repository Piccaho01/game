import Phaser from 'phaser';
import { SCREEN_W } from '../config';
import { pxRect } from './kit';
import { sfx } from './sfx';
import { pixelText } from './text';
import { COLORS, TEXT_COLORS, TEXT_SIZE, shade } from './theme';

/**
 * The battle's look (owner-approved "Workshop A+"): command buttons with an icon, a hint and a
 * faint animated decal behind the words that does a big move when tapped; edge-tucked info cards
 * with a two-step HP drain; the gold assist bar; the leader's cut-in.
 */

type G = Phaser.GameObjects.Graphics;
/** The player's card strip (the foe's is rust). */
const TONESTRIP = 0x3a78c8;
export type IconId = 'fight' | 'seal' | 'team' | 'run' | 'bolt';

/** Small pixel icons, white, drawn centred on (0, 0) in an 11x11 box. */
function drawIcon(g: G, id: IconId, color = 0xffffff) {
  g.fillStyle(color);
  const px = (x: number, y: number, w = 1, h = 1) => g.fillRect(x - 5, y - 5, w, h);
  switch (id) {
    case 'fight': // a fist
      px(2, 3, 7, 5); px(3, 2, 5, 1); px(1, 4, 1, 3); px(3, 8, 5, 2); px(9, 4, 1, 3);
      g.fillStyle(shade(color, -0.45)); px(4, 4, 1, 2); px(6, 4, 1, 2);
      break;
    case 'seal': // a rolled scroll
      px(2, 1, 7, 2); px(3, 3, 5, 5); px(2, 8, 7, 2);
      g.fillStyle(shade(color, -0.45)); px(4, 5, 3, 1);
      break;
    case 'team': // two heads
      px(1, 2, 3, 3); px(7, 2, 3, 3); px(0, 6, 5, 4); px(6, 6, 5, 4);
      break;
    case 'run': // an arrow
      px(1, 4, 7, 3); px(6, 2, 1, 7); px(7, 3, 1, 5); px(8, 4, 1, 3); px(9, 5, 1, 1);
      break;
    case 'bolt':
      px(5, 0, 3, 1); px(4, 1, 3, 2); px(3, 3, 3, 2); px(2, 5, 7, 1); px(5, 6, 3, 1); px(4, 7, 3, 2); px(3, 9, 2, 2);
      break;
  }
  return g;
}

/** What sits behind a command's words: built once, idles on a loop, does a big move on tap. */
export interface Decal {
  objects: Phaser.GameObjects.GameObject[];
  burst: () => void;
}

const DECAL_ALPHA = 0.24;

/** A boxing glove that winds back and jabs; on tap it punches right out. */
export function gloveDecal(scene: Phaser.Scene, x: number, y: number): Decal {
  const g = scene.add.graphics().setAlpha(DECAL_ALPHA);
  g.fillStyle(0xffffff);
  g.fillRect(-14, -5, 6, 11); // cuff
  pxRect(g, -8, -10, 20, 20, 0xffffff, 5); // fist
  pxRect(g, -4, -13, 10, 6, 0xffffff, 2); // thumb
  g.setPosition(x, y).setAngle(-8);
  const idle = scene.tweens.chain({
    targets: g, loop: -1, loopDelay: 900,
    tweens: [{ x: x - 7, duration: 260, ease: 'Sine.easeInOut' }, { x: x + 5, duration: 90, ease: 'Quad.easeOut' }, { x, duration: 220, ease: 'Sine.easeOut' }],
  });
  return {
    objects: [g],
    burst: () => { idle.stop(); scene.tweens.add({ targets: g, x: x + 26, scale: 1.5, alpha: 0.6, duration: 140, ease: 'Back.easeOut' }); },
  };
}

/** A scroll that breathes, a swirl turning on it; on tap it snaps open and spins. */
export function scrollDecal(scene: Phaser.Scene, x: number, y: number): Decal {
  const body = scene.add.graphics().setAlpha(DECAL_ALPHA);
  pxRect(body, -11, -14, 22, 4, 0xffffff, 2);
  body.fillStyle(0xffffff).fillRect(-8, -10, 16, 20);
  pxRect(body, -11, 10, 22, 4, 0xffffff, 2);
  body.setPosition(x, y);
  const swirl = scene.add.graphics().setAlpha(DECAL_ALPHA + 0.1);
  swirl.lineStyle(2, 0x7a52b8).beginPath();
  for (let a = 0; a < Math.PI * 4; a += 0.3) {
    const r = 1 + a * 0.45;
    if (a === 0) swirl.moveTo(Math.cos(a) * r, Math.sin(a) * r); else swirl.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  swirl.strokePath().setPosition(x, y);
  const breathe = scene.tweens.add({ targets: body, scaleY: 0.86, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const spin = scene.tweens.add({ targets: swirl, angle: 360, duration: 5000, repeat: -1 });
  return {
    objects: [body, swirl],
    burst: () => {
      breathe.stop(); spin.stop();
      scene.tweens.add({ targets: body, scaleY: 1.5, scaleX: 1.2, alpha: 0.55, duration: 160, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: swirl, angle: 540, scale: 1.6, alpha: 0.8, duration: 300 });
    },
  };
}

/** White silhouettes of Patchlings (front sprites) for TEAM; they bob, and jump on tap. */
export function teamDecal(scene: Phaser.Scene, x: number, y: number, keys: string[]): Decal {
  const sprites = keys.slice(0, 3).map((key, i) => {
    const s = scene.add.sprite(x - i * 18, y, key).setScale(0.5).setTintFill(0xffffff).setAlpha(DECAL_ALPHA + 0.04);
    scene.tweens.add({ targets: s, y: y - 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 250 });
    return s;
  });
  return {
    objects: sprites.reverse(),
    burst: () => sprites.forEach((s, i) => scene.tweens.add({ targets: s, y: s.y - 12, alpha: 0.55, duration: 150, yoyo: true, delay: i * 40, ease: 'Quad.easeOut' })),
  };
}

/** The Patchling that's out, a silhouette hopping across; on tap it sprints off. */
export function runDecal(scene: Phaser.Scene, x0: number, x1: number, y: number, key: string): Decal {
  const s = scene.add.sprite(x0, y, key).setScale(0.5).setFlipX(true).setTintFill(0xffffff).setAlpha(0);
  const across = scene.tweens.chain({
    targets: s, loop: -1,
    tweens: [
      { x: { from: x0, to: x1 }, duration: 2200, ease: 'Linear' },
    ],
  });
  const fade = scene.tweens.add({ targets: s, alpha: { from: 0, to: DECAL_ALPHA + 0.04 }, duration: 400, yoyo: true, hold: 1400, repeat: -1 });
  const hop = scene.tweens.add({ targets: s, y: y - 3, duration: 140, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
  return {
    objects: [s],
    burst: () => { across.stop(); fade.stop(); hop.stop(); s.setAlpha(0.5); scene.tweens.add({ targets: s, x: x1 + 80, duration: 260, ease: 'Quad.easeIn' }); },
  };
}

export interface CommandOpts {
  label: string;
  hint: string;
  color: number;
  icon: IconId;
  name: string;
  /** Builds the decal in the button's own coordinates (centre 0, 0). */
  decal?: (scene: Phaser.Scene, w: number, h: number) => Decal;
  onTap?: () => void;
}

/**
 * A big command button centred on (x, y): ink outline, a lip, an icon disc, the label with a hint
 * under it, and the decal behind them (clipped to the button). It sinks while held; on release the
 * decal does its big move and the action follows a beat later.
 */
export function commandButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, o: CommandOpts) {
  const c = scene.add.container(x, y).setName(o.name);
  const on = !!o.onTap;
  const face = on ? o.color : COLORS.off;
  const l = -Math.floor(w / 2);
  const t = -Math.floor(h / 2);
  const g = scene.add.graphics();
  pxRect(g, l - 1, t - 1, w + 2, h + 4, COLORS.ink, 4);
  pxRect(g, l, t, w, h + 1, shade(face, -0.35), 3);
  pxRect(g, l, t, w, h - 2, face, 3);
  g.fillStyle(shade(face, 0.3)).fillRect(l + 3, t + 1, w - 6, 1);
  c.add(g);
  let decal: Decal | undefined;
  if (o.decal && on) {
    decal = o.decal(scene, w, h);
    // Clip the decal to the button face (masks work in world space, so follow the container).
    const shape = scene.make.graphics({}, false);
    const mask = shape.createGeometryMask();
    const place = () => {
      const m = c.getWorldTransformMatrix();
      shape.clear().fillStyle(0xffffff).fillRect(m.tx + (l + 2) * m.a, m.ty + (t + 1) * m.d, (w - 4) * m.a, (h - 4) * m.d);
    };
    place();
    scene.events.on('postupdate', place);
    c.once('destroy', () => { scene.events.off('postupdate', place); shape.destroy(); });
    for (const d of decal.objects) (d as unknown as Phaser.GameObjects.Components.Mask).setMask(mask);
    c.add(decal.objects);
  }
  const disc = scene.add.graphics();
  disc.fillStyle(0xffffff, on ? 0.18 : 0.08).fillCircle(l + 15, -1, 9);
  const icon = drawIcon(scene.add.graphics(), o.icon, on ? 0xffffff : 0x9a9cb0).setPosition(l + 15, -1);
  c.add([disc, icon]);
  c.add(pixelText(scene, l + 30, -9, o.label, { color: on ? TEXT_COLORS.light : TEXT_COLORS.off, size: TEXT_SIZE.body, shadow: on ? '#00000090' : undefined }));
  c.add(pixelText(scene, l + 30, 3, o.hint, { color: on ? '#f4f0e4' : TEXT_COLORS.off, size: TEXT_SIZE.small }));
  if (on) {
    let fired = false;
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => c.setY(y + 2));
    c.on('pointerout', () => c.setY(y));
    c.on('pointerup', () => {
      c.setY(y);
      if (fired) return;
      fired = true;
      sfx('confirm');
      decal?.burst();
      scene.tweens.add({ targets: c, scale: 1.04, duration: 70, yoyo: true });
      scene.time.delayedCall(170, () => o.onTap!());
    });
  }
  return c;
}

/** The leader's assist: a gold bar with drifting stripes and a "1x" badge (greyed once used). */
export function assistBar(scene: Phaser.Scene, x: number, y: number, w: number, h: number, o: { name: string; short: string; onTap?: () => void }) {
  const c = scene.add.container(x, y).setName('assist');
  const on = !!o.onTap;
  const face = on ? COLORS.gold : COLORS.off;
  const l = -Math.floor(w / 2);
  const t = -Math.floor(h / 2);
  const g = scene.add.graphics();
  pxRect(g, l - 1, t - 1, w + 2, h + 3, COLORS.ink, 5);
  pxRect(g, l, t, w, h, shade(face, -0.25), 4);
  pxRect(g, l, t, w, h - 2, face, 4);
  c.add(g);
  if (on) {
    const stripes = scene.add.graphics();
    stripes.fillStyle(0xffffff, 0.16);
    for (let i = -h; i < w + 16; i += 8) stripes.fillTriangle(l + i, t + h - 2, l + i + 4, t + h - 2, l + i + h + 2, t).fillTriangle(l + i, t + h - 2, l + i + h + 2, t, l + i + h - 2, t);
    c.add(stripes);
    scene.tweens.add({ targets: stripes, x: -8, duration: 700, repeat: -1 });
    const shape = scene.make.graphics({}, false);
    const mask = shape.createGeometryMask();
    const place = () => {
      const m = c.getWorldTransformMatrix();
      shape.clear().fillStyle(0xffffff).fillRect(m.tx + (l + 3) * m.a, m.ty + t * m.d, (w - 6) * m.a, (h - 2) * m.d);
    };
    place();
    scene.events.on('postupdate', place);
    c.once('destroy', () => { scene.events.off('postupdate', place); shape.destroy(); });
    stripes.setMask(mask);
  }
  c.add(drawIcon(scene.add.graphics(), 'bolt', on ? COLORS.ink : 0x9a9cb0).setPosition(l + 12, -1));
  const name = pixelText(scene, l + 22, -4, o.name.toUpperCase(), { color: on ? TEXT_COLORS.ink : TEXT_COLORS.off, size: TEXT_SIZE.body });
  c.add(name);
  const short = pixelText(scene, name.x + name.width + 6, -3, on ? o.short : 'used this battle', { color: on ? '#3a3020' : TEXT_COLORS.off, size: TEXT_SIZE.small });
  // The hint only if it fits before the badge.
  if (short.x + short.width > l + w - 28) short.destroy(); else c.add(short);
  if (on) {
    const badge = scene.add.graphics();
    pxRect(badge, l + w - 24, -5, 18, 10, COLORS.ink, 3);
    c.add([badge, pixelText(scene, l + w - 15, 0, '1x', { color: TEXT_COLORS.gold, size: TEXT_SIZE.small }).setOrigin(0.5)]);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => c.setY(y + 2));
    c.on('pointerout', () => c.setY(y));
    c.on('pointerup', () => { c.setY(y); sfx('confirm'); o.onTap!(); });
  }
  return c;
}

/** Status colours for the info cards. */
export const STATUS_COLORS: Record<string, number> = { brn: 0xe8603c, par: 0xc89a18, psn: 0x9a4ab8, slp: 0x7a8098 };

/**
 * An info card tucked against the screen edge (foe: left, player: right): a colour strip, name,
 * type tag and level, and an HP bar that drops in two steps (a white strip shows the damage just
 * taken, then the bar catches up). The player's card also shows HP numbers.
 */
export class InfoCard {
  hp = 0;
  private maxHp = 1;
  readonly root: Phaser.GameObjects.Container;
  private bar: G;
  private ghost: G;
  private ghostFrac = 1;
  private nums?: Phaser.GameObjects.Text;
  private name: Phaser.GameObjects.Text;
  private level: Phaser.GameObjects.Text;
  private tags: Phaser.GameObjects.Container;
  private readonly barX: number;
  private readonly barW: number;
  readonly homeX: number;

  constructor(private scene: Phaser.Scene, private side: 'foe' | 'player', y: number) {
    const w = 122;
    const h = side === 'player' ? 40 : 30;
    this.homeX = side === 'foe' ? 0 : SCREEN_W - w;
    this.root = scene.add.container(this.homeX, y).setDepth(3);
    const g = scene.add.graphics();
    // Open on the screen edge: rounded only on the inner side.
    if (side === 'foe') {
      g.fillStyle(COLORS.ink).fillRect(0, -1, w - 3, h + 4);
      pxRect(g, w - 8, -1, 9, h + 4, COLORS.ink, 3);
      g.fillStyle(COLORS.paperShade).fillRect(0, 1, w - 3, h);
      g.fillStyle(0xf8f1de).fillRect(0, 0, w - 4, h - 1);
      pxRect(g, w - 9, 0, 8, h - 1, 0xf8f1de, 3);
      g.fillStyle(COLORS.rust).fillRect(0, 0, 3, h - 1);
    } else {
      g.fillStyle(COLORS.ink).fillRect(3, -1, w - 3, h + 4);
      pxRect(g, -1, -1, 9, h + 4, COLORS.ink, 3);
      g.fillStyle(COLORS.paperShade).fillRect(3, 1, w - 3, h);
      g.fillStyle(0xf8f1de).fillRect(4, 0, w - 4, h - 1);
      pxRect(g, 1, 0, 8, h - 1, 0xf8f1de, 3);
      g.fillStyle(TONESTRIP).fillRect(w - 3, 0, 3, h - 1);
    }
    this.root.add(g);
    const left = side === 'foe' ? 8 : 9;
    this.name = pixelText(scene, left, 5, '', { size: TEXT_SIZE.body });
    this.level = pixelText(scene, w - (side === 'foe' ? 10 : 8), 6, '', { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small }).setOrigin(1, 0);
    this.tags = scene.add.container(0, 0);
    this.barX = left;
    this.barW = w - left - (side === 'foe' ? 12 : 10);
    const track = scene.add.graphics();
    pxRect(track, this.barX - 1, 17, this.barW + 2, 7, COLORS.ink, 2);
    pxRect(track, this.barX, 18, this.barW, 5, 0x2a2c3e, 1);
    this.ghost = scene.add.graphics();
    this.bar = scene.add.graphics();
    this.root.add([this.name, this.level, this.tags, track, this.ghost, this.bar]);
    if (side === 'player') {
      this.nums = pixelText(scene, w - 8, 27, '', { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small }).setOrigin(1, 0);
      this.root.add(this.nums);
    }
  }

  set(b: { name: string; level: number; hp: number; stats: { hp: number }; status: string | null; types: string[] }, typeColor: (t: string) => number, typeName: (t: string) => string) {
    this.name.setText(b.name);
    this.level.setText(`Lv${b.level}`);
    this.hp = b.hp;
    this.maxHp = b.stats.hp;
    this.ghostFrac = b.hp / b.stats.hp;
    this.tags.removeAll(true);
    // Type tags after the name.
    let tx = this.name.x + this.name.width + 4;
    const limit = this.level.x - this.level.width - 3;
    for (const t of b.types.slice(0, 2)) {
      const label = pixelText(this.scene, tx + 3, 6, typeName(t).toUpperCase(), { color: TEXT_COLORS.light, size: TEXT_SIZE.tiny });
      // Only tags that fit before the level.
      if (tx + label.width + 6 > limit) {
        label.destroy();
        break;
      }
      const bg = this.scene.add.graphics();
      pxRect(bg, tx, 5, Math.ceil(label.width) + 6, 8, typeColor(t), 2);
      this.tags.add([bg, label]);
      tx += Math.ceil(label.width) + 8;
    }
    this.statusTag(b.status);
    this.draw(b.hp);
    this.drawGhost();
  }

  private statusEl?: Phaser.GameObjects.Container;

  statusTag(status: string | null) {
    this.statusEl?.destroy();
    this.statusEl = undefined;
    if (!status) return;
    const c = this.scene.add.container(this.barX, this.side === 'player' ? 27 : 25);
    const label = pixelText(this.scene, 3, 1, status.toUpperCase(), { color: TEXT_COLORS.light, size: TEXT_SIZE.tiny });
    const bg = this.scene.add.graphics();
    pxRect(bg, 0, 0, Math.ceil(label.width) + 6, 8, STATUS_COLORS[status] ?? COLORS.off, 2);
    c.add([bg, label]);
    this.root.add(c);
    this.statusEl = c;
  }

  /** Slides in from its screen edge. */
  slideIn(delay = 0) {
    const from = this.side === 'foe' ? -130 : SCREEN_W + 10;
    this.root.setX(from);
    return new Promise<void>((resolve) => this.scene.tweens.add({ targets: this.root, x: this.homeX, delay, duration: 320, ease: 'Back.easeOut', onComplete: () => resolve() }));
  }

  /** The bar drops at once to a white "just lost" strip, which the bar then drains into. */
  animateTo(hp: number, maxHp: number) {
    this.maxHp = maxHp;
    const from = this.hp;
    this.hp = hp;
    if (hp >= from) {
      // Healing fills smoothly.
      const counter = { v: from };
      return new Promise<void>((resolve) => this.scene.tweens.add({
        targets: counter, v: hp, duration: 400, onUpdate: () => { this.draw(counter.v); this.ghostFrac = counter.v / maxHp; this.drawGhost(); }, onComplete: () => resolve(),
      }));
    }
    this.draw(hp);
    const g = { f: this.ghostFrac };
    return new Promise<void>((resolve) => this.scene.tweens.add({
      targets: g, f: hp / maxHp, delay: 220, duration: Math.min(700, 250 + (from - hp) * 20), ease: 'Quad.easeIn',
      onUpdate: () => { this.ghostFrac = g.f; this.drawGhost(); }, onComplete: () => resolve(),
    }));
  }

  private drawGhost() {
    this.ghost.clear().fillStyle(0xffffff).fillRect(this.barX, 18, Math.round(this.barW * Math.max(0, this.ghostFrac)), 5);
  }

  private draw(hp: number) {
    const frac = Math.max(0, hp / this.maxHp);
    const color = frac > 0.5 ? 0x34b38a : frac > 0.2 ? 0xf2b630 : 0xe8483a;
    const w = Math.round(this.barW * frac);
    this.bar.clear();
    if (w > 0) {
      this.bar.fillStyle(color).fillRect(this.barX, 18, w, 5);
      this.bar.fillStyle(shade(color, 0.35)).fillRect(this.barX, 18, w, 1);
    }
    this.nums?.setText(`${Math.round(hp)} / ${this.maxHp}`);
  }
}

/**
 * The leader's cut-in when they use their assist: the top screen dims, a band in their colour
 * sweeps in, their big pixel figure slides across, the assist's name pops with their line.
 */
export async function assistCutIn(scene: Phaser.Scene, o: { color: number; accent: number; trainerKey?: string; word: string; line: string }) {
  sfx('cutin');
  const depth = 30;
  const dim = scene.add.rectangle(0, 0, SCREEN_W, 192, COLORS.ink, 0.55).setOrigin(0).setDepth(depth).setAlpha(0);
  const band = scene.add.container(-SCREEN_W, 96).setDepth(depth + 1);
  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.ink).fillPoints([{ x: -10, y: -46 }, { x: SCREEN_W + 10, y: -58 }, { x: SCREEN_W + 10, y: 40 }, { x: -10, y: 52 }], true);
  bg.fillStyle(o.color).fillPoints([{ x: -10, y: -43 }, { x: SCREEN_W + 10, y: -55 }, { x: SCREEN_W + 10, y: 37 }, { x: -10, y: 49 }], true);
  bg.fillStyle(o.accent).fillPoints([{ x: -10, y: -43 }, { x: SCREEN_W + 10, y: -55 }, { x: SCREEN_W + 10, y: -52 }, { x: -10, y: -40 }], true);
  bg.fillStyle(0xffffff, 0.08);
  for (let i = -40; i < SCREEN_W + 40; i += 16) bg.fillPoints([{ x: i, y: 49 }, { x: i + 8, y: 49 }, { x: i + 40, y: -55 }, { x: i + 32, y: -55 }], true);
  band.add(bg);
  const fig = o.trainerKey && scene.textures.exists(o.trainerKey)
    ? scene.add.image(-60, 140, o.trainerKey).setOrigin(0.5, 1).setDepth(depth + 2)
    : undefined;
  const word = pixelText(scene, 150, 78, o.word.toUpperCase(), { color: css(o.accent), size: TEXT_SIZE.title, shadow: '#1c1b29' }).setOrigin(0.5).setDepth(depth + 3).setScale(0).setAngle(-6);
  const line = pixelText(scene, 150, 104, `"${o.line}"`, { color: TEXT_COLORS.light, size: TEXT_SIZE.small, wrap: 150 }).setOrigin(0.5).setDepth(depth + 3).setAlpha(0);
  const lineBg = scene.add.rectangle(150, 104, line.width + 10, line.height + 6, COLORS.ink).setDepth(depth + 2).setAlpha(0);
  const tween = (cfg: Phaser.Types.Tweens.TweenBuilderConfig) => new Promise<void>((r) => scene.tweens.add({ ...cfg, onComplete: () => r() }));
  await Promise.all([
    tween({ targets: dim, alpha: 1, duration: 160 }),
    tween({ targets: band, x: 0, duration: 220, ease: 'Cubic.easeOut' }),
    fig ? tween({ targets: fig, x: 56, duration: 320, delay: 80, ease: 'Back.easeOut' }) : Promise.resolve(),
  ]);
  await tween({ targets: word, scale: 1, duration: 200, ease: 'Back.easeOut' });
  await tween({ targets: [line, lineBg], alpha: 1, duration: 120 });
  await new Promise((r) => scene.time.delayedCall(700, r));
  await Promise.all([
    tween({ targets: band, x: SCREEN_W + 20, duration: 220, ease: 'Cubic.easeIn' }),
    fig ? tween({ targets: fig, x: SCREEN_W + 80, duration: 240, ease: 'Cubic.easeIn' }) : Promise.resolve(),
    tween({ targets: [word, line, lineBg], alpha: 0, duration: 150 }),
    tween({ targets: dim, alpha: 0, duration: 260 }),
  ]);
  for (const o2 of [dim, band, fig, word, line, lineBg]) o2?.destroy();
}

const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** "A WILD FLEDJET!": a dark band sweeps across the top screen and away. */
export async function banner(scene: Phaser.Scene, text: string, y = 70) {
  sfx('banner');
  const c = scene.add.container(-SCREEN_W, y).setDepth(25);
  const g = scene.add.graphics();
  g.fillStyle(COLORS.ink, 0.9).fillRect(0, -9, SCREEN_W, 18);
  g.fillStyle(COLORS.rust).fillRect(0, -9, SCREEN_W, 1).fillRect(0, 8, SCREEN_W, 1);
  const t = pixelText(scene, SCREEN_W / 2, 0, text, { color: TEXT_COLORS.light, size: TEXT_SIZE.body }).setOrigin(0.5);
  g.fillStyle(COLORS.rust).fillRect(SCREEN_W / 2 - t.width / 2 - 24, -1, 16, 2).fillRect(SCREEN_W / 2 + t.width / 2 + 8, -1, 16, 2);
  c.add([g, t]);
  await new Promise<void>((r) => scene.tweens.add({ targets: c, x: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => r() }));
  await new Promise((r) => scene.time.delayedCall(800, r));
  await new Promise<void>((r) => scene.tweens.add({ targets: c, x: SCREEN_W, duration: 240, ease: 'Cubic.easeIn', onComplete: () => r() }));
  c.destroy();
}
