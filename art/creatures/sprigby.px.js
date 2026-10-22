// Sprigby (sprig + wallaby) — Plant starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A tiny wallaby joey from Canopy. Its ears are two sprouting leaves, its heels are coiled
// vine springs, and it can't stop bouncing. Battle pose: nervous but game, up on its toes
// with the heel springs wound, little fists up in a wobbly guard (the kickboxer it grows
// into), ears pinned back, thick tail planted behind as a third leg.
//
// Stages: silhouette (sprigby_sil). Process and rules: art/BW_STYLE.md; structure follows
// furnaxol.px.js (parts are hand-placed shapes that overlap what they attach to).
// Shapes are drawn in design space (output pixels before scaling); K scales them to starter
// size, anchored on the feet at the bottom centre of the canvas (y = 91). Grid parts are
// placed in output pixels.

pal({ k: "#181018" })

const K = 0.8
const T = (pts) => pts.map((v, i) => (i % 2 ? 91 - (91 - v) * K : 48 + (v - 48) * K))

// ---- parts, back to front. {s: polygon} | {ell: [cx, cy, rx, ry]} | {grid: [x, y, rows]} ("#" = in)
const parts = [
  // far ear: the same leaf turned away (narrower), more upright, a V of air between the ears
  { g: "farEar", s: [28, 42, 27, 36, 26, 30, 28, 23, 32, 17, 35, 14, 36, 20, 35, 27, 33, 34, 32, 43] },
  // tail: thick at the rump, down to the ground behind, tip curling up
  { g: "tail", s: [56, 70, 66, 74, 76, 79, 84, 78, 87, 72, 91, 71, 92, 78, 87, 85, 78, 89, 70, 88, 64, 80] },
  // far foot: toes just showing past the near one
  { g: "farLeg", s: [40, 84, 48, 84, 46, 88, 30, 89, 30, 87] },
  // body: small pear torso leaning forward
  { g: "body", s: [34, 60, 42, 57, 50, 60, 56, 67, 59, 76, 56, 84, 46, 86, 38, 83, 34, 76, 32, 68] },
  // near leg: big round haunch, short shin down-back to the lifted heel, long foot on its toes
  { g: "leg", ell: [52, 75, 9, 8] },
  { g: "leg", s: [48, 78, 56, 76, 62, 79, 59, 82] },
  { g: "leg", s: [55, 79, 62, 79, 60, 82, 47, 88, 33, 91, 25, 91, 26, 88, 38, 86, 50, 81] },
  // heel spring: a vine coil from the lifted heel to the ground, two and a half loops (output pixels)
  { g: "spring", grid: [57, 84, `
    .####.
    ...###
    .#####
    ##....
    ######
    ...###
    .#####`] },
  // head: big and round (a joey is mostly head), snout pushed forward at the target
  { g: "head", s: [24, 44, 30, 39, 38, 38, 45, 41, 49, 47, 49, 54, 46, 59, 40, 62, 32, 63, 25, 62, 20, 59, 16, 56, 15, 53, 18, 49] },
  // near ear: a big sprout leaf swept back from the crown: thin stem, wide middle, pointed
  // tip, a bite-notch on its back edge
  { g: "ear", s: [38, 42, 40, 36, 41, 31, 44, 25, 49, 20, 55, 16, 61, 14, 60, 19, 57, 25, 58, 27, 53, 31, 47, 35, 43, 40, 42, 44] },
  // arms: little fists up in a wobbly guard below the chin, with air around them; the far
  // fist higher and ahead, the near one lower and bigger
  { g: "farArm", s: [35, 70, 28, 70, 22, 69, 16, 68, 17, 63, 23, 64, 29, 65, 35, 64] },
  { g: "farArm", ell: [13, 66.5, 4, 3.5] },
  { g: "arm", s: [40, 80, 33, 79, 27, 77, 22, 75, 25, 70, 29, 72, 34, 74, 40, 74] },
  { g: "arm", ell: [19, 75.5, 4.5, 4] },
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
sprite("sprigby_sil", { w: 96, h: 96 }, (c) => {
  for (const p of parts) for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (inPart(p, x, y)) c.px(x, y, "k")
})
