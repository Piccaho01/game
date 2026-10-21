// Kilnlotl — Fire starter. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A glassblower's axolotl from Emberwick: three flame gills per side, a fired-glass belly
// window over its ember core, a finned paddle tail. Battle pose: lunging forward, blowing a
// molten glass bubble from its pursed lips and cradling it in its far hand, tail raised as
// a counterweight.
//
// Stage 1: silhouette (kilnlotl_sil). Stage 2: flat colours (kilnlotl_flats). Stage 3:
// shading (kilnlotl). Process and rules:
// art/BW_STYLE.md. Every part is a hand-placed polygon in design space, overlapping the part
// it attaches to so nothing floats; T scales design space down to starter size.

pal({
  k: "#181018",                                       // outline
  D: "#6e2230", S: "#b04a58", s: "#ec8a78", L: "#ffc2a8", // skin: line, shadow, base, light
  c: "#f9dcbc", C: "#d89c88",                         // cream throat/belly: base, shadow
  R: "#d8341c", o: "#f88a1c", y: "#ffd23c", Y: "#fff6b8", // fire / molten glass
  w: "#ffffff", m: "#6a1e2c",                         // highlight, mouth
})

// Design space is drawn large; T scales it to starter size (~50 px tall, about 2/3 of a
// final stage like Infernape), anchored on the feet at the bottom centre of the canvas.
const K = 0.58
const T = (pts) => pts.map((v, i) => Math.round((i % 2 ? 91 - (91 - v) * K : 48 + (v - 46) * K) * 2) / 2)

// ---- design-space shapes
const HEAD = [
  // top, back of head, jaw line, chin, lips pursed forward to blow, snout, forehead
  30, 22, 36, 19, 44, 18, 52, 20, 58, 24, 62, 30, 64, 38, 62, 45, 56, 50, 46, 52, 37, 52,
  32, 50, 26, 49, 21, 47, 18, 46, 15, 44, 17, 41, 17, 38, 16, 34, 20, 28, 26, 24,
]
const TORSO_TAIL = [
  // neck under the jaw, back, rump
  38, 46, 52, 46, 57, 49, 59, 54, 62, 60, 64, 63,
  // tail: up and back to the raised paddle tip, then its underside back to the rump
  70, 59, 78, 53, 84, 46, 88, 38, 92, 37, 94, 44, 92, 52, 87, 60, 80, 66, 70, 69,
  // hips (the legs overlap this edge), belly, chest
  68, 74, 60, 77, 50, 77, 40, 74, 36, 67, 37, 62, 37, 50,
]
const THROAT = [15, 44, 21, 47, 26, 49, 32, 50, 37, 52, 46, 52, 50, 50, 40, 47, 28, 45, 17, 42]
const BELLY = [38, 50, 48, 50, 52, 56, 54, 66, 50, 77, 40, 74, 36, 67, 37, 56]
const FAR_GILLS = [[26, 30, 18, 18, 22, 22, 20, 12, 27, 20, 30, 26], [24, 33, 12, 26, 18, 25, 26, 29]]
const NEAR_GILLS = [
  [48, 26, 52, 18, 54, 10, 58, 14, 60, 3, 64, 12, 69, 6, 67, 19, 60, 30, 52, 30],
  [56, 30, 64, 25, 70, 19, 73, 23, 81, 14, 80, 24, 89, 22, 80, 32, 68, 37, 58, 38],
  [58, 36, 68, 37, 78, 35, 77, 39, 87, 41, 78, 45, 82, 50, 70, 46, 60, 44],
]
// legs, starter-style in a wide stance: round thigh at the hip, short straight shin, flat
// foot with the toes forward. Near leg steps forward-left, far leg braces back-right.
const FAR_LEG = [
  { e: [62, 72, 7, 6.5] },                                    // thigh (mostly behind the hip)
  { p: [61, 75, 69, 75, 72, 86, 64, 86] },                    // shin, angled back
  { p: [59, 91, 60, 88, 65, 86, 73, 86, 76, 89, 76, 91] },    // foot
]
const NEAR_LEG = [
  { p: [36, 79, 45, 79, 44, 87, 35, 87] },                    // shin
  { e: [44, 76, 8.5, 7] },                                    // thigh, over the top of the shin
  { p: [25, 91, 26, 88, 31, 86, 44, 86, 46, 89, 46, 91] },    // foot
]
// far arm from the shoulder, forward and down to a hand cupped under the bubble
const ARM = [38, 61, 30, 63, 22, 64, 14, 66, 8, 66, 3, 63, 1, 58, 4, 58, 7, 62, 12, 62, 18, 59, 26, 56, 33, 54, 38, 54]

// a leg piece is a polygon {p} or an ellipse {e: [cx, cy, rx, ry]} in design space
const shape = (q) => (q.p ? { s: T(q.p) } : { ell: [...T(q.e.slice(0, 2)), q.e[2] * K, q.e[3] * K] })

// ---- parts back to front. Parts in different groups get a contour where they overlap.
// Shading (stage 3), all in output pixels, one light from the upper left:
//   sh: [dx, dy]  shadow crescent: pixels whose (x+dx, y+dy) falls outside the part
//   rim: [dx, dy] a second, darker crescent hugging the bottom-right edge (glass)
//   hl: shape     highlight shape on the lit plane (design space), or
//   top: n        lit top edge, n px deep (flame tips, top of the far arm)
//   core: shape   hot core (glass), glint: [x, y] white specular pixels (design space)
//   cast: true    the part casts a shadow down-right onto the parts behind it
const parts = [
  ...FAR_GILLS.map((p) => ({ g: "farGill", s: T(p), c: "R" })),
  ...FAR_LEG.map((q) => ({ g: "farLeg", ...shape(q), c: "S", sh: [1, 1] })),
  { g: "torso", s: T(TORSO_TAIL), c: "s", tone: [[T(BELLY), "c"]], sh: [2, 2],
    hl: { s: T([66, 60, 76, 54, 84, 46, 87, 41, 84, 51, 76, 59, 68, 64]) } },
  { g: "window", circle: [T([46, 65]), 6 * K], c: "o", rim: [1, 1],
    core: { circle: [T([45, 64]), 3.6 * K] }, glint: [[43, 62]] },
  ...NEAR_LEG.map((q) => ({ g: "nearLeg", ...shape(q), c: "s", sh: [2, 1], cast: true })),
  { g: "head", s: T(HEAD), c: "s", tone: [[T(THROAT), "c"]], sh: [2, 2], cast: true,
    hl: { s: T([22, 27, 27, 23, 34, 21, 40, 21, 35, 23, 29, 26, 25, 30]) } },
  ...NEAR_GILLS.map((p, i) => ({ g: "gill" + i, s: T(p), c: "o", sh: [1, 1], top: 2, cast: true })),
  { g: "arm", s: T(ARM), c: "S", sh: [1, 1], top: 1, cast: true },
  { g: "glass", s: T([17, 41, 15, 47, 11, 48, 12, 42]), c: "y" },
  { g: "glass", circle: [T([7, 53]), 11 * K], c: "y", sh: [3, 3], rim: [1, 1],
    core: { circle: [T([4, 50]), 5 * K] }, glint: [[1, 47], [2, 46]] },
]
const SHADOW = { s: "S", c: "C", S: "D", o: "R", y: "o", R: "D", L: "s", Y: "y" }
const LIGHT = { s: "L", S: "s", o: "y", y: "Y", c: "c", R: "o" }

function inPoly(pts, x, y) {
  const px = x + 0.5, py = y + 0.5
  let inside = false
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inPart = (p, x, y) => p.circle
  ? (x + 0.5 - p.circle[0][0]) ** 2 + (y + 0.5 - p.circle[0][1]) ** 2 <= p.circle[1] ** 2
  : p.ell ? ((x + 0.5 - p.ell[0]) / p.ell[2]) ** 2 + ((y + 0.5 - p.ell[1]) / p.ell[3]) ** 2 <= 1
  : inPoly(p.s, x, y)

function render(c, { lines, shading }) {
  const N = 96, own = new Int16Array(N * N).fill(-1), col = new Array(N * N).fill(null)
  parts.forEach((p, i) => {
    const inP = (x, y) => inPart(p, x, y)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!inP(x, y)) continue
      let k = p.c
      for (const [t, tc] of p.tone || []) if (inPoly(t, x, y)) k = tc
      if (shading) {
        const base = k
        if (p.hl && inPart(p.hl, x, y)) k = LIGHT[base] || base
        if (p.top && !inP(x, y - p.top)) k = LIGHT[base] || base
        if (p.core && inPart(p.core, x, y)) k = LIGHT[base] || base
        let dark = p.sh && !inP(x + p.sh[0], y + p.sh[1])
        for (let j = i + 1; j < parts.length && !dark; j++)
          if (parts[j].cast && parts[j].g !== p.g && inPart(parts[j], x - 1, y - 2)) dark = true
        if (dark) k = SHADOW[base] || base
        if (p.rim && !inP(x + p.rim[0], y + p.rim[1])) k = SHADOW[SHADOW[base]] || k
      }
      own[y * N + x] = i; col[y * N + x] = k
    }
  })
  const out = col.slice(), at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : own[y * N + x])
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = own[y * N + x]
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = at(x + dx, y + dy)
      if (i < 0 && j >= 0) { out[y * N + x] = "k"; break }                    // outer outline
      if (lines && i >= 0 && j >= 0 && j < i && parts[j].g !== parts[i].g) { out[y * N + x] = "k"; break }
    }
  }
  if (shading) for (const p of parts) for (const g of p.glint || []) {
    const [x, y] = T(g).map(Math.floor)
    if (out[y * N + x] && out[y * N + x] !== "k") out[y * N + x] = "w"
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (out[y * N + x]) c.px(x, y, out[y * N + x])
}

// Stage 1: silhouette
sprite("kilnlotl_sil", { w: 96, h: 96 }, (c) => {
  parts.forEach((p) => {
    for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (inPart(p, x, y)) c.px(x, y, "k")
  })
})

// Stage 2: flat colours, one base per material, contours where parts overlap
sprite("kilnlotl_flats", { w: 96, h: 96 }, (c) => render(c, { lines: true }))

// Stage 3: shading
sprite("kilnlotl", { w: 96, h: 96 }, (c) => render(c, { lines: true, shading: true }))
