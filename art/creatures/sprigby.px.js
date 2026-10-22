// Sprigby (sprig + wallaby) — Plant starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A tiny wallaby joey from Canopy. Its ears are two sprouting leaves, a leaf tuft grows on its
// tail tip, and it can't stop bouncing on its springy heels. Battle pose, turned three-quarters
// to the viewer: nervous but game, up on its toes, the far fist tucked in a guard against its
// chest while the near one throws a wobbly uppercut across it (the kickboxer it grows into),
// thick tail planted behind as a third leg.
//
// Stages: silhouette (sprigby_sil, sprigby_parts), flat colours (sprigby_flats), shading
// (sprigby_shaded), final still (sprigby), BW2-style idle loop (sprigby_idle). Process and
// rules: art/BW_STYLE.md; structure follows furnaxol.px.js (parts are hand-placed shapes that
// overlap what they attach to). Shapes are drawn in design space (output pixels before
// scaling); K scales them to starter size. The renderer is shared: lib/creature.js.

include("lib/creature.js")

pal({
  k: "#181018",                                            // outline
  F: "#4a3020", f: "#9a6a44", u: "#d6a46a", U: "#f4d4a0",  // fur: line, shadow, base, light
  G: "#1e4a26", g: "#3f8a3a", l: "#78c048", L: "#c0ea70",  // leaf
  c: "#fbeed2", C: "#dcbe98",                              // cream muzzle and pouch
  w: "#ffffff", m: "#7a2430",                              // highlight, mouth
})
const SHADOW = { u: "f", U: "u", f: "F", l: "g", L: "l", g: "G", c: "C", C: "f" }
const LIGHT = { u: "U", f: "u", l: "L", g: "l", c: "c", C: "c" }
const SELOUT = { u: "F", U: "F", f: "F", l: "G", L: "G", g: "G", c: "F", C: "F" }
const K = 0.8
const { T, silhouette, partsView, render } = creature({ K, SHADOW, LIGHT, SELOUT })

// ---- parts, back to front (see lib/creature.js for the fields). bob: the bounce (body, head
// and arms rise, output px; the feet stay planted); ear: the ears' lagging follow-through.
// Three-quarter turn: the far side is on the left, the near side on the right.
function makeParts({ bob = 0, ear = 0 } = {}) {
  return [
  // tail: behind the body, out to the right and down to the ground, a leaf tuft at the
  // curled-up tip
  { g: "tail", mat: "fur", s: [52, 72, 62, 75, 72, 79, 80, 78, 84, 72, 88, 71, 89, 78, 84, 85, 76, 89, 68, 88, 60, 82, 54, 80],
    c: "u", sh: [2, 2], tone: [[[82, 76, 84, 71, 88, 69, 91, 70, 90, 78, 86, 81], "l"]],
    hl: { s: [60, 76, 72, 80, 80, 79, 82, 76, 76, 79, 66, 78] } },
  // far side (screen-left, further from the viewer): smaller haunch and a foot pointing
  // down-left, all in the shadow tone
  { g: "farLeg", s: [26, 80, 32, 82, 30, 88, 20, 90, 10, 90, 10, 88, 20, 85], c: "f", top: 1 },
  { g: "farLeg", ell: [30, 78, 7, 7], c: "f" },
  // body: pear-shaped torso turned three-quarters, chest and cream pouch facing out
  { g: "body", mat: "fur", oy: bob, s: [30, 58, 38, 55, 48, 57, 54, 63, 57, 72, 56, 81, 50, 87, 38, 88, 30, 84, 26, 76, 26, 66],
    c: "u", sh: [2, 2], tone: [[[31, 64, 40, 62, 47, 65, 49, 74, 46, 83, 37, 85, 31, 79, 30, 70], "c"]] },
  // near side (screen-right, closer): big round haunch, shin back to the heel, long foot
  // running forward-left, heel just off the ground
  { g: "leg", mat: "fur", ell: [50, 77, 9, 8.5], c: "u", sh: [2, 2], cast: true, hl: { ell: [47, 73, 5, 3.5] } },
  { g: "leg", mat: "fur", s: [47, 79, 55, 77, 60, 84, 56, 88], c: "u", sh: [1, 1] },
  { g: "foot", mat: "fur", s: [54, 84, 60, 84, 60, 88, 52, 90, 40, 91, 28, 91, 29, 88, 40, 87], c: "u", sh: [1, 1], top: 1 },
  // far ear: the same sprout leaf turned away (narrower), on the left of the crown, in shadow,
  // a darker midrib
  { g: "farEar", oy: ear, s: [26, 42, 24, 35, 23, 28, 24, 21, 27, 15, 29, 12, 31, 18, 31, 26, 31, 34, 31, 42], c: "g",
    tone: [[[27, 40, 27, 27, 28, 16, 29, 16, 29, 27, 29, 40], "G"]], top: 1 },
  // head: wide and round, turned three-quarters, cream muzzle pushing out to the lower left
  { g: "head", mat: "fur", oy: bob, s: [26, 40, 32, 35, 40, 34, 48, 37, 53, 43, 54, 51, 51, 57, 44, 61, 36, 62, 28, 61, 21, 60, 15, 58, 13, 54, 16, 50, 21, 46],
    c: "u", sh: [2, 2], cast: true, tone: [[[13, 54, 16, 50, 22, 49, 28, 51, 31, 56, 29, 61, 21, 61, 15, 58], "c"]],
    hl: { s: [24, 43, 30, 38, 38, 36, 33, 39, 27, 44] } },
  // near ear: the big sprout leaf, swept up and back from the right of the crown: wide
  // middle, pointed tip, a bite-notch on its back edge, a midrib down its length
  { g: "ear", oy: ear, s: [41, 38, 43, 32, 45, 26, 49, 20, 54, 15, 60, 12, 63, 12, 62, 17, 60, 22, 61, 24, 57, 29, 52, 34, 48, 39, 46, 42],
    c: "l", sh: [1, 1], top: 1, cast: true,
    tone: [[[44, 40, 48, 31, 54, 22, 61, 13, 62, 14, 55, 23, 49, 32, 46, 40], "g"]] },
  // short joey arms off the chest. The far fist is tucked in a guard under the chin; the near
  // arm throws a short uppercut across the chest, fist coming up under the muzzle
  { g: "farArm", oy: bob, s: [34, 62, 32, 67, 29, 69, 27, 66, 29, 63], c: "f" },
  { g: "farArm", oy: bob, ell: [29, 66, 4, 3.5], c: "f", top: 1 },
  { g: "arm", mat: "fur", oy: bob, s: [50, 64, 48, 71, 42, 75, 34, 75, 27, 70, 22, 66, 25, 61, 30, 65, 36, 68, 42, 66, 46, 61],
    c: "u", sh: [1, 1], top: 1, cast: true },
  { g: "fist", oy: bob, ell: [21, 62, 5, 4.5], c: "u", sh: [1, 1], top: 1, cast: true },
  ]
}
const parts = makeParts()

// Stage 1: silhouette, and the same with each part outlined
sprite("sprigby_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("sprigby_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))

// Stage 2: flat colours, contours where parts overlap
sprite("sprigby_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))

// Stage 3: shading
sprite("sprigby_shaded", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true, shading: true }))

// Stages 4-5: selective outline, then hand-placed details in output pixels
// Plant face: big eyes with a green iris and a leaf-shaped glint, the pupil hard against the
// front (on the target); brows angled down toward the nose, nervous but determined. A dark
// nose on the muzzle tip and a small mouth with one buck tooth.
function details(c, bob = 0) {
  // near eye and brow
  c.grid(33, 47 + bob, `
    .....FF
    .FFFF..
    .kkkkk.
    kkkLlgk
    kkkllwk
    kkkglwk
    kglllwk
    .kkkkk.`)
  // far eye: the same eye turned away (narrower, same height), and its brow
  c.grid(26, 49 + bob, `
    FF..
    .kkk
    kkLw
    kklw
    kkgw
    kgLw
    .kkk`)
  // nose on the muzzle tip
  c.grid(21, 57 + bob, `
    kk
    kk`)
  // mouth: a short line with one buck tooth
  c.grid(23, 62 + bob, `
    kkkkk
    .kwk.`)
  // knuckle lines on the uppercut fist
  c.vline(24, 65 + bob, 2, "F"); c.vline(26, 65 + bob, 2, "F")
}
function frame(c, { bob = 0, ear = 0 } = {}) {
  render(c, makeParts({ bob, ear }), { lines: "sel", shading: true })
  details(c, bob)
}

// Final still
sprite("sprigby", { w: 96, h: 96 }, (c) => frame(c))

// BW2-style idle loop: a nervous little double bounce (body, head and arms rise 1 px, feet
// planted), the leaf ears following a frame late. 12 frames at 10 fps; frame 0 is the still.
const BOUNCE = [0, -1, -1, 0, 0, 0, 0, -1, -1, 0, 0, 0]
anim("sprigby_idle", { w: 96, h: 96, frames: 12, fps: 10 }, (c) =>
  frame(c, { bob: BOUNCE[c.frame], ear: BOUNCE[(c.frame + 11) % 12] }))
