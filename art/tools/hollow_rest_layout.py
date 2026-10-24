"""Hollow Rest, laid out after the owner's concept (art/concepts/locations/hollow_rest_concept.png)
and written into the game's map file (game/src/data/maps/hollow_rest.json), keeping its NPCs, signs
and warps. Positions are thought of in screen terms: u = x - y (left/right), s = x + y (back to
front); this converts to the grid.

  back: the hill with the sanctuary (height 3), trees behind it
  upper terrace (2): the stone cottage and the casa on the left, a laundry line between them; the
                     suburban house with the van on the right
  middle (1): the crater, the sunflower garden and lamp post, the shed at the right edge
  front: the island drops into the sky; stairs go down off the edge (to Route 1)
Usage: python3 art/tools/hollow_rest_layout.py
"""
import json, math, os

SPAWN = (12, 13)
MAP = os.path.join(os.path.dirname(__file__), '..', '..', 'game', 'src', 'data', 'maps', 'hollow_rest.json')
W = H = 24


def us(x, y):
    return x - y, x + y


def height(x, y):
    u, s = us(x, y)
    wob = math.sin(u * 0.9) * 0.8 + math.cos(u * 0.37 + 1) * 1.2
    front = 37 - 0.18 * abs(u) + wob
    if abs(u) > 17 - max(0, (s - 30)) * 0.6 or s > front or s < 1: return 0
    if s < 11.5 and -1 <= u <= 6: return 3
    if (u < -2 and s < 21 + math.sin(u * 0.8)) or (u >= -2 and s < 17 + math.cos(u * 0.6) * 0.7): return 2
    return 1


Z = [[height(x, y) for x in range(W)] for y in range(H)]
K = [['.' for _ in range(W)] for _ in range(H)]


def put(x, y, c):
    if 0 <= x < W and 0 <= y < H and Z[y][x] > 0 and (x, y) not in globals().get('FOOT', ()): K[y][x] = c


def path(points, c='='):
    """A path through (u, s) points, rasterized onto the grid as a 4-connected chain."""
    cells = []
    for (u1, s1), (u2, s2) in zip(points, points[1:]):
        n = int(max(abs(u2 - u1), abs(s2 - s1)) * 3) + 1
        for i in range(n + 1):
            u, s = u1 + (u2 - u1) * i / n, s1 + (s2 - s1) * i / n
            x, y = round((s + u) / 2), round((s - u) / 2)
            if not cells or cells[-1] != (x, y):
                if cells and abs(cells[-1][0] - x) + abs(cells[-1][1] - y) == 2:
                    cells.append((x, cells[-1][1]))
                cells.append((x, y))
    for x, y in cells: put(x, y, c)
    return cells


def tile(u, s):
    return round((s + u) / 2), round((s - u) / 2)


# Trees: dense woods behind the hill and down the left slope; a clump on the right; bushes
# along the edges and round the houses (the concept is lush).
for y in range(H):
    for x in range(W):
        u, s = us(x, y)
        if Z[y][x] == 0: continue
        n = ((x * 73856093) ^ (y * 19349663)) % 10
        if s < 7 and not (0 <= u <= 4): K[y][x] = 'T'
        elif s < 11 and (u < -5 or u > 8): K[y][x] = 'T' if n < 8 else 'b'
        elif u < -12 and s < 28: K[y][x] = 'T' if n < 5 else 'b' if n < 7 else '.'
        elif u > 12 and s < 21: K[y][x] = 'T' if n < 7 else 'b'
        elif n == 0 and Z[y][x] < 3: K[y][x] = 'b'

objects = []
def obj(kind, u, s, wx=1, wy=1):
    """Place by the footprint's front tile at (u, s)."""
    fx, fy = tile(u, s)
    objects.append({'kind': kind, 'x': fx - wx + 1, 'y': fy - wy + 1})
obj('sanctuary', 2, 10, 3, 4)
obj('cottage', -12, 22, 2, 3)
obj('casa', -4, 16, 2, 3)
obj('suburb', 8, 15, 5, 2)
obj('crater', 0, 22, 3, 3)
obj('shed', 12, 28, 2, 2)
for u, s in [(-7, 23), (-6, 24), (-7, 25), (-5, 23)]: obj('sunflowers', u, s)
obj('lamp', -6, 21)
obj('laundry', -8, 19)
obj('chalk', -2, 30)
obj('cat', -4, 31)
obj('bench', 4, 28)
obj('crates', 14, 26)
obj('mailbox', 4, 17)
obj('pots', -2, 17)
obj('pots', -3, 19)
obj('rock', 14, 22)
obj('rock', -9, 31)
obj('rock', 9, 33)

OBJ = json.load(open(os.path.join(os.path.dirname(MAP), '..', 'objects.json')))['objects']
FOOT = set()
for o in objects:
    d = OBJ[o['kind']]
    if d.get('walkable'): continue
    for yy in range(o['y'], o['y'] + d['wy']):
        for xx in range(o['x'], o['x'] + d['wx']): FOOT.add((xx, yy))

# Paths (as in the concept): from the stairs at the front edge, a winding track up-left past the
# garden to the cottage terrace; a branch right round the crater to the shed and up to the
# suburb; and up the hill to the sanctuary.
path([(-1, 40), (-1, 35), (-2, 31), (-5, 28), (-8, 25), (-9, 22), (-8, 19), (-7, 17)])          # front -> left terrace
path([(-8, 25), (-3, 26), (2, 26), (6, 24), (8, 21), (7, 18), (6, 16)])              # round the crater -> right
path([(-7, 17), (-5, 15), (-2, 14), (1, 13), (2, 11)])                                # upper terrace -> hill
path([(6, 16), (5, 15), (4, 14), (1, 13)])
path([(-11, 23), (-9, 22)]); path([(-4, 12), (-5, 15)])                                # to the doors
path([(6, 24), (9, 27), (12, 29), (13, 29)])                                           # to the shed door
# stairs down off the island: the front-most path tile (whose ground drops away in front of it)
edge = [(x, y) for y in range(H) for x in range(W) if K[y][x] == '=' and Z[y][x] > 0 and ((y + 1 >= H or Z[y + 1][x] == 0) or (x + 1 >= W or Z[y][x + 1] == 0))]
ex, ey = max(edge, key=lambda p: p[0] + p[1])
K[ey][ex] = 'E'

# Stairs where the paths cross a terrace edge: the stair tile is the lower one.
def stairs_at(x, y):
    z = Z[y][x]
    for dx, dy in ((0, -1), (-1, 0)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < W and 0 <= ny < H and Z[ny][nx] == z + 1 and (nx, ny) not in FOOT:
            K[y][x] = 'H'; return True
    return False
for y in range(H):
    for x in range(W):
        if K[y][x] == '=':
            for dx, dy in ((0, 1), (1, 0)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and Z[ny][nx] == Z[y][x] - 1 and K[ny][nx] == '=':
                    stairs_at(nx, ny)
# the way off the island: stairs down the front edge
fx, fy = tile(-1, 35)
for k in range(1, 4):
    if Z[fy][fx + k] == 0 or Z[fy + k][fx] == 0: pass

# Scorched ground round the crater; the sunflower garden; flowers.
for y in range(H):
    for x in range(W):
        u, s = us(x, y)
        if Z[y][x] == 1 and K[y][x] == '.' and (u / 4.2) ** 2 + ((s - 21.5) / 3.6) ** 2 + 0.15 * math.sin(x * 2.1 + y) < 1:
            K[y][x] = 'd'
for u, s in [(-12, 21), (10, 20), (-4, 8), (9, 26), (-10, 28), (3, 31)]:
    x, y = tile(u, s); K[y][x] = '*' if K[y][x] == '.' else K[y][x]
# fences along the garden and the cliff top, as in the concept
for pts in ([(-10, 26), (-9, 27), (-8, 28), (-7, 29), (-6, 30)], [(-4, 26), (-3, 27)], [(10, 27), (11, 26), (12, 25)], [(-12, 22), (-11, 23)]):
    for u, s in pts:
        x, y = tile(u, s)
        if 0 <= x < W and 0 <= y < H and K[y][x] in '.b': K[y][x] = '#'

# objects stand on their own ground: clear terrain under them, and level the ground to the front tile
for o in objects:
    d = OBJ[o['kind']]
    zf = Z[o['y'] + d['wy'] - 1][o['x'] + d['wx'] - 1]
    for yy in range(o['y'], o['y'] + d['wy']):
        for xx in range(o['x'], o['x'] + d['wx']):
            if K[yy][xx] in 'Tb#*': K[yy][xx] = '.'
            Z[yy][xx] = zf          # level ground under it
# no tree right against a house (they'd hide its walls)
for o in objects:
    if o['kind'] not in ('cottage', 'casa', 'suburb', 'shed'): continue
    d = OBJ[o['kind']]
    for yy in range(o['y'] - 1, o['y'] + d['wy'] + 2):
        for xx in range(o['x'] - 1, o['x'] + d['wx'] + 2):
            if 0 <= xx < W and 0 <= yy < H and K[yy][xx] == 'T': K[yy][xx] = 'b' if (xx + yy) % 3 == 0 else '.'
# the town sign by the path to the edge
K[17][13] = 'S'

# Every door, the sanctuary, the heal spot and the way off must be walkable from the spawn.
def walkable(x, y):
    return 0 <= x < W and 0 <= y < H and Z[y][x] > 0 and K[y][x] not in 'TbS#' and (x, y) not in FOOT
def stair_axis(x, y):
    """Toward the higher neighbour (-y or -x) that the path carries on into; else any higher one."""
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
def reach(start):
    seen, todo = {start}, [start]
    while todo:
        x, y = todo.pop()
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            n = (x + dx, y + dy)
            if n not in seen and walkable(*n) and climb(x, y, *n):
                seen.add(n); todo.append(n)
    return seen
R = reach(SPAWN)
need = {'exit': (ex, ey)}
for o in objects:
    d = OBJ[o['kind']]
    if 'door' in d: need[o['kind'] + ' door'] = (o['x'] + d['door'][0], o['y'] + d['door'][1])
    if d.get('opens'): need[o['kind'] + ' front'] = (o['x'] + d['wx'] // 2, o['y'] + d['wy'])
missing = {k: v for k, v in need.items() if v not in R}
assert not missing, f'not reachable from the spawn: {missing}'

rows = [''.join(r) for r in K]
heights = [''.join(str(z) for z in r) for r in Z]
data = json.load(open(MAP))
data.update({
    '_note': "Hollow Rest (bible §9), after the owner's concept art. Isometric (art/tools/iso_map.py bakes the look from this file). 'heights': the ground level per tile (0 = the sky past the island's edge). Built by art/tools/hollow_rest_layout.py; NPCs, signs and warps are placed by hand.",
    'legend': {'.': 'grass', '=': 'path', 'd': 'dirt', 'T': 'tree', 'b': 'bush', '#': 'fence', '*': 'flowers', 'H': 'stairs', 'E': 'exit', 'S': 'sign', '~': 'water'},
    'rows': rows, 'heights': heights, 'objects': objects,
})
json.dump(data, open(MAP, 'w'), indent=2)
print('\n'.join(r + '   ' + h for r, h in zip(rows, heights)))
