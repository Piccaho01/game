// The original, larger Furnaxol (approved). The game uses art/creatures/furnaxol.px.js, this
// sprite shrunk to starter size (80%) with the eyes redrawn; kept as the source of that.
// Furnaxol (furnace + axolotl) — Fire starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A glassblower's axolotl from Emberwick: three flame gills per side, a fired-glass belly
// window over its ember core, a finned paddle tail. Battle pose: lunging forward, blowing a
// molten glass bubble from its pursed lips and cradling it in its far hand, tail raised as
// a counterweight.
//
// Stages: silhouette (furnaxol_sil), flat colours (furnaxol_flats), shading
// (furnaxol_shaded), final still (furnaxol), BW2-style idle loop (furnaxol_idle). Process and
// rules: art/BW_STYLE.md. Every part is a hand-placed polygon in design space, overlapping the part
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

// ---- pose: the torso leans back from the hips while the head thrusts forward, like a
// blowgun shot. H moves head-side shapes, B rotates torso-side shapes about the hips.
const HEAD_DX = -3.5, HEAD_DY = 1.75           // = (-2, +1) output pixels
const LEAN = 7 * Math.PI / 180, HIP = [50, 77]
// bob: breathing, in output pixels (the head side dips while the hips stay planted)
const Hb = (bob) => (pts) => pts.map((v, i) => v + (i % 2 ? HEAD_DY + bob / K : HEAD_DX))
const H = Hb(0)
// flame flicker: vertical wobble per vertex, zero at phase 0 so frame 0 is the still
const flick = (pts, ph, amp, seed = 0) => pts.map((v, i) =>
  i % 2 ? v + amp * (Math.sin(2 * Math.PI * ph + seed + i * 0.9) - Math.sin(seed + i * 0.9)) : v)
const B = (pts) => pts.flatMap((v, i) => {
  if (i % 2) return []
  const dx = v - HIP[0], dy = pts[i + 1] - HIP[1]
  return [HIP[0] + dx * Math.cos(LEAN) - dy * Math.sin(LEAN), HIP[1] + dx * Math.sin(LEAN) + dy * Math.cos(LEAN)]
})

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
const NEAR_GILLS = [
  [48, 26, 52, 18, 54, 10, 58, 14, 60, 3, 64, 12, 69, 6, 67, 19, 60, 30, 52, 30],
  [56, 30, 64, 25, 70, 19, 73, 23, 81, 14, 80, 24, 89, 22, 80, 32, 68, 37, 58, 38],
  [58, 36, 68, 37, 78, 35, 77, 39, 87, 41, 78, 45, 82, 50, 70, 46, 60, 44],
]
// far gills: the near cluster mirrored to the other side of the head and scaled down
// (turned away), so both sides carry the same three flame fronds
const FAR_GILLS = NEAR_GILLS.map((p) => p.map((v, i) => (i % 2 ? 24 + (v - 27) * 0.72 : 33 + (78 - v - 33) * 0.72)))
// legs, starter-style: round thigh at the hip, short shin, flat foot with the toes forward.
// The near leg plants forward-left and takes the weight (knee bent over the foot); the far
// leg stretches out behind, up on its toes.
const FAR_LEG = [
  { e: [62, 73, 8.5, 7.5] },                                  // thigh (mostly behind the hip)
  { p: [56, 74, 68, 70, 74, 76, 81, 83, 74, 89, 66, 80] },    // calf and shin, as thick as the front leg
  { p: [64, 91, 65, 87, 72, 84, 79, 81, 84, 85, 81, 91] },    // foot, heel lifted
]
const NEAR_LEG = [
  { p: [31, 77, 40, 77, 43, 86, 34, 86] },                    // shin, knee forward
  { e: [43, 76, 8.5, 6.5] },                                  // thigh, loaded with the weight
  { p: [25, 91, 26, 88, 31, 86, 44, 86, 46, 89, 46, 91] },    // foot, planted flat
]
// far arm from the shoulder, forward and down to a hand cupped under the bubble
const ARM = [38, 61, 30, 63, 22, 64, 14, 66, 8, 66, 3, 63, 1, 58, 4, 58, 7, 62, 12, 62, 18, 59, 26, 56, 33, 54, 38, 54]

// a leg piece is a polygon {p} or an ellipse {e: [cx, cy, rx, ry]} in design space
const shape = (q, f = (p) => p) => (q.p ? { s: T(f(q.p)) } : { ell: [...T(f(q.e.slice(0, 2))), q.e[2] * K, q.e[3] * K] })

// ---- parts back to front. Parts in different groups get a contour where they overlap.
// Shading (stage 3), all in output pixels, one light from the upper left:
//   sh: [dx, dy]  shadow crescent: pixels whose (x+dx, y+dy) falls outside the part
//   rim: [dx, dy] a second, darker crescent hugging the bottom-right edge (glass)
//   hl: shape     highlight shape on the lit plane (design space), or
//   top: n        lit top edge, n px deep (flame tips, top of the far arm)
//   core: shape   hot core (glass), glint: [x, y] white specular pixels (design space)
//   cast: true    the part casts a shadow down-right onto the parts behind it
function makeParts({ bob = 0, ph = 0 } = {}) {
  const H = Hb(bob), arm = ARM.flatMap((v, i, a) => (i % 2 ? [] : a[i] <= 26 ? H([a[i], a[i + 1]]) : B([a[i], a[i + 1]])))
  const pulse = Math.sin(2 * Math.PI * ph)
  return [
  ...FAR_GILLS.map((p, i) => ({ g: "farGill" + i, s: T(H(flick(p, ph, 1.2, i + 3))), c: "R", top: 1 })),
  ...FAR_LEG.map((q) => ({ g: "farLeg", ...shape(q), c: "S", sh: [1, 1] })),
  // belly furnace: the ember core glows through thin skin (emissive tones: never shaded),
  // a pale bloom on the cream, an uneven orange glow, a flame-shaped hot centre
  { g: "torso", s: T(B(TORSO_TAIL)), c: "s", sh: [2, 2],
    tone: [[T(B(BELLY)), "c"],
           [{ ell: [...T(B([46, 62])), 8.5 * K, 9.5 * K] }, "Y", true],
           [T(B([40, 61, 42, 56, 46, 54, 50, 55, 52, 60, 52, 66, 49, 70, 44, 70, 41, 66])), "o", true],
           [T(B([42, 68, 43, 63, 45, 65, 46, 57, 48, 63, 50, 61, 50, 68, 46, 70])), "y", true],
           [T(B(flick([44, 68, 45, 64, 46, 62, 47, 64, 48, 68], ph, 1.2, 1))), "Y", true]],
    hl: { s: T(B([66, 60, 76, 54, 84, 46, 87, 41, 84, 51, 76, 59, 68, 64])) } },
  // fire on the tail tip, leaning back with the tail
  { g: "tailFire", s: T(B(flick([86, 42, 84, 35, 87, 37, 87, 29, 90, 33, 92, 24, 94, 31, 97, 28, 96, 36, 98, 40, 95, 44], ph, 1.6, 2))),
    c: "o", sh: [1, 1],
    tone: [[T(B(flick([88, 42, 87, 37, 89, 38, 90, 32, 92, 36, 94, 31, 94, 38, 95, 42], ph, 1.6, 2))), "y"],
           [T(B([89, 43, 90, 39, 92, 37, 93, 40, 93, 43])), "Y"]] },
  ...NEAR_LEG.map((q) => ({ g: "nearLeg", ...shape(q), c: "s", sh: [2, 1], cast: true, soft: true, top: q.e ? 1 : 0 })),
  { g: "head", s: T(H(HEAD)), c: "s", tone: [[T(H(THROAT)), "c"]], sh: [2, 2], cast: true,
    hl: { s: T(H([22, 27, 27, 23, 34, 21, 40, 21, 35, 23, 29, 26, 25, 30])) } },
  ...NEAR_GILLS.map((p, i) => ({ g: "gill" + i, s: T(H(flick(p, ph, 1.6, i))), c: "o", sh: [1, 1], top: 2, cast: true })),
  { g: "arm", s: T(arm), c: "S", sh: [1, 1], top: 1, cast: true },
  { g: "glass", s: T(H([17, 40, 16, 45, 12, 46, 12, 41])), c: "y" },
  { g: "glass", circle: [T(H([7, 49.5])), (11 + 0.6 * pulse) * K], c: "y", sh: [3, 3], rim: [1, 1],
    core: { circle: [T(H([4, 46.5])), (5 + 0.8 * pulse) * K] }, glint: [H([1, 43.5]), H([2, 42.5])] },
  ]
}
const parts = makeParts()
const SHADOW = { s: "S", c: "C", S: "D", o: "R", y: "o", R: "D", L: "s", Y: "y" }
const SELOUT = { s: "D", L: "D", S: "D", c: "D", C: "D", o: "R", y: "R", Y: "o", R: "D" }
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

function render(c, { lines, shading }, parts = makeParts()) {
  const N = 96, own = new Int16Array(N * N).fill(-1), col = new Array(N * N).fill(null)
  parts.forEach((p, i) => {
    const inP = (x, y) => inPart(p, x, y)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!inP(x, y)) continue
      let k = p.c, emit = false
      for (const [t, tc, e] of p.tone || []) if (Array.isArray(t) ? inPoly(t, x, y) : inPart(t, x, y)) { k = tc; emit = !!e }
      if (shading && !emit) {
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
      if (i < 0 && j >= 0) {                                                 // outer outline
        // BW selective outline: lit (top/left) edges take the material's darkest tone,
        // shadow (bottom/right) edges stay black
        const lit = (dx === 1 || dy === 1) && at(x - 1, y) < 0 && at(x, y - 1) < 0
        out[y * N + x] = lines === "sel" && lit ? SELOUT[col[(y + dy) * N + x + dx]] || "k" : "k"; break
      }
      if (lines && i >= 0 && j >= 0 && j < i && parts[j].g !== parts[i].g) {
        out[y * N + x] = parts[i].soft && parts[j].g === "torso" ? "D" : "k"; break
      }
    }
  }
  if (shading) for (const p of parts) for (const g of p.glint || []) {
    const [x, y] = T(g).map(Math.floor)
    if (out[y * N + x] && out[y * N + x] !== "k") out[y * N + x] = "w"
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (out[y * N + x]) c.px(x, y, out[y * N + x])
}

// Stage 1: silhouette
sprite("furnaxol_large_sil", { w: 96, h: 96 }, (c) => {
  parts.forEach((p) => {
    for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (inPart(p, x, y)) c.px(x, y, "k")
  })
})

// Stage 2: flat colours, one base per material, contours where parts overlap
sprite("furnaxol_large_flats", { w: 96, h: 96 }, (c) => render(c, { lines: true }))

// Stage 3: shading
sprite("furnaxol_large_shaded", { w: 96, h: 96 }, (c) => render(c, { lines: true, shading: true }))

// Stages 4-5: selective outline, then hand-placed details in output pixels. Head-side
// details ride the breathing bob; the near arm, legs and toes stay planted.
function details(c, bob = 0) {
  // near eye, Fire style: thick lid lowered into a focused squint, flicking up at the outer
  // corner; pupil hard against the front of the eye, locked on the target
  c.grid(38, 56 + bob, `
    ......k
    .kkkkkk
    kkkwyyk
    kkkyyyk
    kkoooo.
    .kkkkk.`.replace(/\.$/m, "k"))
  // far eye: the same eye turned away (narrower, same height), looking the same way
  c.grid(32, 57 + bob, `
    k...
    kkkk
    kkwk
    kkyk
    kook
    .kk.`)
  // near arm, hand-placed (at this size an arm needs a clean 5 px-wide shape): hanging
  // straight down the side from under the jaw, elbow slightly bent, full fist clenched at
  // the hip, clear of the belly glow
  c.grid(53, 65, `
    ..kkkkk..
    .kLsssSk.
    .kLsssSk.
    .kLssSSk.
    .kLssSSk.
    ..kLsSSk.
    ..kLsSSk.
    ..kLssSk.
    .kLssSSk.
    .kLssSSk.
    kLLsssSSk
    kLsssSSSk
    kLkskSSk.
    ksSsSSk..
    .kkkkk...`)
  // near cheek puffed out with the breath
  c.grid(36, 62 + bob, `
    .LLL.
    LLLLs
    .sss.`)
  // pursed lips wrapped around the glass neck
  c.grid(28, 62 + bob, `
    kD
    Ls
    Ls
    kD`)
  // far hand cupped under the bubble, three fingertips curled over its front
  c.grid(19, 72 + bob, `
    ..kk.kk.kk..
    .kSskSskSsk.
    .kSSkSSkSSkk
    ..kkSSSSSSSS
    ....kkkkkkkk`)
  // toes split by short lines
  c.vline(38, 89, 2, "k"); c.vline(41, 89, 2, "k")
  c.vline(63, 89, 2, "k"); c.vline(66, 88, 2, "k")
}

function frame(c, { bob = 0, ph = 0 } = {}) {
  render(c, { lines: "sel", shading: true }, makeParts({ bob, ph }))
  details(c, bob)
}

// Final still
sprite("furnaxol_large", { w: 96, h: 96 }, (c) => frame(c))

// BW2-style idle loop: slow breath (head side dips 1 px), gills and tail fire flicker,
// bubble and belly furnace pulse. 12 frames at 10 fps; frame 0 is the still.
const BREATH = [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0]
anim("furnaxol_large_idle", { w: 96, h: 96, frames: 12, fps: 10 }, (c) => frame(c, { bob: BREATH[c.frame], ph: c.phase }))
