// Gobbin (goblin shark + gob) — Water starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A pale-pink goblin-shark pup from the deep water off Kettleport: a head far too big for it,
// a long blade snout (its goblin nose), pointy fin-ears, an underslung jaw of needle teeth, a
// faintly glowing throat sac that flickers before it bites, a ragged scrap of a tunic, and a
// tattered dorsal fin worn as a hooded cape: a traditional rounded hood over its head with the
// fin-ears poking out from under it. Battle
// pose, turned three-quarters to the viewer: standing hunched on stubby fin-feet, jaw dropped
// open, fins raised nervously, the cape hanging behind it to the ground with the shark tail
// poking out under the hem.
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
  // three-quarter turn: chest and face toward the viewer, the far side on the left, the
  // back (cape, tail) running away up to the right
  // cape: the dorsal fin, rounded over the back of the head into the hood, then hanging
  // behind the body to the ground (a sliver shows past the far shoulder); its hem torn
  // into strips
  { g: "cape", s: [36, 30, 44, 24, 52, 22, 58, 24, 63, 30, 65, 38, 66, 46, 72, 58, 78, 72, 82, 86,
    78, 85, 77, 90, 73, 86, 70, 90, 66, 85, 62, 88, 58, 84, 48, 86, 36, 86, 28, 84, 25, 80, 27, 70, 31, 56, 33, 42] },
  // tail: poking out under the hem, lifted, a long upper lobe and a short lower one
  { g: "tail", s: [66, 80, 76, 77, 83, 71, 87, 63, 91, 62, 90, 69, 93, 75, 87, 76, 81, 81, 72, 85, 66, 85] },
  // far fin-foot (left), set back
  { g: "farFoot", s: [27, 83, 36, 83, 37, 89, 24, 89, 24, 87] },
  // body: short upright trunk, chest facing out
  { g: "body", s: [32, 56, 44, 54, 52, 58, 55, 68, 54, 80, 49, 88, 36, 88, 30, 82, 29, 68] },
  // tunic: a ragged scrap of cloth over the body, its hem torn into points
  { g: "tunic", s: [29, 64, 37, 60, 48, 60, 55, 64, 56, 73, 57, 82, 54, 80, 53, 85, 50, 81, 47, 86, 44, 81,
    41, 86, 38, 81, 34, 85, 32, 80, 28, 82, 28, 72] },
  // near fin-foot (right), planted forward
  { g: "foot", s: [40, 84, 50, 84, 53, 91, 37, 91, 37, 88] },
  // far fin-hand: a blade fin held up nervously in front of the far side of the chest
  { g: "farFin", s: [31, 68, 28, 73, 24, 78, 21, 77, 24, 70] },
  // head: oversized and domed, turned toward the viewer, wide enough for both big eyes
  { g: "head", s: [24, 42, 27, 34, 33, 28, 41, 25, 49, 27, 55, 33, 57, 41, 55, 50, 50, 56, 42, 59, 32, 59, 26, 55, 23, 49] },
  // rostrum: the blade snout (its long goblin nose), pointing forward and toward the viewer
  { g: "head", s: [29, 38, 20, 41, 11, 45, 8, 48, 14, 49, 27, 48] },
  // hood: a traditional rounded hood pulled over the top of the head, its front edge
  // framing the face from the forehead down to the cheeks
  { g: "hood", s: [22, 42, 23, 33, 29, 25, 37, 20, 47, 19, 55, 22, 61, 29, 64, 39, 63, 50, 59, 57, 56, 51,
    54, 43, 50, 37, 43, 33, 35, 33, 29, 37, 25, 45] },
  // fin-ears poking out from under the hood's edge, the far one (left) narrower
  { g: "farEar", s: [26, 42, 17, 35, 13, 35, 17, 45, 25, 51] },
  { g: "ear", s: [58, 44, 68, 37, 72, 37, 67, 49, 59, 55] },
  // throat sac: a round bulge under the jaw
  { g: "sac", ell: [35, 63, 6, 5] },
  // jaw: dropped open under the snout, needle teeth jagging up along its rim
  { g: "jaw", s: [42, 59, 33, 62, 23, 61, 16, 58, 13, 53, 15, 52, 16, 55, 18, 51, 19, 54, 21, 51, 22, 54, 24, 52, 26, 54, 32, 53, 38, 55] },
  // near fin-hand: a blade fin hanging at the near side, tip flicked forward
  { g: "fin", s: [50, 60, 56, 65, 58, 73, 55, 79, 52, 74, 49, 67] },
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
