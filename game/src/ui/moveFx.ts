import Phaser from 'phaser';
import { MOVES, TYPES } from '../engine/data';
import { spriteBounds } from './kit';
import { hexToNum, shade } from './theme';
import { tweenAsync, wait } from './widgets';

/**
 * Attack animations (M7): drawn live with tweens and particles, so they run at the full frame
 * rate instead of as baked frames. Signature moves get their own (Glassblow first); every other
 * move gets its type's flavour on a shape picked by category: physical = rush in and hit,
 * special = charge and fire a shot, status = an aura on the user.
 */

type Sprite = Phaser.GameObjects.Sprite;
interface Ctx { scene: Phaser.Scene; from: Sprite; to: Sprite; col: number; light: number; dir: number }

const DEPTH = 4;

/** Small textures every effect shares: a hard pixel, a soft glow, a shard. */
export function ensureFxTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('fx:px')) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff).fillRect(0, 0, 2, 2).generateTexture('fx:px', 2, 2).clear();
  for (let r = 16; r > 0; r--) g.fillStyle(0xffffff, 0.035).fillCircle(16, 16, r);
  g.generateTexture('fx:soft', 32, 32).clear();
  g.fillStyle(0xffffff).fillTriangle(0, 6, 3, 0, 6, 6).generateTexture('fx:shard', 6, 6).clear();
  g.fillStyle(0xffffff).fillCircle(3, 3, 3).generateTexture('fx:dot', 6, 6).clear();
  g.fillStyle(0xffffff).fillEllipse(4, 2, 8, 4).generateTexture('fx:leaf', 8, 4).clear();
  g.destroy();
}

/** Where a sprite's body is (centre, and a point toward its foe for a mouth or hand). */
function body(s: Sprite, dir: number) {
  // The opaque part of the current frame, not the canvas (double-res sprites are mostly empty).
  const o = spriteBounds(s.scene, s.texture.key, s.frame.name);
  const sx = Math.abs(s.scaleX), sy = Math.abs(s.scaleY);
  const left0 = s.x - s.originX * o.fw * sx;
  const left = s.flipX ? left0 + (o.fw - o.x - o.w) * sx : left0 + o.x * sx;
  const top = s.y - s.originY * o.fh * sy + o.y * sy;
  const w = o.w * sx, h = o.h * sy;
  const x = left + w / 2, y = top + h / 2;
  return { x, y, w, h, front: { x: x + dir * w * 0.3, y: top + h * 0.35 } };
}

export async function playMoveFx(scene: Phaser.Scene, moveId: string, from: Sprite, to: Sprite, attackerIsPlayer: boolean) {
  ensureFxTextures(scene);
  const mv = MOVES[moveId];
  const type = mv?.type ?? 'metal';
  const col = hexToNum(TYPES[type]?.color ?? '#ffffff');
  const c: Ctx = { scene, from, to, col, light: shade(col, 0.45), dir: attackerIsPlayer ? 1 : -1 };
  const custom = SIGNATURE[moveId];
  if (custom) return custom(c);
  if (!mv || mv.category === 'status') return aura(c, type);
  if (mv.category === 'physical') return rush(c, type);
  return shot(c, type);
}

// ---------- shared pieces ----------

function emit(c: Ctx, x: number, y: number, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, key = 'fx:px', ms = 0) {
  const e = c.scene.add.particles(x, y, key, cfg).setDepth(DEPTH);
  if (ms) c.scene.time.delayedCall(ms, () => e.stop());
  c.scene.time.delayedCall((ms || 0) + 1600, () => e.destroy());
  return e;
}

/** A ring that bursts out and fades, plus a white core flash. */
function impact(c: Ctx, x: number, y: number, size = 1) {
  // The target flashes white for a beat (a hit-stop), and lines burst out from the hit.
  c.to.setTintFill(0xffffff);
  c.scene.time.delayedCall(70, () => c.to.clearTint());
  const lines = c.scene.add.graphics({ x, y }).setDepth(DEPTH);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
    const r0 = 8 * size, r1 = (22 + Math.random() * 12) * size;
    lines.lineStyle(i % 2 ? 1 : 2, i % 3 ? 0xffffff : c.light, 1).lineBetween(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1);
  }
  c.scene.tweens.add({ targets: lines, scale: 1.4, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => lines.destroy() });
  const star = c.scene.add.star(x, y, 4, 3 * size, 14 * size, 0xffffff).setDepth(DEPTH).setRotation(Math.random());
  c.scene.tweens.add({ targets: star, scale: 1.6, alpha: 0, angle: 45, duration: 200, onComplete: () => star.destroy() });
  const ring = c.scene.add.circle(x, y, 6 * size).setStrokeStyle(2, c.light).setDepth(DEPTH);
  c.scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  const core = c.scene.add.image(x, y, 'fx:soft').setTint(c.light).setAlpha(0.7).setScale(0.9 * size).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH);
  c.scene.tweens.add({ targets: core, scale: 0.2, alpha: 0, duration: 260, onComplete: () => core.destroy() });
  c.scene.cameras.main.shake(120, 0.004 * size);
}

/** The type's particles: how fire, water, leaves... move. */
function typeBurst(c: Ctx, type: string, x: number, y: number, n = 18) {
  const tint = [c.col, c.light, 0xffffff];
  switch (type) {
    case 'fire': return emit(c, x, y, { speed: { min: 20, max: 70 }, angle: { min: 200, max: 340 }, gravityY: -60, lifespan: 600, scale: { start: 1.6, end: 0 }, tint: [0xffe08a, 0xff9a3c, c.col], blendMode: 'ADD', quantity: n, frequency: -1 }, 'fx:px');
    case 'water': return emit(c, x, y, { speed: { min: 40, max: 90 }, angle: { min: 200, max: 340 }, gravityY: 220, lifespan: 700, scale: { start: 1, end: 0.4 }, tint, quantity: n, frequency: -1 }, 'fx:dot');
    case 'plant': return emit(c, x, y, { speed: { min: 30, max: 70 }, angle: { min: 0, max: 360 }, rotate: { start: 0, end: 360 }, gravityY: 40, lifespan: 800, scale: { start: 1.2, end: 0.6 }, alpha: { start: 1, end: 0 }, tint, quantity: n, frequency: -1 }, 'fx:leaf');
    case 'rock': return emit(c, x, y, { speed: { min: 40, max: 90 }, angle: { min: 200, max: 340 }, gravityY: 300, lifespan: 700, scale: { start: 1.6, end: 1 }, rotate: { start: 0, end: 180 }, tint: [0x8b7a6a, 0x5e5249, 0xb3a191], quantity: n, frequency: -1 }, 'fx:shard');
    case 'wind': return emit(c, x, y, { speed: { min: 60, max: 120 }, angle: { min: 0, max: 360 }, lifespan: 420, scaleX: { start: 4, end: 0 }, scaleY: 0.5, alpha: { start: 0.8, end: 0 }, tint: [0xffffff, c.light], quantity: n, frequency: -1 }, 'fx:px');
    case 'spark': return emit(c, x, y, { speed: { min: 60, max: 140 }, angle: { min: 0, max: 360 }, lifespan: 300, scale: { start: 1.4, end: 0 }, tint: [0xfff27a, 0xffffff], blendMode: 'ADD', quantity: n, frequency: -1 }, 'fx:px');
    case 'ice': return emit(c, x, y, { speed: { min: 30, max: 80 }, angle: { min: 0, max: 360 }, rotate: { start: 0, end: 90 }, lifespan: 700, scale: { start: 1.4, end: 0 }, tint: [0xdff6ff, 0x9fdcff, 0xffffff], blendMode: 'ADD', quantity: n, frequency: -1 }, 'fx:shard');
    case 'dark': return emit(c, x, y, { speed: { min: 10, max: 40 }, angle: { min: 0, max: 360 }, gravityY: -30, lifespan: 900, scale: { start: 1.2, end: 2.4 }, alpha: { start: 0.7, end: 0 }, tint: [0x2a1640, 0x5a2e86, 0x16101f], quantity: n, frequency: -1 }, 'fx:soft');
    case 'metal': return emit(c, x, y, { speed: { min: 70, max: 150 }, angle: { min: 0, max: 360 }, lifespan: 260, scaleX: { start: 3, end: 0 }, scaleY: 0.6, tint: [0xffffff, 0xd6dbe6, 0xffe9a8], blendMode: 'ADD', quantity: n, frequency: -1 }, 'fx:px');
    default: return emit(c, x, y, { speed: { min: 30, max: 90 }, angle: { min: 0, max: 360 }, lifespan: 500, scale: { start: 2, end: 0 }, tint: [0x7dffb0, 0xff3df0, 0x3df6ff], quantity: n, frequency: -1 }, 'fx:px');
  }
}

/** Physical: wind up, dash at the foe, hit, spring back. */
async function rush(c: Ctx, type: string) {
  const s = c.from;
  const home = { x: s.x, y: s.y };
  const t = body(c.to, -c.dir);
  const me = body(s, c.dir);
  await tweenAsync(c.scene, { targets: s, x: home.x - c.dir * 6, duration: 140, ease: 'Sine.easeOut' });
  const trail = emit(c, 0, 0, { follow: s, followOffset: { x: me.x - s.x, y: me.y - s.y }, lifespan: 240, scale: { start: 1.2, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: c.col, frequency: 16 }, 'fx:soft');
  const ev = afterimages(c, s, 130);
  await tweenAsync(c.scene, { targets: s, x: home.x + (t.x - home.x) * 0.35, y: home.y + (t.y - home.y) * 0.25, duration: 130, ease: 'Expo.easeIn' });
  ev.remove();
  trail.stop();
  impact(c, t.x, t.y, 1.2);
  typeBurst(c, type, t.x, t.y, 24);
  await wait(c.scene, 60);
  await tweenAsync(c.scene, { targets: s, x: home.x, y: home.y, duration: 260, ease: 'Back.easeOut' });
}

/** Special: a glow gathers at the user, then a shot flies to the foe with a trail. */
async function shot(c: Ctx, type: string) {
  const a = body(c.from, c.dir).front;
  const t = body(c.to, -c.dir);
  const orb = c.scene.add.container(a.x, a.y).setDepth(DEPTH).setScale(0.2);
  orb.add([c.scene.add.image(0, 0, 'fx:soft').setTint(c.col).setScale(0.9), c.scene.add.circle(0, 0, 4, c.col).setStrokeStyle(1, c.light), c.scene.add.circle(-1, -1, 1.5, 0xffffff)]);
  emit(c, a.x, a.y, { emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 26), quantity: 24 } as Phaser.Types.GameObjects.Particles.ParticleEmitterEdgeZoneConfig, moveToX: a.x, moveToY: a.y, lifespan: 280, scale: { start: 1.4, end: 0.3 }, tint: [c.light, 0xffffff, c.col], blendMode: 'ADD', frequency: 12 }, 'fx:px', 280);
  const charge = c.scene.add.circle(a.x, a.y, 14).setStrokeStyle(1, c.light).setDepth(DEPTH);
  c.scene.tweens.add({ targets: charge, scale: 0.1, duration: 280, ease: 'Quad.easeIn', onComplete: () => charge.destroy() });
  await tweenAsync(c.scene, { targets: orb, scale: 1, duration: 280, ease: 'Back.easeOut' });
  const trail = emit(c, 0, 0, { follow: orb, lifespan: 260, scale: { start: 1.6, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [c.col, c.light], frequency: 12 }, 'fx:dot');
  const o = { t: 0 };
  await tweenAsync(c.scene, { targets: o, t: 1, duration: 300, ease: 'Sine.easeIn', onUpdate: () => {
    orb.setPosition(a.x + (t.x - a.x) * o.t, a.y + (t.y - a.y) * o.t - Math.sin(o.t * Math.PI) * 18);
  } });
  trail.stop();
  orb.destroy();
  impact(c, t.x, t.y, 1.2);
  typeBurst(c, type, t.x, t.y, 24);
  await wait(c.scene, 220);
}

/** Status: rings and motes rise around the user. */
async function aura(c: Ctx, type: string) {
  const b = body(c.from, c.dir);
  for (let i = 0; i < 3; i++) {
    const r = c.scene.add.ellipse(b.x, b.y + b.h * 0.45, b.w * 0.9, 10).setStrokeStyle(1, c.light, 0.9).setDepth(DEPTH);
    c.scene.tweens.add({ targets: r, y: b.y - b.h * 0.4, scaleX: 0.5, alpha: 0, duration: 600, delay: i * 140, ease: 'Sine.easeOut', onComplete: () => r.destroy() });
  }
  emit(c, b.x, b.y + b.h * 0.3, { x: { min: -b.w / 2, max: b.w / 2 }, speedY: { min: -60, max: -30 }, lifespan: 600, scale: { start: 1.2, end: 0 }, tint: [c.light, 0xffffff], blendMode: 'ADD', frequency: 20 }, type === 'dark' ? 'fx:soft' : 'fx:px', 500);
  // Two soft pulses of the type colour over the user.
  for (let i = 0; i < 2; i++) {
    c.from.setTintFill(c.light);
    await wait(c.scene, 90);
    c.from.clearTint();
    await wait(c.scene, 220);
  }
}

/** Fading copies of a sprite left behind as it moves. */
function afterimages(c: Ctx, s: Sprite, ms: number) {
  const ev = c.scene.time.addEvent({ delay: 30, repeat: Math.floor(ms / 30), callback: () => {
    const g = c.scene.add.sprite(s.x, s.y, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY).setScale(s.scaleX, s.scaleY).setFlipX(s.flipX).setTintFill(c.light).setAlpha(0.45).setDepth(s.depth - 0.1);
    c.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  } });
  return ev;
}

/**
 * Blink strike (Sprigby's line, the owner's call): gone in a puff of leaves, there beside the foe
 * for one kick, gone again, and back home in a swirl of leaves. The player's own Patchling (seen
 * from behind) blinks in as its front sprite, turned to face the foe.
 */
async function blinkStrike(c: Ctx, type = 'plant') {
  const s = c.scene;
  const me = body(c.from, c.dir);
  const t = body(c.to, -c.dir);
  const leaves = (x: number, y: number, n = 16) => emit(c, x, y, { speed: { min: 30, max: 90 }, angle: { min: 0, max: 360 }, rotate: { start: 0, end: 540 }, gravityY: 30, lifespan: 600, scale: { start: 1.3, end: 0.5 }, alpha: { start: 1, end: 0 }, tint: [0x5cb84a, 0x9fd86a, 0x2e7a2a, 0xd8f0a0], quantity: n, frequency: -1 }, 'fx:leaf');
  leaves(me.x, me.y, 20);
  c.from.setAlpha(0);
  await wait(s, 110);
  // The striker beside the foe.
  const key = c.from.texture.key.startsWith('back:') ? c.from.texture.key.replace('back:', 'front:') : c.from.texture.key;
  const half = s.textures.get(key).source[0].height >= 192 ? 0.5 : 1;
  const sc = c.from.texture.key.startsWith('back:') ? half : Math.abs(c.from.scaleX);
  const sideX = t.x - c.dir * (t.w * 0.5 + 14);
  const k = s.add.sprite(sideX - c.dir * 10, c.to.y, key).setOrigin(0.5, 1).setScale(sc).setFlipX(c.dir > 0).setDepth(DEPTH - 0.5);
  leaves(sideX, t.y, 12);
  const ev = afterimages(c, k, 120);
  await tweenAsync(s, { targets: k, x: sideX + c.dir * 8, duration: 90, ease: 'Expo.easeIn' });
  ev.remove();
  impact(c, t.x, t.y, 1.3);
  typeBurst(c, type, t.x, t.y, 22);
  leaves(t.x, t.y, 18);
  await wait(s, 140);
  leaves(k.x, t.y, 14);
  k.destroy();
  await wait(s, 120);
  // Back home in a swirl.
  emit(c, me.x, me.y, { emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, me.w * 0.6), quantity: 18 } as Phaser.Types.GameObjects.Particles.ParticleEmitterEdgeZoneConfig, moveToX: me.x, moveToY: me.y, lifespan: 260, rotate: { start: 0, end: 360 }, scale: { start: 1.3, end: 0.6 }, tint: [0x5cb84a, 0x9fd86a, 0xd8f0a0], quantity: 18, frequency: -1 }, 'fx:leaf');
  await wait(s, 200);
  c.from.setAlpha(1);
  leaves(me.x, me.y, 10);
}

// ---------- signature moves ----------

/**
 * Glassblow (Furnaxol's line): a molten bubble swells at the mouth, wobbling, then shoots off
 * glowing with an ember trail, wobbles in flight, and shatters into glass shards and sparks.
 */
async function glassblow(c: Ctx) {
  const a = body(c.from, c.dir).front;
  const t = body(c.to, -c.dir);
  const s = c.scene;
  const glow = s.add.image(a.x, a.y, 'fx:soft').setTint(0xff9a3c).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3).setDepth(DEPTH);
  const bubble = s.add.circle(a.x, a.y, 9, 0xffb347, 0.6).setStrokeStyle(1, 0xffe9b0, 0.95).setDepth(DEPTH).setScale(0.1);
  const shine = s.add.circle(a.x - 3, a.y - 3, 2, 0xffffff, 0.95).setDepth(DEPTH).setScale(0.1);
  const heat = emit(c, a.x, a.y, { speed: { min: 6, max: 18 }, angle: { min: 230, max: 310 }, gravityY: -40, lifespan: 500, scale: { start: 1, end: 0 }, tint: [0xffe08a, 0xff9a3c], blendMode: 'ADD', frequency: 30 });
  // Blow: it swells in three puffs.
  for (const k of [0.45, 0.75, 1]) {
    await tweenAsync(s, { targets: [bubble, shine, glow], scale: (o: Phaser.GameObjects.GameObject) => (o === glow ? 1.4 * k : k), duration: 150, ease: 'Back.easeOut' });
    await tweenAsync(s, { targets: bubble, scaleX: k * 1.12, scaleY: k * 0.9, duration: 70, yoyo: true });
  }
  heat.stop();
  // Fire: it flies on a slight arc, wobbling, with embers behind it.
  const trail = emit(c, 0, 0, { follow: bubble, lifespan: 380, speed: { min: 4, max: 14 }, scale: { start: 1.4, end: 0 }, tint: [0xffe08a, 0xff7a2c, 0xc63a1e], blendMode: 'ADD', frequency: 14 });
  const o = { t: 0 };
  await tweenAsync(s, { targets: o, t: 1, duration: 360, ease: 'Quad.easeIn', onUpdate: () => {
    const x = a.x + (t.x - a.x) * o.t;
    const y = a.y + (t.y - a.y) * o.t - Math.sin(o.t * Math.PI) * 14;
    const wob = 1 + Math.sin(o.t * 30) * 0.08;
    bubble.setPosition(x, y).setScale(wob, 2 - wob);
    shine.setPosition(x - 3, y - 3);
    glow.setPosition(x, y);
  } });
  trail.stop();
  [bubble, shine, glow].forEach((g) => g.destroy());
  // Shatter: glass shards fly out spinning, sparks and a heat flash.
  impact(c, t.x, t.y, 1.2);
  emit(c, t.x, t.y, { speed: { min: 60, max: 140 }, angle: { min: 0, max: 360 }, rotate: { start: 0, end: 540 }, gravityY: 260, lifespan: 700, scale: { start: 1.5, end: 0.8 }, alpha: { start: 1, end: 0 }, tint: [0xffe9b0, 0xffb347, 0xffffff, 0x9fdcff], quantity: 22, frequency: -1 }, 'fx:shard');
  typeBurst(c, 'fire', t.x, t.y, 26);
  await wait(s, 260);
}

/** Glass Bell (Vitric): a molten glass dome drops over the foe, glows, then shatters. */
async function glassBell(c: Ctx) {
  const s = c.scene;
  const t = body(c.to, -c.dir);
  const r = Math.max(t.w, t.h) * 0.6;
  const dome = s.add.graphics({ x: t.x, y: t.y - 90 }).setDepth(DEPTH);
  dome.fillStyle(0xffb347, 0.35).fillEllipse(0, 0, r * 2, r * 2.2).lineStyle(2, 0xffe9b0, 0.9).strokeEllipse(0, 0, r * 2, r * 2.2);
  dome.fillStyle(0xffffff, 0.7).fillEllipse(-r * 0.45, -r * 0.5, r * 0.3, r * 0.5);
  await tweenAsync(s, { targets: dome, y: t.y, duration: 260, ease: 'Bounce.easeOut' });
  s.cameras.main.shake(100, 0.004);
  for (let i = 0; i < 3; i++) await tweenAsync(s, { targets: dome, alpha: 0.5, duration: 110, yoyo: true });
  dome.destroy();
  impact(c, t.x, t.y, 1.6);
  emit(c, t.x, t.y, { speed: { min: 80, max: 170 }, angle: { min: 0, max: 360 }, rotate: { start: 0, end: 720 }, gravityY: 280, lifespan: 800, scale: { start: 1.8, end: 0.8 }, alpha: { start: 1, end: 0 }, tint: [0xffe9b0, 0xffb347, 0xffffff, 0x9fdcff], quantity: 34, frequency: -1 }, 'fx:shard');
  typeBurst(c, 'fire', t.x, t.y, 30);
  await wait(s, 320);
}

/** Molten Marbles (Cullet): three glowing marbles lobbed one after another. */
async function moltenMarbles(c: Ctx) {
  const a = body(c.from, c.dir).front;
  const t = body(c.to, -c.dir);
  for (let i = 0; i < 3; i++) {
    const m = c.scene.add.circle(a.x, a.y, 3, 0xffa13c).setStrokeStyle(1, 0xffe08a).setDepth(DEPTH);
    const trail = emit(c, 0, 0, { follow: m, lifespan: 220, scale: { start: 1, end: 0 }, tint: [0xffe08a, 0xff7a2c], blendMode: 'ADD', frequency: 16 });
    const o = { t: 0 };
    const tx = t.x + (i - 1) * 8;
    await tweenAsync(c.scene, { targets: o, t: 1, duration: 260, ease: 'Linear', onUpdate: () => m.setPosition(a.x + (tx - a.x) * o.t, a.y + (t.y - a.y) * o.t - Math.sin(o.t * Math.PI) * 30) });
    trail.stop();
    m.destroy();
    impact(c, tx, t.y, 0.6);
    typeBurst(c, 'fire', tx, t.y, 10);
  }
  await wait(c.scene, 200);
}

/** Spark Trail (Zapail line): a crackling line of static slime zigzags along the ground to the foe. */
async function sparkTrail(c: Ctx) {
  const a = body(c.from, c.dir);
  const t = body(c.to, -c.dir);
  const g = c.scene.add.graphics().setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  const y0 = a.y + a.h * 0.45, y1 = t.y + t.h * 0.45;
  const o = { t: 0 };
  await tweenAsync(c.scene, { targets: o, t: 1, duration: 420, onUpdate: () => {
    g.clear().lineStyle(2, 0xfff27a, 1).beginPath().moveTo(a.x, y0);
    const n = Math.floor(o.t * 14);
    for (let k = 1; k <= n; k++) g.lineTo(a.x + (t.x - a.x) * (k / 14), y0 + (y1 - y0) * (k / 14) + (k % 2 ? -4 : 4));
    g.strokePath();
  } });
  impact(c, t.x, y1 - 6);
  typeBurst(c, 'spark', t.x, t.y, 26);
  await tweenAsync(c.scene, { targets: g, alpha: 0, duration: 260 });
  g.destroy();
}

/** Rail Shell (Gauslug): energy streams into the rails, then one blinding beam. */
async function railShell(c: Ctx) {
  const a = body(c.from, c.dir).front;
  const t = body(c.to, -c.dir);
  emit(c, a.x, a.y, { emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 40) } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig, moveToX: a.x, moveToY: a.y, lifespan: 380, scale: { start: 1.2, end: 0.2 }, tint: [0x92e7fa, 0xffffff], blendMode: 'ADD', frequency: 8 }, 'fx:px', 700);
  const core = c.scene.add.image(a.x, a.y, 'fx:soft').setTint(0x92e7fa).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setDepth(DEPTH);
  await tweenAsync(c.scene, { targets: core, scale: 2, duration: 760, ease: 'Quad.easeIn' });
  const beam = c.scene.add.graphics().setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  beam.lineStyle(9, 0x2b6dcf, 0.6).lineBetween(a.x, a.y, t.x, t.y).lineStyle(4, 0x92e7fa, 1).lineBetween(a.x, a.y, t.x, t.y).lineStyle(1, 0xffffff, 1).lineBetween(a.x, a.y, t.x, t.y);
  c.scene.cameras.main.flash(120, 200, 240, 255);
  impact(c, t.x, t.y, 1.8);
  typeBurst(c, 'metal', t.x, t.y, 30);
  typeBurst(c, 'spark', t.x, t.y, 20);
  await tweenAsync(c.scene, { targets: [beam, core], alpha: 0, duration: 380 });
  beam.destroy();
  core.destroy();
}

/** Reap Kick (Scytharoo): leaps in, a green crescent slash, leaves everywhere. */
async function reapKick(c: Ctx) {
  const s = c.from;
  const home = { x: s.x, y: s.y };
  const t = body(c.to, -c.dir);
  await tweenAsync(c.scene, { targets: s, x: home.x + (t.x - home.x) * 0.4, y: home.y - 14, duration: 180, ease: 'Quad.easeOut' });
  const arc = c.scene.add.graphics({ x: t.x, y: t.y }).setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  const o = { a: 0 };
  await tweenAsync(c.scene, { targets: o, a: 1, duration: 160, onUpdate: () => {
    arc.clear().lineStyle(4, 0xb5e86a, 0.9).beginPath().arc(0, 0, 24, -2.4, -2.4 + o.a * 2.8).strokePath();
    arc.lineStyle(1, 0xffffff, 1).beginPath().arc(0, 0, 24, -2.4, -2.4 + o.a * 2.8).strokePath();
  } });
  impact(c, t.x, t.y, 1.3);
  typeBurst(c, 'plant', t.x, t.y, 26);
  void tweenAsync(c.scene, { targets: arc, alpha: 0, duration: 260 }).then(() => arc.destroy());
  await tweenAsync(c.scene, { targets: s, x: home.x, y: home.y, duration: 280, ease: 'Back.easeOut' });
}

/** Abyssal Harpoon (Harrowjaw): the throat glows cold blue, then the jaw fires on a long line. */
async function abyssalHarpoon(c: Ctx) {
  const a = body(c.from, c.dir).front;
  const t = body(c.to, -c.dir);
  const glow = c.scene.add.image(a.x, a.y, 'fx:soft').setTint(0x6172e3).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3).setDepth(DEPTH);
  await tweenAsync(c.scene, { targets: glow, scale: 1.6, duration: 360, yoyo: true });
  const line = c.scene.add.graphics().setDepth(DEPTH);
  const tip = c.scene.add.triangle(a.x, a.y, 0, 0, 10, 4, 0, 8, 0xd8c8cc).setStrokeStyle(1, 0x2a273e).setDepth(DEPTH).setRotation(Math.atan2(t.y - a.y, t.x - a.x));
  const o = { t: 0 };
  await tweenAsync(c.scene, { targets: o, t: 1, duration: 180, ease: 'Quad.easeIn', onUpdate: () => {
    const x = a.x + (t.x - a.x) * o.t, y = a.y + (t.y - a.y) * o.t;
    tip.setPosition(x, y);
    line.clear().lineStyle(2, 0x9c788c, 1).lineBetween(a.x, a.y, x, y).lineStyle(1, 0x85b8f9, 0.8).lineBetween(a.x, a.y - 1, x, y - 1);
  } });
  impact(c, t.x, t.y, 1.5);
  typeBurst(c, 'water', t.x, t.y, 24);
  typeBurst(c, 'dark', t.x, t.y, 10);
  await tweenAsync(c.scene, { targets: o, t: 0, duration: 260, ease: 'Quad.easeOut', onUpdate: () => {
    const x = a.x + (t.x - a.x) * o.t, y = a.y + (t.y - a.y) * o.t;
    tip.setPosition(x, y);
    line.clear().lineStyle(2, 0x9c788c, 1).lineBetween(a.x, a.y, x, y);
  } });
  [line, tip, glow].forEach((g) => g.destroy());
}

/** Orbit Punch (Orbitot line): a fist flung on a stretching galaxy tether. */
async function orbitPunch(c: Ctx) {
  const a = body(c.from, c.dir);
  const t = body(c.to, -c.dir);
  const fist = c.scene.add.circle(a.x, a.y, 6, 0x7d6b64).setStrokeStyle(1, 0x111012).setDepth(DEPTH);
  const tether = c.scene.add.graphics().setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  const stars = emit(c, 0, 0, { follow: fist, lifespan: 400, scale: { start: 1, end: 0 }, tint: [0xffffff, 0x4d8efa, 0x7429e2], frequency: 20 });
  const o = { t: 0 };
  const draw = () => {
    const x = a.x + (t.x - a.x) * o.t - Math.sin(o.t * Math.PI) * 20 * c.dir, y = a.y + (t.y - a.y) * o.t - Math.sin(o.t * Math.PI) * 26;
    fist.setPosition(x, y);
    tether.clear().lineStyle(3, 0x2e1bbe, 0.7).lineBetween(a.x, a.y, x, y).lineStyle(1, 0xbfa3f7, 1).lineBetween(a.x, a.y, x, y);
  };
  await tweenAsync(c.scene, { targets: o, t: 1, duration: 300, ease: 'Quad.easeIn', onUpdate: draw });
  impact(c, t.x, t.y, 1.3);
  typeBurst(c, 'rock', t.x, t.y, 20);
  await tweenAsync(c.scene, { targets: o, t: 0, duration: 300, ease: 'Back.easeOut', onUpdate: draw });
  stars.stop();
  [fist, tether].forEach((g) => g.destroy());
}

/** Afterburner (Fledjet line): pulls back, ignites, and streaks through the foe on a flame trail. */
async function afterburner(c: Ctx) {
  const s = c.from;
  const home = { x: s.x, y: s.y };
  const t = body(c.to, -c.dir);
  const me = body(s, c.dir);
  await tweenAsync(c.scene, { targets: s, x: home.x - c.dir * 10, duration: 200, ease: 'Sine.easeOut' });
  const fire = emit(c, 0, 0, { follow: s, followOffset: { x: me.x - s.x - c.dir * me.w * 0.4, y: me.y - s.y }, speed: { min: 20, max: 50 }, angle: c.dir > 0 ? { min: 160, max: 200 } : { min: -20, max: 20 }, lifespan: 300, scale: { start: 1.8, end: 0 }, tint: [0xffffff, 0xffe08a, 0xff7a2c], blendMode: 'ADD', frequency: 8 });
  await tweenAsync(c.scene, { targets: s, x: home.x + (t.x - home.x) * 0.55, y: home.y + (t.y - home.y) * 0.35, duration: 150, ease: 'Expo.easeIn' });
  impact(c, t.x, t.y, 1.5);
  typeBurst(c, 'wind', t.x, t.y, 24);
  typeBurst(c, 'fire', t.x, t.y, 14);
  await tweenAsync(c.scene, { targets: s, x: home.x, y: home.y, duration: 320, ease: 'Back.easeOut' });
  fire.stop();
}

const SIGNATURE: Record<string, (c: Ctx) => Promise<void>> = {
  glassblow,
  sprout_swipe: (c) => blinkStrike(c, 'plant'),
  springy_hop: (c) => blinkStrike(c, 'wind'),
  gust_kick: (c) => blinkStrike(c, 'wind'),
  fern_blade: (c) => blinkStrike(c, 'plant'),
  glass_bell: glassBell,
  molten_marbles: moltenMarbles,
  spark_trail: sparkTrail,
  rail_shell: railShell,
  reap_kick: reapKick,
  abyssal_harpoon: abyssalHarpoon,
  orbit_punch: orbitPunch,
  afterburner,
};
