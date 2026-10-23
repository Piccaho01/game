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


# ---------- props (small things the drafts don't cover) ----------
def sprite(rows, cols):
    h, w = len(rows), max(len(r) for r in rows)
    im = Image.new('RGBA', (w, h))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in cols: im.putpixel((x, y), rgba(cols[ch]))
    return im


PROPS = {
    'lamp': sprite([
        '..ooo..', '.oyyyo.', '.oYyYo.', '..ooo..', '...o...', '...m...', '...m...', '...m...', '...m...', '...m...',
        '...m...', '...m...', '...m...', '...m...', '...m...', '...m...', '...m...', '...m...', '..omo..', '.ooooo.'],
        {'o': 's_ol', 'y': 'fl_c', 'Y': (255, 244, 200), 'm': 's_dk'}),
    'sunflowers': sprite([
        '.yy....yy.', 'yoyy..yoyy', '.yy....yy.', '..g....g..', '..gg..gg..', '.yy.g.g...', 'yoyygg....', '.yy.g.....',
        '...gg.....', '..g.g.....', '..g.g.....'],
        {'y': 'fl_c', 'o': 'wood_dk', 'g': 't'}),
    'laundry': sprite([
        'w..................w', 'w..................w', 'wc.................w', 'w.cc..............w.', 'w..rrcc........ccw..',
        'w..rr..cbbcc.cc..w..', 'w..rr...bb..yy...w..', 'w.......bb..yy...w..', 'w...........yy...w..', 'w................w..',
        'w................w..', 'W................W..'],
        {'w': 'wood', 'W': 'wood_dk', 'c': 'mist_dk', 'r': 'fl_r', 'b': (90, 132, 192), 'y': 'fl_w'}),
    'cat': sprite([
        'o.o.....', 'ooo.....', 'oeo...oo', 'ooooooo.', '.oooooo.', '.o.o.o.o'],
        {'o': (214, 128, 56), 'e': (40, 30, 30)}),
    'chalk': sprite([
        '..p.....bb..', '.p.p...b..b.', 'p...p..b..b.', '.p.p....bb..', '..p...y.....', '.....yyy....', '......y.....'],
        {'p': (240, 150, 190), 'b': (140, 190, 240), 'y': 'fl_c'}),
    'bench': sprite([
        '..oooooooo..', '.owwwwwwwwo.', 'owwwwwwwwwwo', '.oooooooooo.', '.o.o....o.o.', '.o.o....o.o.'],
        {'o': 'wood_ol', 'w': 'wood'}),
    'crates': sprite([
        '.oooooo...', 'owwwwwwo..', 'owWwwWwo..', 'owwwwwwooo', 'oooooooowo', '.owwwwwwwo', '.owWwwWwwo', '.oooooooo.'],
        {'o': 'wood_ol', 'w': 'wood', 'W': 'wood_dk'}),
}


def bush(seed):
    """A round shrub (the concept has them everywhere): dark mass, lime clumps, sometimes flowers."""
    im = Image.new('RGBA', (14, 11))
    rng = np.random.default_rng(seed)
    for y in range(11):
        for x in range(14):
            q = ((x - 6.5) / 6.6) ** 2 + ((y - 6) / 5) ** 2
            if q < 1:
                lit = (x - 4) ** 2 + (y - 3) ** 2 < 10 + rng.integers(0, 6)
                im.putpixel((x, y), rgba('t_lt' if lit else 't' if q < 0.6 else 't_dk'))
            elif q < 1.25:
                im.putpixel((x, y), rgba('t_dp'))
    if seed % 3 == 0:
        for fx, fy in ((4, 4), (8, 3), (10, 6), (6, 7)):
            im.putpixel((fx, fy), rgba('fl_r' if seed % 2 else 'fl_w'))
    return im


def blob(im, cx, cy, rx, ry, col):
    for y in range(im.height):
        for x in range(im.width):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                im.putpixel((x, y), rgba(col))


def tree(v):
    """Three tree shapes so woods don't look planted: round, tall, and a broad old one."""
    w, h, rx, ry, cy = [(22, 28, 10, 10, 11), (18, 32, 8, 13, 13), (28, 30, 13, 11, 12)][v]
    im = Image.new('RGBA', (w + 2, h + 2))
    cx = (w + 2) / 2
    for y in range(h - 9, h):
        for x in range(int(cx) - 2, int(cx) + 2):
            im.putpixel((x, y), rgba('wood' if x < cx else 'wood_dk'))
    blob(im, cx, cy, rx + 1, ry + 1, 't_dp')
    blob(im, cx, cy, rx, ry, 't_dk')
    blob(im, cx - 0.5, cy - 1, rx - 1, ry - 1.4, 't')
    rng = np.random.default_rng(v + 5)
    for _ in range(6):
        bx, by = cx - rx * 0.5 + rng.uniform(-3, rx * 0.8), cy - ry * 0.55 + rng.uniform(0, ry * 0.9)
        blob(im, bx, by, 3.2, 2.8, 't_lt')
    for _ in range(3):
        bx, by = cx - rx * 0.4 + rng.uniform(-2, rx * 0.5), cy - ry * 0.6 + rng.uniform(0, ry * 0.5)
        blob(im, bx, by, 1.6, 1.2, 't_hi')
    return im


def fence_sprite(axis):
    """A wooden fence through a tile's centre, along the map's x (down-right) or y (down-left)."""
    im = Image.new('RGBA', (34, 26))
    sgn = 1 if axis == 'x' else -1
    def at(t):            # t in 0..1 along the tile: screen point of the centre line
        return 17 + sgn * (t - 0.5) * 32, 13 + (t - 0.5) * 16
    for rail_y in (-7, -3):
        for k in range(33):
            x, y = at(k / 32)
            for dy, col in ((0, 'wood'), (1, 'wood_dk')):
                xi, yi = int(x), int(y + rail_y + dy)
                if 0 <= xi < 34 and 0 <= yi < 26: im.putpixel((xi, yi), rgba(col))
    for t in (0.1, 0.9):
        x, y = at(t)
        for yy in range(int(y) - 10, int(y) + 1):
            for xx, col in ((int(x), 'wood'), (int(x) + 1, 'wood_dk')):
                im.putpixel((xx, yy), rgba(col))
        im.putpixel((int(x), int(y) - 10), rgba('p_md')); im.putpixel((int(x) + 1, int(y) - 10), rgba('p_md'))
    return im


def tuft(seed):
    rows = ['..g..', '.gGg.', 'gGdGg', '.ddd.']
    return sprite(rows, {'g': 'g_dk', 'G': 'g_hi' if seed % 2 else 'g_md', 'd': 'g_dp'})


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
    """Stairs climb toward whichever neighbour is one level up: -y (steps descend toward +y) or -x."""
    z = m.z(x, y)
    if m.z(x, y - 1) == z + 1: return 'y'
    if m.z(x - 1, y) == z + 1: return 'x'
    return 'y'


def ground_tile(m, x, y):
    k = m.kind(x, y)
    t = fr(f'grass_{(x * 7 + y * 3) % 4}').copy()
    if k == 'flowers': t = fr(f'grass_{4 + (x + y) % 2}').copy()
    if k == 'tall': t = fr('tall_a').copy()
    if k in ('path', 'dirt', 'water', 'stairs', 'exit'):
        kk = 'path' if k in ('stairs', 'exit') else k
        def same(dx, dy):
            k2 = m.kind(x + dx, y + dy)
            if k2 is None: return True
            if kk == 'path' and k2 in ('stairs', 'sign', 'exit'): return True
            return k2 == kk
        suf = '_a' if kk == 'water' else ''
        mask = same(0, -1) * 1 + same(1, 0) * 2 + same(0, 1) * 4 + same(-1, 0) * 8
        t.alpha_composite(fr(f'{kk}_{mask}{suf}'))
        for c, (dx, dy) in {'ne': (1, -1), 'se': (1, 1), 'sw': (-1, 1), 'nw': (-1, -1)}.items():
            if same(dx, 0) and same(0, dy) and not same(dx, dy):
                t.alpha_composite(fr(f'{kk}_nub_{c}{suf}'))
    return np.asarray(t)


def project(tile):
    out = np.zeros((TH, TW, 4), np.uint8)
    for sy in range(TH):
        for sx in range(TW):
            u, v = sx - 15.5, sy + 0.5
            a, b = v + u / 2, v - u / 2
            if 0 <= a < 16 and 0 <= b < 16:
                out[sy, sx] = tile[int(b), int(a)]
    return out


def put(canvas, x, y, col):
    if 0 <= y < canvas.shape[0] and 0 <= x < canvas.shape[1]:
        canvas[y, x] = col


def face(canvas, sx, sy, side, depth, seed, ragged=False, lip=True):
    """A side face under one tile edge: 'l' faces +y (lit), 'r' faces +x (in shade).
    Mostly boulders; some edges are patched with brick or a taped plaster panel, as in the concept."""
    rng = np.random.default_rng(seed)
    lit = side == 'l'
    mat = 'brick' if seed % 9 == 4 else 'plaster' if seed % 11 == 7 else 'stone'
    if ragged: mat = 'stone'
    tone = {'hi': P['s_hi'] if lit else P['s_lt'], 'mid': P['s_lt'] if lit else P['s'], 'lo': P['s'] if lit else P['s_dk'], 'seam': P['s_ol']}
    cells, d0 = [], 0
    while d0 < depth + 8:
        c0, h = -int(rng.integers(0, 6)), int(rng.integers(5, 9))
        while c0 < 20:
            w = int(rng.integers(5, 10)); cells.append((c0 + w / 2, d0 + h / 2, w / 2, h / 2)); c0 += w
        d0 += h
    cut = [depth - ((int(rng.integers(0, 8)) + (c * 7) % 5) if ragged else 0) for c in range(16)]
    for c in range(16):
        x = sx + c if lit else sx + 16 + c
        top = sy + 8 + c // 2 if lit else sy + 15 - c // 2
        for d in range(max(0, cut[c])):
            yy = top + d + 1
            if mat == 'brick' and 2 < d < min(depth, 15):
                course = (d - 3) // 3
                joint = (c + (2 if course % 2 else 0)) % 5 == 0
                col = (120, 60, 50) if (d - 3) % 3 == 2 or joint else ((184, 88, 64) if lit else (150, 70, 54))
            elif mat == 'plaster' and 2 < d < min(depth, 14):
                col = (226, 214, 190) if lit else (196, 184, 160)
                if d in (3, 13) or c in (0, 15): col = P['tape'] if (c + d) % 3 == 0 else (170, 156, 130)
            else:
                best, pos = None, 9.0
                for (cc, dd, rw, rh) in cells:
                    q = ((c - cc) / rw) ** 2 + ((d - dd) / rh) ** 2
                    if q < pos: best, pos = (cc, dd, rw, rh), q
                if pos > 0.82: col = tone['seam']
                else:
                    cc, dd, rw, rh = best
                    col = tone['hi'] if (d - dd) / rh + (c - cc) / rw * 0.5 < -0.55 else tone['lo'] if (d - dd) / rh > 0.45 else tone['mid']
                # moss creeping down from the lip
                if d < 9 and (c * 13 + d * 7 + seed) % 11 == 0: col = P['g_dk']
                # a vine hanging down from the lip now and then
                if (c + seed) % 13 == 0 and d < 6 + seed % 9: col = P['t'] if d % 3 else P['t_lt']
            if ragged and d >= cut[c] - 2: col = tone['seam']
            if lip and d < 3:
                col = P['g_md'] if d == 0 else P['g_dk'] if d == 1 else (P['g_dp'] if (c * 5 + seed) % 4 == 0 else col)
            put(canvas, x, yy, (*col, 255))


def stairs(canvas, scr, x, y, z_low, axis):
    """Stone steps from z_low + 1 down to z_low, descending toward +y (axis 'y') or +x ('x')."""
    sx, sy = scr(x, y, 0)
    for k in range(4):
        h = int((z_low + 1 - (k + 1) / 4) * HZ)
        for py in range(TH):
            for px in range(TW):
                u, v = px - 15.5, py + 0.5
                a, b = v + u / 2, v - u / 2
                along, across = (b, a) if axis == 'y' else (a, b)
                if 0 <= across < 16 and 4 * k <= along < 4 * k + 4:
                    col = P['s_hi'] if along < 4 * k + 1.2 else P['s_lt']
                    if across < 2.5 or across >= 13.5: col = P['s_dk']
                    put(canvas, sx + px, sy - h + py, (*col, 255))
        e = 4 * k + 4
        for t2 in range(32):
            t = t2 / 2
            a, b = (t, e) if axis == 'y' else (e, t)
            ex, ey = int(round(sx + 15.5 + a - b)), int(sy - h + (a + b) / 2)
            for d in range(1, HZ // 4 + 1):
                col = P['s_ol'] if d == HZ // 4 or t < 2.5 or t >= 13.5 else (P['s'] if axis == 'y' else P['s_dk'])
                put(canvas, ex, ey + d, (*col, 255))


UNDER = 72   # how far the island's rock hangs below its lowest ground


def exit_steps(canvas, sx, sy, depth, side):
    """Steps cut down the island's face under the path's end (the way off, to Route 1)."""
    for d in range(0, depth, 4):
        for c in range(3, 13):
            x = sx + c if side == 'l' else sx + 16 + c
            top = (sy + 8 + c // 2 if side == 'l' else sy + 15 - c // 2) + d + 1
            for k, col in ((0, P['s_hi']), (1, P['s_lt']), (2, P['s_lt']), (3, P['s_ol'])):
                put(canvas, x, top + k, (*col, 255))


def grade(a, gx=None, gy=None):
    """Golden hour, as in the concept: warm the colours, lift shadows toward warm brown, and add a
    soft sunlit glow from the top left. `a` is an RGBA array; gx/gy place it on the map for the glow."""
    out = a.astype(float)
    rgb = out[..., :3]
    lum = rgb.mean(-1, keepdims=True) / 255
    rgb *= np.array([1.05, 0.98, 0.9])
    rgb += (1 - lum) * np.array([14, 6, -4])                  # shadows lean warm
    rgb = rgb * 0.86 + lum * 255 * np.array([0.15, 0.13, 0.08])  # a little less candy, more olive
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


def bake(map_id, preview=None):
    data = json.load(open(os.path.join(GAME, 'maps', f'{map_id}.json')))
    m = Map(data)
    pad_x, pad_top, pad_bot = 40, 80, 120
    W = (m.W + m.H) * TW // 2 + 2 * pad_x
    Hh = (m.W + m.H) * TH // 2 + pad_top + pad_bot
    OX = pad_x + m.H * TW // 2 - TW // 2
    OY = pad_top
    scr = lambda x, y, z: (OX + (x - y) * TW // 2, OY + (x + y) * TH // 2 - int(z * HZ))
    canvas = backdrop(W, Hh)

    order = sorted(((x, y) for y in range(m.H) for x in range(m.W) if m.Z[y, x] > 0), key=lambda p: (p[0] + p[1], p[0]))
    rng = np.random.default_rng(11)
    tufts = []
    for (x, y) in order:
        z = m.Z[y, x]
        k = m.kind(x, y)
        sx, sy = scr(x, y, z)
        zl, zr = m.z(x, y + 1), m.z(x + 1, y)
        if k == 'stairs':
            stairs(canvas, scr, x, y, z, stair_axis(m, x, y))
            # its own sides still need faces where they drop further
        seed = x * 31 + y * 17
        if zl < z and not (k == 'stairs' and stair_axis(m, x, y) == 'y'):
            face(canvas, sx, sy, 'l', (z - zl) * HZ + (UNDER if zl == 0 else 0), seed, ragged=zl == 0)
            if k == 'exit': exit_steps(canvas, sx, sy, (z - zl) * HZ + UNDER - 20, 'l')
        if zr < z and not (k == 'stairs' and stair_axis(m, x, y) == 'x'):
            face(canvas, sx, sy, 'r', (z - zr) * HZ + (UNDER if zr == 0 else 0), seed + 3, ragged=zr == 0)
            if k == 'exit' and zl != 0: exit_steps(canvas, sx, sy, (z - zr) * HZ + UNDER - 20, 'r')
        if k == 'stairs':
            continue
        top = project(ground_tile(m, x, y))
        for py in range(TH):
            for px in range(TW):
                if top[py, px, 3]: canvas[sy + py, sx + px] = top[py, px]
        if k == 'grass' and rng.random() < 0.8:
            for _ in range(int(rng.integers(1, 3))):
                tufts.append((sx + int(rng.integers(6, 22)), sy + int(rng.integers(3, 11)), tuft(int(rng.integers(4)))))
    for x, y, t in tufts:
        a = np.asarray(t)
        for yy in range(a.shape[0]):
            for xx in range(a.shape[1]):
                if a[yy, xx, 3]: put(canvas, x + xx, y + yy, a[yy, xx])

    # upright things: their screen spot and draw order
    for name, im in PROPS.items():
        im.save(os.path.join(OUT, f'{name}.png'))
    for v in range(3):
        tree(v).save(os.path.join(OUT, f'tree_{v}.png'))
    for ax in 'xy':
        fence_sprite(ax).save(os.path.join(OUT, f'fence_{ax}.png'))
    sprites = []
    def add(art, img, x, y, wx, wy, z, decal=False):
        if wx == 1 and wy == 1:
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
                add(f'tree_{v}', tree(v), x, y, 1, 1, m.Z[y, x])
                j = sprites[-1]
                j['x'] += (x * 7 + y * 11) % 7 - 3
                j['y'] += (x * 5 + y * 13) % 5 - 2
            elif k == 'fence':
                along_x = m.kind(x - 1, y) == 'fence' or m.kind(x + 1, y) == 'fence'
                ax = 'x' if along_x else 'y'
                add(f'fence_{ax}', fence_sprite(ax), x, y, 1, 1, m.Z[y, x])
            elif k == 'bush':
                add(f'bush_{(x * 3 + y) % 4}', bush((x * 3 + y) % 4), x, y, 1, 1, m.Z[y, x])
            elif k == 'sign':
                s = fr('sign')
                add('sign', s, x, y, 1, 1, m.Z[y, x])
    fr('sign').save(os.path.join(OUT, 'sign.png'))
    for i in range(4):
        bush(i).save(os.path.join(OUT, f'bush_{i}.png'))
    for o in data.get('objects', []):
        d = OBJ[o['kind']]
        img = Image.open(os.path.join(OUT, f"{d['art']}.png"))
        add(d['art'], img, o['x'], o['y'], d['wx'], d['wy'], m.Z[o['y'], o['x']], d.get('decal', False))
    sprites.sort(key=lambda s: s['key'])

    os.makedirs(os.path.join(OUT, 'maps'), exist_ok=True)
    canvas = grade(canvas, 0, 0)
    Image.fromarray(canvas, 'RGBA').save(os.path.join(OUT, 'maps', f'{map_id}.png'))
    # every upright piece, graded to match (the game loads these)
    os.makedirs(os.path.join(OUT, 'graded'), exist_ok=True)
    for art in sorted({sp['art'] for sp in sprites}):
        a = np.asarray(Image.open(os.path.join(OUT, f'{art}.png')).convert('RGBA'))
        Image.fromarray(grade(a), 'RGBA').save(os.path.join(OUT, 'graded', f'{art}.png'))
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
