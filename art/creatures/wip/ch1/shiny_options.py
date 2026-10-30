# The review sheet's shiny palette options: each line's stage 1 (and last stage) recoloured with
# every option in game/src/data/shinies.json, the same maths as engine/variants.ts recolorPixel.
# Usage: python3 art/creatures/wip/ch1/shiny_options.py OUT.png
import sys, json, colorsys, os
from PIL import Image, ImageDraw
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..')
D = json.load(open(os.path.join(ROOT, 'game/src/data/shinies.json')))
SP = json.load(open(os.path.join(ROOT, 'game/src/data/patchlings.json')))['patchlings']
def last(n):
    while True:
        e = SP[n].get('evolves')
        if not e: return n
        n = (e[0] if isinstance(e, list) else e)['to']
def rc(px, o):
    r, g, b = [v / 255 for v in px[:3]]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l < 0.17: return px
    if s > 0.12:
        h = (h + o.get('hue', 0) / 360) % 1
        s = min(1, s * o.get('sat', 1))
    l = min(1, l * o.get('light', 1))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return (round(r * 255), round(g * 255), round(b * 255), px[3])
def recolor(im, o):
    im = im.copy(); px = im.load(); memo = {}
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] == 0: continue
            if p not in memo: memo[p] = rc(p, o)
            px[x, y] = memo[p]
    return im
def crop(im):
    return im.crop(im.getbbox())
rows = []
for line, cfg in D['lines'].items():
    names = [line, last(line)] if last(line) != line else [line]
    ims = [crop(Image.open(os.path.join(ROOT, f'art/creatures/out/sprites/{n}.png')).convert('RGBA')) for n in names]
    rows.append((line, [ims] + [[recolor(i, o) for i in ims] for o in cfg['options']]))
S = 1; CW = 200; RH = 190
sheet = Image.new('RGBA', (110 + CW * 4, 30 + RH * len(rows)), (236, 232, 220, 255))
d = ImageDraw.Draw(sheet)
for j, t in enumerate(['normal', 'option 1', 'option 2', 'option 3']): d.text((110 + j * CW + 70, 8), t, fill=(40, 40, 40))
for i, (line, cols) in enumerate(rows):
    y0 = 30 + i * RH
    d.text((8, y0 + 80), line, fill=(40, 40, 40))
    for j, ims in enumerate(cols):
        x = 110 + j * CW + 4
        for im in ims:
            k = min(1, 96 / max(im.width, im.height)) if len(ims) > 1 else min(1, 180 / max(im.width, im.height))
            im2 = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST)
            sheet.alpha_composite(im2, (x, y0 + RH - 10 - im2.height))
            x += im2.width + 2
sheet.save(sys.argv[1])
