// Gobbin (goblin shark + gob) — Water starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A pale-pink goblin-shark pup from the deep water off Kettleport, built like a little hooded
// goblin: its dorsal fin grows up over its head into a pointed hood and hangs down as a
// ragged cloak, its blade snout is the long goblin nose, small fins poke out of the hood like
// goblin ears, and an underslung jaw of needle teeth drops open under a faintly glowing
// throat sac that flickers before it bites. Battle pose, turned three-quarters to the viewer:
// hunched in its cloak, fin-hands clutching it shut at the chest, peering out from under
// the hood with its jaw open; the shark tail pokes out under the hem.
//
// Stages: silhouette (gobbin_sil). Process and rules: art/BW_STYLE.md; structure follows
// furnaxol.px.js (parts are hand-placed shapes that overlap what they attach to).
// Shapes are drawn in design space (output pixels before scaling); K scales them to starter
// size, anchored on the feet at the bottom centre of the canvas (y = 91). Grid parts are
// placed in output pixels.

pal({ k: "#181018" })

const K = 0.8
const T = (pts) => pts.map((v, i) => (i % 2 ? 91 - (91 - v) * K : 48 + (v - 48) * K))

// ---- parts, back to front. {s: polygon} | {ell: [cx, cy, rx, ry]} | {grid: [x, y, rows]} ("#" = in)
const parts = [
  // tail: poking out behind, under the cloak's hem, a long upper lobe and a short lower one
  { g: "tail", s: [66, 80, 76, 76, 83, 70, 87, 63, 91, 62, 90, 69, 93, 75, 86, 76, 80, 82, 72, 86, 66, 86] },
  // cloak: the dorsal fin hanging from the hood over the shoulders to the ground, flaring
  // out, its hem torn into strips
  { g: "cloak", s: [30, 54, 46, 50, 58, 55, 66, 66, 73, 78, 79, 87, 75, 86, 74, 91, 70, 87, 67, 91, 63, 87,
    59, 91, 55, 87, 50, 90, 44, 87, 38, 90, 32, 87, 26, 89, 23, 84, 25, 72, 27, 62] },
  // fin-feet peeking out under the hem, far one (left) smaller
  { g: "farFoot", s: [22, 86, 30, 86, 30, 90, 20, 90] },
  { g: "foot", s: [34, 86, 45, 86, 47, 91, 32, 91] },
  // hood: the same fin rising over the head, its pointed tip flopping back like a goblin's
  { g: "hood", s: [25, 46, 26, 36, 32, 28, 40, 23, 50, 20, 58, 15, 66, 10, 71, 12, 68, 17, 62, 24, 61, 32,
    61, 42, 58, 51, 52, 58, 44, 62, 34, 62, 28, 57] },
  // face peering out of the hood's opening (lower left)
  { g: "face", ell: [34, 47, 10, 9.5] },
  // rostrum: the long goblin nose, pointing forward and toward the viewer
  { g: "face", s: [29, 41, 20, 43, 11, 46, 7, 49, 13, 50, 27, 50] },
  // fin-ears poking out through the hood, the far one (left) narrower
  { g: "farEar", s: [27, 42, 19, 36, 18, 38, 22, 45, 27, 48] },
  { g: "ear", s: [58, 38, 66, 32, 68, 34, 64, 41, 58, 45] },
  // throat sac: a round bulge under the jaw
  { g: "sac", ell: [35, 61, 5.5, 4.5] },
  // jaw: dropped open under the nose, needle teeth jagging up along its rim
  { g: "jaw", s: [41, 57, 33, 60, 23, 59, 16, 56, 13, 52, 15, 51, 16, 54, 18, 50, 19, 53, 21, 50, 22, 53, 24, 51, 26, 53, 32, 52, 38, 53] },
  // fin-hands clutching the cloak shut at the chest
  { g: "farHand", s: [29, 67, 34, 64, 37, 68, 33, 72] },
  { g: "hand", s: [41, 67, 47, 65, 50, 70, 44, 74] },
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

// Silhouette with each part's contour drawn in, so the three-quarter turn can be judged
// before colour
sprite("gobbin_parts", { w: 96, h: 96 }, (c) => {
  const own = new Int16Array(96 * 96).fill(-1)
  parts.forEach((p, i) => { for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (inPart(p, x, y)) own[y * 96 + x] = i })
  const at = (x, y) => (x < 0 || y < 0 || x > 95 || y > 95 ? -1 : own[y * 96 + x])
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
    const i = at(x, y)
    if (i < 0) continue
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const j = at(x + dx, y + dy)
      return j < 0 || (j < i && parts[j].g !== parts[i].g)
    })
    c.px(x, y, edge ? "k" : "#9a94a8")
  }
})
