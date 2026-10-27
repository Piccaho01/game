"""Fit the owner's cutscene cards (art/concepts/cutscenes/*.png) to the DS top screen.

The cards are ChatGPT pixel-art drafts at about 1450x1090, upscaled on an uneven grid with soft
edges, so there is no clean pixel grid to recover. This crops each to the screen's 4:3, shrinks it
by area averaging (keeps faces readable where nearest-neighbour would drop features), and maps it
to a small palette without dithering, so it reads as pixel art next to the game's sprites.

Output is 384x288: shown at 2/3 scale on the 256x192 screen, which at the game's 3x zoom is
exactly two screen pixels per card pixel (even, crisp, a little finer than the sprites).

Usage: python3 card2screen.py [--size 384 288] [--colors 96] art/concepts/cutscenes/*.png
Writes art/cutscenes/out/<name>.png.
"""
import argparse, os
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("cards", nargs="+")
ap.add_argument("--size", nargs=2, type=int, default=[384, 288])
ap.add_argument("--colors", type=int, default=96)
ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "cutscenes", "out"))
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
W, H = a.size
for path in a.cards:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    # centre crop to the screen's aspect
    if w * H > h * W:
        cw = round(h * W / H)
        im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h))
    else:
        ch = round(w * H / W)
        im = im.crop((0, (h - ch) // 2, w, (h - ch) // 2 + ch))
    im = im.resize((W, H), Image.Resampling.BOX)
    im = im.quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    name = os.path.splitext(os.path.basename(path))[0]
    im.save(os.path.join(a.out, name + ".png"), optimize=True)
    print(name, im.size)
