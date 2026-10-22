# BW sprite style guide (study notes + rules)

Rules for every creature sprite in this game, extracted at pixel level from BW battle
sprites the owner supplied (Infernape, Entei, Machoke, Exploud, Aggron, Scizor, Rayquaza,
Torkoal, Banette, Spiritomb, Deoxys) plus the owner's own 64x64 sprites (Sonnet set).
Measurements come from `pixel-art-studio/scripts/study.py` and direct pixel counts.

## Measured facts

| | Infernape | Entei | Machoke | Exploud | Aggron | Torkoal | Banette |
|---|---|---|---|---|---|---|---|
| body box (px) | 62x68 | 75x68 | 63x68 | 64x68 | 72x72 | 62x64 | 49x51 |
| colours | 15 | 15 | 15 | 15 | 13 | 14 | 15 |
| silhouette edge that is black | 37% | 45% | 67% | 68% | 68% | 30% | 60% |
| black share of all pixels | 11% | 12% | 16% | 16% | 25% | 6% | 14% |
| checker dither | 2.2% | 0.7% | 1.8% | – | – | – | – |

- Canvas is **96x96**. Body boxes range from ~50 px (small/basic stages) to ~75–90 px
  (final stages, legendaries). Size is part of the design: never fit every creature to
  the same box.
- 11–15 colours per sprite. Each material gets 3–4 tones; white is a real highlight
  colour (5–9% of pixels on Infernape and Entei).

## Rules

### Silhouette first
1. The silhouette alone must say what the creature is and what it is doing. Asymmetric,
   dynamic and readable as a solid black shape (test with the silhouette render).
2. Protrusions give the silhouette character: hair or flame spikes, ear tufts, tail
   tips, claws. Fur edges break into **2–3 px tufts**, never a smooth curve.
3. 3/4 front view facing screen-left (opponent sprite). Near limbs are bigger and
   lower; far limbs are smaller, higher and partly hidden.

### Anatomy
4. Limbs are built from masses, not tubes: shoulder or hip bulge, upper limb, a visible
   joint (elbow, knee or hock), lower limb tapering to the wrist or ankle, then a paw
   **wider than the leg** (about 1.3x).
5. Quadruped hind legs: thigh forward, hock bent back, foot forward. Forelegs: shoulder
   blade, elbow tucked behind, straight forearm, paw.
6. Paws and feet: toes split by 1 px black lines (2–3 toes visible), a lighter top
   plane and a shadow underside. Claws are 1–2 px pale tips with a dark outline.
7. Far-side limbs and the far half of the body are drawn **entirely in the shadow
   tone** of their material (Entei's far legs), not merely darkened at the edges.

### Outline (selective, BW-style)
8. Silhouette edge: black on the shadow side (bottom and right) and wherever a part
   ends sharply; the material's **darkest tone** on lit edges (top and left) and along
   fur.
9. Interior overlaps (a limb over the body, the head over the chest): black.
   Same-material fur overlaps: the darkest tone of that material.
10. Fur clump lines: 1 px strokes in the darkest tone, 2–5 px long, starting at an
    edge or tuft and tapering inward. They follow the fur's growth direction.

### Shading
11. One light source, upper-left front. Cel shading: base, shadow, light, plus white
    or near-white specular dots on glossy parts (eyes, claws, metal, wet noses).
12. Shadow shapes follow the **form**: muscle groups, the underside of the jaw, the
    shadow cast by the head onto the chest, the inside of a bent limb. Never a uniform
    band hugging the outline ("pillow shading").
13. Shadow tones are hue-shifted toward purple or brown (Entei: tan `#cda462` → shadow
    `#83524a` → line `#522900`), highlights toward yellow or white.
14. Dither only in tiny transition spots (<2% of pixels). None on faces.

### Faces
15. Eyes are drawn by hand, pixel by pixel. In 3/4 view the far eye uses the same
    design, **narrower** (foreshortened) but the same height, so it reads as the same
    eye turned away. Never a smaller, different-shaped eye.
16. Teeth and fangs: white with a black outline on every side that touches skin, at
    least 2 px wide at the root; mouth interiors are dark red, not black.
17. Each type has its own eye and mouth design (CLAUDE.md §4). Fire: see
    `creatures/kindlet.px.js`.

### From the owner's Sonnet sprites (what makes them appealing)
18. Design beats rendering: a big head, an expressive face (brows, a toothy grin),
    chunky colour clusters of 3+ px, and a bold dark outline. Every sprite needs one
    instantly readable "hook" (a flame mohawk, a shell, a big tail).

### Facing, proportions and personality (from the owner's review of the first starter batch)
19. **Angle: 3/4 toward screen-left, like every reference.** The body is turned about 45°
    toward the opponent; the head turns a little further so the face shows (near eye on the
    right of the nose bridge, far eye foreshortened toward the snout). Near limbs (the
    creature's right side) are on screen-right and bigger; a limb reaching for the opponent
    comes forward on the left. Never a flat side profile, never squared to the camera. The
    back sprite is the same pose seen from behind.
20. **Starter size and proportions** (measured on BW sprites): basic forms are small and sleek.
    Body boxes: Snivy 40x37, Tepig 33x39, Oshawott 29x36, Scraggy 32x40, Axew 36x45, Zorua
    40x47, Shelmet 40x35, all on the 96x96 canvas. Arms 2-3 px thick, legs 3-4 px, eyes about
    4-6 px, heads about half the height. Draw at this size pixel by pixel; never scale down a big
    drawing (that is what made the first attempts chunky).
21. **Personality first**: every creature gets one trait (smug, cocky, jittery, sly...) that the
    brows, mouth and pose all sell. "The animal plus its gimmick" is not a design. The pose
    *acts* the trait (hand on hip, leaning back on a tail, rubbing hands together).
22. Draw parts in perspective with the head: a mouth on a 3/4 head follows the head's turn.
23. **Shadow masses, not crescents.** In the references the shadow side is a big shape that
    follows the form: often a third to half of a body part sits in the shadow tone (the back,
    the underside, the far half). A 1-2 px rim of shadow reads as flat clip art.
24. **Organic shapes.** No perfect ellipses: masses bulge and taper, edges carry notches,
    tufts and joints. Eyes stay modest relative to the head; expression comes from lid and
    brow shape, not eye size.
25. **Stage 1 is appealing first.** Menace and horror belong to final evolutions; a starter
    can be cocky or sly but must stay cute.
26. Work one creature at a time, checking it next to the references at the same scale at every
    stage (silhouette, colour, face) before starting the next.

## Process (claude-pxl)
1. **Silhouette**: block the pose in one colour (pxl primitives are fine at this
   stage), check the silhouette render, iterate until the pose and anatomy read.
2. **Flats**: one base colour per material.
3. **Shading**: shadow and highlight shapes by form, placed by hand as grid patches.
4. **Lines**: selective outline, interior overlaps, fur clump lines.
5. **Details**: face, claws, specular highlights, type markings.
6. Check every stage against the references at the same scale (comparison sheet) and
   show it to the owner before moving on.
7. Animation (BW2-style idle loop) only after the still is approved.

## Lessons from the first approved creature (Furnaxol)
What worked, in order of how much it mattered. Start the next creature from
`creatures/furnaxol.px.js` and keep these:
1. **Concept with a hook and a story** tied to Verrow (glassblower axolotl from Emberwick),
   and a battle pose that *acts* (blowing a bubble like a blowgun shot), not a pose that
   holds a prop.
2. **Silhouette as one traced contour** for the body; every other part overlaps deep into
   what it attaches to. Stacking separate primitives makes parts look like they float.
3. **Starter size**: ~50 px tall on the 96x96 canvas (about 2/3 of a final stage).
4. **Limbs at true scale**: legs are a round thigh, a short shin and a flat foot; both legs
   as thick as each other. Small limbs (arms, hands) are hand-placed pixel grids at least
   5 px thick. Scaling polygons down turns them into stalks.
5. **Weight reads from the legs**: the loaded leg bends at the knee over a flat foot, the
   other stretches out on its toes.
6. **Eyes look at the target**, never at the viewer: pupils against the front of the eye.
7. **Light sources are emissive**: glows (belly furnace, molten glass) skip shading and
   bloom onto the skin around them, otherwise they read as stones stuck on.
8. **Soft joins** where same-material parts meet (dark-red line, lit top edge), black only
   for real overlaps and the shadow-side outline.
9. **Idle animation** is generated from the same pose: a 1 px breath on the head side,
   flame flicker that is zero at frame 0, glow pulses. Frame 0 is the approved still.
