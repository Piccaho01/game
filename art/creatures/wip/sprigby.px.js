// Sprigby, redesign (work in progress). Plant starter, stage 1. 96x96 BW battle sprite, 3/4
// toward screen-left like the BW references (art/BW_STYLE.md rule 19).
// Personality: the cocky little scrapper who picks fights with things twice its size.
// Pose: kangaroo stance, leaning back on its thick tail like a tripod, chin tucked so it glares
// up from under its brows, short arms hanging forward with vine-taped fists. Leaf ears swept
// back. Cute first (rule 25): a joey, not a thug.
// Coordinates are output pixels (K = 1); feet on y = 91. Shapes are organic polygons, not
// ellipses (rule 24).

include("../lib/creature.js")
pal({
  k: "#181018",                                            // outline
  F: "#4a3020", f: "#9a6a44", u: "#d6a46a", U: "#f4d4a0",  // fur: line, shadow, base, light
  G: "#1e4a26", g: "#3f8a3a", l: "#78c048", L: "#c0ea70",  // leaf (ears, sprout, tail tuft, vine wraps)
  c: "#fbeed2", C: "#dcbe98",                              // cream muzzle and chest
  w: "#ffffff", m: "#7a2430",                              // highlight, mouth
})
const SHADOW = { u: "f", U: "u", f: "F", l: "g", L: "l", g: "G", c: "C", C: "f" }
const LIGHT = { u: "U", f: "u", l: "L", g: "l", c: "c", C: "c" }
const SELOUT = { u: "F", U: "F", f: "F", l: "G", L: "G", g: "G", c: "F", C: "F" }
const { silhouette, partsView, render } = creature({ K: 1, SHADOW, LIGHT, SELOUT })

// vine-tape stripes across a fist
const wraps = (y0) => ({ fn: (x, y) => (y - y0) % 3 === 2 })

// bob: breathing (head, body and arms dip, output px); ear: the ears' follow-through
function makeParts({ bob = 0, ear = 0 } = {}) {
  return [
  // far ear (creature's left, behind): narrower leaf standing up behind the crown
  { g: "farEar", oy: ear, s: [39, 40, 39, 33, 41, 27, 44, 22, 47, 19, 48, 23, 47, 29, 45, 35, 44, 40], c: "g", top: 1,
    tone: [[[41, 38, 42, 30, 46, 22, 47, 23, 43, 31, 42, 38], "G"]] },
  // tail: thick from the rump, down to the ground behind on the right, tip curling up
  { g: "tail", mat: "fur", s: [58, 76, 64, 79, 72, 83, 80, 86, 85, 85, 87, 80, 90, 79, 91, 84, 88, 89, 80, 91, 66, 91, 60, 88], c: "u", sh: [2, 2], top: 1,
    tone: [[[60, 86, 70, 88, 82, 89, 88, 86, 91, 84, 89, 90, 80, 92, 62, 92], "f"], [[84, 86, 86, 80, 89, 78, 92, 79, 92, 85, 89, 88], "l"]] },
  // far foot (left), poking out ahead of the near one
  { g: "farFoot", s: [30, 86, 36, 85, 38, 88, 36, 90, 24, 91, 20, 90, 21, 88], c: "f", top: 1 },
  // torso, 3/4: chest toward the opponent, leaning back onto the tail
  { g: "body", mat: "fur", oy: bob, s: [36, 60, 44, 58, 52, 59, 58, 63, 61, 70, 61, 78, 57, 84, 48, 86, 40, 84, 35, 78, 33, 70, 34, 64], c: "u",
    tone: [[[37, 63, 44, 61, 50, 63, 52, 70, 50, 80, 44, 84, 38, 81, 35, 74, 35, 67], "c"],
           [[44, 78, 50, 74, 51, 80, 46, 84, 40, 83], "C"],
           [[52, 60, 58, 63, 61, 70, 61, 78, 57, 84, 50, 86, 52, 78, 54, 70, 53, 63], "f"]] },
  // far arm (left): hanging forward in front of the chest, elbow slightly out
  { g: "farArm", oy: bob, s: [38, 61, 34, 63, 30, 67, 27, 71, 31, 73, 34, 70, 38, 67, 42, 65], c: "f", top: 1 },
  // near haunch (right): the big kangaroo thigh
  { g: "leg", mat: "fur", s: [50, 72, 58, 70, 64, 74, 66, 80, 64, 86, 58, 88, 50, 86, 47, 80], c: "u", cast: true,
    tone: [[[57, 79, 63, 75, 66, 80, 64, 86, 58, 88, 51, 87, 57, 84], "f"]], hl: { s: [49, 76, 54, 71, 59, 71, 53, 74] } },
  // near foot: long, running forward along the ground
  { g: "foot", mat: "fur", s: [58, 86, 60, 89, 58, 91, 34, 91, 30, 90, 31, 88, 38, 87, 48, 86], c: "u", top: 1,
    tone: [[[30, 90, 60, 90, 60, 92, 30, 92], "f"]] },
  // head, 3/4 left with the chin tucked: dome, brow, muzzle down-left, cheek tufts behind
  { g: "head", mat: "fur", oy: bob, s: [25, 50, 28, 45, 33, 41, 39, 39, 46, 38, 52, 40, 56, 44, 57, 49, 56, 53, 58, 56, 55, 57, 56, 60,
    52, 59, 48, 61, 42, 62, 36, 61, 31, 60, 27, 59, 23, 57, 21, 54, 22, 51], c: "u", cast: true,
    tone: [[[49, 40, 55, 43, 57, 49, 56, 53, 58, 56, 56, 60, 48, 62, 38, 62, 34, 60, 42, 59, 48, 56, 51, 50, 51, 45], "f"],
           [[21, 54, 22, 50, 26, 48, 32, 49, 35, 53, 33, 58, 27, 59, 23, 57], "c"],
           [[22, 56, 27, 58, 33, 57, 32, 60, 25, 60], "C"]],
    hl: { s: [29, 45, 34, 41, 42, 39, 47, 40, 40, 42, 33, 45] } },
  // near ear (right): the big leaf swept up and back
  { g: "ear", oy: ear, s: [47, 41, 50, 35, 54, 30, 59, 26, 64, 23, 70, 21, 69, 25, 66, 30, 61, 35, 56, 40, 53, 44], c: "l", top: 1, cast: true,
    tone: [[[52, 42, 57, 37, 62, 32, 67, 27, 70, 21, 69, 25, 66, 30, 61, 35, 56, 40, 53, 44], "g"],
           [[49, 41, 54, 35, 60, 29, 69, 22, 69, 23, 60, 30, 55, 36, 50, 42], "G"]] },
  // near arm (right): hanging forward, elbow out
  { g: "arm", mat: "fur", oy: bob, s: [52, 60, 57, 62, 61, 66, 62, 72, 58, 75, 55, 71, 53, 67, 49, 65], c: "u", top: 1, cast: true,
    tone: [[[58, 64, 61, 66, 62, 72, 58, 75, 57, 70], "f"]] },
  // vine-taped fists
  { g: "fist", oy: bob, s: [53, 73, 58, 71, 63, 72, 64, 77, 61, 81, 55, 80, 52, 77], c: "l", top: 1, cast: true,
    tone: [[wraps(71), "g"], [[60, 73, 64, 77, 61, 81, 57, 80, 61, 77], "G"]] },
  { g: "farFist", oy: bob, s: [22, 70, 27, 68, 32, 69, 34, 73, 31, 78, 25, 77, 22, 74], c: "l", top: 1,
    tone: [[wraps(68), "g"], [[29, 73, 34, 73, 31, 78, 26, 77], "g"]] },
  ]
}
const parts = makeParts()

sprite("sprigby_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("sprigby_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))
sprite("sprigby_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))
sprite("sprigby_shaded", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true, shading: true }))

// Plant face, cocky: heavy brows angled down at the nose over half-lidded eyes that glare up
// from under them (chin tucked), green irises with a leaf-shaped glint; a dark nose; a
// lopsided smirk hitched up on the near side with one buck tooth; a leaf plaster on the cheek
function details(c, bob = 0) {
  // near eye and brow
  c.grid(38, 43 + bob, `
    ....FFF
    .FFF...
    kkkkkk.
    kkLlwwk
    kgllwwk
    .kkkkk.`)
  // far eye: the same eye turned away (narrower, same height), toward the snout
  c.grid(29, 44 + bob, `
    FF..
    .kkk
    kkLw
    kglw
    .kkk`)
  // nose on the muzzle tip
  c.grid(21, 51 + bob, `
    kk
    k.`)
  // smirk, hitched up on the near side, one buck tooth
  c.grid(24, 56 + bob, `
    ........k
    .kkkkkkk.
    ..kwk....`)
  // leaf plaster on the near cheek
  c.grid(46, 53 + bob, `
    .GGG
    GlLG
    GGG.`)
  // fur clump strokes on the cheek tufts
  c.px(54, 57 + bob, "F"); c.px(53, 59 + bob, "F")
  // toes: split by short lines
  c.vline(36, 89, 2, "F"); c.vline(40, 89, 2, "F"); c.vline(25, 89, 2, "F")
}
function frame(c, { bob = 0, ear = 0 } = {}) {
  render(c, makeParts({ bob, ear }), { lines: "sel", shading: true })
  details(c, bob)
}
sprite("sprigby", { w: 96, h: 96 }, (c) => frame(c))
