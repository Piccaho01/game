// Sprigby, redesign (work in progress). Plant starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the cocky little scrapper who picks fights with things twice its size.
// Pose: kangaroo stance, leaning back on its thick tail like a tripod, chest puffed, chin
// tucked down glaring up from under its brows, head right on its shoulders,
// short vine-taped fists hanging low and forward ("come at me"). Leaf ears swept back like a
// fighter's mohawk; a leaf plaster on one cheek.
// Coordinates are output pixels (K = 1); feet on y = 91.

include("../lib/creature.js")
pal({ k: "#181018" })
const { silhouette, partsView } = creature({ K: 1, SHADOW: {}, LIGHT: {}, SELOUT: {} })

const parts = [
  // tail: thick, from the rump down to the ground behind on the right, the tripod's third leg
  { g: "tail", s: [54, 72, 62, 77, 70, 82, 78, 85, 84, 83, 86, 78, 89, 79, 88, 86, 80, 91, 64, 91, 56, 86, 52, 78] },
  // haunches: far (left) smaller, near (right) bigger
  { g: "farLeg", ell: [38, 80, 7, 6.5] },
  // feet planted forward toward the camera and the opponent, long toes, foreshortened
  { g: "farFoot", s: [30, 85, 40, 84, 41, 89, 37, 91, 25, 91, 25, 88] },
  // body: pear, leaning back onto the tail, chest puffed out
  { g: "body", s: [42, 56, 54, 55, 60, 61, 61, 71, 58, 81, 50, 86, 40, 85, 35, 79, 35, 68, 38, 61] },
  { g: "leg", ell: [54, 80, 8, 7.5] },
  { g: "foot", s: [46, 85, 57, 84, 59, 88, 56, 91, 42, 91, 42, 88] },
  // arms: short, elbows out like a gorilla (air between arm and body), forearms hanging
  // forward, vine-taped fists low in front
  { g: "farArm", s: [39, 61, 33, 63, 28, 67, 27, 72, 30, 74, 32, 69, 35, 66, 40, 65] },
  { g: "farFist", ell: [29.5, 75.5, 4, 3.5] },
  { g: "arm", s: [56, 61, 62, 63, 67, 67, 68, 72, 65, 74, 63, 69, 60, 66, 55, 65] },
  { g: "fist", ell: [65.5, 76, 4.5, 4] },
  // far ear (left): leaf swept up and back
  { g: "farEar", s: [41, 44, 41, 37, 43, 31, 46, 25, 49, 21, 51, 24, 50, 30, 48, 36, 46, 43] },
  // head: big (about 40% of the height), sitting right on the shoulders with no neck, chin
  // tucked down (glaring up from under its brows), turned slightly left; cheek tufts
  { g: "head", ell: [46, 50, 12.5, 10] },
  { g: "head", s: [34, 53, 31, 56, 34, 56, 32, 59, 36, 58, 38, 56] },
  { g: "head", s: [58, 52, 61, 54, 59, 55, 61, 58, 57, 57, 55, 55] },
  // muzzle: pointing down and out to the lower left, toward the opponent
  { g: "muzzle", ell: [38, 55, 6.5, 4.5] },
  // near ear (right): the bigger leaf, swept back like a mohawk, a bite-notch on its edge
  { g: "ear", s: [48, 42, 52, 36, 56, 30, 60, 25, 65, 21, 69, 20, 67, 25, 67, 28, 64, 31, 60, 37, 54, 43, 50, 45] },
]

sprite("sprigby_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("sprigby_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))
