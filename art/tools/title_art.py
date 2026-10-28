"""The title screen's art (M6): PATCH leaning on the runestone, and the four friends small enough
to stand in front of him (he's about three times their height, bible §6).

    python3 art/tools/title_art.py
PATCH comes from the owner's draft (art/concepts/title/patch_runestone.png), used whole: cut off
the white and sampled to twice its own pixel grid (about 11.3 px a pixel, so 212 px tall), every
colour kept. The friends are cut from their character sheets at FRIEND_H, like sheet2battle.py.
Writes art/title/out/patch_runestone.png and art/title/out/<id>.png.
"""
import os
import sheet2battle as sb
from PIL import Image

PATCH_H = 212
FRIEND_H = 64
OUT = 'art/title/out'

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    src = 'art/concepts/title/patch_runestone.png'
    w, h = Image.open(src).size
    sb.TARGET_H = PATCH_H
    im = sb.sample(*sb.cut(src, (0, 0, w, h), holes=40))
    im.save(f'{OUT}/patch_runestone.png')
    print('patch_runestone', im.size)
    sb.TARGET_H = FRIEND_H
    for cid, box in sb.BOXES.items():
        im = sb.sample(*sb.cut(f'art/concepts/trainers/{cid}.png', box))
        im.save(f'{OUT}/{cid}.png')
        print(cid, im.size)
