// Sprigby — Plant starter, stage 1, drawn line-art-first with lib/sprite.js (art/BW_STYLE.md,
// Process). 96x96 canvas, about 50 px tall with the ears, like the sleek BW basics.
// Personality: the cocky little scrapper.
// Gesture: a kangaroo leaning back on its tail; the line of action runs from the tail tip up the
// curve of the back to a head tipped forward and down. Body near side-on, head turned 3/4 to the
// viewer, facing left. Sleek: big head, small narrow torso, thin arms, tapered haunch, long thin
// foot, thin tapering tail. Sly half-closed eyes, a smirk with a grass sprig, leaf-taped fists,
// leaf ears swept back.

include("../lib/sprite.js")
pal({
  k: "#181018",                                                      // black line
  F: "#5a3016", e: "#7e4620", f: "#b8692e", u: "#eea85a", U: "#ffdc9e", // fur
  G: "#1c5424", g: "#3c9636", l: "#78c844", L: "#c4ee6c",            // leaf
  c: "#fff2d6", C: "#e0c094",                                        // cream
  w: "#ffffff", m: "#a8343e",                                        // white, mouth
})
const kit = spriteKit({
  mats: {
    fur: { line: "F", ramp: ["f", "u", "U"] },
    far: { line: "F", ramp: ["e", "f", "u"] },          // far-side limbs sit in shadow
    leaf: { line: "G", ramp: ["g", "l", "L"] },
    farLeaf: { line: "G", ramp: ["G", "g", "l"] },
    cream: { line: "F", ramp: ["C", "c", "c"] },
  },
})

function makeParts({ bob = 0, ear = 0 } = {}) {
  return [
  // far ear (left, behind): leaf swept up and back
  { g: "farEar", mat: "farLeaf", oy: bob + ear, path: [[36, 47], [35, 41], [37, 36], [40, 33, 1], [42, 37], [42, 42], [41, 46]] },
  // tail: thin, from the rump curving back down to the ground, the tip lifting with a leaf tuft
  { g: "tail", mat: "fur", path: [[53, 78], [60, 82], [67, 86], [74, 87], [79, 84], [82, 79, 1], [81, 85], [77, 89], [68, 90], [59, 88], [53, 84]] },
  { g: "tuft", mat: "leaf", path: [[78, 85], [79, 80], [84, 75, 1], [85, 80], [82, 85]] },
  // far foot (left), poking ahead
  { g: "farFoot", mat: "far", path: [[44, 86], [45, 88], [42, 89], [30, 89], [28, 88, 1], [31, 86]] },
  // far arm (left): thin, forearm forward, leaf-taped fist
  { g: "farArm", mat: "far", oy: bob, path: [[41, 63], [43, 66], [39, 69], [36, 69], [35, 67], [38, 65]] },
  { g: "farFist", mat: "farLeaf", oy: bob, ell: [34.5, 67, 3, 2.8] },
  // torso: small and narrow, leaning back onto the tail; cream belly
  { g: "body", mat: "fur", oy: bob, path: [[41, 61], [48, 60], [53, 64], [55, 71], [54, 78], [50, 82], [44, 82], [40, 77], [39, 70], [39, 65]],
    tones: [{ mat: "cream", path: [[40, 66], [44, 64], [47, 68], [47, 77], [44, 81], [41, 78], [40, 72]] }] },
  // haunch: tapered teardrop, and the long thin foot running forward
  { g: "leg", mat: "fur", path: [[48, 74], [52, 71], [56, 74], [57, 80], [55, 86], [52, 88], [49, 84], [48, 79]] },
  { g: "foot", mat: "fur", path: [[56, 86], [57, 89], [54, 91], [38, 91], [35, 90, 1], [37, 88], [48, 87]] },
  // near arm (right): thin, forearm forward, leaf-taped fist in front of the belly
  { g: "arm", mat: "fur", oy: bob, path: [[47, 63], [50, 66], [47, 71], [43, 72], [42, 70], [45, 68]] },
  { g: "fist", mat: "leaf", oy: bob, ell: [41, 70.5, 3.3, 3] },
  // head: big, 3/4 to the viewer, tipped forward and down; muzzle lower left; a scrappy tuft
  // on the back of the cheek
  { g: "head", mat: "fur", oy: bob, path: [[33, 47], [40, 44], [47, 45], [51, 50], [51, 55], [54, 58, 1], [49, 60], [46, 62], [39, 63], [32, 61], [28, 58, 1], [29, 54]],
    tones: [{ mat: "cream", path: [[27, 59], [29, 55], [33, 55], [36, 58], [35, 62], [30, 62]] }] },
  // near ear (right): the bigger leaf, swept back
  { g: "ear", mat: "leaf", oy: bob + ear, path: [[43, 46], [46, 40], [50, 36], [56, 34, 1], [55, 39], [51, 43], [48, 47]] },
  ]
}
const parts = makeParts()
for (const st of ["sil", "lines", "flats", "shaded"]) sprite("sprigby4_" + st, { w: 96, h: 96 }, (c) => kit.render(c, parts, st))

// Plant face, sly and cocky (built like Purrloin's eye): black upper lid pressed flat with a
// flick at the outer corner, green iris and pupil at the front (on the opponent), white behind,
// a dark lower line; the far eye a sliver against the face contour. A dark nose, a smirk, a grass
// sprig chewed in the front corner, a leaf plaster on the cheek.
function details(c, bob = 0) {
  const g = (x, y, rows) => c.grid(x, y + bob, rows)
  g(34, 50, `
    .....k
    kkkkk.
    klLwwF
    kgkwwF
    .FFFF.`)
  g(31, 51, `
    kk
    kL
    kk`)
  g(28, 56, `kk`)
  g(30, 59, `
    .....k
    kkkkk.
    g.....
    .g....
    Ll....`.replace(/^\s*g\.\.\.\.\./m, "g....."))
  g(44, 56, `
    .GGG
    GlLG
    GGG.`)
}
function frame(c, o = {}) { kit.render(c, makeParts(o), "final"); details(c, o.bob || 0) }
sprite("sprigby4", { w: 96, h: 96 }, (c) => frame(c))
