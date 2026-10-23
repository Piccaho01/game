# Build plan

Goal: a **playable, shareable vertical slice** (bible §14 step 3) that the four friends can open
from a link on their phones. Ordered so that **every milestone ends in something playable or
finished**, so stopping at any point still leaves a real product.

Rules that keep it efficient:
- **Code before more art.** Game code is cheap to write and test; art needs review rounds.
  The game runs on placeholder art until each sprite is approved.
- **Two art checkpoints per creature**, batched across creatures: (1) all silhouettes
  together, (2) all finished sprites + idle animations together. Concepts are already
  approved in the bible §13, so no separate pitch round for them.
- **One fresh session per milestone.** Every message in a long session re-reads the whole
  conversation; a new session that reads `CLAUDE.md` + this file starts cheap.
- Status lives here: tick milestones off as they land.

## Status
- [x] Bible, art style guide (`art/BW_STYLE.md`), sprite pipeline validated (Furnaxol + idle)
- [x] M1 Foundation (live once Pages is enabled: Settings → Pages → Source: GitHub Actions)
- [x] M2 Stage-1 starters (branch `claude/m2-starters`: all four with front, idle, back and back idle in game; see "M2 handoff" below)
- [ ] M3 Core loop (in progress on branch `claude/m3-core-loop`: seal minigame in battle; next: sealed Patchlings join a team + bestiary stages + sanctuary progress, save, character and starter pick, leader assists)
- [ ] M4 Characters + world slice
- [ ] M5 Playtest build
- [ ] After the slice: evolutions, Connor, more of Verrow

## M1 Foundation (code)
- Vite + TypeScript + Phaser 3 project in `game/`; touch-first input; scales to phone screens.
- Data in JSON: the 10 types and a first-pass matchup chart, moves, Patchlings (all 12
  starter forms with stats, abilities, signature moves; sprites optional), bestiary lore.
- BW-style battle scene: front sprite top-right, back sprite bottom-left, HP bars, move menu,
  text box; turn order, damage formula, type effectiveness, status basics.
- Unit tests for damage, type chart and turn order; a headless browser check that the game
  boots and a battle completes.
- Deploy: GitHub Actions builds and publishes to GitHub Pages on every push to `main`
  (the owner enables Pages once: repo Settings → Pages → Source: GitHub Actions).
- **Done when:** a link opens on a phone and Furnaxol can fight and win a placeholder battle.

## M2 Stage-1 starters (art)
- Zapail, Sprigby, Gobbin from their approved concepts, using the Furnaxol method.
- Checkpoint 1: three silhouettes in one message. Checkpoint 2: three finished sprites
  with idle loops in one message.
- Back sprites for all four (BW shows your own Patchling from behind; simpler, less detail).
- **Done when:** all four stage-1 starters battle in game with front, back and idle frames.

### M2 handoff (read this first)
Work happens on branch `claude/m2-starters`. Rules: `art/BW_STYLE.md`, especially rules 19-26
(added after the owner's reviews this milestone).

**State**
- **Furnaxol is approved** and was shrunk to 80% to match the other starters (`art/creatures/furnaxol.px.js`, frame grids; the original build is `art/creatures/wip/furnaxol_large.px.js`). Do not re-pose it.
- **Sprigby is approved** (`art/creatures/sprigby.px.js`): translated from the concept art, front,
  idle, back and back idle, in game. The back is translated from the owner's back concept
  (`art/concepts/sprigby_back.png`), stubbier to match the front. Its head is a **round head** with the muzzle as a cream patch
  inside the face (no snout: every snout attempt read as an anteater); copy the concept's head
  shape, not other Pokémon's.
- The battle scene shows the player's Patchling from behind at 2x when `<sprite>_back` exists
  (`sprigby_back`, `sprigby_back_idle`); otherwise the front sprite mirrored.
- **Zapail front and idle are approved** (`art/creatures/zapail.px.js`, 12 frame grids: breath,
  turning coil, flickering arc). Built in scratch with a small Python painter (concept silhouette
  and tones + hand face); the lessons are BW_STYLE rules 27-28. Back sprite done: the gear face looks at the camera.
- **Gobbin is approved** (`art/creatures/gobbin.px.js`): translated with the material classifier
  (BW_STYLE checklist), front, idle (breath + the goblin-shark jaw firing forward), back and back
  idle. The owner dropped the concept's throat glow.
- **Furnaxol's back** is translated from the owner's back concept (`art/concepts/furnaxol_back.png`,
  already pixel art: resampled on its own grid, then shrunk by dropping low-detail rows and
  columns). M2 is done; next is M3.
- `art/creatures/wip/` holds rejected redesign attempts (useful only as a record of what not to do).
- `art/creatures/lib/creature.js` is the shared renderer (parts, tones, shading, selective
  outline, pinhole fill); include it from new creature files.

**Owner feedback, in short (what went wrong)**
- Too generic, no identity; poses that don't act a personality.
- **Chunky.** BW2 sprites are sleek: thin tapering limbs, narrow waists, simple strong shapes.
  Basic/starter forms are **small** (roughly Snivy/Tepig/Oshawott size, ~35-45 px tall), not
  Infernape-sized. The last Sprigby "looked like it had too many cheeseburgers".
- Angle: 3/4 toward screen-left like the BW references, head turned so the face shows. Not a
  side profile, not facing the camera.
- Stage 1 must be appealing: the latest Gobbin "looked like a horror game".
- Built from ellipses and thin shadow rims, the sprites read as clip art; references use big form
  shadows and organic shapes.

**Design decisions the owner has made**
- Zapail: keep the copper shell with cog teeth, a coil on its face and a battery terminal (no
  wind-up key), clearly seated on/attached to the body; plug-shaped antennae worked.
- Sprigby: sleek; kangaroo stance leaning on its tail; head tipped down, little to no neck; short
  arms (no long arms); no heel spring; leaf ears; cocky scrapper personality.
- Gobbin: a goblin shark, so the big spring jaw (protrusible jaw) is its hook; goblin touches;
  a tattered hood whose front edge arches; ears visible; keep the fin cape. Not horror.

**New direction (end of the first session):** the owner will make concept art in official
Pokémon (Sugimori) style with ChatGPT; we translate it into BW sprites the way Game Freak did
(the BW front sprite is the official art's pose at sprite size, the back sprite the same pose
from behind). Plan: calibrate an art-to-sprite translator on real pairs (official artwork + BW
front/back sprites for all Unova Pokémon, from the public PokeAPI/sprites repo via a sparse
git clone into scratch space; never commit them), then translate the owner's art and finish by
hand. Facing = the art's angle: body and face toward the viewer, turned slightly left, both eyes
visible. `art/creatures/lib/sprite.js` (spline line art, selective outline) is a start for the
clean-up stage; its automatic form shading looked like a vector render and is not BW enough.

**Next steps (older)**
1. (Done in the first session: the album was downloaded and studied; sizes are in BW_STYLE rule
   20. Sprigby was redone at true size as `art/creatures/wip/sprigby2.px.js`, awaiting review.)
   Get the owner's full BW2 sprite reference sheet (Imgur album
   `https://imgur.com/a/pokemon-sprites-c5nZi`; needs `imgur.com` and `i.imgur.com` allowed in the
   environment's network settings, or the owner attaches the images). Study the basic forms and the
   Unova starter lines: sizes, limb thickness, shading, eye and mouth style. The owner's earlier
   reference set (Scizor, Entei, Aggron, Infernape, Machoke, Exploud, Torkoal, Deoxys, Rayquaza,
   Spiritomb, Banette) was attached in the previous session and is not in the repo; ask for it
   again if needed. Never commit reference sprites.
2. One creature at a time (rule 26), Sprigby first: silhouette next to BW2 basics at the same
   scale, then colour and face, the owner approving each stage before the next creature.
3. Then idle loops, back sprites for all four, swap into the game, tick M2.

## M3 Core loop (code)
- Choose a character and pick any starter (not tied to a character).
- Wild encounter → battle → **seal** rhythm minigame (patterns for Fire, Water, Plant, Spark
  first) → bestiary entry advances Sighted → Tracked → Studied → Sealed → Bonded →
  sanctuary progress.
- Leader assists for all four (Scan, Patch Up, Taunt, Shield).
- Save to the browser (local storage) so progress survives closing the tab.
- **Done when:** the full loop works start to finish with the four starters.

### Seal (built)
- `game/src/data/seals.json` holds the patterns (Fire *Kindle*: speeds up; Water *Tide*: pairs
  then a swell; Plant *Root*: slow pulse, last beat early; Spark *Arc*: quick triples), timing
  windows and scoring; other types use an even default beat until they get their own.
- Rings close on the target; tap anywhere as each lands. Perfect/good/miss; taps between beats
  count against you. A weaker target widens the windows and lowers the score needed (50% at
  0 HP, 80% at full HP). Bond: strong (85%+), steady (65%+), wary (sealed but sloppy).
- A broken seal costs the turn. All numbers are first guesses: tune them on a phone.

## M4 Characters + world slice (art + code)
- From the owner's photos (bible §6 Looks): BW trainer battle sprite and a 4-direction
  overworld walk cycle for Callum, Nolan, Haydon, Dani; then PATCH.
- Two common route Patchlings for wild encounters (pitched first, one batch).
- Hollow Rest + Route 1 tiles and maps; PATCH's crash-landing intro and tutorial dialogue in
  the bible's voice; sanctuary hub with the first wing to restore.
- **Done when:** a new player goes from the intro to restoring the first sanctuary wing.

## M5 Playtest build
- Bug pass on phones (iOS Safari, Android Chrome), balance pass, the link shared with the
  group, one round of fixes from their feedback.

## After the slice
- Evolutions (8 sprites: Cullet, Vitric, Tesnail, Gauslug, Fernaroo, Scytharoo, Gulpjaw,
  Harrowjaw), attack animations (Glassblow first), Connor's "cancelled" first boss fight,
  Kettleport / Emberwick, more inside jokes from bible §11.
