// Sprigby, redesign (work in progress). Plant starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the cocky little scrapper who picks fights with things twice its size.
// Pose: kangaroo stance, leaning back on its thick tail like a tripod, chest puffed, chin up,
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
  { g: "farEar", s: [42, 39, 42, 32, 44, 26, 47, 20, 50, 16, 52, 19, 51, 25, 49, 31, 47, 38] },
  // head: big (about 40% of the height), chin up, turned slightly left; cheek tufts
  { g: "head", ell: [47, 45, 12.5, 10.5] },
  { g: "head", s: [35, 48, 32, 51, 35, 51, 33, 54, 37, 53, 39, 51] },
  { g: "head", s: [59, 47, 62, 49, 60, 50, 62, 53, 58, 52, 56, 50] },
  // muzzle: pushing out to the lower left, toward the opponent
  { g: "muzzle", ell: [38, 49, 6.5, 4.5] },
  // near ear (right): the bigger leaf, swept back like a mohawk, a bite-notch on its edge
  { g: "ear", s: [49, 37, 53, 31, 57, 25, 61, 20, 66, 16, 70, 15, 68, 20, 68, 23, 65, 26, 61, 32, 55, 38, 51, 40] },
]

sprite("sprigby_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("sprigby_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))
