"""A room straight from the owner's interior concept (art/concepts/locations/interior_<room>.png):
the whole painted room (walls, wall decor, furniture) becomes the room's baked image, warped onto
the game's isometric grid and shrunk to game scale. This replaces the procedural look (iso_room.py)
and the placeholder furniture for the rooms listed in ROOMS.

How it works:
- The concept's floor corners (left, front, right; the back one follows) are found from the room's
  silhouette minus the floor slab's thickness `t`; an affine map puts them on the game grid's corners.
  The concept's projection is flatter than 2:1, so each room keeps its own tile size (layout.tile).
- Furniture stays painted. Its tiles are solid ('x'); what you can use is a sign on that tile
  (talk/text/opens/rest). People always draw over the room, so no walkable tile is left behind a
  tall front piece.
- `cutout`: a piece that comes and goes (the rubble in the sanctuary's arch): painted out of the
  room (filled from `fill` boxes) and kept as its own sprite with `until`.
- `paint`: small additions in game space (a doorway the concept doesn't have).
- `recolor`: concept fixes (Poké Balls become our seal orbs).

Usage: python3 art/tools/room_concept.py <room> [--grid]   (--grid: a preview with numbered tiles)
Writes game/src/data/maps/<map>.json (rows, signs, objects) and art/locations/out/maps/<map>.png/.json.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
from iso_kit import reduce, sharpen  # noqa: E402

GAME = os.path.join(HERE, '..', '..', 'game', 'src', 'data')
CONCEPTS = os.path.join(HERE, '..', 'concepts', 'locations')
OUT = os.path.join(HERE, '..', 'locations', 'out')
SCALE = 1 / 5          # concept px -> game px
TILE_W = 42            # target tile width in game px (the count of tiles follows from it)
BACKDROP = (33, 23, 23, 255)

ROOMS = json.load(open(os.path.join(HERE, 'rooms.json')))


def corners(a, t):
    """Floor corners (left, front, right, back) of the concept, in concept px."""
    m = a[..., :3].min(2) < 235
    ys, xs = np.where(m)
    L, R, B = xs.min(), xs.max(), ys.max()
    lc = np.array([L, ys[xs <= L + 2].max() - t], float)
    rc = np.array([R, ys[xs >= R - 2].max() - t], float)
    fc = np.array([xs[ys >= B - 2].mean(), B - t], float)
    return lc, fc, rc, lc + rc - fc


def affine(src, dst):
    """3 point pairs -> 2x3 matrix taking src to dst."""
    A = np.array([[x, y, 1] for x, y in src], float)
    return np.linalg.solve(A, np.array(dst, float)).T


def build(room, grid=False):
    cfg = ROOMS[room]
    im = Image.open(os.path.join(CONCEPTS, f"interior_{cfg['concept']}.png")).convert('RGBA')
    a = np.array(im)
    lc, fc, rc, bk = corners(a, cfg.get('t', 22))
    for k, d in cfg.get('nudge', {}).items():
        {'left': lc, 'front': fc, 'right': rc}[k] += np.array(d, float)
    bk = lc + rc - fc
    nx = cfg.get('nx') or max(3, round((rc[0] - bk[0]) * SCALE * 2 / TILE_W))
    ny = cfg.get('ny') or max(3, round((bk[0] - lc[0]) * SCALE * 2 / TILE_W))
    w = 2 * round(((rc[0] - bk[0]) / nx + (bk[0] - lc[0]) / ny) / 2 * SCALE)
    h = round(((rc[1] - bk[1]) / nx + (lc[1] - bk[1]) / ny) / 2 * SCALE * 2)
    # fixes on the concept before it is warped
    for rc_ in cfg.get('recolor', []):
        x0, y0, x1, y1 = rc_['box']
        sub = a[y0:y1, x0:x1, :3].astype(int)
        red = (sub[..., 0] > 150) & (sub[..., 1] < 90) & (sub[..., 2] < 90)
        sub[red] = rc_['to']
        a[y0:y1, x0:x1, :3] = sub
    cut = None
    if cfg.get('cutout'):
        c = cfg['cutout']
        orig = a.copy()
        for f in c['fill']:          # [x0, y0, x1, y1, sx, sy]: fill the box from the one at (sx, sy)
            x0, y0, x1, y1, sx, sy = f
            if sx is None:
                a[y0:y1, x0:x1, :3] = c['dark']
            else:
                a[y0:y1, x0:x1] = orig[sy:sy + y1 - y0, sx:sx + x1 - x0]
        diff = np.abs(orig[..., :3].astype(int) - a[..., :3].astype(int)).sum(2) > 30
        cut = np.zeros_like(orig)
        cut[diff] = orig[diff]
    white = a[..., :3].min(2) >= 235
    a[white] = 0
    # game space: back corner at (ox, oy) on a canvas big enough for the warped concept
    S = 5                               # warp at 5x game scale, then box-shrink (clean area filter)
    gl = lambda p: (p[0] * S, p[1] * S)
    g_b = np.array([0.0, 0.0])
    g_r = g_b + nx * np.array([w / 2, h / 2])
    g_l = g_b + ny * np.array([-w / 2, h / 2])
    M = affine([bk, rc, lc], [g_b, g_r, g_l])
    hs, ws = a.shape[:2]
    pts = np.array([[0, 0, 1], [ws, 0, 1], [0, hs, 1], [ws, hs, 1]], float) @ M.T
    ys_, xs_ = np.where(a[..., 3] > 0)
    box = np.array([[xs_.min(), ys_.min(), 1], [xs_.max(), ys_.min(), 1], [xs_.min(), ys_.max(), 1], [xs_.max(), ys_.max(), 1]], float) @ M.T
    pad = 6
    x0, y0 = np.floor(box[:, 0].min()) - pad, np.floor(box[:, 1].min()) - pad
    W, H = int(np.ceil(box[:, 0].max() - x0)) + pad, int(np.ceil(box[:, 1].max() - y0)) + pad
    Mg = M.copy()
    Mg[:, 2] -= [x0, y0]
    big = np.vstack([Mg * S, [0, 0, 1]])
    inv = np.linalg.inv(big)[:2].ravel()

    def warp(arr):
        img = Image.fromarray(arr, 'RGBA').transform((W * S, H * S), Image.AFFINE, tuple(inv), Image.BILINEAR)
        img = img.resize((W, H), Image.BOX)
        out = np.array(img)
        out[..., 3] = np.where(out[..., 3] >= 128, 255, 0)
        return out

    room_a = warp(a)
    room_a = reduce(sharpen(room_a, 0.5), cfg.get('colours', 48))
    canvas = np.zeros((H, W, 4), np.uint8)
    canvas[...] = BACKDROP
    fg = room_a[..., 3] > 0
    canvas[fg] = room_a[fg]
    ox, oy = -x0 - w / 2, -y0             # layout origin: tile (0,0)'s box top-left
    sprites = []
    if cut is not None:
        cw = warp(cut)
        cw = reduce(sharpen(cw, 0.5), 20)
        ys, xs = np.where(cw[..., 3] > 0)
        cx0, cy0, cx1, cy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        art = cfg['cutout']['art']
        Image.fromarray(cw[cy0:cy1, cx0:cx1], 'RGBA').save(os.path.join(OUT, 'graded', f'{art}.png'))
        tx, ty = cfg['cutout']['tile']
        sprites.append({'art': art, 'x': int(cx0), 'y': int(cy0), 'fx': tx, 'fy': ty, 'wx': 1, 'wy': 1,
                        'key': (tx + ty) * 10 + 6, 'decal': False, 'until': cfg['cutout']['until']})
    for p in cfg.get('paint', []):      # doorways etc., in tile terms on a back wall
        paint(canvas, p, ox, oy, w, h)

    tile = lambda x, y: (ox + (x - y) * w / 2, oy + (x + y) * h / 2)
    if grid:
        g = Image.fromarray(canvas, 'RGBA').resize((W * 4, H * 4), Image.NEAREST)
        d = ImageDraw.Draw(g)
        for y in range(ny):
            for x in range(nx):
                sx, sy = tile(x, y)
                q = [(sx + w / 2, sy), (sx + w, sy + h / 2), (sx + w / 2, sy + h), (sx, sy + h / 2)]
                d.polygon([(px * 4, py * 4) for px, py in q], outline=(0, 255, 255))
                d.text(((sx + w / 2) * 4 - 10, (sy + h / 2) * 4 - 6), f'{x},{y}', fill=(255, 255, 0))
        return g, (nx, ny, w, h)

    write_map(room, cfg, nx, ny)
    os.makedirs(os.path.join(OUT, 'maps'), exist_ok=True)
    mp = cfg['map']
    Image.fromarray(canvas, 'RGBA').save(os.path.join(OUT, 'maps', f'{mp}.png'))
    json.dump({'origin': {'x': round(ox, 2), 'y': round(oy, 2)}, 'tile': {'w': w, 'h': h, 'z': 16},
               'size': {'w': W, 'h': H}, 'sprites': sprites},
              open(os.path.join(OUT, 'maps', f'{mp}.json'), 'w'), indent=1)
    print(f'{mp}: {nx}x{ny} tiles of {w}x{h}, {W}x{H} px')
    return canvas


def paint(canvas, p, ox, oy, w, h):
    """An arched doorway in a back wall: wall 'l' (x = 0 side, `at` along y) or 'r' (y = 0 side, along x).
    Stone frame lit from the top left, a dark opening, the arch rounded across its width."""
    wall, at, tall = p['wall'], p['at'], p.get('h', 30)
    if wall == 'l':
        b0 = np.array([ox + w / 2 - at * w / 2, oy + at * h / 2])           # the tile's back-left edge
        b1 = b0 + [-w / 2, h / 2]
    else:
        b0 = np.array([ox + w / 2 + at * w / 2, oy + at * h / 2])
        b1 = b0 + [w / 2, h / 2]
    x0, x1 = sorted((b0[0], b1[0]))
    slope = (b1[1] - b0[1]) / (b1[0] - b0[0])
    wid = x1 - x0
    for x in range(int(x0 + wid * 0.12), int(x1 - wid * 0.12) + 1):
        u = (x - x0 - wid * 0.12) / (wid * 0.76)                            # 0..1 across the doorway
        base = b0[1] + (x - b0[0]) * slope
        arch = tall - 6 + 6 * np.sqrt(max(0.0, 1 - (2 * u - 1) ** 2))
        for y in range(int(base - arch) - 2, int(base) + 1):
            if not (0 <= y < canvas.shape[0] and 0 <= x < canvas.shape[1]): continue
            edge = u < 0.1 or u > 0.9 or y < base - arch + 1
            if edge:
                c = (150, 128, 112) if u < 0.5 else (104, 88, 80)
            else:
                k = (y - (base - arch)) / arch
                c = tuple(int(v) for v in np.array([20, 14, 18]) + np.array([16, 12, 10]) * k)
            canvas[y, x] = (*c, 255)


def write_map(room, cfg, nx, ny):
    path = os.path.join(GAME, 'maps', f"{cfg['map']}.json")
    m = json.load(open(path))
    rows = [['.'] * nx for _ in range(ny)]
    for x, y in cfg.get('solid', []):
        rows[y][x] = 'x'
    if cfg.get('mat'):
        mx, my = cfg['mat']
        rows[my][mx] = 'm'
    m['legend'] = {'.': 'floor', 'm': 'mat', 'x': 'ruin'}
    m['rows'] = [''.join(r) for r in rows]
    m['spawn'] = {'x': cfg['spawn'][0], 'y': cfg['spawn'][1]}
    m['signs'] = cfg.get('signs', [])
    m['objects'] = cfg.get('objects', [])
    m['warps'] = cfg['warps']
    m.pop('interior', None)
    m['concept'] = cfg['concept']
    if 'roam' in cfg: m['roam'] = cfg['roam']
    m['_note'] = f"{m['name']} (bible §7 interiors): the owner's concept is the room, by art/tools/room_concept.py from art/tools/rooms.json. Edit there."
    save(path, m)
    if cfg.get('town'):                 # the outside door lands on the new spot
        t = cfg['town']
        tp = os.path.join(GAME, 'maps', 'hollow_rest.json')
        town = json.load(open(tp))
        for wp in town['warps']:
            if wp['to'] == t['to']:
                wp.update({'tx': t['tx'], 'ty': t['ty']})
                if 'dir' in t: wp['dir'] = t['dir']
        save(tp, town)
    for who, (x, y) in cfg.get('cast', {}).items():
        cp = os.path.join(GAME, 'cast.json')
        cast = json.load(open(cp))
        p = cast['people'][who]
        for spot in [p['home']] + p.get('visits', []):
            if spot['map'] == cfg['map']:
                spot['x'], spot['y'] = x, y
        save(cp, cast)


def save(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')


if __name__ == '__main__':
    room = sys.argv[1]
    if '--grid' in sys.argv:
        g, info = build(room, grid=True)
        out = sys.argv[sys.argv.index('--grid') + 1] if len(sys.argv) > sys.argv.index('--grid') + 1 else f'/tmp/{room}_grid.png'
        g.save(out)
        print(room, info, '->', out)
    else:
        build(room)
