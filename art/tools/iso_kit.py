"""Turns the owner's isometric ChatGPT sheets into game-scale pieces for iso_map.py.

Sheets (art/concepts/locations/):
  iso_terrain.png  15 tiles: grass x4, tall grass, path, path/grass edge, cobbles, crater dirt,
                   water, stone block, brick block, stairs (two ways), island underside
  iso_props.png    23 props: trees, bushes, fences, gate, lamp, laundry, sunflowers, bench,
                   crates, rocks, signpost, mailbox, pots, cat

Each piece is cut out (white background flood-filled from its edges), shrunk to game scale with
an area filter, its colours reduced (k-means, so the shrink doesn't leave mush), and given a dark
coloured outline where it meets the background (BW2 sprites are outlined, never pure black).

Writes art/locations/out/kit/:
  top_<name>.png      32x16 diamond tops (tall grass is taller: its blades stand up)
  face_<mat>_<l|r>.png  side-face texture under a tile edge, 16 wide (l: lit, faces +y; r: shade)
  under_<l|r>.png     the island's rocky underside, to hang below the lowest faces
  stairs_<x|y>.png    a stair block, 32 wide, its top one level up
  <prop>.png          props at game scale
Usage: python3 art/tools/iso_kit.py [contact.png]
"""
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
from sheet_cut import pieces  # noqa: E402
from walk2sheet import kmeans  # noqa: E402

ROOT = os.path.join(HERE, '..')
CON = os.path.join(ROOT, 'concepts', 'locations')
OUT = os.path.join(ROOT, 'locations', 'out', 'kit')

TERRAIN = ['grass_0', 'grass_1', 'grass_2', 'grass_3', 'tall', 'path', 'path_edge', 'cobble', 'crater',
           'water', 'block_stone', 'block_brick', 'stairs_a', 'stairs_b', 'underside']
# name: (piece index on the sheet, size: ('w' or 'h', px), colours)
PROPS = {
    'fence_x': (0, ('w', 34), 16), 'sunflowers': (1, ('w', 30), 20), 'tree_0': (2, ('h', 50), 24),
    'gate': (3, ('w', 36), 18), 'tree_1': (4, ('h', 56), 22), 'bench': (5, ('w', 28), 14),
    'tree_2': (6, ('h', 54), 24), 'fence_y': (7, ('w', 34), 16), 'crates': (8, ('w', 22), 12),
    'bush_0': (9, ('w', 20), 14), 'rock_s': (10, ('w', 10), 8), 'lamp': (11, ('h', 40), 12),
    'rock_m': (12, ('w', 16), 10), 'bush_1': (13, ('w', 20), 16), 'laundry': (14, ('w', 44), 18),
    'rock_l': (15, ('w', 26), 14), 'bush_2': (16, ('w', 20), 16), 'signpost': (17, ('h', 24), 10),
    'mailbox': (18, ('h', 20), 12), 'pot_0': (19, ('w', 11), 10), 'pot_1': (20, ('w', 11), 10),
    'pot_2': (21, ('w', 11), 10), 'cat': (22, ('w', 12), 10),
}


def cutout(path, box, white=238, hole=60):
    """The piece's pixels with the white background made clear: near-white connected to the box
    edge, plus enclosed near-white patches bigger than `hole` pixels (gaps between fence rails,
    sky through branches); small ones (daisies) stay."""
    im = Image.open(path).convert('RGB').crop(box)
    a = np.asarray(im).astype(int)
    light = a.min(2) > white
    h, w = light.shape
    bg = np.zeros_like(light)
    seen = np.zeros_like(light)
    for y0 in range(h):
        for x0 in range(w):
            if not light[y0, x0] or seen[y0, x0]: continue
            stack, comp, edge = [(y0, x0)], [], False
            seen[y0, x0] = True
            while stack:
                y, x = stack.pop(); comp.append((y, x))
                if y in (0, h - 1) or x in (0, w - 1): edge = True
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; stack.append((ny, nx))
            if edge or len(comp) > hole:
                ys, xs = zip(*comp); bg[list(ys), list(xs)] = True
    # the light fringe round the edge (anti-aliasing into the white) goes too
    pale = a.min(2) > 190
    for _ in range(3):
        near = np.zeros_like(bg)
        near[1:] |= bg[:-1]; near[:-1] |= bg[1:]; near[:, 1:] |= bg[:, :-1]; near[:, :-1] |= bg[:, 1:]
        bg |= near & pale
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    return np.dstack([a.astype(np.uint8), alpha])


def shrink(rgba, size):
    """Area-filtered shrink (colour weighted by coverage), alpha cut at half."""
    w, h = size
    a = rgba.astype(float)
    al = a[..., 3:] / 255
    pre = np.dstack([a[..., :3] * al, al * 255]).astype(np.float32)
    chans = [np.asarray(Image.fromarray(pre[..., i]).resize((w, h), Image.BOX)) for i in range(4)]
    out = np.dstack(chans)
    cov = out[..., 3:] / 255
    rgb = np.where(cov > 0, out[..., :3] / np.maximum(cov, 1e-6), 0)
    return np.dstack([np.clip(rgb, 0, 255), np.where(cov[..., 0] >= 0.5, 255, 0)]).astype(np.uint8)


def sharpen(rgba, k=0.6):
    """A little unsharp mask so the shrink keeps its contrast (clumps, cracks)."""
    rgb = rgba[..., :3].astype(float)
    blur = rgb.copy()
    blur[1:-1, 1:-1] = (rgb[:-2, 1:-1] + rgb[2:, 1:-1] + rgb[1:-1, :-2] + rgb[1:-1, 2:] + rgb[1:-1, 1:-1]) / 5
    out = rgba.copy()
    out[..., :3] = np.clip(rgb + k * (rgb - blur), 0, 255).astype(np.uint8)
    return out


def reduce(rgba, colours):
    fg = rgba[..., 3] > 0
    px = rgba[fg][:, :3].astype(float)
    if len(px) == 0: return rgba
    pal = kmeans(px, min(colours, len(np.unique(px, axis=0))))
    lab = np.argmin(((rgba[..., None, :3].astype(float) - pal[None, None]) ** 2).sum(3), 2)
    out = rgba.copy()
    out[..., :3] = pal[lab].astype(np.uint8)
    out[~fg] = 0
    return out


def outline(rgba, k=0.42):
    """Darken the pixels on the silhouette's edge into a coloured outline."""
    fg = rgba[..., 3] > 0
    edge = np.zeros_like(fg)
    p = np.pad(fg, 1)
    for dy, dx in ((0, 1), (2, 1), (1, 0), (1, 2)):
        edge |= ~p[dy:dy + fg.shape[0], dx:dx + fg.shape[1]]
    edge &= fg
    out = rgba.copy()
    rgb = out[..., :3].astype(float)
    dark = rgb * k + np.array([8, 4, 14]) * (1 - k) * 0.6
    out[edge, :3] = dark[edge].astype(np.uint8)
    return out


def trim(rgba):
    ys, xs = np.where(rgba[..., 3] > 0)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def prop(rgba, size, colours):
    rgba = trim(rgba)
    h, w = rgba.shape[:2]
    axis, n = size
    tw, th = (n, max(1, round(h * n / w))) if axis == 'w' else (max(1, round(w * n / h)), n)
    return outline(reduce(sharpen(shrink(rgba, (tw, th))), colours))


def diamond_mask(w=32, h=16):
    m = np.zeros((h, w), bool)
    for y in range(h):
        for x in range(w):
            u, v = x - 15.5, y + 0.5
            a, b = v + u / 2, v - u / 2
            m[y, x] = 0 <= a < 16 and 0 <= b < 16
    return m


DM = diamond_mask()


def block(rgba):
    """A sheet tile at game scale: 32 wide; the diamond top is its first 16 rows."""
    rgba = trim(rgba)
    h, w = rgba.shape[:2]
    return sharpen(shrink(rgba, (32, max(16, round(h * 32 / w)))))


def top_of(rgba, zoom=36):
    """The diamond top of a sheet tile (32x16) plus whatever stands up above it (tall grass blades),
    found from the left corner: that's the middle row of the diamond."""
    rgba = trim(rgba)
    h, w = rgba.shape[:2]
    side_y = int(np.where((rgba[:, :4, 3] > 0).any(1))[0].mean())
    y0 = side_y - w // 4                         # the diamond's top corner, in sheet pixels
    above = max(0, round(y0 * 32 / w))
    # drawn a touch bigger and cropped, so the sheet tile's rim (its block edge) falls outside
    # and neighbouring tiles join without a grid of lines
    b = sharpen(shrink(rgba, (zoom, round(h * zoom / w))))
    above = max(0, round(y0 * zoom / w))
    ox = (zoom - 32) // 2
    b = b[ox // 2:, ox:ox + 32]
    out = b[:16 + above].copy()
    m = np.zeros(out.shape[:2], bool)
    m[above:above + 16] = DM
    m[:above] = out[:above, :, 3] > 0
    out[~m] = 0
    return out, above


def face_of(blk, side, skip=0):
    """A side face's texture (16 wide, the block's depth tall) unsheared to a rectangle:
    'l' is under the top's left edge (faces +y, lit), 'r' under the right edge."""
    H = blk.shape[0]
    depth = H - 16
    tex = np.zeros((depth, 16, 4), np.uint8)
    for c in range(16):
        x = c if side == 'l' else 16 + c
        top = 8 + c // 2 if side == 'l' else 15 - c // 2
        for d in range(depth):
            y = top + d + 1 + skip
            if 0 <= y < H: tex[d, c] = blk[y, x]
    return tex


def build():
    os.makedirs(OUT, exist_ok=True)
    tpath = os.path.join(CON, 'iso_terrain.png')
    tb = pieces(tpath, step=2, gap=1, min_area=800, white=240)
    assert len(tb) == len(TERRAIN), f'{len(tb)} terrain pieces'
    cut = {n: cutout(tpath, b) for n, b in zip(TERRAIN, tb)}
    made = {}
    for n in ('grass_0', 'grass_1', 'grass_2', 'grass_3', 'path', 'path_edge', 'cobble', 'crater', 'water'):
        # path, cobbles, crater and water are drawn with a grass rim: zoom past it to the middle
        made[f'top_{n}'] = reduce(top_of(cut[n], 36 if n.startswith('grass') else 52)[0], 20)
    tall, above = top_of(cut['tall'])
    made['top_tall'] = reduce(tall, 16)
    print('tall grass stands', above, 'px above its tile')
    for mat in ('stone', 'brick'):
        blk = reduce(block(cut[f'block_{mat}']), 24)
        made[f'block_{mat}'] = blk
        for s in 'lr':
            made[f'face_{mat}_{s}'] = face_of(blk, s)
    und = reduce(block(cut['underside']), 20)
    made['underside'] = und
    for s in 'lr':
        made[f'under_{s}'] = face_of(und, s)
    # stairs: piece a climbs toward the back right (steps face +y), b toward the back left (+x)
    made['stairs_y'] = outline(reduce(block(cut['stairs_a']), 20), 0.7)
    made['stairs_x'] = outline(reduce(block(cut['stairs_b']), 20), 0.7)

    ppath = os.path.join(CON, 'iso_props.png')
    pb = pieces(ppath, step=2, gap=1, min_area=800, white=240)
    assert len(pb) == 23, f'{len(pb)} prop pieces'
    for n, (i, size, cols) in PROPS.items():
        made[n] = prop(cutout(ppath, pb[i]), size, cols)
    for n, a in made.items():
        Image.fromarray(a, 'RGBA').save(os.path.join(OUT, f'{n}.png'))
    return made


def contact(made, path, scale=3):
    items = list(made.items())
    cw, ch = 60, 64
    cols = 10
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cw, rows * ch), (120, 130, 140, 255))
    for i, (n, a) in enumerate(items):
        im = Image.fromarray(a, 'RGBA')
        sheet.alpha_composite(im, ((i % cols) * cw + (cw - im.width) // 2, (i // cols) * ch + max(0, ch - im.height - 2)))
    sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(path)


if __name__ == '__main__':
    m = build()
    print(len(m), 'pieces')
    if len(sys.argv) > 1: contact(m, sys.argv[1])
