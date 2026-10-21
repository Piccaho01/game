// Kilnlotl — Fire starter. 96x96 BW battle sprite, 3/4 front facing screen-left.
// A glassblower's axolotl from Emberwick: three flame gills per side, a fired-glass belly
// window over its ember core, a finned paddle tail dripping molten glass. Battle pose:
// mid-Glassblow, far hand cradling a glowing glass bubble, near hand on its hip.
//
// Stage 1: silhouette only (art/BW_STYLE.md, Process).

pal({ s: "#1a1420" })

sprite("kilnlotl_sil", { w: 96, h: 96 },
  // tail: finned paddle curling back and up from the rump, molten drip at the tip
  poly([60, 72, 72, 71, 81, 66, 86, 58, 87, 52, 91, 55, 92, 64, 87, 73, 76, 80, 62, 82], "s"),
  poly([86, 54, 88, 46, 91, 51], "s"),
  ellipse(91, 75, 1.5, 2.5, "s"),

  // far gills, peeking over the top of the head on the left
  poly([34, 30, 24, 16, 28, 26, 17, 24, 30, 36], "s"),

  // far leg and foot (smaller, behind)
  rect(37, 78, 6, 10, "s"),
  ellipse(37, 89, 6, 3, "s"),

  // body: pear, wider at the hips
  ellipse(50, 64, 14, 13, "s"),
  // near leg: thick thigh, short shin, big foot pointing forward-left
  ellipse(56, 76, 8, 8, "s"),
  rect(50, 80, 9, 8, "s"),
  ellipse(51, 89, 9, 3.5, "s"),

  // near arm: hand on hip, elbow out
  line(60, 58, 68, 64, "s", 4),
  line(68, 64, 62, 69, "s", 3),

  // head: wide and flat like an axolotl
  ellipse(44, 38, 20, 13, "s"),
  ellipse(25, 44, 3.5, 3, "s"),                              // pursed lips

  // near gills: three flame fronds sweeping back from behind the head
  poly([56, 30, 60, 20, 58, 12, 62, 15, 63, 6, 66, 12, 69, 4, 70, 14, 67, 22, 63, 33], "s"),
  poly([62, 36, 70, 28, 72, 20, 75, 26, 80, 18, 81, 26, 88, 24, 84, 31, 74, 36, 65, 41], "s"),
  poly([63, 43, 72, 42, 78, 36, 80, 42, 87, 40, 84, 46, 89, 50, 78, 50, 64, 48], "s"),

  // far arm cradling the bubble from below
  line(34, 58, 22, 58, "s", 4),
  ellipse(19, 57, 4, 3, "s"),
  // molten glass neck from the lips, and the bubble
  line(21, 44, 18, 45, "s", 2),
  circ(12, 47, 8, "s"),
)
