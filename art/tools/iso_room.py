"""Bakes a room (a house, a sanctuary hall) for the isometric overworld: a cut-away like a
dollhouse, after art/LOCATION_STYLE.md "Interiors". The floor diamond with a thin cut edge at the
front, the two back walls standing (left: along x = 0, in shade; right: along y = 0, lit), no front
walls, no ceiling, a dark warm backdrop.

The map file's `interior` says how it looks (placeholders until the owner's interior sheets arrive):
  floor: wood | plank | carpet | tile | stone        wall: plaster | stone | wood | foam | cave
  floorColor / wallColor: '#rrggbb' to tint            wallH: wall height in px (default 40)
  windows: [[wall, at, w?]]   golden-hour light, with a patch of sun on the floor
  doors:   [[wall, at, kind]] kind: arch (open, dark) | rubble (the arch behind rubble) | sealed
           (a stone door with CRT light in its seam) | door (wooden)
  decor:   [[wall, at, kind, w?]] flat things on a wall: pins, towel, poster, photos, whiteboard,
           fixboard, leds, screen (a dead CRT in the stone), roots, foam, van (a high basement
           window with the white van outside), clock, flag, list (the [REDACTED] list)
`wall` is 'l' (the left back wall; `at` counts tiles along +y) or 'r' (the right one, along +x).
Tile kind 'mat' (the doormat) gets a rug; furniture comes from data/objects.json like any object.
Called by iso_map.py: python3 art/tools/iso_map.py <room>
"""
import json, os
import numpy as np
from PIL import Image


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


FLOOR = {'wood': '#a8744a', 'plank': '#8c6a4a', 'carpet': '#7a7468', 'tile': '#d9a06a', 'stone': '#8e8a82'}
WALL = {'plaster': '#e8dcc0', 'stone': '#9a948a', 'wood': '#8a6446', 'foam': '#4b4f66', 'cave': '#7a746a'}
INK = hexc('#1c1b29')


def noise(x, y, seed=0):
    return ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) % 1000 / 1000


def floor_px(kind, base, a, b, tx, ty):
    """The floor's colour at diamond coords a (along +x) and b (along +y) in px, on tile (tx, ty)."""
    A, B = tx * 16 + a, ty * 16 + b
    n = noise(int(A), int(B), 1)
    c = base.copy()
    if kind in ('wood', 'plank'):
        w = 4 if kind == 'wood' else 6
        board = int(B // w)
        c *= 0.92 + 0.12 * noise(board, int((A + board * 7) // 24), 2)
        if int(B) % w == 0: c *= 0.72                                    # the gap between boards
        if int(A + board * 11) % 24 == 0: c *= 0.8                        # board ends
        if kind == 'plank' and n > 0.97: c *= 0.7                         # knots
    elif kind == 'carpet':
        c *= 0.95 + 0.08 * n
    elif kind == 'tile':
        if (int(A // 8) + int(B // 8)) % 2: c *= 0.86
        if int(A) % 8 == 0 or int(B) % 8 == 0: c = c * 0.6 + hexc('#f3ead2') * 0.4
    elif kind == 'stone':
        # flagstones: uneven rows, offset joints
        row = int(B // 7)
        off = (row * 5) % 11
        stone = int((A + off) // 11)
        c *= 0.86 + 0.18 * noise(stone, row, 3)
        if int(B) % 7 == 0 or int(A + off) % 11 == 0: c *= 0.62
        if noise(stone, row, 4) > 0.86 and n > 0.7: c = c * 0.7 + hexc('#6cb240') * 0.3      # moss
    return c


def wall_px(kind, base, u, v, H, seed):
    """A wall's colour at u px along it (from the back corner) and v px up from the floor."""
    c = base.copy()
    n = noise(int(u), int(v), seed)
    if kind == 'plaster':
        c *= 0.97 + 0.05 * n
        if v < 4: c = hexc('#9a6a44') * (0.8 if v < 1 else 1)              # skirting board
    elif kind == 'stone' or kind == 'cave':
        row = int(v // 7)
        off = (row * 7) % 13
        blk = int((u + off) // 13)
        c *= 0.84 + 0.2 * noise(blk, row, seed + 5)
        if int(v) % 7 == 0 or int(u + off) % 13 == 0: c *= 0.66
        if kind == 'cave' and noise(blk, row, seed + 9) > 0.8: c = c * 0.75 + hexc('#6cb240') * 0.25
    elif kind == 'wood':
        board = int(u // 6)
        c *= 0.88 + 0.16 * noise(board, 0, seed)
        if int(u) % 6 == 0: c *= 0.7
    elif kind == 'foam':
        # acoustic foam: a grid of little pyramids, lit top-left
        cu, cv = u % 6, v % 6
        c *= 1.15 if cu < 3 and cv > 3 else 0.85 if cu >= 3 and cv <= 3 else 1.0
        if v < 4: c = hexc('#353849')
    if v >= H - 2: c = c * 0.6 + hexc('#f3ead2') * 0.4 if v >= H - 1 else c * 1.1   # the wall's top edge
    return c


class Room:
    def __init__(self, data, g):
        self.g = g
        self.d = data
        it = data['interior']
        self.it = it
        self.rows = data['rows']
        self.H, self.W = len(self.rows), len(self.rows[0])
        self.wallH = it.get('wallH', 40)
        self.px_, self.top, self.bot = 20, self.wallH + 12, 28
        self.CW = (self.W + self.H) * 16 + 2 * self.px_
        self.CH = (self.W + self.H) * 8 + self.top + self.bot
        self.OX = self.px_ + self.H * 16 - 16
        self.OY = self.top + 16                         # the floor stands at height 1
        self.a = np.zeros((self.CH, self.CW, 4), np.uint8)

    def scr(self, x, y, z):
        return self.OX + (x - y) * 16, self.OY + (x + y) * 8 - int(z * 16)

    def put(self, x, y, c, alpha=1.0):
        x, y = int(x), int(y)
        if 0 <= x < self.CW and 0 <= y < self.CH:
            c = np.clip(c, 0, 255)
            if alpha < 1 and self.a[y, x, 3]:
                c = self.a[y, x, :3] * (1 - alpha) + c * alpha
            self.a[y, x] = (*c.astype(np.uint8), 255)

    def wall_point(self, wall, t, v):
        """Screen px of a point on a back wall: t tiles along it from the back corner, v px up."""
        x0, y0 = self.scr(0, 0, 1)
        x0 += 16
        return (x0 + t * 16, y0 + t * 8 - v) if wall == 'r' else (x0 - t * 16, y0 + t * 8 - v)

    def backdrop(self):
        h, w = self.CH, self.CW
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.hypot((xx - w / 2) / w, (yy - h * 0.45) / h)
        k = np.clip(1 - d * 1.4, 0, 1)[..., None]
        rgb = hexc('#141019') * (1 - k) + hexc('#2a2230') * k
        self.a[..., :3] = rgb.astype(np.uint8)
        self.a[..., 3] = 255

    def floor(self):
        kind = self.it.get('floor', 'wood')
        base = hexc(self.it.get('floorColor', FLOOR[kind]))
        mat = hexc('#c2502f')
        for y in range(self.H):
            for x in range(self.W):
                sx, sy = self.scr(x, y, 1)
                k = self.d['legend'][self.rows[y][x]]
                for py in range(16):
                    for px in range(32):
                        u, v = px - 15.5, py + 0.5
                        a, b = v + u / 2, v - u / 2
                        if not (0 <= a < 16 and 0 <= b < 16): continue
                        c = floor_px(kind, base, a, b, x, y)
                        if k == 'mat':
                            edge = min(a, b, 16 - a, 16 - b)
                            c = mat * (0.85 if edge < 2 else 1.0) if edge > 1 else c * 0.7
                            if 4 < edge < 6: c = hexc('#f2c14e')
                        self.put(sx + px, sy + py, c)
        # the cut edge along the front: the floor's thickness, darker
        for y in range(self.H):
            for x in range(self.W):
                sx, sy = self.scr(x, y, 1)
                for c in range(16):
                    if y == self.H - 1:
                        for d in range(6):
                            self.put(sx + c, sy + 8 + c // 2 + d + 1, base * (0.55 - d * 0.03))
                    if x == self.W - 1:
                        for d in range(6):
                            self.put(sx + 16 + c, sy + 15 - c // 2 + d + 1, base * (0.42 - d * 0.03))

    def walls(self):
        kind = self.it.get('wall', 'plaster')
        base = hexc(self.it.get('wallColor', WALL[kind]))
        H = self.wallH
        for wall, n, lit in (('l', self.H, 0.8), ('r', self.W, 1.0)):
            for i in range(n * 16):
                t = i / 16
                for v in range(H):
                    x, y = self.wall_point(wall, t, v)
                    self.put(x, y, wall_px(kind, base, i, v, H, 1 if wall == 'l' else 2) * lit)
                    if wall == 'l' and abs(t * 16 - round(t * 16)) < 1e-6:
                        self.put(x, y + 1, wall_px(kind, base, i, v, H, 1) * lit)
            # the wall's thickness at its open end, and its top
            for v in range(H + 2):
                x, y = self.wall_point(wall, n, v)
                for k in range(3):
                    self.put(x + (k if wall == 'r' else -k), y + (k // 2 if wall == 'r' else k // 2), base * 0.5)
        # the back corner: a post
        for v in range(H + 1):
            x, y = self.wall_point('r', 0, v)
            self.put(x, y, base * 0.55)

    def wall_rect(self, wall, t0, t1, v0, v1, colour):
        """Fill a rectangle on a wall, `colour` a function (u, v) -> rgb or None, u in px from t0."""
        for i in range(int(t0 * 16), int(t1 * 16)):
            for v in range(int(v0), int(v1)):
                c = colour(i - t0 * 16, v - v0)
                if c is None: continue
                x, y = self.wall_point(wall, i / 16, v)
                self.put(x, y, c * (0.85 if wall == 'l' else 1.0))
                if wall == 'l': self.put(x, y + 1, c * 0.85)

    def windows(self):
        sky = [hexc('#f2b880'), hexc('#f6d8a8'), hexc('#cfe0e8')]
        frame = hexc(self.it.get('frame', '#f3ead2'))
        for spec in self.it.get('windows', []):
            wall, at = spec[0], spec[1]
            w = spec[2] if len(spec) > 2 else 1
            v0, v1 = 12, self.wallH - 8
            hh = v1 - v0
            def col(u, v, w=w, hh=hh):
                U = w * 16
                if u < 2 or u >= U - 2 or v < 2 or v >= hh - 2 or abs(u - U / 2) < 1 or abs(v - hh / 2) < 1: return frame
                k = v / hh
                c = sky[0] * (1 - k) + sky[1] * k if k < 0.6 else sky[1] * (1 - (k - .6) / .4) + sky[2] * ((k - .6) / .4)
                return c
            self.wall_rect(wall, at + (1 - w) * 0 + 0.15, at + w - 0.15, v0, v1, col)
            for v in range(v0 - 3, v0):                    # the sill
                self.wall_rect(wall, at + 0.05, at + w - 0.05, v, v + 1, lambda u, vv: frame * 0.8)
            self.sunlight(wall, at, w)

    def sunlight(self, wall, at, w):
        """A warm patch of light on the floor in front of a window, falling down-right of it."""
        warm = hexc('#ffd890')
        for y in range(self.H):
            for x in range(self.W):
                t, d = (x, y) if wall == 'r' else (y, x)
                if not (at <= t - d * 0.5 < at + w and 0 <= d < 3): continue
                sx, sy = self.scr(x, y, 1)
                for py in range(16):
                    for px in range(32):
                        u, v = px - 15.5, py + 0.5
                        a, b = v + u / 2, v - u / 2
                        if 0 <= a < 16 and 0 <= b < 16 and (int(a) + int(b)) % 2 == 0:
                            self.put(sx + px, sy + py, warm, 0.18 - d * 0.04)

    def doors(self):
        for wall, at, kind in self.it.get('doors', []):
            v1 = min(self.wallH - 4, 34)
            if kind in ('arch', 'rubble'):
                def col(u, v, v1=v1):
                    U = 16
                    r = abs(u - U / 2 + 0.5)
                    top = v1 - max(0, (r - 3)) ** 2 / 4
                    if v > top or r > 7.5: return None
                    if v > top - 2 or r > 6: return hexc('#5a5650')
                    return hexc('#0e0b12') + (v / v1) * 18
                self.wall_rect(wall, at, at + 1, 0, v1 + 1, col)
            elif kind == 'sealed':
                def col(u, v, v1=v1):
                    if u < 1 or u > 15 or v > v1: return None
                    if abs(u - 8) < 0.8: return hexc('#4aa8ff') * (0.8 + 0.2 * (v % 3 == 0))
                    if u < 2.5 or u > 13.5 or v > v1 - 2: return hexc('#5a5650')
                    return hexc('#7a746a') * (0.9 + 0.1 * ((int(v) // 6) % 2))
                self.wall_rect(wall, at, at + 1, 0, v1 + 1, col)
            elif kind == 'door':
                def col(u, v, v1=v1):
                    if u < 2 or u > 14 or v > v1: return None
                    if u < 3 or u > 13 or v > v1 - 1: return hexc('#3e2a20')
                    if 10 < u < 12 and 14 < v < 17: return hexc('#f2c14e')
                    return hexc('#7a5238') * (0.9 + 0.1 * (int(u) % 4 == 0))
                self.wall_rect(wall, at, at + 1, 0, v1 + 1, col)

    def decor(self):
        for spec in self.it.get('decor', []):
            wall, at, kind = spec[0], spec[1], spec[2]
            w = spec[3] if len(spec) > 3 else 1
            r = np.random.default_rng(int(at * 7 + len(kind)))
            if kind == 'pins':       # a corkboard of Patchling pins
                cols = [hexc(c) for c in ('#c2502f', '#3a78c8', '#f2c14e', '#2f9e7f', '#7a52b8', '#f07890')]
                dots = {(int(r.integers(3, w * 16 - 3)), int(r.integers(3, 15))): cols[i % 6] for i in range(14)}
                def col(u, v):
                    if (int(u), int(v)) in dots or (int(u) - 1, int(v)) in dots: return dots.get((int(u), int(v)), dots.get((int(u) - 1, int(v))))
                    if u < 1 or v < 1 or u >= w * 16 - 1 or v >= 17: return hexc('#6a4430')
                    return hexc('#c8a070') * (0.95 + 0.05 * noise(int(u), int(v)))
                self.wall_rect(wall, at + 0.1, at + w - 0.1, 14, 32, col)
            elif kind in ('towel', 'flag'):   # a Scottish saltire tea towel
                def col(u, v):
                    U, V = w * 16 - 6, 14
                    if abs(u / U - v / V) < 0.12 or abs(u / U - (1 - v / V)) < 0.12: return hexc('#f3f1e7')
                    return hexc('#2a5aa8')
                self.wall_rect(wall, at + 0.2, at + w - 0.2, 16, 30, col)
            elif kind == 'poster':
                c1, c2 = hexc(spec[4] if len(spec) > 4 else '#7a52b8'), hexc('#a6e34e')
                def col(u, v):
                    if u < 1 or v < 1 or u > w * 16 - 5 or v > 19: return hexc('#f3ead2')
                    if 4 < u < 10 and 6 < v < 15: return c2
                    return c1
                self.wall_rect(wall, at + 0.15, at + w - 0.15, 12, 33, col)
            elif kind == 'photos':
                frames = [(1, 4, 8, 7), (11, 2, 8, 9), (21, 6, 7, 6)]
                fills = [hexc(c) for c in ('#f2c14e', '#8fd3b6', '#f07890')]
                def col(u, v):
                    for i, (fu, fv, fw, fh) in enumerate(frames):
                        if fu <= u < fu + fw and fv <= v < fv + fh:
                            edge = u < fu + 1 or u >= fu + fw - 1 or v < fv + 1 or v >= fv + fh - 1
                            return hexc('#6a4430') if edge else fills[i]
                    return None
                self.wall_rect(wall, at, at + w, 16, 32, col)
            elif kind in ('whiteboard', 'fixboard', 'list'):
                def col(u, v, kind=kind):
                    U = w * 16
                    if u < 1 or u >= U - 1 or v < 1 or v >= 19: return hexc('#8a8c98')
                    if kind == 'fixboard' and v > 14 and 3 < u < 14: return hexc('#c2502f')
                    if int(v) % 4 == 2 and 3 < u < U - 4 - (int(v) * 3) % 9:
                        if kind == 'list' and u > 6: return hexc('#1c1b29')   # every name scribbled out
                        return hexc('#3a78c8') if kind != 'list' else hexc('#c2502f')
                    return hexc('#fbf8ef')
                self.wall_rect(wall, at + 0.1, at + w - 0.1, 12, 32, col)
            elif kind == 'leds':
                self.wall_rect(wall, at, at + w, self.wallH - 6, self.wallH - 4,
                               lambda u, v: hexc(('#a6e34e', '#7a52b8', '#4aa8ff')[int(u // 6) % 3]))
            elif kind == 'screen':     # a dead CRT set into the stone, faintly blue
                def col(u, v):
                    if u < 3 or u > 13 or v < 0 or v > 11: return None
                    if u < 4 or u > 12 or v < 1 or v > 10: return hexc('#353849')
                    return hexc('#4aa8ff') * (0.55 + 0.1 * (int(v) % 2)) + hexc('#141019') * 0.3
                self.wall_rect(wall, at, at + 1, 14, 26, col)
            elif kind == 'roots':
                for k in range(3):
                    u0 = float(r.uniform(2, w * 16 - 2))
                    ln = int(r.integers(8, self.wallH - 6))
                    for v in range(ln):
                        u = u0 + np.sin(v * 0.3 + k) * 1.5
                        self.wall_rect(wall, at + u / 16, at + (u + 2) / 16, self.wallH - v - 1, self.wallH - v,
                                       lambda uu, vv: hexc('#7a5238'))
            elif kind == 'van':        # a high basement window: the white van in the driveway
                def col(u, v):
                    U = w * 16
                    if u < 1 or u >= U - 1 or v < 1 or v >= 11: return hexc('#f3ead2')
                    if v < 3: return hexc('#cfe0e8')
                    if 2 < u < U - 4 and v < 9: return hexc('#fbf8ef') if not (U - 10 < u < U - 6 and v < 6) else hexc('#3a78c8')
                    return hexc('#6cb240')
                self.wall_rect(wall, at + 0.1, at + w - 0.1, self.wallH - 16, self.wallH - 5, col)
            elif kind == 'clock':
                def col(u, v):
                    d = np.hypot(u - 6, v - 6)
                    if d > 6: return None
                    if d > 5: return hexc('#353849')
                    if (abs(u - 6) < 0.8 and 2 < v < 7) or (abs(v - 6) < 0.8 and 6 <= u < 10): return hexc('#1c1b29')
                    return hexc('#fbf8ef')
                self.wall_rect(wall, at + 0.1, at + 1, self.wallH - 18, self.wallH - 5, col)

    def bake(self, map_id, place_sprites, preview):
        g = self.g
        self.backdrop()
        self.walls()
        self.windows()
        self.doors()
        self.decor()
        self.floor()
        m = g['Map']({**self.d, 'heights': self.d.get('heights') or ['1' * self.W] * self.H})
        sprites = place_sprites(m, self.d, self.scr)
        sprites.sort(key=lambda s: s['key'])
        OUT = g['OUT']
        os.makedirs(os.path.join(OUT, 'maps'), exist_ok=True)
        canvas = g['grade'](self.a, 0, 0, k=0.25)
        Image.fromarray(canvas, 'RGBA').save(os.path.join(OUT, 'maps', f'{map_id}.png'))
        os.makedirs(os.path.join(OUT, 'graded'), exist_ok=True)
        for art in sorted({sp['art'] for sp in sprites}):
            a = np.asarray(Image.open(os.path.join(OUT, f'{art}.png')).convert('RGBA'))
            k = 0.25 if art.startswith('in_') else 0.15 if art in g['PROPS'] else 1.0
            Image.fromarray(g['grade'](a, k=k), 'RGBA').save(os.path.join(OUT, 'graded', f'{art}.png'))
        json.dump({'origin': {'x': self.OX, 'y': self.OY}, 'tile': {'w': 32, 'h': 16, 'z': 16}, 'size': {'w': self.CW, 'h': self.CH}, 'sprites': sprites},
                  open(os.path.join(OUT, 'maps', f'{map_id}.json'), 'w'), indent=1)
        print(f'{map_id}: {self.CW}x{self.CH}, {len(sprites)} sprites (room)')
        if preview:
            img = Image.fromarray(canvas, 'RGBA')
            for s in sprites:
                o = Image.open(os.path.join(OUT, 'graded', f"{s['art']}.png"))
                img.alpha_composite(o, (max(0, s['x']), max(0, s['y'])))
            img.save(preview)
        return self.scr


def bake_room(map_id, data, g, preview=None):
    return Room(data, g).bake(map_id, g['place_sprites'], preview)
