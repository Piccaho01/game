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
Also writes <name>_walk_diag.png from the isometric walk drafts, for review.
"""
import json, os, sys
from collections import Counter
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import sheet_cut  # noqa: E402

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
    """The frame's pixels and background mask, cropped to the figure. Background: white connected
    to the frame's edge plus enclosed white pockets (between an arm and the body), and the pale
    fringe round the outline, so no flecks of the sheet's white survive the shrink."""
    rgba = sheet_cut.cutout(sheet, tuple(box))
    bg = rgba[..., 3] == 0
    ys, xs = np.where(~bg)
    a = rgba[..., :3].astype(float)
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


def clean(g, pal):
    """Loose pixels from the shrink. A pixel with no same-coloured neighbour (diagonals count)
    whose colour is close to what surrounds it is noise: it takes the neighbours' colour, or goes
    clear on the silhouette's edge. Lone pixels that stand out (an eye glint, the beanie's orange
    cross) are deliberate and stay. One-pixel holes inside the body are filled."""
    h, w = g.shape
    out = g.copy()
    near = lambda y, x, ds: [g[y + dy, x + dx] if 0 <= y + dy < h and 0 <= x + dx < w else -1 for dy, dx in ds]
    four = ((-1, 0), (1, 0), (0, -1), (0, 1))
    eight = four + ((-1, -1), (-1, 1), (1, -1), (1, 1))
    for y in range(h):
        for x in range(w):
            c = g[y, x]
            n4 = near(y, x, four)
            if c < 0:
                if all(v >= 0 for v in n4):
                    out[y, x] = Counter(n4).most_common(1)[0][0]
                continue
            if c in near(y, x, eight):
                continue
            if sum(v < 0 for v in n4) >= 3:
                out[y, x] = -1
                continue
            major = Counter(v for v in n4 if v >= 0).most_common(1)[0][0]
            if np.sqrt(((pal[c] - pal[major]) ** 2).sum()) < 70:
                out[y, x] = major
    return out


def convert(name, cfg, height, k, diag=False):
    """Rows: 0 walking toward the viewer, 1-2 to the side, 3 walking away (the isometric game uses
    rows 0 and 3, mirrored for the other diagonals). From the character sheet's straight views, or
    with diag=True from the owner's isometric walk sheet ('diag': 3/4 views facing down-left and
    up-left), written as <name>_walk_diag.png for review (the game doesn't load it)."""
    if diag:
        dg = cfg['diag']
        path = os.path.join(ROOT, 'concepts', dg['sheet'])
        boxes = sheet_cut.pieces(path, step=2, gap=1, min_area=800, white=240)
        sheet = Image.open(path).convert('RGB')
        frames = {d: [cutout(sheet, boxes[i]) for i in dg[d]] for d in ('down', 'up')}
        frames['left'] = frames['down']
    else:
        sheet = Image.open(os.path.join(ROOT, 'concepts', 'trainers', f'{name}.png')).convert('RGB')
        frames = {d: [cutout(sheet, b) for b in boxes] for d, boxes in cfg.items() if d in DIRS}
    fg = np.concatenate([a[~bg] for fs in frames.values() for a, bg in fs])
    pal = kmeans(fg[np.random.default_rng(0).choice(len(fg), min(len(fg), 30000), replace=False)], k)
    out = Image.new('RGBA', (CELL_W * 3, CELL_H * 4), (0, 0, 0, 0))
    for row, d in enumerate(DIRS):
        src = 'left' if d == 'right' else d
        for col, (a, bg) in enumerate(frames[src]):
            g = shrink(a, bg, pal, height)
            g = clean(g, pal)
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
    path = os.path.join(ROOT, 'trainers', 'out', f'{name}_walk{"_diag" if diag else ""}.png')
    out.save(path)
    print('wrote', path)


PX_CELL = (24, 40)


def native(sheet, box):
    """A frame drawn as real pixel art (blocky, ~6 screen px per game pixel): its grid recovered and
    each block read as one pixel (median colour; clear if mostly background). No resizing."""
    from pixel2grid import fit_axis
    rgba = sheet_cut.cutout(sheet, tuple(box))
    ys, xs = np.where(rgba[..., 3] > 0)
    rgba = rgba[max(0, ys.min() - 3):ys.max() + 4, max(0, xs.min() - 3):xs.max() + 4]
    rgb = rgba[..., :3].astype(int).copy()
    rgb[rgba[..., 3] == 0] = 255
    px, phx = fit_axis(rgb, 1, 5.6, 7.4)
    py, phy = fit_axis(rgb, 0, 5.6, 7.4)
    nx, ny = int((rgb.shape[1] - phx) / px), int((rgb.shape[0] - phy) / py)
    out = np.zeros((ny, nx, 4), float)
    for j in range(ny):
        for i in range(nx):
            x0, x1 = int(phx + px * i + px * 0.25), int(phx + px * (i + 1) - px * 0.25)
            y0, y1 = int(phy + py * j + py * 0.25), int(phy + py * (j + 1) - py * 0.25)
            cell = rgba[y0:max(y1, y0 + 1), x0:max(x1, x0 + 1)].reshape(-1, 4)
            fg = cell[cell[:, 3] > 0]
            if len(fg) * 2 >= len(cell):
                out[j, i, :3] = np.median(fg[:, :3], 0); out[j, i, 3] = 255
    ys, xs = np.where(out[..., 3] > 0)
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def convert_pixel(name, cfg, k):
    """The owner's pixel-art walk sheet ('pixel'): rows 0 (toward the viewer, facing down-left) and 3
    (away, facing up-left), rows 1-2 copies of row 0; 24x40 cells. Written as <name>_walk.png."""
    pc = cfg['pixel']
    path = os.path.join(ROOT, 'concepts', pc['sheet'])
    boxes = sheet_cut.pieces(path, step=2, gap=1, min_area=800, white=240)
    sheet = Image.open(path).convert('RGB')
    frames = {d: [native(sheet, boxes[i]) for i in pc[d]] for d in ('down', 'up')}
    fg = np.concatenate([f[f[..., 3] > 0][:, :3] for fs in frames.values() for f in fs])
    pal = kmeans(fg, min(k, len(np.unique(fg, axis=0))))
    cw, ch = PX_CELL
    out = Image.new('RGBA', (cw * 3, ch * 4), (0, 0, 0, 0))
    for row, d in enumerate(['down', 'down', 'down', 'up']):
        for col, f in enumerate(frames[d]):
            lab = np.argmin(((f[..., None, :3] - pal[None, None]) ** 2).sum(3), 2)
            lab[f[..., 3] == 0] = -1
            g = clean(lab, pal)
            h, w = g.shape
            ox, oy = col * cw + (cw - w) // 2, row * ch + ch - h
            for y in range(h):
                for x in range(w):
                    if g[y, x] >= 0 and 0 <= ox + x < (col + 1) * cw and oy + y >= row * ch:
                        out.putpixel((ox + x, oy + y), (*(int(v) for v in pal[g[y, x]]), 255))
    p = os.path.join(ROOT, 'trainers', 'out', f'{name}_walk.png')
    out.save(p)
    print('wrote', p, 'frame', frames['down'][0].shape[:2])


if __name__ == '__main__':
    conf = json.load(open(os.path.join(ROOT, 'trainers', 'walk_frames.json')))
    for name in sys.argv[1:] or conf['sheets']:
        c = conf['sheets'][name]
        # the owner's pixel-art sheet when there is one; else the character sheet's straight views
        if 'pixel' in c: convert_pixel(name, c, 16)
        else: convert(name, c, conf['height'], conf['colours'])
