// Zapail, redesign (work in progress). Spark starter, stage 1. Front sprite: body squared to
// the camera, head turned slightly toward the opponent (screen-left).
// Personality: the over-caffeinated live wire, always buzzing.
// Pose: rearing up toward the camera in an S-curve, head thrust forward, grinning through
// gritted teeth; its slime is so full of static that a frizzy crest stands straight up; plug
// antennae crackling. The copper cog shell rises behind it with a battery terminal on top and
// a wind-up key in its side, like a toy machine.
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
  // wind-up key in the shell's side: stem and a two-lobed bow
  { g: "key", s: [72, 56, 80, 56, 80, 59, 72, 59] },
  { g: "key", ell: [82, 53.5, 3, 3.5] },
  { g: "key", ell: [82, 61.5, 3, 3.5] },
  // shell: a big copper cog housing on its back, behind the head
  { g: "shell", s: gear(57, 58, 16, 3.5, 11, -Math.PI / 2 + Math.PI / 11) },
  // battery terminal on top of the shell
  { g: "post", s: [55, 39, 60, 39, 60, 34, 55, 34] },
  { g: "post", s: [53, 34, 62, 34, 62, 32, 53, 32] },
  // body: one thick slug body pouring out from under the shell, its foot along the ground
  // toward the camera, its front curling up into a short thick neck under the head
  { g: "body", s: [84, 91, 80, 87, 70, 83, 56, 81, 46, 79, 42, 70, 40, 62, 34, 58, 26, 60, 23, 66, 24, 74, 24, 80, 18, 83, 12, 86, 11, 90, 14, 91] },
  // head: big and round, thrust forward over the foot, turned slightly left
  { g: "head", ell: [33, 49, 12, 10.5] },
  // static crest: frizzy slime spikes fanning out off the crown at uneven lengths, like hair
  // standing on end
  { g: "crest", s: [22, 46, 15, 38, 23, 41, 22, 31, 28, 38, 31, 27, 34, 37, 39, 29, 39, 38, 47, 34, 43, 43] },
  // plug antennae from the sides of the crown, splayed up and out; prongs point up
  { g: "farStalk", s: [24, 45, 18, 37, 15, 32, 17, 31, 21, 36, 27, 43] },
  { g: "farStalk", ell: [15.5, 29.5, 3, 3] },
  { g: "farStalk", s: [12, 24, 14, 24, 14, 28, 12, 28] },
  { g: "farStalk", s: [16, 23, 18, 23, 18, 27, 16, 27] },
  { g: "stalk", s: [40, 42, 45, 35, 48, 30, 50, 31, 48, 36, 43, 45] },
  { g: "stalk", ell: [50, 28, 3.5, 3.5] },
  { g: "stalk", s: [47, 20, 49, 20, 49, 25, 47, 25] },
  { g: "stalk", s: [51, 21, 53, 21, 53, 26, 51, 26] },
]

sprite("zapail_sil", { w: 96, h: 96 }, (c) => silhouette(c, parts))
sprite("zapail_parts", { w: 96, h: 96 }, (c) => partsView(c, parts))
