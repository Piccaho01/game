import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { Battle } from '../src/engine/battle';
import { createBattler, type Battler } from '../src/engine/battler';
import { calcDamage } from '../src/engine/damage';
import { MOVES } from '../src/engine/data';
import { gainXp, xpForLevel, xpOf, xpYield } from '../src/engine/levels';
import { newProgress, type Member } from '../src/engine/progress';
import { createRng } from '../src/engine/rng';
import route1 from '../src/data/maps/route1.json';

/**
 * Headless balance report. Skipped unless BALANCE=1:
 *   cd game && BALANCE=1 npx vitest run tests/balance.report.test.ts
 * Player AI: each turn picks the usable move with the highest expected damage vs the foe
 * (engine calcDamage, mean roll 92, no crit, x accuracy, halved for two-turn charge moves).
 * Foe AI: the engine's own Battle.chooseFoeMove (wild AI). No items, switching, assists or seals.
 */
const STARTERS = ['furnaxol', 'zapail', 'sprigby', 'gobbin'];
const FOE_SPECIES = ['orbitot', 'fledjet'];
const FOE_LEVELS = [3, 5, 6];
const N = 200;
const MAX_TURNS = 200;
const CHAIN_CAP = 100;
const CHAIN_RUNS = 200;

const enc = (route1 as any).encounters as { levels: [number, number]; table: { species: string; weight: number }[] };

function pickMove(b: Battle): number {
  const usable = b.usableMoves('player');
  let best = usable[0] ?? 0;
  let bestScore = -1;
  const dummy = createRng(1);
  for (const i of usable) {
    const m = MOVES[b.player.moves[i].id];
    if (m.category === 'status' || !m.power) continue;
    const hits = m.hits ? (m.hits[0] + m.hits[1]) / 2 : 1;
    const dmg = calcDamage(b.player, b.foe, m, dummy, { crit: false, roll: 92 }).damage * hits;
    const score = (dmg * (m.accuracy ?? 100)) / 100 / (m.flags?.charge ? 2 : 1);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

function fight(player: Battler, foe: Battler, seed: number) {
  const battle = new Battle(player, foe, createRng(seed));
  while (!battle.outcome && battle.turn < MAX_TURNS) battle.runTurn({ kind: 'move', index: pickMove(battle) });
  return battle;
}

const pad = (s: unknown, n: number) => String(s).padEnd(n);
const f1 = (x: number) => x.toFixed(1);

describe.skipIf(!process.env.BALANCE)('balance report', () => {
  it('prints the report', () => {
    const out: string[] = [];
    const log = (s = '') => out.push(s);
    const startLevel = newProgress('furnaxol').teams.callum[0].level;
    const startBond = newProgress('furnaxol').teams.callum[0].bond;

    log(`Starters: level ${startLevel}, bond ${startBond}. Foes: Route 1 wilds. ${N} battles per matchup.`);
    log('Player: best expected-damage move each turn. Foe: engine wild AI. No items/switch/assists.');
    log();
    log('1. SINGLE FIGHTS');
    log(pad('starter', 10) + pad('foe', 8) + pad('foeLv', 6) + pad('win%', 8) + pad('avgTurns', 10) + 'avgHP% left (wins)');
    for (const s of STARTERS) for (const fs of FOE_SPECIES) for (const lv of FOE_LEVELS) {
      let wins = 0, turns = 0, hpPct = 0;
      for (let seed = 1; seed <= N; seed++) {
        const p = createBattler(s, startLevel, undefined, startBond);
        const b = fight(p, createBattler(fs, lv), seed * 7919 + lv);
        turns += b.turn;
        if (b.outcome === 'win') { wins++; hpPct += (p.hp / p.stats.hp) * 100; }
      }
      log(pad(s, 10) + pad(fs, 8) + pad(lv, 6) + pad(f1((wins / N) * 100), 8) + pad(f1(turns / N), 10) + (wins ? f1(hpPct / wins) : 'n/a'));
    }

    log();
    log(`2. CHAIN FIGHTS (HP carries, no healing, XP via levels.ts, ${CHAIN_RUNS} runs, capped at ${CHAIN_CAP} wins)`);
    log(pad('starter', 10) + pad('avgWins', 9) + pad('hitCap%', 9) + pad('reach10%', 10) + 'avg level after 10 wins');
    for (const s of STARTERS) {
      let totalWins = 0, capped = 0, reach10 = 0, lvSum = 0;
      for (let run = 1; run <= CHAIN_RUNS; run++) {
        const rng = createRng(run * 104729);
        const m: Member = { uid: 1, species: s, level: startLevel, bond: startBond };
        let wins = 0;
        while (wins < CHAIN_CAP) {
          const total = enc.table.reduce((a, e) => a + e.weight, 0);
          let r = rng.next() * total;
          const entry = enc.table.find((e) => (r -= e.weight) < 0) ?? enc.table[0];
          const lv = rng.int(enc.levels[0], enc.levels[1]);
          const p = createBattler(m.species, m.level, undefined, m.bond);
          if (m.hp !== undefined) p.hp = m.hp;
          const foe = createBattler(entry.species, lv);
          const b = fight(p, foe, rng.int(1, 1e9));
          if (b.outcome !== 'win') break;
          wins++;
          m.hp = p.hp;
          gainXp(m, xpYield(entry.species, lv));
          if (wins === 10) { reach10++; lvSum += m.level; }
        }
        totalWins += wins;
        if (wins >= CHAIN_CAP) capped++;
      }
      log(pad(s, 10) + pad(f1(totalWins / CHAIN_RUNS), 9) + pad(f1((capped / CHAIN_RUNS) * 100), 9) + pad(f1((reach10 / CHAIN_RUNS) * 100), 10) + (reach10 ? f1(lvSum / reach10) : 'n/a'));
    }

    log();
    log('3. XP NEEDED (Route 1 wins from starting level; foe level uniform in table range, species by weight)');
    const total = enc.table.reduce((a, e) => a + e.weight, 0);
    let avgXp = 0, minXp = Infinity, maxXp = 0;
    for (const e of enc.table) for (let lv = enc.levels[0]; lv <= enc.levels[1]; lv++) {
      const x = xpYield(e.species, lv);
      avgXp += (e.weight / total) * x / (enc.levels[1] - enc.levels[0] + 1);
      minXp = Math.min(minXp, x); maxXp = Math.max(maxXp, x);
    }
    log(`XP per win: avg ${avgXp.toFixed(1)} (min ${minXp}, max ${maxXp}); start xp ${xpForLevel(startLevel)} at level ${startLevel}`);
    for (const target of [7, 10, 15]) {
      const need = xpForLevel(target) - xpOf({ uid: 0, species: 'x', level: startLevel, bond: startBond });
      log(`Level ${target}: ` + (need <= 0 ? `already reached (start level is ${startLevel})` : `${need} xp = ~${Math.ceil(need / avgXp)} wins (${Math.ceil(need / maxXp)}-${Math.ceil(need / minXp)} best/worst case)`));
    }

    const text = out.join('\n') + '\n';
    console.log(text);
    // Vitest can swallow console output; BALANCE_OUT=<file> also writes the report there.
    if (process.env.BALANCE_OUT) writeFileSync(process.env.BALANCE_OUT, text);
  }, 600000);
});
