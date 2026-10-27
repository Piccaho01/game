"""The interiors (bible §7): the four friends' houses in Hollow Rest and the sanctuary base inside
the hill, written as the game's map files (game/src/data/maps/<room>.json), plus the door warps in
Hollow Rest that lead into them. iso_map.py bakes each room (iso_room.py: the cut-away look).

Rooms are small (a screen or so). You come in on the doormat at the front-left edge facing in, and
leave by walking off that edge. Arches in a back wall lead deeper into the sanctuary; rubble in an
arch (`until` a wing) keeps a room shut until it is restored. Furniture is data/objects.json
(placeholders from interior_props.py until the owner's interior sheets arrive). Lines are in
data/world_dialogue.json; the recurring cast's homes and visits in data/cast.json.

Checks: every mat, door, object you can use and sign can be reached from the mat; fails loudly if not.
Usage: python3 art/tools/interiors_layout.py   (then bake: python3 art/tools/iso_map.py <room>)
"""
import json, os

GAME = os.path.join(os.path.dirname(__file__), '..', '..', 'game', 'src', 'data')
MAPS = os.path.join(GAME, 'maps')
OBJ = json.load(open(os.path.join(GAME, 'objects.json')))['objects']
CAST = json.load(open(os.path.join(GAME, 'cast.json')))['people']

# Where each house's door is in Hollow Rest: the door tile (in the building's footprint), the
# tile you stand on to walk in, and the way you walk.
TOWN_DOORS = {
    'callum_house': {'door': (5, 17), 'stand': (6, 17), 'out': 'right'},
    'dani_house': {'door': (5, 10), 'stand': (5, 11), 'out': 'down'},
    'nolan_house': {'door': (10, 4), 'stand': (10, 5), 'out': 'down'},
    'haydon_shed': {'door': (20, 8), 'stand': (21, 8), 'out': 'right'},
    'sanctuary_hall': {'door': (5, 4), 'stand': (5, 5), 'out': 'down'},
}


def o(kind, x, y, **kw):
    return {'kind': kind, 'x': x, 'y': y, **kw}


ROOMS = {
    'callum_house': {
        'name': "Callum's Cottage", 'size': (7, 6), 'mat': 3,
        'interior': {'floor': 'wood', 'wall': 'stone', 'wallColor': '#a49c90', 'wallH': 40,
                     'windows': [['r', 4]], 'decor': [['l', 3, 'pins', 2], ['r', 1, 'towel']]},
        'objects': [o('in_shelf_comics', 0, 1), o('in_crt_tv', 2, 0), o('in_rug', 2, 2), o('in_armchair', 3, 2),
                    o('in_laptop', 6, 1), o('in_table_bag', 5, 3), o('in_plant', 6, 0)],
        'signs': [{'x': -1, 'y': 3, 'talk': 'callum_pins'}, {'x': -1, 'y': 4, 'talk': 'callum_pins'}, {'x': 1, 'y': -1, 'talk': 'callum_towel'}],
    },
    'nolan_house': {
        'name': "Nolan's Basement", 'size': (7, 6), 'mat': 3,
        'interior': {'floor': 'carpet', 'floorColor': '#6e6a72', 'wall': 'foam', 'wallH': 40,
                     'decor': [['r', 3, 'van', 2], ['l', 4, 'clock']]},
        'objects': [o('in_studio_desk', 0, 0), o('in_tv_console', 6, 0), o('in_couch', 4, 3), o('in_shelf_bottle', 0, 2), o('in_plant', 0, 4)],
        'signs': [{'x': 3, 'y': -1, 'talk': 'nolan_window'}, {'x': 4, 'y': -1, 'talk': 'nolan_window'}],
    },
    'haydon_shed': {
        'name': "Haydon's Shed", 'size': (6, 5), 'mat': 2,
        'interior': {'floor': 'plank', 'wall': 'wood', 'wallH': 38,
                     'decor': [['l', 1, 'list', 2], ['r', 4, 'poster', 1, '#7a52b8'], ['r', 0, 'leds', 6], ['l', 0, 'leds', 5]]},
        'objects': [o('in_ring_light', 0, 0), o('in_stream_desk', 2, 0), o('in_gaming_chair', 3, 1), o('in_snacks', 5, 2)],
        'signs': [{'x': -1, 'y': 1, 'talk': 'haydon_list'}, {'x': -1, 'y': 2, 'talk': 'haydon_list'}, {'x': 4, 'y': -1, 'talk': 'haydon_poster'}],
    },
    'dani_house': {
        'name': "Dani's Casa", 'size': (7, 6), 'mat': 3,
        'interior': {'floor': 'tile', 'wall': 'plaster', 'wallColor': '#a8dcc4', 'wallH': 40,
                     'windows': [['r', 4]], 'decor': [['l', 1, 'photos', 2], ['r', 6, 'clock']]},
        'objects': [o('in_fridge', 0, 0), o('in_counter', 1, 0), o('in_hammock', 4, 3), o('in_football', 1, 3),
                    o('in_shoes', 2, 5), o('in_plant', 0, 4)],
        'signs': [{'x': -1, 'y': 1, 'talk': 'dani_photos'}, {'x': -1, 'y': 2, 'talk': 'dani_photos'}],
    },
    'sanctuary_hall': {
        'name': 'Sanctuary: Entrance Hall', 'size': (9, 8), 'mat': 4,
        'interior': {'floor': 'stone', 'wall': 'cave', 'wallH': 48,
                     'doors': [['r', 2, 'rubble'], ['l', 3, 'arch'], ['r', 7, 'sealed']],
                     'decor': [['l', 1, 'screen'], ['l', 5, 'screen'], ['r', 5, 'screen'], ['l', 6, 'roots', 2], ['r', 3, 'roots', 1]]},
        'objects': [o('in_pillar', 0, 0), o('in_rubble', 2, 0, until={'wing': 'root_hall'}), o('in_crt_stones', 4, 0), o('in_pillar', 8, 0),
                    o('in_bedroll_teal', 6, 2), o('in_bedroll_grey', 7, 2), o('in_bedroll_khaki', 6, 3), o('in_bedroll_navy', 7, 3),
                    o('in_terminal', 0, 5)],
        'signs': [{'x': 7, 'y': -1, 'talk': 'sanctuary_sealed_tide'}],
        'links': [{'x': 2, 'y': -1, 'to': 'sanctuary_roots'}, {'x': -1, 'y': 3, 'to': 'sanctuary_workshop'}],
        'roam': [{'x': 3, 'y': 3}, {'x': 5, 'y': 5}, {'x': 2, 'y': 6}, {'x': 7, 'y': 6}],
    },
    'sanctuary_workshop': {
        'name': "PATCH's Workshop", 'size': (7, 6), 'mat': 3,
        'interior': {'floor': 'stone', 'floorColor': '#7a766e', 'wall': 'cave', 'wallH': 44,
                     'decor': [['l', 3, 'fixboard', 2], ['r', 5, 'screen'], ['r', 3, 'roots', 1]]},
        'objects': [o('in_cradle', 0, 0), o('in_workbench', 3, 0), o('in_panels', 6, 1), o('in_panels', 6, 3)],
        'signs': [{'x': -1, 'y': 3, 'talk': 'workshop_fixboard'}, {'x': -1, 'y': 4, 'talk': 'workshop_fixboard'}],
    },
    'sanctuary_roots': {
        'name': 'Sanctuary: Root Hall', 'size': (8, 7), 'mat': 3,
        'interior': {'floor': 'stone', 'floorColor': '#86907a', 'wall': 'cave', 'wallH': 48,
                     'doors': [['r', 6, 'sealed']],
                     'decor': [['l', 0, 'roots', 3], ['r', 1, 'roots', 2], ['l', 4, 'screen'], ['r', 4, 'screen'], ['l', 5, 'roots', 2]]},
        'objects': [o('in_roots', 2, 1), o('in_pool', 5, 3), o('in_keeper_bench', 1, 4), o('in_keeper_bench', 6, 1), o('in_pillar', 0, 0)],
        'signs': [{'x': 6, 'y': -1, 'talk': 'sanctuary_sealed_deep'}],
        'roam': [{'x': 1, 'y': 2}, {'x': 4, 'y': 4}, {'x': 7, 'y': 3}, {'x': 2, 'y': 5}],
    },
}
# Rooms behind a back wall: where their doormat leads back to (map, x, y, facing).
BACK = {'sanctuary_roots': ('sanctuary_hall', 2, 0, 'down'), 'sanctuary_workshop': ('sanctuary_hall', 0, 3, 'right')}


def build():
    out = {}
    for rid, r in ROOMS.items():
        W, H = r['size']
        rows = [['.'] * W for _ in range(H)]
        rows[H - 1][r['mat']] = 'm'
        if rid in BACK:
            to, tx, ty, d = BACK[rid]
        else:
            door = TOWN_DOORS[rid]
            to, (tx, ty), d = 'hollow_rest', door['stand'], door['out']
        warps = [{'x': r['mat'], 'y': H, 'to': to, 'tx': tx, 'ty': ty, 'dir': d, 'enter': 'down'}]
        for ln in r.get('links', []):
            far = ROOMS[ln['to']]
            enter = 'up' if ln['y'] < 0 else 'left'
            warps.append({'x': ln['x'], 'y': ln['y'], 'to': ln['to'], 'tx': far['mat'], 'ty': far['size'][1] - 1, 'dir': 'up', 'enter': enter})
        data = {
            '_note': f"{r['name']} (bible §7 interiors). A room: art/tools/iso_map.py bakes it as a cut-away (iso_room.py). Written by art/tools/interiors_layout.py: edit there.",
            'id': rid, 'name': r['name'], 'legend': {'.': 'floor', 'm': 'mat'},
            'rows': [''.join(row) for row in rows], 'spawn': {'x': r['mat'], 'y': H - 1},
            'interior': r['interior'], 'warps': warps, 'signs': r.get('signs', []), 'npcs': [], 'objects': r['objects'],
        }
        if r.get('roam'): data['roam'] = r['roam']
        out[rid] = data
    return out


def solid(data, x, y, gates_open=True):
    W, H = len(data['rows'][0]), len(data['rows'])
    if not (0 <= x < W and 0 <= y < H): return True
    for ob in data['objects']:
        d = OBJ[ob['kind']]
        if d.get('walkable') or (ob.get('until') and gates_open): continue
        if ob['x'] <= x < ob['x'] + d['wx'] and ob['y'] <= y < ob['y'] + d['wy']: return True
    return False


def check(rid, data):
    W, H = len(data['rows'][0]), len(data['rows'])
    people = [(c['home']['x'], c['home']['y']) for c in CAST.values() if c['home']['map'] == rid]
    people += [(v['x'], v['y']) for c in CAST.values() for v in c.get('visits', []) if v['map'] == rid]
    for n in people + [(s['x'], s['y']) for s in data.get('roam', [])]:
        assert not solid(data, *n), f'{rid}: someone stands on furniture at {n}'
    start = (data['spawn']['x'], data['spawn']['y'])
    seen, todo = {start}, [start]
    while todo:
        x, y = todo.pop()
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            n = (x + dx, y + dy)
            if n not in seen and not solid(data, *n) and n not in people:
                seen.add(n); todo.append(n)
    near = lambda tx, ty: any((tx + dx, ty + dy) in seen for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)))
    for w in data['warps']:
        assert near(w['x'], w['y']), f"{rid}: can't reach the way to {w['to']}"
    for s in data['signs']:
        assert near(s['x'], s['y']), f"{rid}: can't reach the sign at {s['x']},{s['y']}"
    for ob in data['objects']:
        d = OBJ[ob['kind']]
        if not (d.get('opens') or d.get('talk') or d.get('text') or d.get('rest')): continue
        tiles = [(ob['x'] + i, ob['y'] + j) for i in range(d['wx']) for j in range(d['wy'])]
        assert any(near(*t) for t in tiles), f"{rid}: can't reach {ob['kind']}"


if __name__ == '__main__':
    rooms = build()
    for rid, data in rooms.items():
        check(rid, data)
        json.dump(data, open(os.path.join(MAPS, f'{rid}.json'), 'w'), indent=2)
        print(rid, data['name'])
    # the doors in Hollow Rest
    town_path = os.path.join(MAPS, 'hollow_rest.json')
    town = json.load(open(town_path))
    town['warps'] = [w for w in town.get('warps', []) if w['to'] not in TOWN_DOORS]
    for rid, door in TOWN_DOORS.items():
        r = ROOMS[rid]
        dx, dy = door['door'][0] - door['stand'][0], door['door'][1] - door['stand'][1]
        enter = {(1, 0): 'right', (-1, 0): 'left', (0, 1): 'down', (0, -1): 'up'}[(dx, dy)]
        town['warps'].append({'x': door['door'][0], 'y': door['door'][1], 'to': rid, 'tx': r['mat'], 'ty': r['size'][1] - 1, 'dir': 'up', 'enter': enter})
    json.dump(town, open(town_path, 'w'), indent=2)
    print('hollow_rest: doors', ', '.join(TOWN_DOORS))
