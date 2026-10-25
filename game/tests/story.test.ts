import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newProgress, parseProgress, SQUAD } from '../src/engine/progress';
import { checkScript, hasFlag, huddle, markSeen, sceneFor, SCRIPTS, speakerName, stepsFor, TRIGGERS } from '../src/engine/story';
import { isBlocked, MAPS, START } from '../src/engine/overworld';

const CARDS = readdirSync(new URL('../../art/cutscenes/out', import.meta.url)).map((f) => f.replace(/\.png$/, ''));

describe('cutscene scripts', () => {
  it('every script checks out: known speakers, real cards, no empty lines', () => {
    expect(Object.keys(SCRIPTS).sort()).toEqual(['connor_hook', 'first_step', 'opening', 'starters_picked']);
    for (const s of Object.values(SCRIPTS)) expect(checkScript(s, CARDS)).toEqual([]);
  });

  it('catches mistakes', () => {
    const bad = { id: 'bad', steps: [{ who: 'gary', text: 'hi' }, { card: 'nope' }, { who: 'patch', text: ' ' }, { text: 'orphan' }] };
    expect(checkScript(bad as never, CARDS)).toHaveLength(4);
  });

  it('the opening has all four talking and ends at the starter pick', () => {
    const o = SCRIPTS.opening;
    const talkers = new Set(o.steps.map((s) => s.who));
    for (const c of [...SQUAD, 'patch']) expect(talkers.has(c as never)).toBe(true);
    expect(o.next).toEqual({ scene: 'newgame', data: { step: 'starters' } });
    expect(o.steps.filter((s) => s.card).map((s) => s.card)).toEqual(['01_couch', '02_plan', '03_blowup', '04_landing', '05_starters']);
  });

  it('reactions become one line per friend, about the starter they took', () => {
    const picks = { callum: 'gobbin', nolan: 'zapail', haydon: 'sprigby', dani: 'furnaxol' };
    const steps = stepsFor(SCRIPTS.starters_picked, picks);
    expect(steps.slice(0, 4).map((s) => s.who)).toEqual(SQUAD);
    expect(steps[0].text).toBe(SCRIPTS.starters_picked.reactions!.callum!.gobbin);
    expect(steps[2].text).toBe('Told you. Kicking is a personality.');
    expect(steps[4].who).toBe('patch');
    // Every friend has a line for every starter.
    for (const c of SQUAD) expect(Object.keys(SCRIPTS.starters_picked.reactions![c]!).sort()).toEqual(['furnaxol', 'gobbin', 'sprigby', 'zapail']);
  });

  it('names speakers', () => {
    expect(speakerName('patch')).toBe('PATCH');
    expect(speakerName('connor')).toBe('Connor');
    expect(speakerName('dani')).toBe('Dani');
    expect(speakerName('narration')).toBe('');
  });
});

describe('story flags and triggers', () => {
  it('a new game has no flags; a scene marks itself and what it sets', () => {
    const p = newProgress('furnaxol');
    expect(p.flags).toEqual([]);
    markSeen(p, 'connor_hook');
    expect(hasFlag(p, 'connor_hook')).toBe(true);
    expect(hasFlag(p, 'opening')).toBe(true);
    markSeen(p, 'connor_hook');
    expect(p.flags).toEqual(['connor_hook', 'opening']);
  });

  it('flags survive a save; saves from before the story count as past the opening', () => {
    const p = newProgress('furnaxol');
    markSeen(p, 'first_step');
    expect(parseProgress(JSON.parse(JSON.stringify(p)))!.flags).toEqual(['first_step']);
    const { flags: _f, ...old } = newProgress('sprigby');
    const loaded = parseProgress(JSON.parse(JSON.stringify(old)))!;
    expect(loaded.flags).toEqual(['opening']);
    expect(sceneFor(loaded, START, 'arrive')).toBeNull();
  });

  it('the first step plays on arrival, then Connor at the town sign, once each', () => {
    const p = newProgress('furnaxol');
    expect(sceneFor(p, START, 'arrive')).toBe('first_step');
    expect(sceneFor(p, START, 'step')).toBeNull();
    // Connor waits for the first step.
    const sign = { map: 'hollow_rest', x: 14, y: 17, dir: 'left' as const };
    expect(sceneFor(p, sign, 'step')).toBeNull();
    markSeen(p, 'first_step');
    expect(sceneFor(p, START, 'arrive')).toBeNull();
    expect(sceneFor(p, START, 'step')).toBeNull();
    expect(sceneFor(p, sign, 'step')).toBe('connor_hook');
    expect(sceneFor(p, { ...sign, map: 'route1' }, 'step')).toBeNull();
    markSeen(p, 'connor_hook');
    expect(sceneFor(p, sign, 'step')).toBeNull();
  });

  it('every trigger names a real scene and map, and areas are on the map', () => {
    for (const t of TRIGGERS) {
      expect(SCRIPTS[t.scene], t.scene).toBeDefined();
      expect(MAPS[t.map], t.map).toBeDefined();
      if (t.area) {
        const [x, y, w, h] = t.area;
        expect(x + w).toBeLessThanOrEqual(MAPS[t.map].width);
        expect(y + h).toBeLessThanOrEqual(MAPS[t.map].height);
      }
    }
  });

  it('the town-sign area is on every way to Route 1', () => {
    const t = TRIGGERS.find((x) => x.scene === 'connor_hook')!;
    const [ax, ay, aw, ah] = t.area!;
    const map = MAPS.hollow_rest;
    for (const w of map.warps.filter((w) => w.to === 'route1')) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = w.x + dx, y = w.y + dy;
        if (isBlocked(map, x, y)) continue;
        expect(x >= ax && x < ax + aw && y >= ay && y < ay + ah, `${x},${y}`).toBe(true);
      }
    }
  });
});

describe('huddle', () => {
  it('puts the others on free tiles next to the leader, facing them', () => {
    const spots = huddle(START, 4);
    expect(new Set(spots.map((s) => `${s.x},${s.y}`)).size).toBe(4);
    for (const s of spots) {
      expect(Math.abs(s.x - START.x) + Math.abs(s.y - START.y)).toBeGreaterThan(0);
      expect(isBlocked(MAPS.hollow_rest, s.x, s.y)).toBe(false);
    }
    expect(spots[0]).toEqual({ x: START.x + 1, y: START.y, dir: 'left' });
    expect(spots[1]).toEqual({ x: START.x, y: START.y + 1, dir: 'up' });
  });

  it('skips tiles taken by someone else', () => {
    const spots = huddle(START, 1, (x, y) => x === START.x + 1 && y === START.y);
    expect(spots[0]).toMatchObject({ x: START.x, y: START.y + 1 });
  });
});
