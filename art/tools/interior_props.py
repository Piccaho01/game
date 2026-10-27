"""Placeholder furniture for the interiors (houses, the sanctuary base), until the owner's interior
set-piece sheets arrive (prompts I-1 / I-2 in art/LOCATION_STYLE.md). Then each piece is converted
from his sheet with draft2object.py / iso_kit.py and the placeholder of the same name is dropped.

Clean isometric boxes in the UI palette (cream, rust, faded blue, gunmetal, tape), lit from the top
left like the town (left faces lit, right faces in shade), dark coloured outlines, a few details
each so the rooms read. Writes art/locations/out/in_<name>.png; data/objects.json places them
('box': true, footprint wx x wy).
Usage: python3 art/tools/interior_props.py [contact.png]
"""
import os, sys
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'locations', 'out')


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shade(c, k):
    return tuple(int(max(0, min(255, v * k))) for v in c)


C = {k: hexc(v) for k, v in {
    'cream': '#f3ead2', 'cream_dk': '#d8c9a2', 'rust': '#c2502f', 'blue': '#3a78c8', 'tape': '#e9d9a8',
    'metal': '#353849', 'metal_lt': '#4b4f66', 'ink': '#1c1b29', 'crt': '#4aa8ff', 'crt_lt': '#a6d8ff',
    'gold': '#f2c14e', 'wood': '#9a6a44', 'wood_lt': '#b88456', 'wood_dk': '#6a4430', 'green': '#2f9e7f',
    'moss': '#6cb240', 'stone': '#9a948a', 'stone_dk': '#6e6a64', 'red': '#d94a3d', 'pink': '#f07890',
    'mint': '#8fd3b6', 'navy': '#2a3a6a', 'yellow': '#f2d04e', 'white': '#fbf8ef', 'grey': '#8a8c98',
    'khaki': '#b8a46a', 'acid': '#a6e34e', 'purple': '#7a52b8', 'water': '#4a8ee8', 'root': '#7a5238',
}.items()}


class Box:
    """An isometric image: footprint wx (down-right) x wy (down-left) tiles of 32x16, up to `tall` px high."""

    def __init__(self, wx, wy, tall):
        self.wx, self.wy, self.tall = wx, wy, tall
        self.w = (wx + wy) * 16
        self.h = (wx + wy) * 8 + tall
        self.a = np.zeros((self.h, self.w, 4), np.uint8)

    def ground(self, a, b):
        """Screen point of footprint coords (a along +x, b along +y, in tiles) on the floor."""
        return self.wy * 16 + (a - b) * 16, self.tall + (a + b) * 8

    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = (*c, 255)

    def poly(self, pts, c):
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        for y in range(max(0, int(min(ys))), min(self.h, int(max(ys)) + 1)):
            for x in range(max(0, int(min(xs))), min(self.w, int(max(xs)) + 1)):
                if inside(x + 0.5, y + 0.5, pts): self.a[y, x] = (*c, 255)

    def block(self, a0, b0, a1, b1, z0, z1, col, top=None, side_l=None, side_r=None):
        """A solid block over footprint [a0,a1] x [b0,b1] (tiles), from z0 to z1 px up."""
        top = top or col
        g = lambda a, b, z: (self.ground(a, b)[0], self.ground(a, b)[1] - z)
        T, R, B, L = g(a0, b0, z1), g(a1, b0, z1), g(a1, b1, z1), g(a0, b1, z1)
        self.poly([L, B, (B[0], B[1] + z1 - z0), (L[0], L[1] + z1 - z0)], side_l or shade(col, 0.86))
        self.poly([B, R, (R[0], R[1] + z1 - z0), (B[0], B[1] + z1 - z0)], side_r or shade(col, 0.66))
        self.poly([T, R, B, L], top)
        return T, R, B, L

    def face_l(self, a0, b1, a1, z, u, v, w, h, c):
        """A rectangle on a block's lit (left) face: u along +x from a0, v down from height z."""
        x0, y0 = self.ground(a0, b1)
        for i in range(w):
            for j in range(h):
                self.px(x0 + (u + i), y0 - z + (u + i) / 2 + v + j, c)

    def face_r(self, a1, b1, z, u, v, w, h, c):
        """A rectangle on the shaded (right) face: u along -y from the front corner."""
        x0, y0 = self.ground(a1, b1)
        for i in range(w):
            for j in range(h):
                self.px(x0 + (u + i), y0 - z - (u + i) / 2 + v + j, c)

    def done(self):
        return outline(trim(self.a))


def inside(x, y, pts):
    n, c = len(pts), False
    for i in range(n):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-9) + x1: c = not c
    return c


def trim(a):
    """Keep the full canvas width and the bottom (the baker anchors on the bottom row): trim the top only."""
    ys = np.where(a[..., 3] > 0)[0]
    return a[ys.min():] if len(ys) else a


def outline(a, k=0.45):
    fg = a[..., 3] > 0
    p = np.pad(fg, 1)
    edge = np.zeros_like(fg)
    for dy, dx in ((0, 1), (2, 1), (1, 0), (1, 2)):
        edge |= ~p[dy:dy + fg.shape[0], dx:dx + fg.shape[1]]
    edge &= fg
    out = a.copy()
    rgb = out[..., :3].astype(float)
    out[edge, :3] = (rgb[edge] * k + np.array([10, 6, 18]) * (1 - k)).astype(np.uint8)
    return out


M = 0.12   # inset from the tile's edges, in tiles, so furniture doesn't touch the next tile


def low_table(top='wood_lt'):
    b = Box(1, 1, 20)
    b.block(M, M, 1 - M, 1 - M, 0, 3, C['wood_dk'])                       # feet shadow
    b.block(M + .05, M + .05, 1 - M - .05, 1 - M - .05, 3, 12, C['wood'], C[top])
    return b


def make():
    P = {}
    # --- Callum's cottage ---
    b = Box(1, 1, 34)                                    # a CRT on a low cabinet, an emulator running
    b.block(M, M, 1 - M, 1 - M, 0, 12, C['wood'], C['wood_lt'])
    b.block(.25, .2, .85, .8, 12, 30, C['metal_lt'], C['grey'])
    b.face_l(.25, .8, .85, 30, 3, 3, 12, 10, C['crt'])
    b.face_l(.25, .8, .85, 30, 5, 5, 4, 2, C['crt_lt'])
    b.face_l(.25, .8, .85, 30, 10, 9, 3, 2, C['gold'])
    P['in_crt_tv'] = b
    b = Box(1, 1, 44)                                    # comics and boxed retro games, floor to ceiling
    b.block(.15, .1, .9, .55, 0, 40, C['wood'], C['wood_lt'])
    cols = [C['red'], C['blue'], C['gold'], C['green'], C['purple'], C['cream'], C['rust']]
    for row, v in enumerate((4, 14, 24)):
        b.face_l(.15, .55, .9, 40, 1, v - 1, 22, 1, C['wood_dk'])
        for i in range(0, 21, 3):
            b.face_l(.15, .55, .9, 40, 1 + i, v, 2, 8, cols[(i // 3 + row * 2) % len(cols)])
    P['in_shelf_comics'] = b
    b = low_table()                                      # the table, with the Triple Cheese bag on it
    b.block(.38, .38, .6, .6, 12, 20, C['rust'], C['gold'])
    P['in_table_bag'] = b
    b = Box(1, 1, 24)                                    # a worn tartan armchair
    b.block(M, M, 1 - M, 1 - M, 0, 10, C['rust'])
    b.block(M, M, .32, 1 - M, 10, 22, C['rust'])
    b.block(M, M, 1 - M, .3, 10, 18, shade(C['rust'], .9))
    b.face_l(M, 1 - M, 1 - M, 10, 2, 2, 18, 1, C['gold'])
    P['in_armchair'] = b
    b = Box(1, 1, 18)                                    # laptop on a stool: Sergey's in the trenches again
    b.block(.25, .25, .75, .75, 0, 11, C['wood_dk'], C['wood'])
    b.block(.3, .3, .7, .7, 11, 12, C['metal'])
    b.block(.3, .3, .38, .7, 12, 18, C['metal_lt'], C['metal_lt'])
    b.face_r(.38, .7, 18, 1, 1, 6, 4, C['crt'])
    P['in_laptop'] = b
    # --- Nolan's basement studio ---
    b = Box(2, 1, 30)                                    # desk with the sampler and two monitors
    b.block(M, M, 2 - M, 1 - M, 0, 12, C['metal'], C['metal_lt'])
    b.block(.2, .15, .9, .4, 12, 26, C['ink'], C['metal'])
    b.block(1.05, .15, 1.8, .4, 12, 26, C['ink'], C['metal'])
    b.face_l(.2, .4, .9, 26, 2, 2, 16, 8, C['crt'])
    b.face_l(1.05, .4, 1.8, 26, 2, 2, 16, 8, C['green'])
    b.block(.6, .55, 1.3, .85, 12, 14, C['ink'], C['metal_lt'])          # the sampler: pads
    for i in range(4):
        b.face_l(.6, .85, 1.3, 14, 2 + i * 4, 0, 2, 1, (C['rust'], C['gold'], C['green'], C['crt'])[i])
    P['in_studio_desk'] = b
    b = Box(2, 1, 22)                                    # the couch
    b.block(M, M, 2 - M, 1 - M, 0, 9, C['grey'])
    b.block(M, M, 2 - M, .35, 9, 20, shade(C['grey'], .9))
    b.block(M, M, .3, 1 - M, 9, 15, shade(C['grey'], .95))
    b.block(1.7, M, 2 - M, 1 - M, 9, 15, shade(C['grey'], .95))
    b.block(.4, .4, .75, .75, 9, 13, C['green'])                             # a cushion
    P['in_couch'] = b
    b = Box(1, 1, 30)                                    # TV on a console: 2K22, disc still in the tray
    b.block(M, .15, 1 - M, .6, 0, 10, C['wood_dk'], C['wood'])
    b.block(.15, .25, .95, .4, 10, 28, C['ink'])
    b.face_l(.15, .4, .95, 28, 2, 2, 20, 12, C['blue'])
    b.face_l(.15, .4, .95, 28, 6, 6, 8, 3, C['rust'])
    b.block(.4, .45, .7, .58, 10, 12, C['metal_lt'])
    P['in_tv_console'] = b
    b = Box(1, 1, 36)                                    # a shelf: cinnamon schnapps with gold flakes, a sticky note
    b.block(.15, .1, .9, .5, 0, 32, C['wood'], C['wood_lt'])
    for v in (8, 20):
        b.face_l(.15, .5, .9, 32, 1, v, 22, 1, C['wood_dk'])
    b.face_l(.15, .5, .9, 32, 8, 2, 3, 6, C['gold'])
    b.face_l(.15, .5, .9, 32, 9, 0, 1, 2, C['red'])
    b.face_l(.15, .5, .9, 32, 13, 4, 4, 4, C['yellow'])
    b.face_l(.15, .5, .9, 32, 3, 14, 4, 6, C['blue'])
    b.face_l(.15, .5, .9, 32, 16, 15, 3, 5, C['rust'])
    P['in_shelf_bottle'] = b
    # --- Haydon's shed ---
    b = Box(1, 1, 46)                                    # the ring light
    b.block(.45, .45, .55, .55, 0, 30, C['metal'])
    cx, cy = b.ground(.5, .5)
    for t in np.linspace(0, 2 * np.pi, 64):
        for r in (8, 9):
            b.px(cx + np.cos(t) * r * .8, cy - 36 + np.sin(t) * r, C['white'])
    b.px(cx, cy - 36, C['metal'])
    for dx in (-4, 0, 4):
        b.block(.5 + dx / 32, .62, .52 + dx / 32, .7, 0, 2, C['metal'])
    P['in_ring_light'] = b
    b = Box(2, 1, 32)                                    # stream desk: a monitor, the mic on its arm, LED strip
    b.block(M, M, 2 - M, 1 - M, 0, 12, C['ink'], C['metal'])
    b.block(.4, .2, 1.4, .4, 12, 28, C['ink'], C['metal'])
    b.face_l(.4, .4, 1.4, 28, 2, 2, 28, 10, C['purple'])
    b.face_l(.4, .4, 1.4, 28, 4, 4, 10, 2, C['acid'])
    b.face_l(M, 1 - M, 2 - M, 12, 0, 2, 54, 1, C['acid'])
    b.block(1.55, .55, 1.65, .65, 12, 26, C['metal_lt'])
    b.block(1.5, .5, 1.7, .7, 26, 31, C['ink'], C['metal_lt'])
    P['in_stream_desk'] = b
    b = Box(1, 1, 30)                                    # gaming chair
    b.block(.3, .3, .7, .7, 0, 6, C['ink'])
    b.block(.2, .2, .8, .8, 6, 12, C['ink'], C['metal'])
    b.block(.2, .2, .35, .8, 12, 28, C['ink'], C['metal'])
    b.face_r(.35, .8, 28, 2, 2, 4, 12, C['acid'])
    P['in_gaming_chair'] = b
    b = Box(1, 1, 16)                                    # snacks: a pile of crisps and cans
    for (a0, b0, z, col) in ((.2, .3, 6, C['rust']), (.5, .2, 8, C['acid']), (.35, .55, 5, C['gold']), (.6, .55, 10, C['blue'])):
        b.block(a0, b0, a0 + .22, b0 + .22, 0, z, col)
    P['in_snacks'] = b
    # --- Dani's casa ---
    b = Box(2, 1, 30)                                    # the hammock, strung between two posts
    for a in (.12, 1.8):
        b.block(a, .4, a + .1, .5, 0, 28, C['wood_dk'], C['wood'])
    x0, y0 = b.ground(.17, .45)
    x1, y1 = b.ground(1.85, .45)
    for i in range(0, 101):
        t = i / 100
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 24 + np.sin(t * np.pi) * 12
        for k in range(4):
            b.px(x, y + k - 2 + abs(t - .5) * 2, (C['red'], C['yellow'], C['blue'], C['red'])[(i // 8 + k) % 4])
    P['in_hammock'] = b
    b = Box(1, 1, 10)                                    # the football
    cx, cy = b.ground(.5, .5)
    for yy in range(-9, 0):
        for xx in range(-5, 6):
            if xx * xx + (yy + 4.5) ** 2 <= 22:
                patch = (abs(xx) <= 1 and abs(yy + 4.5) <= 1.5) or (abs(xx) == 4 and yy in (-6, -3))
                b.px(cx + xx, cy - 1 + yy, C['ink'] if patch else C['white'])
    P['in_football'] = b
    b = Box(2, 1, 30)                                    # kitchen counter, the stove, the coffee pot
    b.block(M, .1, 2 - M, .6, 0, 18, C['cream'], C['tape'])
    b.face_l(M, .6, 2 - M, 18, 4, 4, 10, 10, C['cream_dk'])
    b.face_l(M, .6, 2 - M, 18, 30, 4, 10, 10, C['cream_dk'])
    b.block(1.1, .15, 1.6, .5, 18, 19, C['metal'])
    b.block(1.25, .22, 1.45, .42, 19, 27, C['metal_lt'], C['grey'])
    b.block(1.33, .3, 1.38, .35, 27, 29, C['ink'])
    b.block(.3, .2, .5, .4, 18, 22, C['red'])
    P['in_counter'] = b
    b = Box(1, 1, 46)                                    # the fridge, the Smash bracket on it
    b.block(.12, .1, .88, .7, 0, 42, C['white'], C['cream'])
    b.face_l(.12, .7, .88, 42, 1, 14, 24, 1, C['grey'])
    b.face_l(.12, .7, .88, 42, 5, 3, 10, 8, C['cream_dk'])
    for i in range(4): b.face_l(.12, .7, .88, 42, 6, 4 + i * 2, 4 + (i % 2) * 4, 1, C['ink'])
    b.face_l(.12, .7, .88, 42, 12, 5, 3, 1, C['red'])
    b.face_l(.12, .7, .88, 42, 18, 20, 2, 5, C['grey'])
    P['in_fridge'] = b
    b = Box(1, 1, 12)                                    # shoes by the door (one lace undone) and the phone charger
    b.block(.2, .35, .45, .55, 0, 4, C['cream'], C['white'])
    b.block(.2, .58, .45, .78, 0, 4, C['red'], C['cream'])
    b.block(.6, .3, .7, .4, 0, 8, C['ink'])
    P['in_shoes'] = b
    b = Box(1, 1, 30)                                    # a potted plant
    b.block(.3, .3, .7, .7, 0, 10, C['rust'])
    cx, cy = b.ground(.5, .5)
    for t in range(9):                                   # leaves fanning up and out
        ang = -np.pi / 2 + (t - 4) * 0.32
        for r in range(4, 17):
            w = 1 if r < 7 or r > 14 else 2
            for k in range(-w + 1, w):
                b.px(cx + np.cos(ang) * r + k, cy - 10 + np.sin(ang) * r, C['moss'] if (r + t) % 4 else C['green'])
    P['in_plant'] = b
    # --- the sanctuary ---
    b = Box(2, 1, 34)                                    # the CRT stones: old screens set in standing stones
    for (a0, b0, a1, b1, z) in ((.1, .2, .6, .7, 30), (.7, .1, 1.2, .55, 24), (1.3, .25, 1.85, .8, 32)):
        b.block(a0, b0, a1, b1, 0, z, C['stone'], shade(C['stone'], 1.1))
        b.face_l(a0, b1, a1, z, 3, 5, 9, 8, C['crt'])
        b.face_l(a0, b1, a1, z, 4, 6, 3, 2, C['crt_lt'])
    b.block(.2, .75, .4, .9, 0, 3, C['moss'])
    b.block(1.5, .85, 1.75, .95, 0, 2, C['moss'])
    P['in_crt_stones'] = b
    b = Box(1, 1, 34)                                    # the storage terminal: a cabinet PATCH taped back together
    b.block(.15, .15, .85, .7, 0, 30, C['metal_lt'], C['grey'])
    b.face_l(.15, .7, .85, 30, 3, 3, 16, 10, C['crt'])
    b.face_l(.15, .7, .85, 30, 5, 5, 6, 1, C['crt_lt'])
    b.face_l(.15, .7, .85, 30, 5, 8, 10, 1, C['crt_lt'])
    b.face_l(.15, .7, .85, 30, 2, 17, 18, 3, C['tape'])
    b.face_l(.15, .7, .85, 30, 6, 22, 3, 3, C['rust'])
    b.face_l(.15, .7, .85, 30, 12, 22, 3, 3, C['green'])
    P['in_terminal'] = b
    for name, col in (('in_bedroll_teal', '#3f8f8f'), ('in_bedroll_grey', '#8a8c98'), ('in_bedroll_khaki', '#b8a46a'), ('in_bedroll_navy', '#3a4a8a')):
        b = Box(1, 1, 8)
        c = hexc(col)
        b.block(.15, .1, .85, .9, 0, 3, c, shade(c, 1.15))
        b.block(.2, .12, .8, .32, 3, 6, C['cream'], C['white'])          # the pillow
        b.block(.2, .5, .8, .88, 3, 4, shade(c, .85))                    # the blanket's fold
        P[name] = b
    b = Box(1, 1, 34)                                    # rubble heaped in an archway (until Root Hall is restored)
    rng = np.random.default_rng(3)
    stones = []
    for _ in range(18):
        a0, b0 = rng.uniform(0, .72, 2)
        s = rng.uniform(.18, .32)
        mid = 1 - min(1, np.hypot(a0 + s / 2 - .35, b0 + s / 2 - .4) * 1.6)   # piled highest at the back
        z0 = int(mid * 18 * rng.uniform(.5, 1))
        stones.append((a0 + b0 + z0 / 40, a0, b0, s, z0, z0 + int(rng.uniform(5, 10))))
    for _, a0, b0, s, z0, z1 in sorted(stones):
        col = shade(C['stone'], rng.uniform(.85, 1.1))
        b.block(a0, b0, a0 + s, b0 + s, z0, z1, col, shade(col, 1.15))
    b.block(.15, .05, .25, .6, 20, 23, C['root'])
    P['in_rubble'] = b
    b = Box(1, 1, 50)                                    # a stone pillar with a root round it
    b.block(.25, .25, .75, .75, 0, 46, C['stone'], shade(C['stone'], 1.1))
    b.face_l(.25, .75, .75, 46, 1, 12, 15, 2, C['root'])
    b.face_r(.75, .75, 46, 0, 18, 15, 2, shade(C['root'], .8))
    b.face_l(.25, .75, .75, 46, 6, 30, 3, 3, C['crt'])
    P['in_pillar'] = b
    b = Box(2, 1, 26)                                    # PATCH's workbench: spare panels, a vice, tape
    b.block(M, .1, 2 - M, .7, 0, 14, C['wood_dk'], C['wood'])
    b.block(.3, .2, .8, .5, 14, 16, C['cream'])
    b.block(1.0, .2, 1.3, .45, 14, 22, C['metal_lt'])
    for i, a in enumerate((1.45, 1.6)):
        b.block(a, .25, a + .1, .4, 14, 18, (C['tape'], C['rust'])[i])
    P['in_workbench'] = b
    b = Box(2, 2, 44)                                    # PATCH's charging cradle, the size of a car (empty: he's outside)
    b.block(.15, .15, 1.85, 1.85, 0, 8, C['metal'], C['metal_lt'])
    b.block(.15, .15, .45, 1.85, 8, 40, C['metal'], C['metal_lt'])
    b.block(.15, .15, 1.85, .45, 8, 40, C['metal'], C['metal_lt'])
    b.face_l(.15, 1.85, .45, 40, 2, 10, 5, 3, C['crt'])
    b.face_l(.45, 1.85, 1.85, 8, 6, 2, 36, 2, C['gold'])
    b.block(.9, .9, 1.1, 1.1, 8, 10, C['crt'])
    P['in_cradle'] = b
    b = Box(1, 1, 30)                                    # spare panels leaning in a stack, tape rolls
    for i, col in enumerate((C['cream'], C['rust'], C['blue'])):
        b.block(.15 + i * .12, .2, .3 + i * .12, .8, 0, 26 - i * 5, col, shade(col, 1.05))
    b.block(.65, .55, .85, .75, 0, 5, C['tape'])
    P['in_panels'] = b
    b = Box(2, 2, 40)                                    # the old keepers' roots, through the floor
    rng = np.random.default_rng(5)
    for _ in range(14):
        a0, b0 = rng.uniform(.1, 1.6, 2)
        z = int(rng.uniform(6, 36))
        b.block(a0, b0, a0 + .22, b0 + .22, 0, z, C['root'], shade(C['root'], 1.2))
    b.block(.8, .8, 1.1, 1.1, 0, 38, C['root'], shade(C['moss'], .9))
    P['in_roots'] = b
    b = Box(1, 1, 16)                                    # a keepers' stone bench
    b.block(.15, .3, .85, .7, 0, 4, C['stone_dk'])
    b.block(.1, .25, .9, .75, 4, 9, C['stone'], shade(C['stone'], 1.12))
    P['in_keeper_bench'] = b
    b = Box(2, 2, 4)                                     # the hall's pool, CRT-blue under the water
    b.block(.1, .1, 1.9, 1.9, 0, 3, C['stone_dk'], C['stone'])
    b.block(.25, .25, 1.75, 1.75, 1, 3, C['water'], C['water'])
    b.block(.7, .7, 1.3, 1.3, 2, 3, C['crt'], C['crt_lt'])
    P['in_pool'] = b
    b = Box(1, 1, 4)                                     # a rug (flat)
    b.block(.05, .05, .95, .95, 0, 1, C['rust'], C['rust'])
    b.block(.15, .15, .85, .85, 0, 1, C['gold'], C['gold'])
    b.block(.22, .22, .78, .78, 0, 1, C['rust'], shade(C['rust'], .9))
    P['in_rug'] = b
    return {k: v.done() for k, v in P.items()}


def build():
    made = make()
    for n, a in made.items():
        Image.fromarray(a, 'RGBA').save(os.path.join(OUT, f'{n}.png'))
    return made


if __name__ == '__main__':
    made = build()
    print(len(made), 'placeholder pieces')
    if len(sys.argv) > 1:
        cw, ch, cols = 80, 80, 8
        rows = (len(made) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * cw, rows * ch), (60, 56, 70, 255))
        for i, (n, a) in enumerate(made.items()):
            im = Image.fromarray(a, 'RGBA')
            sheet.alpha_composite(im, ((i % cols) * cw + (cw - im.width) // 2, (i // cols) * ch + ch - im.height - 4))
        sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(sys.argv[1])
