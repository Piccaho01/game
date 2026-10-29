# Shiny round 2: every stage of the lines the owner wants more options for, normal + the 4 options
# in game/src/data/shinies.json. Usage: python3 art/creatures/wip/ch1/shiny_round2.py OUT.png line...
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palette_pitch import line, shiny, apply, load, D
out, roots = sys.argv[1], sys.argv[2:]
CW, RH = 300, 150
sheet = Image.new('RGBA', (110 + CW * 5, 40 + RH * len(roots)), (236, 232, 220, 255))
d = ImageDraw.Draw(sheet)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
for j, t in enumerate(['normal', 'option 1', 'option 2', 'option 3', 'option 4']): d.text((110 + j * CW + 110, 10), t, fill=(40, 40, 40), font=F)
for i, root in enumerate(roots):
    ims = [load(n) for n in line(root)]
    cols = [ims] + [[apply(im, lambda c, o=o: shiny(c, o)) for im in ims] for o in D['lines'][root]['options']]
    y0 = 40 + i * RH
    d.text((8, y0 + 65), root, fill=(40, 40, 40), font=F)
    for j, col in enumerate(cols):
        x = 110 + j * CW + 4
        for im in col:
            s = min(1, (RH - 14) / im.height, 95 / im.width)
            im2 = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST)
            sheet.alpha_composite(im2, (x, y0 + RH - 8 - im2.height)); x += im2.width + 3
sheet.save(out)
