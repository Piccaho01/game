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
pal({
  k: "#181018",                                            // outline
  P: "#5a3a48", p: "#946874", s: "#c49aa4", S: "#ecccd0",  // dusky goblin-shark skin
  V: "#1c1a2c", v: "#34304c", n: "#4e4a6e", N: "#726e94",  // murky fin (hood and cloak)
  g: "#4ec8f4", G: "#c8f4ff",                              // cold deep-sea glow (emissive)
  t: "#6a5a3a", T: "#9a8458",                              // rag, rope and pouch
  w: "#ffffff", m: "#3a0e20",                              // teeth, mouth
})
const SHADOW = { s: "p", S: "s", p: "P", n: "v", N: "n", v: "V", T: "t", t: "V" }
const LIGHT = { s: "S", p: "s", n: "N", v: "n", T: "T", t: "T" }
const SELOUT = { s: "P", S: "P", p: "P", n: "V", N: "V", v: "V", T: "V", t: "V", g: "v", G: "g", w: "P", m: "k" }
const { silhouette, partsView, render } = creature({ K: 1, SHADOW, LIGHT, SELOUT })

// the jaw's gum line (output pixels): the needle teeth stand on it
const GUM = [[18, 68], [19, 68], [24, 68], [30, 67], [35, 67], [40, 66], [44, 65], [48, 63], [51, 61], [54, 60]]
const gumY = (x) => {
  for (let i = 1; i < GUM.length; i++) if (x <= GUM[i][0]) {
    const [x0, y0] = GUM[i - 1], [x1, y1] = GUM[i]
    return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
  }
  return GUM[GUM.length - 1][1]
}

// bob: breathing (head side dips, output px); ph: animation phase 0..1 (the throat glow
// flickers, the hands rub)
function makeParts({ bob = 0, ph = 0, rub = 0 } = {}) {
  return [
  // tail tip curling out from under the hem on the right
  { g: "tail", s: [62, 84, 70, 82, 76, 78, 79, 72, 82, 72, 81, 78, 84, 82, 78, 83, 72, 88, 64, 89], c: "s", sh: [1, 2], top: 1 },
  // cloak: the fin hanging from the hood over the shoulders, open at the front, its inside
  // showing at the opening; hem torn into strips
  { g: "cloak", mat: "fin", s: [30, 54, 40, 50, 52, 50, 60, 56, 64, 66, 67, 78, 69, 87, 65, 85, 64, 89, 60, 85, 58, 88, 55, 84,
    36, 84, 33, 88, 31, 84, 28, 87, 27, 83, 24, 85, 25, 76, 27, 64], c: "n", sh: [2, 2],
    tone: [[[31, 62, 36, 58, 36, 84, 31, 84], "v"], [[52, 58, 58, 62, 58, 84, 54, 84], "v"]],
    hl: { s: [26, 66, 29, 57, 33, 54, 30, 62, 28, 72] } },
  // legs: knobbly, knees bent, clawed feet planted wide
  { g: "farLeg", s: [37, 78, 41, 78, 40, 85, 38, 88, 33, 89, 31, 91, 39, 91, 41, 89, 43, 84], c: "p" },
  { g: "leg", s: [49, 78, 53, 78, 52, 84, 54, 88, 58, 89, 60, 91, 50, 91, 48, 88, 47, 84], c: "s", sh: [1, 1], top: 1 },
  // body: hunched torso in the cloak's opening in a ragged tunic, a rope belt, a pouch of
  // shiny junk
  { g: "body", s: [36, 60, 46, 58, 54, 62, 56, 72, 54, 80, 48, 82, 40, 82, 35, 78, 34, 68], c: "T", sh: [2, 2],
    tone: [[[34, 78, 56, 76, 56, 79, 34, 81], "t"]] },
  { g: "pouch", ell: [56, 81, 3.5, 3.5], c: "T", sh: [1, 1], top: 1 },
  // lanky arms, elbows out, clawed fin-hands rubbing together in front of the chest
  { g: "farArm", s: [36, 64, 30, 69, 30, 75, 36, 78, 41, 77, 38, 74, 34, 74, 34, 70, 39, 67], c: "p", top: 1 },
  { g: "arm", s: [54, 64, 59, 69, 58, 75, 52, 78, 46, 77, 49, 74, 54, 74, 55, 70, 51, 67], c: "s", sh: [1, 1], top: 1, cast: true },
  { g: "hands", ox: rub, ell: [43.5, 76.5, 4.5, 3.5], c: "s", sh: [1, 1], top: 1 },
  // hood: tattered, sitting over the head; its ragged front edge arches over the eyes and
  // throws the face into shadow
  { g: "hood", mat: "fin", oy: bob, s: [24, 52, 23, 44, 26, 36, 32, 30, 40, 27, 48, 28, 55, 32, 59, 38, 61, 46, 60, 54, 57, 56,
    58, 51, 55, 50, 56, 46, 53, 44, 52, 40, 48, 39, 46, 36, 42, 38, 38, 36, 35, 39, 31, 40, 30, 44, 27, 45, 28, 50, 26, 54],
    c: "n", sh: [2, 2], hl: { s: [25, 42, 28, 34, 34, 30, 41, 28, 35, 31, 29, 37] } },
  // face under the hood's arch: head turned slightly left, the upper face shaded by the brim
  { g: "head", oy: bob, s: [28, 50, 29, 42, 34, 35, 42, 33, 50, 35, 55, 42, 56, 52, 52, 58, 44, 61, 36, 60, 30, 57], c: "s",
    tone: [[[28, 50, 29, 42, 34, 36, 42, 34, 50, 36, 55, 42, 56, 47, 50, 44, 42, 42, 34, 44, 30, 48], "p"]], sh: [2, 2] },
  // mouth interior between the snout and the sprung jaw
  { g: "mouth", oy: bob, s: [18, 64, 24, 58, 32, 56, 44, 55, 52, 56, 52, 61, 44, 64, 32, 66, 22, 68], c: "m" },
  // the long goblin-shark snout: a flat blade from the forehead, pointing down-left toward
  // the opponent
  { g: "snout", oy: bob, s: [32, 46, 39, 45, 41, 48, 34, 53, 26, 57, 19, 60, 17, 59, 24, 54], c: "s", sh: [0, 1], top: 1 },
  // spring bands: the stretched pale hinges at the corners of the mouth that throw the jaw out
  { g: "spring", oy: bob, s: [29, 56, 33, 57, 32, 62, 28, 62], c: "S" },
  { g: "spring2", oy: bob, s: [50, 54, 54, 55, 53, 60, 49, 60], c: "S" },
  // the sprung jaw: huge, thrust out forward and down from under the snout, gaping, needle
  // teeth jagging up all along its rim
  { g: "jaw", oy: bob, s: [31, 60, 27, 63, 21, 64, 16, 66, 13, 68, 14, 71, 20, 74, 30, 75, 40, 73, 48, 69, 53, 63, 53, 58,
    51, 61, 49, 59, 48, 63, 46, 61, 44, 65, 42, 62, 40, 66, 38, 63, 35, 67, 33, 64, 30, 67, 28, 65, 24, 68, 23, 66, 19, 68, 18, 66],
    c: "s", sh: [1, 2],
    hl: { s: [16, 69, 24, 69, 34, 70, 44, 68, 40, 71, 28, 72, 18, 71] } },
  // pointed fin-ears out of slits in the hood's sides
  { g: "farEar", oy: bob, s: [31, 46, 20, 42, 14, 40, 18, 45, 31, 52], c: "p", top: 1 },
  { g: "ear", oy: bob, s: [53, 45, 64, 41, 71, 38, 67, 44, 54, 52], c: "s", sh: [1, 1], top: 1 },
  ]
}
const parts = makeParts()

sprite("gobbin_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("gobbin_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))

// Stage 2-3: flat colours, shading
sprite("gobbin_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))
sprite("gobbin_shaded", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true, shading: true }))

// Water face, sly: narrow slit eyes glowing cold blue from the shadow under the hood, the
// lids drawn down in a scheming squint
function details(c, bob = 0) {
  // near eye: a narrow glowing slit, the outer corner hitched up, lids drawn down in a squint
  c.grid(43, 45 + bob, `
    ......kkk
    ..kkkkk..
    kkGgggk..
    .kkkkk...`)
  // far eye: the same slit turned away (narrower)
  c.grid(32, 45 + bob, `
    kk....
    .kkkk.
    .kGggk
    ..kkk.`)
  // needle teeth: a row standing on the jaw's gum line, a row hanging from the upper jaw
  for (let x = 19; x <= 49; x += 3) {
    const g = Math.round(gumY(x)) + bob
    c.vline(x, g - 3, 3, "w")
  }
  for (let x = 24; x <= 48; x += 3) c.vline(x, 57 + bob, 2, "w")
}
function frame(c, { bob = 0, ph = 0, rub = 0 } = {}) {
  render(c, makeParts({ bob, ph, rub }), { lines: "sel", shading: true })
  details(c, bob)
}
sprite("gobbin", { w: 96, h: 96 }, (c) => frame(c))
