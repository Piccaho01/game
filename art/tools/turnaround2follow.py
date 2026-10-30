"""Cuts the starters' follower frames out of the owner's turnaround sheet
(art/concepts/followers/starters_turnaround.png: 4 rows (furnaxol, sprigby, zapail, gobbin) by 8
angles) and samples each back to its pixel grid.

    python3 art/tools/turnaround2follow.py
    python3 art/tools/turnaround2follow.py art/concepts/followers/<line>_line_turnaround.png stage1 stage2 ...
      (a per-line sheet, every stage: one row each)
writes art/followers/out/<species>_follow.png: one row of 8 frames, FRAME x FRAME, feet at the bottom.
"""
import sys
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


def bands(ink, axis, min_gap):
    """Runs of ink along one axis (rows of frames, or frames in a row), split at gaps of min_gap+."""
    prof = ink.any(axis=axis)
    out, start, gap = [], None, 0
    for k, v in enumerate(prof):
        if v:
            if start is None: start = k
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                out.append((start, k - gap + 1)); start = None
    if start is not None: out.append((start, len(prof)))
    return out


def line_sheet(path, names):
    """A per-line sheet (art/prompts/followers.md): one row per stage, 8 views each, any spacing.
    One scale for the whole sheet (its tallest frame fills FRAME), so the stages keep their sizes."""
    global SCALE
    sheet = np.asarray(Image.open(path).convert('RGB')).astype(int)
    ink = sheet.min(2) < 225
    rows = [r for r in bands(ink, 1, 12) if r[1] - r[0] > 20]
    assert len(rows) == len(names), f'{path}: {len(rows)} rows for {names}'
    cells = []
    for y0, y1 in rows:
        cols = [c for c in bands(ink[y0:y1], 0, 8) if c[1] - c[0] > 10]
        # merge loose bits (sparks, smoke) into the nearest frame until there are 8
        while len(cols) > COLS:
            k = min(range(len(cols) - 1), key=lambda j: cols[j + 1][0] - cols[j][1])
            cols[k:k + 2] = [(cols[k][0], cols[k + 1][1])]
        assert len(cols) == COLS, f'{path}: row has {len(cols)} frames'
        cells.append([(y0, y1, x0, x1) for x0, x1 in cols])
    tallest = max(y1 - y0 for row in cells for y0, y1, _, _ in row)
    widest = max(x1 - x0 for row in cells for _, _, x0, x1 in row)
    SCALE = max(tallest / (FRAME - 1), widest / (FRAME - 1))
    for sp, row in zip(names, cells):
        strip = Image.new('RGBA', (FRAME * COLS, FRAME), (0, 0, 0, 0))
        for c, (y0, y1, x0, x1) in enumerate(row):
            pad = 6
            cell = sheet[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad].astype(np.uint8)
            im = despeck(sample(*figure(cell)))
            if im.width > FRAME or im.height > FRAME:
                im.thumbnail((FRAME, FRAME), Image.NEAREST)
            strip.alpha_composite(im, (c * FRAME + (FRAME - im.width) // 2, FRAME - im.height))
        strip.save(f'art/followers/out/{sp}_follow.png')
        print(sp, 'ok', f'scale {SCALE:.1f}')


if __name__ == '__main__':
    import os
    os.makedirs('art/followers/out', exist_ok=True)
    if len(sys.argv) > 2:   # python3 art/tools/turnaround2follow.py SHEET stage1 stage2 ...
        line_sheet(sys.argv[1], sys.argv[2:])
        raise SystemExit
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
