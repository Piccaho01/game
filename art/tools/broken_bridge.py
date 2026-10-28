"""Route 1's bridge with its middle planks gone (Nolan's Patch Up obstacle, data/obstacles.json).

Made from the graded bridge prop (art/locations/out/graded/r1_bridge.png): a band across the
middle of the deck is knocked out to show the river (colours taken from the prop's own water),
the cut edges get splintered dark ends, and one snapped plank hangs into the gap.
Run: python3 art/tools/broken_bridge.py  ->  art/locations/out/graded/r1_bridge_broken.png
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art/locations/out/graded/r1_bridge.png'
OUT = ROOT / 'art/locations/out/graded/r1_bridge_broken.png'

im = Image.open(SRC).convert('RGBA')
W, H = im.size
px = im.load()

# The deck runs down-right at 2:1. Along that axis t = x + 2y; the gap is a band of t.
T0, T1 = 96, 108
water = [px[x, y] for y in range(H) for x in range(W)
         if px[x, y][3] and px[x, y][2] > px[x, y][0] + 25 and y > H // 2]
water.sort(key=lambda c: sum(c[:3]))
deep, mid, light = water[len(water) // 5], water[len(water) // 2], water[len(water) * 9 // 10]
dark = (58, 34, 22, 255)

# Rows of deck above the water: everything opaque in the band above the deck's lower edge.
def deck_bottom(x):
    """The last row of wood in this column (wood is reddish, not blue)."""
    last = -1
    for y in range(H):
        r, g, b, a = px[x, y]
        if a and r > b + 20:
            last = y
    return last

src = im.copy().load()
for x in range(W):
    bottom = deck_bottom(x)
    for y in range(0, bottom + 1):
        t = x + 2 * y
        r, g, b, a = src[x, y]
        # Only the planks and rails (wood: reddish brown), not the banks or grass.
        if not (T0 <= t <= T1) or not a or not (r > b + 20 and r >= g):
            continue
        edge = t - T0 < 2 or T1 - t < 2
        if edge:
            px[x, y] = dark
        else:
            # Ripples: lighter streaks running with the current.
            k = (x * 3 + y * 5) % 11
            px[x, y] = light if k < 2 else mid if k < 8 else deep

# A snapped plank hanging into the gap, one end still on the near side.
for i in range(9):
    x, y = 44 + i, 33 + i // 2 + i // 3
    for dy in (0, 1):
        if 0 <= x < W and 0 <= y + dy < H:
            px[x, y + dy] = (150, 92, 52, 255) if dy == 0 else dark

im.save(OUT)
print('wrote', OUT.relative_to(ROOT), im.size)
