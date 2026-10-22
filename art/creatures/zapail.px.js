// Zapail (zap + snail) — Spark starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A tiny, nervous snail whose shell is a machine: a geared copper housing (a coil wound inside,
// shown in the colours) with a battery terminal on top that crackles with the static it builds
// by grinding its rim on the ground. Its eyestalks end in two-pronged plugs. Battle pose,
// turned three-quarters to the viewer: startled, head reared up against the housing, plug
// eyestalks splayed at the target. Leaves a charged slime trail (Spark Trail).
//
// Stages: silhouette (zapail_sil). Process and rules: art/BW_STYLE.md; structure follows
// furnaxol.px.js (parts are hand-placed shapes that overlap what they attach to).
// Shapes are drawn in design space (output pixels before scaling); K scales them to starter
// size, anchored on the feet at the bottom centre of the canvas (y = 91). Grid parts are
// placed in output pixels.

pal({ k: "#181018" })

const K = 0.9
const T = (pts) => pts.map((v, i) => (i % 2 ? 91 - (91 - v) * K : 48 + (v - 48) * K))

// gear outline: n square-ish teeth of depth d round a circle of radius r (design space)
function gear(cx, cy, r, d, n, rot = 0) {
  const pts = []
  for (let i = 0; i < n; i++) for (const [f, rr] of [[0, r], [0.1, r + d], [0.4, r + d], [0.5, r]]) {
    const a = 2 * Math.PI * (i + f) / n + rot
    pts.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
  }
  return pts
}

// ---- parts, back to front. {s: polygon} | {ell: [cx, cy, rx, ry]} | {grid: [x, y, rows]} ("#" = in)
const parts = [
  // three-quarter turn: the head is nearest the viewer (lower left), the foot runs back and
  // up to the right, and the shell sits behind the head, its cog face on the near side
  // shell: a machine. A big geared copper housing (cog teeth round the rim) riding on the
  // back, the head overlapping its front edge so there is no gap; a battery-style terminal post on top
  { g: "shell", s: gear(57, 58, 18, 3.5, 11, -Math.PI / 2 + Math.PI / 11) },
  { g: "shell", s: [54, 41, 60, 41, 60, 33, 54, 33] },
  { g: "shell", s: [51, 33, 63, 33, 63, 30, 51, 30] },
  // static: bolts arcing off the terminal and off the back of the housing
  { g: "spark", s: [62, 31, 68, 26, 67, 29, 73, 27, 70, 31, 66, 32, 66, 34, 62, 35] },
  { g: "spark", s: [75, 64, 81, 61, 80, 64, 86, 63, 83, 66, 79, 66, 79, 69, 75, 69] },
  // foot: from the tail tip far back (higher, smaller) along the ground under the shell to
  // the rounded front of the foot, nearest the viewer
  { g: "body", s: [88, 84, 84, 81, 76, 74, 64, 70, 52, 70, 44, 72, 40, 70, 28, 68, 20, 74, 17, 82, 19, 89, 26, 91, 44, 91, 58, 88, 72, 86, 82, 86] },
  // neck and head: reared up, turned toward the viewer, wide enough for two eyes
  { g: "body", s: [22, 82, 20, 72, 22, 64, 30, 63, 40, 66, 44, 74, 42, 84] },
  { g: "head", ell: [31, 57, 12, 9.5] },
  // eyestalks from the top of the head, splayed: the far one (left) thinner, the near one
  // (right) bigger; each plug bulb points two prongs at the target
  { g: "farStalk", s: [24, 50, 21, 42, 19, 36, 22, 35, 25, 42, 28, 49] },
  { g: "farStalk", ell: [20, 33, 3.5, 3.5] },
  { g: "farStalk", s: [13, 30, 17, 30, 17, 32, 13, 32] },
  { g: "farStalk", s: [13, 34, 17, 34, 17, 36, 13, 36] },
  { g: "stalk", s: [34, 49, 37, 41, 39, 34, 43, 35, 41, 42, 39, 50] },
  { g: "stalk", ell: [41, 31, 4.5, 4] },
  { g: "stalk", s: [32, 27, 37, 27, 37, 29, 32, 29] },
  { g: "stalk", s: [32, 32, 37, 32, 37, 34, 32, 34] },
]

function inPoly(pts, x, y) {
  const px = x + 0.5, py = y + 0.5
  let inside = false
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inPart = (p, x, y) => {
  if (p.grid) return (p.grid[2].trim().split("\n")[y - p.grid[1]] || "").trim()[x - p.grid[0]] === "#"
  if (p.ell) {
    const [cx, cy] = T(p.ell.slice(0, 2))
    return ((x + 0.5 - cx) / (p.ell[2] * K)) ** 2 + ((y + 0.5 - cy) / (p.ell[3] * K)) ** 2 <= 1
  }
  return inPoly(T(p.s), x, y)
}

// Stage 1: silhouette
sprite("zapail_sil", { w: 96, h: 96 }, (c) => {
  for (const p of parts) for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (inPart(p, x, y)) c.px(x, y, "k")
})

// Silhouette with each part's contour drawn in, so the three-quarter turn can be judged
// before colour
sprite("zapail_parts", { w: 96, h: 96 }, (c) => {
  const own = new Int16Array(96 * 96).fill(-1)
  parts.forEach((p, i) => { for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (inPart(p, x, y)) own[y * 96 + x] = i })
  const at = (x, y) => (x < 0 || y < 0 || x > 95 || y > 95 ? -1 : own[y * 96 + x])
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
    const i = at(x, y)
    if (i < 0) continue
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const j = at(x + dx, y + dy)
      return j < 0 || (j < i && parts[j].g !== parts[i].g)
    })
    c.px(x, y, edge ? "k" : "#9a94a8")
  }
})
