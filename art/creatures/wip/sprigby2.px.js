// Sprigby, redo at true BW basic size. Plant starter, stage 1. 96x96 canvas; the body is about
// 40x46 px like the Unova basics (Snivy 40x37, Scraggy 32x40, Axew 36x45), 3/4 toward
// screen-left. Sleek, not chunky: slim body, thin arms, long feet, leaf ears.
// Personality: the cocky little scrapper.
// Pose: kangaroo stance leaning back on the tail, chin down, little fists hanging forward.
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
  // far ear (left, behind): the narrower leaf, in shadow, a dark midrib
  { g: "farEar", oy: ear, s: o([17, 12, 15, 8, 14, 4, 16, 1, 18, 0, 19, 4, 19, 9, 20, 12]), c: "g", top: 1,
    tone: [[o([16.5, 11, 16.5, 3, 17.5, 3, 17.5, 11]), "G"]] },
  // tail: thick at the rump, tapering to the ground behind, a leaf tuft on the tip
  { g: "tail", mat: "fur", s: o([28, 35, 31, 37, 35, 40, 38, 42, 41, 42, 41, 45, 37, 45, 33, 43, 29, 40, 27, 38]), c: "u", sh: [1, 1], top: 1 },
  { g: "tuft", s: o([39, 44, 39, 40, 42, 37, 43, 39, 43, 43, 41, 45]), c: "l", sh: [1, 1], top: 1 },
  // far foot (left), poking ahead, in shadow
  { g: "farFoot", s: o([16, 40, 18, 41, 16, 43, 5, 43, 4, 42, 6, 41]), c: "f", top: 1 },
  // body: slim, leaning back onto the tail; cream chest
  { g: "body", mat: "fur", oy: bob, s: o([18, 23, 25, 23, 28, 28, 28, 35, 26, 38, 19, 38, 16, 33, 16, 27]), c: "u", sh: [2, 1],
    tone: [[o([17, 27, 20, 25, 23, 27, 23, 34, 20, 37, 17, 33]), "c"]] },
  // far arm (left): thin, hanging forward with air between it and the chest; fist in shadow
  { g: "farArm", oy: bob, s: o([16, 26, 18, 27, 15, 30, 13, 32, 11, 32, 13, 29]), c: "f" },
  { g: "farFist", oy: bob, ell: oe([11.5, 33, 2.4, 2.1]), c: "g", top: 1 },
  // haunch: the big kangaroo thigh
  { g: "leg", mat: "fur", ell: oe([26, 36, 5, 5.5]), c: "u", sh: [2, 1], cast: true, hl: { ell: oe([24.5, 34, 2.5, 2]) } },
  // near foot: long and thin, running forward along the ground
  { g: "foot", mat: "fur", s: o([27, 39, 31, 41, 30, 43, 24, 44, 10, 44, 8, 43, 10, 42, 22, 41]), c: "u", sh: [0, 1], top: 1 },
  // head: skull, muzzle out to the left and down (chin tucked); cream muzzle
  { g: "head", mat: "fur", oy: bob, ell: oe([20.5, 17.5, 8.5, 7.5]), c: "u", sh: [2, 2], cast: true,
    tone: [[o([24, 11, 28, 15, 29, 19, 27, 23, 23, 25, 25, 20, 25, 15]), "f"]], hl: { s: o([14, 14, 17, 11, 21, 10, 17, 12, 15, 15]) } },
  { g: "head", mat: "fur", oy: bob, s: o([13, 15, 8, 17, 6, 19, 6, 21, 9, 23, 14, 24, 17, 22]), c: "c",
    tone: [[o([7, 22, 9, 23, 14, 24, 16, 23, 12, 22]), "C"]] },
  // near ear (right): the bigger leaf swept up and back, midrib, shadowed lower half
  { g: "ear", oy: ear, s: o([21, 13, 21, 9, 23, 5, 26, 2, 30, 0, 30, 3, 28, 7, 26, 10, 24, 13]), c: "l", top: 1, cast: true,
    tone: [[o([24, 12, 26, 9, 28, 6, 30, 1, 30, 3, 28, 7, 26, 10, 24, 13]), "g"], [o([22, 12, 24, 7, 29, 1, 29.6, 1.6, 25, 7, 23, 12]), "G"]] },
  // near arm (right): thin, hanging forward across the chest; vine-taped fist
  { g: "arm", mat: "fur", oy: bob, s: o([23, 26, 25, 27, 22, 31, 20, 33, 18, 33, 21, 29]), c: "u", top: 1, cast: true },
  { g: "fist", oy: bob, ell: oe([18.5, 34, 2.6, 2.2]), c: "l", sh: [1, 1], top: 1, cast: true },
  ]
}
const parts = makeParts()

sprite("sprigby2_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("sprigby2_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))

// Plant face, cocky: smug half-lidded eyes (green iris, white glint), a dark nose, a smirk
// hitched up on the near side with a grass sprig chewed in its corner like a toothpick
function details(c, bob = 0) {
  // near eye: smug half-lid (flat heavy top), green iris, white glint up front
  c.grid(41, 59 + bob, `
    .kkkk
    kkwlk
    kglgk
    .kkk.`)
  // far eye: the same eye turned away (narrower, same height)
  c.grid(37, 59 + bob, `
    .kk
    kwk
    kgk
    .k.`)
  // nose on the muzzle tip
  c.grid(31, 62 + bob, `
    kk
    k.`)
  // smirk along the bottom of the muzzle, hitched up on the near side; a grass sprig chewed in
  // the front corner, poking out and down
  c.grid(30, 65 + bob, `
    ........k
    ...kkkkk.
    ..g......
    .gl......
    Ll.......`)
}
function frame(c, { bob = 0, ear = 0 } = {}) {
  render(c, makeParts({ bob, ear }), { lines: "sel", shading: true })
  details(c, bob)
}
sprite("sprigby2", { w: 96, h: 96 }, (c) => frame(c))
