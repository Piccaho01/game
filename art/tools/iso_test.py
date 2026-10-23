"""Isometric test (owner asked: can we match the concept's 2.5D look?). A corner of Hollow Rest drawn
in 2:1 isometric: ground textures from the swatch-palette terrain tiles projected onto diamonds,
terraces with real side faces, the owner's set pieces on diamond footprints, Callum standing in it.

Not wired into the game: a mockup for approval. Usage: python3 art/tools/iso_test.py OUT.png
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, os.path.dirname(__file__))
from terrain import P, build as build_terrain  # noqa: E402

TW, TH, HZ = 32, 16, 16          # diamond size; pixels per height level

atlas = Image.open(os.path.join(ROOT, 'locations', 'out', 'terrain.png')).convert('RGBA')
frames = {k: v['frame'] for k, v in json.load(open(os.path.join(ROOT, 'locations', 'out', 'terrain.json')))['frames'].items()}


def fr(n):
    f = frames[n]
    return atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))


# ---------- the test patch ----------
W, H = 15, 15
# z: 0 = no ground (mist), 1 = lower terrace, 2 = upper terrace
Z = np.ones((H, W), int)
Z[:5, :] = 2
Z[5, 9:] = 2
for y in range(H):
    for x in range(W):
        if x + y > 23 or (y > 11 and x > 10) or (x > 12 and y > 8):
            Z[y, x] = 0
kind = [['grass'] * W for _ in range(H)]
def put(x, y, k): kind[y][x] = k
# paths: cottage door down the stairs to the crater; scorch round the crater; a pond
for y in range(2, 8): put(6, y, 'path')
for x in range(6, 10): put(x, 8, 'path')
for y in range(8, 12): put(5, y, 'path')
for y in range(7, 13):
    for x in range(7, 12):
        if ((x - 9.2) / 2.9) ** 2 + ((y - 9.6) / 2.6) ** 2 < 1: put(x, y, 'dirt')
for y in range(9, 12):
    for x in range(1, 4):
        if ((x - 2) / 1.6) ** 2 + ((y - 10) / 1.4) ** 2 < 1: put(x, y, 'water')
STAIRS = {(6, 5)}                       # going down from the upper terrace toward +y
objects = [('cottage', 2, 1, 2, 3), ('crater', 8, 8, 3, 3), ('shed', 11, 3, 2, 2)]
trees = [(0, 0), (1, 0), (4, 0), (12, 0), (13, 1), (0, 6), (0, 7), (13, 5), (10, 1)]
details = [('flowers_r', 3, 6), ('tuft', 8, 6), ('tuft', 2, 7), ('flowers_w', 10, 4), ('tuft', 12, 7), ('tuft', 4, 12), ('tuft', 9, 3)]
player = (6, 7)


# ---------- ground texture: compose top-down, then project each tile onto its diamond ----------
def ground_tile(x, y):
    k = kind[y][x]
    t = fr(f'grass_{(x * 7 + y * 3) % 4}').copy()
    if k in ('path', 'dirt', 'water'):
        def same(dx, dy):
            xx, yy = x + dx, y + dy
            if not (0 <= xx < W and 0 <= yy < H) or Z[yy, xx] == 0: return True
            if (xx, yy) in STAIRS and k == 'path': return True
            return kind[yy][xx] == k
        suf = '_a' if k == 'water' else ''
        mask = same(0, -1) * 1 + same(1, 0) * 2 + same(0, 1) * 4 + same(-1, 0) * 8
        o = fr(f'{k}_{mask}{suf}'); t.alpha_composite(o)
        for c, (dx, dy) in {'ne': (1, -1), 'se': (1, 1), 'sw': (-1, 1), 'nw': (-1, -1)}.items():
            if same(dx, 0) and same(0, dy) and not same(dx, dy):
                t.alpha_composite(fr(f'{k}_nub_{c}{suf}'))
    return np.asarray(t)


def project(tile):
    """A 16x16 top-down tile onto a 32x16 diamond (nearest-neighbour inverse map)."""
    out = np.zeros((TH, TW, 4), np.uint8)
    for sy in range(TH):
        for sx in range(TW):
            u, v = sx - 15.5, sy + 0.5            # relative to the top corner
            a = v + u / 2                          # tile-space x
            b = v - u / 2                          # tile-space y
            if 0 <= a < 16 and 0 <= b < 16:
                out[sy, sx] = tile[int(b), int(a)]
    return out


def screen(x, y, z):
    """Top-left of a tile's 32x16 box on the canvas."""
    return OX + (x - y) * TW // 2, OY + (x + y) * TH // 2 - z * HZ


def face(canvas, sx, sy, side, depth, seed, lip=True, ragged=False):
    """A side face below a tile's edge: 'l' toward +y (lit), 'r' toward +x (in shade). Rock as
    irregular boulders: each a blob in face space (along the edge, down), lit on its top-left,
    dark seams between; the grass lip hangs over the top; edges over the mist end ragged."""
    rng = np.random.default_rng(seed)
    lit = side == 'l'
    tone = {'hi': P['s_hi'] if lit else P['s_lt'], 'mid': P['s_lt'] if lit else P['s'], 'lo': P['s'] if lit else P['s_dk'], 'seam': P['s_ol']}
    # boulder centres in face space (c along the 16 px edge, d down from the top)
    cells = []
    d0 = 0
    while d0 < depth + 8:
        c0 = -int(rng.integers(0, 6))
        h = int(rng.integers(5, 9))
        while c0 < 20:
            w = int(rng.integers(5, 10))
            cells.append((c0 + w / 2, d0 + h / 2, w / 2, h / 2))
            c0 += w
        d0 += h
    cut = [depth - (int(rng.integers(0, 8)) + (c * 7) % 5 if ragged else 0) for c in range(16)]
    for c in range(16):
        x = sx + c if lit else sx + 16 + c
        top = sy + 8 + c // 2 if lit else sy + 15 - c // 2
        for d in range(max(0, cut[c])):
            yy = top + d + 1
            if not (0 <= x < canvas.shape[1] and 0 <= yy < canvas.shape[0]): continue
            # the boulder this pixel sits in, and where in it
            best, pos = None, 9.0
            for (cc, dd, rw, rh) in cells:
                q = ((c - cc) / rw) ** 2 + ((d - dd) / rh) ** 2
                if q < pos: best, pos = (cc, dd, rw, rh), q
            if pos > 0.82:
                col = tone['seam']
            else:
                cc, dd, rw, rh = best
                col = tone['hi'] if (d - dd) / rh + (c - cc) / rw * 0.5 < -0.55 else tone['lo'] if (d - dd) / rh > 0.45 else tone['mid']
            if ragged and d >= cut[c] - 2: col = tone['seam']
            if lip and d < 3:
                col = P['g_md'] if d == 0 else P['g_dk'] if d == 1 else (P['g_dp'] if (c * 5 + seed) % 4 == 0 else col)
            canvas[yy, x] = (*col, 255)


def paste(canvas, img, x, y):
    a = np.asarray(img)
    h, w = a.shape[:2]
    for yy in range(h):
        for xx in range(w):
            if a[yy, xx, 3] and 0 <= y + yy < canvas.shape[0] and 0 <= x + xx < canvas.shape[1]:
                canvas[y + yy, x + xx] = a[yy, xx]


def stairs(canvas, x, y, z_top):
    """Stone steps down toward +y from z_top to z_top - 1: four slabs, each with a riser under
    its front edge; dark cheek stones on both sides."""
    sx, sy = screen(x, y, 0)
    for k in range(4):
        h = int((z_top - (k + 1) / 4) * HZ)
        for py in range(TH):
            for px in range(TW):
                u, v = px - 15.5, py + 0.5
                a, b = v + u / 2, v - u / 2
                if 0 <= a < 16 and 4 * k <= b < 4 * k + 4:
                    col = P['s_hi'] if b < 4 * k + 1.2 else P['s_lt']
                    if a < 2.5 or a >= 13.5: col = P['s_dk']
                    canvas[sy - h + py, sx + px] = (*col, 255)
        # riser: below the slab's front edge (b = 4k + 4), HZ/4 tall
        b = 4 * k + 4
        for a2 in range(32):
            a = a2 / 2
            ex = int(round(sx + 15.5 + a - b))
            ey = int(sy - h + (a + b) / 2)
            for d in range(1, HZ // 4 + 1):
                col = P['s_ol'] if d == HZ // 4 or a < 2.5 or a >= 13.5 else P['s']
                if 0 <= ey + d < canvas.shape[0] and 0 <= ex < canvas.shape[1]:
                    canvas[ey + d, ex] = (*col, 255)


def mist_bg(w, h):
    bg = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        t = y / h
        col = np.array(P['mist_hi']) * (1 - t) + np.array(P['mist_md']) * t
        bg[y, :, :3] = col.astype(np.uint8)
        bg[y, :, 3] = 255
    rng = np.random.default_rng(3)
    for _ in range(14):                       # soft cloud banks
        cx, cy, cw = int(rng.integers(0, w)), int(rng.integers(h // 3, h)), int(rng.integers(30, 90))
        for k in range(4):
            bg[cy + k:cy + k + 1, max(0, cx - cw // 2 + 6 * k // 2):min(w, cx + cw // 2 - 3 * k)] = (*P['mist_hi'], 255) if k < 2 else (*P['mist'], 255)
    return bg


# ---------- draw ----------
CW, CH = 560, 400
OX, OY = CW // 2 - 16 + 20, 60
canvas = mist_bg(CW, CH)

# Painter's order: back to front by x + y; within a tile, faces then top.
order = sorted(((x, y) for y in range(H) for x in range(W) if Z[y, x] > 0), key=lambda p: (p[0] + p[1], p[0]))
sprites = []   # (sort key, image, x, y)
for (x, y) in order:
    z = Z[y, x]
    sx, sy = screen(x, y, z)
    zl = Z[y + 1, x] if y + 1 < H else 0      # neighbour toward +y (lower-left face)
    zr = Z[y, x + 1] if x + 1 < W else 0      # neighbour toward +x (lower-right face)
    if (x, y) in STAIRS:
        stairs(canvas, x, y, Z[y - 1, x])
        continue
    if zl < z:
        face(canvas, sx, sy, 'l', (z - zl) * HZ + (40 if zl == 0 else 0), x * 31 + y, ragged=zl == 0)
    if zr < z:
        face(canvas, sx, sy, 'r', (z - zr) * HZ + (40 if zr == 0 else 0), x * 17 + y * 5, ragged=zr == 0)
    top = project(ground_tile(x, y))
    for py in range(TH):
        for px in range(TW):
            if top[py, px, 3]: canvas[sy + py, sx + px] = top[py, px]

def anchor_bottom(img, x, y, z, key):
    sx, sy = screen(x, y, z)
    sprites.append((key, img, sx + 16 - img.width // 2, sy + 12 - img.height))

for (x, y) in trees:
    anchor_bottom(fr('tree'), x, y, Z[y, x], x + y + 0.5)
DECALS = {'crater'}
for name, x, y, wx, wy in objects:
    img = Image.open(os.path.join(ROOT, 'locations', 'out', f'{name}.png'))
    a = np.asarray(img)[:, :, 3] > 0
    ys, xs = np.where(a)
    fx = int(xs[ys == ys.max()].mean())       # the sprite's front corner
    # the footprint's front corner: bottom point of tile (x + wx - 1, y + wy - 1)
    sx, sy = screen(x + wx - 1, y + wy - 1, Z[y, x])
    key = -1 if name in DECALS else x + wx + y + wy - 2 + 0.6
    sprites.append((key, img, sx + 16 - fx, sy + TH - img.height + 1))
for name, x, y in details:
    t = Image.new('RGBA', (7, 6))
    pal = {'tuft': (P['g_dk'], P['g_hi']), 'flowers_r': (P['fl_r'], P['fl_c']), 'flowers_w': (P['fl_w'], P['fl_c'])}[name]
    for dx, dy, c in ((0, 3, 0), (1, 2, 0), (2, 1, 0), (3, 2, 0), (4, 3, 0), (2, 4, 0), (1, 1, 1), (3, 1, 1), (5, 4, 0)):
        t.putpixel((dx, dy), (*(pal[c] if name != 'tuft' or c == 0 else P['g_hi']), 255))
    anchor_bottom(t, x, y, Z[y, x], x + y + 0.3)
TUFT = ['..g..', '.gGg.', 'gGdGg', '.ddd.']
def tuft_img(seed):
    t = Image.new('RGBA', (5, 4))
    cols = {'g': P['g_dk'], 'G': P['g_hi'] if seed % 2 else P['g_md'], 'd': P['g_dp']}
    for yy, row in enumerate(TUFT):
        for xx, ch in enumerate(row):
            if ch != '.': t.putpixel((xx, yy), (*cols[ch], 255))
    return t
rng = np.random.default_rng(9)
for (x, y) in order:
    if kind[y][x] != 'grass' or (x, y) in STAIRS: continue
    for k in range(int(rng.integers(1, 3))):
        sx, sy = screen(x, y, Z[y, x])
        ox, oy = int(rng.integers(6, 22)), int(rng.integers(3, 12))
        sprites.append((x + y + 0.2, tuft_img(int(rng.integers(4))), sx + ox, sy + oy))
walk = Image.open(os.path.join(ROOT, 'trainers', 'out', 'callum_walk.png')).crop((0, 0, 24, 32))
anchor_bottom(walk, player[0], player[1], Z[player[1], player[0]], player[0] + player[1] + 0.5)
for _, img, x, y in sorted(sprites, key=lambda s: s[0]):
    paste(canvas, img, x, y)

out = Image.fromarray(canvas, 'RGBA')
out.save(sys.argv[1])
out.resize((CW * 2, CH * 2), Image.NEAREST).save(sys.argv[1].replace('.png', '_2x.png'))
print('wrote', sys.argv[1])
