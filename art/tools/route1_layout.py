"""Route 1, laid out after the owner's concept (art/concepts/locations/route1_concept.png) and written
into the game's map file (game/src/data/maps/route1.json), keeping its NPCs, encounters and signs.
Positions are thought of in screen terms where it helps: u = x - y (left/right), s = x + y (back to
front).

  back: the path from Hollow Rest comes down the owner's cliff stairs (top right) onto the upper
        terrace (height 2); the Tally's meteorite-salvage booth and barrier on the left, a meteor
        crater on the right, tall grass round the trees
  front (1): stairs down the terrace edge; a stream runs across the right side (out over the
        edge) with the wooden bridge on the path; a second crater and more tall grass beyond it;
        the road ends at a sign at the front edge (the way down is closed: rain check)
Usage: python3 art/tools/route1_layout.py
"""
import json, math, os
from collections import deque

MAP = os.path.join(os.path.dirname(__file__), '..', '..', 'game', 'src', 'data', 'maps', 'route1.json')
OBJ = json.load(open(os.path.join(os.path.dirname(MAP), '..', 'objects.json')))['objects']
CAST = json.load(open(os.path.join(os.path.dirname(MAP), '..', 'cast.json')))['people']
W = H = 22


def height(x, y):
    u, s = x - y, x + y
    wob = math.sin(u * 0.8) * 0.9 + math.cos(u * 0.33 + 2) * 1.1
    if abs(u) > 16 - max(0, s - 32) * 0.7 or s < 1 or s > 37 - 0.2 * abs(u) + wob: return 0
    if s < 17 + math.sin(u * 0.7) * 0.8: return 2
    return 1


Z = [[height(x, y) for x in range(W)] for y in range(H)]
K = [['.' for _ in range(W)] for _ in range(H)]
objects = []
FOOT = set()


def obj(kind, x, y, **kw):
    d = OBJ[kind]
    objects.append({'kind': kind, 'x': x, 'y': y, **kw})
    if not d.get('walkable'):
        for yy in range(y, y + d['wy']):
            for xx in range(x, x + d['wx']): FOOT.add((xx, yy))


def put(x, y, c):
    if 0 <= x < W and 0 <= y < H and Z[y][x] > 0 and (x, y) not in FOOT: K[y][x] = c


def line(cells, c='='):
    """A 4-connected path through grid points."""
    out = []
    for (x1, y1), (x2, y2) in zip(cells, cells[1:]):
        x, y = x1, y1
        while (x, y) != (x2, y2):
            out.append((x, y))
            # alternate axes so it zigzags like a diagonal in screen terms
            if x != x2 and (y == y2 or (x + y) % 2 == 0): x += 1 if x2 > x else -1
            else: y += 1 if y2 > y else -1
    out.append(cells[-1])
    for x, y in out: put(x, y, c)
    return out


# ---------- set pieces ----------
obj('cliff_stairs', 12, 0)                 # up to Hollow Rest; the way back is the path tile in front
ARRIVE = (12, 2)
obj('booth', 2, 5)
obj('meteor', 13, 5)
obj('meteor', 5, 16)
STREAM_X = (15, 16)
BRIDGE_Y = 13
obj('bridge', 14, BRIDGE_Y)

# ---------- the stream: from under the terrace edge out over the front edge ----------
for y in range(H):
    for x in STREAM_X:
        if Z[y][x] == 1 and y != BRIDGE_Y: K[y][x] = '~'
        if Z[y][x] == 1 and y == BRIDGE_Y: K[y][x] = 'B'

# ---------- paths ----------
line([ARRIVE, (12, 4), (9, 4), (8, 7), (8, 10)])               # down from the stairs, past the booth
line([(8, 10), (9, 12), (11, 13), (13, 13)])                   # down the terrace edge, to the bridge
line([(17, 13), (18, 15), (18, 17)])                             # over it and on to the front
line([(8, 11), (6, 14), (3, 15)])                              # a branch west, round the crater
K[ARRIVE[1]][ARRIVE[0]] = 'E'
# a sign where the road gives out at the front
SIGN = (18, 18)
# stairs where the paths cross the terrace edge (the stair tile is the lower one)
for y in range(H):
    for x in range(W):
        if K[y][x] != '=' or Z[y][x] != 1: continue
        for nx, ny in ((x, y - 1), (x - 1, y)):
            if 0 <= nx and 0 <= ny and Z[ny][nx] == 2 and K[ny][nx] in '=E':
                K[y][x] = 'H'
                break

# ---------- woods, grass, scatter ----------
TALL = [(-9, -3, 7, 13), (-14, -8, 20, 27), (2, 9, 25, 31), (-1, 3, 4, 9), (-6, 0, 28, 33)]   # u0, u1, s0, s1
for y in range(H):
    for x in range(W):
        if Z[y][x] == 0 or K[y][x] != '.' or (x, y) in FOOT: continue
        u, s = x - y, x + y
        n = ((x * 73856093) ^ (y * 19349663)) % 11
        if any(u0 <= u <= u1 and s0 <= s <= s1 for u0, u1, s0, s1 in TALL) and n < 9: K[y][x] = ','
        elif s < 6 and not (8 <= x <= 14): K[y][x] = 'T' if n < 7 else 'b'
        elif u < -11 and s < 22: K[y][x] = 'T' if n < 6 else 'b' if n < 8 else '.'
        elif u > 9 and s < 17: K[y][x] = 'T' if n < 5 else 'b' if n < 7 else '.'
        elif n == 0: K[y][x] = 'b'
        elif n == 1: K[y][x] = 'f'
put(*SIGN, 'S')
# fences along the cliff tops by the path, as in the concept
for x, y in [(4, 3), (5, 3), (6, 3)]:
    if K[y][x] in '.bf': K[y][x] = '#'
# small props on open grass
for kind, (x, y) in [('lamp', (13, 3)), ('r1_crate', (6, 8)), ('r1_marker', (10, 7)), ('r1_rocks', (3, 12)), ('r1_boulder', (19, 11)),
                     ('r1_meteor_tile', (11, 9)), ('r1_meteor_tile', (19, 17)), ('r1_stone', (4, 19))]:
    if (x, y) not in FOOT and Z[y][x] > 0 and K[y][x] in '.bf,': K[y][x] = '.'; obj(kind, x, y)

# objects stand on level ground (their front tile's) with nothing under them
for o in objects:
    d = OBJ[o['kind']]
    zf = Z[o['y'] + d['wy'] - 1][o['x'] + d['wx'] - 1]
    for yy in range(o['y'], o['y'] + d['wy']):
        for xx in range(o['x'], o['x'] + d['wx']):
            if o['kind'] != 'bridge':
                if K[yy][xx] in 'Tb#f,~': K[yy][xx] = '.'
                Z[yy][xx] = zf

# ---------- checks ----------
data = json.load(open(MAP))


def walkable(x, y):
    return 0 <= x < W and 0 <= y < H and Z[y][x] > 0 and K[y][x] not in 'TbS#~' and (x, y) not in FOOT


def stair_axis(x, y):
    if K[y][x] != 'H': return None
    up = [(a, nx, ny) for a, nx, ny in (('y', x, y - 1), ('x', x - 1, y)) if nx >= 0 and ny >= 0 and Z[ny][nx] == Z[y][x] + 1]
    on_path = [a for a, nx, ny in up if K[ny][nx] in '=E']
    return (on_path or [a for a, _, _ in up] or [None])[0]


def climb(ax, ay, bx, by):
    za, zb = Z[ay][ax], Z[by][bx]
    if za == zb: return True
    if abs(za - zb) != 1: return False
    lx, ly, hx, hy = (ax, ay, bx, by) if za < zb else (bx, by, ax, ay)
    a = stair_axis(lx, ly)
    return (a == 'y' and (hx, hy) == (lx, ly - 1)) or (a == 'x' and (hx, hy) == (lx - 1, ly))


people = [n for n in data.get('npcs', [])] + [{'id': k, **c['home']} for k, c in CAST.items() if c['home']['map'] == 'route1']
start = (ARRIVE[0], ARRIVE[1] + 1)
seen, q = {start}, deque([start])
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        n = (x + dx, y + dy)
        if n not in seen and walkable(*n) and climb(x, y, *n) and n not in {(p['x'], p['y']) for p in people}:
            seen.add(n); q.append(n)
need = {'the way back': ARRIVE, 'the bridge': (STREAM_X[0], BRIDGE_Y), 'past the bridge': (STREAM_X[1] + 1, BRIDGE_Y),
        'the sign': (SIGN[0], SIGN[1] - 1)}
missing = {k: v for k, v in need.items() if v not in seen}
if missing: print('\n'.join(''.join(r) + '   ' + ''.join(map(str, z)) for r, z in zip(K, Z)))
assert not missing, f'not reachable from the arrival: {missing}'
grass = [(x, y) for y in range(H) for x in range(W) if K[y][x] == ',' and (x, y) in seen]
assert len(grass) >= 30, f'only {len(grass)} reachable tall grass tiles'
for side in ('left', 'right'):
    patch = [g for g in grass if (g[0] > STREAM_X[1]) == (side == 'right')]
    assert patch, f'no tall grass on the {side} of the stream'
covered = [p['id'] for p in people if not walkable(p['x'], p['y'])]
assert not covered, f'people standing on something solid: {covered}'

rows = [''.join(r) for r in K]
heights = [''.join(str(z) for z in r) for r in Z]
data.update({
    '_note': "Route 1 (bible §9, §15): the hills outside Hollow Rest, after the owner's concept. Isometric (art/tools/iso_map.py bakes it); built by art/tools/route1_layout.py (edit it there). Tall grass hides the Route 1 commons. Encounter rate is per step in tall grass (0-1); tune on a phone.",
    'legend': {'.': 'grass', ',': 'tall', '=': 'path', 'f': 'flowers', 'T': 'tree', 'b': 'bush', '#': 'fence', '~': 'water',
               'S': 'sign', 'H': 'stairs', 'E': 'exit', 'B': 'bridge'},
    'rows': rows, 'heights': heights, 'objects': objects, 'spawn': {'x': start[0], 'y': start[1]},
    'warps': [{'x': ARRIVE[0], 'y': ARRIVE[1], 'to': 'hollow_rest', 'tx': 17, 'ty': 19, 'dir': 'left'}],
    'signs': [{'x': SIGN[0], 'y': SIGN[1], 'text': 'ROAD DOWN TO THE LOWLANDS. Closed for maintenance by order of the Tally. Reopening: rain check.'}],
    'kit': {'trees': ['r1_oak', 'r1_pine', 'r1_oak', 'tree_1'], 'bushes': ['r1_bush_0', 'r1_bush_1', 'r1_bush_flower', 'r1_tuft_3', 'r1_pebbles'],
            'tall': 'r1_top_tall', 'signpost': 'r1_signpost'},
})
json.dump(data, open(MAP, 'w'), indent=2)
print('\n'.join(r + '   ' + h for r, h in zip(rows, heights)))
print(len(grass), 'tall grass tiles reachable')
