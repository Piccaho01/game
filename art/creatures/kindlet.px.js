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
// flat > 1 flattens the volume toward the viewer (faces: mostly mid tone, thin shadow rim)
function ell(cx, cy, rx, ry, flat = 1.2) {
  return (x, y) => {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, q = u * u + v * v
    return q > 1 ? null : norm([u, v, Math.sqrt(1 - q) * flat])
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
// shape limited to inside a polygon (jagged fur edges keep the volume's shading)
function within(shape, pts) {
  const inside = polyShape(pts, [0, 0, 1])
  return (x, y) => (inside(x, y) ? shape(x, y) : null)
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

// Parts back to front. g: parts sharing a group blend without separation lines.
// mat: ramp, or (x, y) => ramp. bias darkens parts on the far side of the body.
//
// Anatomy (3/4 front, facing screen-left): big head over the chest, chest and front legs
// nearest the viewer, the torso receding up-right behind them, hind legs at the back with
// the hock bent backwards, tail rising from the rump.
const tipped = (y0) => (x, y) => (y < y0 ? ROCK : HIDE)
const parts = [
  // tail rising from the rump, torch flame on the tip
  { g: "tail", s: tube([[47, 37, 4], [53, 33, 4.6], [56, 26, 4.4], [55, 19, 3.8]]), mat: HIDE },
  { g: "flame", s: polyShape([48, 20, 47, 14, 49, 9, 50, 12, 52, 4, 54, 8, 56, 0, 57, 7, 61, 3, 60, 11, 62, 15, 61, 20],
      [0, 0, 1]), mat: ["f", "f", "f"], flame: true },
  { g: "flame", s: polyShape([50, 20, 50, 15, 52, 10, 53, 13, 55, 5, 57, 12, 59, 8, 59, 15, 60, 20], [0, 0, 1]),
    mat: ["y", "y", "y"], flame: true },
  { g: "flame", s: polyShape([52, 20, 52, 16, 54, 13, 55, 16, 56, 10, 57, 16, 58, 20], [0, 0, 1]),
    mat: ["Y", "Y", "Y"], flame: true },
  // far hind leg
  { g: "farH", s: tube([[40, 44, 3.6], [41, 51, 2.6], [40, 55, 2.6]]), mat: HIDE, bias: -0.4 },
  { g: "farH", s: ell(39.5, 56.5, 3.4, 2), mat: CREAM, bias: -0.3 },
  // torso receding behind the chest, haunch at the back
  { g: "body", s: ell(40, 38, 11, 8.5, 1.6), mat: HIDE },
  { g: "body", s: ell(46, 40, 7.5, 7.5), mat: HIDE },
  // charcoal back plates along the spine
  { g: "body", s: polyShape([33, 31.5, 36, 26.5, 39, 31], [-0.3, -0.8, 0.6]), mat: ROCK },
  { g: "body", s: polyShape([38.5, 31, 42, 25.5, 45.5, 31], [-0.3, -0.8, 0.6]), mat: ROCK },
  { g: "body", s: polyShape([45, 32, 49, 28, 51, 34], [0.2, -0.8, 0.6]), mat: ROCK },
  // near hind leg: thigh is the haunch, hock bends back, paw forward
  { g: "hind", s: tube([[48, 44, 4.4], [51, 50, 2.8], [49, 55, 2.7]]), mat: HIDE, bias: -0.1 },
  { g: "hind", s: ell(47.5, 56.8, 4, 2.2), mat: CREAM },
  // far front leg, straight under the far shoulder
  { g: "farF", s: tube([[32, 40, 3.8], [32, 49, 3], [32, 54, 2.8]]), mat: HIDE, bias: -0.3 },
  { g: "farF", s: ell(31.5, 56, 3.8, 2.2), mat: CREAM, bias: -0.2 },
  // chest, nearest part of the body
  { g: "chest", s: ell(27, 37, 9, 8, 1.8), mat: HIDE },
  // near front leg, braced forward (pouncing stance)
  { g: "front", s: tube([[22, 40, 4.4], [19, 48, 3.3], [18, 54, 3.1]]), mat: HIDE },
  { g: "front", s: ell(17.5, 56.6, 4.2, 2.4), mat: CREAM },
  // neck ruff, jagged fur edge
  { g: "ruff", s: within(ell(25, 33, 9.5, 6.5), [15, 27, 35, 27, 35, 32, 32, 36, 30, 33.5, 27, 38, 25, 34, 22, 37.5, 20.5, 33.5, 17, 35]),
    mat: CREAM },
  // far ear, charcoal tip
  { g: "farEar", s: tube([[17, 10, 4], [13, 4.5, 2.4], [10, 0.8, 0.6]]), mat: tipped(5), bias: -0.25 },
  // head, big and round (starter proportions), face toward the viewer
  { g: "head", s: ell(24, 19, 12, 10.5, 2.4), mat: HIDE },
  { g: "head", s: ell(17, 24.5, 6.3, 3.9), mat: CREAM },          // muzzle
  { g: "head", s: polyShape([30, 22, 38, 25, 34, 27, 37, 30, 30, 29.5], [0.2, 0.3, 0.9]), mat: CREAM }, // cheek tuft
  // near ear, charcoal tip
  { g: "ear", s: tube([[31, 9, 4.6], [35, 4.5, 3.2], [38, 0.8, 0.7]]), mat: tipped(5) },
  { g: "ear", s: tube([[32.5, 7, 1.6], [35, 3.5, 0.8]]), mat: ["D", "D", "D"] },  // inner ear
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
  grid(25, 14, `
    ......kk
    .kkkkkkk
    kkeewwkk
    keeyywk.
    keyYyek.
    .kkeekk.
    ...kk...`),
  // far eye: foreshortened beside the bridge of the muzzle
  grid(14, 15, `
    ..kk
    kkkk
    kewk
    keyk
    .kk.`),
  grid(11, 21, "kk\nkk"), px(12, 21, "G"),            // nose
  // grin with one fang
  grid(12, 25, `
    k.........
    .kkmmmmkk.
    ..kwk.....`),
  px(17, 57, "b"), px(20, 57, "b"), px(47, 57, "b"), px(31, 56, "b"), // toes
)
