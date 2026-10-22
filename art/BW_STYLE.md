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
27. **Shrink the face from the concept.** Concept art has big anime eyes; BW sprites don't. Eyes
    are small (about 3-4 px wide, 4-5 tall: black, one white shine pixel top-left, the iris
    colour across the bottom, the Oshawott/Snivy formula), set in the upper half of the head;
    mouths are small. Copying the concept's eye size reads as fan art and makes eyes droop.
    On a 3/4 head the far eye sits against the face's edge, squashed (or hidden); the near eye is
    the big one and carries the detail (iris ring, pupil, shine). BW mouths have no black box
    around them: an open mouth is a shape in the dark mouth colour with a lighter tongue (Emolga).
28. **Copy the concept's silhouette, not an idea of it.** Measure it on a gridded underlay at
    sprite size (head shape, neck width, where parts overlap) instead of inventing proportions;
    take the concept's light and shade for the body masses, cut to 3 tones, then hand-draw the
    face and small details.

## Process (claude-pxl) — the professional order of work
Researched from the BW-style spriting community (Smogon sprite projects, PokéCommunity and
Dragonfly Cave guides) and measured on the owner's full Gen 5 sprite sheet. Each step fixes a
decision the next one depends on; never skip ahead.
1. **Gesture.** One line of action for the pose and one personality trait the pose acts out.
   Pick the 2-3 closest BW basics as size/angle guides and keep them next to the canvas.
2. **Line art first, at final size.** Smooth contours, never stair-stepped: pixel runs change
   gradually along a curve (5-4-3-2-1), straight edges use clean slopes (1:1, 1:2, 2:1), no
   doubled pixels in corners. Shapes are drawn as smooth curves (splines), never as a few straight
   polygon segments or by scaling a bigger drawing down. Check the silhouette solid black.
3. **Flats.** One base colour per material from a locked palette (15 colours max, shiny =
   palette swap).
4. **Cel shading, 3-4 levels.** Light from the top-left corner; form shadows on the lower-right
   of every part (rule 23), small highlights top-left; dithering only sparingly; enough contrast
   between tones that the shading reads; not oversaturated.
5. **Colour the lines (selective outline).** Gen 5 has pronounced **black** lines on the
   right and bottom of every part; the top/left lines take the material's darkest tone. Where a
   part overlaps another, its own line separates them (black on its right/bottom side).
6. **Face and details** by hand: eyes, mouth, markings, claws. Interior detail lines are
   coloured unless they sit in shadow.
7. **Clean-up.** Remove doubles and 2x2 line clumps, check against the guides at the same scale.
8. **Animation** like BW: paper-puppet parts (head, limbs, tail) pivoted and bobbed, frame 0 is
   the still.

### Faces in BW basics (measured)
- Faces turn about 3/4 toward the viewer while bodies stay closer to side-on, all facing left.
- Eyes are large vertical ovals sitting **low on the head and close together near the front**,
  just behind/above the muzzle. The far eye is squeezed against the face contour, often only a
  2-3 px sliver (Zorua, Deerling). Thick black upper lid, coloured iris, white glint, pupil and
  iris toward the front (looking at the opponent).
- Expression comes from the lid shape: Purrloin's sly half-closed almond eyes over a smile,
  Snivy's flat lid, Axew's determined round eye.
- Muzzles are small cream patches under the eyes; mouths are short lines or small shapes.

### Sleek vs chunky (measured)
- Legs 2-4 px thick, necks slim, torsos small and narrow with a waist, tails taper to a point
  (Purrloin, Deerling, Blitzle, Mienfoo). Bodies are smaller than the head on cute basics.
- Big round torsos, fat thighs and blob limbs read as "chunky" and cheap; avoid them.

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
