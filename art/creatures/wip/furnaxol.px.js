// Furnaxol, re-pose (work in progress). Fire starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the show-off artisan, smug about its glasswork.
// Pose: the original (approved) pose turned to face the camera: lunging forward with its weight
// on the planted front leg, blowing a molten glass bubble from its pursed lips like a blowgun
// shot and cradling it in its far hand; near arm braced, fist at the hip; tail raised behind
// as a counterweight with fire on the tip; crown of flame gills; belly furnace glowing.
// Coordinates are output pixels (K = 1); feet on y = 91.

include("../lib/creature.js")
pal({ k: "#181018" })
const { silhouette, partsView } = creature({ K: 1, SHADOW: {}, LIGHT: {}, SELOUT: {} })

const parts = [
  // tail: raised behind on the right as a counterweight, finned paddle tip with fire
  { g: "tail", s: [54, 74, 62, 70, 69, 63, 74, 55, 77, 48, 81, 48, 82, 56, 79, 65, 72, 74, 62, 80, 54, 81] },
  { g: "tailFire", s: [76, 49, 75, 42, 78, 44, 79, 36, 82, 41, 85, 37, 85, 45, 83, 50] },
  // far flame gills (left of the head, behind it), fanning up and out
  { g: "farGill", s: [36, 42, 30, 35, 29, 29, 33, 32, 35, 26, 37, 33, 40, 39] },
  { g: "farGill", s: [33, 45, 26, 39, 20, 36, 24, 35, 22, 30, 29, 34, 35, 41] },
  { g: "farGill", s: [32, 49, 24, 46, 18, 45, 22, 42, 19, 38, 27, 41, 33, 45] },
  // legs, lunging: the front (far, left) leg planted forward with the knee bent over a flat
  // foot, taking the weight; the back (near, right) leg stretched out behind on its toes
  { g: "farLeg", ell: [38, 79, 6, 5] },
  { g: "farLeg", s: [32, 79, 39, 80, 39, 87, 30, 87] },
  { g: "farLeg", s: [24, 91, 25, 88, 30, 86, 40, 86, 42, 89, 42, 91] },
  { g: "leg", ell: [54, 79, 6.5, 5.5] },
  { g: "leg", s: [52, 80, 58, 77, 64, 84, 66, 89, 61, 90, 58, 85] },
  { g: "leg", s: [59, 91, 60, 88, 64, 86, 70, 88, 70, 91] },
  // body: chubby torso leaning forward toward the opponent, belly furnace facing out
  { g: "body", s: [36, 60, 46, 57, 55, 61, 59, 70, 57, 80, 48, 84, 39, 82, 34, 75, 33, 67] },
  // near arm: braced down the right side, fist at the hip
  { g: "arm", s: [54, 62, 59, 66, 60, 72, 58, 77, 54, 78, 53, 73, 55, 69, 53, 65] },
  // head: wide axolotl head thrust forward and turned toward the lower left
  { g: "head", ell: [42, 50, 13.5, 10] },
  // pursed lips pushed out at the front of the face, blowing into the glass
  { g: "lips", ell: [29, 56, 3.5, 3] },
  // near flame gills (right of the head), bigger, fanning up and out
  { g: "gill", s: [50, 43, 55, 34, 57, 27, 60, 32, 63, 26, 64, 34, 55, 46] },
  { g: "gill", s: [53, 47, 61, 40, 68, 37, 66, 41, 72, 41, 66, 46, 55, 51] },
  { g: "gill", s: [54, 52, 63, 50, 70, 52, 67, 54, 72, 58, 63, 57, 55, 56] },
  // the molten glass: a neck of glass from the lips swelling into the bubble, held out in
  // front toward the opponent
  { g: "glass", s: [26, 55, 27, 58, 22, 61, 21, 58] },
  { g: "glass", ell: [17, 63, 6, 6] },
  // far arm reaching forward from the left shoulder, hand cupped under the bubble
  { g: "farArm", s: [36, 62, 30, 66, 24, 69, 18, 70, 15, 69, 17, 67, 22, 66, 28, 63, 34, 60] },
]

sprite("furnaxol_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("furnaxol_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))
