// Sprigby, redo at true BW basic size. Plant starter, stage 1. 96x96 canvas; the body is about
// 40x46 px like the Unova basics (Snivy 40x37, Scraggy 32x40, Axew 36x45), 3/4 toward
// screen-left. Sleek, not chunky: slim body, thin arms, long feet, leaf ears.
// Personality: the cocky little scrapper.
// Pose: turned three-quarters to the viewer like Oshawott/Scraggy (both eyes visible, short
// muzzle toward the opponent); kangaroo stance leaning back a little on the tail, chin down,
// little fists hanging forward.
// Shapes are blocked at 1x in grid coordinates (44x46 box) and offset onto the canvas by O.

include("../lib/creature.js")
pal({
  k: "#181018",                                            // outline
  F: "#5a3418", f: "#b0703a", u: "#e8a858", U: "#fcdca0",  // fur: line, shadow, base, light
  G: "#1e4a26", g: "#3f8a3a", l: "#78c048", L: "#c0ea70",  // leaf (ears, tail tuft, vine wraps)
  c: "#fbeed2", C: "#dcbe98",                              // cream muzzle and chest
  w: "#ffffff", m: "#7a2430",                              // highlight, mouth
})
const SHADOW = { u: "f", U: "u", f: "F", l: "g", L: "l", g: "G", c: "C", C: "f" }
const LIGHT = { u: "U", f: "u", l: "L", g: "l", c: "c", C: "c" }
const SELOUT = { u: "F", U: "F", f: "F", l: "G", L: "G", g: "G", c: "F", C: "F" }
const { silhouette, partsView, render } = creature({ K: 1, SHADOW, LIGHT, SELOUT })

const OX = 26, OY = 46
const o = (pts) => pts.map((v, i) => v + (i % 2 ? OY : OX))
const oe = ([cx, cy, rx, ry]) => [cx + OX, cy + OY, rx, ry]

// bob: breathing (head, body and arms dip 1 px); ear: the ears' follow-through
function makeParts({ bob = 0, ear = 0 } = {}) {
  return [
  // tail: behind the body on the right, thick at the rump, tapering to the ground, leaf tuft
  { g: "tail", mat: "fur", s: o([29, 34, 33, 37, 37, 40, 40, 42, 41, 45, 37, 45, 33, 42, 28, 38]), c: "u", sh: [1, 1], top: 1 },
  { g: "tuft", s: o([39, 44, 39, 40, 42, 37, 43, 39, 43, 43, 41, 45]), c: "l", sh: [1, 1], top: 1 },
  // far ear (left): the narrower leaf, standing up and back, in shadow, a dark midrib
  { g: "farEar", oy: ear, s: o([16, 11, 14, 7, 13, 3, 14, 0, 16, 2, 18, 6, 19, 10]), c: "g", top: 1,
    tone: [[o([15.5, 9, 14.5, 3, 15.5, 3, 16.5, 9]), "G"]] },
  // far haunch and foot (left), in shadow; the foot points forward toward the opponent
  { g: "farLeg", ell: oe([16.5, 38.5, 4, 4]), c: "f" },
  { g: "farFoot", s: o([18, 41, 19, 43, 16, 44, 7, 44, 6, 43, 9, 42]), c: "f", top: 1 },
  // body: pear-shaped, turned three-quarters to the viewer, cream chest facing out, leaning
  // back a little onto the tail
  { g: "body", mat: "fur", oy: bob, s: o([18, 24, 26, 24, 29, 29, 30, 36, 28, 41, 22, 43, 16, 41, 14, 35, 15, 28]), c: "u", sh: [2, 1],
    tone: [[o([17, 28, 21, 26, 25, 28, 25, 36, 22, 40, 18, 38, 16, 33]), "c"]] },
  // near haunch and foot (right): the big kangaroo thigh, the long foot pointing forward-left
  { g: "leg", mat: "fur", ell: oe([27.5, 38, 5, 5]), c: "u", sh: [2, 1], cast: true, hl: { ell: oe([26, 36.5, 2.2, 1.8]) } },
  { g: "foot", mat: "fur", s: o([29, 41, 32, 43, 30, 45, 18, 45, 15, 44, 17, 43, 25, 42]), c: "u", sh: [0, 1], top: 1 },
  // arms: thin, hanging forward on both sides of the chest, little vine-taped fists low in front
  { g: "farArm", oy: bob, s: o([16, 27, 17, 29, 15, 32, 13, 34, 12, 33, 14, 30]), c: "f" },
  { g: "farFist", oy: bob, ell: oe([12.5, 35, 2.2, 2]), c: "g", top: 1 },
  { g: "arm", mat: "fur", oy: bob, s: o([27, 27, 29, 29, 28, 33, 26, 35, 24, 34, 26, 31]), c: "u", top: 1, cast: true },
  { g: "fist", oy: bob, ell: oe([24.5, 36, 2.5, 2.2]), c: "l", sh: [1, 1], top: 1, cast: true },
  // head: round, turned three-quarters (face toward the viewer and the opponent), chin down
  { g: "head", mat: "fur", oy: bob, ell: oe([22.5, 16.5, 9, 8]), c: "u", sh: [2, 2], cast: true,
    tone: [[o([27, 10, 31, 15, 31, 20, 28, 24, 24, 25, 27, 20, 28, 15]), "f"]], hl: { s: o([16, 12, 19, 9, 24, 9, 20, 11, 17, 13]) } },
  // muzzle: short, pointing toward the opponent (lower left), foreshortened
  { g: "muzzle", mat: "fur", oy: bob, ell: oe([16.5, 20.5, 4.5, 3.5]), c: "c", sh: [1, 1] },
  // near ear (right): the bigger leaf swept up and back, midrib, shadowed lower half
  { g: "ear", oy: ear, s: o([24, 11, 25, 7, 27, 3, 30, 0, 32, 1, 31, 5, 29, 9, 27, 12]), c: "l", top: 1, cast: true,
    tone: [[o([27, 11, 29, 8, 31, 4, 32, 1, 31, 5, 29, 9, 27, 12]), "g"], [o([25, 10, 27, 5, 30, 1, 30.6, 1.6, 28, 5, 26, 10]), "G"]] },
  ]
}
const parts = makeParts()

sprite("sprigby2_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("sprigby2_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))

// Plant face, cocky: smug half-lidded eyes (green iris, white glint), a dark nose, a smirk
// hitched up on the near side with a grass sprig chewed in its corner like a toothpick
function details(c, bob = 0) {
  // near eye: smug half-lid (flat heavy top), green iris, white glint up front
  c.grid(46, 59 + bob, `
    .kkkk
    kkwlk
    kglgk
    .kkk.`)
  // far eye: the same eye turned away (narrower, same height)
  c.grid(40, 59 + bob, `
    .kk
    kwk
    kgk
    .k.`)
  // nose on top of the muzzle tip
  c.grid(38, 64 + bob, `
    kk`)
  // smirk along the bottom of the muzzle, hitched up on the near side; a grass sprig chewed in
  // the front corner, poking out and down
  c.grid(35, 67 + bob, `
    .........k
    ....kkkkk.
    ...g......
    ..gl......
    Ll........`)
}
function frame(c, { bob = 0, ear = 0 } = {}) {
  render(c, makeParts({ bob, ear }), { lines: "sel", shading: true })
  details(c, bob)
}
sprite("sprigby2", { w: 96, h: 96 }, (c) => frame(c))
