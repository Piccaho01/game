"""Paints Verrow's terrain tiles (16 px) in the palette and texture of the owner's ChatGPT swatch
(art/concepts/locations/hollow_rest_terrain.png), built to tile seamlessly.

The swatch sets the look (lime grass with dark clumps, sandy path with pebbles, grey stone,
scorched crater dirt, blue water); drawn straight it's too noisy at 16 px and can't join up, so
this repaints it: edges blend (path and water into grass, with inside corners), cliffs join
along a terrace, and the crater's dirt meets the grass along a stitched seam (Verrow is stitched
together: art/LOCATION_STYLE.md pillar 1).

Writes art/locations/out/terrain.png + terrain.json (Phaser atlas, JSON hash). Frames:
  grass_0..5, tall_a/b, path_<mask>, water_<mask>_a/b, dirt_<mask> (mask: which sides are the
  same terrain: 1 up, 2 right, 4 down, 8 left), *_nub_<ne|se|sw|nw> (inside corners),
  cliff_<l|m|r> (terrace edge: grass lip, rock face), rock_<l|m|r> (more rock face below),
  stairs, mist_0..3 (the drop past the island's edge), fence_<l|m|r|s>, sign, tree.
Usage: python3 art/tools/terrain.py [preview.png]
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
T = 16


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


# From the swatch (k-means per material), plus a highlight or two where it had none.
P = {k: rgb(v) for k, v in {
    'g_hi': '#a6d64e', 'g': '#87c23d', 'g_md': '#6cb240', 'g_dk': '#4ea442', 'g_dp': '#1a6e45',
    't_hi': '#81c03f', 't_lt': '#52a942', 't': '#349446', 't_dk': '#177548', 't_dp': '#0b5942',
    'p_hi': '#f4cc94', 'p': '#edbe84', 'p_md': '#d4a56f', 'p_dk': '#aa8f63', 'p_dp': '#7c6648',
    's_hi': '#c8bcae', 's_lt': '#ada197', 's': '#7a7977', 's_dk': '#5a5e60', 's_ol': '#313c3d',
    'd_hi': '#a07453', 'd': '#856250', 'd_md': '#68504a', 'd_dk': '#4e4147', 'd_ol': '#312d38',
    'w_hi': '#cfe8f8', 'w_lt': '#5596c9', 'w': '#2871b5', 'w_dk': '#1f5a96', 'w_ol': '#173f6c',
    'fl_w': '#f3f1e7', 'fl_r': '#cb5738', 'fl_c': '#f2c14e',
    'wood': '#9a6a44', 'wood_dk': '#6a4430', 'wood_ol': '#3e2a20', 'tape': '#e9d9a8',
    'mist_hi': '#f4f6fa', 'mist': '#dfe6ee', 'mist_md': '#c8d3df', 'mist_dk': '#aebccb',
}.items()}


class Canvas:
    def __init__(self, w, h):
        self.a = np.zeros((h, w, 4), np.uint8)
        self.w, self.h = w, h

    def px(self, x, y, c, alpha=255):
        if 0 <= x < self.w and 0 <= y < self.h:
            col = P[c] if isinstance(c, str) else c
            if alpha >= 255 or self.a[y, x, 3] == 0:
                self.a[y, x] = (*col, alpha if self.a[y, x, 3] == 0 else 255)
            else:
                k = alpha / 255
                self.a[y, x, :3] = (self.a[y, x, :3] * (1 - k) + np.array(col) * k).astype(np.uint8)

    def rect(self, x, y, w, h, c, alpha=255):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c, alpha)

    def blit(self, o, ox, oy):
        for y in range(o.h):
            for x in range(o.w):
                if o.a[y, x, 3]:
                    self.px(ox + x, oy + y, tuple(int(v) for v in o.a[y, x, :3]), int(o.a[y, x, 3]))

    def outline(self, c):
        m = self.a[:, :, 3] > 0
        e = np.zeros_like(m)
        e[1:] |= m[:-1]; e[:-1] |= m[1:]; e[:, 1:] |= m[:, :-1]; e[:, :-1] |= m[:, 1:]
        for y, x in zip(*np.where(e & ~m)):
            self.a[y, x] = (*P[c], 255)


def rng(seed):
    return np.random.default_rng(seed)


# ---------- grass (the swatch's lime base with dark clumps) ----------
def clump(c, x, y, big=False):
    """One of the swatch's little dark tufts: a fan of blades with a lit top edge."""
    shape = [(0, 2), (1, 1), (2, 0), (3, 1), (4, 2), (1, 2), (2, 1), (3, 2), (2, 2)] if big else [(0, 1), (1, 0), (2, 1), (1, 1)]
    for dx, dy in shape:
        c.px(x + dx, y + dy, 'g_dk')
    for dx, dy in ([(1, 3), (2, 3), (3, 3)] if big else [(1, 2)]):
        c.px(x + dx, y + dy, 'g_dp')
    for dx, dy in ([(1, 0), (3, 0)] if big else [(0, 0), (2, 0)]):
        c.px(x + dx, y + dy, 'g_hi')


def grass(seed, flowers=None):
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 'g')
    r = rng(seed)
    for _ in range(6):
        c.px(int(r.integers(T)), int(r.integers(T)), 'g_md')
    for _ in range(3):
        c.px(int(r.integers(T)), int(r.integers(T)), 'g_hi')
    spots = [(2, 3), (9, 2), (4, 10), (11, 9), (6, 6)]
    for i in r.permutation(len(spots))[:2]:
        x, y = spots[i]
        clump(c, x + int(r.integers(-1, 2)), y + int(r.integers(-1, 2)), big=bool(r.integers(2)))
    if flowers:
        for fx, fy in ((3, 4), (10, 11)):
            for dx, dy in ((0, 0), (2, 0), (1, 1), (0, 2), (2, 2)):
                c.px(fx + dx, fy + dy, flowers)
            c.px(fx + 1, fy + 1, 'fl_c')
    return c


def tall(frame):
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 't_dk')
    for row, y0 in enumerate((0, 8)):
        for i in range(4):
            x0 = i * 4 + (2 if row else 0)
            tip = x0 + 1 + (frame if (i + row) % 2 == 0 else -frame)
            # a leaf: pointed tip, lit left, dark right, deep base (the swatch's tall grass)
            c.px(tip, y0, 't_hi'); c.px(tip, y0 + 1, 't_hi')
            for yy in range(y0 + 2, y0 + 7):
                c.px(x0, yy, 't_lt'); c.px(x0 + 1, yy, 't_hi' if yy < y0 + 4 else 't_lt'); c.px(x0 + 2, yy, 't'); c.px(x0 + 3, yy, 't_dk')
            c.px(x0 + 1, y0 + 7, 't_dp'); c.px(x0 + 2, y0 + 7, 't_dp')
    return c


# ---------- edges: terrain meeting grass ----------
WOBBLE = [3, 3, 2, 3, 4, 3, 3, 2, 2, 3, 3, 4, 3, 2, 3, 3]


def edge_tile(base_fn, mask, draw):
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
            for a, b, dx, dy in (('n', 'w', x, y), ('n', 'e', T - 1 - x, y), ('s', 'w', x, T - 1 - y), ('s', 'e', T - 1 - x, T - 1 - y)):
                if sides[a] and sides[b] and dx + dy < 6:
                    m = min(m, -1)
            draw(c, x, y, m)
    return c


def nub(base_fn, draw, corner):
    c = base_fn()
    for y in range(T):
        for x in range(T):
            dx = x if 'w' in corner else T - 1 - x
            dy = y if 'n' in corner else T - 1 - y
            d = dx + dy
            draw(c, x, y, -1 if d < 3 else d - 3 if d <= 4 else 99)
    return c


def grass_px(c, x, y):
    c.px(x, y, 'g' if (x * 7 + y * 3) % 9 else 'g_md')


def path_base():
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 'p')
    r = rng(3)
    for _ in range(5):
        c.px(int(r.integers(T)), int(r.integers(T)), 'p_hi')
    for x, y in ((3, 4), (10, 7), (6, 12), (12, 13)):
        # the swatch's pebbles: a dark oval with a lit top
        c.px(x, y, 'p_md'); c.px(x + 1, y, 'p_md'); c.px(x, y + 1, 'p_dk'); c.px(x + 1, y + 1, 'p_dk'); c.px(x, y - 1, 'p_hi')
    return c


def path_edge(c, x, y, m):
    if m < 0: grass_px(c, x, y)
    elif m == 0: c.px(x, y, 'g_dk')
    elif m == 1: c.px(x, y, 'p_md')


def water_base(frame):
    def f():
        c = Canvas(T, T)
        c.rect(0, 0, T, T, 'w')
        for i, (x, y) in enumerate(((1, 3), (8, 6), (3, 10), (10, 13))):
            x = (x + frame * 2) % T
            for k in range(5):
                c.px((x + k) % T, y, 'w_lt' if k != 4 else 'w_dk')
            c.px((x + 1) % T, y - 1, 'w_hi' if (i + frame) % 2 else 'w_lt')
        return c
    return f


def water_edge(frame):
    def draw(c, x, y, m):
        if m < 0: grass_px(c, x, y)
        elif m == 0: c.px(x, y, 'p_dk')                                  # muddy bank
        elif m == 1: c.px(x, y, 'w_hi' if (x + y + frame) % 3 else 'w_lt')  # foam
        elif m == 2: c.px(x, y, 'w_lt')
    return draw


def dirt_base():
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 'd')
    r = rng(5)
    for _ in range(8):
        c.px(int(r.integers(T)), int(r.integers(T)), 'd_md')
    for x, y in ((3, 3), (11, 5), (6, 11), (13, 12)):
        c.px(x, y, 'd_dk'); c.px(x + 1, y, 'd_ol'); c.px(x, y - 1, 'd_hi')
    for x, y in ((8, 2), (2, 8), (12, 9)):
        c.px(x, y, 'd_hi')
    return c


def dirt_edge(c, x, y, m):
    """Scorched dirt stitched into the grass: a dark scorch line, then tape-coloured stitches."""
    if m < 0: grass_px(c, x, y)
    elif m == 0: c.px(x, y, 'd_ol')
    elif m == 1: c.px(x, y, 'tape' if (x + y) % 4 == 0 else 'd_dk')
    elif m == 2: c.px(x, y, 'd_md')


# ---------- height ----------
def boulders(c, top, seed, dark=False):
    """A face of stacked boulders (the swatch's cliff): rounded blocks, lit top-left, shadowed
    bottom-right, dark seams between them."""
    c.rect(0, top, T, T - top, 's_ol')
    r = rng(seed)
    y = top
    row = 0
    while y < T:
        h = int(r.integers(4, 7))
        x = -int(r.integers(0, 4)) if row % 2 else 0
        while x < T:
            w = int(r.integers(5, 9))
            for yy in range(y + 1, min(T, y + h)):
                for xx in range(max(0, x + 1), min(T, x + w)):
                    corner = (xx in (x + 1, x + w - 1)) and (yy in (y + 1, y + h - 1))
                    if corner:
                        continue
                    edge_tl = yy == y + 1 or xx == x + 1
                    edge_br = yy == y + h - 1 or xx == x + w - 1
                    col = 's_hi' if edge_tl and not dark else 's_dk' if edge_br else ('s_dk' if dark else 's')
                    c.px(xx, yy, col)
            x += w
        y += h
        row += 1


def cliff(part, lip=True):
    """A terrace edge: grass lip with tufts hanging over a boulder face."""
    c = Canvas(T, T)
    boulders(c, 0, 31 + 'lmr'.index(part) * 7 + (0 if lip else 3))
    if lip:
        for x in range(T):
            h = 4 + (1 if (x * 5) % 7 < 2 else 0)
            for yy in range(0, h): c.px(x, yy, 'g' if yy > 0 else 'g_md')
            c.px(x, h, 'g_dk')
            if (x * 3) % 5 == 0: c.px(x, h + 1, 'g_dp')     # tufts hanging over the edge
        c.px(4, 7, 'g_dk'); c.px(11, 9, 'g_dk')
    if part == 'l':
        for y in range(T): c.px(0, y, 's_ol')
    if part == 'r':
        for y in range(T): c.px(T - 1, y, 's_ol')
    return c


def under(part):
    """The island's underside hanging over the mist: dark rock tapering to a ragged bottom."""
    c = mist(5, shade=True)
    rock = Canvas(T, T)
    boulders(rock, 0, 77 + 'lmr'.index(part), dark=True)
    for x in range(T):
        bottom = 6 + int(4 * abs(np.sin(x * 0.9 + 'lmr'.index(part))))
        for y in range(bottom, T):
            rock.a[y, x, 3] = 0
        rock.a[min(bottom, T - 1) - 1, x, :3] = P['s_ol']
    c.blit(rock, 0, 0)
    return c


def stairs():
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 's')
    for y in range(0, T, 4):
        c.rect(2, y, 12, 1, 's_hi'); c.rect(2, y + 1, 12, 2, 's_lt'); c.rect(2, y + 3, 12, 1, 's_dk')
    for y in range(T):
        c.px(0, y, 's_ol'); c.px(1, y, 's_dk'); c.px(14, y, 's_dk'); c.px(15, y, 's_ol')
    return c


def mist(seed, shade=False):
    """Past the island's edge: a sea of mist far below, soft cloud banks; under the island it's in
    shadow."""
    c = Canvas(T, T)
    c.rect(0, 0, T, T, 'mist_md' if shade else 'mist')
    r = rng(seed + 40)
    for _ in range(6):
        c.px(int(r.integers(T)), int(r.integers(T)), 'mist_dk' if shade else 'mist_md')
    if seed % 8 in (1, 4) and not shade:
        # a cloud bank: stacked soft strips, brightest on top
        y0 = 4 + seed % 3 * 2
        for k, (dx, w) in enumerate(((5, 6), (2, 11), (0, 16), (1, 14))):
            c.rect(dx, y0 + k, w, 1, 'mist_hi' if k < 2 else 'mist')
        c.rect(1, y0 + 4, 14, 1, 'mist_md')
    return c


def fence(part):
    c = grass(21)
    for y in (6, 10):
        x0 = 0 if part in 'mr' else 7
        x1 = T if part in 'lm' else 9
        c.rect(x0, y, x1 - x0, 2, 'wood'); c.rect(x0, y + 2, x1 - x0, 1, 'wood_dk')
    c.rect(7, 3, 3, 11, 'wood'); c.rect(9, 4, 1, 10, 'wood_dk'); c.rect(7, 3, 3, 1, 'p_hi')
    c.rect(6, 14, 5, 1, 'g_dk')
    return c


def sign():
    c = grass(23)
    c.rect(7, 9, 2, 6, 'wood_dk')
    c.rect(1, 2, 14, 8, 'wood_ol'); c.rect(2, 3, 12, 6, 'wood'); c.rect(2, 3, 12, 1, 'p_md')
    c.rect(4, 5, 8, 1, 'wood_dk'); c.rect(4, 7, 6, 1, 'wood_dk')
    c.rect(3, 15, 10, 1, 'g_dk')
    return c


def blob(c, cx, cy, rx, ry, col):
    for y in range(c.h):
        for x in range(c.w):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                c.px(x, y, col)


def tree():
    """The map draft's round trees: deep shadow, then lime clumps lit from the top left."""
    c = Canvas(22, 28)
    c.rect(9, 20, 4, 6, 'wood'); c.rect(11, 20, 2, 6, 'wood_dk')
    blob(c, 11, 11, 10, 10, 't_dk')
    blob(c, 10.5, 10, 9, 8.6, 't')
    for cx, cy, r in ((7, 6, 3.6), (13, 5, 3.4), (5, 11, 3), (11, 10, 3.4), (16, 11, 2.6), (9, 14, 2.6)):
        blob(c, cx, cy, r, r * 0.85, 't_lt')
    for cx, cy, r in ((6.5, 5, 1.6), (12.5, 4, 1.6), (10.5, 9, 1.5)):
        blob(c, cx, cy, r, r * 0.8, 't_hi')
    for x in range(3, 20):
        if c.a[19, x, 3]: c.px(x, 19, 't_dp')
    out = Canvas(24, 30)
    out.blit(c, 1, 0)
    out.outline('t_dp')
    for x in range(6, 19):
        out.px(x, 29, (0, 0, 0), 60)
    return out


def build():
    f = {}
    for i in range(4): f[f'grass_{i}'] = grass(i)
    f['grass_4'] = grass(11, 'fl_w'); f['grass_5'] = grass(12, 'fl_r')
    for fr, n in ((0, 'a'), (1, 'b')): f[f'tall_{n}'] = tall(fr)
    for m in range(16):
        f[f'path_{m}'] = edge_tile(path_base, m, path_edge)
        f[f'dirt_{m}'] = edge_tile(dirt_base, m, dirt_edge)
        for fr, n in ((0, 'a'), (1, 'b')): f[f'water_{m}_{n}'] = edge_tile(water_base(fr), m, water_edge(fr))
    for cor in ('ne', 'se', 'sw', 'nw'):
        f[f'path_nub_{cor}'] = nub(path_base, path_edge, cor)
        f[f'dirt_nub_{cor}'] = nub(dirt_base, dirt_edge, cor)
        for fr, n in ((0, 'a'), (1, 'b')): f[f'water_nub_{cor}_{n}'] = nub(water_base(fr), water_edge(fr), cor)
    for p in 'lmr':
        f[f'cliff_{p}'] = cliff(p)
        f[f'rock_{p}'] = cliff(p, lip=False)
    f['stairs'] = stairs()
    for i in range(8): f[f'mist_{i}'] = mist(i)
    for p in 'lmr': f[f'under_{p}'] = under(p)
    for p in 'lmrs': f[f'fence_{p}'] = fence(p)
    f['sign'] = sign()
    f['tree'] = tree()

    tiles = [(k, v) for k, v in f.items() if v.w == T and v.h == T]
    objs = [(k, v) for k, v in f.items() if not (v.w == T and v.h == T)]
    cols = 16
    rows = (len(tiles) + cols - 1) // cols
    W = cols * T
    oy, ox = rows * T, 0
    H = oy + max(v.h for _, v in objs)
    atlas = Canvas(W, H)
    meta = {}
    for i, (k, v) in enumerate(tiles):
        x, y = (i % cols) * T, (i // cols) * T
        atlas.blit(v, x, y); meta[k] = (x, y, T, T)
    for k, v in objs:
        atlas.blit(v, ox, oy); meta[k] = (ox, oy, v.w, v.h); ox += v.w + 1
    out = os.path.join(ROOT, 'locations', 'out')
    os.makedirs(out, exist_ok=True)
    Image.fromarray(atlas.a, 'RGBA').save(os.path.join(out, 'terrain.png'))
    json.dump({'frames': {k: {'frame': {'x': x, 'y': y, 'w': w, 'h': h}, 'rotated': False, 'trimmed': False,
                              'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h}, 'sourceSize': {'w': w, 'h': h}}
                          for k, (x, y, w, h) in meta.items()},
               'meta': {'image': 'terrain.png', 'size': {'w': W, 'h': H}, 'scale': '1'}},
              open(os.path.join(out, 'terrain.json'), 'w'), indent=1)
    print(f'{len(meta)} frames, {W}x{H}')
    return atlas


if __name__ == '__main__':
    a = build()
    if len(sys.argv) > 1:
        Image.fromarray(a.a, 'RGBA').resize((a.w * 3, a.h * 3), Image.NEAREST).save(sys.argv[1])
