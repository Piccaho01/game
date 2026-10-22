// Shared renderer for creature battle sprites, the Furnaxol method (furnaxol.px.js) made
// reusable. Load with include("lib/creature.js") and build a renderer with creature({...}).
//
// Parts are listed back to front. Geometry is in design space and scaled by K about the bottom
// centre of the canvas (feet on y = 91), except grids, which are placed in output pixels:
//   s: [x, y, ...] polygon | ell: [cx, cy, rx, ry] | grid: [x, y, rows] ("#" = in) |
//   fn: (x, y) => bool (output pixels)
//   ox, oy: output-pixel offset (animation: breathing, sway)
// Colour and shading, one light from the upper left (all offsets in output pixels):
//   c: base colour key
//   tone: [[geometry, key, emissive]] sub-regions recoloured (emissive: never shaded)
//   sh: [dx, dy]  shadow crescent: pixels whose (x+dx, y+dy) falls outside the part
//   hl: geometry  highlight shape on the lit plane; top: n  lit top edge, n px deep
//   cast: true    casts a shadow down-right onto the parts behind it
//   mat: name     parts of the same material meet with a soft line (the material's darkest
//                 tone) instead of black
//   glint: [[x, y]] white specular pixels (design space)
// Outline: BW selective outline. Lit (top/left) silhouette edges take the material's darkest
// tone, shadow edges and overlaps between different materials are black.

function creature({ K, SHADOW, LIGHT, SELOUT, N = 96 }) {
  const T = (pts) => pts.map((v, i) => (i % 2 ? 91 - (91 - v) * K : 48 + (v - 48) * K))

  function inPoly(pts, x, y) {
    const px = x + 0.5, py = y + 0.5
    let inside = false
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  // geometry test in output pixels; o = the owning part (for its offset)
  function inGeom(q, x, y, o = q) {
    x -= o.ox || 0; y -= o.oy || 0
    if (q.fn) return q.fn(x, y)
    if (q.grid) return (q.grid[2].trim().split("\n")[y - q.grid[1]] || "").trim()[x - q.grid[0]] === "#"
    if (q.ell) {
      const [cx, cy] = T(q.ell.slice(0, 2))
      return ((x + 0.5 - cx) / (q.ell[2] * K)) ** 2 + ((y + 0.5 - cy) / (q.ell[3] * K)) ** 2 <= 1
    }
    return inPoly(T(q.s), x, y)
  }
  const inPart = (p, x, y) => inGeom(p, x, y)
  const geom = (g) => (Array.isArray(g) ? { s: g } : g)

  function silhouette(c, parts) {
    for (const p of parts) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inPart(p, x, y)) c.px(x, y, "k")
  }

  // silhouette with each part's contour drawn in, to judge the pose before colour
  function partsView(c, parts) {
    const own = new Int16Array(N * N).fill(-1)
    parts.forEach((p, i) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inPart(p, x, y)) own[y * N + x] = i })
    const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : own[y * N + x])
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = at(x, y)
      if (i < 0) continue
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const j = at(x + dx, y + dy)
        return j < 0 || (j < i && parts[j].g !== parts[i].g)
      })
      c.px(x, y, edge ? "k" : "#9a94a8")
    }
  }

  // lines: false | true (black contours) | "sel" (selective outline); shading: bool
  function render(c, parts, { lines, shading }) {
    const own = new Int16Array(N * N).fill(-1), col = new Array(N * N).fill(null)
    parts.forEach((p, i) => {
      const inP = (x, y) => inPart(p, x, y)
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!inP(x, y)) continue
        let k = p.c, emit = false
        for (const [t, tc, e] of p.tone || []) if (inGeom(geom(t), x, y, p)) { k = tc; emit = !!e }
        if (shading && !emit) {
          const base = k
          if (p.hl && inGeom(geom(p.hl), x, y, p)) k = LIGHT[base] || base
          if (p.top && !inP(x, y - p.top)) k = LIGHT[base] || base
          let dark = p.sh && !inP(x + p.sh[0], y + p.sh[1])
          for (let j = i + 1; j < parts.length && !dark; j++)
            if (parts[j].cast && parts[j].g !== p.g && inPart(parts[j], x - 1, y - 2)) dark = true
          if (dark) k = SHADOW[base] || base
        }
        own[y * N + x] = i; col[y * N + x] = k
      }
    })
    const out = col.slice(), at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : own[y * N + x])
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = own[y * N + x]
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = at(x + dx, y + dy)
        if (i < 0 && j >= 0) {                                               // outer outline
          const lit = (dx === 1 || dy === 1) && at(x - 1, y) < 0 && at(x, y - 1) < 0
          out[y * N + x] = lines === "sel" && lit ? SELOUT[col[(y + dy) * N + x + dx]] || "k" : "k"; break
        }
        if (lines && i >= 0 && j >= 0 && j < i && parts[j].g !== parts[i].g) {  // overlaps
          const soft = parts[i].mat && parts[i].mat === parts[j].mat
          out[y * N + x] = soft ? SELOUT[parts[i].c] || "k" : "k"; break
        }
      }
    }
    if (shading) for (const p of parts) for (const g of p.glint || []) {
      const [x, y] = T(g).map(Math.floor), xx = x + (p.ox || 0), yy = y + (p.oy || 0)
      if (out[yy * N + xx] && out[yy * N + xx] !== "k") out[yy * N + xx] = "w"
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (out[y * N + x]) c.px(x, y, out[y * N + x])
  }

  return { T, inPart, silhouette, partsView, render }
}

// Archimedean spiral band around a design-space centre, as an fn geometry: pixels within
// `width` (0..1 of the pitch) of the winding. pitch in output pixels.
function spiral(T, [cx, cy], pitch, width, turn = 0) {
  const [ox, oy] = T([cx, cy])
  return { fn: (x, y) => {
    const dx = x + 0.5 - ox, dy = y + 0.5 - oy
    const ph = (Math.hypot(dx, dy) / pitch - Math.atan2(dy, dx) / (2 * Math.PI) + turn) % 1
    return (ph + 1) % 1 < width
  } }
}
