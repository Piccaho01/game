"""Turn the overworld walk frames on a character sheet into an in-game walk sheet.

Reads art/trainers/walk_frames.json (frame boxes per direction on each sheet), and for each
character:
  - background = near-white connected to each frame's edge
  - one palette for all of the character's frames (k-means, farthest-point start so small accents
    such as the beanie's orange cross keep their own colour)
  - each frame shrunk to the target height by majority colour per cell; dark outline colours win
    close calls so lines survive
  - laid out bottom-centred in CELL_W x CELL_H cells: rows down, left, right, up (right = left
    mirrored); columns = the three frames
Writes art/trainers/out/<name>_walk.png.

Usage: python3 art/tools/walk2sheet.py [name ...]
"""
import json, os, sys
from collections import Counter
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..')
CELL_W, CELL_H = 24, 32
DIRS = ['down', 'left', 'right', 'up']


def kmeans(px, k, it=20, seed=1):
    rng = np.random.default_rng(seed)
    c = [px[rng.integers(len(px))]]
    for _ in range(k - 1):
        d = np.min([((px - ci) ** 2).sum(1) for ci in c], axis=0)
        c.append(px[d.argmax()])
    c = np.array(c, float)
    for _ in range(it):
        lab = np.argmin(((px[:, None, :] - c[None]) ** 2).sum(2), 1)
        for j in range(k):
            m = px[lab == j]
            if len(m):
                c[j] = m.mean(0)
    return c


def cutout(sheet, box):
    im = sheet.crop(tuple(box))
    a = np.asarray(im).astype(float)
    light = a.sum(2) > 3 * 225
    m = Image.fromarray(np.where(light, 255, 0).astype(np.uint8)).copy()
    for seed in ((0, 0), (m.width - 1, 0), (0, m.height - 1), (m.width - 1, m.height - 1)):
        if m.getpixel(seed) == 255:
            ImageDraw.floodfill(m, seed, 128)
    bg = np.asarray(m) == 128
    ys, xs = np.where(~bg)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], bg[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def shrink(a, bg, pal, height):
    H, W = a.shape[:2]
    s = height / H
    w = max(1, round(W * s))
    lab = np.argmin(((a[:, :, None, :] - pal[None, None]) ** 2).sum(3), 2)
    lab[bg] = -1
    dark = pal.sum(1) < 3 * 70
    out = np.full((height, w), -1)
    for Y in range(height):
        for X in range(w):
            cell = lab[int(Y / s):max(int(Y / s) + 1, int((Y + 1) / s)), int(X / s):max(int(X / s) + 1, int((X + 1) / s))].ravel()
            cnt = Counter(cell.tolist())
            if cnt[-1] > 0.55 * len(cell):
                continue
            cnt.pop(-1, None)
            best = max(cnt, key=lambda c: cnt[c] * (1.6 if dark[c] else 1))
            out[Y, X] = best
    return out


def convert(name, cfg, height, k):
    sheet = Image.open(os.path.join(ROOT, 'concepts', 'trainers', f'{name}.png')).convert('RGB')
    frames = {d: [cutout(sheet, b) for b in boxes] for d, boxes in cfg.items()}
    fg = np.concatenate([a[~bg] for fs in frames.values() for a, bg in fs])
    pal = kmeans(fg[np.random.default_rng(0).choice(len(fg), min(len(fg), 30000), replace=False)], k)
    out = Image.new('RGBA', (CELL_W * 3, CELL_H * 4), (0, 0, 0, 0))
    for row, d in enumerate(DIRS):
        src = 'left' if d == 'right' else d
        for col, (a, bg) in enumerate(frames[src]):
            g = shrink(a, bg, pal, height)
            if d == 'right':
                g = g[:, ::-1]
            h, w = g.shape
            ox = col * CELL_W + (CELL_W - w) // 2
            oy = row * CELL_H + CELL_H - h
            for y in range(h):
                for x in range(w):
                    if g[y, x] >= 0 and 0 <= ox + x < (col + 1) * CELL_W:
                        r, gg, b = (int(v) for v in pal[g[y, x]])
                        out.putpixel((ox + x, oy + y), (r, gg, b, 255))
    path = os.path.join(ROOT, 'trainers', 'out', f'{name}_walk.png')
    out.save(path)
    print('wrote', path)


if __name__ == '__main__':
    conf = json.load(open(os.path.join(ROOT, 'trainers', 'walk_frames.json')))
    for name in sys.argv[1:] or conf['sheets']:
        convert(name, conf['sheets'][name], conf['height'], conf['colours'])
