"""The owner's seal-scroll sheet (art/concepts/items/scrolls.png: a 5x3 grid in the item order of
game/src/data/items.json) cut into bag icons: art/items/out/<item id>.png, SIZE px on the long side.
Each piece is cut from the white background (sheet_cut.cutout), box-shrunk, and its alpha made hard.
Run: python3 art/tools/scroll_icons.py
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
from sheet_cut import cutout, pieces  # noqa: E402

ROOT = os.path.join(HERE, '..', '..')
SHEET = os.path.join(ROOT, 'art', 'concepts', 'items', 'scrolls.png')
OUT = os.path.join(ROOT, 'art', 'items', 'out')
SIZE = 24

items = json.load(open(os.path.join(ROOT, 'game', 'src', 'data', 'items.json')))
items = items.get('items', items)
ids = [k for k, v in items.items() if v.get('kind') == 'scroll']
boxes = pieces(SHEET)
assert len(boxes) == len(ids), f'{len(boxes)} pieces on the sheet, {len(ids)} scrolls'
os.makedirs(OUT, exist_ok=True)
for id_, box in zip(ids, boxes):
    im = Image.fromarray(cutout(SHEET, box), 'RGBA')
    s = SIZE / max(im.size)
    # premultiplied, so the clear background doesn't darken the edges
    small = im.convert('RGBa').resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.BOX).convert('RGBA')
    a = np.array(small)
    a[..., 3] = np.where(a[..., 3] >= 110, 255, 0)
    Image.fromarray(a, 'RGBA').save(os.path.join(OUT, f'{id_}.png'))
    print(id_, small.size)
