"""Bakes an overworld map in 2:1 isometric (the look the owner approved from the concept art).

Reads the game's own map file (game/src/data/maps/<id>.json: terrain rows + legend, heights,
objects), so gameplay and art share one source. Writes:
  art/locations/out/maps/<id>.png   the ground: sky and cloud backdrop, tile tops (the
                                    swatch-palette terrain tiles projected onto diamonds), side faces
                                    (boulders, with brick and taped-plaster patches: Verrow is
                                    stitched together), stairs, grass clumps
  art/locations/out/maps/<id>.json  where the ground sits (origin), and every upright thing (trees,
                                    the owner's set pieces, props) with its screen position, footprint
                                    and draw order, so people can walk behind them
  art/locations/out/<prop>.png      the small props drawn here (lamp, sunflowers, laundry, cat...)
Usage: python3 art/tools/iso_map.py hollow_rest [preview.png]
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, '..')
GAME = os.path.join(ROOT, '..', 'game', 'src', 'data')
sys.path.insert(0, HERE)
from terrain import P  # noqa: E402
from draft2object import grid  # noqa: E402

TW, TH, HZ = 32, 16, 16
OUT = os.path.join(ROOT, 'locations', 'out')
atlas = Image.open(os.path.join(OUT, 'terrain.png')).convert('RGBA')
FR = {k: v['frame'] for k, v in json.load(open(os.path.join(OUT, 'terrain.json')))['frames'].items()}
OBJ = json.load(open(os.path.join(GAME, 'objects.json')))['objects']


def fr(n):
    f = FR[n]
    return atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))


def rgba(c, a=255):
    return (*(P[c] if isinstance(c, str) else c), a)


KIT = os.path.join(OUT, 'kit')


def kit(name):
    """A piece converted from the owner's isometric sheets by iso_kit.py."""
    return Image.open(os.path.join(KIT, f'{name}.png')).convert('RGBA')


def sprite(rows, cols):
    h, w = len(rows), max(len(r) for r in rows)
    im = Image.new('RGBA', (w, h))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in cols: im.putpixel((x, y), rgba(cols[ch]))
    return im


# small things: from the owner's props sheet, except the chalk (too small to draft)
KIT_PROPS = ['lamp', 'sunflowers', 'laundry', 'cat', 'bench', 'crates', 'gate', 'mailbox', 'signpost',
             'rock_s', 'rock_m', 'rock_l', 'pot_0', 'pot_1', 'pot_2', 'tree_0', 'tree_1', 'tree_2',
             'bush_0', 'bush_1', 'bush_2', 'fence_x', 'fence_y']
PROPS = {n: kit(n) for n in KIT_PROPS}
PROPS['chalk'] = sprite([
    '..p.....bb..', '.p.p...b..b.', 'p...p..b..b.', '.p.p....bb..', '..p...y.....', '.....yyy....', '......y.....'],
    {'p': (240, 150, 190), 'b': (140, 190, 240), 'y': 'fl_c'})


# ---------- the map ----------
class Map:
    def __init__(self, data):
        self.d = data
        self.rows = data['rows']
        self.H, self.W = len(self.rows), len(self.rows[0])
        self.Z = np.array([[int(c) for c in r] for r in data['heights']]) if 'heights' in data else np.ones((self.H, self.W), int)
        self.legend = data['legend']

    def kind(self, x, y):
        if not (0 <= x < self.W and 0 <= y < self.H) or self.Z[y, x] == 0: return None
        return self.legend[self.rows[y][x]]

    def z(self, x, y):
        return self.Z[y, x] if 0 <= x < self.W and 0 <= y < self.H else 0


def stair_axis(m, x, y):
    """Stairs climb toward the neighbour one level up (-y: steps descend toward +y; or -x) that the
    path carries on into; else any higher one. Same rule as the game (engine/overworld.ts)."""
    z = m.z(x, y)
    up = [(a, nx, ny) for a, nx, ny in (('y', x, y - 1), ('x', x - 1, y)) if m.z(nx, ny) == z + 1]
    on_path = [a for a, nx, ny in up if m.kind(nx, ny) in ('path', 'exit')]
    return (on_path or [a for a, _, _ in up] or ['y'])[0]


TOPS = {n: np.asarray(kit(f'top_{n}')) for n in ('grass_0', 'grass_1', 'grass_2', 'grass_3', 'tall', 'path', 'cobble', 'crater', 'water')}
# the crater's scorched ground: the path's dirt burnt darker (the sheet's crater tile has a pit in it)
_d = TOPS['path'].astype(float)
_d[..., :3] = _d[..., :3] * np.array([0.55, 0.45, 0.42])
TOPS['dirt'] = _d.astype(np.uint8)
EDGE = {'path': ('path', (122, 92, 52)), 'dirt': ('dirt', (70, 52, 40)), 'water': ('water', (236, 240, 230)), 'cobble': ('cobble', (90, 84, 72))}


def variant(t, k):
    """Four looks from one tile: as drawn, mirrored, flipped, both (a diamond stays a diamond)."""
    above = t.shape[0] - 16
    body = t[above:]
    if k & 1: body = body[:, ::-1]
    if k & 2 and not above: body = body[::-1]
    return np.concatenate([t[:above, ::-1] if k & 1 else t[:above], body]) if above else body.copy()


def ab(px, py):
    """A diamond pixel's position on its tile: a along +x (toward the right corner), b along +y."""
    u, v = px - 15.5, py + 0.5
    return v + u / 2, v - u / 2


def ground_tile(m, x, y):
    """The tile's top (32x16, plus rows standing above it for tall grass) and how many rows stand above."""
    k = m.kind(x, y)
    h = (x * 7 + y * 13 + x * y) % 8
    if k == 'flowers': base = TOPS[('grass_1', 'grass_3')[h % 2]]
    elif k == 'tall': base = TOPS['tall']
    else: base = TOPS[('grass_0', 'grass_2')[h % 2]]
    t = variant(base, h >> 1)
    kk = {'stairs': 'path', 'exit': 'path', 'bridge': 'water'}.get(k, k)
    if kk in EDGE:
        src, line = EDGE[kk]
        over = variant(TOPS[src], (x * 3 + y * 5) % 4)
        over = over[over.shape[0] - 16:]
        def same(dx, dy):
            k2 = m.kind(x + dx, y + dy)
            if k2 is None: return True
            if kk == 'path' and k2 in ('stairs', 'sign', 'exit', 'path'): return True
            return {'stairs': 'path', 'exit': 'path', 'bridge': 'water'}.get(k2, k2) == kk
        sides = {'u': same(0, -1), 'r': same(1, 0), 'd': same(0, 1), 'l': same(-1, 0)}
        corners = {(1, -1): same(1, -1), (1, 1): same(1, 1), (-1, 1): same(-1, 1), (-1, -1): same(-1, -1)}
        rng = np.random.default_rng(x * 97 + y * 31)
        jag = rng.integers(0, 3, 64)
        above = t.shape[0] - 16
        t = t.copy()
        for py in range(16):
            for px in range(32):
                if not DMASK[py, px]: continue
                a, b = ab(px, py)
                # distance into this tile from each side that isn't the same ground
                d = 99.0
                if not sides['u']: d = min(d, b)
                if not sides['d']: d = min(d, 16 - b)
                if not sides['l']: d = min(d, a)
                if not sides['r']: d = min(d, 16 - a)
                for (dx, dy), ok in corners.items():
                    if ok or not sides['r' if dx > 0 else 'l'] or not sides['d' if dy > 0 else 'u']: continue
                    ca, cb = (16 if dx > 0 else 0), (16 if dy > 0 else 0)
                    d = min(d, np.hypot(a - ca, b - cb) - 1.5)
                edge = 2.5 + jag[int(a + b * 3) % 64] * 0.6
                if d >= edge:
                    t[above + py, px] = over[py, px]
                elif d >= edge - 1:
                    t[above + py, px] = (*line, 255)
        if above and kk != 'tall':
            t[:above] = 0
    return t


def mask_d():
    m = np.zeros((TH, TW), bool)
    for py in range(TH):
        for px in range(TW):
            a, b = ab(px, py)
            m[py, px] = 0 <= a < 16 and 0 <= b < 16
    return m


DMASK = mask_d()


def put(canvas, x, y, col):
    if 0 <= y < canvas.shape[0] and 0 <= x < canvas.shape[1]:
        canvas[y, x] = col


FACES = {(m, sd): np.asarray(kit(f'face_{m}_{sd}')) for m in ('stone', 'brick') for sd in 'lr'}
UNDERS = {sd: np.asarray(kit(f'under_{sd}')) for sd in 'lr'}
STAIRS = {ax: kit(f'stairs_{ax}') for ax in 'xy'}


def face(canvas, sx, sy, side, depth, seed, under=0):
    """A side face under one tile edge: 'l' faces +y (lit), 'r' faces +x (in shade), from the
    owner's stone block (now and then the brick one: Verrow is stitched together). The first rows
    keep the block's mossy lip; deeper rows repeat its rock. `under`: rows of the island's rocky
    underside hanging below, stretched to that depth, its bottom ragged."""
    mat = 'brick' if seed % 9 == 4 else 'stone'
    tex = FACES[(mat, side)]
    th = tex.shape[0]
    for c in range(16):
        x = sx + c if side == 'l' else sx + 16 + c
        top = sy + 8 + c // 2 if side == 'l' else sy + 15 - c // 2
        # from the tile's own edge row down (the top is drawn over it after, closing the
        # stair-step gap along a diamond's edge)
        for d in range(-1, depth):
            dd = max(1, d + 1) if d < th - 3 else 4 + (d - th + 3 + seed) % (th - 6)   # row 0 is the sheet's rim
            col = tex[dd, c]
            if col[3]: put(canvas, x, top + d + 1, col)
        if under:
            # rock hanging below, darkening into shadow: a ragged edge that runs on across tiles
            # (it follows the screen column), with a long point now and then
            X = x * 1.0
            f = max(0.0, np.sin(X * 0.13 + 1.3)) ** 4 * 0.75 + (np.sin(X * 0.47) + 1) * 0.12 + (np.sin(X * 1.9) + 1) * 0.04
            cut = int(under * (0.3 + f))
            for d in range(cut):
                col = tex[4 + (d + seed) % (th - 6), c].astype(float)
                if not col[3]: continue
                k = 0.85 - 0.45 * d / max(1, under)
                col[:3] = col[:3] * k + np.array([60, 40, 50]) * (1 - k) * 0.5
                if d >= cut - 1: col[:3] *= 0.6
                put(canvas, x, top + depth + d + 1, col.astype(np.uint8))


def stairs(canvas, scr, x, y, z_low, axis):
    """The owner's stair block, from z_low up to z_low + 1, climbing toward -y (axis 'y') or -x."""
    sx, sy = scr(x, y, z_low + 1)
    im = np.asarray(STAIRS[axis])
    for py in range(im.shape[0]):
        for px in range(im.shape[1]):
            if im[py, px, 3]: put(canvas, sx + px, sy + py, im[py, px])


UNDER = 72   # how far the island's rock hangs below its lowest ground


def exit_steps(canvas, sx, sy, depth, side):
    """Steps cut down the island's face under the path's end (the way off, to Route 1)."""
    for d in range(0, depth, 4):
        for c in range(3, 13):
            x = sx + c if side == 'l' else sx + 16 + c
            top = (sy + 8 + c // 2 if side == 'l' else sy + 15 - c // 2) + d + 1
            for k, col in ((0, P['s_hi']), (1, P['s_lt']), (2, P['s_lt']), (3, P['s_ol'])):
                put(canvas, x, top + k, (*col, 255))


def grade(a, gx=None, gy=None, k=1.0):
    """Golden hour, as in the concept: warm the colours, lift shadows toward warm brown, and add a
    soft sunlit glow from the top left. `a` is an RGBA array; gx/gy place it on the map for the glow.
    `k` scales the warming: the owner's isometric sheets are already lit for golden hour, so they
    take a little (k < 1); the older set-piece drafts take it all."""
    out = a.astype(float)
    rgb = out[..., :3]
    src = rgb.copy()
    lum = rgb.mean(-1, keepdims=True) / 255
    rgb *= np.array([1.05, 0.98, 0.9])
    rgb += (1 - lum) * np.array([14, 6, -4])                  # shadows lean warm
    rgb = rgb * 0.86 + lum * 255 * np.array([0.15, 0.13, 0.08])  # a little less candy, more olive
    rgb = src * (1 - k) + rgb * k
    if gx is not None:
        h, w = a.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.sqrt(((xx + gx) / 900) ** 2 + ((yy + gy) / 600) ** 2)
        glow = np.clip(1 - d, 0, 1)[..., None] ** 2
        rgb += glow * np.array([30, 18, 0])
    out[..., :3] = np.clip(rgb, 0, 255)
    return out.astype(np.uint8)


def backdrop(w, h):
    """The sky under the island at golden hour: warm haze high up, paler toward the mist, banks
    of pixel cloud lit from the left."""
    bg = np.zeros((h, w, 4), np.uint8)
    stops = [(0.0, (238, 192, 132)), (0.45, (240, 222, 196)), (1.0, (206, 222, 232))]
    for y in range(h):
        t = y / h
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0)
                bg[y, :, :3] = (np.array(c0) * (1 - k) + np.array(c1) * k).astype(np.uint8)
        bg[y, :, 3] = 255
    rng = np.random.default_rng(7)
    for _ in range(int(w * h / 9000)):
        cx, cy = int(rng.integers(0, w)), int(rng.integers(h // 4, h))
        cw = int(rng.integers(40, 120))
        for k, col in enumerate(((255, 246, 228), (255, 240, 214), (240, 226, 210), (212, 204, 200))):
            x0 = cx - cw // 2 + abs(2 - k) * 6
            bg[cy + k * 2:cy + k * 2 + 2, max(0, x0):min(w, x0 + cw - abs(2 - k) * 12)] = (*col, 255)
    return bg


def village():
    """The village far below, lifted from the owner's pixel map draft (bottom right)."""
    src = os.path.join(ROOT, 'concepts', 'locations', 'hollow_rest_map.png')
    crop = Image.open(src).convert('RGB').crop((1256, 930, 1448, 1086))
    tmp = os.path.join(OUT, '_village_crop.png')
    crop.save(tmp)
    g = grid(tmp, 3.5, 8)
    os.remove(tmp)
    im = Image.fromarray(g.astype(np.uint8), 'RGB').convert('RGBA')
    a = np.asarray(im).copy()
    # keep only the town and its trees: drop the sky (blue-ish and light) and the cliff (grey)
    r, gg, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    sky = (b > r + 30) & (b > gg + 5)
    a[sky, 3] = 0
    a[:, :a.shape[1] // 3, 3] = 0            # the left third is the cliff of the draft's island
    im = Image.fromarray(a, 'RGBA')
    return im.resize((im.width * 2, im.height * 2), Image.NEAREST)


def place_sprites(m, data, scr):
    """Every upright thing (trees, set pieces, props, furniture) with its screen spot and draw order."""
    for name, im in PROPS.items():
        im.save(os.path.join(OUT, f'{name}.png'))
    sprites = []
    def add(art, img, x, y, wx, wy, z, decal=False, box=False):
        if wx == 1 and wy == 1 and not box:
            sx, sy = scr(x, y, z)
            px, py = sx + 16 - img.width // 2, sy + 12 - img.height
        else:
            a = np.asarray(img)[:, :, 3] > 0
            ys, xs = np.where(a)
            fx = int(xs[ys == ys.max()].mean())
            sx, sy = scr(x + wx - 1, y + wy - 1, z)
            px, py = sx + 16 - fx, sy + TH - img.height + 1
        sprites.append({'art': art, 'x': int(px), 'y': int(py), 'fx': x, 'fy': y, 'wx': wx, 'wy': wy,
                        'key': -1 if decal else (x + wx - 1 + y + wy - 1) * 10 + 6, 'decal': decal})
    for y in range(m.H):
        for x in range(m.W):
            k = m.kind(x, y)
            if k == 'tree':
                v = (x * 5 + y * 3 + x * y) % 3
                add(f'tree_{v}', PROPS[f'tree_{v}'], x, y, 1, 1, m.Z[y, x])
                j = sprites[-1]
                j['x'] += (x * 7 + y * 11) % 7 - 3
                j['y'] += (x * 5 + y * 13) % 5 - 2
            elif k == 'fence':
                along_x = m.kind(x - 1, y) == 'fence' or m.kind(x + 1, y) == 'fence'
                ax = 'x' if along_x else 'y'
                add(f'fence_{ax}', PROPS[f'fence_{ax}'], x, y, 1, 1, m.Z[y, x])
            elif k == 'bush':
                v = (x * 3 + y) % 5
                n = f'bush_{v}' if v < 3 else f'rock_{"sm"[v - 3]}'
                add(n, PROPS[n], x, y, 1, 1, m.Z[y, x])
            elif k == 'sign':
                add('signpost', PROPS['signpost'], x, y, 1, 1, m.Z[y, x])
    for o in data.get('objects', []):
        d = OBJ[o['kind']]
        img = Image.open(os.path.join(OUT, f"{d['art']}.png"))
        add(d['art'], img, o['x'], o['y'], d['wx'], d['wy'], m.Z[o['y'], o['x']], d.get('decal', False), d.get('box', False))
        if o.get('until'): sprites[-1]['until'] = o['until']
    return sprites


def bake(map_id, preview=None):
    data = json.load(open(os.path.join(GAME, 'maps', f'{map_id}.json')))
    if 'interior' in data:
        from iso_room import bake_room
        return bake_room(map_id, data, globals(), preview)
    m = Map(data)
    pad_x, pad_top, pad_bot = 40, 80, 120
    W = (m.W + m.H) * TW // 2 + 2 * pad_x
    Hh = (m.W + m.H) * TH // 2 + pad_top + pad_bot
    OX = pad_x + m.H * TW // 2 - TW // 2
    OY = pad_top
    scr = lambda x, y, z: (OX + (x - y) * TW // 2, OY + (x + y) * TH // 2 - int(z * HZ))
    canvas = backdrop(W, Hh)

    order = sorted(((x, y) for y in range(m.H) for x in range(m.W) if m.Z[y, x] > 0), key=lambda p: (p[0] + p[1], p[0]))
    for (x, y) in order:
        z = m.Z[y, x]
        k = m.kind(x, y)
        sx, sy = scr(x, y, z)
        zl, zr = m.z(x, y + 1), m.z(x + 1, y)
        if k == 'stairs':
            stairs(canvas, scr, x, y, z, stair_axis(m, x, y))
            # its own sides still need faces where they drop further
        seed = x * 31 + y * 17
        # the island hangs deeper toward its middle, so its underside tapers like the concept's
        mid = 1 - min(1, np.hypot(x - m.W / 2, y - m.H / 2) / (max(m.W, m.H) * 0.6))
        under = int(18 + 60 * mid)
        if zl < z and not (k == 'stairs' and stair_axis(m, x, y) == 'y'):
            face(canvas, sx, sy, 'l', (z - zl) * HZ, seed, under if zl == 0 else 0)
            if k == 'exit': exit_steps(canvas, sx, sy, (z - zl) * HZ + under - 12, 'l')
        if zr < z and not (k == 'stairs' and stair_axis(m, x, y) == 'x'):
            face(canvas, sx, sy, 'r', (z - zr) * HZ, seed + 3, under if zr == 0 else 0)
            if k == 'exit' and zl != 0: exit_steps(canvas, sx, sy, (z - zr) * HZ + under - 12, 'r')
        if k == 'stairs':
            continue
        top = ground_tile(m, x, y)
        above = top.shape[0] - TH
        for py in range(top.shape[0]):
            for px in range(TW):
                if top[py, px, 3]: put(canvas, sx + px, sy - above + py, top[py, px])
    sprites = place_sprites(m, data, scr)
    sprites.sort(key=lambda s: s['key'])

    os.makedirs(os.path.join(OUT, 'maps'), exist_ok=True)
    canvas = grade(canvas, 0, 0, k=0.15)
    Image.fromarray(canvas, 'RGBA').save(os.path.join(OUT, 'maps', f'{map_id}.png'))
    # every upright piece, graded to match (the game loads these)
    os.makedirs(os.path.join(OUT, 'graded'), exist_ok=True)
    for art in sorted({sp['art'] for sp in sprites}):
        a = np.asarray(Image.open(os.path.join(OUT, f'{art}.png')).convert('RGBA'))
        Image.fromarray(grade(a, k=0.15 if art in PROPS else 1.0), 'RGBA').save(os.path.join(OUT, 'graded', f'{art}.png'))
    json.dump({'origin': {'x': OX, 'y': OY}, 'tile': {'w': TW, 'h': TH, 'z': HZ}, 'size': {'w': W, 'h': Hh}, 'sprites': sprites},
              open(os.path.join(OUT, 'maps', f'{map_id}.json'), 'w'), indent=1)
    print(f'{map_id}: {W}x{Hh}, {len(sprites)} sprites')
    if preview:
        img = Image.fromarray(canvas, 'RGBA')
        for s in sprites:
            o = Image.open(os.path.join(OUT, 'graded', f"{s['art']}.png"))
            img.alpha_composite(o, (max(0, s['x']), max(0, s['y'])))
        img.save(preview)
    return scr


if __name__ == '__main__':
    bake(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
