# Pitch sheet for the shiny and Prototype colourways (owner's call: Prototypes are a colourway, the
# sanctuary's stone and vibrant blue, no glitch). Every stage of every line: normal | shiny | Prototype.
# Shiny = the option picked here per line (game/src/data/shinies.json); Prototype = stone by
# lightness, its bright saturated accents (glows, eyes, markings) in the sanctuary's screen blue.
# Usage: python3 art/creatures/wip/ch1/palette_pitch.py OUT.png
import sys, json, colorsys, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..')
D = json.load(open(os.path.join(ROOT, 'game/src/data/shinies.json')))
SP = json.load(open(os.path.join(ROOT, 'game/src/data/patchlings.json')))['patchlings']
PICK = {'furnaxol': 0, 'zapail': 0, 'sprigby': 0, 'gobbin': 1, 'orbitot': 0, 'fledjet': 0, 'voltcalf': 1, 'wardeye': 1}
STONE = (32 / 360, 0.10)     # warm grey stone (hue, saturation)
BLUE = (205 / 360, 0.85)     # the sanctuary's CRT blue
def line(n):
    out = [n]
    while SP[out[-1]].get('evolves'):
        e = SP[out[-1]]['evolves']; out.append((e[0] if isinstance(e, list) else e)['to'])
    return out
def shiny(px, o):
    r, g, b = [v / 255 for v in px[:3]]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l < 0.17: return px
    if s > 0.12: h = (h + o.get('hue', 0) / 360) % 1; s = min(1, s * o.get('sat', 1))
    l = min(1, l * o.get('light', 1))
    return tuple(round(v * 255) for v in colorsys.hls_to_rgb(h, l, s)) + (px[3],)
def accents(im):
    # A Prototype's blue goes on its brightest, most saturated colours only (glows, eyes, markings):
    # the colours whose saturation x lightness is in the top fifth of the sprite's pixels.
    from collections import Counter
    cnt = Counter(c for c in im.getdata() if c[3])
    score = lambda c: (lambda h, l, s: s * l if l >= 0.17 else 0)(*colorsys.rgb_to_hls(*[v / 255 for v in c[:3]]))
    ranked = sorted(cnt, key=score, reverse=True)
    total, run, out = sum(cnt.values()), 0, set()
    for c in ranked:
        if run > total * 0.2 or score(c) < 0.2: break
        out.add(c); run += cnt[c]
    return out
ACC = set()
def proto(px):
    r, g, b = [v / 255 for v in px[:3]]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l < 0.17: return px
    accent = px in ACC
    hh, ss = BLUE if accent else STONE
    l2 = min(0.92, 0.12 + l * 0.9) if not accent else min(0.85, 0.25 + l * 0.7)
    return tuple(round(v * 255) for v in colorsys.hls_to_rgb(hh, l2, ss)) + (px[3],)
def apply(im, f):
    im = im.copy(); p = im.load(); memo = {}
    for y in range(im.height):
        for x in range(im.width):
            c = p[x, y]
            if c[3] == 0: continue
            if c not in memo: memo[c] = f(c)
            p[x, y] = memo[c]
    return im
def load(n):
    im = Image.open(os.path.join(ROOT, f'art/creatures/out/sprites/{n}.png')).convert('RGBA')
    return im.crop(im.getbbox())
if __name__ == '__main__':
    rows = []
    for root in D['lines']:
        ims = [load(n) for n in line(root)]
        o = D['lines'][root]['options'][PICK[root]]
        protos = []
        for i in ims:
            ACC.clear(); ACC.update(accents(i)); protos.append(apply(i, proto))
        rows.append((root, PICK[root] + 1, [ims, [apply(i, lambda c: shiny(c, o)) for i in ims], protos]))
    CW, RH = 330, 150
    sheet = Image.new('RGBA', (120 + CW * 3, 40 + RH * len(rows)), (236, 232, 220, 255))
    d = ImageDraw.Draw(sheet)
    try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    except Exception: F = None
    for j, t in enumerate(['normal', 'shiny (pick)', 'Prototype']): d.text((120 + j * CW + 110, 10), t, fill=(40, 40, 40), font=F)
    for i, (root, k, cols) in enumerate(rows):
        y0 = 40 + i * RH
        d.text((8, y0 + 60), f'{root}\nshiny opt {k}', fill=(40, 40, 40), font=F)
        rs = min(1, *[(RH - 14) / im.height for im in cols[0]], (CW - 10) / sum(im.width + 3 for im in cols[0]))
        for j, ims in enumerate(cols):
            x = 120 + j * CW + 4
            for im in ims:
                s = rs
                im2 = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST)
                sheet.alpha_composite(im2, (x, y0 + RH - 8 - im2.height)); x += im2.width + 3
    sheet.save(sys.argv[1])
