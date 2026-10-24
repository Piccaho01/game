# Verrow location style guide

How places in Verrow look, and the prompts the owner uses to draft them in ChatGPT. Same split as
the creatures (`BW_STYLE.md`): **ChatGPT drafts the identity** (concept, then BW2-style pixel
drafts of each location's unique pieces); **Claude makes it game-ready** (converts drafts onto the
16 px grid, builds the tiling terrain to match, animates, lays out maps, wires it in). Nothing is
built into the game before the owner approves the draft it comes from.

Why: a first attempt drawn entirely in code (`art/tools/tileset.py`, on branch
`claude/m4-identity`) came out symmetrical, generic, and "exactly a Pokémon starting town". Code is
good at tiles that repeat and join; it is bad at inventing a look.

## The pillars

1. **Patchwork world.** PATCH built Verrow from scraps of the four friends' lives, so every place
   is a stitch-up of things that shouldn't sit together: a Scottish stone cottage next to a
   pastel Colombian house next to a Burlington suburban garage. Where two scraps meet you can see
   the **seam**: the ground, wall or roof changes material along a stitched line, like the
   stitches on the UI's panels. One or two seams per screen, never everywhere.
2. **Built on the land, never on a grid.** Hills, terraces, ledges, stairs, slopes. Paths wind and
   fork. No mirrored layouts, no buildings lined up in rows. Every screen has height.
3. **One landmark per screen.** Something you could describe to a friend: PATCH's crash crater,
   the half-buried sanctuary, a van in a driveway. Everything else supports it.
4. **PATCH's tech leaks through.** Old CRT blue (`#4aa8ff`) glows in ruins and cracks; a hint of
   scan lines on glass; cables where there shouldn't be any. Rare and special: it means "the
   machine is underneath".
5. **The edge of the world shows.** Instead of a ring of trees, a map ends in real terrain (cliff
   drops, water, rooftops below, mist) and, now and then, in an **unfinished edge**: the ground
   breaks off into floating chunks over a dark grid, the world's wireframe showing. Use it where
   it means something (the Draft Archive, the crater's rim), not as decoration.
6. **Palette.** BW2 brightness and pixel density, but warmer and a touch less candy: golden-hour
   light from the top left, greens leaning olive and moss, warm stone. Man-made things share the
   UI's colours: rust red `#c2502f`, cream `#f3ead2`, faded blue `#3a78c8`, tape `#e9d9a8`,
   gunmetal `#353849`. Dark coloured outlines (never pure black), as in BW2.
7. **Lived-in.** Laundry lines, a bike on its side, chalk on the path, a hose, a cat. Small story
   props that make the friends say "that's so us" (inside jokes, bible §11, spread thin).

## Camera and scale (all locations)

- **Isometric (2:1)**, like the owner's concept: diamond tiles 32x16 px, each ground level 16 px
  high; set pieces are drawn from the front corner. (A straight top-down tileset was tried and
  rejected: the angled drafts looked like stickers on it.)
- The friends' walk sprites are 24x32; set-piece drafts come out at game scale already (a door is
  about as tall as a friend).
- One screen is 256x192 px. Hollow Rest is a 24x24 grid, about three screens wide.

## How a location is built
1. Owner: concept, pixel map, set pieces, terrain swatch (prompts below), into `art/concepts/locations/`.
2. `art/tools/draft2object.py` converts each set piece at native size.
3. `art/tools/terrain.py` repaints the swatch as seamless tiles (edit its palette from the swatch).
4. A layout script (like `art/tools/hollow_rest_layout.py`) writes the game's map file: terrain,
   `heights` (0 = sky), `objects`; it fails if a door, the sanctuary or an exit can't be reached.
5. `art/tools/iso_map.py <map>` bakes the look; the game loads it. Screenshots to the owner.

### Walk sprites for isometric (one prompt per friend, with their character sheet attached)
> Using this character sheet, draw an overworld walking sprite sheet in exactly the same
> pixel-art style and size as the small walk frames on the sheet, for an isometric game. 2 rows x
> 3 frames, evenly spaced on a flat white background, no text, no shadows: Row 1: walking toward
> the viewer, body turned 45 degrees to the LEFT (3/4 front view, facing down-left). Row 2:
> walking away from the viewer, body turned 45 degrees to the LEFT (3/4 back view, facing
> up-left). Columns: standing, left foot forward, right foot forward.

## Hollow Rest (start town)

**What it is (bible §9):** a sleepy hillside village around the ruined sanctuary; PATCH
crash-lands here. The friends start here; it's home base.

**Its scraps:**
- **Callum (Scotland → Canada):** a grey-stone cottage with a slate roof and a red door, thistles
  in the garden, a retro arcade cabinet on the porch under a tarp.
- **Dani (Colombia):** a pastel two-storey house (mint or coral) with a wooden balcony full of
  flower pots, terracotta roof tiles, a hammock, a football against the wall.
- **Nolan (Burlington suburb):** beige vinyl siding, a garage, a basketball hoop over the door, and
  **his dad's white work van** in the driveway (the van gag, bible §11; a neighbour watches it
  from a window with a coffee).
- **Haydon:** a little shed turned streaming room: a ring light glowing through the window,
  cables, a hand-painted sign on the door ("LIVE" with the V crossed out).

**Landmarks:**
- **PATCH's crash crater** in the middle of town: scorched ground, a long trench he ploughed
  through someone's garden, debris and bent panels, a thin line of smoke still rising, a fence
  he flattened. The friends' houses sit around it like it's always been there.
- **The sanctuary**, uphill at the top: old stone ruins half swallowed by the hill and roots,
  arches and a stair, dead CRT screens set into the stone, a faint blue glow in the cracks.
- The town sits on **three terraces** connected by stone stairs and a winding path; the south
  edge drops away as a cliff over the route below, with a view of rooftops and mist.

### Prompt 1: concept painting (pick the best of a few)
> Concept art for a cozy pixel RPG town called Hollow Rest, top-down 3/4 view like Pokémon Black
> and White 2's overworld but an original location. A sleepy village on a hillside, built on three
> terraces connected by stone stairs and a winding dirt path; nothing symmetrical. In the middle, a
> giant robot's fresh crash crater: scorched ground, a long trench through a garden, scattered
> metal panels, a thin line of smoke. Around it, mismatched houses that look stitched together from
> different countries: a grey Scottish stone cottage with a slate roof and red door; a pastel
> Colombian two-storey house with a wooden balcony, flower pots and terracotta roof tiles; a
> Canadian suburban house with beige siding, a garage and a white work van in the driveway; a
> small shed with a ring light glowing in the window. Where styles meet, the ground and walls
> change material along visible stitched seams. Uphill at the top, ancient stone sanctuary ruins
> half swallowed by the hill and tree roots, with old CRT monitors built into the stone glowing
> faint blue. The south edge drops away as a cliff over mist and distant rooftops. Warm golden-hour
> light from the top left, olive and moss greens, rust red, cream and faded blue accents.
> Lived-in details: laundry line, bike on its side, chalk on the path, a cat. No text, no UI, no
> characters.

### Prompt 2: pixel draft of the town (with the chosen concept attached)
> Redraw this as a Pokémon Black/White 2 overworld map: pixel art on a 16x16 tile grid, top-down
> 3/4 view, about 40 tiles wide and 30 tall, BW2 pixel density and shading, dark coloured outlines
> (not black), at most 32 colours. Keep the layout, terraces, crater and buildings from the
> concept. Flat, no perspective blur, no text, no characters.

### Prompt 3: set pieces, one per image (with the chosen concept attached)
> Draw only [the Scottish stone cottage / the Colombian house / the suburban house with the garage
> and the white van / the streaming shed / the crash crater with debris / the sanctuary ruins with
> the CRT stones] from this concept as a Pokémon Black/White 2 overworld sprite: pixel art,
> top-down 3/4 view on a 16x16 tile grid, about [5x4 / 6x5 / 3x3 / 8x6] tiles, BW2 shading, dark
> coloured outlines, flat white background, no shadow beyond the object's own, no text.

### Prompt 4: terrain swatch (so the tiles match the drafts)
> From this pixel map, draw a terrain swatch sheet in the same style and palette: 16x16 tiles of
> plain grass (4 variations), tall grass, dirt path, stone stairs, a grass ledge/cliff edge, the
> scorched crater ground, water, and the stitched seam between two ground materials. Each tile on
> its own with a white gap between them, flat white background.

Save the drafts in `art/concepts/locations/` (e.g. `hollow_rest_concept.png`,
`hollow_rest_map.png`, `hollow_rest_cottage.png`). Then Claude converts them and builds **one
in-game test screen** for approval before anything else.

## Checklist for every location draft
- Could you tell which location this is from a single screen? (landmark, scraps)
- Is anything mirrored or in a row? Break it.
- Is there height? (terraces, cliffs, stairs)
- Does the edge of the map end in terrain, not a tree wall?
- Is there one seam or one bit of PATCH tech, not ten?
- Do the man-made colours match the UI palette?
