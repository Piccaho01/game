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
- [ ] M1 Foundation
- [ ] M2 Stage-1 starters
- [ ] M3 Core loop
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

## M3 Core loop (code)
- Choose a character and pick any starter (not tied to a character).
- Wild encounter → battle → **seal** rhythm minigame (patterns for Fire, Water, Plant, Spark
  first) → bestiary entry advances Sighted → Tracked → Studied → Sealed → Bonded →
  sanctuary progress.
- Leader assists for all four (Scan, Patch Up, Taunt, Shield).
- Save to the browser (local storage) so progress survives closing the tab.
- **Done when:** the full loop works start to finish with the four starters.

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
