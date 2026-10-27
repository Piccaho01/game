"""Cuts the starters' follower frames out of the owner's turnaround sheet
(art/concepts/followers/starters_turnaround.png: 4 rows (furnaxol, sprigby, zapail, gobbin) by 8
angles) and samples each back to its pixel grid.

    python3 art/tools/turnaround2follow.py
writes art/followers/out/<species>_follow.png: one row of 8 frames, FRAME x FRAME, feet at the bottom.
"""
from collections import deque
import numpy as np
from PIL import Image

SHEET = 'art/concepts/followers/starters_turnaround.png'
ROWS = ['furnaxol', 'sprigby', 'zapail', 'gobbin']
COLS = 8
# Source pixels per art pixel (the drafts' pixel size).
SCALE = 6.0
FRAME = 32
# Species with no white of their own: white enclosed by the figure (between Zapail's eyestalks) is background too.
NO_WHITE = {'zapail'}


def figure(cell, all_white=False):
    a = cell.astype(int)
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
    if all_white:
        bg |= a.min(2) > 235
    return a, bg


def despeck(im, min_size=7):
    """Drops loose clusters of fewer than min_size pixels (bits of the next frame, noise)."""
    a = np.asarray(im).copy()
    on = a[:, :, 3] > 0
    seen = np.zeros(on.shape, bool)
    h, w = on.shape
    for sy, sx in zip(*np.where(on)):
        if seen[sy, sx]:
            continue
        comp, q = [], deque([(sy, sx)])
        seen[sy, sx] = True
        while q:
            y, x = q.popleft()
            comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and on[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        if len(comp) < min_size:
            for y, x in comp:
                a[y, x, 3] = 0
    return Image.fromarray(a, 'RGBA')


def sample(a, bg):
    ys, xs = np.where(~bg)
    a, bg = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], bg[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = bg.shape
    H, W = max(1, round(h / SCALE)), max(1, round(w / SCALE))
    out = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        y0 = int((y + 0.2) * h / H); y1 = max(y0 + 1, int((y + 0.8) * h / H))
        for x in range(W):
            x0 = int((x + 0.2) * w / W); x1 = max(x0 + 1, int((x + 0.8) * w / W))
            m = ~bg[y0:y1, x0:x1]
            if m.mean() < 0.5:
                continue
            out[y, x, :3] = np.median(a[y0:y1, x0:x1][m], axis=0)
            out[y, x, 3] = 255
    return Image.fromarray(out, 'RGBA')


if __name__ == '__main__':
    import os
    os.makedirs('art/followers/out', exist_ok=True)
    sheet = np.asarray(Image.open(SHEET).convert('RGB'))
    ch, cw = sheet.shape[0] // len(ROWS), sheet.shape[1] // COLS
    for r, sp in enumerate(ROWS):
        strip = Image.new('RGBA', (FRAME * COLS, FRAME), (0, 0, 0, 0))
        for c in range(COLS):
            im = despeck(sample(*figure(sheet[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw], sp in NO_WHITE)))
            if im.width > FRAME or im.height > FRAME:
                im.thumbnail((FRAME, FRAME), Image.NEAREST)
            strip.alpha_composite(im, (c * FRAME + (FRAME - im.width) // 2, FRAME - im.height))
        strip.save(f'art/followers/out/{sp}_follow.png')
        print(sp, 'ok')
