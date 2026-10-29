import Phaser from 'phaser';
import type { Variant } from '../engine/progress';
import { PROTOTYPE_LOOK, recolorPixel, shinyRecolor, type Recolor } from '../engine/variants';
import { sfx } from './sfx';

/**
 * How shinies and Prototypes look (engine/variants.ts): their recoloured textures (made once, from
 * the normal sprite and its idle frames), the shiny sparkle, and the Prototype's live glitch.
 */
export const variantKey = (key: string, tag: string) => `${key}~${tag}`;

/**
 * The recoloured copy of a texture (all its frames), and of its idle animation if it has one.
 * `tag` names the copy (the variant, or 'opt1' for the review sheet's palette options).
 */
export function recolorTexture(scene: Phaser.Scene, key: string, rc: Recolor & { tint?: string; mix?: number }, tag: string, animKey?: string): { key: string; anim?: string } {
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
    // Sprites have at most 16 colours: recolour each once.
    const memo = new Map<number, [number, number, number]>();
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
      let c = memo.get(k);
      if (!c) { c = recolorPixel(px[i], px[i + 1], px[i + 2], rc); memo.set(k, c); }
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
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

/** The variant's texture and idle for a species' sprite key (normal: unchanged). */
export function variantLook(scene: Phaser.Scene, species: string, key: string, animKey: string | undefined, variant?: Variant | null) {
  if (!variant) return { key, anim: animKey && scene.anims.exists(animKey) ? animKey : undefined };
  return recolorTexture(scene, key, variant === 'shiny' ? shinyRecolor(species) : PROTOTYPE_LOOK, variant, animKey);
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

/**
 * The Prototype's glitch, live on a sprite: colour-split copies jitter off its edges, scanlines
 * roll over it, and now and then a slice of it tears sideways. Returns a stop function.
 */
export function glitch(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite): () => void {
  const ghosts = [0xff3df0, 0x3df6ff].map((tint) => scene.add.sprite(target.x, target.y, target.texture.key, target.frame.name)
    .setOrigin(target.originX, target.originY).setScale(target.scaleX, target.scaleY).setFlipX(target.flipX)
    .setTintFill(tint).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(target.depth - 0.1));
  const tear = scene.add.sprite(target.x, target.y, target.texture.key, target.frame.name).setOrigin(target.originX, target.originY)
    .setScale(target.scaleX, target.scaleY).setFlipX(target.flipX).setDepth(target.depth + 0.1).setVisible(false);
  const lines = scene.add.graphics().setDepth(target.depth + 0.2);
  let t = 0;
  let tearLeft = 0;
  const update = () => {
    if (!target.active) return;
    t++;
    const visible = target.visible && target.alpha > 0;
    const j = t % 7 === 0 ? 2 : 1;
    ghosts.forEach((g, i) => {
      g.setTexture(target.texture.key, target.frame.name).setPosition(target.x + (i ? j : -j), target.y).setScale(target.scaleX, target.scaleY).setVisible(visible).setAlpha(0.35 * target.alpha);
    });
    const b = target.getBounds();
    lines.clear();
    if (visible) {
      for (let y = Math.floor(b.top) + (t % 4); y < b.bottom; y += 4) lines.fillStyle(0x0a1418, 0.18).fillRect(b.left, y, b.width, 1);
    }
    if (tearLeft > 0) tearLeft--;
    else if (visible && Math.random() < 0.025) {
      // A torn slice: a band of the sprite drawn shifted sideways for a few frames.
      const fh = target.frame.height;
      const y0 = Math.floor(Math.random() * fh * 0.8);
      tear.setTexture(target.texture.key, target.frame.name).setCrop(0, y0, target.frame.width, Math.max(3, fh * 0.12));
      tear.setPosition(target.x + (Math.random() < 0.5 ? -4 : 4), target.y).setScale(target.scaleX, target.scaleY).setVisible(true);
      tearLeft = 5;
    }
    if (tearLeft === 0) tear.setVisible(false);
  };
  scene.events.on('update', update);
  const stop = () => {
    scene.events.off('update', update);
    ghosts.forEach((g) => g.destroy());
    tear.destroy();
    lines.destroy();
  };
  target.once('destroy', stop);
  return stop;
}

/** The Prototype's corrupted entrance sound. */
export function corruptedSound() {
  sfx('corrupt');
}
