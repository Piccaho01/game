// Zapail, redesign (work in progress). Spark starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the over-caffeinated live wire, always buzzing.
// Pose: rearing up toward the camera, head thrust forward, grinning through gritted teeth;
// its slime is so full of static that a frizzy crest stands straight up; plug antennae
// crackling. Its shell, as before: a geared copper housing with a coil wound on its face and a
// battery terminal on top, seated on its back with the body wrapped round its base.
// Coordinates are output pixels (K = 1); foot on y = 91.

include("../lib/creature.js")
pal({ k: "#181018" })
const { silhouette, partsView } = creature({ K: 1, SHADOW: {}, LIGHT: {}, SELOUT: {} })

// gear outline: n square-ish teeth of depth d round a circle of radius r
function gear(cx, cy, r, d, n, rot = 0) {
  const pts = []
  for (let i = 0; i < n; i++) for (const [f, rr] of [[0, r], [0.1, r + d], [0.4, r + d], [0.5, r]]) {
    const a = 2 * Math.PI * (i + f) / n + rot
    pts.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
  }
  return pts
}

const parts = [
  // body: the slug's foot along the ground from the tail end on the right to the front lip on
  // the left, its back rising in a hump under the shell so the shell's lower half sits in it
  { g: "body", s: [86, 91, 84, 86, 79, 78, 72, 72, 60, 69, 48, 71, 42, 78, 26, 83, 18, 85, 12, 87, 11, 90, 14, 91] },
  // shell: the geared copper housing seated on the back (coil face and glowing core in colour)
  { g: "shell", s: gear(58, 61, 18, 3.5, 11, -Math.PI / 2 + Math.PI / 11) },
  // battery terminal on top of the shell
  { g: "post", s: [55, 41, 61, 41, 61, 36, 55, 36] },
  { g: "post", s: [52, 36, 64, 36, 64, 33, 52, 33] },
  // neck: rising from the front of the foot in front of the shell's lower left edge
  { g: "body", s: [20, 86, 23, 76, 24, 66, 30, 60, 38, 60, 42, 66, 43, 76, 46, 86] },
  // head: big and round, thrust forward over the foot, turned slightly left, overlapping the
  // shell's front edge
  { g: "head", ell: [33, 51, 12.5, 10.5] },
  // static crest: frizzy slime spikes fanning out off the crown at uneven lengths, like hair
  // standing on end
  { g: "crest", s: [22, 47, 15, 39, 23, 42, 22, 32, 28, 39, 31, 28, 34, 38, 39, 30, 39, 39, 47, 35, 44, 44] },
  // plug antennae from the sides of the crown, splayed up and out; prongs point up
  { g: "farStalk", s: [24, 46, 18, 38, 15, 33, 17, 32, 21, 37, 27, 44] },
  { g: "farStalk", ell: [15.5, 30.5, 3, 3] },
  { g: "farStalk", s: [12, 25, 14, 25, 14, 29, 12, 29] },
  { g: "farStalk", s: [16, 24, 18, 24, 18, 28, 16, 28] },
  { g: "stalk", s: [40, 43, 45, 36, 48, 31, 50, 32, 48, 37, 43, 46] },
  { g: "stalk", ell: [50, 29, 3.5, 3.5] },
  { g: "stalk", s: [47, 21, 49, 21, 49, 26, 47, 26] },
  { g: "stalk", s: [51, 22, 53, 22, 53, 27, 51, 27] },
]

sprite("zapail_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("zapail_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))
