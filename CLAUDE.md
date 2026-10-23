# GAME BIBLE: [Working Title TBD]

> Drop this file in the project root as `CLAUDE.md` (or reference it from one). Claude Code should read it at the start of every session. Lock design here; tune systems (numbers, timing, balance) during the build.

---

## 1. One-Liner
A BW2-style creature-collecting RPG where four best friends get trapped inside the game world their own AI built, and have to restore a ruined sanctuary, fill a living bestiary, and take down the group chat's most notorious flaker.

## 2. Tone
- Comedy first, real stakes underneath. Buddy-adventure energy.
- Dialogue should sound like friends talking, not a fantasy wiki. Dry, quick, roast-heavy but warm.
- The world is Pokémon-like with more depth: politics, ecology and history all matter and connect.
- Inside jokes are a feature, not decoration. They live in NPCs, items, locations and dialogue.

## 3. Platform and Tech
- Built in Claude Code. Eventually playable by the friend group (phone-friendly if possible).
- Keep systems data-driven (JSON/config for creatures, moves, types, dialogue) so balance and content can be tweaked without code rewrites.
- **Engine (decided):** browser game in **TypeScript + Phaser 3**. The friends play from a link on their phones or computers with nothing to install; touch controls first. Sprites come from claude-pxl as PNG strips + JSON, which Phaser loads directly.

## 4. Art Direction
- **Look:** Nintendo DS, **Pokémon Black/White 2 style specifically**, 2.5D feel. ALL sprites (creatures, characters, NPCs, overworld) must match the BW2 look: its pixel density, shading, outlines and palette feel. Not a generic pixel-art style, and not Gen 1–4 or modern 3D.
- **Creature sprites:** strict 96x96 canvas (the real BW battle-sprite size; body size varies per creature), indexed colour (15 colours max plus transparent), 3/4-view (not flat side profiles), dynamic non-stiff poses. Follow `art/BW_STYLE.md`.
- **Quality bar:** detailed, original creatures with a unique overall style. Each type gets its own distinct eyes and mouth style, not a shared face template.
- **Evolution:** hand-designed sprites per stage (no swappable-parts system).
- **Process (since M2):** the owner draws each sprite (front and back) as a **pixel-art draft with ChatGPT** (prompt in `art/BW_STYLE.md`, "Workflow"); drafts are kept in `art/concepts/`. Claude converts the draft with `art/tools/pixel2grid.py` (recovers the real pixel grid, maps to a 15-colour palette, cleans specks and outlines) into a **claude-pxl** file (`art/creatures/<name>.px.js`, grids on the 96x96 canvas), then does the hand pass and the idle animation. Do not redraw a draft from scratch or invent pixel placement: AI drafts look far better than code-built shapes, so changes are edits on the converted grid. Reference sprites may be supplied by the owner as guides.
- **Pitch first:** before drawing any creature (or evolution stage), pitch the concept to the owner (name, type, look, story hook, battle pose, signature move) and get approval. Never commit to a design unpitched.
- **Art is the main risk.** The workflow is validated on **Furnaxol's back sprite** (`art/concepts/furnaxol_back.png` → `art/creatures/furnaxol.px.js`); the rules in `art/BW_STYLE.md` are the review checklist for every converted sprite.

## 5. Premise
Four close friends are chilling, realizing they have no direction. Callum says his AI can cook up a plan. It builds a creature-collecting world. The supercomputer then explodes, and the world becomes a real universe with the four stuck inside it, with real politics, ecology and history nobody wrote on purpose.

The AI is now a giant talking robot, **PATCH**. He tells them it's their mess and tasks them with restoring the **sanctuary** to its roots and facing whatever conflict they find.

The creatures are called **Patchlings**: PATCH's creations (he gets defensive about the name).

### PATCH (the robot)
- Giant, earnest, deadpan. Keeps saying "I'm working on a fix." Quietly passive-aggressive about being blamed.
- Doubles as tutorial voice and sanctuary caretaker.
- Partly responsible for the central problem (see Tally). That is the payoff for his running line.

### No "incursion arrivals" twist
The world is simply a Pokémon-like region the AI generated, with depth. The twist is that the four are stuck in their own creation and it is deeper and weirder than planned.

## 6. The Four Playable Characters
One active leader at a time. The other three wait at the sanctuary. **Squad mode** (optional): all four travel with you, but only the selected leader battles, using their own team. Each character has a separate team.

Each has a field role and one battle command (leader assist):

### Callum: the Collector
- Dirty-blonde hair with some curls, blue eyes. Scottish, lives in Canada now. Big comic nerd, fixates on niche hobbies and collections, loves emulating old games. Witty and protective.
- Field role: reads creature lore, fills bestiary entries, spots rares.
- Battle command: **Scan** (reveals weaknesses).
- Likes Pokémon.

### Nolan: the Reliable One
- Brown hair (now longer and straighter, sometimes slicked back), brown eyes. Reserved on the surface, hilarious once you know him. Most reliable, very relatable.
- Field role: steady support, recovery and cleanup.
- Battle command: **Patch Up** (heal).
- Likes Pokémon.

### Haydon: the Ragebaiter
- Brown, slightly curly hair. Nonchalant, lowkey superiority complex, really funny, also reliable. Answers anything serious with "nah that's cap."
- Field role: provokes NPCs and enemies.
- Battle command: **Taunt** (debuff and draw aggro).
- Likes Pokémon.

### Dani, "el Niño": the Heart
- Short, fair skin, brown hair and eyes, goatee. From Colombia. Protective of friends and family, super nice, easy to talk to. Broken English that makes great one-liners.
- Running gags: replies in 3 seconds or 3 months; takes 30 minutes to leave his house after you arrive.
- Field role: befriends anything, tanks for the group.
- Battle command: **Shield**.
- Does NOT care about Pokémon (keep this as a gag; he'll still play).

### Looks for sprites (from the owner's photos)
Photos are reference only and are **never committed**; only the finished pixel sprites go in the repo. No real brand logos on clothes: use original designs.
- **Callum:** dirty-blonde curly hair worn longish over the ears, small stud earrings, silver chain, black tee with a bold white chest logo and a small Canadian flag, light-grey sweatpants. Easy half-smile.
- **Nolan:** dark-brown hair, longer and straight, often slicked back; big squinting grin; plain grey tee. Signature hand gesture (fingers up, rock-on style).
- **Haydon:** shaggy brown hair with a heavy fringe, heavy-lidded unbothered look, sand/khaki anorak hoodie with drawstrings. Peak "nah that's cap" face.
- **Dani:** dark textured crop with a fade and a short fringe, goatee and moustache, dark knit button-up polo, small chain; often holding his phone (fits "replies in 3 seconds or 3 months").
- **Connor (villain):** auburn/strawberry hair in a middle part with curtain bangs, huge grin, tall and lanky; a red hoodie under his too-big Director's coat.

## 7. Core Loop

### Progression: the Bestiary
- Every creature has an entry with stages: **Sighted → Tracked → Studied → Sealed → Bonded**. Each stage unlocks lore.
- Rare and unique creatures have **quest entries**: their page stays incomplete until the player does something tied to the world (help a faction, fix a habitat, uncover history).
- Filling entries restores **sanctuary wings**, which unlock areas, abilities and story beats.
- No gyms/league formula.

### Capture: the Seal
- Weaken the creature, then perform a **seal**: a short rhythm/timing minigame. Each type has its own seal pattern.
- Better seal means stronger bond (stat and loyalty boost). A sloppy seal still works but the creature is wary.
- Rare creatures can't be sealed until their quest is done.

### Battles
- Core is classic BW2-style turn-based.
- Twists:
  1. **Habitat effects:** terrain and time of day alter moves.
  2. **Bond moves:** close-bond creatures get a once-per-battle special tied to their lore.
  3. **Leader assists:** the active character's battle command (see section 6).

### Special/legendary creatures
Rare, unique and legendary creatures are brought back to the sanctuary over the story. No special naming scheme; they are simply the rarest entries. The sanctuary fills as you progress.

## 8. Types (10)
**Fire, Water, Plant, Rock, Wind, Spark, Ice, Dark, Metal, Relic**
- Dark covers shadow, spirits and the unseen (Ghost merged in).
- Relic is the unique type, tied to ancient ruins and PATCH's scrapped early drafts.
- Matchups: aim for a Pokémon-like structure, simple to learn. Finalize in play-testing.
- Each type ties to habitats and has its own seal pattern and face style.

## 9. The Region: Verrow
Fully original. A patchwork the AI built from scraps of the friends' lives, so it is quirky on purpose.

### Towns
1. **Hollow Rest:** start. Sleepy hillside village around the ruined sanctuary; PATCH crash-lands here.
2. **Kettleport (Water/Metal):** harbour town stacked on old shipping containers; ferries are fast travel.
3. **Emberwick (Fire):** built inside a dormant volcano caldera; geothermal power; glassblowing is the local sport.
4. **Canopy (Plant/Wind):** treetop town on rope bridges; falling drops you to a lower level somewhere unexpected.
5. **Nightmarket (Dark):** only exists after dark; a roaming market on rails that docks at a different station each night.
6. **Hush (Ice):** snowed-in mountain town with a quiet culture; shouting is rude, everyone gestures.

### Non-town locations
- **The Draft Archive (Relic):** abandoned data centre where PATCH's scrapped drafts live as glitchy ruins.
- **The Tidal Causeway:** road to a hidden island, only open at low tide; time it.
- **The Sunken Court:** flooded old arena with a basketball hoop on the ceiling.
- **Saltline Speedway:** dried-lake racetrack for cart races (Mario Kart energy).
- **The Cloud Station:** wind turbines above the mist, reached by gondola.
- **Dead Drive-In (Relic):** creatures gather to watch the screen.

### Factions
- **The Tally (antagonists):** a bureaucratic organization that counts, prices and licenses creatures, built on a flawed blueprint from PATCH's first draft. Runs on **rain checks**: everything is rescheduled and postponed; nobody has ever finished a form.
- **The Wayfarers:** rangers and traders who keep the roads open. Neutral, but split on whether to side with the Tally.
- **The Hollowfolk:** descendants of the old sanctuary keepers. Kept traditions alive in secret; distrust outsiders.

### The ecology/history thread
The sanctuary once regulated the whole ecosystem. Without it, habitats drift and legendaries are dormant. The Tally profits from that drift. Restoring a wing fixes ecology, weakens the Tally, exposes the flaw, and traces back to PATCH's early drafts.

## 10. The Villain: Director Connor Dennehy
- **Real-life basis:** a close friend of Callum's (middle school, college roommate). Famous for chronically flaking on plans, most recently a festival he cancelled days before. The group is playfully mad at him. **The friend is in on the joke; write him lovable and roastable, never cruel.**
- **In-world:** the AI's first beta tester, trapped in Verrow before the four. Every cancelled plan was technically legit: "can't make it, I'm stuck in a video game."
- **Look:** very tall and lanky, flat strawberry-blonde hair in a middle part, green-ish eyes, a Director's coat that's too big for him.
- **Mastermind with salt:** elaborate plans that collapse because he bails on his own steps. Henchmen wait an hour at the meeting point, then get "rain check."
- **Heart of the villain:** isolated, hiding that he's trapped; the Tally is his way of keeping people from leaving. Gives the final confrontation some weight under the jokes.
- **Deputy Reliable:** second-in-command, the only Tally employee who shows up on time; competent and exhausted from covering for his boss.
- **Boss fights:** the first attempt gets cancelled ("something came up"), so the player reschedules. Before each fight he sends a group-chat message ("might be a bit late guys") that doubles as the fight's tutorial/hint. The real fight has him showing up late and unprepared.
- **Final twist:** he finally shows up on time to his own defeat, the one plan he ever committed to. (Alt ending: he skips his own defeat.)
- **Festival cameo:** a ticket stand where he refuses to sell you a ticket.

## 11. Inside Jokes Library
Use these as flavour in NPCs, items, signs, quests and dialogue. Spread them out; don't dump them all at once.

- **The Triple Cheese:** Callum orders the same thing from McDonald's every time: a double cheeseburger with an extra patty and extra cheese. The guys know it as well as he does. Item/legendary-food gag; PATCH keeps asking why he orders the same thing.
- **Nolan's dad's van:** Callum once blacked out, ubered ~$150 from Waterloo to Nolan's place at 3 AM, slept in his dad's work van in winter until 11, and woke up to Nolan's dad watching with a coffee. Hidden sanctuary room / sleeping spot; an NPC who watches from a window with a coffee. (Callum's Scottish parents: "glad it was his and not mine.")
- **Haydon's secret list:** a bestiary entry always shown as **[REDACTED]**. No one knows the names.
- **"Man like Hansen":** a rival NPC catchphrase (a Chris Hansen reference the group made up).
- **"And I picked up a mic and I'm chill":** a corny line Callum said once; the guys never let it go. Recurs as a cringe battle line or NPC taunt.
- **Sergey:** Callum's 19-year-old Russian producer; side-quest NPC where the group keeps trying to "get Sergey out of the trenches."
- **Tuffest white boy debate:** Richie Guérin vs Dick Van Arsdale. An arena debate with a title at stake.
- **Nolan and Goldschlager:** he's a different breed on the headstands. Gag item or minigame.
- **Haydon and Plaqueboymax:** Haydon is a big fan; streamer-style NPC references.
- **Smash Bros tournaments:** Callum is the best; Dani will tell you otherwise. Tournament minigame with Dani contesting results.
- **Basketball, Mario Kart, NBA 2K (2K22 is the GOAT):** minigames and region flavour (the Sunken Court, Saltline Speedway).
- **They all live in Burlington, Ontario.** Light local flavour is welcome.
- **Music:** the group makes music; funny lines stick with them. Recording/music minigame or lines in NPC dialogue.

## 12. Open Questions (resolve during build)
- Game title.
- Type matchup chart (Metal and Relic placement).
- Seal minigame timing and patterns per type.
- Damage formulas, stats and balance.
- Number of creatures at launch and the vertical-slice scope.
- Whether to add more factions or towns after the slice.

## 13. Starters
- **Four starter lines, each 3 stages. Not tied to a character: any player can pick any of them.**
- Types are mapped onto our 10 (Spark = electric, Metal = steel, Plant = grass; there is no Fighting type).
- Every stage is pitched and approved before it is drawn.

### Furnaxol → Cullet → Vitric (Fire → Fire → Fire/Rock): glass
- **Furnaxol** (done): glassblower's axolotl from Emberwick; flame gills, belly furnace, fire-tipped tail; blows a molten glass bubble like a blowgun shot. Signature: **Glassblow**.
- **Cullet**, the apprentice: taller and lankier, charcoal with amber seams; belly becomes a ribbed portable kiln with vent slits; gills thicken into bellows; tail curls into a blowpipe; makeshift glass goggles; juggles molten marbles. Design job: control and tools, not just size.
- **Vitric**, the maestro: white-hot/blue-glass axolotl, transparent belly window over a molten core, stained-glass gill frills, glass armour plates it re-melts and reshapes. Its glass work becomes a **weapon** across the line (Cullet's blowpipe tail, Vitric's glass bell). Ability **Kiln Heart**: after a Fire move its glass hardens, reducing the next hit. Signature **Glass Bell**: a molten bubble that traps or shields, then shatters for damage.

### Zapail → Tesnail → Gauslug (Spark → Spark/Metal → Spark/Metal): living railgun
- **Zapail**: tiny snail, copper spiral shell, plug-like eyestalks; nervous; rubs its shell on the ground for static; leaves a static slime trail. Fast, frail pest. Ability **Static**. Move **Spark Trail** (charged slime patch, paralyses on contact/switch-in).
- **Tesnail**: shell becomes a segmented copper induction coil with an arc gap; prong eyestalks; conductive ferrofluid slime; drags iron filings into the gap. Ability **Induction** (hit by Spark: next Spark move boosted). Signature **Coil Tap** (+1 Sp. Atk against Metal targets or ones holding metal).
- **Gauslug**: shell splits into two parallel rails with a glowing channel; eyestalks fold into targeting prongs; foot widens into a magnetic base; fires scrap slugs. Ability **Capacitor**. Signature **Rail Shell** (high power, two-turn charge).

### Sprigby → Fernaroo → Scytharoo (Plant → Plant/Wind → Plant/Wind): kickboxing wallaby
- Look is set by `art/concepts/line_wallaby.png` (supersedes the first Sprigby concept).
- **Sprigby**: tough little lime-green joey, pale-green belly, a spiky crest of leaves for ears and fringe, a leaf plaster on one cheek, cocky smirk chewing a grass sprig, vine-taped fists up in a guard, brown clawed feet, brown tail ending in a leaf fan. Small but fearless.
- **Fernaroo**: lanky teenage brawler mid-hop; brown bark patches on shoulders and thighs, vines wound up its legs, tail a long serrated fern blade, scar across the nose, still chewing the sprig.
- **Scytharoo**: armoured kickboxing champion mid high-kick; dark forest green with bark armour, huge leaf crest, thorny vine wraps on fists and legs, scythe-like grass-blade tail. Ability **Spring Heel** (kicks gain priority on entry). Signature **Reap Kick** (high crit; Speed rises on a miss). Wind replaces the source's Fighting type.

### Gobbin → Gulpjaw → Harrowjaw (Water → Water → Water/Dark): hooded goblin harpooner
- Look is set by the concept art in `art/concepts/gobbin.png`: a goblin-shark pup dressed like a little goblin scavenger.
- **Gobbin**: dusky grey-pink skin, long flat blade snout over a spring-loaded jaw full of needle teeth, sly grin and narrow eyes, pointed fin-shaped goblin ears, its tattered slate dorsal fin worn as a hood/cape, ragged tunic with a rope belt and a pouch (no throat glow at this stage). Cute and sneaky, not scary.
- **Gulpjaw**: the scavenger. Lankier and hunched, the jaw outgrowing the body; the fin-hood grows into a long tattered cloak; a bandolier of pouches and hoarded shiny junk (bottle caps, hooks, glass); blade-like pectoral fins used as hands; the throat glow brighter, showing bioluminescent spots.
- **Harrowjaw**: the goblin king of the deep. Tall and gaunt, a ragged fin mantle like a deep-sea coat with a cowl, a crown-like crest of torn fin; fires its jaw forward on stretched cartilage like a harpoon, the throat glowing cold blue before it fires; trophy chains of hooks and lures. Palette: dusky grey-pink, slate and bruised purple, cold blue glow. Ability **Ambush Jaw**. Signature **Abyssal Harpoon** (ignores Protect, lowers Speed; its own Defense drops as the jaw resets).

### Concept art
Line sheets: `art/concepts/line_glass.png`, `line_railgun.png`, `line_wallaby.png`, `line_goblin.png`
(stage 1 singles: `zapail.png`, `gobbin.png`). Every creature gets concept art in official-artwork style first (made by the owner with ChatGPT, kept in `art/concepts/`), then the owner has ChatGPT redraw it as a BW pixel sprite (front, then back: the same pose from behind), which Claude converts (see §4 Process).

## 14. Build Plan
The live plan with milestones and status is `docs/PLAN.md`. Summary:
1. Set up project structure, data-driven config for types, moves, creatures, dialogue.
2. Validate the sprite pipeline: 1 creature at BW2 quality (96x96, 15 colours, 3/4 view).
3. **Vertical slice:** Hollow Rest plus one route, 3 creatures, 1 full loop (encounter → battle → seal → bestiary entry → sanctuary progress), PATCH intro.
4. Add character swapping and leader assists.
5. Expand towns, factions and the Connor storyline.
6. Playtest with the friend group; tune systems.
