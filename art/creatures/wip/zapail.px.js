// Zapail, redesign (work in progress). Spark starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the over-caffeinated live wire, always buzzing.
// Pose: rearing up toward the camera, head thrust forward, grinning through gritted teeth;
// its slime is so full of static that a frizzy crest stands straight up; plug antennae
// crackling. Its shell, as before: a geared copper housing with a coil wound on its face and a
// battery terminal on top, seated on its back with the body wrapped round its base.
// Coordinates are output pixels (K = 1); foot on y = 91.

include("../lib/creature.js")
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
const { T, silhouette, partsView, render } = creature({ K: 1, SHADOW, LIGHT, SELOUT })

// gear outline: n square-ish teeth of depth d round a circle of radius r
function gear(cx, cy, r, d, n, rot = 0) {
  const pts = []
  for (let i = 0; i < n; i++) for (const [f, rr] of [[0, r], [0.1, r + d], [0.4, r + d], [0.5, r]]) {
    const a = 2 * Math.PI * (i + f) / n + rot
    pts.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
  }
  return pts
}

// the copper coil wound on the shell's face: a spiral of wire round a glowing core
const COIL = spiral(T, [60, 64], 3.5, 0.45)

// bob: breathing (head side dips, output px); ph: animation phase 0..1
function makeParts({ bob = 0, ph = 0 } = {}) {
  const pulse = Math.sin(2 * Math.PI * ph)
  return [
  // body: the slug's foot along the ground from the tail end on the right to the front lip on
  // the left, its back rising in a hump under the shell so the shell's lower half sits in it
  { g: "body", mat: "slime", s: [86, 91, 84, 86, 79, 78, 72, 72, 60, 69, 48, 71, 42, 78, 26, 83, 18, 85, 12, 87, 11, 90, 14, 91],
    c: "a", sh: [2, 2], tone: [[[10, 88, 30, 86, 50, 86, 70, 86, 86, 88, 88, 93, 10, 93], "b"]] },
  // shell: the geared copper housing seated on the back, a coil wound on its face round a
  // glowing core; battery terminal on top
  { g: "shell", s: gear(60, 64, 15, 3, 10, -Math.PI / 2 + Math.PI / 10), c: "o", sh: [2, 2], top: 1,
    tone: [[{ ell: [60, 64, 12.5, 12.5] }, "q"], [COIL, "o"],
           [{ ell: [60, 64, 2.4 + 0.6 * pulse, 2.4 + 0.6 * pulse] }, "y", true]],
    hl: { s: [46, 56, 51, 50, 58, 47, 53, 51, 49, 57] }, glint: [[50, 51], [51, 50]] },
  { g: "post", s: [57, 47, 63, 47, 63, 42, 57, 42], c: "b", sh: [1, 0], hl: { s: [57, 42, 59, 42, 59, 47, 57, 47] } },
  { g: "cap", s: [54, 42, 66, 42, 66, 39, 54, 39], c: "a", sh: [1, 1], top: 1 },
  // neck: rising from the front of the foot in front of the shell's lower left edge
  { g: "body", mat: "slime", oy: bob, s: [20, 86, 23, 76, 24, 66, 30, 60, 38, 60, 42, 66, 43, 76, 46, 86], c: "a", sh: [2, 0],
    hl: { s: [24, 68, 27, 63, 27, 74, 25, 80] } },
  // head: big and round, thrust forward over the foot, turned slightly left
  { g: "head", mat: "slime", oy: bob, ell: [32, 51, 13.5, 11.5], c: "a", sh: [2, 2], cast: true,
    hl: { ell: [28, 45, 6, 3] } },
  // static crest: frizzy slime spikes fanning out off the crown, crackling yellow at the tips
  { g: "crest", mat: "slime", oy: bob, s: [22, 47, 15, 39, 23, 42, 22, 32, 28, 39, 31, 28, 34, 38, 39, 30, 39, 39, 47, 35, 44, 44],
    c: "a", top: 1, sh: [1, 1], tone: [[{ fn: (x, y) => y < 34 + bob || (x < 19 && y < 42 + bob) || (x > 43 && y < 38 + bob) }, "Y", true]] },
  // plug antennae from the sides of the crown, splayed up and out: slime stalks, copper plugs
  { g: "farStalk", mat: "slime", oy: bob, s: [24, 46, 18, 38, 15, 33, 17, 32, 21, 37, 27, 44], c: "b", top: 1 },
  { g: "farPlug", oy: bob, s: [12, 33, 13, 28, 18, 28, 19, 33], c: "q", top: 1 },
  { g: "farProng", oy: bob, s: [13, 24, 14, 24, 14, 28, 13, 28], c: "o" },
  { g: "farProng2", oy: bob, s: [17, 24, 18, 24, 18, 28, 17, 28], c: "o" },
  { g: "stalk", mat: "slime", oy: bob, s: [40, 43, 45, 36, 48, 31, 50, 32, 48, 37, 43, 46], c: "a", sh: [1, 0] },
  { g: "plug", oy: bob, s: [46, 33, 47, 27, 54, 27, 55, 33], c: "o", sh: [1, 1], top: 1 },
  { g: "prong", oy: bob, s: [48, 22, 49, 22, 49, 27, 48, 27], c: "O" },
  { g: "prong2", oy: bob, s: [52, 22, 53, 22, 53, 27, 52, 27], c: "O" },
  ]
}
const parts = makeParts()

sprite("zapail_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("zapail_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))

// Stage 2-3: flat colours, shading
sprite("zapail_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))
sprite("zapail_shaded", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true, shading: true }))

// Spark face, wired: huge round eyes with a yellow iris ring and pinprick pupils (one a touch
// wider than the other, twitchy), brows shot up; a wide grin of gritted teeth
function details(c, bob = 0) {
  // brows shot up
  c.grid(34, 44 + bob, `
    ..BBBB.
    .B....B`)
  c.grid(23, 44 + bob, `
    .BBB.
    B...B`)
  // near eye: big sclera, small yellow iris toward the front, pinprick pupil
  c.grid(33, 46 + bob, `
    ..kkkk..
    .kwwwwk.
    kwwwwwwk
    kyyywwwk
    kykyywwk
    kyyywwwk
    kwwwwwwk
    .kwwwwk.
    ..kkkk..`)
  // far eye: the same eye turned away (narrower, same height), pupil a touch wider (twitchy)
  c.grid(23, 46 + bob, `
    .kkkk.
    kwwwwk
    kwwwwk
    kyyywk
    kkkywk
    kyyywk
    kwwwwk
    .kwwwk
    ..kkk.`)
  // grin: wide, corners pulled up, gritted teeth
  c.grid(24, 55 + bob, `
    k..............k
    .kkkkkkkkkkkkkk.
    .kwwkwwkwwkwwwk.
    .kwwkwwkwwkwwwk.
    ..kkkkkkkkkkkk..`)
}
function frame(c, { bob = 0, ph = 0 } = {}) {
  render(c, makeParts({ bob, ph }), { lines: "sel", shading: true })
  details(c, bob)
}
sprite("zapail", { w: 96, h: 96 }, (c) => frame(c))
