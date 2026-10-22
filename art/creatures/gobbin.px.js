// Gobbin (goblin shark + gob) — Water starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A pale-pink goblin-shark pup from the deep water off Kettleport: a head far too big for it,
// a long blade snout, an underslung jaw of needle teeth, a faintly glowing throat sac that
// flickers before it bites, and a tattered dorsal fin worn like a hooded cape. Reads as "head
// and cape": a little hooded goblin. Battle pose: standing hunched on stubby fin-feet, jaw
// dropped open under the snout, fin-hands raised nervously, the cape hanging from the back of
// its head to the ground behind it with the shark tail poking out under the hem.
//
// Stages: silhouette (gobbin_sil). Process and rules: art/BW_STYLE.md; structure follows
// furnaxol.px.js (parts are hand-placed shapes that overlap what they attach to).
// Shapes are drawn in design space (output pixels before scaling); K scales them to starter
// size, anchored on the feet at the bottom centre of the canvas (y = 91). Grid parts are
// placed in output pixels.

pal({ k: "#181018" })

const K = 0.76
const T = (pts) => pts.map((v, i) => (i % 2 ? 91 - (91 - v) * K : 48 + (v - 48) * K))

// ---- parts, back to front. {s: polygon} | {ell: [cx, cy, rx, ry]} | {grid: [x, y, rows]} ("#" = in)
const parts = [
  // cape: the dorsal fin, rising behind the head (lower than the dome) with its tip swept back, then hanging behind the
  // body to the ground, flaring back; its hem torn into strips
  { g: "cape", s: [44, 38, 50, 34, 56, 31, 64, 29, 60, 33, 61, 38, 64, 44, 69, 56, 74, 68, 80, 80, 83, 88,
    79, 86, 78, 91, 74, 87, 71, 91, 68, 86, 64, 89, 60, 84, 54, 80, 50, 66, 48, 52, 44, 42] },
  // tail: poking out under the hem, lifted, a long upper lobe and a short lower one
  { g: "tail", s: [66, 80, 76, 78, 84, 72, 88, 64, 92, 63, 91, 70, 94, 76, 88, 77, 82, 82, 72, 86, 66, 86] },
  // far fin-foot, set back
  { g: "farFoot", s: [46, 84, 54, 84, 56, 90, 44, 90] },
  // body: short upright trunk under the head
  { g: "body", s: [32, 58, 44, 55, 50, 55, 52, 62, 54, 72, 52, 82, 46, 88, 36, 88, 31, 80, 30, 68] },
  // near fin-foot: stubby, planted forward
  { g: "foot", s: [30, 84, 40, 84, 42, 91, 26, 91, 26, 88] },
  // head: oversized and domed
  { g: "head", s: [22, 40, 26, 33, 33, 28, 41, 27, 48, 30, 53, 37, 54, 46, 50, 55, 42, 60, 33, 61, 26, 58, 22, 52] },
  // rostrum: the long flat blade snout jutting forward, high over the open mouth
  { g: "head", s: [25, 38, 16, 40, 8, 42, 4, 44, 10, 46, 24, 47] },
  // throat sac: a round bulge under the jaw hinge
  { g: "sac", ell: [33, 63, 6, 5] },
  // jaw: dropped open and pushed out under the snout, needle teeth jagging up along its rim
  { g: "jaw", s: [34, 60, 27, 63, 18, 63, 12, 60, 10, 56, 12, 55, 13, 57, 15, 54, 16, 57, 18, 54, 19, 57, 21, 54, 23, 57, 26, 56, 30, 57] },
  // fin-hand: a blade-like pectoral fin hanging at its side, tip flicked forward nervously
  { g: "fin", s: [38, 64, 43, 66, 42, 74, 38, 80, 33, 82, 35, 76] },
]

function inPoly(pts, x, y) {
  const px = x + 0.5, py = y + 0.5
  let inside = false
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inPart = (p, x, y) => {
  if (p.grid) return (p.grid[2].trim().split("\n")[y - p.grid[1]] || "").trim()[x - p.grid[0]] === "#"
  if (p.ell) {
    const [cx, cy] = T(p.ell.slice(0, 2))
    return ((x + 0.5 - cx) / (p.ell[2] * K)) ** 2 + ((y + 0.5 - cy) / (p.ell[3] * K)) ** 2 <= 1
  }
  return inPoly(T(p.s), x, y)
}

// Stage 1: silhouette
sprite("gobbin_sil", { w: 96, h: 96 }, (c) => {
  for (const p of parts) for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (inPart(p, x, y)) c.px(x, y, "k")
})
