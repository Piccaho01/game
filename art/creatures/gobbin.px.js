// Gobbin (goblin shark + gob) — Water starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A pale-pink goblin-shark pup from the deep water off Kettleport: a head far too big for it,
// a long blade snout, an underslung jaw of needle teeth, a faintly glowing throat sac that
// flickers before it bites, and a tattered dorsal fin worn like a cape. Reads as "head and
// cape". Battle pose: hunched and creeping forward on stubby fin-feet, jaw dropped and
// pushed out under the snout, cape fin trailing, tail lifted behind.
//
// Stages: silhouette (gobbin_sil). Process and rules: art/BW_STYLE.md; structure follows
// furnaxol.px.js (parts are hand-placed shapes that overlap what they attach to).
// Shapes are drawn in design space (output pixels before scaling); K scales them to starter
// size, anchored on the feet at the bottom centre of the canvas (y = 91). Grid parts are
// placed in output pixels.

pal({ k: "#181018" })

const K = 0.82
const T = (pts) => pts.map((v, i) => (i % 2 ? 91 - (91 - v) * K : 48 + (v - 48) * K))

// ---- parts, back to front. {s: polygon} | {ell: [cx, cy, rx, ry]} | {grid: [x, y, rows]} ("#" = in)
const parts = [
  // tail: from under the cape, low and back, a long upper lobe (shark tail) and a short lower
  { g: "tail", s: [58, 78, 68, 78, 76, 75, 81, 70, 85, 64, 88, 65, 87, 72, 90, 76, 84, 78, 76, 83, 66, 86, 58, 86] },
  // far fin-foot, set back and higher
  { g: "farFoot", s: [54, 80, 62, 80, 66, 88, 60, 89, 52, 88] },
  // cape: the tattered dorsal fin, rising off the back of the head with its tip swept back
  // like a hood, then draping down and back like a cape; its ragged hem torn into strips that hang clear
  { g: "cape", s: [40, 44, 46, 39, 52, 35, 58, 32, 64, 30, 69, 31, 66, 34, 66, 40, 70, 48, 76, 55, 79, 62, 76, 61, 77, 68,
    73, 64, 72, 71, 68, 66, 66, 73, 63, 67, 58, 70, 52, 60, 44, 54] },
  // body: small and hunched under the head
  { g: "body", s: [36, 60, 48, 58, 56, 62, 60, 70, 60, 78, 56, 84, 46, 86, 38, 82, 34, 72] },
  // near fin-foot: stubby, planted forward
  { g: "foot", s: [38, 80, 48, 80, 50, 86, 48, 91, 34, 91, 33, 88] },
  // head: oversized, domed, overhanging the jaw
  { g: "head", s: [20, 47, 25, 41, 33, 38, 41, 38, 47, 42, 51, 49, 51, 57, 46, 63, 37, 65, 28, 64, 22, 61, 20, 55] },
  // rostrum: the long flat blade snout jutting forward, high over the open mouth
  { g: "head", s: [24, 44, 16, 46, 9, 48, 6, 50, 12, 52, 22, 53] },
  // throat sac: a round bulge hanging under the jaw hinge
  { g: "sac", ell: [31, 68, 7, 6] },
  // jaw: dropped and pushed out under the snout, needle teeth jagging up along its rim
  { g: "jaw", s: [36, 64, 28, 68, 18, 68, 11, 65, 8, 61, 10, 60, 11, 62, 13, 59, 14, 62, 16, 59, 17, 62, 19, 59, 20, 62, 23, 60, 26, 62, 32, 61] },
  // pectoral fin: a little blade-arm held nervously against the chest
  { g: "fin", s: [44, 66, 49, 68, 47, 74, 42, 80, 38, 79, 40, 72] },
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
