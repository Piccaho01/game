"""A cutscene card (the owner's art in art/concepts/cutscenes/) shrunk to the DS top screen.

Box-averages the card down to 256x192, so every source pixel counts and the card keeps its
pixel-art look at screen size. A card drawn at another ratio than 4:3 is letterboxed (dark bars)
rather than cropped, so nothing at its edges is lost (05_starters: Gobbin sits on the right edge).
Usage: python3 art/tools/card2screen.py [CARD.png ...]   (default: every card)
Writes art/cutscenes/out/<name>.png, which the game loads (src/assets.ts CUTSCENE_CARDS).
"""
import glob
import os
import sys
from PIL import Image

W, H = 256, 192
OUT = 'art/cutscenes/out'
BAR = (16, 16, 24)  # the game's page colour (#101018)


def to_screen(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    s = min(W / w, H / h)
    fw, fh = round(w * s), round(h * s)
    card = Image.new('RGB', (W, H), BAR)
    card.paste(im.resize((fw, fh), Image.BOX), ((W - fw) // 2, (H - fh) // 2))
    return card


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for path in sys.argv[1:] or sorted(glob.glob('art/concepts/cutscenes/*.png')):
        out = os.path.join(OUT, os.path.basename(path))
        to_screen(path).save(out, optimize=True)
        print('wrote', out)
