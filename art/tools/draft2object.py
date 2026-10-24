"""A location set piece (a building, the crater, the ruins) from a ChatGPT pixel draft.

  draft -> the draft's own pixel grid recovered (pixel2grid.sample: period + phase per axis,
           median of each pixel's centre) -> background = near-white connected to the edge (white
           inside the object, like the van, stays) -> colours reduced (k-means, farthest-point
           start so small accents keep their colour) -> lone specks merged -> RGBA PNG at native
           size: the drafts are already at game scale (16 px tiles), so nothing is resized.

Usage: python3 draft2object.py DRAFT.png OUT.png [COLOURS]
"""
import sys
from collections import Counter
import numpy as np
from PIL import Image, ImageDraw
from pixel2grid import fit_axis
from walk2sheet import kmeans


def grid(path, lo=7.0, hi=16.0):
    """The draft's real pixels (pixel2grid's grid fit, kept to a plausible pixel size so a
    multiple of the period can't win)."""
    rgba = np.asarray(Image.open(path).convert("RGBA")).astype(int)
    rgb = rgba[..., :3].copy()
    rgb[rgba[..., 3] < 128] = 255
    px, phx = fit_axis(rgb, 1, lo, hi)
    py, phy = fit_axis(rgb, 0, lo, hi)
    nx, ny = int((rgb.shape[1] - phx) / px), int((rgb.shape[0] - phy) / py)
    out = np.zeros((ny, nx, 3), int)
    r = max(1, int(min(px, py) / 4))
    for j in range(ny):
        for i in range(nx):
            cx, cy = int(phx + px * (i + 0.5)), int(phy + py * (j + 0.5))
            out[j, i] = np.median(rgb[cy - r:cy + r, cx - r:cx + r].reshape(-1, 3), 0)
    print(f"{path}: grid {px:.2f} x {py:.2f} px")
    return out


def objectify(path, colours=32):
    g = grid(path)
    light = g.sum(2) > 3 * 225
    m = Image.fromarray(np.where(light, 255, 0).astype(np.uint8)).copy()
    h, w = light.shape
    for x in range(w):
        for y in (0, h - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    for y in range(h):
        for x in (0, w - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    bg = np.asarray(m) == 128
    ys, xs = np.where(~bg)
    g, bg = g[ys.min():ys.max() + 1, xs.min():xs.max() + 1], bg[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    fg = g[~bg].astype(float)
    pal = kmeans(fg, min(colours, len(np.unique(fg, axis=0))))
    lab = np.argmin(((g[:, :, None, :] - pal[None, None]) ** 2).sum(3), 2)
    lab[bg] = -1
    # lone specks: no same-coloured neighbour (diagonals count) and close to the colour around them
    out = lab.copy()
    H, W = lab.shape
    for y in range(H):
        for x in range(W):
            c = lab[y, x]
            if c < 0: continue
            n8 = [lab[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W]
            if c in n8: continue
            n4 = [v for v in (lab[y - 1, x] if y else -1, lab[y + 1, x] if y < H - 1 else -1, lab[y, x - 1] if x else -1, lab[y, x + 1] if x < W - 1 else -1) if v >= 0]
            if not n4: out[y, x] = -1; continue
            major = Counter(n4).most_common(1)[0][0]
            if np.sqrt(((pal[c] - pal[major]) ** 2).sum()) < 60: out[y, x] = major
    img = np.zeros((H, W, 4), np.uint8)
    for y, x in zip(*np.where(out >= 0)):
        img[y, x] = (*pal[out[y, x]].astype(int), 255)
    return Image.fromarray(img, 'RGBA')


if __name__ == '__main__':
    im = objectify(sys.argv[1], int(sys.argv[3]) if len(sys.argv) > 3 else 32)
    im.save(sys.argv[2])
    print('wrote', sys.argv[2], im.size)
