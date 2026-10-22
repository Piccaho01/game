// Sprigby — Plant starter, stage 1. Translated from the concept art (art/concepts/line_wallaby.png,
// left; mirrored to face left as BW front sprites do) the way BW spriters worked over Sugimori's
// art: shapes traced from the art at sprite size (48 px tall, like Purrloin), clean 1 px line
// art, hard-edged shadow and light shapes placed where the art's shading falls (no automatic
// shading), selective outline, face drawn by hand.
// Grid coordinates (0..34 x 0..48) are offset onto the canvas so the feet sit on y = 91.

include("../lib/sprite.js")
pal({
  k: "#181018",                                            // black line
  D: "#34481a", s: "#7c9a30", b: "#acc84a", L: "#d8ea86",  // lime body: line, shadow, base, light
  c: "#eef4c4",                                            // pale belly (its shadow is L)
  g: "#3c6e26", l: "#6aa63c",                              // leaves: shadow, base (light = b)
  r: "#4c3420", R: "#7e5a38",                              // brown: shadow/claws, base
  w: "#ffffff", m: "#8a3a30",                              // white, mouth
})
// flat materials: each region is one colour; the line takes the material's dark tone top/left
const flat = (line, col) => ({ line, ramp: [col, col, col] })
const kit = spriteKit({ mats: {
  body: flat("D", "b"), bodyS: flat("D", "s"), bodyL: flat("D", "L"), belly: flat("D", "c"),
  leaf: flat("D", "l"), leafS: flat("D", "g"), leafL: flat("D", "b"),
  brown: flat("r", "R"), brownS: flat("r", "r"),
} })

const X0 = 31, Y0 = 43
const o = (pts) => pts.map(([x, y, s]) => [x + X0, y + Y0, s])
const oe = ([x, y, rx, ry]) => [x + X0, y + Y0, rx, ry]
const P = (g, mat, pts, tones = [], extra = {}) => ({ g, mat, path: o(pts), tones: tones.map(([m, t]) => ({ mat: m, path: o(t) })), ...extra })

function makeParts({ bob = 0 } = {}) {
  const H = { oy: bob }
  return [
  // tail: brown, from the rump curving back and up to a fan of leaves
  P("tailLeaf1", "leafS", [[22, 26], [21, 21], [23, 17, 1], [25, 22], [25, 27]]),
  P("tailLeaf2", "leaf", [[24, 27], [26, 20], [29, 16, 1], [29, 22], [27, 28]], [["leafL", [[25, 26], [26, 21], [28, 18], [27, 23]]]]),
  P("tailLeaf3", "leaf", [[25, 29], [29, 24], [33, 22, 1], [31, 27], [27, 31]], [["leafS", [[26, 30], [30, 27], [33, 22], [31, 28], [27, 31]]]]),
  P("tail", "brown", [[18, 33], [21, 32], [24, 29], [26, 27], [28, 29], [26, 33], [22, 37], [18, 38]], [["brownS", [[19, 37], [23, 35], [27, 30], [28, 29], [26, 33], [22, 37]]]]),
  // far leg (left, forward): thigh, shin and a foot with brown claws
  P("farLeg", "body", [[9, 33], [13, 34], [12, 38], [9, 41], [6, 43], [4, 42], [7, 39], [8, 36]], [["bodyS", [[11, 37], [12, 38], [9, 41], [6, 43], [8, 40]]]]),
  P("farFoot", "brown", [[2, 42], [6, 41], [8, 43], [6, 45], [2, 46, 1], [3, 44], [1, 45, 1]], [["brownS", [[3, 45], [6, 44], [8, 43], [6, 45], [2, 46]]]]),
  // body: pear torso, pale belly, shadow down the back
  P("body", "body", [[9, 22], [14, 21], [18, 23], [20, 28], [21, 34], [19, 38], [15, 40], [10, 39], [8, 35], [8, 28]],
    [["bodyS", [[17, 23], [18, 23], [20, 28], [21, 34], [19, 38], [17, 39], [18, 33], [18, 27]]],
     ["belly", [[10, 26], [13, 24], [15, 26], [16, 31], [15, 37], [12, 38], [10, 35], [9, 30]]],
     ["bodyL", [[12, 36], [15, 35], [15, 37], [12, 38], [10, 36]]]], H),
  // near leg (right): big thigh, shin back to a long foot with claws
  P("leg", "body", [[16, 32], [20, 31], [23, 35], [22, 40], [21, 43], [18, 43], [18, 39], [16, 36]],
    [["bodyS", [[20, 33], [23, 35], [22, 40], [21, 43], [19, 42], [21, 38]]], ["bodyL", [[17, 33], [19, 32], [18, 35]]]]),
  P("foot", "brown", [[18, 43], [22, 42], [25, 45], [27, 47, 1], [24, 46], [24, 48, 1], [21, 46], [20, 48, 1], [18, 46]], [["brownS", [[21, 46], [24, 46], [27, 47], [24, 48], [20, 48]]]]),
  // far arm and fist (left), raised in a guard; the fist taped in leaf
  P("farArm", "bodyS", [[10, 23], [8, 25], [6, 25], [6, 23], [9, 22]], [], H),
  P("farFist", "leaf", [[3, 23], [6, 21], [9, 22], [9, 26], [7, 28], [4, 28], [3, 26]], [["leafS", [[3, 25], [9, 25], [9, 26], [7, 28], [4, 28], [3, 26]]], ["leafL", [[4, 22], [6, 21], [7, 22], [5, 23]]]], H),
  // head: rounded, 3/4 to the viewer, snout to the lower left
  P("head", "body", [[7, 15], [9, 12], [13, 11], [17, 12], [19, 15], [19, 19], [17, 22], [13, 23], [9, 22], [6, 20], [5, 18]],
    [["bodyS", [[17, 13], [19, 15], [19, 19], [17, 22], [13, 23], [15, 21], [17, 18], [17, 15]]],
     ["bodyL", [[7, 15], [9, 12], [13, 11], [11, 13], [8, 16]]],
     ["belly", [[5, 19], [7, 18], [10, 19], [11, 21], [9, 22], [6, 21]]]], H),
  // leaf crest: two long ear-leaves swept back, a tuft on top, one leaf curling forward
  P("crestF", "leaf", [[8, 14], [5, 12], [3, 10, 1], [6, 10], [9, 12]], [["leafS", [[5, 12], [3, 10], [6, 11], [8, 13]]]], H),
  P("crestT", "leaf", [[10, 12], [9, 8], [10, 4, 1], [12, 8], [12, 12]], [["leafL", [[10, 11], [10, 7], [10, 5], [11, 8]]]], H),
  P("crestT2", "leafS", [[12, 12], [13, 8], [16, 5, 1], [15, 9], [14, 12]], [], H),
  P("ear", "leaf", [[14, 13], [17, 9], [22, 6], [27, 5, 1], [23, 9], [18, 13], [16, 15]],
    [["leafL", [[15, 12], [18, 9], [23, 6], [27, 5], [19, 9]]], ["leafS", [[18, 13], [23, 9], [27, 5], [22, 10], [17, 14]]]], H),
  P("ear2", "leafS", [[17, 15], [21, 12], [26, 11, 1], [22, 14], [18, 17]], [], H),
  // near arm and fist (right), the fist up in front of the chest
  P("arm", "body", [[15, 23], [17, 25], [15, 27], [13, 26]], [], H),
  P("fist", "leaf", [[10, 25], [13, 23], [16, 24], [17, 27], [15, 30], [12, 30], [10, 28]], [["leafS", [[10, 28], [17, 27], [15, 30], [12, 30]]], ["leafL", [[11, 25], [13, 24], [14, 25], [12, 26]]]], H),
  ]
}
const parts = makeParts()
for (const st of ["sil", "lines"]) sprite("sprigby5_" + st, { w: 96, h: 96 }, (c) => kit.render(c, parts, st))

// face and small details by hand (canvas coordinates)
function details(c, bob = 0) {}
function frame(c, o = {}) { kit.render(c, makeParts(o), "flats"); details(c, o.bob || 0) }
sprite("sprigby5", { w: 96, h: 96 }, (c) => frame(c))
