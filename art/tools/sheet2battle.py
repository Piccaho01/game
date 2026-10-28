"""Cuts a friend's battle sprite (the larger front pixel figure) out of their character sheet
(art/concepts/trainers/<id>.png) and samples it back to its pixel grid, for the assist cut-ins.

    python3 art/tools/sheet2battle.py
writes art/trainers/out/<id>_battle.png (transparent, about 96 px tall).
"""
from collections import deque
import numpy as np
from PIL import Image

# Where the front battle figure sits on each sheet (x0, y0, x1, y1), with some margin.
BOXES = {
    'callum': (480, 345, 712, 832),
    'nolan': (486, 218, 708, 690),
    'haydon': (495, 240, 705, 720),
    'dani': (492, 345, 676, 842),
}
TARGET_H = 96


def cut(path, box):
    a = np.asarray(Image.open(path).convert('RGB').crop(box)).astype(int)
    h, w = a.shape[:2]
    white = a.min(2) > 225
    bg = np.zeros((h, w), bool)
    q = deque((y, x) for y in range(h) for x in range(w) if (x in (0, w - 1) or y in (0, h - 1)) and white[y, x])
    for y, x in q:
        bg[y, x] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    # Keep the biggest figure only: drop slivers of the neighbouring illustration at the box edges.
    label = np.zeros((h, w), int)
    sizes = {}
    for sy, sx in zip(*np.where(~bg)):
        if label[sy, sx]:
            continue
        n = len(sizes) + 1
        label[sy, sx] = n
        q, count = deque([(sy, sx)]), 0
        while q:
            y, x = q.popleft()
            count += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and not label[ny, nx]:
                    label[ny, nx] = n
                    q.append((ny, nx))
        sizes[n] = count
    bg = label != max(sizes, key=sizes.get)
    ys, xs = np.where(~bg)
    a, bg = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], bg[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return a, bg


def sample(a, bg):
    h, w = bg.shape
    H = TARGET_H
    W = max(1, round(w * H / h))
    out = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        y0, y1 = int((y + 0.2) * h / H), max(int((y + 0.2) * h / H) + 1, int((y + 0.8) * h / H))
        for x in range(W):
            x0, x1 = int((x + 0.2) * w / W), max(int((x + 0.2) * w / W) + 1, int((x + 0.8) * w / W))
            m = ~bg[y0:y1, x0:x1]
            if m.mean() < 0.5:
                continue
            out[y, x, :3] = np.median(a[y0:y1, x0:x1][m], axis=0)
            out[y, x, 3] = 255
    return Image.fromarray(defringe(out), 'RGBA')


def defringe(out, passes=3):
    """Drops the pale grey halo the white sheet leaves round the outline: an edge pixel (next to
    transparency) that is nearly colourless and either light or much paler than its neighbours. Coloured light pixels (cream sneakers, the
    sherpa collar) have some warmth and stay."""
    for _ in range(passes):
        a = out[..., 3] > 0
        pad = np.pad(a, 1)
        edge = a & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
        rgb = out[..., :3].astype(int)
        light = rgb.min(2) > 150
        grey = rgb.max(2) - rgb.min(2) < 24
        # Or a grey rim much paler than the figure just inside it (on dark trousers, hair).
        lum = rgb.mean(2) * a
        pl, pa = np.pad(lum, 1), np.pad(a, 1).astype(int)
        n = pa[:-2, 1:-1] + pa[2:, 1:-1] + pa[1:-1, :-2] + pa[1:-1, 2:]
        inner = (pl[:-2, 1:-1] + pl[2:, 1:-1] + pl[1:-1, :-2] + pl[1:-1, 2:]) / np.maximum(n, 1)
        rim = (rgb.mean(2) - inner > 45) & (n >= 1)
        # Pure white touching transparency even corner to corner (gaps between the legs).
        p8 = np.pad(~a, 1)
        corner = p8[:-2, :-2] | p8[:-2, 2:] | p8[2:, :-2] | p8[2:, 2:]
        white = (rgb.min(2) > 230) & grey & (corner | edge)
        drop = (edge & grey & (light | rim)) | (a & white)
        if not drop.any():
            break
        out[drop] = 0
    return out


if __name__ == '__main__':
    for cid, box in BOXES.items():
        im = sample(*cut(f'art/concepts/trainers/{cid}.png', box))
        im.save(f'art/trainers/out/{cid}_battle.png')
        print(cid, im.size)
