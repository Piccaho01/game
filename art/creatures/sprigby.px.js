// Sprigby (sprig + wallaby) — Plant starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A tiny wallaby joey from Canopy. Its ears are two sprouting leaves, its heels are coiled
// vine springs, and it can't stop bouncing. Battle pose: nervous but game, up on its toes
// with the heel springs wound, one fist tucked in a guard while the other throws a
// wobbly uppercut (the kickboxer it grows into), head leaning back from its own punch, ears pinned back, thick tail planted behind as a third leg.
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
  { g: "farEar", s: [34, 41, 33, 35, 32, 29, 34, 22, 38, 16, 41, 13, 42, 19, 41, 26, 39, 33, 38, 42] },
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
  { g: "head", s: [30, 43, 36, 38, 44, 37, 51, 40, 55, 46, 55, 53, 52, 58, 46, 61, 38, 62, 31, 61, 26, 58, 22, 55, 21, 52, 24, 48] },
  // near ear: a big sprout leaf swept back from the crown: thin stem, wide middle, pointed
  // tip, a bite-notch on its back edge
  { g: "ear", s: [44, 41, 46, 35, 47, 30, 50, 24, 55, 19, 61, 15, 67, 13, 66, 18, 63, 24, 64, 26, 59, 30, 53, 34, 49, 39, 48, 43] },
  // arms: the head leans back away from the punch. The far fist is tucked in a guard under
  // the chin; the near arm throws an uppercut, elbow low in front of the chest, forearm
  // driving straight up ahead of the snout, fist at eye height
  { g: "farArm", s: [36, 70, 30, 70, 26, 68, 28, 64, 33, 65] },
  { g: "farArm", ell: [25, 66.5, 4, 3.5] },
  { g: "arm", s: [40, 68, 34, 74, 26, 78, 18, 77, 13, 70, 11, 60, 10, 52, 16, 52, 17, 60, 19, 69, 24, 71, 32, 66] },
  { g: "arm", ell: [13, 49, 5, 4.5] },
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
