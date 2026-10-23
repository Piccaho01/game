"""Turn a pixel-art draft (e.g. one the owner generated with ChatGPT) into a clean sprite grid.

AI pixel art looks right but is not game-ready: it is upscaled on a slightly uneven grid
(16.1 px, not 16), has dozens of near-duplicate colours, soft edges and stray specks. This
recovers the real pixels and makes them a .px.js grid:

  image -> pixel grid fitted (period + phase per axis) -> one sample per pixel (median of its
        centre) -> background dropped, cropped to the creature
        -> colours mapped to a creature palette (--pal, nearest colour) or reduced to --colors
        -> optional shrink by dropping the rows/columns with the least detail (--drop R C), which
           keeps shapes intact where resampling would smear them
        -> lone specks merged into their neighbours, outline redrawn round the silhouette
           (--line on the bottom/right, --line-top on the top/left)

Usage:
  python3 pixel2grid.py DRAFT.png OUT --pal ../creatures/furnaxol.px.js --drop 5 5 --line-top D
Writes OUT.txt (palette + grid for a .px.js file) and OUT.png (8x preview).
"""
import argparse, re
import numpy as np
from PIL import Image


def fit_axis(im, axis, lo=6.0, hi=40.0):
    """Period and phase of the pixel grid along one axis, from where colour changes."""
    d = (np.abs(np.diff(im, axis=axis)).sum(2) > 60).sum(1 - axis).astype(float)
    fits = []
    for p in np.arange(lo, hi, 0.02):
        best = (-1, 0)
        for ph in np.arange(0, p, 0.25):
            idx = np.round(np.arange(ph, len(d), p)).astype(int)
            idx = idx[idx < len(d)]
            # mean edge strength on the grid lines (a pixel boundary may land 1 px early)
            sc = (d[idx] + 0.5 * d[np.clip(idx - 1, 0, len(d) - 1)]).mean()
            if sc > best[0]:
                best = (sc, ph)
        fits.append((best[0], p, best[1]))
    # multiples of the true period fit as well as it does, so take the smallest period that fits well
    top = max(f[0] for f in fits)
    sc, p, ph = next(f for f in fits if f[0] >= 0.7 * top)
    # refine around it
    sc, p, ph = max((f for f in fits if abs(f[1] - p) < 0.6), key=lambda f: f[0])
    return p, ph


def sample(path):
    rgba = np.asarray(Image.open(path).convert("RGBA")).astype(int)
    rgb = rgba[..., :3].copy()
    rgb[rgba[..., 3] < 128] = 255
    px, phx = fit_axis(rgb, 1)
    py, phy = fit_axis(rgb, 0)
    nx, ny = int((rgb.shape[1] - phx) / px), int((rgb.shape[0] - phy) / py)
    out = np.zeros((ny, nx, 3), int)
    r = max(1, int(min(px, py) / 4))
    for j in range(ny):
        for i in range(nx):
            cx, cy = int(phx + px * (i + 0.5)), int(phy + py * (j + 0.5))
            out[j, i] = np.median(rgb[cy - r:cy + r, cx - r:cx + r].reshape(-1, 3), 0)
    bg = out.sum(2) > 3 * 232
    ys, xs = np.where(~bg)
    sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    print(f"grid {px:.2f} x {py:.2f} px -> {nx}x{ny}, creature {sl[1].stop - sl[1].start}x{sl[0].stop - sl[0].start}")
    return out[sl], bg[sl]


def read_pal(path):
    src = open(path).read()
    return {k: np.array([int(v[i:i + 2], 16) for i in (1, 3, 5)]) for k, v in re.findall(r'(\w): "(#[0-9a-fA-F]{6})"', src)}


def make_pal(px, bg, n):
    pts = Image.fromarray(px[~bg].reshape(1, -1, 3).astype(np.uint8))
    q = pts.quantize(colors=n, method=Image.Quantize.MEDIANCUT).getpalette()[:3 * n]
    cols = sorted((np.array(q[i:i + 3]) for i in range(0, len(q), 3)), key=lambda c: c @ [0.3, 0.59, 0.11])
    keys = "kabcdefghijmnpqrstuvwxyz"
    return {keys[i]: c for i, c in enumerate(cols)}


def drop(g, n, lo, hi):
    """Remove the n lines (rows of g) most like their neighbour, at least 4 apart."""
    cls = lambda c: "#" if c in LINES else c
    sc = sorted((sum(cls(a) != cls(b) for a, b in zip(g[i], g[i - 1])), i) for i in range(lo, hi))
    chosen = []
    for _, i in sc:
        if len(chosen) == n:
            break
        if all(abs(i - j) >= 4 for j in chosen):
            chosen.append(i)
    return [r for i, r in enumerate(g) if i not in chosen]


def clean(g, line, top):
    g = [["."] + r + ["."] for r in g]
    W = len(g[0]); g = [["."] * W] + g + [["."] * W]; H = len(g)
    nb = lambda x, y: [(x + dx, y + dy, dx, dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < W and 0 <= y + dy < H]
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if c == "." or c in LINES or any(g[Y][X] == c for X, Y, _, _ in nb(x, y)):
                continue
            ns = [g[Y][X] for X, Y, _, _ in nb(x, y)]
            if ns.count(".") >= 2:
                g[y][x] = "."
            elif ns.count(c) == 0 and all(n in LINES or n == "." for n in ns):
                pass  # a single highlight inside an outline: keep
            else:
                fill = [n for n in ns if n != "." and n not in LINES]
                if fill and len(set(fill)) < len(fill):
                    g[y][x] = max(set(fill), key=fill.count)
    # outline: every transparent pixel touching the body becomes line, and every line pixel on the edge is recoloured
    for y in range(H):
        for x in range(W):
            if g[y][x] == ".":
                body = [(dx, dy) for X, Y, dx, dy in nb(x, y) if g[Y][X] not in LINES and g[Y][X] != "."]
                if body:
                    g[y][x] = line if any(dx < 0 or dy < 0 for dx, dy in body) else top
    for y in range(H):
        for x in range(W):
            if g[y][x] in LINES:
                tr = [(dx, dy) for X, Y, dx, dy in nb(x, y) if g[Y][X] == "."]
                if tr:
                    g[y][x] = top if all(dx < 0 or dy < 0 for dx, dy in tr) else line
    rows = ["".join(r) for r in g]
    while all(r[0] == "." for r in rows): rows = [r[1:] for r in rows]
    while all(r[-1] == "." for r in rows): rows = [r[:-1] for r in rows]
    while set(rows[0]) == {"."}: rows = rows[1:]
    while set(rows[-1]) == {"."}: rows = rows[:-1]
    return rows


LINES = set()

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("draft"); ap.add_argument("out")
    ap.add_argument("--pal", help=".px.js file whose palette to map to")
    ap.add_argument("--exclude", default="", help="palette keys not to use (e.g. a belly colour)")
    ap.add_argument("--colors", type=int, default=15)
    ap.add_argument("--drop", type=int, nargs=2, default=(0, 0), metavar=("ROWS", "COLS"))
    ap.add_argument("--line", default="k"); ap.add_argument("--line-top", default=None)
    a = ap.parse_args()
    px, bg = sample(a.draft)
    pal = read_pal(a.pal) if a.pal else make_pal(px, bg, a.colors)
    pal = {k: v for k, v in pal.items() if k not in a.exclude}
    LINES.update({a.line, a.line_top or a.line})
    keys, cols = list(pal), np.array(list(pal.values()))
    g = [["." if bg[y, x] else keys[int(((cols - px[y, x]) ** 2).sum(1).argmin())] for x in range(px.shape[1])] for y in range(px.shape[0])]
    g = drop(g, a.drop[0], 3, len(g) - 4)
    g = [list(r) for r in zip(*drop([list(c) for c in zip(*g)], a.drop[1], 3, len(g[0]) - 3))]
    rows = clean(g, a.line, a.line_top or a.line)
    with open(a.out + ".txt", "w") as f:
        f.write("pal({\n" + "".join(f'  {k}: "#{v[0]:02x}{v[1]:02x}{v[2]:02x}",\n' for k, v in pal.items()) + "})\n\n")
        f.write("\n".join(rows) + "\n")
    im = Image.new("RGBA", (len(rows[0]), len(rows)))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != ".":
                im.putpixel((x, y), tuple(int(v) for v in pal[c]) + (255,))
    im.resize((im.width * 8, im.height * 8), Image.NEAREST).save(a.out + ".png")
    print(f"{len(rows[0])}x{len(rows)} grid, {len(set(''.join(rows)) - {'.'})} colours -> {a.out}.txt")
