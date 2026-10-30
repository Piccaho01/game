"""Chapter 1's Route 1 props from the owner's drafts, at game scale and graded like the rest of
Route 1 (the way route1_kit.py and iso_map.py do theirs):
  r1_storm_rod       the keepers' storm-rod, ruined: bent, green copper, the Tally's cable on it
  r1_storm_rod_lit   the same rod relit after the storm (runes glowing, sparks)
  r1_cloud_clamp     the Tally's Cloud Clamp (stamp arm, ticket roll, red lamp, grey cable)
Drafts: art/concepts/locations/r1_storm_rod.png (ruined left, relit right), r1_cloud_clamp.png.
Usage: python3 art/tools/ch1_props.py  ->  art/locations/out/<name>.png and out/graded/<name>.png
(then python3 art/tools/iso_map.py route1 places them on the map). Placed by hand in route1.json.
"""
import os, sys
from PIL import Image
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
from sheet_cut import pieces, cutout  # noqa: E402
from iso_kit import prop  # noqa: E402
from iso_map import grade  # noqa: E402
from route1_kit import keep_main  # noqa: E402

C = os.path.join(HERE, '..', 'concepts', 'locations')
OUT = os.path.join(HERE, '..', 'locations', 'out', 'graded')


def make(src, box, size, colours, name):
    a = keep_main(prop(keep_main(cutout(src, box)), size, colours))
    # out/ is what iso_map.py bakes from (it grades its own copy); graded/ is what the game loads.
    Image.fromarray(a, 'RGBA').save(os.path.join(OUT, '..', f'{name}.png'))
    Image.fromarray(grade(a), 'RGBA').save(os.path.join(OUT, f'{name}.png'))
    return a.shape


rod = os.path.join(C, 'r1_storm_rod.png')
boxes = sorted(pieces(rod, step=2, gap=1, min_area=800, white=240), key=lambda b: b[0])
assert len(boxes) == 2, boxes
print('r1_storm_rod', make(rod, boxes[0], ('h', 60), 20, 'r1_storm_rod'))
print('r1_storm_rod_lit', make(rod, boxes[1], ('h', 60), 20, 'r1_storm_rod_lit'))
clamp = os.path.join(C, 'r1_cloud_clamp.png')
cb = pieces(clamp, step=2, gap=1, min_area=800, white=240)
box = (min(b[0] for b in cb), min(b[1] for b in cb), max(b[2] for b in cb), max(b[3] for b in cb))
print('r1_cloud_clamp', make(clamp, box, ('h', 46), 22, 'r1_cloud_clamp'))
