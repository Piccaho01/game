// Kilnlotl — Fire starter. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A glassblower's axolotl from Emberwick: three flame gills per side, a fired-glass belly
// window over its ember core, a finned paddle tail dripping molten glass. Battle pose:
// lunging forward, mouth open, far claw reaching, tail raised as a counterweight.
// (Glassblow, the bubble, is its attack animation.)
//
// Stage 1: silhouette only (art/BW_STYLE.md, Process). The body is ONE traced contour so
// every part is anatomically attached; gills overlap deep into the head.

pal({ s: "#1a1420" })

// Design space is drawn large; T scales it to starter size (~67x72 body box), anchored on
// the feet at the bottom centre of the 96x96 canvas.
const T = (pts) => pts.map((v, i) => (i % 2 ? Math.round((91 - (91 - v) * 0.82) * 2) / 2 : Math.round((48 + (v - 53) * 0.82) * 2) / 2))

const BODY = [
  // head top, left to right
  30, 22, 36, 19, 44, 18, 52, 20, 58, 24,
  // back of head, neck notch, short pear torso down to the rump
  62, 30, 64, 38, 62, 45, 57, 49, 59, 54, 62, 60, 64, 63,
  // tail: up and back to the raised paddle tip, then its underside back to the rump
  70, 59, 78, 53, 84, 46, 88, 38, 92, 37, 94, 44, 92, 52, 87, 60, 80, 66, 70, 69,
  // far leg pushing off behind: back of thigh, heel, sole, toes, inner leg
  71, 74, 75, 80, 77, 85, 79, 90, 67, 90, 66, 87, 62, 82, 58, 76,
  // crotch high so the legs split into a clear lunge
  54, 71,
  // near leg forward: inner thigh, ankle, heel, sole, toes, top of foot, shin, knee, thigh
  50, 75, 46, 80, 44, 86, 45, 91, 27, 91, 25, 89, 28, 86, 34, 85, 33, 81, 31, 77, 34, 71,
  // belly, chest
  36, 67, 37, 62,
  // far arm reaching forward from the lower chest: underside, three spread claws, top side
  33, 63, 27, 64, 22, 65, 17, 67, 17, 65, 20, 62, 15, 62, 16, 60, 20, 59, 16, 56, 18, 55, 23, 57, 30, 57, 36, 56,
  // neck notch, chin, open mouth (lower jaw, gape, upper lip), snout, forehead
  37, 52, 32, 50, 26, 49, 20, 47, 28, 43, 17, 39, 16, 34, 20, 28, 26, 24,
]

sprite("kilnlotl_sil", { w: 96, h: 96 },
  // far gills, behind the head on the left
  poly(T([26, 30, 18, 18, 22, 22, 20, 12, 27, 20, 30, 26]), "s"),
  poly(T([24, 33, 12, 26, 18, 25, 26, 29]), "s"),
  poly(T(BODY), "s"),
  // near gills: three flame fronds, bases buried in the back of the head
  poly(T([48, 26, 52, 18, 54, 10, 58, 14, 60, 3, 64, 12, 69, 6, 67, 19, 60, 30, 52, 30]), "s"),
  poly(T([56, 30, 64, 25, 70, 19, 73, 23, 81, 14, 80, 24, 89, 22, 80, 32, 68, 37, 58, 38]), "s"),
  poly(T([58, 36, 68, 37, 78, 35, 77, 39, 87, 41, 78, 45, 82, 50, 70, 46, 60, 44]), "s"),
)
