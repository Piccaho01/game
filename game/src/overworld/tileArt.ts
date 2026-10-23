import Phaser from 'phaser';
import { TILES, type WorldMap } from '../engine/overworld';
import { shade, hexToNum, css } from '../ui/theme';

/**
 * Placeholder overworld art, drawn in code until the BW2-style tileset arrives. Each map is
 * baked into one texture, so the world is a single image however big the map is.
 */
export const TILE = 16;

type Ctx = CanvasRenderingContext2D;

/** Cheap stable noise per tile, so specks don't jump when the map is rebuilt. */
const hash = (x: number, y: number, k = 0) => {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function px(ctx: Ctx, color: number | string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = typeof color === 'number' ? css(color) : color;
  ctx.fillRect(x, y, w, h);
}

function grassBase(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  const g = TILES.grass;
  px(ctx, g.color, ox, oy, TILE, TILE);
  for (let i = 0; i < 4; i++) {
    const sx = Math.floor(hash(tx, ty, i) * 14) + 1;
    const sy = Math.floor(hash(tx, ty, i + 9) * 14) + 1;
    px(ctx, g.accent, ox + sx, oy + sy, 1, 2);
    px(ctx, g.accent, ox + sx + 1, oy + sy + 1);
  }
}

const DRAW: Record<string, (ctx: Ctx, ox: number, oy: number, tx: number, ty: number) => void> = {
  grass: grassBase,
  tall(ctx, ox, oy) {
    const t = TILES.tall;
    px(ctx, t.color, ox, oy, TILE, TILE);
    // Two rows of blades.
    for (const [bx, by] of [[1, 2], [6, 2], [11, 2], [3, 9], [8, 9], [13, 9]]) {
      px(ctx, t.accent, ox + bx, oy + by + 2, 3, 4);
      px(ctx, shade(hexToNum(t.color), 0.25), ox + bx + 1, oy + by, 1, 3);
      px(ctx, shade(hexToNum(t.color), 0.25), ox + bx, oy + by + 1, 1, 1);
      px(ctx, shade(hexToNum(t.color), 0.25), ox + bx + 2, oy + by + 1, 1, 1);
    }
  },
  path(ctx, ox, oy, tx, ty) {
    const t = TILES.path;
    px(ctx, t.color, ox, oy, TILE, TILE);
    for (let i = 0; i < 3; i++) {
      px(ctx, t.accent, ox + Math.floor(hash(tx, ty, i) * 14) + 1, oy + Math.floor(hash(tx, ty, i + 5) * 14) + 1, 2, 1);
    }
  },
  flowers(ctx, ox, oy, tx, ty) {
    grassBase(ctx, ox, oy, tx, ty);
    for (const [fx, fy] of [[3, 3], [10, 5], [5, 11], [12, 12]]) {
      px(ctx, TILES.flowers.accent, ox + fx, oy + fy, 2, 2);
      px(ctx, '#fff4c0', ox + fx, oy + fy);
    }
  },
  tree(ctx, ox, oy, tx, ty) {
    grassBase(ctx, ox, oy, tx, ty);
    const t = TILES.tree;
    const dark = hexToNum(t.accent);
    px(ctx, '#6a4a30', ox + 6, oy + 11, 4, 5);
    px(ctx, dark, ox + 2, oy + 1, 12, 11);
    px(ctx, dark, ox + 1, oy + 3, 14, 7);
    px(ctx, t.color, ox + 3, oy + 1, 10, 9);
    px(ctx, t.color, ox + 2, oy + 3, 12, 5);
    px(ctx, shade(hexToNum(t.color), 0.25), ox + 4, oy + 2, 4, 2);
    px(ctx, shade(hexToNum(t.color), 0.25), ox + 3, oy + 4, 2, 2);
  },
  water(ctx, ox, oy, tx, ty) {
    const t = TILES.water;
    px(ctx, t.color, ox, oy, TILE, TILE);
    const o = Math.floor(hash(tx, ty) * 6);
    px(ctx, t.accent, ox + o + 1, oy + 4, 5, 1);
    px(ctx, t.accent, ox + ((o + 7) % 10) + 1, oy + 11, 5, 1);
  },
  fence(ctx, ox, oy, tx, ty) {
    grassBase(ctx, ox, oy, tx, ty);
    const c = TILES.fence.accent;
    px(ctx, c, ox, oy + 5, TILE, 2);
    px(ctx, c, ox, oy + 10, TILE, 2);
    px(ctx, shade(hexToNum(c), -0.3), ox + 2, oy + 3, 3, 11);
    px(ctx, shade(hexToNum(c), -0.3), ox + 11, oy + 3, 3, 11);
  },
  wall(ctx, ox, oy) {
    const t = TILES.wall;
    px(ctx, t.color, ox, oy, TILE, TILE);
    px(ctx, t.accent, ox, oy + 7, TILE, 1);
    px(ctx, t.accent, ox, oy + 15, TILE, 1);
    px(ctx, '#7aa8d8', ox + 4, oy + 2, 8, 4);
    px(ctx, '#ffffff', ox + 5, oy + 3, 2, 1);
  },
  roof(ctx, ox, oy, tx) {
    const t = TILES.roof;
    px(ctx, t.color, ox, oy, TILE, TILE);
    for (let y = 3; y < TILE; y += 4) px(ctx, t.accent, ox, oy + y, TILE, 1);
    for (let y = 0; y < TILE; y += 4) px(ctx, t.accent, ox + ((y / 4 + tx) % 2 ? 4 : 12), oy + y, 1, 3);
  },
  door(ctx, ox, oy) {
    px(ctx, TILES.wall.color, ox, oy, TILE, TILE);
    px(ctx, TILES.door.accent, ox + 3, oy + 1, 10, 15);
    px(ctx, TILES.door.color, ox + 4, oy + 2, 8, 14);
    px(ctx, '#f2c14e', ox + 10, oy + 9);
  },
  ruin(ctx, ox, oy, tx, ty) {
    const t = TILES.ruin;
    px(ctx, t.color, ox, oy, TILE, TILE);
    px(ctx, t.accent, ox, oy + 7, TILE, 1);
    px(ctx, t.accent, ox, oy + 15, TILE, 1);
    px(ctx, t.accent, ox + (ty % 2 ? 4 : 11), oy, 1, 7);
    px(ctx, t.accent, ox + (ty % 2 ? 11 : 4), oy + 8, 1, 7);
    if (hash(tx, ty) > 0.6) px(ctx, '#5a9048', ox + 2, oy + 12, 4, 2);
  },
  floor(ctx, ox, oy) {
    px(ctx, TILES.floor.color, ox, oy, TILE, TILE);
    px(ctx, TILES.floor.accent, ox, oy + 15, TILE, 1);
  },
  sign(ctx, ox, oy, tx, ty) {
    grassBase(ctx, ox, oy, tx, ty);
    const c = TILES.sign.accent;
    px(ctx, shade(hexToNum(c), -0.35), ox + 7, oy + 9, 2, 6);
    px(ctx, '#1c1b29', ox + 1, oy + 1, 14, 9);
    px(ctx, c, ox + 2, oy + 2, 12, 7);
    px(ctx, shade(hexToNum(c), 0.3), ox + 4, oy + 4, 8, 1);
    px(ctx, shade(hexToNum(c), 0.3), ox + 4, oy + 6, 6, 1);
  },
  ledge(ctx, ox, oy, tx, ty) {
    grassBase(ctx, ox, oy, tx, ty);
    px(ctx, TILES.ledge.accent, ox, oy + 10, TILE, 3);
    px(ctx, shade(hexToNum(TILES.ledge.accent), -0.3), ox, oy + 13, TILE, 1);
  },
};

/** Bakes a map into one texture (once per map) and returns its key. */
export function mapTexture(scene: Phaser.Scene, map: WorldMap) {
  const key = `map:${map.id}`;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, map.width * TILE, map.height * TILE)!;
  const ctx = tex.getContext();
  map.tiles.forEach((row, ty) => row.forEach((kind, tx) => {
    const draw = DRAW[kind];
    if (draw) draw(ctx, tx * TILE, ty * TILE, tx, ty);
    else px(ctx, TILES[kind].color, tx * TILE, ty * TILE, TILE, TILE);
  }));
  tex.refresh();
  return key;
}

/**
 * A placeholder walker in the leader's outfit colour until the trainer sprites (M4 step 7):
 * one frame per direction plus a step frame, 16x20.
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
