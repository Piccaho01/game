"""Route 1's pieces from the owner's sheet (art/concepts/locations/route1_pieces.png), at game scale.

The sheet has two halves split by a rule: set pieces on top (the Tally salvage booth with its
barrier, a meteor crater full of galaxy residue, a wooden bridge, cliff stairs) and small pieces
below (tall grass, oak, pine, bushes, rocks, the CRT marker stone, crate, signpost, lamp, a meteor
tile). Each piece is cut out, shrunk, colour-reduced and outlined like iso_kit.py's.

Writes art/locations/out/r1_<name>.png (set pieces and props, placed as objects or scattered by
the baker as Route 1's trees and bushes) and art/locations/out/kit/r1_top_tall.png (its tall grass).
Usage: python3 art/tools/route1_kit.py [contact.png]
"""
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
from sheet_cut import pieces, cutout  # noqa: E402
from iso_kit import prop, top_of, reduce  # noqa: E402

ROOT = os.path.join(HERE, '..')
SHEET = os.path.join(ROOT, 'concepts', 'locations', 'route1_pieces.png')
OUT = os.path.join(ROOT, 'locations', 'out')
SPLIT = 505   # the rule between the halves

# top half, in reading order: name -> (piece, size, colours)
TOP = {'booth': (0, ('w', 100), 28), 'meteor': (1, ('w', 92), 26), 'bridge': (2, ('w', 84), 22), 'cliff_stairs': (3, ('w', 64), 22)}
# bottom half (indices from sheet_cut.pieces on it, step=2 gap=1)
BOTTOM = {
    'oak': (15, ('h', 56), 24), 'pine': (19, ('h', 58), 22), 'bush_flower': (21, ('w', 22), 16),
    'flowers': (24, ('w', 16), 12), 'stone': (22, ('w', 18), 12), 'marker': (18, ('h', 28), 12),
    'crate': (20, ('w', 18), 10), 'signpost': (23, ('h', 26), 12), 'lamp': (25, ('h', 40), 12),
    'rocks': (14, ('w', 28), 12), 'boulder': (16, ('w', 18), 10), 'tuft_0': (26, ('w', 16), 12),
    'tuft_1': (27, ('w', 14), 12), 'bush_0': (28, ('w', 16), 14), 'bush_1': (29, ('w', 18), 14),
    'tuft_2': (31, ('w', 14), 10), 'tuft_3': (32, ('w', 20), 12), 'pebbles': (30, ('w', 18), 8),
}


def despeck(a, keep=8):
    """Drop loose bits of a cut-out (stray pixels from the sheet's edge): components under `keep` px."""
    from collections import deque
    fg = a[..., 3] > 0
    seen = np.zeros_like(fg)
    out = a.copy()
    for y0, x0 in zip(*np.where(fg)):
        if seen[y0, x0]: continue
        comp, q = [], deque([(y0, x0)])
        seen[y0, x0] = True
        while q:
            y, x = q.popleft(); comp.append((y, x))
            for ny in (y - 1, y, y + 1):
                for nx in (x - 1, x, x + 1):
                    if 0 <= ny < fg.shape[0] and 0 <= nx < fg.shape[1] and fg[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
        if len(comp) < keep:
            for y, x in comp: out[y, x] = 0
    return out


def halves():
    im = Image.open(SHEET).convert('RGB')
    return im.crop((0, 0, im.width, SPLIT - 5)), im.crop((0, SPLIT + 5, im.width, im.height))


def boxes(im):
    tmp = os.path.join(OUT, '_r1_half.png')
    im.save(tmp)
    try:
        return pieces(tmp, step=2, gap=1, min_area=800, white=240)
    finally:
        os.remove(tmp)


def build():
    top, bot = halves()
    made = {}
    tb, bb = boxes(top), boxes(bot)
    assert len(tb) == 4 and len(bb) == 35, (len(tb), len(bb))
    for n, (i, size, k) in TOP.items():
        made[n] = prop(cutout(top, tb[i]), size, k)
    for n, (i, size, k) in BOTTOM.items():
        made[n] = prop(cutout(bot, bb[i]), size, k)
    # the meteor tile shares a box with the block above it: its lower half is the tile
    x0, y0, x1, y1 = bb[6]
    tile = cutout(bot, (x0, y0 + (y1 - y0) // 2, x1, y1))
    made['meteor_tile'] = prop(tile, ('w', 30), 16)
    # the route's tall grass (bottom piece 5): a diamond top with blades standing above it
    t, above = top_of(cutout(bot, bb[5]))
    made['top_tall'] = reduce(t, 16)
    print('route 1 tall grass stands', above, 'px above its tile')
    for n, a in made.items():
        if n != 'top_tall': made[n] = a = despeck(a)
        d = os.path.join(OUT, 'kit') if n == 'top_tall' else OUT
        Image.fromarray(a, 'RGBA').save(os.path.join(d, f'r1_{n}.png'))
    return made


def contact(made, path, scale=3):
    W = sum(a.shape[1] + 4 for a in made.values())
    H = max(a.shape[0] for a in made.values()) + 4
    sheet = Image.new('RGBA', (W, H), (120, 130, 140, 255))
    x = 2
    for a in made.values():
        sheet.alpha_composite(Image.fromarray(a, 'RGBA'), (x, H - 2 - a.shape[0]))
        x += a.shape[1] + 4
    sheet.resize((W * scale, H * scale), Image.NEAREST).save(path)


if __name__ == '__main__':
    m = build()
    print(len(m), 'pieces:', ', '.join(m))
    if len(sys.argv) > 1: contact(m, sys.argv[1])
