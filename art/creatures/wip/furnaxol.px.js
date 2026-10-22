// Furnaxol, re-pose (work in progress). Fire starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the show-off artisan, smug about its glasswork.
// Pose: chin up, smug grin, one hand on its hip, the other holding up a freshly blown glowing
// glass bubble like a trophy. Its crown of flame gills fans out around the wide axolotl head;
// the finned tail curls up behind with fire on the tip. Belly furnace glowing.
// Coordinates are output pixels (K = 1); feet on y = 91.

include("../lib/creature.js")
pal({ k: "#181018" })
const { silhouette, partsView } = creature({ K: 1, SHADOW: {}, LIGHT: {}, SELOUT: {} })

const parts = [
  // tail: curling up behind on the right, fire on the tip
  { g: "tail", s: [52, 74, 62, 73, 71, 70, 77, 64, 79, 58, 85, 58, 85, 66, 80, 74, 72, 80, 62, 84, 52, 85] },
  { g: "tailFire", s: [78, 59, 77, 52, 80, 54, 81, 46, 84, 51, 87, 47, 88, 55, 86, 60] },
  // far flame gills (left side of the head), fanning out
  { g: "farGill", s: [36, 43, 26, 34, 24, 28, 28, 31, 29, 25, 33, 31, 39, 39] },
  { g: "farGill", s: [33, 47, 22, 42, 16, 40, 20, 38, 17, 34, 24, 37, 34, 42] },
  { g: "farGill", s: [33, 52, 22, 51, 15, 51, 19, 48, 16, 45, 24, 46, 33, 48] },
  // legs: stubby, planted wide
  { g: "farLeg", s: [35, 80, 42, 80, 42, 87, 40, 91, 30, 91, 30, 88, 35, 87] },
  { g: "leg", s: [48, 80, 55, 80, 56, 87, 61, 88, 61, 91, 50, 91, 48, 87] },
  // body: chubby upright torso, belly furnace facing out
  { g: "body", ell: [45, 70, 11.5, 12.5] },
  // near arm: hand on the hip, elbow out
  { g: "arm", s: [54, 62, 60, 65, 62, 70, 58, 75, 54, 76, 53, 72, 57, 69, 55, 66] },
  // head: wide axolotl head, chin up, turned slightly left
  { g: "head", ell: [44, 49, 14.5, 11] },
  // near flame gills (right side), bigger, fanning out
  { g: "gill", s: [51, 43, 58, 33, 60, 26, 63, 31, 66, 25, 66, 33, 56, 45] },
  { g: "gill", s: [54, 46, 64, 39, 70, 36, 68, 40, 74, 39, 69, 44, 56, 50] },
  { g: "gill", s: [55, 51, 66, 49, 73, 50, 70, 52, 75, 55, 66, 55, 56, 55] },
  // far arm raised high on the left, holding up the glowing glass bubble beside its head
  { g: "farArm", s: [37, 63, 31, 61, 26, 57, 23, 52, 28, 50, 30, 55, 34, 58, 38, 58] },
  { g: "bubble", ell: [24, 45, 6.5, 6.5] },
]

sprite("furnaxol_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("furnaxol_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))
