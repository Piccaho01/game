# game

Design bible: `CLAUDE.md`. Build plan and status: `docs/PLAN.md`.

## Play / develop

The game lives in `game/` (TypeScript + Phaser 3 + Vite).

```sh
cd game
npm install
npm run dev        # local server; open the printed URL on your phone (same Wi-Fi)
npm test           # unit tests (damage, type chart, turn order, battle)
npm run build
npm run test:e2e   # headless phone-sized browser: boots and wins a battle
```

URL options: `?player=furnaxol&foe=gobbin&seed=3` picks the Patchlings and fixes the RNG.

Content is data in `game/src/data/*.json` (types and matchup chart, moves, abilities,
Patchlings, bestiary lore). Creature sprites are read straight from `art/creatures/out/`:
a species with `"sprite": "<name>"` uses `anims/<name>_idle.png/.json`; without one it
gets a placeholder.

Every push to `main` runs the tests and publishes to GitHub Pages
(one-time: repo Settings → Pages → Source: GitHub Actions).
