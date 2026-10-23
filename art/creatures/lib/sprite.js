// Line-art-first sprite kit, following the BW order of work (art/BW_STYLE.md, Process):
// smooth contours at final size -> clean 1 px line art -> flats -> form shading (3 tones, light
// from the top-left) -> selective outline (black on the right/bottom of every part, the
// material's dark tone top/left) -> hand-placed face and details.
// Load with include("../lib/sprite.js") and build a kit with spriteKit({ mats }).
//
// Parts are listed back to front; coordinates are output pixels on the 96x96 canvas.
//   path: [[x, y], [x, y, 1], ...]  a closed smooth curve through the points (centripetal
//                                    Catmull-Rom); a third value 1 marks a sharp corner (tips)
//   ell: [cx, cy, rx, ry]           an ellipse
//   g: group name                   parts in one group are one shape (no line between them)
//   mat: material name              see mats below
//   tones: [{ path | ell | fn, mat }]  regions of the part in another material (a cream belly),
//                                    shaded with the part's form
//   flat: key                       no form shading, one colour (emissive glows)
//   ox, oy                          output-pixel offset (animation)
//   thick                           the form's radius in px (default: the shape's own); a
//                                    bigger value flattens the shading
// mats: { name: { line, ramp: [shadow, base, light], deep? } } with palette keys.

function spriteKit({ mats, N = 96, light = [-0.5, -0.7, 0.55], ts = 0.3, tl = 0.88 }) {
  const L = (() => { const n = Math.hypot(...light); return light.map((v) => v / n) })()

  // centripetal Catmull-Rom through closed control points; sharp points get zero tangents
  function curve(pts, per = 12) {
    const n = pts.length, out = []
    const P = (i) => pts[(i + n) % n]
    for (let i = 0; i < n; i++) {
      const p1 = P(i), p2 = P(i + 1)
      const p0 = p1[2] ? p1 : P(i - 1), p3 = p2[2] ? p2 : P(i + 2)
      const t = (a, b, t0) => t0 + Math.max(1e-4, Math.hypot(b[0] - a[0], b[1] - a[1]) ** 0.5)
      const t0 = 0, t1 = t(p0, p1, t0), t2 = t(p1, p2, t1), t3 = t(p2, p3, t2)
      for (let k = 0; k < per; k++) {
        const tt = t1 + ((t2 - t1) * k) / per
        const lerp = (a, b, ta, tb) => [0, 1].map((j) => ((tb - tt) * a[j] + (tt - ta) * b[j]) / (tb - ta))
        const A1 = lerp(p0, p1, t0, t1), A2 = lerp(p1, p2, t1, t2), A3 = lerp(p2, p3, t2, t3)
        const B1 = lerp(A1, A2, t0, t2), B2 = lerp(A2, A3, t1, t3)
        out.push(lerp(B1, B2, t1, t2))
      }
    }
    return out
  }
  function inPoly(poly, px, py) {
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  // a geometry -> test function on pixel (x, y), with an offset
  function tester(q, ox = 0, oy = 0) {
    if (q.fn) return (x, y) => q.fn(x - ox, y - oy)
    if (q.ell) {
      const [cx, cy, rx, ry] = q.ell
      return (x, y) => ((x - ox + 0.5 - cx) / rx) ** 2 + ((y - oy + 0.5 - cy) / ry) ** 2 <= 1
    }
    const poly = q._poly || (q._poly = curve(q.path))
    return (x, y) => inPoly(poly, x - ox + 0.5, y - oy + 0.5)
  }

  function build(parts) {
    const own = new Int16Array(N * N).fill(-1)
    const groups = {}, masks = parts.map((p, i) => {
      const t = tester(p, p.ox || 0, p.oy || 0), m = new Uint8Array(N * N)
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (t(x, y)) { m[y * N + x] = 1; own[y * N + x] = i }
      const g = p.g || "#" + i
      if (!groups[g]) groups[g] = new Uint8Array(N * N)
      for (let q = 0; q < N * N; q++) if (m[q]) groups[g][q] = 1
      return m
    })
    return { own, masks, groups }
  }

  // form shading: each group is a rounded volume (height from its distance transform);
  // returns the light intensity per pixel
  function lighting(parts, { groups }) {
    const I = new Float32Array(N * N).fill(1)
    for (const [g, m] of Object.entries(groups)) {
      const inside = [], edge = []
      for (let q = 0; q < N * N; q++) {
        if (!m[q]) continue
        inside.push(q)
        const x = q % N, y = (q / N) | 0
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy
          if (xx < 0 || yy < 0 || xx >= N || yy >= N || !m[yy * N + xx]) { edge.push([xx + 0.5 - dx * 0.5, yy + 0.5 - dy * 0.5]); break }
        }
      }
      const d = new Float32Array(N * N)
      let R = 0
      for (const q of inside) {
        const x = (q % N) + 0.5, y = ((q / N) | 0) + 0.5
        let best = 1e9
        for (const [ex, ey] of edge) { const v = (ex - x) ** 2 + (ey - y) ** 2; if (v < best) best = v }
        d[q] = Math.sqrt(best); R = Math.max(R, d[q])
      }
      const part = parts.find((p) => (p.g || "") === g)
      const Rr = (part && part.thick) || Math.max(1.5, R)
      // height field, smoothed so the light follows the big form, not the pixel steps
      let h = new Float32Array(N * N)
      for (const q of inside) h[q] = Rr * Math.sqrt(Math.max(0, 1 - (1 - Math.min(d[q] / Rr, 1)) ** 2))
      for (let pass = 0; pass < 2; pass++) {
        const h2 = new Float32Array(N * N)
        for (const q of inside) {
          const x = q % N, y = (q / N) | 0
          let s = 0, n = 0
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy
            if (xx < 0 || yy < 0 || xx >= N || yy >= N) { n++; continue }
            s += m[yy * N + xx] ? h[yy * N + xx] : 0; n++
          }
          h2[q] = s / n
        }
        h = h2
      }
      const H = (q) => (q < 0 || q >= N * N || !m[q] ? 0 : h[q])
      for (const q of inside) {
        const x = q % N
        const hx = (x < N - 1 ? H(q + 1) : 0) - (x > 0 ? H(q - 1) : 0)
        const hy = H(q + N) - H(q - N)
        const nx = -hx / 2, ny = -hy / 2, nz = 1, nn = Math.hypot(nx, ny, nz)
        I[q] = (nx * L[0] + ny * L[1] + nz * L[2]) / nn
      }
    }
    return I
  }

  // stage: "sil" | "lines" | "flats" | "shaded" | "final"
  function render(c, parts, stage = "final") {
    const B = build(parts), { own, masks, groups } = B
    const gOf = (i) => parts[i].g || "#" + i
    const I = stage === "shaded" || stage === "final" ? lighting(parts, B) : null
    const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : own[y * N + x])
    const tone = new Int8Array(N * N).fill(-1), pend = []
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = at(x, y)
      if (i < 0) continue
      const p = parts[i], q = y * N + x
      if (stage === "sil") { c.px(x, y, "k"); continue }
      // line: an edge of this part's group, facing outside the group
      const gm = groups[gOf(i)]
      const out = [[1, 0], [0, 1], [-1, 0], [0, -1]].filter(([dx, dy]) => {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) return true
        if (gm[yy * N + xx]) return false
        const j = own[yy * N + xx]
        return j < 0 || j < i            // outside, or a part behind this one
      })
      // material at this pixel (tone regions override the part's)
      let mat = p.mat
      for (const t of p.tones || []) if (tester(t, p.ox || 0, p.oy || 0)(x, y)) mat = t.mat
      const M = mats[mat] || {}
      if (out.length && !p.noline) {
        const dark = out.some(([dx, dy]) => dx === 1 || dy === 1)
        c.px(x, y, stage === "lines" ? "k" : dark ? "k" : M.line || "k"); continue
      }
      if (stage === "lines") { c.px(x, y, "w"); continue }
      if (p.flat) { c.px(x, y, p.flat); continue }
      if (stage === "flats") { c.px(x, y, M.ramp[1]); continue }
      // shading: form light, then cast shadow from parts in front (light from the top-left)
      let v = I[q]
      for (const [dx, dy] of [[-1, -1], [-1, -2], [-2, -2]]) {
        const j = at(x + dx, y + dy)
        if (j > i && gOf(j) !== gOf(i) && !parts[j].flat) { v = Math.min(v, ts - 0.01); break }
      }
      tone[q] = v < ts ? (M.deep && v < ts - 0.35 ? 3 : 0) : v > tl ? 2 : 1
      pend.push([x, y, q, M])
    }
    // clean-up: a lone shading pixel (no same-tone 4-neighbour) takes its neighbours' tone
    for (const [x, y, q, M] of pend) {
      const nb = [q - 1, q + 1, q - N, q + N].filter((r) => r >= 0 && r < N * N && tone[r] >= 0)
      if (nb.length >= 3 && !nb.some((r) => tone[r] === tone[q])) {
        const cnt = {}
        for (const r of nb) cnt[tone[r]] = (cnt[tone[r]] || 0) + 1
        tone[q] = +Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]
      }
    }
    for (const [x, y, q, M] of pend) c.px(x, y, tone[q] === 3 ? M.deep : M.ramp[tone[q]])
  }

  return { curve, render, tester }
}
