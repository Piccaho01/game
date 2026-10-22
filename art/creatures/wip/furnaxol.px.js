// Furnaxol, re-pose (work in progress). Fire starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the show-off artisan, smug about its glasswork.
// Pose: the original (approved) pose turned to face the camera: lunging forward with its weight
// on the planted front leg, blowing a molten glass bubble from its pursed lips like a blowgun
// shot and cradling it in its far hand; near arm braced, fist at the hip; tail raised behind
// as a counterweight with fire on the tip; crown of flame gills; belly furnace glowing.
// Coordinates are output pixels (K = 1); feet on y = 91.

include("../lib/creature.js")
pal({
  k: "#181018",                                       // outline
  D: "#6e2230", S: "#b04a58", s: "#ec8a78", L: "#ffc2a8", // skin: line, shadow, base, light
  c: "#f9dcbc", C: "#d89c88",                         // cream throat/belly: base, shadow
  R: "#d8341c", o: "#f88a1c", y: "#ffd23c", Y: "#fff6b8", // fire / molten glass
  w: "#ffffff", m: "#6a1e2c",                         // highlight, mouth
})
const SHADOW = { s: "S", c: "C", S: "D", o: "R", y: "o", R: "D", L: "s", Y: "y" }
const LIGHT = { s: "L", S: "s", o: "y", y: "Y", c: "c", R: "o" }
const SELOUT = { s: "D", L: "D", S: "D", c: "D", C: "D", o: "R", y: "R", Y: "o", R: "D" }
const { silhouette, partsView, render } = creature({ K: 1, SHADOW, LIGHT, SELOUT })

// flame flicker: vertical wobble per vertex, zero at phase 0 so frame 0 is the still
const flick = (pts, ph, amp, seed = 0) => pts.map((v, i) =>
  i % 2 ? v + amp * (Math.sin(2 * Math.PI * ph + seed + i * 0.9) - Math.sin(seed + i * 0.9)) : v)

// bob: breathing (head side dips, output px); ph: animation phase 0..1 (flames flicker, the
// glass and the belly furnace pulse)
function makeParts({ bob = 0, ph = 0 } = {}) {
  const pulse = Math.sin(2 * Math.PI * ph)
  return [
  // tail: raised behind on the right as a counterweight, finned paddle tip with fire
  { g: "tail", s: [54, 74, 62, 70, 69, 63, 74, 55, 77, 48, 81, 48, 82, 56, 79, 65, 72, 74, 62, 80, 54, 81], c: "s", sh: [2, 2],
    hl: { s: [56, 74, 64, 69, 70, 61, 74, 52, 72, 60, 66, 68] } },
  { g: "tailFire", s: flick([76, 49, 75, 42, 78, 44, 79, 36, 82, 41, 85, 37, 85, 45, 83, 50], ph, 1.2, 2), c: "o", sh: [1, 1],
    tone: [[flick([77, 49, 77, 44, 79, 46, 80, 40, 82, 44, 84, 42, 83, 48, 82, 50], ph, 1.2, 2), "y"]] },
  // far flame gills (left of the head, behind it), in the deeper red
  { g: "farGill", oy: bob, s: flick([36, 42, 30, 35, 29, 29, 33, 32, 35, 26, 37, 33, 40, 39], ph, 1, 3), c: "R", top: 1 },
  { g: "farGill2", oy: bob, s: flick([33, 45, 26, 39, 20, 36, 24, 35, 22, 30, 29, 34, 35, 41], ph, 1, 4), c: "R", top: 1 },
  { g: "farGill3", oy: bob, s: flick([32, 49, 24, 46, 18, 45, 22, 42, 19, 38, 27, 41, 33, 45], ph, 1, 5), c: "R", top: 1 },
  // legs, lunging: the front (far, left) leg planted forward with the knee bent over a flat
  // foot, taking the weight; the back (near, right) leg stretched out behind on its toes
  { g: "farLeg", ell: [38, 79, 6, 5], c: "S" },
  { g: "farLeg", s: [32, 79, 39, 80, 39, 87, 30, 87], c: "S" },
  { g: "farLeg", s: [24, 91, 25, 88, 30, 86, 40, 86, 42, 89, 42, 91], c: "S", top: 1 },
  { g: "leg", ell: [54, 79, 6.5, 5.5], c: "s", sh: [2, 1] },
  { g: "leg", s: [52, 80, 58, 77, 64, 84, 66, 89, 61, 90, 58, 85], c: "s", sh: [1, 1] },
  { g: "leg", s: [59, 91, 60, 88, 64, 86, 70, 88, 70, 91], c: "s", top: 1 },
  // body: chubby torso leaning forward toward the opponent; a fired-glass belly window over
  // the ember core glowing through (emissive: never shaded)
  { g: "body", s: [36, 60, 46, 57, 55, 61, 59, 70, 57, 80, 48, 84, 39, 82, 34, 75, 33, 67], c: "s", sh: [2, 2],
    tone: [[[38, 63, 47, 61, 53, 65, 54, 75, 49, 81, 41, 80, 37, 74, 36, 68], "c"],
           [{ ell: [45, 72, 5.5, 7] }, "Y", true],
           [[40, 74, 42, 68, 45, 65, 48, 67, 50, 72, 49, 77, 45, 79, 41, 78], "o", true],
           [flick([42, 77, 43, 73, 44, 75, 45, 69, 47, 74, 48, 72, 48, 77, 45, 78], ph, 1, 1), "y", true]] },
  // near arm: braced down the right side, fist at the hip
  { g: "arm", s: [54, 62, 59, 66, 60, 72, 58, 77, 54, 78, 53, 73, 55, 69, 53, 65], c: "s", sh: [1, 1], top: 1, cast: true },
  // head: wide axolotl head thrust forward and turned toward the lower left; cream throat
  { g: "head", oy: bob, ell: [42, 49, 15.5, 11.5], c: "s", sh: [2, 2], cast: true,
    tone: [[[28, 54, 36, 57, 46, 58, 56, 54, 52, 59, 42, 61, 32, 59], "c"]],
    hl: { s: [30, 44, 35, 40, 44, 38, 37, 41, 32, 45] } },
  // puffed cheek and pursed lips pushed out at the front of the face, blowing into the glass
  { g: "lips", oy: bob, ell: [27, 56, 3.5, 3], c: "s", sh: [1, 1] },
  // near flame gills (right of the head), bigger, orange with yellow tips
  { g: "gill", oy: bob, s: flick([50, 43, 55, 34, 57, 27, 60, 32, 63, 26, 64, 34, 55, 46], ph, 1.4, 0), c: "o", sh: [1, 1], top: 2, cast: true },
  { g: "gill2", oy: bob, s: flick([53, 47, 61, 40, 68, 37, 66, 41, 72, 41, 66, 46, 55, 51], ph, 1.4, 1), c: "o", sh: [1, 1], top: 2, cast: true },
  { g: "gill3", oy: bob, s: flick([54, 52, 63, 50, 70, 52, 67, 54, 72, 58, 63, 57, 55, 56], ph, 1.4, 2), c: "o", sh: [1, 1], top: 2, cast: true },
  // the molten glass (emissive): a neck of glass from the lips swelling into the bubble, held
  // out in front toward the opponent, a hot core and white glints
  { g: "glass", oy: bob, s: [24, 55, 25, 58, 21, 61, 20, 58], c: "y" },
  { g: "bubble", oy: bob, ell: [17, 63, 6 + 0.4 * pulse, 6 + 0.4 * pulse], c: "y", sh: [2, 2],
    tone: [[{ ell: [15.5, 61.5, 3 + 0.5 * pulse, 3 + 0.5 * pulse] }, "Y"]], glint: [[14, 59], [15, 59]] },
  // far arm reaching forward from the left shoulder, hand cupped under the bubble
  { g: "farArm", s: [36, 62, 30, 66, 24, 69, 18, 70, 15, 69, 17, 67, 22, 66, 28, 63, 34, 60], c: "S", top: 1 },
  ]
}
const parts = makeParts()

sprite("furnaxol_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("furnaxol_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))

// Stage 2-3: flat colours, shading
sprite("furnaxol_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))
sprite("furnaxol_shaded", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true, shading: true }))

// Fire face, smug artisan: thick lids lowered into a focused squint that flicks up at the outer
// corner, pupils hard against the front, locked on the target; brows raised in confidence;
// cheeks puffed round the glass
function details(c, bob = 0) {
  // near eye: heavy lid lowered into a focused squint, flicking up at the outer corner;
  // pupil hard against the front, locked on the target
  c.grid(43, 43 + bob, `
    .......k
    ..kkkkkk
    .kkkkkkk
    kkkwyyyk
    kkkyyyyk
    kkkooook
    .kkoook.
    ..kkkk..`)
  // far eye: the same eye turned away (narrower, same height)
  c.grid(31, 43 + bob, `
    k....
    kkkk.
    kkkkk
    kkwyk
    kkyyk
    kkook
    .kook
    ..kk.`)
  // puffed near cheek, round with the held breath
  c.grid(36, 51 + bob, `
    .LLL.
    LLLLL
    .sss.`)
  // pursed lips wrapped around the glass neck
  c.grid(24, 54 + bob, `
    kD
    Ls
    Ls
    kD`)
}
function frame(c, { bob = 0, ph = 0 } = {}) {
  render(c, makeParts({ bob, ph }), { lines: "sel", shading: true })
  details(c, bob)
}
sprite("furnaxol", { w: 96, h: 96 }, (c) => frame(c))
