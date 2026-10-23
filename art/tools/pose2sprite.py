"""One pose from a character sheet as a single overworld sprite (PATCH standing in town).

Same method as walk2sheet.py (own palette, majority shrink, loose-pixel cleanup).
Usage: python3 art/tools/pose2sprite.py SHEET.png X0 Y0 X1 Y1 HEIGHT OUT.png [COLOURS]
  e.g. python3 art/tools/pose2sprite.py art/concepts/trainers/patch.png 583 48 832 458 66 art/trainers/out/patch_stand.png 20
"""
import sys
import numpy as np
from PIL import Image
from walk2sheet import clean, cutout, kmeans, shrink

if __name__ == '__main__':
    sheet, x0, y0, x1, y1, height, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
    k = int(sys.argv[8]) if len(sys.argv) > 8 else 15
    a, bg = cutout(Image.open(sheet).convert('RGB'), [x0, y0, x1, y1])
    fg = a[~bg]
    pal = kmeans(fg[np.random.default_rng(0).choice(len(fg), min(len(fg), 30000), replace=False)], k)
    g = clean(shrink(a, bg, pal, height), pal)
    img = Image.new('RGBA', (g.shape[1], g.shape[0]), (0, 0, 0, 0))
    for y, x in zip(*np.where(g >= 0)):
        img.putpixel((int(x), int(y)), (*(int(v) for v in pal[g[y, x]]), 255))
    img.save(out)
    print('wrote', out, img.size)
