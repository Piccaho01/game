// Zapail — Spark starter, stage 1, drawn line-art-first with lib/sprite.js (art/BW_STYLE.md,
// Process). About 46 x 44 px, like Shelmet (BW's own shell-and-head basic).
// Personality: the over-eager live wire — bright, buzzing, a little too excited.
// Gesture: a slim slug body rearing up in an S-curve from a long tapering foot, the head
// pushed forward at the opponent; the copper shell (cog-toothed rim, a coil wound on its face
// round a glowing core, a battery terminal on top) seated on its back. Plug antennae with sparks
// between the prongs; a yellow zigzag of static along the foot (Spark Trail).

include("../lib/sprite.js")
pal({
  k: "#181018",                                                      // black line
  B: "#2c3a66", b: "#5a76aa", a: "#9cc4e6", A: "#e0f2ff",            // conductive slime
  Q: "#5e2414", q: "#a84c22", o: "#e08436", O: "#ffc274",            // copper
  y: "#ffe23c", Y: "#fffad0",                                        // static (emissive)
  w: "#ffffff", m: "#a8343e",                                        // white, mouth
})
const kit = spriteKit({
  mats: {
    slime: { line: "B", ramp: ["b", "a", "A"] },
    copper: { line: "Q", ramp: ["q", "o", "O"] },
    coil: { line: "Q", ramp: ["o", "O", "O"] },
    farCopper: { line: "Q", ramp: ["Q", "q", "o"] },
  },
})

// gear outline: n teeth of depth d round a circle (sharp corners)
const gear = (cx, cy, r, d, n, rot = 0) => {
  const pts = []
  for (let i = 0; i < n; i++) for (const [f, rr] of [[0, r], [0.12, r + d], [0.38, r + d], [0.5, r]]) {
    const t = 2 * Math.PI * (i + f) / n + rot
    pts.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t), 1])
  }
  return pts
}
// coil: an Archimedean spiral band on the shell's face
const coil = (cx, cy, pitch, width) => ({ fn: (x, y) => {
  const dx = x + 0.5 - cx, dy = y + 0.5 - cy, ph = (Math.hypot(dx, dy) / pitch - Math.atan2(dy, dx) / (2 * Math.PI)) % 1
  return (ph + 1) % 1 < width
} })
const SX = 58, SY = 64

function makeParts({ bob = 0, ph = 0 } = {}) {
  const glow = 2.2 + 0.6 * Math.sin(2 * Math.PI * ph)
  return [
  // foot and body: one slime body, from the tapering tail end on the right along the ground,
  // a hump rising under the shell (so the shell sits in it), and at the front a neck that rears
  // up and curves forward under the head
  { g: "body", mat: "slime", path: [[84, 90, 1], [77, 85], [72, 77], [66, 70], [58, 67], [49, 69], [43, 73], [41, 66], [37, 60], [29, 59], [24, 64], [24, 72], [22, 80], [18, 86], [16, 90], [40, 91], [64, 91]],
    tones: [{ fn: (x, y) => y === 89 && (x % 4 === 0 || x % 4 === 1) && x > 24 && x < 76, mat: "slime" }] },
  // shell: the copper cog housing seated on the back, coil on its face, glowing core
  { g: "shell", mat: "copper", path: gear(SX, SY, 12, 2.5, 10, -Math.PI / 2 + Math.PI / 10),
    tones: [{ ...coil(SX, SY, 3.5, 0.45), mat: "coil" }] },
  { g: "core", flat: "y", noline: true, ell: [SX, SY, glow, glow] },
  // battery terminal on top of the shell
  { g: "post", mat: "slime", path: [[55, 50, 1], [61, 50, 1], [61, 46, 1], [55, 46, 1]] },
  { g: "cap", mat: "slime", path: [[53, 46, 1], [63, 46, 1], [63, 44, 1], [53, 44, 1]] },
  // far antenna (left, behind): slim stalk, copper plug, two prongs
  { g: "farStalk", mat: "slime", oy: bob, path: [[25, 50], [21, 43], [19, 39], [21, 38], [24, 42], [28, 49]] },
  { g: "farPlug", mat: "farCopper", oy: bob, path: [[16, 39, 1], [17, 35, 1], [22, 35, 1], [23, 39, 1]] },
  // head: round, turned 3/4 to the viewer, pushed forward over the front of the foot
  { g: "head", mat: "slime", oy: bob, path: [[22, 52], [26, 47], [33, 46], [38, 49], [40, 55], [38, 61], [32, 64], [25, 63], [21, 59], [20, 55]] },
  // near antenna (right): longer, plug aimed forward-up at the opponent
  { g: "stalk", mat: "slime", oy: bob, path: [[34, 48], [34, 41], [33, 36], [35, 35], [37, 41], [37, 48]] },
  { g: "plug", mat: "copper", oy: bob, path: [[30, 36, 1], [31, 31, 1], [37, 31, 1], [38, 36, 1]] },
  ]
}
const parts = makeParts()
for (const st of ["sil", "lines", "flats", "shaded"]) sprite("zapail4_" + st, { w: 96, h: 96 }, (c) => kit.render(c, parts, st))

function details(c, bob = 0) {}
function frame(c, o = {}) { kit.render(c, makeParts(o), "final"); details(c, o.bob || 0) }
sprite("zapail4", { w: 96, h: 96 }, (c) => frame(c))
