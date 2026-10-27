"""Route 1's own pieces from the owner's sheet (art/concepts/locations/route1_pieces.png), at game
scale, the same way iso_kit.py does the town's (cut out, area-shrunk, colours reduced, outlined).
Terrain, cliffs, stairs and the common props come from the town's kit, so the two maps match.

Writes art/locations/out/<name>.png:
  r1_booth      the Tally's meteorite-salvage checkpoint: booth, sign, barrier (closed)
  r1_meteor     a fallen chunk of skybox in its crater, galaxy residue glowing (Orbitot's home)
  r1_bridge     the plank bridge over the stream
  r1_oak, r1_pine, r1_flowerbush, r1_flowers, r1_crt_stone, r1_lamp, r1_crate, r1_signpost
Usage: python3 art/tools/route1_kit.py [contact.png]
"""
import os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
from sheet_cut import pieces, cutout  # noqa: E402
from iso_kit import prop  # noqa: E402

SHEET = os.path.join(HERE, '..', 'concepts', 'locations', 'route1_pieces.png')
OUT = os.path.join(HERE, '..', 'locations', 'out')
# name: (piece index on the sheet, size, colours)
PIECES = {
    'r1_booth': (0, ('w', 84), 28), 'r1_meteor': (1, ('w', 92), 28), 'r1_bridge': (2, ('w', 84), 22),
    'r1_oak': (20, ('h', 58), 24), 'r1_pine': (24, ('h', 60), 20), 'r1_flowerbush': (26, ('w', 22), 16),
    'r1_flowers': (29, ('w', 18), 12), 'r1_crt_stone': (23, ('h', 28), 12), 'r1_lamp': (30, ('h', 40), 12),
    'r1_crate': (25, ('w', 18), 10), 'r1_signpost': (28, ('h', 26), 10),
}


def keep_main(rgba):
    """Drops crumbs of neighbouring pieces that the cut caught (anything much smaller than the piece)."""
    fg = rgba[..., 3] > 0
    lab = np.zeros(fg.shape, int)
    sizes = []
    for y0, x0 in zip(*np.where(fg)):
        if lab[y0, x0]: continue
        sizes.append(0)
        stack = [(y0, x0)]
        lab[y0, x0] = len(sizes)
        while stack:
            y, x = stack.pop(); sizes[-1] += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < fg.shape[0] and 0 <= nx < fg.shape[1] and fg[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = len(sizes); stack.append((ny, nx))
    if len(sizes) <= 1: return rgba
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(sizes) * 0.04])
    out = rgba.copy()
    out[~keep] = 0
    return out


def build():
    boxes = pieces(SHEET, step=2, gap=1, min_area=800, white=240)
    assert len(boxes) == 40, f'{len(boxes)} pieces on the sheet'
    made = {}
    for n, (i, size, cols) in PIECES.items():
        made[n] = keep_main(prop(keep_main(cutout(SHEET, boxes[i])), size, cols))
        Image.fromarray(made[n], 'RGBA').save(os.path.join(OUT, f'{n}.png'))
    return made


if __name__ == '__main__':
    m = build()
    print(len(m), 'pieces')
    if len(sys.argv) > 1:
        ims = [Image.fromarray(a, 'RGBA') for a in m.values()]
        W = sum(i.width + 6 for i in ims)
        H = max(i.height for i in ims)
        sheet = Image.new('RGBA', (W, H + 4), (120, 130, 140, 255))
        x = 0
        for i in ims:
            sheet.alpha_composite(i, (x, H - i.height)); x += i.width + 6
        sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(sys.argv[1])
