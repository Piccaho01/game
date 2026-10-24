"""Finds the separate pieces on a ChatGPT sheet (things drawn apart on a white background).

pieces(path) -> bounding boxes (x0, y0, x1, y1) in reading order (rows, then left to right).
cutout(path, box) -> the piece as RGBA, its white background (and enclosed white gaps) clear.
Usage: python3 sheet_cut.py SHEET.png   (prints the boxes, numbered)
"""
import sys
from collections import deque
import numpy as np
from PIL import Image


def pieces(path, step=4, gap=3, min_area=1500, white=232):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    H, W = a.shape[:2]
    small = a[:H - H % step, :W - W % step].reshape(H // step, step, W // step, step, 3).min((1, 3))
    fg = small.sum(2) < 3 * white
    h, w = fg.shape
    # close small gaps so a piece's loose bits (a flower, a fence post) stay with it
    grown = fg.copy()
    for _ in range(gap):
        g = grown.copy()
        g[1:] |= grown[:-1]; g[:-1] |= grown[1:]; g[:, 1:] |= grown[:, :-1]; g[:, :-1] |= grown[:, 1:]
        grown = g
    seen = np.zeros_like(grown)
    boxes = []
    for y in range(h):
        for x in range(w):
            if not grown[y, x] or seen[y, x]: continue
            q = deque([(y, x)]); seen[y, x] = True
            ys, xs = [y], [x]
            while q:
                cy, cx = q.popleft()
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and grown[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx)); ys.append(ny); xs.append(nx)
            b = (min(xs) * step, min(ys) * step, (max(xs) + 1) * step, (max(ys) + 1) * step)
            if (b[2] - b[0]) * (b[3] - b[1]) >= min_area: boxes.append(b)
    # reading order: group into rows by vertical overlap
    boxes.sort(key=lambda b: b[1])
    rows = []
    for b in boxes:
        for r in rows:
            if b[1] < r['y1'] - 20 and b[3] > r['y0'] + 20:
                r['b'].append(b); r['y0'] = min(r['y0'], b[1]); r['y1'] = max(r['y1'], b[3]); break
        else:
            rows.append({'y0': b[1], 'y1': b[3], 'b': [b]})
    return [b for r in rows for b in sorted(r['b'])]


def cutout(path, box, white=238, hole=60):
    """The piece's pixels with the white background made clear: near-white connected to the box
    edge, plus enclosed near-white patches bigger than `hole` pixels (gaps between fence rails,
    sky through branches); small ones (daisies) stay."""
    im = (path if isinstance(path, Image.Image) else Image.open(path)).convert('RGB').crop(box)
    a = np.asarray(im).astype(int)
    light = a.min(2) > white
    h, w = light.shape
    bg = np.zeros_like(light)
    seen = np.zeros_like(light)
    for y0 in range(h):
        for x0 in range(w):
            if not light[y0, x0] or seen[y0, x0]: continue
            stack, comp, edge = [(y0, x0)], [], False
            seen[y0, x0] = True
            while stack:
                y, x = stack.pop(); comp.append((y, x))
                if y in (0, h - 1) or x in (0, w - 1): edge = True
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; stack.append((ny, nx))
            if edge or len(comp) > hole:
                ys, xs = zip(*comp); bg[list(ys), list(xs)] = True
    # the light fringe round the edge (anti-aliasing into the white) goes too
    pale = a.min(2) > 190
    for _ in range(3):
        near = np.zeros_like(bg)
        near[1:] |= bg[:-1]; near[:-1] |= bg[1:]; near[:, 1:] |= bg[:, :-1]; near[:, :-1] |= bg[:, 1:]
        bg |= near & pale
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    return np.dstack([a.astype(np.uint8), alpha])


if __name__ == '__main__':
    for i, b in enumerate(pieces(sys.argv[1])):
        print(i, b, b[2] - b[0], b[3] - b[1])
