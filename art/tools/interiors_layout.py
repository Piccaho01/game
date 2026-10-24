"""The interiors (M4b, bible §7): the friends' four houses in Hollow Rest and the sanctuary base
inside the hill. Writes one map file per room (game/src/data/maps/<id>.json) and checks them.

A room is a W x H floor at height 1. Back walls stand on the x = 0 edge (left on screen) and the
y = 0 edge (right); the front is open. Ways out are warps just past an edge: walking out through
the open front (a mat marks it) or into an archway in a back wall. Doors: walking into a building
from its door tile goes to the room's spawn (engine/overworld.ts step); the room's way out lands
back on that door tile, facing away from the building.

The sanctuary base: the entrance hall is open from the start; PATCH's workshop through the left
arch; Root Hall behind rubble that clears when the wing is restored; the Tide Gallery arch stays
blocked (its room comes with Kettleport). People who move in are visits in data/cast.json.

Furniture is placeholder art (iso_room.py) until the owner's interior drafts are converted; the
inside jokes live in each piece's text.
Usage: python3 art/tools/interiors_layout.py   (then iso_map.py <id> for each room)
"""
import json, os
from collections import deque

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, '..', '..', 'game', 'src', 'data')
OBJ = json.load(open(os.path.join(DATA, 'objects.json')))['objects']
TOWN = json.load(open(os.path.join(DATA, 'maps', 'hollow_rest.json')))
CAST = json.load(open(os.path.join(DATA, 'cast.json')))['people']
BACK = {'left': 'right', 'right': 'left', 'up': 'down', 'down': 'up'}


def town_door(kind):
    """The building's door tile in Hollow Rest, and the way you walk in."""
    o = next(o for o in TOWN['objects'] if o['kind'] == kind)
    d = OBJ[kind]
    dx, dy = d['door']
    walk = 'left' if dx == d['wx'] else 'up' if dy == d['wy'] else 'right' if dx == -1 else 'down'
    return o['x'] + dx, o['y'] + dy, walk


def room(id, name, w, h, floor, wall, windows=(), arches=()):
    return {'id': id, 'name': name, 'w': w, 'h': h, 'interior': {'floor': floor, 'wall': wall, 'windows': [list(x) for x in windows], 'arches': [list(x) for x in arches]},
            'objects': [], 'warps': [], 'spawn': None}


def front_exit(r, at, to, tx, ty, walk_in, dir_out):
    """The way out through the open front, on the edge you came in by (walking `walk_in`)."""
    if walk_in == 'left':      # came in moving -x: through the +x edge
        r['warps'].append({'x': r['w'], 'y': at, 'to': to, 'tx': tx, 'ty': ty, 'dir': dir_out})
        return r['w'] - 1, at
    r['warps'].append({'x': at, 'y': r['h'], 'to': to, 'tx': tx, 'ty': ty, 'dir': dir_out})
    return at, r['h'] - 1


def house(id, name, kind, w, h, floor, wall, at, windows=()):
    r = room(id, name, w, h, floor, wall, windows)
    x, y, walk = town_door(kind)
    r['spawn'] = dict(zip('xy', front_exit(r, at, 'hollow_rest', x, y, walk, BACK[walk])))
    return r


def put(r, kind, x, y, text=None, **kw):
    o = {'kind': kind, 'x': x, 'y': y}
    if text: o['text'] = text
    o.update(kw)
    r['objects'].append(o)


# ---------- the friends' houses ----------
cottage = house('callum_house', "Callum's cottage", 'cottage', 7, 6, 'wood', 'stone', 3, windows=[('r', 3)])
put(cottage, 'shelf', 0, 1, "Comics and boxed retro games, alphabetical. A binder on top says DO NOT TOUCH (IN ORDER).")
put(cottage, 'shelf', 0, 2, "A whole shelf of Patchling pins. Callum calls it a collection. Everyone else calls it a problem.")
put(cottage, 'crt', 2, 0, "A CRT running an emulator, paused mid-boss. The save file is older than the world.")
put(cottage, 'arcade', 4, 0, "The arcade cabinet from the porch, brought in out of the rain. It's always raining. It's a Scottish house.")
put(cottage, 'bed', 6, 0, "Callum's bed. A handheld under the pillow, still on.")
put(cottage, 'table', 3, 3, "A McDonald's bag. Double cheeseburger, extra patty, extra cheese. The Triple Cheese. Again.")
put(cottage, 'stove', 0, 4, "A kettle and a Scottish flag tea towel. His mum posted it. Into a video game. Somehow.")

casa = house('dani_house', "Dani's casa", 'casa', 7, 6, 'tile', 'mint', 3, windows=[('l', 2), ('r', 4)])
put(casa, 'hammock', 1, 0, "A hammock. Dani's \"five minutes\" starts here.")
put(casa, 'plant', 0, 0, "A plant his mum told him to water. It's thriving. Nobody knows how.")
put(casa, 'table', 4, 0, "Family photos. In every one Dani is in the middle, smiling, and late.")
put(casa, 'stove', 0, 3, "A pot of Colombian coffee, still warm. Dani made it before he \"left\" an hour ago.")
put(casa, 'ball', 5, 2, "A football. Dani says he could have gone pro. Dani also says he's on his way.")
put(casa, 'table', 6, 4, "His phone charger and his shoes, by the door. One lace untied. He's still leaving.")

basement = house('nolan_house', "Nolan's basement", 'suburb', 7, 6, 'carpet', 'foam', 2, windows=[('r', 5)])
put(basement, 'sampler', 1, 0, "The sampler and two monitors. A beat called final_FINAL_v7. Nolan says it's not done.")
put(basement, 'van_window', 5, 0, "Through the window: the white work van in the driveway. A man is watching it with a coffee.")
put(basement, 'couch', 0, 3, "The couch. Callum could have slept here. Callum chose the van.")
put(basement, 'shelf', 0, 1, "A copy of 2K22 (the GOAT), a stack of records and a framed photo of a van.")
put(basement, 'table', 4, 4, "A bottle of Goldschlager and a yoga mat. Nolan is a different breed on the headstands.")

shed = house('haydon_shed', "Haydon's shed", 'shed', 6, 5, 'boards', 'planks', 2, windows=[('l', 1)])
put(shed, 'ring_light', 1, 0, "A ring light. It's on. It's always on.")
put(shed, 'desk', 2, 0, "Three monitors, a mic on an arm and a clip-on mic for good measure. Plaqueboymax is on one of them.")
put(shed, 'chair', 3, 1, "His gaming chair. Still warm. Smells like ragebait.")
put(shed, 'whiteboard', 0, 3, "A list. Every name is scribbled out. Under it, in Haydon's writing: [REDACTED].")
put(shed, 'snacks', 0, 2, "Snacks. A sticky note: \"nah these aren't yours\". They're yours.")

# ---------- the sanctuary base ----------
hall = room('sanctuary_hall', 'Sanctuary', 10, 8, 'stone', 'cave', arches=[('r', 2)])
sx, sy, walk = town_door('sanctuary')
hall['spawn'] = dict(zip('xy', front_exit(hall, 4, 'hollow_rest', sx, sy, walk, BACK[walk])))
workshop = room('sanctuary_workshop', "PATCH's workshop", 8, 7, 'stone', 'cave')
roots = room('sanctuary_root_hall', 'Root Hall', 8, 7, 'stone', 'cave')

# hall <-> workshop: the left arch; hall <-> Root Hall: the right arch, behind rubble
hall['warps'].append({'x': -1, 'y': 3, 'to': 'sanctuary_workshop', 'tx': 7, 'ty': 3, 'dir': 'left'})
workshop['spawn'] = dict(zip('xy', front_exit(workshop, 3, 'sanctuary_hall', 0, 3, 'left', 'right')))
hall['warps'].append({'x': 6, 'y': -1, 'to': 'sanctuary_root_hall', 'tx': 4, 'ty': 6, 'dir': 'up'})
roots['spawn'] = dict(zip('xy', front_exit(roots, 4, 'sanctuary_hall', 6, 0, 'up', 'down')))

put(hall, 'terminal', 4, 0, None)
put(hall, 'rubble', 6, 0, until='wing:root_hall')
put(hall, 'rubble', 2, 0, "Rubble over the arch. Behind it, water drips: the Tide Gallery. PATCH: \"I'm working on a fix.\"")
put(hall, 'crt_stone', 0, 1, "A dead CRT set into the stone, glowing faint blue. PATCH: \"Don't lick it.\"")
put(hall, 'crt_stone', 0, 6, "Another CRT stone. Someone scratched a tally into it: four lines, one slash.")
for (x, y), who in zip([(8, 0), (9, 0), (9, 2), (9, 3)], ['Callum', 'Nolan', 'Haydon', 'Dani']):
    joke = {'Callum': 'a bestiary under the pillow', 'Nolan': 'folded with corners you could cut yourself on',
            'Haydon': 'a phone propped up, still streaming to nobody', 'Dani': "still rolled up. He hasn't got here yet"}[who]
    put(hall, 'bedroll', x, y, f"{who}'s bedroll, {joke}. You rest a while. The team's patched up.")

put(workshop, 'cradle', 1, 1, "PATCH's charging cradle, the size of a car. A note on it: NOT A BED. -P")
put(workshop, 'workbench', 3, 0, "Spare bolts, tape rolls and a mug: WORLD'S OKAYEST ROBOT.")
put(workshop, 'whiteboard', 0, 4, "A whiteboard titled FIX. 1. Everything. 2. See 1.")
put(workshop, 'panels', 6, 0, "A pile of spare panels. One is labelled HAYDON, DO NOT.")
put(workshop, 'crt_stone', 0, 0, "A CRT stone PATCH has wired into the bench. It shows a loading bar. It has always shown a loading bar.")

put(roots, 'plant', 0, 1, "Roots through every stone. They hum, faintly. PATCH says that's normal.")
put(roots, 'plant', 3, 0, "More roots. They lean toward you when you walk past.")
put(roots, 'crt_stone', 6, 0, "A CRT stone, awake now: a slow blue pulse, in time with the hills outside.")
put(roots, 'crt_stone', 0, 4, "A keeper's mark carved under the screen: a hand, and a seal.")

ROOMS = [cottage, casa, basement, shed, hall, workshop, roots]


# ---------- checks ----------
def solid(r, flags):
    """Tiles covered by furniture that's there with these flags."""
    s = set()
    for o in r['objects']:
        if o.get('until') in flags or (o.get('when') and o['when'] not in flags): continue
        d = OBJ[o['kind']]
        if d.get('walkable'): continue
        for yy in range(o['y'], o['y'] + d['wy']):
            for xx in range(o['x'], o['x'] + d['wx']): s.add((xx, yy))
    return s


def reach(r, flags):
    block = solid(r, flags)
    start = (r['spawn']['x'], r['spawn']['y'])
    seen, q = {start}, deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in seen and 0 <= n[0] < r['w'] and 0 <= n[1] < r['h'] and n not in block:
                seen.add(n); q.append(n)
    return seen, block


def check(r, flags):
    R, block = reach(r, flags)
    for o in r['objects']:
        d = OBJ[o['kind']]
        assert o['x'] + d['wx'] <= r['w'] and o['y'] + d['wy'] <= r['h'], f"{r['id']}: {o['kind']} off the room"
    # every way out you can walk to (the tile next to it is reachable), unless rubble covers it
    for w in r['warps']:
        x, y = w['x'], w['y']
        inner = (min(max(x, 0), r['w'] - 1), min(max(y, 0), r['h'] - 1))
        if inner in block: continue
        assert inner in R, f"{r['id']} {sorted(flags)}: can't reach the way to {w['to']}"
    # every piece you can read: some open neighbour is reachable
    for o in r['objects']:
        if o.get('until') in flags: continue
        d = OBJ[o['kind']]
        if not (o.get('text') or d.get('text') or d.get('opens')): continue
        cells = {(xx, yy) for yy in range(o['y'], o['y'] + d['wy']) for xx in range(o['x'], o['x'] + d['wx'])}
        near = {(cx + dx, cy + dy) for cx, cy in cells for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))} - cells
        assert near & R, f"{r['id']}: can't get to the {o['kind']} at {o['x']},{o['y']}"
    return R


for r in ROOMS:
    check(r, set())
    check(r, {'wing:root_hall'})
# people who move in stand on open, reachable floor
by_id = {r['id']: r for r in ROOMS}
for pid, c in CAST.items():
    for v in c.get('visits', []):
        if v['map'] in by_id:
            R = check(by_id[v['map']], {v['when']})
            assert (v['x'], v['y']) in R, f"{pid} visits {v['map']} at {v['x']},{v['y']}: not open floor"

for r in ROOMS:
    path = os.path.join(DATA, 'maps', f"{r['id']}.json")
    old = json.load(open(path)) if os.path.exists(path) else {}
    data = {
        '_note': f"{r['name']}: an interior (M4b). Built by art/tools/interiors_layout.py (edit it there); baked by art/tools/iso_map.py. Furniture is placeholder art until the owner's interior drafts are converted.",
        'id': r['id'], 'name': r['name'], 'interior': r['interior'],
        'legend': {'.': 'floor'}, 'rows': ['.' * r['w']] * r['h'],
        'spawn': r['spawn'], 'warps': r['warps'], 'objects': r['objects'],
    }
    if old.get('npcs'): data['npcs'] = old['npcs']     # people placed by hand are kept
    json.dump(data, open(path, 'w'), indent=2)
    print(r['id'], f"{r['w']}x{r['h']}", len(r['objects']), 'pieces')
