"""Translate official-style concept art into a BW-style sprite base (the pixel-over start).

The BW front sprite is the official art's pose at sprite size (art/BW_STYLE.md). This does the
mechanical part of that translation; eyes, mouths and small details are finished by hand in the
creature's .px.js file.

  art -> background removed, cropped, mirrored to face left if needed
      -> area-downscaled to the target height (ink excluded from colour averages)
      -> line art rebuilt: the silhouette edge plus the art's ink lines, 1 px
      -> colours clustered into a small palette (Lab k-means), contrast and saturation pushed
         toward BW
      -> selective outline: black on the right/bottom, the neighbouring colour's dark tone on the
         top/left
      -> lone-pixel clean-up

Usage: python3 art2sprite.py ART OUT.png --height 44 [--flip] [--colors 11]
Writes OUT.png (96x96, feet at y 91) and OUT.txt (palette keys + grid for a .px.js file).
"""
import argparse, colorsys, math, random
from PIL import Image, ImageFilter


def remove_bg(im):
    im = im.convert("RGBA")
    px, (W, H) = im.load(), im.size
    if any(px[x, y][3] < 255 for x, y in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]):
        return im
    seen, st = set(), [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]
    while st:
        x, y = st.pop()
        if (x, y) in seen or not (0 <= x < W and 0 <= y < H):
            continue
        r, g, b, a = px[x, y]
        if r + g + b < 3 * 232:
            continue
        seen.add((x, y)); px[x, y] = (255, 255, 255, 0)
        st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im


def lum(c):
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255


def to_lab(c):
    def f(u):
        u /= 255; return ((u + 0.055) / 1.055) ** 2.4 if u > 0.04045 else u / 12.92
    r, g, b = (f(v) for v in c[:3])
    X, Y, Z = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.9505, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.089
    g_ = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return (116 * g_(Y) - 16, 500 * (g_(X) - g_(Y)), 200 * (g_(Y) - g_(Z)))


def kmeans(cols, k, iters=25):
    random.seed(1)
    labs = [to_lab(c) for c in cols]
    cent = [labs[i] for i in random.sample(range(len(labs)), min(k, len(labs)))]
    for _ in range(iters):
        groups = [[] for _ in cent]
        for i, p in enumerate(labs):
            j = min(range(len(cent)), key=lambda j: sum((p[t] - cent[j][t]) ** 2 for t in range(3)))
            groups[j].append(i)
        cent = [tuple(sum(labs[i][t] for i in g) / len(g) for t in range(3)) if g else cent[j] for j, g in enumerate(groups)]
    assign = [min(range(len(cent)), key=lambda j: sum((p[t] - cent[j][t]) ** 2 for t in range(3))) for p in labs]
    rgb = []
    for j in range(len(cent)):
        mem = [cols[i] for i in range(len(cols)) if assign[i] == j]
        rgb.append(tuple(round(sum(m[t] for m in mem) / len(mem)) for t in range(3)) if mem else (0, 0, 0))
    return rgb, assign


def punch(c, sat=1.35, con=1.18):
    h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in c))
    s = min(1, s * sat); l = min(1, max(0, 0.5 + (l - 0.5) * con))
    return tuple(round(v * 255) for v in colorsys.hls_to_rgb(h, l, s))


def dark(c, f=0.28):
    h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in c))
    return tuple(round(v * 255) for v in colorsys.hls_to_rgb(h, l * f, min(1, s * 1.1)))


def translate(art, height, flip=False, ncol=11, ink_t=0.30, ink_cov=0.22):
    """Majority-vote downscale: the art is split into colour regions at full size, then every
    sprite pixel takes the region covering most of it (no averaged, muddy colours)."""
    im = remove_bg(art)
    im = im.crop(im.getbbox())
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    W0, H0 = im.size
    src = im.load()
    pix = [(x, y, src[x, y]) for y in range(H0) for x in range(W0) if src[x, y][3] > 128]
    colour = [p for _, _, p in pix if lum(p) >= ink_t]
    random.seed(2)
    sample = random.sample(colour, min(6000, len(colour)))
    pal, _ = kmeans([c[:3] for c in sample], ncol)
    plab = [to_lab(c) for c in pal]
    near = {}
    def label(c):
        key = (c[0] >> 2, c[1] >> 2, c[2] >> 2)
        if key not in near:
            l = to_lab(c)
            near[key] = min(range(len(plab)), key=lambda j: sum((l[t] - plab[j][t]) ** 2 for t in range(3)))
        return near[key]
    s = height / H0
    w, h = max(1, round(W0 * s)), height
    votes = [dict() for _ in range(w * h)]
    cover = [0] * (w * h); inks = [0] * (w * h)
    for x, y, c in pix:
        i = min(h - 1, int(y * s)) * w + min(w - 1, int(x * s))
        cover[i] += 1
        if lum(c) < ink_t:
            inks[i] += 1
        else:
            k = label(c); votes[i][k] = votes[i].get(k, 0) + 1
    area = (1 / s) ** 2
    fill = [cover[i] / area > 0.45 for i in range(w * h)]
    ink = [fill[i] and inks[i] / area > ink_cov for i in range(w * h)]
    cl = [max(votes[i], key=votes[i].get) if fill[i] and votes[i] else -1 for i in range(w * h)]
    for i in range(w * h):                     # ink-only pixels take a neighbour's region
        if fill[i] and cl[i] < 0:
            nb = [cl[j] for j in (i - 1, i + 1, i - w, i + w) if 0 <= j < w * h and cl[j] >= 0]
            cl[i] = nb[0] if nb else 0
    pal = [punch(c, 1.15, 1.1) for c in pal]
    idx = [i for i in range(w * h) if fill[i]]
    for _ in range(2):                         # lone-pixel clean-up
        for i in idx:
            x, y = i % w, i // w
            nb = [cl[j] for j, ok in ((i - 1, x > 0), (i + 1, x < w - 1), (i - w, y > 0), (i + w, y < h - 1)) if ok and cl[j] >= 0]
            if len(nb) >= 3 and cl[i] not in nb:
                cl[i] = max(set(nb), key=nb.count)
    out = [None] * (w * h)
    isfill = lambda x, y: 0 <= x < w and 0 <= y < h and fill[y * w + x]
    for i in idx:
        x, y = i % w, i // w
        c = pal[cl[i]]
        if not isfill(x + 1, y) or not isfill(x, y + 1):
            out[i] = (16, 16, 16)
        elif not isfill(x - 1, y) or not isfill(x, y - 1):
            out[i] = dark(c)
        elif ink[i]:
            out[i] = (16, 16, 16) if lum(c) < 0.45 else dark(c, 0.35)
        else:
            out[i] = c
    return out, w, h


def save(out, w, h, path):
    canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    x0, y0 = 48 - w // 2, 92 - h
    for i, c in enumerate(out):
        if c:
            canvas.putpixel((x0 + i % w, y0 + i // w), (*[int(v) for v in c], 255))
    canvas.save(path)
    return canvas


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("art"); ap.add_argument("out")
    ap.add_argument("--height", type=int, default=44)
    ap.add_argument("--flip", action="store_true")
    ap.add_argument("--colors", type=int, default=11)
    a = ap.parse_args()
    out, w, h = translate(Image.open(a.art), a.height, a.flip, a.colors)
    save(out, w, h, a.out)


def to_grid(out, w, h, keys="abcdefghijmnopqrstuvwxyzABCDEGHIJKLMNOPQRSTUVWXYZ"):
    """Palette + grid text for a .px.js file: {key: '#rrggbb'}, rows ('.' = empty)."""
    cols, pal, rows = {}, {}, []
    for y in range(h):
        r = ""
        for x in range(w):
            c = out[y * w + x]
            if not c:
                r += "."; continue
            c = tuple(int(v) for v in c[:3])
            if c not in cols:
                k = "k" if c == (16, 16, 16) else keys[len(cols)]
                cols[c] = k; pal[k] = "#%02x%02x%02x" % c
            r += cols[c]
        rows.append(r)
    return pal, rows


def translate_keys(art, height, flip, cents, keymap, ink_key="k", ink_t=0.12, ink_cov=0.3, line_of=None):
    """Material-aware translation: every art pixel goes to its nearest colour centre, centres
    map by hand to palette keys (material + tone); each sprite pixel takes the majority key.
    Lines: the silhouette edge (black right/bottom, the material's line key top/left) and the
    art's ink where it covers enough of a pixel. Returns a list of rows of keys ('.' = empty)."""
    im = remove_bg(art)
    im = im.crop(im.getbbox())
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    W0, H0 = im.size
    src = im.load()
    labs = [to_lab(c) for c in cents]
    near = {}
    def key(c):
        q = (c[0] >> 2, c[1] >> 2, c[2] >> 2)
        if q not in near:
            l = to_lab(c)
            near[q] = keymap[min(range(len(labs)), key=lambda j: sum((l[t] - labs[j][t]) ** 2 for t in range(3)))]
        return near[q]
    s = height / H0
    w, h = max(1, round(W0 * s)), height
    votes = [dict() for _ in range(w * h)]
    cover = [0] * (w * h); inks = [0] * (w * h)
    for y in range(H0):
        for x in range(W0):
            c = src[x, y]
            if c[3] < 128:
                continue
            i = min(h - 1, int(y * s)) * w + min(w - 1, int(x * s))
            cover[i] += 1
            k = key(c)
            if k == ink_key or lum(c) < ink_t:
                inks[i] += 1
            else:
                votes[i][k] = votes[i].get(k, 0) + 1
    area = (1 / s) ** 2
    fill = [cover[i] / area > 0.45 for i in range(w * h)]
    g = [max(votes[i], key=votes[i].get) if fill[i] and votes[i] else None for i in range(w * h)]
    for i in range(w * h):
        if fill[i] and g[i] is None:
            nb = [g[j] for j in (i - 1, i + 1, i - w, i + w) if 0 <= j < w * h and g[j]]
            g[i] = nb[0] if nb else ink_key
    idx = [i for i in range(w * h) if fill[i]]
    for _ in range(2):
        for i in idx:
            x, y = i % w, i // w
            nb = [g[j] for j, ok in ((i - 1, x > 0), (i + 1, x < w - 1), (i - w, y > 0), (i + w, y < h - 1)) if ok and g[j]]
            if len(nb) >= 3 and g[i] not in nb:
                g[i] = max(set(nb), key=nb.count)
    line_of = line_of or {}
    isfill = lambda x, y: 0 <= x < w and 0 <= y < h and fill[y * w + x]
    rows = []
    for y in range(h):
        r = ""
        for x in range(w):
            i = y * w + x
            if not fill[i]:
                r += "."
            elif not isfill(x + 1, y) or not isfill(x, y + 1):
                r += ink_key
            elif not isfill(x - 1, y) or not isfill(x, y - 1):
                r += line_of.get(g[i], ink_key)
            elif inks[i] / area > ink_cov:
                r += line_of.get(g[i], ink_key)
            else:
                r += g[i]
        rows.append(r)
    return rows
