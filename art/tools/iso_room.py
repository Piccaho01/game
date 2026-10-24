"""Rooms for iso_map.py (M4b interiors): a cut-away room, the floor diamond with its two back walls
standing and no front walls, like a dollhouse (art/LOCATION_STYLE.md, Interiors).

PLACEHOLDER ART: the floors, walls and furniture here are drawn in code from the UI palette so the
rooms are playable before the owner's interior drafts arrive. Once a room's drafts are in
(concept + furniture sheet, prompts I-1/I-2), its pieces are converted like the town's and these
stand-ins go.

  floor(style, x, y)          one 32x16 floor diamond
  walls(canvas, m, scr, ...)  the back walls along x = 0 (left) and y = 0 (right), with an arch
                              wherever a warp leaves through them and windows from the map file
  furniture()                 writes the placeholder pieces (art/locations/out/ph_<name>.png):
                              boxes the size of their footprint, drawn on a canvas exactly
                              (wx + wy) * 16 wide whose bottom row is the footprint's front corner
"""
import os
import numpy as np
from PIL import Image, ImageDraw

TW, TH, HZ = 32, 16, 16
WALL_H = 52
BG = (22, 20, 28)
OUT = os.path.join(os.path.dirname(__file__), '..', 'locations', 'out')

# the UI palette (game/src/ui/theme.ts): rust, cream, faded blue, tape, gunmetal; dark coloured outlines
RUST, CREAM, BLUE, TAPE, GUN = (194, 80, 47), (243, 234, 210), (58, 120, 200), (233, 217, 168), (53, 56, 73)
CRT = (74, 168, 255)
OL = (40, 30, 38)

FLOORS = {
    # (base, alt, line): planks/tiles/flags in two tones with a dark seam
    'wood': ((176, 122, 78), (160, 108, 68), (110, 70, 46)),
    'tile': ((214, 132, 92), (236, 214, 178), (150, 90, 66)),
    'stone': ((150, 142, 128), (134, 126, 114), (92, 86, 80)),
    'carpet': ((96, 104, 128), (90, 98, 120), (66, 70, 92)),
    'boards': ((140, 104, 72), (128, 94, 64), (88, 62, 44)),
}
WALLS = {
    # (face, shade, trim, cap)
    'plaster': ((232, 214, 184), (206, 186, 156), RUST, (250, 242, 222)),
    'stone': ((150, 144, 136), (124, 118, 112), (96, 90, 86), (184, 178, 168)),
    'foam': ((70, 72, 92), (56, 58, 76), (36, 38, 52), (110, 112, 132)),
    'planks': ((150, 110, 74), (128, 92, 60), (92, 64, 42), (186, 146, 104)),
    'mint': ((150, 214, 186), (126, 190, 164), (212, 120, 92), (214, 244, 228)),
    'cave': ((112, 104, 100), (92, 86, 84), (70, 64, 64), (140, 132, 124)),
}


def _ab(px, py):
    u, v = px - 15.5, py + 0.5
    return v + u / 2, v - u / 2


def floor(style, x, y):
    """One floor diamond: planks run along x (wood, boards), tiles checker (tile), flagstones
    staggered (stone), carpet flecked."""
    base, alt, line = FLOORS[style]
    t = np.zeros((TH, TW, 4), np.uint8)
    for py in range(TH):
        for px in range(TW):
            a, b = _ab(px, py)
            if not (0 <= a < 16 and 0 <= b < 16): continue
            A, B = x * 16 + a, y * 16 + b
            c = base
            if style in ('wood', 'boards'):
                plank = int(B // 4)
                c = alt if plank % 2 else base
                if B % 4 < 0.8 or (A + plank * 7) % 24 < 0.8: c = line
            elif style == 'tile':
                c = base if (int(A // 8) + int(B // 8)) % 2 else alt
                if A % 8 < 0.7 or B % 8 < 0.7: c = line
            elif style == 'stone':
                row = int(B // 6)
                c = alt if (int((A + row * 5) // 9) + row) % 3 == 0 else base
                if B % 6 < 0.8 or (A + row * 5) % 9 < 0.8: c = line
            elif style == 'carpet':
                c = alt if (int(A * 3 + B * 7) % 11) == 0 else base
            t[py, px] = (*c, 255)
    return t


def _put(canvas, x, y, col):
    if 0 <= y < canvas.shape[0] and 0 <= x < canvas.shape[1]:
        canvas[y, x] = col


def walls(canvas, m, scr, interior, warps):
    """The two back walls. The left wall stands on the x = 0 edge (its face looks toward +x, in
    shade), the right one on the y = 0 edge (faces +y, lit). An arch is cut wherever a warp sits
    just past the wall (x = -1 or y = -1) and at `interior.arches`; `interior.windows` the same
    way: [['l'|'r', tile index], ...]."""
    face, shade, trim, cap = WALLS[interior['wall']]
    arches = {('l', w['y']) for w in warps if w['x'] < 0} | {('r', w['x']) for w in warps if w['y'] < 0}
    arches |= {(sd, i) for sd, i in interior.get('arches', [])}   # blocked ones, no warp behind yet
    windows = {(s, i) for s, i in interior.get('windows', [])}
    z = 1
    for side, n in (('l', m.H), ('r', m.W)):
        for i in range(n):
            x, y = (0, i) if side == 'l' else (i, 0)
            sx, sy = scr(x, y, z)
            col = shade if side == 'l' else face
            for c in range(16):
                # the wall's bottom edge along this tile's back edge
                X = sx + c if side == 'l' else sx + 16 + c
                yb = sy + 8 - c // 2 if side == 'l' else sy + c // 2
                for d in range(WALL_H):
                    Y = yb - d
                    k = col
                    # stone/cave courses, plank seams, plaster plain
                    if interior['wall'] in ('stone', 'cave') and ((d + (c // 8) * 3) % 9 == 0 or ((c + (d // 9) * 5) % 12 == 0)):
                        k = trim
                    if interior['wall'] == 'planks' and c % 6 == 0: k = trim
                    if interior['wall'] == 'foam' and (c + d) % 4 == 0: k = trim
                    if d < 4: k = trim                      # skirting board
                    if d >= WALL_H - 2: k = cap             # the cut top of the wall
                    _put(canvas, X, Y, (*k, 255))
                _put(canvas, X, yb - WALL_H, (*OL, 255))
            if (side, i) in windows:
                for c in range(4, 13):
                    X = sx + c if side == 'l' else sx + 16 + c
                    yb = sy + 8 - c // 2 if side == 'l' else sy + c // 2
                    for d in range(18, 38):
                        k = OL if c in (4, 12) or d in (18, 37) or c == 8 or d == 28 else (255, 214, 140) if d > 28 else (252, 236, 190)
                        _put(canvas, X, yb - d, (*k, 255))
            if (side, i) in arches:
                for c in range(2, 15):
                    X = sx + c if side == 'l' else sx + 16 + c
                    yb = sy + 8 - c // 2 if side == 'l' else sy + c // 2
                    top = 30 + int(4 * (1 - ((c - 8.5) / 6.5) ** 2))
                    for d in range(0, top):
                        edge = c in (2, 14) or d == top - 1
                        k = OL if edge else (34, 30, 40) if d < top - 6 else (48, 42, 54)
                        _put(canvas, X, yb - d, (*k, 255))
    # the corner post where the walls meet
    sx, sy = scr(0, 0, z)
    for d in range(WALL_H + 1):
        _put(canvas, sx + 16, sy - d, (*OL, 255))


def doormat(canvas, scr, x, y):
    """A mat on the floor tile you leave by."""
    sx, sy = scr(x, y, 1)
    for py in range(TH):
        for px in range(TW):
            a, b = _ab(px, py)
            if 3 <= a < 13 and 3 <= b < 13:
                edge = a < 4 or a >= 12 or b < 4 or b >= 12
                _put(canvas, sx + px, sy + py, (*((150, 60, 40) if edge else RUST), 255))


# ---------- placeholder furniture ----------

def box(wx, wy, h, top, side=None, inset=0.0):
    """An isometric box on a (wx + wy) * 16 wide canvas, bottom row = the footprint's front corner.
    `inset`: tiles kept clear round the box (it stands back from the footprint's edges)."""
    W = (wx + wy) * 16
    H = (wx + wy) * 8 + h + 1
    im = Image.new('RGBA', (W, H))
    dr = ImageDraw.Draw(im)
    def P(gx, gy, lift):
        return ((gx - gy) * 16 + wy * 16, (gx + gy) * 8 + h - lift)
    a0, a1, b0, b1 = inset, wx - inset, inset, wy - inset
    side = side or top
    lit = tuple(int(c * 0.86) for c in side)
    dark = tuple(int(c * 0.7) for c in side)
    dr.polygon([P(a0, b1, 0), P(a1, b1, 0), P(a1, b1, h), P(a0, b1, h)], fill=lit, outline=OL)       # faces +y
    dr.polygon([P(a1, b0, 0), P(a1, b1, 0), P(a1, b1, h), P(a1, b0, h)], fill=dark, outline=OL)      # faces +x
    dr.polygon([P(a0, b0, h), P(a1, b0, h), P(a1, b1, h), P(a0, b1, h)], fill=top, outline=OL)       # top
    # keep the anchor: one faint pixel on the footprint's front corner row
    px = im.load()
    if px[wx * 16, H - 1][3] == 0: px[wx * 16, H - 1] = (0, 0, 0, 1)
    return im, P


def blank(wx, wy, h):
    """An empty canvas sized like box(), for pieces that aren't boxes."""
    W, H = (wx + wy) * 16, (wx + wy) * 8 + h + 1
    im = Image.new('RGBA', (W, H))
    im.load()[wx * 16, H - 1] = (0, 0, 0, 1)
    return im, lambda gx, gy, lift: ((gx - gy) * 16 + wy * 16, (gx + gy) * 8 + h - lift)


FURNITURE = {}


def piece(name):
    def reg(f):
        FURNITURE[name] = f
        return f
    return reg


@piece('bed')
def _bed():
    im, P = box(1, 2, 8, CREAM, (120, 84, 60), 0.1)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.1, 0.9, 8), P(0.9, 0.9, 8), P(0.9, 1.9, 8), P(0.1, 1.9, 8)], fill=BLUE, outline=OL)   # blanket
    d.polygon([P(0.2, 0.2, 9), P(0.8, 0.2, 9), P(0.8, 0.7, 9), P(0.2, 0.7, 9)], fill=(252, 248, 236), outline=OL)
    return im


@piece('bedroll')
def _bedroll():
    im, P = box(1, 1, 3, (200, 120, 80), (150, 90, 60), 0.12)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.15, 0.15, 4), P(0.85, 0.15, 4), P(0.85, 0.35, 4), P(0.15, 0.35, 4)], fill=CREAM, outline=OL)
    return im


@piece('shelf')
def _shelf():
    im, P = box(1, 1, 30, (130, 92, 62), (120, 84, 56), 0.2)
    d = ImageDraw.Draw(im)
    cols = [RUST, BLUE, TAPE, (90, 150, 90), CREAM, (200, 90, 140)]
    for row, lift in enumerate((6, 14, 22)):
        for k in range(4):
            a = 0.25 + k * 0.15
            d.line([P(a, 0.8, lift), P(a, 0.8, lift + 6)], fill=cols[(row * 2 + k) % len(cols)], width=2)
    return im


@piece('table')
def _table():
    im, P = box(1, 1, 10, (176, 126, 84), (120, 84, 56), 0.15)
    return im


@piece('desk')
def _desk():
    im, P = box(2, 1, 12, (150, 108, 72), (110, 78, 52), 0.08)
    return im


@piece('crt')
def _crt():
    """A CRT on a stand (the emulator is running)."""
    im, P = box(1, 1, 20, GUN, (80, 82, 98), 0.18)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.82, 0.25, 6), P(0.82, 0.75, 6), P(0.82, 0.75, 17), P(0.82, 0.25, 17)], fill=CRT, outline=OL)
    return im


@piece('couch')
def _couch():
    im, P = box(2, 1, 9, (170, 70, 52), (150, 60, 44), 0.08)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.08, 0.08, 9), P(1.92, 0.08, 9), P(1.92, 0.08, 18), P(0.08, 0.08, 18)], fill=(150, 60, 44), outline=OL)
    return im


@piece('arcade')
def _arcade():
    im, P = box(1, 1, 30, (40, 40, 56), (60, 62, 80), 0.2)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.8, 0.3, 16), P(0.8, 0.7, 16), P(0.8, 0.7, 26), P(0.8, 0.3, 26)], fill=CRT, outline=OL)
    d.point([P(0.8, 0.45, 12), P(0.8, 0.55, 12)], fill=RUST)
    return im


@piece('hammock')
def _hammock():
    im, P = blank(2, 1, 20)
    d = ImageDraw.Draw(im)
    for a in (0.15, 1.85):
        d.line([P(a, 0.5, 0), P(a, 0.5, 20)], fill=(110, 76, 50), width=2)
    d.polygon([P(0.15, 0.35, 14), P(1.85, 0.35, 14), P(1.85, 0.65, 14), P(1.0, 0.65, 6), P(0.15, 0.65, 14)], fill=(240, 180, 70), outline=OL)
    d.line([P(0.4, 0.62, 11), P(1.6, 0.62, 11)], fill=(220, 90, 70))
    return im


@piece('stove')
def _stove():
    im, P = box(1, 1, 16, (230, 226, 216), (200, 196, 186), 0.12)
    d = ImageDraw.Draw(im)
    d.ellipse([P(0.3, 0.3, 16)[0] - 3, P(0.3, 0.3, 16)[1] - 1, P(0.3, 0.3, 16)[0] + 3, P(0.3, 0.3, 16)[1] + 2], fill=GUN)
    return im


@piece('plant')
def _plant():
    im, P = box(1, 1, 7, (190, 100, 70), (170, 90, 60), 0.32)
    d = ImageDraw.Draw(im)
    cx, cy = P(0.5, 0.5, 7)
    d.ellipse([cx - 6, cy - 14, cx + 6, cy], fill=(90, 150, 70), outline=OL)
    return im


@piece('ball')
def _ball():
    im = Image.new('RGBA', (32, 25))
    d = ImageDraw.Draw(im)
    d.ellipse([12, 8, 20, 16], fill=(250, 250, 250), outline=OL)
    d.point([(16, 12), (14, 11)], fill=OL)
    im.load()[16, 24] = (0, 0, 0, 1)
    return im


@piece('sampler')
def _sampler():
    """Nolan's desk: sampler and two monitors."""
    im, P = box(2, 1, 12, (60, 62, 78), (46, 48, 62), 0.08)
    d = ImageDraw.Draw(im)
    for a in (0.5, 1.3):
        d.polygon([P(a, 0.3, 14), P(a + 0.5, 0.3, 14), P(a + 0.5, 0.3, 26), P(a, 0.3, 26)], fill=CRT, outline=OL)
    for k in range(4):
        d.point(P(0.3 + k * 0.12, 0.7, 12), fill=(110, 220, 120))
    return im


@piece('van_window')
def _van_window():
    return box(1, 1, 2, (90, 80, 70), None, 0.3)[0]


@piece('ring_light')
def _ring_light():
    im = Image.new('RGBA', (32, 44))
    d = ImageDraw.Draw(im)
    d.line([(16, 43), (16, 16)], fill=GUN, width=1)
    d.ellipse([7, 2, 25, 20], outline=(255, 250, 230), width=3)
    d.ellipse([6, 1, 26, 21], outline=OL)
    im.load()[16, 43] = (*GUN, 255)
    return im


@piece('chair')
def _chair():
    im, P = box(1, 1, 9, (40, 40, 52), (200, 60, 60), 0.28)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.28, 0.28, 9), P(0.28, 0.72, 9), P(0.28, 0.72, 24), P(0.28, 0.28, 24)], fill=(200, 60, 60), outline=OL)
    return im


@piece('whiteboard')
def _whiteboard():
    """A whiteboard on a stand, facing into the room from the left wall."""
    im, P = blank(1, 1, 32)
    d = ImageDraw.Draw(im)
    for b in (0.2, 0.8):
        d.line([P(0.3, b, 0), P(0.3, b, 10)], fill=GUN)
    d.polygon([P(0.3, 0.1, 10), P(0.3, 0.9, 10), P(0.3, 0.9, 30), P(0.3, 0.1, 30)], fill=(244, 244, 238), outline=OL)
    for k in range(3):
        lift = 24 - k * 5
        d.line([P(0.3, 0.25, lift), P(0.3, 0.7, lift)], fill=(60, 60, 140))
        d.line([P(0.3, 0.22, lift - 1), P(0.3, 0.74, lift + 1)], fill=(220, 50, 50))   # scribbled out
    return im


@piece('snacks')
def _snacks():
    im, P = box(1, 1, 6, (220, 60, 50), (240, 200, 60), 0.3)
    return im


@piece('terminal')
def _terminal():
    """The sanctuary's storage terminal: a CRT stone."""
    im, P = box(1, 1, 26, (150, 144, 136), (124, 118, 112), 0.15)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.85, 0.3, 10), P(0.85, 0.7, 10), P(0.85, 0.7, 21), P(0.85, 0.3, 21)], fill=CRT, outline=OL)
    d.polygon([P(0.3, 0.85, 10), P(0.7, 0.85, 10), P(0.7, 0.85, 21), P(0.3, 0.85, 21)], fill=(46, 120, 200), outline=OL)
    return im


@piece('workbench')
def _workbench():
    im, P = box(2, 1, 13, (130, 100, 70), GUN, 0.06)
    d = ImageDraw.Draw(im)
    for a, col in ((0.4, TAPE), (0.9, CREAM), (1.4, RUST)):
        cx, cy = P(a, 0.5, 13)
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 1], fill=col, outline=OL)
    return im


@piece('cradle')
def _cradle():
    """PATCH's charging cradle, the size of a car."""
    im, P = box(2, 2, 10, GUN, (70, 72, 88), 0.05)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.3, 0.3, 10), P(1.7, 0.3, 10), P(1.7, 1.7, 10), P(0.3, 1.7, 10)], fill=(40, 42, 56), outline=CRT)
    for a in (0.2, 1.8):
        d.line([P(a, 0.2, 10), P(a, 0.2, 34)], fill=(200, 200, 210), width=2)
    return im


@piece('panels')
def _panels():
    im, P = box(1, 1, 6, CREAM, RUST, 0.15)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.2, 0.25, 6), P(0.6, 0.25, 6), P(0.6, 0.25, 20), P(0.2, 0.25, 20)], fill=BLUE, outline=OL)
    return im


@piece('rubble')
def _rubble():
    """Rocks blocking an archway (cleared when the wing behind it is restored)."""
    kit = os.path.join(OUT, 'kit')
    im = Image.new('RGBA', (32, 34))
    for n, at in (('rock_l', (3, 10)), ('rock_m', (16, 12)), ('rock_m', (8, 2)), ('rock_s', (20, 6))):
        r = Image.open(os.path.join(kit, f'{n}.png')).convert('RGBA')
        im.alpha_composite(r, (min(at[0], 32 - r.width), min(at[1], 34 - r.height)))
    im.load()[16, 33] = (0, 0, 0, 1)
    return im


@piece('crt_stone')
def _crt_stone():
    """A dead CRT set into a standing stone, faint blue (the sanctuary's old tech)."""
    im, P = box(1, 1, 22, (140, 134, 126), (118, 112, 106), 0.25)
    d = ImageDraw.Draw(im)
    d.polygon([P(0.75, 0.35, 8), P(0.75, 0.65, 8), P(0.75, 0.65, 16), P(0.75, 0.35, 16)], fill=(36, 70, 110), outline=OL)
    return im


def furniture():
    for name, f in FURNITURE.items():
        f().save(os.path.join(OUT, f'ph_{name}.png'))


if __name__ == '__main__':
    furniture()
    print(', '.join(FURNITURE))
