// Gobbin (goblin shark + gob) — Water starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A pale-pink goblin-shark pup from the deep water off Kettleport: a head far too big for it,
// a long blade snout (its goblin nose), pointy fin-ears, an underslung jaw of needle teeth, a
// faintly glowing throat sac that flickers before it bites, a ragged scrap of a tunic, and a
// tattered dorsal fin worn as a hooded cape: a traditional rounded hood over its head with the
// fin-ears poking out from under it. Battle pose, turned three-quarters to the viewer:
// standing hunched on stubby fin-feet, jaw dropped open, fins raised nervously, the cape
// hanging behind it to the ground with the shark tail poking out under the hem.
//
// Stages: silhouette (gobbin_sil, gobbin_parts), flat colours (gobbin_flats), shading
// (gobbin_shaded), final still (gobbin), BW2-style idle loop (gobbin_idle). Process and rules:
// art/BW_STYLE.md; structure follows furnaxol.px.js (parts are hand-placed shapes that overlap
// what they attach to). Shapes are drawn in design space (output pixels before scaling); K
// scales them to starter size. The renderer is shared: lib/creature.js.

include("lib/creature.js")

pal({
  k: "#181018",                                            // outline
  P: "#6a2c48", p: "#b46a8a", s: "#f0aabb", S: "#ffdce4",  // ghost-pink skin: line, shadow, base, light
  V: "#2a1840", v: "#4a2c6c", n: "#74509c", N: "#a684c8",  // bruised-purple fin (hood and cape)
  g: "#4ec8f4", G: "#c8f4ff",                              // cold deep-sea glow (emissive)
  t: "#4c5866", T: "#7a8a96",                              // rag tunic
  w: "#ffffff", m: "#4a1030",                              // teeth and highlights, mouth
})
const SHADOW = { s: "p", S: "s", p: "P", n: "v", N: "n", v: "V", T: "t", t: "V" }
const LIGHT = { s: "S", p: "s", n: "N", v: "n", T: "T", t: "T" }
const SELOUT = { s: "P", S: "P", p: "P", n: "V", N: "V", v: "V", T: "V", t: "V", g: "v", G: "g", w: "P", m: "k" }
const K = 0.76
const { T: TT, silhouette, partsView, render } = creature({ K, SHADOW, LIGHT, SELOUT })

// ---- parts, back to front (see lib/creature.js for the fields). bob: breathing (the head
// side dips, output px); ph: animation phase 0..1 (the throat glow flickers, fins flutter).
// Three-quarter turn: chest and face toward the viewer, the far side on the left, the back
// (cape, tail) running away up to the right.
function makeParts({ bob = 0, ph = 0 } = {}) {
  const glow = 2.4 + 1.2 * Math.max(0, Math.sin(2 * Math.PI * ph * 2))   // two flickers a loop
  const flut = Math.round(Math.sin(2 * Math.PI * ph) * 0.6)
  return [
  // cape: the dorsal fin, rounded over the back of the head into the hood, then hanging
  // behind the body to the ground; its inside shows past the far shoulder; hem torn into strips
  { g: "cape", mat: "fin", s: [36, 30, 44, 24, 52, 22, 58, 24, 63, 30, 65, 38, 66, 46, 72, 58, 78, 72, 82, 86,
    78, 85, 77, 90, 73, 86, 70, 90, 66, 85, 62, 88, 58, 84, 48, 86, 36, 86, 28, 84, 25, 80, 27, 70, 31, 56, 33, 42],
    c: "n", sh: [2, 2], tone: [[[25, 80, 27, 70, 31, 56, 33, 42, 38, 46, 36, 60, 33, 76, 32, 86], "v"]],
    hl: { s: [60, 30, 63, 36, 64, 46, 69, 58, 74, 68, 70, 62, 64, 50, 62, 38] } },
  // tail: poking out under the hem, lifted, a long upper lobe and a short lower one
  { g: "tail", s: [66, 80, 76, 77, 83, 71, 87, 63, 91, 62, 90, 69, 93, 75, 87, 76, 81, 81, 72, 85, 66, 85],
    c: "s", sh: [1, 2], top: 1 },
  // far fin-foot (left), set back, in shadow
  { g: "farFoot", s: [27, 83, 36, 83, 37, 89, 24, 89, 24, 87], c: "p" },
  // body: short upright trunk, chest facing out
  { g: "body", s: [32, 56, 44, 54, 52, 58, 55, 68, 54, 80, 49, 88, 36, 88, 30, 82, 29, 68], c: "s", sh: [2, 2] },
  // tunic: a ragged scrap of cloth over the body, its hem torn into points, a patch sewn on
  { g: "tunic", s: [29, 64, 37, 60, 48, 60, 55, 64, 56, 73, 57, 82, 54, 80, 53, 85, 50, 81, 47, 86, 44, 81,
    41, 86, 38, 81, 34, 85, 32, 80, 28, 82, 28, 72], c: "T", sh: [2, 2],
    tone: [[[44, 70, 50, 69, 51, 75, 45, 76], "t"]] },
  // near fin-foot (right), planted forward
  { g: "foot", s: [40, 84, 50, 84, 53, 91, 37, 91, 37, 88], c: "s", sh: [1, 1], top: 1 },
  // far fin-hand: a blade fin held up nervously in front of the far side of the chest
  { g: "farFin", oy: flut, s: [31, 68, 28, 73, 24, 78, 21, 77, 24, 70], c: "p", cast: true },
  // head: oversized and domed, turned toward the viewer, wide enough for both big eyes
  { g: "head", oy: bob, s: [24, 42, 27, 34, 33, 28, 41, 25, 49, 27, 55, 33, 57, 41, 55, 50, 50, 56, 42, 59, 32, 59, 26, 55, 23, 49],
    c: "s", sh: [2, 2], hl: { s: [27, 46, 32, 43, 38, 43, 33, 46] } },
  // rostrum: the blade snout (its long goblin nose), pointing forward and toward the viewer
  { g: "head", oy: bob, s: [29, 38, 20, 41, 11, 45, 8, 48, 14, 49, 27, 48], c: "s", sh: [0, 1], top: 1 },
  // hood: a traditional rounded hood pulled over the top of the head, its front edge
  // framing the face from the forehead down to the cheeks; it shades the face below it
  { g: "hood", mat: "fin", oy: bob, s: [22, 42, 23, 33, 29, 25, 37, 20, 47, 19, 55, 22, 61, 29, 64, 39, 63, 50, 59, 57, 56, 51,
    54, 43, 50, 37, 43, 33, 35, 33, 29, 37, 25, 45], c: "n", sh: [2, 2], cast: true,
    hl: { s: [24, 36, 29, 27, 37, 22, 45, 21, 38, 24, 31, 30, 27, 38] } },
  // fin-ears poking out from under the hood's edge, the far one (left) narrower, in shadow
  { g: "farEar", oy: bob, s: [26, 42, 17, 35, 13, 35, 17, 45, 25, 51], c: "p", top: 1 },
  { g: "ear", oy: bob, s: [58, 44, 68, 37, 72, 37, 67, 49, 59, 55], c: "s", sh: [1, 1], top: 1 },
  // mouth interior between the snout and the dropped jaw
  { g: "mouth", oy: bob, s: [12, 50, 24, 49, 30, 50, 31, 55, 26, 56, 16, 55, 12, 53], c: "m" },
  // throat sac: a round bulge under the jaw, its deep-sea glow showing through thin skin
  { g: "sac", oy: bob, ell: [35, 63, 6, 5], c: "p", sh: [1, 1],
    tone: [[{ ell: [34.5, 63, 4.6, 3.8] }, "g", true], [{ ell: [34, 62.5, glow, glow * 0.7] }, "G", true]] },
  // jaw: dropped open under the snout, needle teeth jagging up along its rim
  { g: "jaw", oy: bob, s: [42, 59, 33, 62, 23, 61, 16, 58, 13, 53, 15, 52, 16, 55, 18, 51, 19, 54, 21, 51, 22, 54, 24, 52, 26, 54, 32, 53, 38, 55],
    c: "s", sh: [1, 1], tone: [[[14, 52, 16, 55, 18, 51, 19, 54, 21, 51, 22, 54, 24, 52, 26, 54, 32, 53, 32, 55, 14, 56], "w", true]] },
  // near fin-hand: a blade fin hanging at the near side, tip flicked forward
  { g: "fin", oy: flut, s: [50, 60, 56, 65, 58, 73, 55, 79, 52, 74, 49, 67], c: "s", sh: [1, 1], top: 1 },
  ]
}
const parts = makeParts()

// Stage 1: silhouette, and the same with each part outlined
sprite("gobbin_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("gobbin_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))

// Stage 2: flat colours, contours where parts overlap
sprite("gobbin_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))

// Stage 3: shading
sprite("gobbin_shaded", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true, shading: true }))

// Stages 4-5: selective outline, then hand-placed details in output pixels
// Water face: huge glossy deep-sea eyes, nearly all dark, with a white glint up front and a
// cold blue reflection glowing in the lower back; needle teeth in both jaws
function details(c, bob = 0) {
  // near eye
  c.grid(40, 49 + bob, `
    ..kkkk.
    .kkkkgk
    kwwkkgk
    kwkkkgk
    kkkkggk
    kkkgGgk
    .kkggk.
    ..kkk..`)
  // far eye: the same eye turned away (narrower, same height)
  c.grid(32, 50 + bob, `
    .kk.
    kkkk
    kwkg
    kkkg
    kkgg
    kkGg
    .kgk
    ..k.`)
  // needle teeth: a row hanging from under the snout, a row jagging up from the jaw
  c.grid(21, 60 + bob, `
    .w..w..w..w..
    .............
    .w..w..w..w..
    ww.ww.ww.ww.w`)
}
function frame(c, { bob = 0, ph = 0 } = {}) {
  render(c, makeParts({ bob, ph }), { lines: "sel", shading: true })
  details(c, bob)
}

// Final still
sprite("gobbin", { w: 96, h: 96 }, (c) => frame(c))

// BW2-style idle loop: slow breath (head side dips 1 px), the throat glow flickers twice, the
// fins flutter nervously. 12 frames at 10 fps; frame 0 is the still.
const BREATH = [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0]
anim("gobbin_idle", { w: 96, h: 96, frames: 12, fps: 10 }, (c) => frame(c, { bob: BREATH[c.frame], ph: c.phase }))
