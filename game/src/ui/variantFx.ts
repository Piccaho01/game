import Phaser from 'phaser';
import type { Variant } from '../engine/progress';
import { accentColours, PROTOTYPE_LOOK, prototypePixel, recolorPixel, shinyRecolor } from '../engine/variants';
import { sfx } from './sfx';

/**
 * How shinies and Prototypes look (engine/variants.ts): their recoloured textures (made once, from
 * the normal sprite and its idle frames), the shiny sparkle, and the Prototype's pulsing blue.
 */
export const variantKey = (key: string, tag: string) => `${key}~${tag}`;

type Rgb = [number, number, number];
/** Builds a colour mapper for one texture, from its colour counts (0xrrggbb -> pixels); null clears the pixel. */
type Mapper = (counts: Map<number, number>) => (c: number, r: number, g: number, b: number) => Rgb | null;

/**
 * A recoloured copy of a texture (all its frames) under `tag`, and of its idle animation if it
 * has one. The mapper sees the whole sprite's colours first (a Prototype picks its accents).
 */
export function recolorTexture(scene: Phaser.Scene, key: string, mapper: Mapper, tag: string, animKey?: string): { key: string; anim?: string } {
  const out = variantKey(key, tag);
  const outAnim = animKey ? variantKey(animKey, tag) : undefined;
  if (!scene.textures.exists(key)) return { key };
  if (!scene.textures.exists(out)) {
    const src = scene.textures.get(key);
    const img = src.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const tex = scene.textures.createCanvas(out, img.width, img.height)!;
    const ctx = tex.getContext();
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    const px = data.data;
    const counts = new Map<number, number>();
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const map = mapper(counts);
    // Sprites have at most 16 colours: map each once.
    const memo = new Map<number, Rgb | null>();
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
      let c = memo.get(k);
      if (c === undefined) { c = map(k, px[i], px[i + 1], px[i + 2]); memo.set(k, c); }
      if (c) { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; } else px[i + 3] = 0;
    }
    ctx.putImageData(data, 0, 0);
    for (const name of src.getFrameNames()) {
      const f = src.get(name);
      tex.add(name, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
    }
    tex.refresh();
  }
  if (outAnim && animKey && scene.anims.exists(animKey) && !scene.anims.exists(outAnim)) {
    const base = scene.anims.get(animKey);
    scene.anims.create({ key: outAnim, frames: base.frames.map((f) => ({ key: out, frame: f.textureFrame, duration: f.duration })), frameRate: base.frameRate, repeat: -1 });
  }
  return { key: out, anim: outAnim && scene.anims.exists(outAnim) ? outAnim : undefined };
}

const shinyMapper = (species: string): Mapper => () => (_c, r, g, b) => recolorPixel(r, g, b, shinyRecolor(species));
const protoMapper: Mapper = (counts) => {
  const acc = accentColours(counts);
  return (c, r, g, b) => prototypePixel(r, g, b, acc.has(c));
};
/** The Prototype's glow layer: only its accents, in the bright glow blue (drawn added over it, pulsing). */
const glowMapper: Mapper = (counts) => {
  const acc = accentColours(counts);
  const glow = Phaser.Display.Color.HexStringToColor(PROTOTYPE_LOOK.glow);
  return (c) => (acc.has(c) ? [glow.red, glow.green, glow.blue] : null);
};

/** The variant's texture and idle for a species' sprite key (normal: unchanged); a Prototype also gets its glow layer. */
export function variantLook(scene: Phaser.Scene, species: string, key: string, animKey: string | undefined, variant?: Variant | null): { key: string; anim?: string; glow?: string } {
  if (!variant) return { key, anim: animKey && scene.anims.exists(animKey) ? animKey : undefined };
  if (variant === 'shiny') return recolorTexture(scene, key, shinyMapper(species), 'shiny', animKey);
  const look = recolorTexture(scene, key, protoMapper, 'prototype', animKey);
  return { ...look, glow: recolorTexture(scene, key, glowMapper, 'prototype-glow').key };
}

/**
 * The Prototype's pulse: its glow layer drawn added over it, frame for frame, breathing between
 * faint and bright like the sanctuary's screens. Returns a stop function.
 */
export function pulse(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite, glowKey: string): () => void {
  const glow = scene.add.sprite(target.x, target.y, glowKey, target.frame.name).setBlendMode(Phaser.BlendModes.ADD);
  const k = { a: 0.1 };
  const tw = scene.tweens.add({ targets: k, a: 0.7, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const update = () => {
    if (!target.active) return;
    glow.setFrame(target.frame.name).setPosition(target.x, target.y).setOrigin(target.originX, target.originY)
      .setScale(target.scaleX, target.scaleY).setFlipX(target.flipX).setDepth(target.depth + 0.05)
      .setVisible(target.visible && !target.isTinted).setAlpha(k.a * target.alpha);
    if (target.parentContainer && glow.parentContainer !== target.parentContainer) target.parentContainer.add(glow);
  };
  update();
  scene.events.on('update', update);
  const stop = () => { scene.events.off('update', update); tw.remove(); glow.destroy(); };
  target.once('destroy', stop);
  return stop;
}

/** The shiny entrance: a burst of four-point stars round the Patchling and a chime. */
export function sparkle(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite, depth = 8) {
  sfx('shiny');
  const b = target.getBounds();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = Math.max(b.width, b.height) * 0.42;
    const g = scene.add.graphics().setDepth(depth);
    g.fillStyle(0xfff6c8).fillRect(-1, -4, 2, 8).fillRect(-4, -1, 8, 2);
    g.fillStyle(0xffffff).fillRect(-1, -1, 2, 2);
    g.setPosition(b.centerX + Math.cos(a) * r * 0.4, b.centerY + Math.sin(a) * r * 0.4).setScale(0.3);
    scene.tweens.add({
      targets: g, x: b.centerX + Math.cos(a) * r, y: b.centerY + Math.sin(a) * r, scale: 1, angle: 90, duration: 420, delay: i * 40, ease: 'Quad.easeOut',
      onComplete: () => scene.tweens.add({ targets: g, alpha: 0, scale: 0.4, duration: 260, onComplete: () => g.destroy() }),
    });
  }
}

/** The Prototype's corrupted entrance sound. */
export function corruptedSound() {
  sfx('corrupt');
}
