// Gobbin, redesign (work in progress). Water starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the sly little schemer, up to something.
// Hook: the goblin shark's spring jaw. It catapults its huge jaw out from under the long blade
// snout; here it's sprung half out, gaping, rimmed with needle teeth, the stretched pale
// "spring" bands showing at the hinges.
// Pose: hunched forward in a tattered hood whose ragged front edge arches over its eyes, the
// sprung jaw jutting out under the snout in a sly grin, lanky arms with clawed fin-hands
// rubbing together in front of its chest. Pointed fin-ears out of slits in the hood. A rope
// belt with a pouch of shiny junk; knobbly legs bent; the tail tip curls out from under the
// cloak's hem, clear of the body.
// Coordinates are output pixels (K = 1); feet on y = 91.

include("../lib/creature.js")
pal({ k: "#181018" })
const { silhouette, partsView } = creature({ K: 1, SHADOW: {}, LIGHT: {}, SELOUT: {} })

const parts = [
  // tail tip curling out from under the hem on the right
  { g: "tail", s: [62, 84, 70, 82, 76, 78, 79, 72, 82, 72, 81, 78, 84, 82, 78, 83, 72, 88, 64, 89] },
  // cloak: the fin hanging from the hood over the shoulders, open at the front, its hem
  // torn into strips
  { g: "cloak", s: [30, 54, 40, 50, 52, 50, 60, 56, 64, 66, 67, 78, 69, 87, 65, 85, 64, 89, 60, 85, 58, 88, 55, 84,
    36, 84, 33, 88, 31, 84, 28, 87, 27, 83, 24, 85, 25, 76, 27, 64] },
  // legs: knobbly, knees bent, clawed feet planted wide
  { g: "farLeg", s: [37, 78, 41, 78, 40, 85, 38, 88, 33, 89, 31, 91, 39, 91, 41, 89, 43, 84] },
  { g: "leg", s: [49, 78, 53, 78, 52, 84, 54, 88, 58, 89, 60, 91, 50, 91, 48, 88, 47, 84] },
  // body: hunched torso in the cloak's opening, a ragged tunic, rope belt and a pouch
  { g: "body", s: [36, 60, 46, 58, 54, 62, 56, 72, 54, 80, 48, 82, 40, 82, 35, 78, 34, 68] },
  { g: "pouch", ell: [56, 81, 3.5, 3.5] },
  // lanky arms, elbows out, clawed fin-hands rubbing together in front of the chest
  { g: "farArm", s: [36, 64, 30, 69, 30, 75, 36, 78, 41, 77, 38, 74, 34, 74, 34, 70, 39, 67] },
  { g: "arm", s: [54, 64, 59, 69, 58, 75, 52, 78, 46, 77, 49, 74, 54, 74, 55, 70, 51, 67] },
  { g: "hands", ell: [43.5, 76.5, 4.5, 3.5] },
  // hood: tattered, sitting over the head; its ragged front edge arches over the eyes
  { g: "hood", s: [24, 52, 23, 44, 26, 36, 32, 30, 40, 27, 48, 28, 55, 32, 59, 38, 61, 46, 60, 54, 57, 56,
    58, 51, 55, 50, 56, 46, 53, 44, 52, 40, 48, 39, 46, 36, 42, 38, 38, 36, 35, 39, 31, 40, 30, 44, 27, 45, 28, 50, 26, 54] },
  // face under the hood's arch: head turned slightly left
  { g: "head", s: [28, 50, 29, 42, 34, 35, 42, 33, 50, 35, 55, 42, 56, 52, 52, 58, 44, 61, 36, 60, 30, 57] },
  // the long goblin-shark snout: a flat blade from the forehead, pointing down-left toward
  // the opponent
  { g: "snout", s: [32, 46, 39, 45, 41, 48, 34, 53, 26, 57, 19, 60, 17, 59, 24, 54] },
  // spring bands: the stretched hinges at the corners of the mouth that throw the jaw out
  { g: "spring", s: [29, 56, 33, 57, 32, 62, 28, 62] },
  { g: "spring", s: [50, 54, 54, 55, 53, 60, 49, 60] },
  // the sprung jaw: huge, thrust out forward and down from under the snout, gaping, needle
  // teeth jagging up all along its rim
  { g: "jaw", s: [31, 60, 27, 63, 21, 64, 16, 66, 13, 68, 14, 71, 20, 74, 30, 75, 40, 73, 48, 69, 53, 63, 53, 58,
    51, 61, 49, 59, 48, 63, 46, 61, 44, 65, 42, 62, 40, 66, 38, 63, 35, 67, 33, 64, 30, 67, 28, 65, 24, 68, 23, 66, 19, 68, 18, 66] },
  // pointed fin-ears out of slits in the hood's sides
  { g: "farEar", s: [31, 46, 20, 42, 14, 40, 18, 45, 31, 52] },
  { g: "ear", s: [53, 45, 64, 41, 71, 38, 67, 44, 54, 52] },
]

sprite("gobbin_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("gobbin_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))
