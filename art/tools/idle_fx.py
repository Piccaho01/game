"""Per-creature idle animations from a still battle sprite (M7, double-res sprites).

Reads art/creatures/out/sprites/<name>.png and the effect list for <name> in
art/creatures/idle_fx.json, writes art/creatures/out/anims/<name>_idle.png + .json (the same
strip + atlas layout pxl writes, so the game loads it unchanged) and a .gif preview.

Effects (boxes are fractions of the sprite's opaque bounding box: [x0, y0, x1, y1]):
  {"breath": 0.4, "px": 2}            rows above that fraction rise and fall
  {"hover": 3}                        whole sprite floats up and down
  {"bounce": 4}                       boxer bounce (fast, abs sine)
  {"bob": [box], "px": 3, "phase": 0.25, "axis": "y"}   one region moves on its own
                                                      ("keep": true leaves the original under it)
  {"glow": ["#rrggbb", ...], "amt": 0.35}               those colours pulse brighter
  {"flicker": ["#rrggbb", ...], "off": [2, 3, 7]}       those colours vanish on those frames
  {"blink": [box], "frames": [8], "colour": "#rrggbb"}  eyes in the box close (filled with colour)
Frames: 12 at 100 ms unless "frames"/"ms" are set on the creature.
Usage: python3 idle_fx.py NAME [NAME...]   (or "all")
"""
import sys, os, json, math
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'creatures')
CFG = json.load(open(os.path.join(ROOT, 'idle_fx.json')))


def hexrgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])


def shift(a, dx, dy, mask=None, keep=False):
    """Move the pixels in mask (or all) by dx, dy; what they leave behind is transparent, or with
    keep the original pixels stay underneath (no seam where a part cuts through a solid area)."""
    if mask is None: mask = a[..., 3] > 0
    part = np.where(mask[..., None], a, 0)
    rest = a if keep else np.where(mask[..., None], 0, a)
    moved = np.roll(np.roll(part, dy, 0), dx, 1)
    return np.where(moved[..., 3:4] > 0, moved, rest)


def frame(base, fx, t, n, box):
    a = base.copy()
    x0, y0, x1, y1 = box
    W, H = x1 - x0, y1 - y0
    s = math.sin(2 * math.pi * t / n)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    def region(b): return (xx >= x0 + b[0] * W) & (xx < x0 + b[2] * W) & (yy >= y0 + b[1] * H) & (yy < y0 + b[3] * H) & (a[..., 3] > 0)
    for e in fx:
        if 'breath' in e:
            d = round((1 - math.cos(2 * math.pi * t / n)) / 2 * e.get('px', 2))
            a = shift(a, 0, d, (yy < y0 + e['breath'] * H) & (a[..., 3] > 0))
        elif 'hover' in e:
            a = shift(a, 0, round(s * e['hover']))
        elif 'bounce' in e:
            a = shift(a, 0, -round(abs(math.sin(2 * math.pi * t / n)) * e['bounce']))
        elif 'bob' in e:
            v = round(math.sin(2 * math.pi * (t / n + e.get('phase', 0))) * e.get('px', 2))
            a = shift(a, v if e.get('axis') == 'x' else 0, v if e.get('axis', 'y') == 'y' else 0, region(e['bob']), e.get('keep', False))
        elif 'glow' in e:
            k = (1 + s) / 2 * e.get('amt', 0.3)
            for h in e['glow']:
                m = (np.abs(a[..., :3].astype(int) - hexrgb(h)).sum(2) < 4) & (a[..., 3] > 0)
                a[m, :3] = (a[m, :3] + (255 - a[m, :3]) * k).astype(np.uint8)
        elif 'flicker' in e:
            if t in e.get('off', []):
                for h in e['flicker']:
                    m = (np.abs(a[..., :3].astype(int) - hexrgb(h)).sum(2) < 4)
                    a[m] = 0
        elif 'blink' in e:
            if t in e.get('frames', [8]):
                m = region(e['blink'])
                bright = a[..., :3].astype(int).sum(2) > 3 * 150
                a[m & bright, :3] = hexrgb(e['colour'])
    return a


def build(name):
    c = CFG[name]
    base = np.asarray(Image.open(os.path.join(ROOT, 'out', 'sprites', name + '.png')).convert('RGBA')).copy()
    ys, xs = np.where(base[..., 3] > 0)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    n, ms = c.get('frames', 12), c.get('ms', 100)
    frames = [frame(base, c['fx'], t, n, box) for t in range(n)]
    w, h = base.shape[1], base.shape[0]
    strip = Image.new('RGBA', (w * n, h))
    for i, f in enumerate(frames): strip.paste(Image.fromarray(f), (i * w, 0))
    out = os.path.join(ROOT, 'out', 'anims', name + '_idle')
    strip.save(out + '.png')
    atlas = {'frames': {f'{name}_idle_{i}': {'frame': {'x': i * w, 'y': 0, 'w': w, 'h': h}, 'rotated': False, 'trimmed': False,
             'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h}, 'sourceSize': {'w': w, 'h': h}, 'duration': ms} for i in range(n)},
             'meta': {'app': 'idle_fx.py', 'image': name + '_idle.png', 'size': {'w': w * n, 'h': h}, 'scale': '1', 'format': 'RGBA8888', 'frameTags': [{'name': name + '_idle', 'from': 0, 'to': n - 1, 'direction': 'forward'}]}}
    json.dump(atlas, open(out + '.json', 'w'), indent=1)
    gif = [Image.fromarray(f).resize((w * 2, h * 2), Image.NEAREST) for f in frames]
    bg = [Image.alpha_composite(Image.new('RGBA', g.size, (235, 235, 225, 255)), g).convert('RGB') for g in gif]
    bg[0].save(out + '.gif', save_all=True, append_images=bg[1:], duration=ms, loop=0)
    print(name, n, 'frames')


if __name__ == '__main__':
    names = list(CFG) if sys.argv[1:] == ['all'] else sys.argv[1:]
    for nm in names: build(nm)
