// Kindlet — Fire. Pipeline test creature (CLAUDE.md §4): 64x64, 15 colours + transparent,
// 3/4 view facing screen-left like a BW2 front battle sprite. Starter proportions.
//
// Built the way BW sprites are: rounded masses with BW cel shading (a shadow crescent on the
// lower right, a highlight on the upper left, 2-3 flat tones per material, no dithering),
// a black contour wherever a part overlaps one behind it, far-side limbs in the shadow tone.
// Face, paws and fur detail are hand-placed pixels on top.
//
// Fire face style: big upturned eyes with a thick lid that flicks up at the outer corner,
// amber iris, white glint; a cheeky single fang over the lower lip.

pal({
  k: "#101010",                                       // outline
  D: "#7c2420", d: "#d04a2c", r: "#f58a48",           // hide: shadow, base, light
  b: "#c28a58", c: "#f0cf98", C: "#fff6dc",           // cream fur
  g: "#2e2834", G: "#5c5466", H: "#9a90a2",           // charcoal (ear tips, paws)
  f: "#f0681c", y: "#ffcf38", Y: "#fff8c4",           // flame / iris
  w: "#ffffff", m: "#58142a",                         // glint & fang, mouth
})

const W = 62, H = 62                 // outline adds 1px each side -> 64x64

// ---- shapes: (x, y) => boolean, sampled at pixel centres
const E = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1
const P = (pts) => (x, y) => {
  const px = x + 0.5, py = y + 0.5
  let inside = false
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const U = (...ss) => (x, y) => ss.some((s) => s(x, y))
const I = (a, b) => (x, y) => a(x, y) && b(x, y)

// ---- parts, back to front
// s: silhouette, c: base, sh: [colour, dx, dy] shadow crescent (pixels whose (x+dx, y+dy)
// falls outside the silhouette), hl: [colour, shape] highlight, tone: [[shape, colour]] extra
// flats. Parts sharing g join without a contour line.
const HIDE = { c: "d", sh: ["D", 3, 3] }
const parts = [
  // tail: big brush curling up behind, flame on the tip
  { g: "tail", s: U(E(52, 38, 6, 5.5), E(56, 30, 5.5, 6.5), E(56, 21, 5, 5.5)), ...HIDE, sh: ["D", 3, 1],
    hl: ["r", U(E(51, 34, 2, 2.5), E(54, 24, 1.5, 3))] },
  { g: "flame", s: P([50, 21, 49, 13, 51, 8, 53, 11, 54, 3, 57, 9, 59, 0, 60, 7, 62, 5, 61, 12, 62, 16, 61, 21]), c: "f",
    tone: [[P([52, 21, 52, 15, 54, 10, 55, 13, 57, 6, 58, 12, 60, 10, 60, 21]), "y"],
           [P([54, 21, 54, 16, 56, 13, 57, 16, 58, 21]), "Y"]] },

  // far legs (shadow tone)
  { g: "farHind", s: E(38, 56.5, 3.6, 2.6), c: "g" },
  { g: "farFront", s: P([25, 41, 31, 41, 31, 54, 25, 54]), c: "D", tone: [[P([25, 41, 27, 41, 27, 52, 25, 52]), "d"]] },
  { g: "farFront", s: E(27.5, 56, 4.4, 2.8), c: "g", hl: ["G", E(26, 55, 1.6, 1)] },

  // body, compact, behind the head
  { g: "body", s: E(40, 42, 11, 9), ...HIDE, hl: ["r", E(41, 35.5, 5, 1.8)], tone: [[E(31, 38, 6, 8), "D"]] },
  // near hind leg: round haunch, short foot under it
  { g: "hind", s: U(E(46, 44, 7, 7.5), P([40, 49, 47, 49, 48, 55, 40, 55])), ...HIDE, hl: ["r", E(44, 40, 3, 2.5)] },
  { g: "hindPaw", s: E(42, 56.2, 5.4, 2.8), c: "G", sh: ["g", 1, 1], hl: ["H", E(40, 55, 2, 1)] },

  // chest ruff, jagged lower edge
  { g: "chest", s: I(E(24, 37, 9, 7), P([14, 30, 34, 30, 34, 40, 31, 42, 29, 40, 27, 44, 25, 41, 22, 44, 20, 41, 17, 42, 14, 38])),
    c: "c", sh: ["b", 2, 2], hl: ["C", E(20, 34, 3, 2)] },

  // near front leg, stepping forward
  { g: "arm", s: P([18, 39, 26, 39, 24, 45, 19, 49, 15, 48, 16, 43]), ...HIDE, sh: ["D", 2, 2], hl: ["r", P([18, 40, 21, 40, 18, 44, 17, 44])] },
  { g: "armPaw", s: E(14.5, 49, 4, 3.2), c: "G", sh: ["g", 1, 1], hl: ["H", E(13, 47.5, 2, 1)] },

  // ears: far (shadow tone), near
  { g: "farEar", s: P([10, 18, 8, 3, 21, 12]), c: "D",
    tone: [[P([11, 15, 10, 7, 16, 12]), "b"], [P([7, 1, 11, 1, 11, 7, 8, 7]), "g"]] },
  { g: "ear", s: P([25, 14, 32, 1, 38, 15]), ...HIDE, sh: ["D", 1, 0],
    tone: [[P([28, 13, 32, 5, 35, 13]), "c"], [P([31, 12, 32, 6, 35, 13]), "b"], [P([29, -1, 36, -1, 35, 6, 30, 6]), "G"]] },

  // head: big and round
  { g: "head", s: E(23, 23, 13, 11), ...HIDE, hl: ["r", U(E(17, 15, 5, 2), E(13, 18, 2, 3))],
    tone: [[P([17, 13, 19, 9, 21, 13]), "d"]] },
  // forehead tuft
  { g: "head", s: P([16, 14, 18, 8, 21, 12, 23, 6, 25, 13, 27, 9, 28, 15]), c: "d", hl: ["r", P([17, 13, 18, 9, 20, 12, 22, 8, 23, 12])] },
  // cheek fluff, both sides
  { g: "head", s: P([30, 26, 37, 24, 34, 28, 39, 30, 33, 32, 34, 34, 28, 32]), c: "c", sh: ["b", 1, 2] },
  { g: "head", s: P([12, 27, 7, 27, 10, 30, 6, 32, 13, 32]), c: "c", sh: ["b", 1, 1] },
  // muzzle, short
  { g: "head", s: E(14, 27.5, 6.5, 4.5), c: "c", sh: ["b", 2, 2], hl: ["C", E(12, 25.5, 3, 1.2)] },
]

sprite("kindlet", { w: W, h: H, outline: "k" }, (c) => {
  const own = new Int16Array(W * H).fill(-1)
  const col = new Array(W * H).fill(null)
  parts.forEach((p, i) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!p.s(x, y)) continue
      let k = p.c
      if (p.hl && p.hl[1](x, y)) k = p.hl[0]
      for (const [s, t] of p.tone || []) if (s(x, y)) k = t
      if (p.sh && !p.s(x + p.sh[1], y + p.sh[2])) k = p.sh[0]
      own[y * W + x] = i; col[y * W + x] = k
    }
  })
  // contour on a part's edge wherever it overlaps a part behind it
  const out = col.slice()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = own[y * W + x]
    if (i < 0 || parts[i].g === "flame") continue
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
      const j = own[yy * W + xx]
      if (j >= 0 && j < i && parts[j].g !== parts[i].g && parts[j].g !== "flame") {
        out[y * W + x] = parts[i].c === "d" && parts[j].c === "d" ? "D" : "k"; break
      }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (out[y * W + x]) c.px(x, y, out[y * W + x])
},
  // ---- face ----
  // near eye: big, thick lid flicking up at the outer corner, amber iris, glint
  grid(24, 16, `
    ......kk
    .kkkkkk.
    kkkkkkk.
    kwwyyyk.
    kwkkyyk.
    kykkyyk.
    kyyyffk.
    .kfffk..
    ..kkk...`),
  // far eye, foreshortened
  grid(15, 17, `
    .kk.
    kkkk
    kwyk
    kkyk
    kyfk
    kffk
    .kk.`),
  // nose
  grid(7, 24, `
    .kk
    kkH
    .kk`),
  // smile, one triangular fang over the lower lip
  grid(9, 27, `
    k.......
    .kk...k.
    ...kkkkk
    ....kwwk
    .....kwk
    ......k.`),
  // fur lines on the ruff
  vline(22, 37, 3, "b"), vline(26, 36, 3, "b"), vline(18, 36, 2, "b"),
  // toes and claws
  hline(11, 49, 3, "g"), px(11, 51, "C"), px(13, 52, "C"),
  vline(39, 55, 3, "k"), vline(42, 55, 3, "k"), px(37, 58, "C"), px(40, 58, "C"),
  vline(26, 55, 3, "k"), vline(29, 55, 3, "k"),
)
