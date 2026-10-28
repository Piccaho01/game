"""Route 1, laid out after the owner's concept (art/concepts/locations/route1_concept.png) and written
into the game's map file (game/src/data/maps/route1.json), keeping its encounters, battle backdrop,
sign and the warp back to Hollow Rest. Same island look as the town (iso_map.py bakes it).

  top: you come down from Hollow Rest onto the upper terrace (height 3)
  middle (2): stone stairs down; a stream runs across the route and spills off the island's edge,
              crossed by the plank bridge; fallen skybox (meteorite craters, Orbitot's home)
  bottom (1): the Tally's meteorite-salvage checkpoint, barrier down: the road on is closed
              ("rain check"), which ends the slice
Tall grass on every terrace (Orbitot and Fledjet). Positions in screen terms: u = x - y
(left/right), s = x + y (back to front).
Usage: python3 art/tools/route1_layout.py   (then: python3 art/tools/iso_map.py route1)
"""
import json, math, os

MAP = os.path.join(os.path.dirname(__file__), '..', '..', 'game', 'src', 'data', 'maps', 'route1.json')
OBJ = json.load(open(os.path.join(os.path.dirname(MAP), '..', 'objects.json')))['objects']
W = H = 22
STREAM_X = 13          # the stream runs along +y down this column


def us(x, y):
    return x - y, x + y


def tile(u, s):
    return round((s + u) / 2), round((s - u) / 2)


def height(x, y):
    u, s = us(x, y)
    half = 9.5 + math.sin(s * 0.45) * 1.3 + math.cos(s * 0.17 + 1) * 1.0 - max(0, s - 34) * 0.9
    if s < 1 or abs(u - 1) > half or s > 41: return 0
    if s < 13 + math.sin(u * 0.7) * 0.8: return 3
    if s < 26 + math.cos(u * 0.5) * 0.9: return 2
    return 1


Z = [[height(x, y) for x in range(W)] for y in range(H)]
K = [['.' for _ in range(W)] for _ in range(H)]


def inside(x, y):
    return 0 <= x < W and 0 <= y < H and Z[y][x] > 0


def put(x, y, c):
    if inside(x, y): K[y][x] = c


def path(points, c='='):
    cells = []
    for (u1, s1), (u2, s2) in zip(points, points[1:]):
        n = int(max(abs(u2 - u1), abs(s2 - s1)) * 3) + 1
        for i in range(n + 1):
            u, s = u1 + (u2 - u1) * i / n, s1 + (s2 - s1) * i / n
            x, y = tile(u, s)
            if not cells or cells[-1] != (x, y):
                if cells and abs(cells[-1][0] - x) + abs(cells[-1][1] - y) == 2:
                    cells.append((x, cells[-1][1]))
                cells.append((x, y))
    for x, y in cells: put(x, y, c)
    return cells


# The stream: down its column across the middle terrace and over the edge; a spring at its head.
for y in range(H):
    if inside(STREAM_X, y) and y >= 3: K[y][STREAM_X] = '~'
# The road: in from Hollow Rest at the top, winding down past the craters, over the bridge,
# down to the checkpoint at the bottom.
ENTRY = (2, 0)
road = path([us(*ENTRY), (1, 5), (-2, 9), (-4, 13), (-3, 17), (0, 20), (4, 22), (9, 24), (10, 28), (7, 31), (3, 34), (0, 36)])
# the bridge: where the road crosses the stream, laid along x
cross = [(x, y) for x, y in road if x == STREAM_X]
bx, by = cross[0]
for x in range(bx - 1, bx + 2): K[by][x] = '='
K[by][bx] = 'B'
for (x, y) in road:
    if x == STREAM_X and y != by: K[y][x] = '~'
for x, y in [(STREAM_X, y) for y in range(H) if inside(STREAM_X, y) and y >= 3 and y != by]:
    K[y][x] = '~'

# Stairs where the road drops a terrace: the lower tile, with the higher one behind it (-x or -y).
for (ax, ay), (bx_, by_) in zip(road, road[1:]):
    za, zb = Z[ay][ax], Z[by_][bx_]
    if abs(za - zb) == 1:
        lx, ly, hx, hy = (ax, ay, bx_, by_) if za < zb else (bx_, by_, ax, ay)
        assert (hx, hy) in ((lx - 1, ly), (lx, ly - 1)), f'the road climbs the wrong way at {lx},{ly}'
        K[ly][lx] = 'H'
    assert abs(za - zb) <= 1, f'a cliff on the road at {ax},{ay}'

objects = []


ROAD = set(road)


def obj(kind, x, y, **kw):
    """Places a piece; scenery that would land on the road, the stream or off the island is left out."""
    d = OBJ[kind]
    tiles = [(x + i, y + j) for i in range(d['wx']) for j in range(d['wy'])]
    if kind not in ('r1_booth', 'r1_bridge') and any(t in ROAD or not inside(*t) or K[t[1]][t[0]] in '~B' for t in tiles): return
    objects.append({'kind': kind, 'x': x, 'y': y, **kw})


# fallen skybox: a big crater on the upper terrace and one by the stream
obj('r1_meteor', *tile(5, 8))
obj('r1_meteor', *tile(-5, 21))
obj('r1_booth', *tile(-1, 37))
obj('r1_bridge', bx - 1, by)
obj('r1_crt_stone', *tile(-6, 9))
obj('r1_lamp', *tile(-6, 15))
obj('r1_crate', *tile(3, 30))
for u, s in [(-8, 11), (8, 14), (-9, 26), (6, 33), (-4, 30)]: obj('r1_flowerbush', *tile(u, s))
for u, s in [(-1, 15), (6, 19), (-7, 33)]: obj('r1_flowers', *tile(u, s))
for u, s in [(-7, 5), (8, 4), (10, 9), (-10, 18), (11, 26), (-9, 30)]: obj('r1_pine', *tile(u, s))
for u, s in [(-3, 3), (9, 18), (-11, 22), (3, 27)]: obj('r1_oak', *tile(u, s))

FOOT = set()
for o in objects:
    d = OBJ[o['kind']]
    for yy in range(o['y'], o['y'] + d['wy']):
        for xx in range(o['x'], o['x'] + d['wx']):
            if not d.get('walkable'): FOOT.add((xx, yy))
            # level ground under it, to its front tile
            Z[yy][xx] = Z[o['y'] + d['wy'] - 1][o['x'] + d['wx'] - 1] if inside(xx, yy) else Z[yy][xx]

# Tall grass in drifts beside the road on every terrace; trees and bushes at the edges.
for y in range(H):
    for x in range(W):
        if not inside(x, y) or K[y][x] != '.' or (x, y) in FOOT: continue
        u, s = us(x, y)
        n = ((x * 73856093) ^ (y * 19349663)) % 10
        edge = any(not inside(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
        near_road = any((x + dx, y + dy) in road for dx in (-1, 0, 1) for dy in (-1, 0, 1))
        drift = math.sin(u * 0.55 + s * 0.31) + math.cos(s * 0.42 - u * 0.2) > 0.55
        if edge and n < 3: K[y][x] = 'T' if n == 0 else 'b'
        elif drift and not near_road: K[y][x] = ','
        elif n == 9 and not near_road: K[y][x] = '*'

sx, sy = tile(4, 5)
K[sy][sx] = 'S'

# Every bit of the road must be walkable from the entry: the checkpoint and the stream's banks too.
def walkable(x, y):
    return inside(x, y) and K[y][x] not in 'TbS~#' and (x, y) not in FOOT
def stair_axis(x, y):
    if K[y][x] != 'H': return None
    up = [(a, nx, ny) for a, nx, ny in (('y', x, y - 1), ('x', x - 1, y)) if inside(nx, ny) and Z[ny][nx] == Z[y][x] + 1]
    on = [a for a, nx, ny in up if K[ny][nx] in '=E']
    return (on or [a for a, _, _ in up] or [None])[0]
def climb(ax, ay, bx_, by_):
    za, zb = Z[ay][ax], Z[by_][bx_]
    if za == zb: return True
    if abs(za - zb) != 1: return False
    lx, ly, hx, hy = (ax, ay, bx_, by_) if za < zb else (bx_, by_, ax, ay)
    a = stair_axis(lx, ly)
    return (a == 'y' and (hx, hy) == (lx, ly - 1)) or (a == 'x' and (hx, hy) == (lx - 1, ly))
seen, todo = {ENTRY}, [ENTRY]
while todo:
    x, y = todo.pop()
    for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        n = (x + dx, y + dy)
        if n not in seen and walkable(*n) and climb(x, y, *n):
            seen.add(n); todo.append(n)
booth = next(o for o in objects if o['kind'] == 'r1_booth')
front = [(booth['x'] + i, booth['y'] + OBJ['r1_booth']['wy']) for i in range(OBJ['r1_booth']['wx'])] + \
        [(booth['x'] + OBJ['r1_booth']['wx'], booth['y'] + j) for j in range(OBJ['r1_booth']['wy'])] + \
        [(booth['x'] + i, booth['y'] - 1) for i in range(OBJ['r1_booth']['wx'])]
assert any(f in seen for f in front), 'the checkpoint cannot be reached'
assert (bx + 1, by) in seen, 'the bridge cannot be crossed'
assert sum(1 for y in range(H) for x in range(W) if K[y][x] == ',' and (x, y) in seen) >= 30, 'not enough tall grass to walk in'

rows = [''.join(r) for r in K]
heights = [''.join(str(z) for z in r) for r in Z]
data = json.load(open(MAP))
data.update({
    '_note': "Route 1 (bible §15): the hills below Hollow Rest, after the owner's concept art. Isometric (art/tools/iso_map.py bakes it). Built by art/tools/route1_layout.py: edit there. Tall grass hides the Route 1 commons; the encounter rate is per step in tall grass (0-1); tune on a phone.",
    'legend': {'.': 'grass', ',': 'tall', '=': 'path', '*': 'flowers', 'T': 'tree', 'b': 'bush', '#': 'fence', '~': 'water', 'B': 'bridge', 'H': 'stairs', 'S': 'sign'},
    'rows': rows, 'heights': heights, 'objects': objects, 'spawn': {'x': ENTRY[0], 'y': ENTRY[1]},
    'signs': [{'x': sx, 'y': sy, 'text': 'ROUTE 1. Meteorite salvage licensed by the Tally. Licence office hours: rescheduled.'}],
    'warps': [{'x': ENTRY[0], 'y': -1, 'to': 'hollow_rest', 'tx': 17, 'ty': 19, 'dir': 'left', 'enter': 'up'}],
})
json.dump(data, open(MAP, 'w'), indent=2)
town_path = os.path.join(os.path.dirname(MAP), 'hollow_rest.json')
town = json.load(open(town_path))
for w in town['warps']:
    if w['to'] == 'route1': w.update({'tx': ENTRY[0], 'ty': ENTRY[1], 'dir': 'down'})
json.dump(town, open(town_path, 'w'), indent=2)
print('\n'.join(r + '   ' + h for r, h in zip(rows, heights)))
print('bridge at', bx, by, '| reachable tall grass:', sum(1 for y in range(H) for x in range(W) if K[y][x] == ',' and (x, y) in seen))
