"""Paints Verrow's overworld tileset (BW2-style, 16 px tiles) into one atlas.

The look: bright BW2 greens and sand, dark coloured outlines (never black), light from the top
left. Verrow was stitched together from scraps of the friends' lives, so man-made things show it:
roofs carry taped-on patch panels, the sanctuary ruins glow with PATCH's CRT blue.

Writes art/tiles/out/verrow.png and verrow.json (Phaser atlas, JSON hash). Frames:
  grass_0..3, tall_a/b, flowers_a/b, path_<mask>, water_<mask>_a/b (mask: 4 bits, which sides
  are the same terrain: 1 up, 2 right, 4 down, 8 left), path_nub_<corner>, water_nub_<corner>_a/b
  (corner: ne, se, sw, nw: the inside corner where two same sides meet but the diagonal doesn't),
  ledge_<l|m|r>, fence_<l|m|r|s>, ruin_<top|face>, plaza_0..1, sign,
  objects: tree, house_rust, house_blue, shrine.
Usage: python3 art/tools/tileset.py [preview.png]
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
T = 16

# ---------- palette ----------
def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

P = {k: rgb(v) for k, v in {
    # grass
    'g_hi': '#a8e070', 'g_lt': '#88d058', 'g': '#68b848', 'g_dk': '#4c9a3c', 'g_dp': '#33733a',
    # sand path
    'p_hi': '#f6e6b4', 'p': '#e8d098', 'p_dk': '#cfb27a', 'p_dp': '#a8885a',
    # water
    'w_hi': '#e6f6ff', 'w_lt': '#9ed4f8', 'w': '#5ca4e8', 'w_dk': '#3d7ccc', 'w_dp': '#2b5a9c',
    # trees
    't_hi': '#9ad468', 't_lt': '#6cb44c', 't': '#4c943c', 't_dk': '#35723a', 't_ol': '#1f4630',
    'bark': '#8a5c3c', 'bark_dk': '#5e3c2c',
    # buildings (UI theme: rust, paper, faded blue, tape)
    'r_hi': '#ec8a5c', 'r': '#c2502f', 'r_dk': '#963a26', 'r_ol': '#5c2420',
    'b_hi': '#8fb4e0', 'b': '#5a84c0', 'b_dk': '#3e5f96', 'b_ol': '#26365c',
    'wall_hi': '#fbf4e0', 'wall': '#f0e4c4', 'wall_dk': '#d4c29a', 'wall_ol': '#6e5c48',
    'wood': '#9a6a44', 'wood_dk': '#6a4430', 'brass': '#f2c14e',
    'glass': '#7fb8e8', 'glass_hi': '#d8f0ff', 'glass_dk': '#4a78b0',
    'tape': '#e9d9a8', 'tape_dk': '#c4b07c',
    # stone, ruins
    's_hi': '#dcd8cc', 's': '#b8b2a2', 's_dk': '#8c8676', 's_ol': '#4e4a44',
    'crt': '#4aa8ff', 'crt_hi': '#a6d8ff',
    'flower_r': '#f0607a', 'flower_y': '#f8d848', 'flower_w': '#ffffff',
    'shadow': '#000000',
}.items()}


class Canvas:
    def __init__(self, w, h):
        self.a = np.zeros((h, w, 4), np.uint8)
        self.w, self.h = w, h

    def px(self, x, y, c, alpha=255):
        if 0 <= x < self.w and 0 <= y < self.h:
            col = (rgb(c) if c.startswith('#') else P[c]) if isinstance(c, str) else c
            if alpha >= 255:
                self.a[y, x] = (*col, 255)
            else:
                base = self.a[y, x].astype(float)
                k = alpha / 255
                if base[3] == 0:
                    self.a[y, x] = (*col, alpha)
                else:
                    self.a[y, x, :3] = (base[:3] * (1 - k) + np.array(col) * k).astype(np.uint8)

    def rect(self, x, y, w, h, c, alpha=255):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c, alpha)

    def get(self, x, y):
        return self.a[y, x]

    def blit(self, other, ox, oy):
        for y in range(other.h):
            for x in range(other.w):
                if other.a[y, x, 3] and 0 <= ox + x < self.w and 0 <= oy + y < self.h:
                    if other.a[y, x, 3] == 255:
                        self.a[oy + y, ox + x] = other.a[y, x]
                    else:
                        self.px(ox + x, oy + y, tuple(other.a[y, x, :3]), int(other.a[y, x, 3]))

    def outline(self, c):
        """A 1px outline around everything drawn (4-neighbour), outside the shape."""
        m = self.a[:, :, 3] > 0
        edge = np.zeros_like(m)
        edge[1:] |= m[:-1]; edge[:-1] |= m[1:]; edge[:, 1:] |= m[:, :-1]; edge[:, :-1] |= m[:, 1:]
        edge &= ~m
        for y, x in zip(*np.where(edge)):
            self.a[y, x] = (*P[c], 255)


def rng(seed):
    return np.random.default_rng(seed)


# ---------- ground ----------
def grass(seed):
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 'g')
    r = rng(seed)
    for _ in range(5):
        c.px(int(r.integers(T)), int(r.integers(T)), 'g_lt')
    for _ in range(2):
        x, y = int(r.integers(1, T - 4)), int(r.integers(2, T - 1))
        # a little tuft: two dark blades, light tips
        c.px(x, y, 'g_dk'); c.px(x + 2, y, 'g_dk'); c.px(x + 1, y + 1, 'g_dk')
        c.px(x, y - 1, 'g_lt'); c.px(x + 2, y - 1, 'g_lt')
    return c


def tall(frame):
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 'g_dk')
    sway = 1 if frame else 0
    for row, y0 in enumerate((1, 8)):
        for i in range(4):
            x0 = i * 4 + (2 if row else 0) - 1
            # one blade clump: pointed top, light left face, dark right face, deep base
            tip = x0 + 1 + (sway if (i + row) % 2 == 0 else 0)
            c.px(tip, y0, 'g_hi')
            c.px(x0, y0 + 1, 'g_lt'); c.px(x0 + 1, y0 + 1, 'g_lt'); c.px(x0 + 2, y0 + 1, 'g')
            for yy in range(y0 + 2, y0 + 6):
                c.px(x0 - 1, yy, 'g_lt'); c.px(x0, yy, 'g_lt'); c.px(x0 + 1, yy, 'g'); c.px(x0 + 2, yy, 'g'); c.px(x0 + 3, yy, 'g_dk')
            c.px(x0, y0 + 6, 'g_dp'); c.px(x0 + 1, y0 + 6, 'g_dp'); c.px(x0 + 2, y0 + 6, 'g_dp')
    return c


def flowers(frame, seed=7):
    c = grass(seed)
    spots = [(3, 3, 'flower_r'), (11, 4, 'flower_y'), (6, 10, 'flower_w'), (13, 12, 'flower_r')]
    for x, y, col in spots:
        x += frame if col != 'flower_w' else 0
        c.px(x, y + 2, 'g_dk')
        c.px(x - 1, y, col); c.px(x + 1, y, col); c.px(x, y - 1, col); c.px(x, y + 1, col)
        c.px(x, y, 'flower_y' if col != 'flower_y' else 'r')
    return c


# Edge depth per column/row: a hand-tuned wobble so edges look organic, not ruled.
WOBBLE = [3, 3, 2, 3, 4, 3, 3, 2, 2, 3, 3, 4, 3, 2, 3, 3]


def edge_tile(base_fn, mask, edge_draw):
    """Terrain with grass encroaching on every side whose neighbour isn't the same terrain."""
    c = base_fn()
    sides = {'n': not mask & 1, 'e': not mask & 2, 's': not mask & 4, 'w': not mask & 8}
    for y in range(T):
        for x in range(T):
            d = []
            if sides['n']: d.append(y - WOBBLE[x] + 1)
            if sides['s']: d.append((T - 1 - y) - WOBBLE[(x + 5) % T] + 1)
            if sides['w']: d.append(x - WOBBLE[(y + 3) % T] + 1)
            if sides['e']: d.append((T - 1 - x) - WOBBLE[(y + 9) % T] + 1)
            if not d:
                continue
            m = min(d)
            # round the corners where two edges meet
            if sides['n'] and sides['w'] and x + y < 6: m = min(m, -1)
            if sides['n'] and sides['e'] and (T - 1 - x) + y < 6: m = min(m, -1)
            if sides['s'] and sides['w'] and x + (T - 1 - y) < 6: m = min(m, -1)
            if sides['s'] and sides['e'] and (T - 1 - x) + (T - 1 - y) < 6: m = min(m, -1)
            edge_draw(c, x, y, m)
    return c


def path_base():
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 'p')
    r = rng(3)
    for _ in range(4):
        c.px(int(r.integers(T)), int(r.integers(T)), 'p_hi')
    for _ in range(3):
        x, y = int(r.integers(1, T - 1)), int(r.integers(1, T - 1))
        c.px(x, y, 'p_dk'); c.px(x + 1, y, 'p_dk')
    return c


def path_edge(c, x, y, m):
    if m < 0:
        c.px(x, y, 'g' if (x * 7 + y * 3) % 11 else 'g_lt')
    elif m == 0:
        c.px(x, y, 'g_dk')   # grass lip casts a dark line onto the sand
    elif m == 1:
        c.px(x, y, 'p_dk')


def water_base(frame):
    def f():
        c = Canvas(T, T)
        c.rect(0, 0, T, T, 'w')
        for i, (x, y) in enumerate([(2, 3), (9, 6), (4, 11), (11, 13)]):
            x = (x + frame * 2 + i) % T
            for k in range(4):
                c.px((x + k) % T, y, 'w_lt' if k in (1, 2) else 'w_dk' if k == 3 else 'w_lt')
        return c
    return f


def water_edge(frame):
    def draw(c, x, y, m):
        if m < 0:
            c.px(x, y, 'g')
        elif m == 0:
            c.px(x, y, 'w_dp')     # bank outline
        elif m == 1:
            c.px(x, y, 'w_hi' if (x + y + frame) % 3 else 'w_lt')   # foam
        elif m == 2:
            c.px(x, y, 'w_lt')
    return draw


def nub(base, colour_fn, corner):
    """An inside corner: grass pokes into the terrain at one diagonal."""
    c = base()
    for y in range(T):
        for x in range(T):
            dx = x if 'w' in corner else T - 1 - x
            dy = y if 'n' in corner else T - 1 - y
            dist = dx + dy
            if dist < 3: colour_fn(c, x, y, -1)
            elif dist == 3: colour_fn(c, x, y, 0)
            elif dist == 4: colour_fn(c, x, y, 1)
    return c


def ledge(part):
    """A one-step cliff: grass top, earth face along the bottom."""
    c = grass(11)
    for x in range(T):
        top = 9 + (1 if (x * 5) % 7 == 0 else 0)
        c.px(x, top, 'g_dk')
        for y in range(top + 1, T - 1):
            c.px(x, y, 'p_dk' if y < top + 3 else 'p_dp')
        c.px(x, T - 1, 't_ol')
        c.px(x, top + 1, 'g_dp')
    if part == 'l':
        for y in range(9, T): c.px(0, y, 't_ol')
    if part == 'r':
        for y in range(9, T): c.px(T - 1, y, 't_ol')
    return c


def fence(part):
    c = grass(13)
    for y in (6, 10):
        x0 = 0 if part in 'mr' else 7
        x1 = T if part in 'lm' else 9
        c.rect(x0, y, x1 - x0, 2, 'wood')
        c.rect(x0, y + 2, x1 - x0, 1, 'wood_dk')
    for px in ([7] if part != 's' else [7]):
        c.rect(px, 3, 3, 11, 'wood')
        c.rect(px + 2, 4, 1, 10, 'wood_dk')
        c.px(px, 3, 'tape'); c.px(px + 1, 3, 'tape')
        c.rect(px - 1, 14, 5, 1, 'g_dp')
    return c


def ruin(part):
    """Sanctuary walls: weathered stone, moss, and now and then one of PATCH's glowing glyphs."""
    c = Canvas(T, T)
    if part == 'top':
        c.rect(0, 0, T, T, 's_hi')
        for x in range(T):
            c.px(x, T - 1, 's')
        c.px(4, 5, 's'); c.px(5, 5, 's'); c.px(11, 9, 's'); c.px(2, 11, 'g_lt'); c.px(3, 11, 'g'); c.px(12, 3, 'g')
    else:
        c.rect(0, 0, T, T, 's')
        for y in (5, 11):
            c.rect(0, y, T, 1, 's_dk')
        for x, y0, y1 in ((5, 0, 5), (12, 0, 5), (2, 6, 11), (9, 6, 11), (6, 12, 16), (13, 12, 16)):
            c.rect(x, y0, 1, y1 - y0, 's_dk')
        c.rect(0, 0, T, 1, 's_hi')
        # moss creeping up from the ground
        for x in range(T):
            h = (x * 7) % 4
            for y in range(T - h, T):
                c.px(x, y, 'g_dk' if y > T - 2 else 'g')
    return c


def ruin_glyph():
    c = ruin('face')
    for x, y in ((6, 6), (7, 7), (8, 6), (7, 8), (7, 9), (6, 9), (8, 9)):
        c.px(x, y, 'crt_hi')
    for x, y in ((5, 6), (9, 6), (7, 10)):
        c.px(x, y, 'crt')
    return c


def plaza(seed):
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 's_hi')
    c.rect(0, 7, T, 1, 's'); c.rect(7 if seed else 3, 0, 1, 7, 's'); c.rect(11 if seed else 12, 8, 1, 8, 's')
    r = rng(seed + 20)
    for _ in range(3):
        c.px(int(r.integers(T)), int(r.integers(T)), 's')
    if seed:
        c.px(2, 13, 'g'); c.px(3, 13, 'g_lt'); c.px(3, 14, 'g')
    return c


def sign():
    c = grass(17)
    c.rect(7, 9, 2, 6, 'wood_dk')
    c.rect(1, 2, 14, 8, 'wood_dk')
    c.rect(2, 3, 12, 6, 'wood')
    c.rect(2, 3, 12, 1, 'p_hi')
    c.rect(4, 5, 8, 1, 'wood_dk'); c.rect(4, 7, 6, 1, 'wood_dk')
    c.rect(3, 15, 10, 1, 'g_dk')
    return c


# ---------- objects ----------
def blob(c, cx, cy, rx, ry, col):
    for y in range(c.h):
        for x in range(c.w):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                c.px(x, y, col)


def tree():
    """A round BW2 tree, 20x30, anchored bottom-centre on its tile."""
    c = Canvas(20, 30)
    # trunk
    c.rect(8, 21, 4, 7, 'bark'); c.rect(10, 21, 2, 7, 'bark_dk')
    # canopy: dark mass, mid, then lit clumps top-left
    blob(c, 10, 12, 9.5, 10.5, 't_dk')
    blob(c, 9.5, 11, 8.5, 9, 't')
    for cx, cy, r in ((7, 7, 3.5), (12, 6, 3), (5, 12, 3), (10, 11, 3.2), (14, 12, 2.5)):
        blob(c, cx, cy, r, r * 0.85, 't_lt')
    for cx, cy in ((6, 5), (11, 4), (4, 10), (9, 9)):
        c.px(cx, cy, 't_hi'); c.px(cx + 1, cy, 't_hi')
    for x in range(3, 17):
        c.px(x, 20, 't_dk')
    out = Canvas(22, 31)
    out.blit(c, 1, 0)
    out.outline('t_ol')
    # ground shadow
    for x in range(5, 17):
        out.px(x, 30, 'shadow', 60)
    return out


def house(roof):
    """A Hollow Rest cottage: 80 px wide, 5 tiles; roof with a taped-on patch panel."""
    R = {'rust': ('r_hi', 'r', 'r_dk', 'r_ol', 'b'), 'blue': ('b_hi', 'b', 'b_dk', 'b_ol', 'r')}[roof]
    hi, mid, dk, ol, patch = R
    W, H = 80, 72
    c = Canvas(W, H)
    # walls (bottom 30 px)
    wy = 42
    c.rect(4, wy, W - 8, H - wy - 2, 'wall')
    for y in range(wy + 4, H - 2, 5):
        c.rect(4, y, W - 8, 1, 'wall_dk')
    c.rect(4, wy, W - 8, 2, 'wall_dk')        # roof shadow on the wall
    c.rect(4, wy + 2, 2, H - wy - 4, 'wall_hi')
    # windows
    for wx in (10, 54):
        c.rect(wx, wy + 7, 16, 12, 'wall_ol')
        c.rect(wx + 1, wy + 8, 14, 10, 'glass')
        c.rect(wx + 1, wy + 8, 14, 3, 'glass_hi')
        c.rect(wx + 8, wy + 8, 1, 10, 'wall_ol')
        c.rect(wx + 1, wy + 13, 14, 1, 'wall_ol')
        c.rect(wx, wy + 19, 16, 3, 'wood')                 # flower box
        for i, col in enumerate(('flower_r', 'flower_y', 'flower_r', 'flower_w', 'flower_y')):
            c.px(wx + 2 + i * 3, wy + 18, col)
    # door
    dx = 32
    c.rect(dx, wy + 6, 16, H - wy - 8, 'wall_ol')
    c.rect(dx + 1, wy + 7, 14, H - wy - 9, 'wood')
    c.rect(dx + 1, wy + 7, 14, 2, 'wood_dk')
    c.rect(dx + 7, wy + 9, 1, H - wy - 11, 'wood_dk')
    c.px(dx + 11, wy + 17, 'brass'); c.px(dx + 11, wy + 18, 'brass')
    c.rect(dx - 2, H - 3, 20, 2, 's')                    # doorstep
    # roof: from above-front, eaves overhanging the walls
    for y in range(0, wy + 1):
        inset = max(0, 8 - y // 2) if y < 16 else 0
        c.rect(inset, y, W - 2 * inset, 1, mid)
    for y in range(3, wy, 5):
        for x in range(0, W):
            if c.get(x, y)[3]:
                c.px(x, y, dk)
        off = 0 if (y // 5) % 2 else 3
        for x in range(off, W, 6):
            if c.get(x, y + 1)[3] and y + 4 < wy:
                c.rect(x, y + 1, 1, 4, dk)
    for x in range(0, W):
        if c.get(x, 0)[3]: c.px(x, 0, hi)
    c.rect(0, wy - 2, W, 2, dk)
    c.rect(0, wy, W, 1, ol)
    # the patch: an odd-coloured panel taped onto the roof
    px0, py0 = 50, 14
    c.rect(px0, py0, 18, 12, P[patch])
    c.rect(px0, py0 + 11, 18, 1, ol)
    for (tx, ty) in ((px0 - 2, py0 + 1), (px0 + 12, py0 + 8)):
        c.rect(tx, ty, 8, 3, 'tape'); c.rect(tx, ty + 2, 8, 1, 'tape_dk')
    # chimney
    c.rect(14, 2, 8, 12, 's'); c.rect(14, 2, 8, 2, 's_hi'); c.rect(20, 4, 2, 10, 's_dk')
    out = Canvas(W + 2, H + 2)
    out.blit(c, 1, 1)
    out.outline(ol)
    for x in range(2, W):
        out.px(x, H + 1, 'shadow', 70)
    return out


def shrine():
    """The sanctuary's core: a cracked stone dais and a dead CRT monolith (32x40)."""
    c = Canvas(32, 40)
    c.rect(0, 28, 32, 10, 's'); c.rect(0, 28, 32, 3, 's_hi'); c.rect(0, 36, 32, 2, 's_dk')
    c.rect(8, 2, 16, 28, 's_dk'); c.rect(9, 2, 14, 26, 's')
    c.rect(11, 6, 10, 12, 's_ol'); c.rect(12, 7, 8, 10, '#1d4f9a')
    for y in range(8, 17, 2): c.rect(12, y, 8, 1, '#2a62b8')
    c.px(14, 10, 'crt_hi'); c.px(17, 10, 'crt_hi'); c.rect(14, 14, 4, 1, 'crt')
    for x, y in ((10, 20), (11, 21), (12, 22), (21, 4), (20, 5)):
        c.px(x, y, 's_ol')
    c.rect(4, 31, 3, 2, 'g'); c.rect(25, 33, 4, 2, 'g_dk')
    out = Canvas(34, 42)
    out.blit(c, 1, 1)
    out.outline('s_ol')
    return out


# ---------- atlas ----------
def build():
    frames = {}
    for i in range(4): frames[f'grass_{i}'] = grass(i)
    for f, n in ((0, 'a'), (1, 'b')):
        frames[f'tall_{n}'] = tall(f)
        frames[f'flowers_{n}'] = flowers(f)
    for m in range(16):
        frames[f'path_{m}'] = edge_tile(path_base, m, path_edge)
        for f, n in ((0, 'a'), (1, 'b')):
            frames[f'water_{m}_{n}'] = edge_tile(water_base(f), m, water_edge(f))
    for corner in ('ne', 'se', 'sw', 'nw'):
        frames[f'path_nub_{corner}'] = nub(path_base, path_edge, corner)
        for f, n in ((0, 'a'), (1, 'b')):
            frames[f'water_nub_{corner}_{n}'] = nub(water_base(f), water_edge(f), corner)
    for p in 'lmr':
        frames[f'ledge_{p}'] = ledge(p)
    for p in 'lmrs':
        frames[f'fence_{p}'] = fence(p)
    frames['ruin_top'] = ruin('top'); frames['ruin_face'] = ruin('face'); frames['ruin_glyph'] = ruin_glyph()
    frames['plaza_0'] = plaza(0); frames['plaza_1'] = plaza(1)
    frames['sign'] = sign()
    frames['tree'] = tree()
    frames['house_rust'] = house('rust'); frames['house_blue'] = house('blue')
    frames['shrine'] = shrine()

    # pack: tiles in rows of 16, objects below
    tiles = [(k, v) for k, v in frames.items() if v.w == T and v.h == T]
    objs = [(k, v) for k, v in frames.items() if not (v.w == T and v.h == T)]
    cols = 16
    rows = (len(tiles) + cols - 1) // cols
    W = cols * T
    oy = rows * T
    ox, rowh, placed = 0, 0, {}
    for k, v in objs:
        if ox + v.w > W:
            ox, oy, rowh = 0, oy + rowh, 0
        placed[k] = (ox, oy)
        ox += v.w + 1
        rowh = max(rowh, v.h + 1)
    H = oy + rowh
    atlas = Canvas(W, H)
    meta = {}
    for i, (k, v) in enumerate(tiles):
        x, y = (i % cols) * T, (i // cols) * T
        atlas.blit(v, x, y)
        meta[k] = (x, y, T, T)
    for k, v in objs:
        x, y = placed[k]
        atlas.blit(v, x, y)
        meta[k] = (x, y, v.w, v.h)
    out = os.path.join(ROOT, 'tiles', 'out')
    os.makedirs(out, exist_ok=True)
    Image.fromarray(atlas.a, 'RGBA').save(os.path.join(out, 'verrow.png'))
    json.dump({
        'frames': {k: {'frame': {'x': x, 'y': y, 'w': w, 'h': h}, 'rotated': False, 'trimmed': False,
                       'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h}, 'sourceSize': {'w': w, 'h': h}}
                   for k, (x, y, w, h) in meta.items()},
        'meta': {'image': 'verrow.png', 'size': {'w': W, 'h': H}, 'scale': '1'},
    }, open(os.path.join(out, 'verrow.json'), 'w'), indent=1)
    print(f'{len(meta)} frames, {W}x{H}')
    return atlas


if __name__ == '__main__':
    a = build()
    if len(sys.argv) > 1:
        Image.fromarray(a.a, 'RGBA').resize((a.w * 3, a.h * 3), Image.NEAREST).save(sys.argv[1])
