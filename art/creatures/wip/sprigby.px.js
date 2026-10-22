// Sprigby, redesign (work in progress). Plant starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the cocky little scrapper who picks fights with things twice its size.
// Pose: kangaroo stance, leaning back on its thick tail like a tripod, chest puffed, chin
// tucked down glaring up from under its brows, head right on its shoulders,
// short vine-taped fists hanging low and forward ("come at me"). Leaf ears swept back like a
// fighter's mohawk; a leaf plaster on one cheek.
// Coordinates are output pixels (K = 1); feet on y = 91.

include("../lib/creature.js")
pal({
  k: "#181018",                                            // outline
  F: "#4a3020", f: "#9a6a44", u: "#d6a46a", U: "#f4d4a0",  // fur: line, shadow, base, light
  G: "#1e4a26", g: "#3f8a3a", l: "#78c048", L: "#c0ea70",  // leaf (ears, tail tuft, vine wraps)
  c: "#fbeed2", C: "#dcbe98",                              // cream muzzle and chest
  w: "#ffffff", m: "#7a2430",                              // highlight, mouth
})
const SHADOW = { u: "f", U: "u", f: "F", l: "g", L: "l", g: "G", c: "C", C: "f" }
const LIGHT = { u: "U", f: "u", l: "L", g: "l", c: "c", C: "c" }
const SELOUT = { u: "F", U: "F", f: "F", l: "G", L: "G", g: "G", c: "F", C: "F" }
const { silhouette, partsView, render } = creature({ K: 1, SHADOW, LIGHT, SELOUT })

// Everything below the head is drawn at 0.85 about the feet so the head is ~40% of the height;
// the head side moves down by HY to sit on it
const SC = 0.85, HY = 6
const sc = (pts) => pts.map((v, i) => (i % 2 ? 91 - (91 - v) * SC : 48 + (v - 48) * SC))
const sce = ([cx, cy, rx, ry]) => [...sc([cx, cy]), rx * SC, ry * SC]
const hy = (pts) => pts.map((v, i) => (i % 2 ? v + HY : v))
const hye = ([cx, cy, rx, ry]) => [cx, cy + HY, rx, ry]
// ears are shortened to 0.75 of their drawn length, about their base on the crown
const ek = (bx, by) => (pts) => hy(pts.map((v, i) => (i % 2 ? by + (v - by) * 0.75 : bx + (v - bx) * 0.75)))
const farE = ek(44, 44), nearE = ek(50, 44)
// vine wrap stripes across a fist (output pixels)
const wraps = (x0, y0, w, h) => ({ fn: (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h && (y - y0) % 3 === 2 })

// bob: breathing / bounce (head, body and arms rise, output px; feet and tail planted)
function makeParts({ bob = 0, ear = 0 } = {}) {
  return [
  // tail: thick, from the rump down to the ground behind on the right, the tripod's third
  // leg; a leaf tuft on the tip
  { g: "tail", mat: "fur", s: sc([54, 72, 62, 77, 70, 82, 78, 85, 84, 83, 86, 78, 89, 79, 88, 86, 80, 91, 64, 91, 56, 86, 52, 78]),
    c: "u", sh: [2, 2], tone: [[sc([82, 84, 85, 77, 90, 76, 90, 84, 86, 89]), "l"]],
    hl: { s: sc([56, 75, 64, 79, 74, 84, 66, 82, 58, 79]) } },
  // haunches: far (left) smaller, in shadow; near (right) bigger
  { g: "farLeg", ell: sce([38, 80, 7, 6.5]), c: "f", top: 1 },
  // feet planted forward toward the camera and the opponent, long toes, foreshortened
  { g: "farFoot", s: sc([30, 85, 40, 84, 41, 89, 37, 91, 25, 91, 25, 88]), c: "f", top: 1 },
  // body: pear, leaning back onto the tail, chest puffed out, cream chest and belly
  { g: "body", mat: "fur", oy: bob, s: sc([42, 56, 54, 55, 60, 61, 61, 71, 58, 81, 50, 86, 40, 85, 35, 79, 35, 68, 38, 61]),
    c: "u", sh: [2, 2], tone: [[sc([41, 61, 52, 60, 56, 66, 55, 77, 49, 83, 42, 82, 39, 75, 39, 66]), "c"]] },
  { g: "leg", mat: "fur", ell: sce([54, 80, 8, 7.5]), c: "u", sh: [2, 2], cast: true, hl: { ell: sce([51, 76, 4, 3]) } },
  { g: "foot", mat: "fur", s: sc([46, 85, 57, 84, 59, 88, 56, 91, 42, 91, 42, 88]), c: "u", sh: [1, 1], top: 1 },
  // arms: short, elbows out like a gorilla, forearms hanging forward, vine-taped fists low
  // in front
  { g: "farArm", oy: bob, s: sc([39, 61, 33, 63, 28, 67, 27, 72, 30, 74, 32, 69, 35, 66, 40, 65]), c: "f", top: 1 },
  { g: "farFist", oy: bob, ell: sce([29.5, 75.5, 4, 3.5]), c: "g", tone: [[wraps(24, 72, 12, 8), "G"]], top: 1 },
  { g: "arm", mat: "fur", oy: bob, s: sc([56, 61, 62, 63, 67, 67, 68, 72, 65, 74, 63, 69, 60, 66, 55, 65]), c: "u", sh: [1, 1], top: 1, cast: true },
  { g: "fist", oy: bob, ell: sce([65.5, 76, 4.5, 4]), c: "l", sh: [1, 1], top: 1, cast: true, tone: [[wraps(57, 72, 12, 9), "g"]] },
  // far ear (left): leaf swept up and back, in shadow, a darker midrib
  { g: "farEar", oy: ear, s: farE([41, 44, 41, 37, 43, 31, 46, 25, 49, 21, 51, 24, 50, 30, 48, 36, 46, 43]), c: "g", top: 1,
    tone: [[farE([44, 42, 46, 32, 49, 23, 50, 24, 47, 33, 45, 42]), "G"]] },
  // head: big (about 40% of the height), sitting right on the shoulders with no neck, chin
  // tucked down (glaring up from under its brows), turned slightly left; cheek tufts
  { g: "head", mat: "fur", oy: bob, ell: hye([46, 50, 13.5, 11]), c: "u", sh: [2, 2], cast: true, hl: { s: hy([36, 46, 40, 42, 47, 40, 42, 43, 38, 47]) } },
  { g: "head", mat: "fur", oy: bob, s: hy([34, 53, 31, 56, 34, 56, 32, 59, 36, 58, 38, 56]), c: "u" },
  { g: "head", mat: "fur", oy: bob, s: hy([58, 52, 61, 54, 59, 55, 61, 58, 57, 57, 55, 55]), c: "u", sh: [1, 1] },
  // muzzle: pointing down and out to the lower left, toward the opponent
  { g: "muzzle", mat: "fur", oy: bob, ell: hye([38, 55, 6.5, 4.5]), c: "c", sh: [1, 1] },
  // near ear (right): the bigger leaf, swept back like a mohawk, a bite-notch on its edge
  { g: "ear", oy: ear, s: nearE([48, 42, 52, 36, 56, 30, 60, 25, 65, 21, 69, 20, 67, 25, 67, 28, 64, 31, 60, 37, 54, 43, 50, 45]),
    c: "l", sh: [1, 1], top: 1, cast: true, tone: [[nearE([50, 43, 55, 36, 61, 28, 68, 21, 68, 22, 62, 29, 56, 37, 51, 44]), "g"]] },
  ]
}
const parts = makeParts()

sprite("sprigby_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("sprigby_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))

// Stage 2-3: flat colours, shading
sprite("sprigby_flats", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true }))
sprite("sprigby_shaded", { w: 96, h: 96 }, (c) => render(c, parts, { lines: true, shading: true }))

// Plant face, cocky: heavy brows angled down at the nose over half-lidded eyes that glare up
// from under them (chin tucked), green irises with a leaf-shaped glint; a dark nose; a
// lopsided smirk hitched up on the near side with one buck tooth; a leaf plaster on the cheek
function details(c, bob = 0) {
  bob += HY
  // near eye: brow sloping down toward the nose, heavy lid, pupil pushed up under the lid
  c.grid(46, 41 + bob, `
    ......FF
    ...FFFF.
    FFFF....
    .kkkkkk.
    kkkkkkkk
    kkkLllwk
    kkglllwk
    kgggllwk
    .kkkkkk.`)
  // far eye: the same eye turned away (narrower, same height), its brow sloping the other way
  c.grid(36, 42 + bob, `
    FF...
    .FFF.
    ...FF
    .kkkk
    kkkkk
    kkLlw
    kkglw
    kgglw
    .kkkk`)
  // nose on the muzzle tip
  c.grid(31, 53 + bob, `
    kkk
    .k.`)
  // smirk: hitched up at the near corner, one buck tooth
  c.grid(34, 56 + bob, `
    .......k
    kkkkkkk.
    .kwk....`)
  // leaf plaster on the near cheek
  c.grid(54, 52 + bob, `
    .GGGG
    GlGlG
    GGGG.`)
}
function frame(c, { bob = 0, ear = 0 } = {}) {
  render(c, makeParts({ bob, ear }), { lines: "sel", shading: true })
  details(c, bob)
}
sprite("sprigby", { w: 96, h: 96 }, (c) => frame(c))
