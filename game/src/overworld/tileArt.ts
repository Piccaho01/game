import Phaser from 'phaser';
import { hexToNum, shade, css } from '../ui/theme';

/** Placeholder figures for people who don't have a sprite yet (townsfolk), drawn in code. */
type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, color: number | string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = typeof color === 'number' ? css(color) : color;
  ctx.fillRect(x, y, w, h);
}

/**
 * A placeholder walker in an outfit colour until the townsfolk sprites are drawn: one frame per
 * direction plus a step frame, 16x20.
 */
export function walkerTextures(scene: Phaser.Scene, id: string, outfit: string) {
  const key = `walker:${id}`;
  if (scene.textures.exists(`${key}:down:0`)) return key;
  const body = hexToNum(outfit);
  for (const dir of ['down', 'up', 'left', 'right'] as const) {
    for (const f of [0, 1]) {
      const tex = scene.textures.createCanvas(`${key}:${dir}:${f}`, 16, 20)!;
      const ctx = tex.getContext();
      const ink = '#1c1b29';
      // Shadow.
      px(ctx, 'rgba(0,0,0,0.25)', 3, 18, 10, 2);
      // Legs: alternate on the step frame.
      const l = f ? 1 : 0;
      px(ctx, ink, 4, 13, 8, 5);
      px(ctx, '#2a2a38', 5, 13, 2, 4 - l);
      px(ctx, '#2a2a38', 9, 13, 2, 3 + l);
      // Body.
      px(ctx, ink, 3, 8, 10, 7);
      px(ctx, body, 4, 9, 8, 5);
      px(ctx, shade(body, 0.3), 4, 9, 8, 1);
      // Head.
      px(ctx, ink, 3, 1, 10, 8);
      px(ctx, '#f0c8a0', 4, 2, 8, 6);
      px(ctx, '#5a3a24', 4, 1, 8, 2);
      if (dir === 'up') px(ctx, '#5a3a24', 4, 2, 8, 5);
      if (dir === 'down') { px(ctx, ink, 5, 5); px(ctx, ink, 10, 5); }
      if (dir === 'left') { px(ctx, '#5a3a24', 9, 2, 3, 4); px(ctx, ink, 5, 5); }
      if (dir === 'right') { px(ctx, '#5a3a24', 4, 2, 3, 4); px(ctx, ink, 10, 5); }
      tex.refresh();
    }
  }
  return key;
}
