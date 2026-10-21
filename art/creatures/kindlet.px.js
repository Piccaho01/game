// Kindlet — Fire. Pipeline test creature (CLAUDE.md §4): 64x64, 15 colours + transparent,
// 3/4 view facing screen-left like a BW2 front battle sprite.
//
// Body masses are shaded volumes (ellipsoids / tapered tubes) lit from the upper left and
// quantised to 3 cel tones, BW2-style: no dithering, dark separation lines where a part
// overlaps another, black outer outline. The face is hand-placed pixels on top.
//
// Fire face style: sharp upturned almond eyes with a heavy top lid, amber iris, one hard
// highlight; small grin with a single fang.

pal({
  k: "#24121a", // outline
  D: "#7a2420", d: "#c2402a", r: "#ee7438",           // hide: dark, mid, light
  b: "#b5734a", c: "#efc58a", C: "#fff0c8",           // cream belly / muzzle
  g: "#3e3036", G: "#6e5a5c",                         // charcoal plates
  f: "#f08a1c", y: "#ffd23c", Y: "#fff7b0",           // flame
  e: "#d8800c", w: "#ffffff", m: "#5c1426",           // iris, highlight, mouth
})
ramps("kDdr", "kbcC", "kgG", "fyY")

const W = 62, H = 62                // outline adds 1px each side -> 64x64
const L = norm([-0.55, -0.65, 0.55]) // light from upper-left-front

function norm(v) { const l = Math.hypot(...v); return v.map((a) => a / l) }

// Tone ramps per material: [dark, mid, light]
const HIDE = ["D", "d", "r"], CREAM = ["b", "c", "C"], ROCK = ["g", "G", "G"]

function tone(ramp, n, bias = 0) {
  const v = n[0] * L[0] + n[1] * L[1] + n[2] * L[2] + bias
  return v < 0.05 ? ramp[0] : v < 0.72 ? ramp[1] : ramp[2]
}

// Shapes return a normal at (x, y) or null when outside.
function ell(cx, cy, rx, ry) {
  return (x, y) => {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, q = u * u + v * v
    return q > 1 ? null : norm([u, v, Math.sqrt(1 - q) * 1.2])
  }
}
// Tapered tube through points [[x, y, r], ...]
function tube(pts) {
  return (x, y) => {
    let best = null
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay, ar] = pts[i], [bx, by, br] = pts[i + 1]
      const dx = bx - ax, dy = by - ay, px = x + 0.5 - ax, py = y + 0.5 - ay
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)))
      const r = ar + (br - ar) * t, ox = px - dx * t, oy = py - dy * t, d = Math.hypot(ox, oy)
      if (d <= r && (!best || d / r < best.q)) best = { q: d / r, ox: ox / r, oy: oy / r }
    }
    if (!best) return null
    return norm([best.ox, best.oy, Math.sqrt(Math.max(0, 1 - best.q * best.q)) * 1.2])
  }
}
// Flat-ish polygon with a fixed normal (ears, plates)
function polyShape(pts, n) {
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5
    let inside = false
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside ? norm(n) : null
  }
}

// Parts back to front. g: parts sharing a group blend without separation lines. mat: ramp, or (x, y) => ramp. sep: draw separation line against parts behind.
const parts = [
  // tail: thick brush from the rump sweeping up behind the body, torch flame on the tip
  { g: "tail", s: tube([[46, 42, 5.5], [53, 37, 5], [56, 29, 4.6], [54, 22, 4.2]]), mat: HIDE },
  { s: polyShape([47, 22, 46, 15, 48, 10, 49, 13, 51, 5, 53, 9, 55, 0, 57, 8, 61, 4, 60, 12, 62, 16, 60, 22],
      [0, 0, 1]), mat: ["f", "f", "f"], flame: true },
  { s: polyShape([49, 22, 49, 16, 51, 11, 52, 14, 54, 6, 56, 13, 58, 9, 58, 16, 59, 22], [0, 0, 1]),
    mat: ["y", "y", "y"], flame: true },
  { s: polyShape([51, 22, 51, 18, 53, 14, 54, 17, 55, 11, 56, 17, 57, 22], [0, 0, 1]),
    mat: ["Y", "Y", "Y"], flame: true },
  // far legs (darker by bias)
  { g: "farL", s: tube([[29, 46, 4], [28, 52, 3.2], [27, 57, 3]]), mat: HIDE, bias: -0.4 },
  { g: "farR", s: tube([[48, 46, 4.5], [50, 52, 3.2], [50, 57, 3]]), mat: HIDE, bias: -0.4 },
  // torso: chest forward-left, rump back-right
  { g: "body", s: ell(36, 43, 13, 9), mat: (x, y) => (y > 41 + (x - 22) * 0.35 && x < 36 ? CREAM : HIDE) },
  { g: "body", s: ell(46, 41, 8, 7.5), mat: HIDE },                 // haunch
  // charcoal back plates
  { g: "body", s: polyShape([31, 35, 35, 29.5, 39, 34.5], [-0.3, -0.8, 0.6]), mat: ROCK },
  { g: "body", s: polyShape([38.5, 34, 43, 28, 47, 33.5], [-0.3, -0.8, 0.6]), mat: ROCK },
  { g: "body", s: polyShape([46.5, 34, 51, 30, 53.5, 36], [0.2, -0.8, 0.6]), mat: ROCK },
  // near hind leg
  { g: "hind", s: tube([[47, 45, 4.6], [44, 52, 3.4], [44, 56, 3.2]]), mat: HIDE, bias: -0.12 },
  { g: "hind", s: ell(42, 57.5, 4.2, 2.4), mat: CREAM },            // hind paw
  // planted front leg
  { g: "front", s: tube([[33, 47, 3.8], [34, 53, 3.1], [33, 56, 3.1]]), mat: HIDE, bias: -0.12 },
  { g: "front", s: ell(32, 57.6, 4.2, 2.4), mat: CREAM },
  // near front leg, raised and bent (dynamic pose)
  { g: "raised", s: tube([[25, 45, 4.4], [20, 50, 3.4], [16, 48, 3.1]]), mat: HIDE, bias: -0.12 },
  { g: "raised", s: ell(13.5, 47, 3.8, 3.2), mat: CREAM },            // raised paw
  // neck ruff
  { g: "head", s: ell(25, 35, 7.5, 6.5), mat: CREAM },
  // far ear (charcoal tip)
  { g: "farEar", s: tube([[27, 17, 4.6], [32, 10, 3.2], [36, 5, 0.8]]), mat: (x, y) => (y < 9 ? ROCK : HIDE), bias: -0.25 },
  // head: round, cute proportions
  { g: "head", s: ell(20, 25, 12, 10.5), mat: HIDE },
  // short muzzle
  { g: "head", s: ell(10.5, 29.5, 6, 4.4), mat: CREAM },
  // flame-shaped cheek tufts
  { g: "head", s: polyShape([22, 30, 33, 29, 29, 33, 31, 35.5, 24, 34], [0.1, 0.3, 0.9]), mat: CREAM },
  // near ear: broad, swept back, charcoal tip
  { g: "ear", s: tube([[16, 18, 5.4], [18, 10, 3.6], [21, 3, 0.8]]), mat: (x, y) => (y < 8 ? ROCK : HIDE) },
  { g: "ear", s: tube([[17.5, 15, 1.5], [19, 10, 0.9]]), mat: ["D", "D", "D"] }, // inner ear
]

sprite("kindlet", { w: W, h: H, outline: "k" }, (c) => {
  const own = new Int16Array(W * H).fill(-1)
  const col = new Array(W * H).fill(null)
  parts.forEach((p, i) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = p.s(x, y)
      if (!n) continue
      const ramp = typeof p.mat === "function" ? p.mat(x, y) : p.mat
      const k = tone(ramp, n, p.bias || 0)
      own[y * W + x] = i; col[y * W + x] = k
    }
  })
  // separation lines: a pixel of a back part touching a front part gets that part's dark tone
  const darkOf = (k) => ({ d: "D", r: "d", D: "k", c: "b", C: "c", b: "D", G: "g", g: "k" })[k] || k
  const out = col.slice()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = own[y * W + x]
    if (i < 0 || parts[i].flame) continue
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
      const j = own[yy * W + xx]
      if (j > i && parts[j].g !== parts[i].g && !parts[j].flame) { out[y * W + x] = darkOf(col[y * W + x]); break }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (out[y * W + x]) c.px(x, y, out[y * W + x])
},
  // ---- face (hand-placed) ----
  // near eye: upturned almond, heavy top lid, amber iris, one hard highlight
  grid(16, 20, `
    ......kk
    .kkkkkkk
    kkeewwkk
    keeyywk.
    keyYyek.
    .kkeekk.
    ...kk...`),
  // far eye: foreshortened, tucked behind the brow ridge
  grid(8, 21, `
    ..kk
    kkkk
    kewk
    keyk
    .kk.`),
  px(30, 58, "b"), px(34, 58, "b"), px(41, 58, "b"), px(44, 58, "b"), // toes
  px(12, 45, "b"), px(11, 47, "b"),
  grid(4, 27, "kk\nkk"), px(5, 26, "g"),             // nose
  // grin with one fang
  grid(6, 31, `
    kk......
    .kmmmmkk
    ..kwkkk.`),
)
