// Sprigby (sprig + wallaby) — Plant starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A tiny wallaby joey from Canopy. Its ears are two sprouting leaves, and it can't stop
// bouncing on its springy heels. Battle pose, turned three-quarters to the viewer:
// nervous but game, up on its toes, the far fist tucked in a guard
// against its chest while the near one throws a wobbly uppercut across it (the kickboxer it
// grows into), thick tail planted behind as a third leg.
//
// Stages: silhouette (sprigby_sil). Process and rules: art/BW_STYLE.md; structure follows
// furnaxol.px.js (parts are hand-placed shapes that overlap what they attach to).
// Shapes are drawn in design space (output pixels before scaling); K scales them to starter
// size, anchored on the feet at the bottom centre of the canvas (y = 91).

pal({ k: "#181018" })

const K = 0.8
const T = (pts) => pts.map((v, i) => (i % 2 ? 91 - (91 - v) * K : 48 + (v - 48) * K))

// ---- parts, back to front. {s: polygon} | {ell: [cx, cy, rx, ry]}
const parts = [
  // tail: behind the body, out to the right and down to the ground, tip curling up
  { g: "tail", s: [52, 72, 62, 75, 72, 79, 80, 78, 84, 72, 88, 71, 89, 78, 84, 85, 76, 89, 68, 88, 60, 82, 54, 80] },
  // far side (screen-left, further from the viewer): smaller haunch and a foot pointing
  // down-left, partly hidden by the near leg
  { g: "farLeg", ell: [30, 78, 7, 7] },
  { g: "farLeg", s: [26, 80, 32, 82, 30, 88, 20, 90, 10, 90, 10, 88, 20, 85] },
  // body: pear-shaped torso turned three-quarters to the viewer, chest and pouch facing out
  { g: "body", s: [30, 58, 38, 55, 48, 57, 54, 63, 57, 72, 56, 81, 50, 87, 38, 88, 30, 84, 26, 76, 26, 66] },
  // near side (screen-right, closer): big round haunch, shin back to the heel, long foot
  // running forward-left, heel just off the ground
  { g: "leg", ell: [50, 77, 9, 8.5] },
  { g: "leg", s: [47, 79, 55, 77, 60, 84, 56, 88] },
  { g: "leg", s: [54, 84, 60, 84, 60, 88, 52, 90, 40, 91, 28, 91, 29, 88, 40, 87] },
  // far ear: the same sprout leaf turned away (narrower), standing up on the left of the crown
  { g: "farEar", s: [26, 42, 24, 35, 23, 28, 24, 21, 27, 15, 29, 12, 31, 18, 31, 26, 31, 34, 31, 42] },
  // head: wide and round, turned three-quarters, muzzle pushing out toward the lower left
  { g: "head", s: [26, 40, 32, 35, 40, 34, 48, 37, 53, 43, 54, 51, 51, 57, 44, 61, 36, 62, 28, 61, 21, 60, 15, 58, 13, 54, 16, 50, 21, 46] },
  // near ear: the big sprout leaf, swept up and back from the right of the crown: thin stem,
  // wide middle, pointed tip, a bite-notch on its back edge
  { g: "ear", s: [41, 38, 43, 32, 45, 26, 49, 20, 54, 15, 60, 12, 63, 12, 62, 17, 60, 22, 61, 24, 57, 29, 52, 34, 48, 39, 46, 42] },
  // short joey arms off the chest. The far fist is tucked in a guard under the chin; the near
  // arm throws a short uppercut across the chest, fist coming up under the muzzle
  { g: "farArm", s: [34, 62, 32, 67, 29, 69, 27, 66, 29, 63] },
  { g: "farArm", ell: [29, 66, 4, 3.5] },
  { g: "arm", s: [50, 64, 48, 71, 42, 75, 34, 75, 27, 70, 22, 66, 25, 61, 30, 65, 36, 68, 42, 66, 46, 61] },
  { g: "arm", ell: [21, 62, 5, 4.5] },
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

// Silhouette with each part's contour drawn in, so the three-quarter turn and the arms across
// the chest can be judged before colour
sprite("sprigby_parts", { w: 96, h: 96 }, (c) => {
  const own = new Int16Array(96 * 96).fill(-1)
  parts.forEach((p, i) => { for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (inPart(p, x, y)) own[y * 96 + x] = i })
  const at = (x, y) => (x < 0 || y < 0 || x > 95 || y > 95 ? -1 : own[y * 96 + x])
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
    const i = at(x, y)
    if (i < 0) continue
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const j = at(x + dx, y + dy)
      return j < 0 || (j < i && parts[j].g !== parts[i].g)
    })
    c.px(x, y, edge ? "k" : "#9a94a8")
  }
})
