// Zapail (zap + snail) — Spark starter, stage 1. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A tiny, nervous copper snail. It grinds the rim of its spiral shell on the ground to build
// static, so sparks crackle where shell meets dirt; its eyestalks end in two-pronged plugs.
// Battle pose: startled, body reared up and back, plug eyestalks splayed at the target, shell
// tipped down and scraping the ground behind it. Leaves a charged slime trail (Spark Trail).
//
// Stages: silhouette (zapail_sil). Process and rules: art/BW_STYLE.md; structure follows
// furnaxol.px.js (parts are hand-placed shapes that overlap what they attach to).
// Shapes are drawn in design space (output pixels before scaling); K scales them to starter
// size, anchored on the feet at the bottom centre of the canvas (y = 91). Grid parts are
// placed in output pixels.

pal({ k: "#181018" })

const K = 0.9
const T = (pts) => pts.map((v, i) => (i % 2 ? 91 - (91 - v) * K : 48 + (v - 48) * K))

// ---- parts, back to front. {s: polygon} | {ell: [cx, cy, rx, ry]}
const parts = [
  // far eyestalk: thinner, higher, splayed back; the eye bulb is a plug with two prongs
  // pointing at the target
  { g: "farStalk", s: [33, 56, 35, 46, 37, 39, 40, 40, 38, 47, 37, 56] },
  { g: "farStalk", ell: [38.5, 37.5, 3.5, 3.5] },
  { g: "farStalk", s: [32, 34, 36, 34, 36, 36, 32, 36] },
  { g: "farStalk", s: [32, 38, 36, 38, 36, 40, 32, 40] },
  // shell: a fat copper spiral riding on the back, tipped back so its rim scrapes the
  // ground behind; a small nub where the coil starts
  { g: "shell", ell: [63, 67, 17, 16] },
  { g: "shell", s: [71, 53, 75, 49, 78, 50, 77, 55] },
  // foot: one slug body from the tail tip behind the shell, along the ground, rearing up
  // into a thick neck and the head (a sliver of air between the neck and the shell)
  { g: "body", s: [
    90, 91, 86, 88, 80, 84, 70, 80, 54, 80, 46, 79, 41, 73, 39, 64, 37, 57,
    33, 52, 27, 51, 21, 53, 17, 57, 16, 62, 19, 66, 24, 68, 27, 73, 28, 80, 26, 86, 22, 89, 21, 91] },
  // static: a bolt crackling off the scraping rim, and one off the back of the shell
  { g: "spark", s: [74, 81, 80, 76, 80, 79, 86, 76, 83, 80, 79, 81, 79, 83, 75, 84] },
  { g: "spark", s: [76, 61, 82, 57, 81, 61, 87, 60, 85, 63, 81, 63, 82, 66, 77, 68] },
  // near eyestalk: longer, thicker, thrust up-forward at the target; plug bulb and prongs
  { g: "stalk", s: [22, 55, 20, 47, 19, 41, 23, 41, 24, 47, 27, 55] },
  { g: "stalk", ell: [21.5, 38, 4.5, 4] },
  { g: "stalk", s: [13, 34, 18, 34, 18, 36, 13, 36] },
  { g: "stalk", s: [13, 39, 18, 39, 18, 41, 13, 41] },
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
sprite("zapail_sil", { w: 96, h: 96 }, (c) => {
  for (const p of parts) for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (inPart(p, x, y)) c.px(x, y, "k")
})
