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
- [x] M3 Core loop (pick a leader and starter → wild battle → seal → team/sanctuary → bestiary stages and sanctuary points, leader assists, switching, saved in the browser)
- [x] M4 Characters + world slice (done with the M4 wrap-up; was: Hollow Rest isometric with the owner's terrain/props and pixel-art walk sprites on `claude/m4-polish`; left: story intro, Route 1 isometric, townsfolk)
- [x] M4b The squad, the base, the story (story PR #21; squad, world and systems in the M4 wrap-up)
- [x] M4 wrap-up (branch `claude/kind-bell-uvy1u4`): World and Systems tracks merged; townsfolk from the owner's sheets; all seven rooms are the owner's concepts (`art/tools/room_concept.py` + `rooms.json`); new jokes (LeBron, Parker Colt, Strikes, Dani's mamá on the phone).
  **Handoff:** next is M5 (playtest build). Carried over, not blocking: Connor's battle/walk sprites (with his first boss fight), trainer battle portraits for the four, NPCs only have a front pose, the boulder's spot in Hollow Rest is a first guess, rooms are a bit wider than the top screen (camera scrolls). Room piece sheets (`interior_*_pieces.png`) are unused, kept for edits.
- [ ] M5 Playtest build (branch `claude/peaceful-darwin-3db5u5`): field moves for all four, balance pass, phone fixes done; **left: share the link with the group, one round of fixes from their feedback.** See "M5 handoff".
- [x] M6 Game shell (merged, PR #27). See "M6 handoff".
- [x] M7 Evolution lines (branch `claude/affectionate-wozniak-wh7dgz`): all 12 forms, every creature double-res with its own idle, glitch evolve scene, live attack animations. See "M7 handoff".
- [ ] Next: Chapter 1, finish Route 1 (roadmap step 4)

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

### Team, sanctuary, bestiary, save (built)
- `game/src/data/progress.json`: team of 6 (owner's call); a seal with a full team goes straight to
  the sanctuary. The starter comes bonded (its whole entry open).
- Bestiary stages: Sighted (seen once), Tracked (seen twice or beaten once), Studied (seen 5 times
  or beaten 3), Sealed, Bonded (sealed with a strong bond). Stages can be skipped; reaching one
  opens all earlier lore. Sanctuary points = sum of stages (wings unlock on points in M4).
- Bond boosts stats: strong +10%, steady +5%, wary +0.
- Saved in the browser (localStorage) after every change; `?reset` starts over.
- Journal (end of battle): TEAM (pick the lead) and BESTIARY (lore pages per stage).
- Switching (built): TEAM in battle swaps Patchlings (takes the turn; the foe hits whoever comes in);
  a faint with others left asks for a free pick; the battle is lost when the whole team is down.
  Leaving the field clears stat changes. Can't switch mid two-turn move.
- New game (built): pick who leads (Callum, Nolan, Haydon, Dani; `data/characters.json`: role,
  assist, a line in their voice), then any starter. Portraits are placeholders until the M4
  trainer sprites. The save stores the leader; separate teams per character come with swapping in M4.
- Leader assists (built): once per battle and free (the Patchling still moves). Scan (Callum):
  type, weaknesses, x2/x½ hints on moves, and counts toward Studied. Patch Up (Nolan): heals half,
  cures status. Taunt (Haydon): foe Defense and Sp. Def -1. Shield (Dani): halves the next hit.
- Carried to later milestones: XP/levels, healing between battles (the team is fully healed
  before every battle for now), separate teams per character (M4 swapping).

## M4 Characters + world slice (art + code)
**Done when:** a new player goes from PATCH's intro to restoring the first sanctuary wing, on a phone.

Done so far:
- Route 1 commons **Orbitot** (Rock/Dark, Gravity Well, Orbit Punch) and **Fledjet** (Wind,
  Slipstream, Afterburner), bible §15: sprites, idles, data, lore, seal rhythms; both lines in the
  data (evolutions with placeholder art). They lead the wild rotation; a new game opens on Fledjet.
- The cast's looks are locked (bible §6 Looks), PATCH included, and the owner's character sheets
  are in `art/concepts/trainers/` (concept, battle front and back, overworld walk frames each).

Next, in this order (decided with the owner: the overworld is the priority; the UI kit comes first
because every new screen uses it):
1. ~~**UI kit (our own look)**~~ (done, PR #13): `game/src/ui/theme.ts` (colour tokens, button
   tones by job, text sizes), `kit.ts` (stitched pixel panels, buttons, tape labels, chips,
   meters, touch-screen backdrop, hinge, D-pad, PATCH's CRT portrait), `dialog.ts` (text box with
   speaker tape and wait-for-tap). The look is "patched together" like PATCH: cream plates,
   gunmetal, rust, faded blue, stitches and tape. New screens use only these.
2. ~~**Overworld engine**~~ (done, branch `claude/m4-overworld`): maps are JSON in
   `game/src/data/maps/` (one character per tile through a legend; tile kinds in
   `data/tiles.json`), pure logic in `engine/overworld.ts` (steps, warps, signs, encounter rolls;
   unit-tested), `scenes/OverworldScene.ts` (top screen: map following the leader; touch screen:
   D-pad, A, JOURNAL). Keys: arrows/WASD, Space/Enter = A, M = Journal. A quick tap is one step.
   Position saved in `progress.pos`. Placeholder tiles and walker drawn in `overworld/tileArt.ts`.
   Boot goes to the overworld; `?foe=` still opens a test battle; `?rate=1` forces encounters.
3. ~~**Route 1**~~ (done with step 2): tall grass rolls per step (`encounters` in the map file:
   rate, levels, weighted table); the battle's CONTINUE returns to the same spot.
4. ~~**Hollow Rest people**~~ (code done, branch `claude/m4-identity`): NPCs in map data
   (`npcs`: sprite, talk id, `friend` = only while someone else leads, `heal`), lines in
   `data/dialogue.json` (with per-leader versions), the three non-leaders wait at the sanctuary,
   **PATCH heals**. HP and status now carry between wild battles (`Member.hp/status`); blacking
   out wakes you at PATCH (`healSpot`). PP still refills every battle.
5. ~~**Intro**~~ (done): `IntroScene`, script in `data/intro.json`: the friends' group chat, Callum
   adds PATCH, PATCH builds a world and blows up; then PATCH at the crash site; then the pick.
   `?skipintro` skips it.
6. ~~**Sanctuary**~~ (done): `data/sanctuary.json` wings (Root Hall 10 pts, then Tide Gallery,
   Ember Vault), restored in order from the CRT stones at the sanctuary (`SanctuaryScene`).
   M4's "done when" is met in code; what's left is the art.
7. **Trainer sprites:** walk sheets done for the four (`art/tools/walk2sheet.py` from
   `art/trainers/walk_frames.json`, loose-pixel cleanup built in) and PATCH's standing pose
   (`art/tools/pose2sprite.py`). Still to do: battle front/back portraits, Connor.
8. **Location art: isometric** (owner approved the look; branch `claude/m4-hollow-rest`). The
   overworld is 2:1 isometric, after the owner's concept (`art/concepts/locations/`). Pipeline:
   - set pieces: owner's ChatGPT drafts -> `art/tools/draft2object.py` (native size, no redraw);
   - terrain: `art/tools/terrain.py` (swatch palette, seamless, blended edges);
   - layout: `art/tools/hollow_rest_layout.py` writes the game's map file (rows, `heights`,
     `objects`) and checks every door, the sanctuary and the exit are reachable;
   - bake: `art/tools/iso_map.py <map>` -> `art/locations/out/maps/<map>.png/.json` + graded props
     (golden-hour grade, boulder cliffs patched with brick and taped plaster, sky backdrop).
   Engine: heights, stairs (climb toward the path), object footprints/doors (`data/objects.json`),
   `findPath`; the overworld sorts people in front of/behind buildings by footprint; diamond D-pad.
   Since `claude/m4-polish`: terrain, cliffs, stairs and props come from the owner's isometric
   sheets (`art/concepts/locations/iso_terrain.png`, `iso_props.png`) via `art/tools/iso_kit.py`
   (cut out, shrunk, colour-reduced, outlined) and `iso_map.py` uses them; houses spread out;
   walk sprites are the owner's pixel-art sheets read pixel for pixel (24x40 frames, row 0 toward
   the viewer facing down-left, row 3 away facing up-left; `walk2sheet.py`, `walk_frames.json`
   'pixel'). Still to do: Route 1's own isometric layout (drafts in: `route1_concept.png`,
   `route1_pieces.png`), townsfolk sprites, PATCH walk sheet in the pixel style.
9. **Story intro** (script draft for approval: `docs/INTRO_SCRIPT.md`): seven beats on the owner's
   cutscene cards (`art/concepts/cutscenes/01..05`), PATCH presents the starters, Connor's
   group-chat hook at the town sign.

Art asks for the owner: the Hollow Rest drafts from `art/LOCATION_STYLE.md` (concept, pixel map,
set pieces, terrain swatch) into `art/concepts/locations/`; townsfolk NPC sprites (the elder,
neighbour and Parker Colt are placeholders).

### M4 handoff (read this first in a new session)
- **Workflow with the owner:** the owner is the ideas side; Claude is the developer and should
  propose the most efficient plan. Work on a `claude/...` branch, open a PR when a piece is done,
  the owner merges, `main` deploys to the live link. Watch the PR's CI and fix red before moving on.
- **Art pipeline:** owner makes concept and pixel drafts in ChatGPT (prompts in
  `art/BW_STYLE.md`, Workflow). Convert with `art/tools/pixel2grid.py`; if that is mushy (drafts
  that mix pixel sizes) use `art/tools/draft2sprite.py`. Show the plain conversion before any hand
  pass: the owner preferred Orbitot and Fledjet untouched. Background = white connected to the edge.
- **Pitch before drawing** any creature or stage (bible §4); the owner rejected "boring" commons
  and supplied the asteroid and jet-bird ideas, so offer bold concepts.
- **Game code:** `game/` (Phaser 3 + TypeScript). Data in `game/src/data/*.json`; engine (pure,
  unit-tested) in `game/src/engine/`; scenes in `game/src/scenes/`. Saves in localStorage
  (`game/src/save.ts`, version 3: a team per friend). Test URL params: `?reset`, `?player=<starter>` (skip the pick),
  `?foe=`, `?seed=`. E2E hooks: `window.__battle`, `__newgame`, `__journal`.
- **Checks before every push:** `npm test`, `npm run build`, `npx playwright test` (phone
  viewport) in `game/`. Screenshot new screens at 390x844 and look at them: `e2e/screens.spec.ts`
  saves every screen to `game/screens/`. If the container can't reach the npm registry, push the
  branch and run the workflow by hand (workflow_dispatch): manual runs print the screenshots into
  the job log as base64 (`SCREEN <file>` lines) as well as uploading the `screens` artifact.

## M4b The squad, the base, the story (owner's direction, 2026-10-24; bible §6, §7)
The owner wants the four together: present in nearly every scene (banter), four separate teams
(each friend takes one starter), switch the leader any time, shared sanctuary storage; the
sanctuary as a big explorable base that unlocks with the story; recurring NPCs and Patchlings;
explorable houses. Built in three parallel tracks, one fresh session each, each on its own branch
and PR (owner approves visuals before they go in):

- **Track A: Squad (code)** (built, branch `claude/m4b-squad`, awaiting the owner's look at the
  screens): save v3 (`teams`, shared `sanctuary`, `leader`; v1/v2 saves migrate on load), new game
  = leader cards → "who takes which" (tap a starter, then a friend) → who leads first; the three
  follow in a line (`lineUp`/`followStep` in `engine/overworld.ts`), SWITCH (or Tab) cycles the
  leader; sanctuary STORAGE tab (deposit/withdraw with the leader's team); Journal tabs per
  friend. The four friend NPCs left the map (they follow now; `friend_*` lines in
  `dialogue.json` are free for Track B). All four starters start bonded (20 points), so every
  wing's cost went up by 20 to keep the same effort. Original brief: Save v3: `teams` per friend (replaces `team`), shared `sanctuary`
  storage any friend can withdraw from, `leader` switchable. New game: "who takes which starter"
  (one each), then who leads. Overworld: the other three follow the leader in a line (walk sheets
  exist for all four); a SWITCH button on the touch screen swaps the leader (the leader's team
  battles). Journal shows all four teams. Migrate v2 saves (the old team goes to its leader, the
  other three get the remaining starters).
- **Track B: Story (code + owner's cards).** A cutscene system: full-screen card (the owner's
  `art/concepts/cutscenes/`), named speakers (any of the four, PATCH, Connor, system), the DS text
  box, SKIP; and scripted overworld scenes where the four stand together and talk. Build the
  opening from `docs/INTRO_SCRIPT.md` (beats 1–7), using Track A's starter assignment for beat 5.
  All story dialogue is written for the group.
- **Track C: World (code + owner's art).** Interiors: door tiles warp to interior maps (same
  isometric engine, a room-sized map), the friends' four houses first, full of inside jokes.
  The sanctuary base: the stone entrance warps into a multi-room interior; rooms gated by
  `wings`/story flags, first hall open at the start; PATCH's workshop, the storage terminal, beds.
  Recurring cast: NPC data gets a home/visit list so people met later can appear in the base.
  Then Route 1 in isometric (drafts in: `route1_concept.png`, `route1_pieces.png`).
  Art asks for the owner: interior concept + set-piece sheets per house and for the sanctuary
  halls (prompts in `art/LOCATION_STYLE.md`).

## Parallel tracks from 2026-10-25
(Superseded for new work by `docs/WORKFLOW.md`: at most two sessions at once, no stacked PRs.)
**Story track done** (PR #21, merged): cutscenes (`scenes/CutsceneScene.ts`, `data/cutscenes/*.json`,
`engine/story.ts`), the opening beats 1-7, starter reactions, story `flags` in the save. Next for the
story: Connor's first "cancelled" boss fight and the house scenes (Triple Cheese, the van, Sergey).
Base for all new work: `claude/ui-upgrade` (PR #20, which contains the squad PR #19). When those
merge, merge `main` into your branch. Each track owns its files; touch the others' files only with
small, clearly separated hooks, so the PRs merge cleanly.
- **Story** (branch `claude/m4b-story`, own session): `scenes/CutsceneScene.ts` (new), `IntroScene.ts`,
  `data/intro.json`, `data/cutscenes/*.json` (new), story lines in `data/dialogue.json`. Hook into the
  overworld only through a small `playScene(id)` call / map `triggers` data.
- **World** (branch `claude/m4b-world`, own session): `data/maps/*` (new interior maps, Route 1
  isometric), `data/objects.json`, `data/tiles.json`, `art/tools/*` map tools, `art/locations/*`,
  NPC home/visit data. Overworld hooks: warps into interiors.
  Built so far (World): interiors (door warps into room maps; `art/tools/interiors_layout.py` writes
  them, `iso_room.py` bakes the cut-away look, placeholder furniture `interior_props.py`); the four
  houses with their inside jokes (`data/world_dialogue.json`); the sanctuary base (Entrance Hall:
  CRT stones = WINGS, terminal = STORAGE, four bedrolls heal; PATCH's Workshop; Root Hall behind
  rubble until `root_hall`, via `until` on map objects, engine `engine/world.ts`); the recurring
  cast (`data/cast.json`: home + visits on wings/flags; the old keeper moves to Root Hall); stored
  Patchlings roam the sanctuary (`roam` spots); `Progress.flags` for story flags; Route 1
  isometric (`art/tools/route1_layout.py`, owner's pieces via `route1_kit.py`; the Tally
  checkpoint closes the road on). Rooms are entered by walking into the door; you leave by
  walking off the room's front edge from the doormat.
- **Systems** (branch `claude/m4b-systems`, the session that did the UI). Built: shared experience
  (`engine/levels.ts`: level³ curve, foe yield = BST/5 x level / 7, all four teams full, storage half,
  moves learned on level-up, XP bar on the battle card), seal scrolls (`data/items.json`,
  `engine/items.ts`: the bag in `progress.items`, scroll picker on SEAL, window/bond/glass/echo/
  tries/keep-on-fail effects, PATCH tops Seal Scrolls up to 5 when he heals, Journal BAG tab), field
  moves (`data/obstacles.json`, `engine/fieldMoves.ts`, `progress.cleared`: a boulder in Hollow Rest
  only Dani can shift, with a Gilded Scroll behind it). Original brief: experience and levels
  (shared by all four teams, half in storage), seal scrolls (items, inventory, shop later), field
  moves and the first obstacle (`engine/fieldMoves.ts`, map `obstacles` data), battle/journal hooks.
Rules for every track: the owner approves visuals from screenshots before a PR goes to main;
use the A+ kit (`ui/kit.ts`: `card`, `button`, `listRow`, `tabs`, `sectionLabel`; `ui/battleKit.ts`)
for any new screen, never raw rectangles; keep messages to the owner short and plain.

## UI upgrade (owner's direction, 2026-10-25; branch `claude/ui-upgrade`)
Look "Workshop A+" chosen from the pitch board (cleaner PATCH style with more flare). Built so far,
on the battle as the sample screen: location backdrops (owner's ChatGPT drafts in
`art/concepts/battle/`, converted to 256x192 in `art/battle/out/`; maps name theirs in `battle`),
edge-tucked info cards with type tags and a two-step HP drain, intro slide-ins and a "A WILD X!"
banner, the touch-screen header with the leader's face, command buttons with faint animated
decals (glove, scroll, team silhouettes, the active Patchling running) that do a big move on tap,
the gold assist bar, the leader's cut-in with their big pixel figure (`art/tools/sheet2battle.py`)
and their line (`characters.json` assist.shout/accent), hit shake, super-effective flash, synthesized
sound effects (`ui/sfx.ts`, `?mute`). Overworld: the leader's lead Patchling hops behind them
(follower frames from the owner's turnaround sheet via `art/tools/turnaround2follow.py`).
Next once the owner approves the sample: roll the look out to every screen (new game, journal,
sanctuary, overworld touch screen, fight/team menus), seal scrolls as items.

## M5 Playtest build
- Field moves for the other three (engine and lines exist in `data/obstacles.json`; only Dani's
  boulder is placed): Haydon's **Taunt** on the Tally guard at the Route 1 checkpoint (opens the
  road), Nolan's **Patch Up** on a broken plank of Route 1's bridge or the dead storage terminal,
  Callum's **Scan** on the sealed Tide Gallery door or Route 1's CRT stone. So the playtest makes
  you switch to every friend. Also check the boulder's spot in Hollow Rest.
- Bug pass on phones (iOS Safari, Android Chrome), balance pass, the link shared with the
  group, one round of fixes from their feedback.

### M5 handoff (read this first)
**Done (this session):**
- Route 1 now makes you switch to every friend (`data/obstacles.json`): **Nolan** patches the broken
  bridge (13,9) that cuts off the east bank; **Haydon** taunts the Tally officer off the stairs down
  to the checkpoint (18,8; drops 2 Rain Check Scrolls); **Callum** scans the Relic writing on the CRT
  stone (2,8; KEEPERS' RELAY 1/4, 2 Echo Scrolls). Dani's boulder in Hollow Rest checked: on the
  grass by the sunflowers, reachable, left as is. Lines in `data/world_dialogue.json` (`route1_*`).
- Engine: obstacles can be a person (`sprite`, `dir`, `leaves`), stand in for a map piece
  (`replaces`: the broken bridge swaps for the whole one), or be the object on the tile (`onObject`);
  `blockedTalk`/`clearTalk` dialogue; each kind clears its own way (roll, storm off, sparks, scan).
  Broken bridge art: `art/tools/broken_bridge.py` (from the owner's bridge).
- Balance (headless sim: `BALANCE=1 BALANCE_OUT=/tmp/b.txt npx vitest run
  tests/balance.report.test.ts` in `game/`): Spark -> Rock 0 -> 0.5 (Zapail could not hurt Orbitot at all); Route 1 wilds
  3-5 -> 3-6 (starters are level 8; fights took 1-2 turns); experience divisor /7 -> /5 (BW's own;
  level 10 in ~10 wins instead of ~15). Wilds learn their signatures at 8, which is why 7+ is too
  much for Route 1. Gobbin is still the strongest starter (Water and Dark both hit Orbitot hard).
- Phones: the D-pad lets go when the phone cancels a touch (system swipe, call, app switch); sound
  comes back after the phone locks or the tab is hidden (iOS suspends it); no long-press menus,
  text selection or tap flashes.

**Next:** the owner shares the live link (merge to `main` deploys it) with the group; collect
their feedback in one list; one session fixes it. Real-device checks still owed: iOS Safari and
Android Chrome (only Chromium phone emulation was tested here).

**Playtest round 1 fixes (same branch, PR #26):** rooms at the friends' scale (room_concept
SCALE 1/8, per-room `scale`; Haydon's shed and the workshop 0.85) with people on the floor (room
layout z 0) and solid tiles re-fitted from where feet land; exits on open floor with a painted
doorway shadow; Nolan's door on the porch (a door with `enter` may sit up a step); SETTINGS button
on the map (Journal OPTIONS: squad/solo, sound); list rows never overlap a name and its level or
count; townsfolk drawn at 0.9; the owner's Tally officer, LeBron redo and 15 scroll icons
(`art/tools/scroll_icons.py`) in; bushes/rocks beside paths cleared; Route 1 checkpoint back
from the edge with the road on its door side, stairs lined up with the path.
**Owner's rule:** no PRs until the owner is happy with a whole batch; check with screenshots and
fast tests, full e2e once at the end.

**Waiting on the owner (old note):** the Tally officer sheet (`art/prompts/m5.md`); when it's in, cut his
stand pose with `art/tools/pose2sprite.py` to `art/trainers/out/tally_officer_stand.png` and set
the obstacle's `sprite` to `tally_officer` (it is `placeholder:#4a5468` now). The hand-drawn broken
bridge is optional.

### M6 handoff (read this first)
**Built (branch `claude/m6-game-shell`):**
- **Title** (`scenes/TitleScene.ts`): Hollow Rest backdrop, the four and PATCH under a taped logo
  (the owner named the game **Project Patch**; the top screen is the owner's group picture (PATCH on a runestone with the four), `art/concepts/title/title_group.png` via `art/tools/title_art.py`, kept at 3x and drawn one pixel per canvas pixel, with the name carved in code), TAP TO START, then
  CONTINUE (leader, points, seen) / NEW GAME (asks before erasing a save) / SETTINGS.
  Boot shows it first; test shortcuts (`?foe ?player ?skipintro ?story ?evolve`) and automated
  browsers (`navigator.webdriver`) skip it, `?title` forces it.
- **Settings** (`src/settings.ts`, `ui/settingsPanel.ts`): sound, text speed (slow/normal/fast:
  `CHAR_MS`, `HOLD_SCALE`, used by the text box and the group-chat typing), squad/solo. Stored per
  device in localStorage (party also written into the save). One panel shared by the title, the
  pause menu and the Journal's OPTIONS tab; the top screen previews the text speed with a PATCH line.
- **Pause** (`scenes/PauseScene.ts`): the map's MENU button (was SETTINGS), Esc or P. Over the
  paused map: where you are, the leader, their lead Patchling, sanctuary progress; RESUME, JOURNAL,
  SETTINGS, SAVE, QUIT TO TITLE.
- **Blackout**: "X has no Patchlings left that can fight! X blacked out!", fade to black, a black
  card ("PATCH carried all four of you back..."), the map fades up at PATCH's with a heal flash and
  `patch_blackout` (new group lines per leader in `data/dialogue.json`). Test battles (`?foe`) keep
  the old end menu.
- **Evolution** (`engine/evolution.ts`, `scenes/EvolveScene.ts`): after a won battle, anyone on any
  team (or in storage) at their `evolves.level` evolves, BW style (white flicker speeding up, flash,
  new form, moves learned, bestiary entry opened as owned, the owner's line `evolve_react`). STOP
  holds it until the next level (`Member.evoStop`). Forms without art show the type-colour blob
  placeholder with a note. `?evolve=<species>` previews it without touching the save. The Journal
  shows each Patchling's evolution level.
- Tests: `tests/evolution.test.ts`, `tests/settings.test.ts`; e2e `e2e/shell.spec.ts`; screens `20*`.

**Waiting on the owner:** one look at the screenshot sheet and the new lines (blackout, evolve
reactions, the text-speed samples). **Next:** roadmap step 3 (evolution art, whole lines).

### M7 handoff (evolution art, branch `claude/affectionate-wozniak-wh7dgz`)
- All 12 missing forms drawn by the owner (front+back pairs, prompts `art/prompts/m7.md`), split
  (`art/creatures/wip/m7/split.py`), converted plain with draft2sprite (`wip/m7/conv.py`), and
  written as `art/creatures/<name>.px.js` by `wip/m7/make_px.py` (idle: 1px breath, or 1px hover
  for Craterra, Singulith, Contrailon, Strafalcon). Wired in `patchlings.json`.
- Owner's calls: the smaller wallaby pair is the **new Sprigby** (old one: `wip/sprigby_v1.px.js`);
  Gulpjaw has **no throat glow** (Harrowjaw keeps it); Cullet drawn bigger.
- Screens: `art/creatures/wip/out/_preview/m7_ingame.png`, `m7_evolve.png`.
- Round 2 (owner's notes): **every creature is double-res now** (192 canvas, `monScale` draws it at
  half size; all 18 stills from `wip/m7/hi/make_px.py`); Furnaxol, Zapail, Gobbin redrawn from new
  pairs, Orbitot and Fledjet reconverted (96 versions kept in `art/creatures/wip/*_96.px.js`).
  Per-creature idles: `art/tools/idle_fx.py` + `art/creatures/idle_fx.json`. Evolve scene restyled
  as PATCH recompiling (glitch). Battle: your HP box top left, the foe's bottom right; back sprites
  capped ~120 px tall. Harrowjaw and Gulpjaw face left; Craterra tidied (`wip/m7/hi/tidy.py`).
- Round 3: attack animations drawn live (`game/src/ui/moveFx.ts`): 9 signature moves with their
  own (Glassblow, Glass Bell, Molten Marbles, Spark Trail, Rail Shell, Reap Kick, Abyssal Harpoon,
  Orbit Punch, Afterburner), Sprigby's line blink-strikes, every other move gets its type's
  particles on a physical / special / status shape; `window.__battle.fx(moveId, side)` previews
  one. BW-style battle platforms. Band clean-up per material (`wip/m7/hi/bands.py`, palette ramps
  from `autoramps.py`) on Fernaroo, Scytharoo, Gauslug, Harrowjaw; a blanket de-grain filter was
  tried and rejected (owner: "looks painted"). Lesson: future sprite prompts ask for crisp,
  hand-placed pixel clusters, no dithering or noise.
- e2e locally: the pinned Playwright wants another browser build; run with a config whose
  `launchOptions.executablePath` is `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
- **Owner approved the batch** (2026-10-29): PR next.

## Roadmap after the playtest (proposed 2026-10-28; see WORKFLOW "chapters")
1. **Playtest fixes**: the group's feedback as one batch.
2. **M6 Game shell**: title screen and main menu (Continue / New Game / Settings), pause menu,
   settings (sound, text speed, squad/solo), proper blackout, evolution system (level-ups evolve;
   the evolve scene). Uses existing evolution sprites as they arrive.
3. **Finish the existing lines** (rule: whole lines): the 4 starter lines (8 sprites), Orbitot
   and Fledjet lines (4), attack animations (Glassblow first). One art batch.
4. **Chapter 1: finish Route 1** (owner's call, 2026-10-29): Route 1 has only two Patchling
   lines (Orbitot, Fledjet). Pitch more Route 1 lines (whole lines, owner's ideas first), fill the
   route's encounters, its story beat and Tally moment, and its sanctuary progress.
5. **Chapter 2**: Kettleport (Water/Metal) + the route to it, Connor's first "cancelled" boss
   fight, the Tide Gallery wing, its Patchling lines, shop + currency.
6. Then a chapter at a time: Emberwick, Canopy, Nightmarket, Hush, with the non-town locations
   slotted in as routes between them.

## After the slice
- Evolutions (8 sprites: Cullet, Vitric, Tesnail, Gauslug, Fernaroo, Scytharoo, Gulpjaw,
  Harrowjaw), attack animations (Glassblow first), Connor's "cancelled" first boss fight,
  Kettleport / Emberwick, more inside jokes from bible §11.
