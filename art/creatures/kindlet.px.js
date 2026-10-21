// Kindlet — Fire. Pipeline test creature (CLAUDE.md §4): 64x64, 15 colours + transparent,
// 3/4 view facing screen-left like a BW2 front battle sprite.
//
// Built the way BW sprites are: every body segment is a hand-placed polygon with its joints
// where the anatomy puts them; each gets a flat base, hand-placed shadow (lower right) and
// highlight (upper left) shapes. Wherever a segment overlaps one behind it, its contour gets
// a black line. Far-side limbs use the shadow material. Face and paws are hand-placed pixels.
//
// Fire face style: upturned almond eyes with a heavy lid, amber-to-orange iris, slit pupil;
// open snarl with one big upper fang.

pal({
  k: "#101010",                                       // outline
  D: "#6e1f1c", d: "#c43c29", r: "#f07038",           // hide: dark, base, light
  b: "#a8673f", c: "#ecc183", C: "#fff3d0",           // cream fur
  g: "#2b2631", G: "#5a5262", H: "#948a9a",           // charcoal (plates, socks, paws)
  f: "#ec6418", y: "#ffcf38", Y: "#fff8c4",           // flame / iris
  w: "#ffffff", m: "#4a0f1e",                         // fang/eye glint, mouth
})

const W = 62, H = 62                 // outline adds 1px each side -> 64x64

function inPoly(pts, x, y) {
  const px = x + 0.5, py = y + 0.5
  let inside = false
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Segments back to front. poly: silhouette, c: base, tone: [[poly, colour], ...] painted
// only inside the silhouette. Segments in the same group join without a contour line.
const segs = [
  // ---- tail, rising from the rump, flame on the tip
  { g: "tail", poly: [48, 32, 53, 29, 56, 24, 56, 17, 61, 17, 61, 27, 58, 34, 52, 38], c: "d",
    tone: [[[59, 17, 62, 17, 62, 27, 58, 35, 54, 38, 57, 31, 59, 25], "D"],
           [[52, 29, 55, 24, 55, 17, 57, 17, 57, 25, 54, 30], "r"]] },
  { g: "flame", poly: [51, 21, 50, 14, 52, 9, 53, 12, 55, 4, 57, 9, 59, 1, 60, 8, 62, 6, 61, 13, 62, 17, 61, 21], c: "f",
    tone: [[[53, 21, 53, 15, 55, 11, 56, 14, 58, 7, 59, 13, 60, 11, 60, 21], "y"],
           [[55, 21, 55, 17, 57, 14, 58, 17, 59, 21], "Y"]] },

  // ---- far hind leg (only the lower leg shows), shadow material
  { g: "farHind", poly: [38, 42, 44, 42, 44, 51, 43, 55, 38, 55, 39, 49], c: "D",
    tone: [[[37, 50, 45, 50, 45, 56, 37, 56], "g"]] },
  { g: "farHind", poly: [36, 54, 43, 54, 45, 56, 44, 59, 37, 59, 36, 57], c: "g" },

  // ---- far front leg, planted, shadow material
  { g: "farFront", poly: [29, 37, 35, 37, 35, 47, 34, 53, 30, 53, 30, 47], c: "D",
    tone: [[[29, 47, 36, 47, 36, 54, 29, 54], "g"], [[30, 37, 32, 37, 32, 46, 31, 46], "d"]] },
  { g: "farFront", poly: [28, 52, 35, 52, 37, 55, 36, 59, 28, 59, 27, 56], c: "G",
    tone: [[[33, 52, 37, 52, 37, 59, 33, 59], "g"]] },

  // ---- torso, receding up-right behind the chest
  { g: "body", poly: [30, 30, 36, 27, 44, 27, 50, 28, 55, 31, 57, 36, 56, 42, 52, 45, 46, 46, 40, 45, 34, 44, 30, 40], c: "d",
    tone: [[[32, 41, 40, 43, 46, 44, 52, 43, 56, 38, 58, 36, 57, 43, 52, 46, 46, 47, 40, 46, 33, 45], "D"],
           [[36, 28, 44, 28, 50, 29, 54, 31, 50, 31, 44, 30, 37, 30], "r"]] },
  // charcoal spine plates
  ...[[35, 29, 38, 22, 42, 28], [41, 28, 45, 21, 49, 29], [48, 30, 52, 24, 55, 32]].map((p) => ({
    g: "plate", poly: p, c: "G",
    tone: [[[p[2], p[3], p[4], p[5], p[2] + 1, p[5]], "g"], [[p[0], p[1], p[2], p[3], p[2], p[3] + 3, p[0] + 2, p[1]], "H"]],
  })),

  // ---- near hind leg: thigh, knee forward, shin back to the hock, paw forward
  { g: "hind", poly: [44, 33, 51, 31, 56, 35, 57, 41, 55, 46, 50, 48, 45, 46, 43, 40], c: "d",
    tone: [[[54, 36, 58, 40, 56, 47, 50, 49, 48, 47, 52, 45, 55, 41], "D"],
           [[45, 34, 50, 32, 52, 33, 47, 36, 45, 40], "r"]] },
  { g: "hind", poly: [47, 45, 53, 44, 56, 49, 55, 52, 51, 52, 48, 49], c: "d",
    tone: [[[53, 45, 57, 49, 56, 53, 52, 53, 54, 49], "D"]] },
  { g: "hind", poly: [50, 50, 56, 50, 55, 55, 50, 55], c: "G",
    tone: [[[54, 50, 57, 50, 56, 56, 53, 56], "g"]] },
  { g: "hindPaw", poly: [44, 54, 53, 54, 55, 56, 54, 59, 44, 59, 43, 57], c: "G",
    tone: [[[51, 54, 56, 54, 56, 60, 51, 60], "g"], [[44, 54, 49, 54, 47, 55, 44, 56], "H"]] },

  // ---- chest fluff, jagged lower edge
  { g: "chest", poly: [17, 27, 34, 26, 36, 31, 35, 35, 33, 34, 33, 38, 30, 36, 29, 41, 27, 37, 25, 42, 23, 37, 21, 40, 20, 35, 17, 36, 18, 31], c: "c",
    tone: [[[30, 29, 34, 26, 37, 31, 35, 35, 33, 34, 33, 38, 30, 36, 29, 41, 27, 37, 28, 32], "b"],
           [[18, 29, 25, 28, 23, 31, 20, 33], "C"]] },

  // ---- near front leg, lifted mid-step: upper arm down to the elbow, forearm forward,
  //      wrist bent so the paw hangs pads-back
  { g: "arm", poly: [21, 36, 29, 36, 28, 41, 26, 44, 22, 44, 21, 40], c: "d",
    tone: [[[26, 37, 30, 36, 28, 42, 26, 45, 24, 44, 26, 41], "D"], [[21, 37, 24, 37, 23, 41, 22, 42], "r"]] },
  { g: "arm", poly: [21, 41, 26, 42, 23, 46, 19, 49, 15, 49, 15, 46], c: "d",
    tone: [[[15, 46, 19, 45, 22, 44, 23, 46, 19, 49, 15, 49], "G"], [[20, 47, 24, 44, 23, 47, 19, 50], "g"],
           [[22, 41, 26, 42, 24, 44], "D"]] },
  { g: "armPaw", poly: [12, 46, 19, 46, 20, 50, 18, 53, 14, 53, 12, 50], c: "G",
    tone: [[[17, 47, 21, 47, 20, 51, 18, 54, 16, 54, 18, 50], "g"], [[12, 46, 15, 46, 13, 49], "H"]] },

  // ---- far ear (shadow material), near ear
  { g: "farEar", poly: [12, 12, 11, 5, 12, 1, 16, 5, 19, 10], c: "D",
    tone: [[[12, 9, 12, 4, 15, 6, 16, 9], "g"], [[11, 0, 13, 0, 13, 4, 11, 4], "g"]] },
  { g: "ear", poly: [22, 11, 28, 4, 33, 0, 34, 7, 33, 13], c: "d",
    tone: [[[26, 10, 30, 4, 32, 4, 32, 10, 29, 12], "c"], [[29, 9, 32, 4, 32, 10, 30, 11], "b"],
           [[30, 0, 35, 0, 34, 4, 29, 4], "G"], [[32, 5, 35, 4, 34, 13, 33, 13], "D"], [[23, 10, 27, 5, 25, 9], "r"]] },

  // ---- head
  { g: "head", poly: [11, 14, 16, 10, 22, 9, 28, 10, 33, 13, 35, 17, 34, 21, 31, 27, 27, 29, 21, 29, 17, 27, 13, 24, 10, 19], c: "d",
    tone: [[[30, 18, 35, 16, 35, 22, 31, 28, 27, 30, 26, 26], "D"], [[14, 12, 18, 10, 22, 10, 18, 12, 15, 15], "r"]] },
  // cheek tuft
  { g: "head", poly: [27, 21, 33, 19, 37, 22, 34, 23, 36, 26, 32, 26, 33, 29, 28, 28], c: "c",
    tone: [[[31, 23, 37, 22, 34, 23, 36, 26, 32, 26, 33, 29, 30, 27], "b"]] },
  // snout, wedge pointing forward-left
  { g: "head", poly: [13, 14, 18, 16, 19, 22, 13, 24, 6, 24, 4, 22, 5, 19, 9, 17], c: "d",
    tone: [[[6, 21, 18, 20, 19, 24, 6, 24], "c"], [[7, 18, 12, 15, 14, 16, 10, 18], "r"]] },
  // forehead plate
  { g: "head", poly: [16, 11, 20, 6, 24, 11, 20, 13], c: "G",
    tone: [[[20, 6, 24, 11, 20, 13], "g"], [[16, 11, 20, 6, 20, 9, 18, 11], "H"]] },
  // lower jaw, dropped open
  { g: "jaw", poly: [8, 27, 18, 27, 20, 29, 13, 30, 9, 29], c: "c",
    tone: [[[14, 29, 19, 28, 20, 29, 13, 31], "b"]] },
]

sprite("kindlet", { w: W, h: H, outline: "k" }, (c) => {
  const own = new Int16Array(W * H).fill(-1)
  const col = new Array(W * H).fill(null)
  segs.forEach((s, i) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!inPoly(s.poly, x, y)) continue
      let k = s.c
      for (const [p, t] of s.tone || []) if (inPoly(p, x, y)) k = t
      own[y * W + x] = i; col[y * W + x] = k
    }
  })
  // contour line on a segment's edge wherever it overlaps a segment behind it
  const out = col.slice()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = own[y * W + x]
    if (i < 0 || segs[i].g === "flame") continue
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
      const j = own[yy * W + xx]
      if (j >= 0 && j < i && segs[j].g !== segs[i].g && segs[j].g !== "flame") { out[y * W + x] = "k"; break }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (out[y * W + x]) c.px(x, y, out[y * W + x])
},
  // ---- face ----
  // near eye: heavy lid, slit pupil, amber to orange iris, glint
  grid(21, 12, `
    .....kkk
    kkkkkkk.
    kyyykwk.
    kyyfkyk.
    .kffyk..
    ..kkk...`),
  // far eye, foreshortened beside the snout bridge
  grid(13, 13, `
    .kk
    kkk
    kyk
    kfk
    .k.`),
  // nose
  grid(4, 19, `
    .kk
    kkH
    kkk`),
  // open mouth with one big upper fang, tongue
  grid(7, 24, `
    kkkkkkkkkkkk
    kwwmmmmmmmmk
    kwwmmrrrmmk.
    .kwkkkkkkk..`),
  // snout ridge and brow lines
  line(9, 18, 13, 15, "D"), hline(21, 11, 6, "D"),
  // fur clumps on the chest
  line(24, 33, 25, 38, "b"), line(28, 31, 29, 36, "b"), line(21, 32, 21, 36, "b"),
  // toes split by black lines, claw tips
  vline(14, 50, 3, "k"), vline(16, 50, 3, "k"), px(13, 53, "C"), px(15, 53, "C"), px(17, 53, "C"),
  vline(47, 56, 3, "k"), vline(50, 56, 3, "k"), px(45, 59, "C"), px(48, 59, "C"),
  vline(30, 56, 3, "k"), vline(33, 56, 3, "k"),
  vline(39, 56, 3, "k"), vline(42, 56, 3, "k"),
  // embers glowing in the plate cracks
  px(38, 25, "f"), px(45, 24, "f"), px(52, 27, "f"), px(20, 9, "f"), px(20, 10, "y"),
)
