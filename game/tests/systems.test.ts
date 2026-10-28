import { describe, expect, it } from 'vitest';
import { applyScroll, count, ITEMS, refillScrolls, scrollsInBag, scrollWindows, START_BAG, useItem } from '../src/engine/items';
import { awardXp, gainXp, levelProgress, xpForLevel, xpOf, xpYield } from '../src/engine/levels';
import { leaderTeam, newProgress, parseProgress, recordSeal } from '../src/engine/progress';
import { scoreSeal } from '../src/engine/seal';
import { createBattler } from '../src/engine/battler';

describe('experience', () => {
  it('a level-8 starter sits at the start of its level; a foe is worth its stats and level', () => {
    const p = newProgress('furnaxol');
    const m = leaderTeam(p)[0];
    expect(xpOf(m)).toBe(xpForLevel(8));
    expect(levelProgress(m)).toBe(0);
    expect(xpYield('fledjet', 4)).toBeGreaterThan(xpYield('fledjet', 2));
  });

  it('every Patchling on all four teams gets the full share; the sanctuary gets half', () => {
    const p = newProgress('furnaxol');
    for (let i = 0; i < 6; i++) recordSeal(p, 'orbitot', 3, 'steady'); // five join Callum, one goes to the sanctuary
    const stored = p.sanctuary[0];
    const before = xpOf(stored);
    awardXp(p, 100);
    for (const t of Object.values(p.teams)) expect(xpOf(t[0])).toBe(xpForLevel(8) + 100);
    expect(xpOf(stored)).toBe(before + 50);
  });

  it('levels up as far as the experience reaches, learns its moves, keeps its damage', () => {
    const p = newProgress('furnaxol');
    const m = leaderTeam(p)[0];
    m.hp = 10;
    const maxBefore = createBattler('furnaxol', 8, undefined, 'strong').stats.hp;
    const r = gainXp(m, xpForLevel(13) - xpForLevel(8));
    expect(r).toMatchObject({ from: 8, to: 13 });
    expect(r.learned).toContain('kiln_vent');
    const maxAfter = createBattler('furnaxol', 13, undefined, 'strong').stats.hp;
    expect(m.hp).toBe(10 + maxAfter - maxBefore);
    const ups = awardXp(p, xpForLevel(9) - xpForLevel(8));
    expect(ups.map((u) => u.owner).sort()).toEqual(['dani', 'haydon', 'nolan']);
  });

  it('experience survives a save', () => {
    const p = newProgress('gobbin');
    awardXp(p, 40);
    expect(xpOf(parseProgress(JSON.parse(JSON.stringify(p)))!.teams.callum[0])).toBe(xpForLevel(8) + 40);
  });
});

describe('seal scrolls', () => {
  it('a new game starts with the starter pack; old saves get it too', () => {
    const p = newProgress('furnaxol');
    expect(p.items).toEqual(START_BAG);
    const old = JSON.parse(JSON.stringify(p));
    delete old.items;
    expect(parseProgress(old)!.items).toEqual(START_BAG);
    for (const id of Object.keys(START_BAG)) expect(ITEMS[id]).toBeDefined();
  });

  it('using and refilling', () => {
    const p = newProgress('furnaxol');
    while (useItem(p, 'seal_scroll'));
    expect(count(p, 'seal_scroll')).toBe(0);
    expect(scrollsInBag(p)).not.toContain('seal_scroll');
    expect(refillScrolls(p)).toBe(5);
    expect(count(p, 'seal_scroll')).toBe(5);
    expect(refillScrolls(p)).toBe(0);
  });

  it('type scrolls widen the windows only against their type', () => {
    const w = { perfect: 50, good: 100 };
    expect(scrollWindows(w, ITEMS.ember_scroll.effect, ['fire']).good).toBe(160);
    expect(scrollWindows(w, ITEMS.ember_scroll.effect, ['water']).good).toBe(100);
    expect(scrollWindows(w, ITEMS.silk_scroll.effect, ['water']).good).toBe(135);
  });

  it('glass: one miss breaks it, a perfect run is a strong bond; gilded lifts the bond', () => {
    const glass = ITEMS.glass_scroll.effect;
    const nearly = scoreSeal(['perfect', 'perfect', 'perfect', 'miss'], 0, 0);
    expect(nearly.sealed).toBe(true);
    expect(applyScroll(nearly, glass, ['wind']).sealed).toBe(false);
    expect(applyScroll(scoreSeal(['perfect', 'perfect', 'perfect'], 0, 1), glass, ['wind']).bond).toBe('strong');
    const steady = scoreSeal(['good', 'good', 'perfect'], 0, 0);
    expect(steady.bond).toBe('steady');
    expect(applyScroll(steady, ITEMS.gilded_scroll.effect, ['wind']).bond).toBe('strong');
  });
});

describe('field moves', () => {
  it('only the right friend clears an obstacle; it stays cleared and gives its reward', async () => {
    const { OBSTACLES, obstaclesOn, tryObstacle, needs } = await import('../src/engine/fieldMoves');
    const { isBlocked, MAPS } = await import('../src/engine/overworld');
    const { switchLeader } = await import('../src/engine/progress');
    // Every obstacle sits on open ground of a real map (or is the object already on its tile).
    for (const o of OBSTACLES) expect(isBlocked(MAPS[o.map], o.x, o.y), o.id).toBe(!!o.onObject);
    const p = newProgress('furnaxol');
    const boulder = obstaclesOn('hollow_rest', p).find((o) => o.kind === 'boulder')!;
    expect(needs(boulder)).toBe('dani');
    const no = tryObstacle(p, boulder);
    expect(no.cleared).toBe(false);
    expect(no.lines[1]).toMatch(/Dani/);
    switchLeader(p, 'dani');
    const yes = tryObstacle(p, boulder);
    expect(yes.cleared).toBe(true);
    expect(yes.reward).toBe('Found a Gilded Scroll!');
    expect(count(p, 'gilded_scroll')).toBe(1);
    expect(obstaclesOn('hollow_rest', p)).not.toContainEqual(boulder);
    expect(parseProgress(JSON.parse(JSON.stringify(p)))!.cleared).toEqual(['hollow_boulder']);
  });

  it('Route 1 makes you switch to the other three: Nolan, Haydon and Callum each have one', async () => {
    const { obstaclesOn, needs, tryObstacle } = await import('../src/engine/fieldMoves');
    const { findPath, MAPS } = await import('../src/engine/overworld');
    const { switchLeader } = await import('../src/engine/progress');
    const { DIALOGUE_IDS } = await import('../src/engine/dialogue');
    const p = newProgress('furnaxol');
    const list = obstaclesOn('route1', p);
    expect(list.map(needs).sort()).toEqual(['callum', 'haydon', 'nolan']);
    for (const o of list) for (const t of [o.blockedTalk, o.clearTalk]) if (t) expect(DIALOGUE_IDS, t).toContain(t);
    const blocked = (x: number, y: number) => list.some((o) => o.x === x && o.y === y);
    const spawn = MAPS.route1.spawn;
    // The broken bridge cuts the east bank off; the officer guards the only stairs down to the checkpoint.
    expect(findPath('route1', spawn, { x: 16, y: 9 }, blocked)).toBeNull();
    expect(findPath('route1', spawn, { x: 18, y: 17 }, (x, y) => x === 18 && y === 8)).toBeNull();
    // Each can be reached by walking (from a tile next to it).
    for (const o of list) {
      const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => findPath('route1', spawn, { x: o.x + dx, y: o.y + dy }, (x, y) => blocked(x, y) && !(x === 13 && y === 9 && o.id !== 'route1_bridge')));
      expect(next, o.id).toBe(true);
    }
    const bridge = list.find((o) => o.id === 'route1_bridge')!;
    expect(tryObstacle(p, bridge).cleared).toBe(false);
    switchLeader(p, 'nolan');
    expect(tryObstacle(p, bridge)).toMatchObject({ cleared: true, talk: 'route1_bridge_fixed' });
    expect(obstaclesOn('route1', p).map((o) => o.id)).not.toContain('route1_bridge');
  });
});
