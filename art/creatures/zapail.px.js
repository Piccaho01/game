// Zapail (zap + snail) — Spark starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A tiny, nervous snail whose shell is a machine: a geared copper housing (a coil wound inside,
// shown in the colours) with a battery terminal on top that crackles with the static it builds
// by grinding its rim on the ground. Its eyestalks end in two-pronged plugs. Battle pose,
// turned three-quarters to the viewer: startled, head reared up against the housing, plug
// eyestalks splayed at the target. Leaves a charged slime trail (Spark Trail).
//
// Stages: silhouette (zapail_sil, zapail_parts), flat colours (zapail_flats), shading
// (zapail_shaded), final still (zapail), BW2-style idle loop (zapail_idle). Process and rules: art/BW_STYLE.md; structure follows
// furnaxol.px.js (parts are hand-placed shapes that overlap what they attach to).
// Shapes are drawn in design space (output pixels before scaling); K scales them to starter
// size. The renderer is shared: lib/creature.js.

include("lib/creature.js")

pal({
  k: "#181018",                                            // outline
  Q: "#5a2418", q: "#a24a26", o: "#dc7a34", O: "#f7b864",  // copper: line, shadow, base, light
  B: "#2e3c64", b: "#5f78a8", a: "#9ec0e0", A: "#dcf0ff",  // conductive slime body
  y: "#ffe23c", Y: "#fffbd2",                              // static (emissive)
  w: "#ffffff", m: "#6a1e2c",                              // highlight, mouth
})
const SHADOW = { o: "q", O: "o", q: "Q", a: "b", A: "a", b: "B" }
const LIGHT = { o: "O", q: "o", a: "A", b: "a" }
const SELOUT = { o: "Q", O: "Q", q: "Q", a: "B", A: "B", b: "B", y: "o", Y: "y" }
const K = 0.9
const { T, silhouette, partsView, render } = creature({ K, SHADOW, LIGHT, SELOUT })

// gear outline: n square-ish teeth of depth d round a circle of radius r (design space)
function gear(cx, cy, r, d, n, rot = 0) {
  const pts = []
  for (let i = 0; i < n; i++) for (const [f, rr] of [[0, r], [0.1, r + d], [0.4, r + d], [0.5, r]]) {
    const a = 2 * Math.PI * (i + f) / n + rot
    pts.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
  }
  return pts
}

// ---- parts, back to front (see lib/creature.js for the fields). bob: breathing (head side
// dips, output px); ph: animation phase 0..1 (sparks flicker, the coil core pulses).
// Three-quarter turn: the head is nearest the viewer (lower left), the foot runs back and up
// to the right, and the shell sits behind the head with its cog face on the near side.
// the copper coil wound inside the housing: a spiral of bright wire on the recessed face
const COIL = spiral(T, [57, 58], 4, 0.45)
function makeParts({ bob = 0, ph = 0 } = {}) {
  const on = (t) => Math.floor(ph * 12) % 4 !== t + 1   // each spark blinks off one frame in four
  const pulse = Math.sin(2 * Math.PI * ph)
  return [
  // shell: a machine. A big geared copper housing (cog teeth round the rim) riding on the
  // back, the head overlapping its front edge; on its face, copper coil windings around a
  // glowing core. A battery-style terminal post on top.
  { g: "shell", s: gear(57, 58, 18, 3.5, 11, -Math.PI / 2 + Math.PI / 11), c: "o", sh: [2, 2], top: 1,
    tone: [[{ ell: [57, 58, 15, 15] }, "q"], [COIL, "o"],
           [{ ell: [57, 58, 2.6 + 0.6 * pulse, 2.6 + 0.6 * pulse] }, "y", true]],
    hl: { s: [40, 50, 46, 43, 54, 39, 50, 44, 45, 50] }, glint: [[45, 45], [46, 44]] },
  { g: "post", s: [54, 41, 60, 41, 60, 33, 54, 33], c: "b", sh: [1, 0], hl: { s: [54, 33, 56, 33, 56, 41, 54, 41] } },
  { g: "cap", s: [51, 33, 63, 33, 63, 30, 51, 30], c: "a", sh: [1, 1], top: 1 },
  // static: bolts arcing off the terminal and off the back of the housing
  ...(on(0) ? [{ g: "spark", s: [62, 31, 68, 26, 67, 29, 73, 27, 70, 31, 66, 32, 66, 34, 62, 35], c: "y", tone: [[[64, 32, 68, 29, 70, 30, 66, 33], "Y", true]] }] : []),
  ...(on(2) ? [{ g: "spark2", s: [75, 64, 81, 61, 80, 64, 86, 63, 83, 66, 79, 66, 79, 69, 75, 69], c: "y", tone: [[[77, 66, 81, 63, 83, 64, 79, 67], "Y", true]] }] : []),
  // foot: from the tail tip far back (higher, smaller) along the ground under the shell to
  // the rounded front of the foot, nearest the viewer; a darker sole along the ground
  { g: "body", mat: "slime", s: [88, 84, 84, 81, 76, 74, 64, 70, 52, 70, 44, 72, 40, 70, 28, 68, 20, 74, 17, 82, 19, 89, 26, 91, 44, 91, 58, 88, 72, 86, 82, 86],
    c: "a", sh: [2, 2], tone: [[[16, 82, 30, 85, 46, 85, 60, 82, 74, 79, 88, 82, 86, 88, 72, 88, 58, 90, 44, 93, 16, 93], "b"]],
    hl: { s: [20, 76, 26, 71, 34, 70, 28, 74, 22, 80] } },
  // neck and head: reared up, turned toward the viewer, wide enough for a face
  { g: "body", mat: "slime", oy: bob, s: [22, 82, 20, 72, 22, 64, 30, 63, 40, 66, 44, 74, 42, 84], c: "a",
    hl: { s: [22, 66, 26, 65, 25, 72, 23, 78] } },
  { g: "head", mat: "slime", oy: bob, ell: [31, 57, 12, 9.5], c: "a", sh: [2, 2], cast: true,
    hl: { ell: [27, 53, 6, 3.5] } },
  // eyestalks from the top of the head, splayed: the far one (left) thinner, the near one
  // (right) bigger. Each ends in a plug: an eye bulb with two copper prongs aimed at the target
  { g: "farStalk", mat: "slime", oy: bob, s: [24, 50, 21, 42, 19, 36, 22, 35, 25, 42, 28, 49], c: "b", top: 1 },
  { g: "farProng", oy: bob, s: [12, 30, 17, 30, 17, 32, 12, 32], c: "o", sh: [0, 1] },
  { g: "farProng2", oy: bob, s: [12, 34, 17, 34, 17, 36, 12, 36], c: "o", sh: [0, 1] },
  { g: "farBulb", mat: "slime", oy: bob, ell: [20.5, 33, 4.5, 5], c: "b", top: 1 },
  { g: "stalk", mat: "slime", oy: bob, s: [34, 49, 37, 41, 39, 34, 43, 35, 41, 42, 39, 50], c: "a", sh: [1, 0] },
  { g: "prong", oy: bob, s: [30, 27, 37, 27, 37, 29, 30, 29], c: "o", sh: [0, 1], top: 1 },
  { g: "prong2", oy: bob, s: [30, 32, 37, 32, 37, 34, 30, 34], c: "o", sh: [0, 1], top: 1 },
  { g: "bulb", mat: "slime", oy: bob, ell: [41.5, 31, 6, 5.5], c: "a", sh: [1, 1] },
  ]
}
const parts = makeParts()

// Stage 1: silhouette, and the same with each part outlined
sprite("zapail_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("zapail_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))

// Stage 2: flat colours, contours where parts overlap
sprite("zapail_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))

// Stage 3: shading
sprite("zapail_shaded", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true, shading: true }))

// Stages 4-5: selective outline, then hand-placed details in output pixels
// Spark face: round eyes with a yellow iris ring and a pinprick pupil hard against the front
// (startled, locked on the target), and a nervous zigzag mouth, chattering
function details(c, bob = 0) {
  // near eye, filling the front of the near plug bulb
  c.grid(37, 33 + bob, `
    ..kkkk.
    .kyyyww
    kkkkyww
    kkkkyww
    kkkkyyw
    .kyyyww
    ..kkkk.`)
  // far eye: the same eye turned away (narrower, same height)
  c.grid(20, 35 + bob, `
    .kkk
    kkyw
    kkkw
    kkkw
    kkyw
    kyyw
    .kkk`)
  // mouth: open and wobbly, gritted in the middle
  c.grid(23, 61 + bob, `
    .kk.kk.
    kmmkmmk
    .kkkkk.`)
}
function frame(c, { bob = 0, ph = 0 } = {}) {
  render(c, makeParts({ bob, ph }), { lines: "sel", shading: true })
  details(c, bob)
}

sprite("zapail", { w: 96, h: 96 }, (c) => frame(c))

// BW2-style idle loop: slow breath (head, neck and eyestalks dip 1 px), sparks blink, the
// coil core pulses. 12 frames at 10 fps; frame 0 is the still.
const BREATH = [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0]
anim("zapail_idle", { w: 96, h: 96, frames: 12, fps: 10 }, (c) => frame(c, { bob: BREATH[c.frame], ph: c.phase }))
