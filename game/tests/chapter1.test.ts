import { describe, expect, it } from 'vitest';
import { Battle } from '../src/engine/battle';
import { createBattler, movesAtLevel } from '../src/engine/battler';
import { DIALOGUE_IDS } from '../src/engine/dialogue';
import { evolutionOf, evolve, itemEvolution, pendingEvolutions, useEvolutionItem } from '../src/engine/evolution';
import { obstaclesOn, needs, OBSTACLES, tryObstacle } from '../src/engine/fieldMoves';
import { count } from '../src/engine/items';
import { MAPS, rollEncounter, staticAt } from '../src/engine/overworld';
import { leaderTeam, newProgress, parseProgress, recordEncounter, recordSeal, switchLeader, type Member } from '../src/engine/progress';
import { questOf } from '../src/engine/quests';
import { createRng, type Rng } from '../src/engine/rng';
import { battleSpeed } from '../src/engine/turnOrder';
import { lineRoot, recolorPixel, rollVariant, shinyRecolor } from '../src/engine/variants';
import { markBeaten, skyOn } from '../src/engine/weather';

/** A rng whose next() plays back the given values, then repeats the last one. */
const seq = (...vals: number[]): Rng => {
  let i = 0;
  const next = () => vals[Math.min(i++, vals.length - 1)];
  return { next, int: (a) => a, chance: () => false };
};

const mem = (species: string, level: number): Member => ({ uid: 99, species, level, bond: 'strong' });

/** A new game where the leader (callum) holds a sealed Voltcalf. */
function withVoltcalf(level = 10) {
  const p = newProgress('furnaxol');
  const m = recordSeal(p, 'voltcalf', level, 'strong').member;
  return { p, m };
}

describe('Voltcalf evolution (Storm Shard)', () => {
  it('never evolves by level, only with a Storm Shard', () => {
    expect(evolutionOf(mem('voltcalf', 50))).toBeNull();
    expect(itemEvolution(mem('voltcalf', 5), 'storm_shard')).toBe('voltaurus');
    expect(itemEvolution(mem('voltcalf', 5), 'seal_scroll')).toBeNull();
  });

  it('useEvolutionItem names the owner, and refuses a Patchling the item is no use on', () => {
    const { p, m } = withVoltcalf();
    expect(useEvolutionItem(p, m.uid, 'storm_shard')).toEqual({ uid: m.uid, owner: 'callum', from: 'voltcalf', to: 'voltaurus', item: 'storm_shard' });
    const starter = leaderTeam(p)[0];
    expect(useEvolutionItem(p, starter.uid, 'storm_shard')).toBeNull();
  });

  it('evolve turns it into Voltaurus with Severance, and rejects a form that is not its trigger', () => {
    const { p, m } = withVoltcalf(30);
    expect(evolve(p, m.uid, 'cullet')).toBeNull();
    expect(m.species).toBe('voltcalf');
    const r = evolve(p, m.uid, 'voltaurus')!;
    expect(r).toMatchObject({ from: 'voltcalf', to: 'voltaurus' });
    expect(m.species).toBe('voltaurus');
    expect(movesAtLevel('voltaurus', 30)).toContain('severance');
    expect([...r.learned, ...movesAtLevel('voltcalf', 30)]).toContain('severance');
  });

  it('pendingEvolutions never lists a high-level Voltcalf', () => {
    const { p } = withVoltcalf(60);
    expect(pendingEvolutions(p).some((d) => d.from === 'voltcalf')).toBe(false);
  });
});

describe('rain in battle', () => {
  const SEED = 1;
  /** Foe HP lost to the player's one move, same seed. */
  function lost(moveId: string, weather: 'rain' | null) {
    const foe = createBattler('sprigby', 60);
    const b = new Battle(createBattler('furnaxol', 50, [moveId]), foe, createRng(SEED), true, { weather });
    const before = foe.hp;
    b.runTurn({ kind: 'move', index: 0 });
    return before - foe.hp;
  }

  it('powers Water and dampens Fire', () => {
    expect(lost('bubble_snap', 'rain')).toBeGreaterThan(lost('bubble_snap', null));
    expect(lost('ember_puff', 'rain')).toBeLessThan(lost('ember_puff', null));
    expect(lost('ember_puff', 'rain')).toBeGreaterThan(0);
  });

  it('announces the rain only when it is raining', () => {
    const text = (w: 'rain' | null) => new Battle(createBattler('furnaxol', 5), createBattler('sprigby', 5), createRng(1), true, { weather: w })
      .intro().filter((e) => e.kind === 'text').map((e) => (e as { text: string }).text);
    expect(text('rain')).toContain('Rain is falling.');
    expect(text(null)).not.toContain('Rain is falling.');
  });
});

describe('abilities', () => {
  it('Thunderhead is 1.5x Speed in rain, and other abilities are unchanged', () => {
    const v = createBattler('voltcalf', 10);
    expect(battleSpeed(v, 'rain')).toBe(Math.floor(battleSpeed(v, null) * 1.5));
    const f = createBattler('furnaxol', 10);
    expect(battleSpeed(f, 'rain')).toBe(battleSpeed(f, null));
  });

  it('Unblinking: Wardeye is never paralysed', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const foe = createBattler('wardeye', 90);
      const b = new Battle(createBattler('voltcalf', 5, ['horn_bolt']), foe, createRng(seed));
      for (let t = 0; t < 4 && !b.outcome; t++) {
        if (b.needsSwitch) break;
        b.runTurn({ kind: 'move', index: 0 });
        expect(foe.status, `seed ${seed}`).not.toBe('par');
      }
    }
  });

  it('Severance hits harder once Voltaurus has been hit', () => {
    const lostHp = (hit: boolean) => {
      const foe = createBattler('sprigby', 80);
      const me = createBattler('voltaurus', 30, ['severance']);
      me.volatile.wasHit = hit;
      const b = new Battle(me, foe, createRng(7));
      const before = foe.hp;
      b.runTurn({ kind: 'move', index: 0 });
      return before - foe.hp;
    };
    expect(lostHp(true)).toBeGreaterThan(lostHp(false));
  });

  it('Vigil Beam shows the foe\'s next move, and the foe then uses it', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const foe = createBattler('vitric', 100);
      const b = new Battle(createBattler('wardeye', 100, ['vigil_beam']), foe, createRng(seed));
      const ev = b.runTurn({ kind: 'move', index: 0 });
      expect(foe.hp).toBeGreaterThan(0);
      expect(foe.moves.map((m) => m.id)).toContain(b.foePlanned);
      expect(ev.some((e) => e.kind === 'text' && e.text.includes("it's going to use"))).toBe(true);
      const planned = b.foePlanned;
      const next = b.runTurn({ kind: 'move', index: 0 });
      const used = next.filter((e) => e.kind === 'move' && e.side === 'foe').map((e) => (e as { moveId: string }).moveId);
      expect(used, `seed ${seed}`).toContain(planned);
    }
  });
});

describe('weather', () => {
  const rule = { kind: 'rain' as const, chance: 0.4, minutes: 4, after: ['storm_returned'] };

  it('stays clear until the rule\'s flags are set', () => {
    const p = newProgress('furnaxol');
    expect(skyOn(p, 'route1', rule, seq(0), 1000).kind).toBeNull();
    expect(p.weather).toBeUndefined();
  });

  it('rolls once unlocked, saves the sky and keeps it until it runs out', () => {
    const p = newProgress('furnaxol');
    p.flags = ['storm_returned'];
    const sky = skyOn(p, 'route1', rule, seq(0), 1000);
    expect(sky).toMatchObject({ kind: 'rain', until: 1000 + 4 * 60_000 });
    expect(p.weather!.route1).toEqual(sky);
    // Before `until` it does not roll again (this rng would say clear).
    expect(skyOn(p, 'route1', rule, seq(0.99), 2000).kind).toBe('rain');
    // After it, it does.
    expect(skyOn(p, 'route1', rule, seq(0.99), 1000 + 5 * 60_000).kind).toBeNull();
    const q = newProgress('furnaxol');
    q.flags = ['storm_returned'];
    expect(skyOn(q, 'route1', rule, seq(0.99), 1000).kind).toBeNull();
  });

  it('markBeaten adds the id once, and parseProgress round-trips the weather and drops bad entries', () => {
    const p = newProgress('furnaxol');
    p.weather = { route1: { kind: 'rain', until: 5000 } };
    markBeaten(p, 'route1', 'wardeye');
    markBeaten(p, 'route1', 'wardeye');
    expect(p.weather.route1.beaten).toEqual(['wardeye']);
    const raw = JSON.parse(JSON.stringify(p));
    raw.weather.bad = { kind: 'snow', until: 1 };
    raw.weather.worse = { kind: 'rain' };
    const back = parseProgress(raw)!;
    expect(back.weather).toEqual({ route1: { kind: 'rain', until: 5000, beaten: ['wardeye'] } });
  });
});

describe('encounters under rain', () => {
  const route = { ...MAPS.route1, encounters: { ...MAPS.route1.encounters!, rate: 1 } };

  it('Voltcalf shows up in the rain at levels 4-7, and never in clear weather', () => {
    const rng = createRng(11);
    const rain = Array.from({ length: 400 }, () => rollEncounter(route, rng, 'rain')!);
    const volts = rain.filter((e) => e.species === 'voltcalf');
    expect(volts.length).toBeGreaterThan(0);
    for (const v of volts) expect(v.level).toBeGreaterThanOrEqual(4), expect(v.level).toBeLessThanOrEqual(7);
    for (let i = 0; i < 400; i++) expect(rollEncounter(route, rng, null)!.species).not.toBe('voltcalf');
  });

  it('Wardeye is a static that needs the storm flag, rain, no seal and not beaten', () => {
    const p = newProgress('furnaxol');
    const now = 1000;
    const at = () => staticAt(MAPS.route1, 1, 5, p, now);
    expect(at()).toBeNull();
    p.flags = ['storm_returned'];
    expect(at()).toBeNull();
    p.weather = { route1: { kind: 'rain', until: now + 1e9 } };
    expect(at()).toMatchObject({ id: 'wardeye', species: 'wardeye' });
    p.weather.route1.beaten = ['wardeye'];
    expect(at()).toBeNull();
    p.weather.route1.beaten = [];
    expect(at()).not.toBeNull();
    recordSeal(p, 'wardeye', 9, 'steady');
    expect(p.bestiary.wardeye.seals).toBeGreaterThan(0);
    expect(at()).toBeNull();
  });
});

describe('the storm quest', () => {
  const ids = ['r1_rod_plate', 'r1_clerk', 'r1_clamp', 'r1_shard_rock'];
  const get = (id: string) => OBSTACLES.find((o) => o.id === id)!;

  it('lists the four obstacles with the friend each needs', () => {
    const p = newProgress('furnaxol');
    const on = obstaclesOn('route1', p);
    expect(ids.every((id) => on.some((o) => o.id === id))).toBe(true);
    expect(ids.map((id) => needs(get(id)))).toEqual(['callum', 'haydon', 'nolan', 'dani']);
  });

  it('the clamp waits for the other two, then Nolan clears it and the storm returns', () => {
    const p = newProgress('furnaxol');
    switchLeader(p, 'nolan');
    expect(tryObstacle(p, get('r1_clamp'))).toMatchObject({ cleared: false, waiting: true });
    switchLeader(p, 'callum');
    expect(tryObstacle(p, get('r1_rod_plate')).cleared).toBe(true);
    switchLeader(p, 'haydon');
    expect(tryObstacle(p, get('r1_clerk')).cleared).toBe(true);
    switchLeader(p, 'nolan');
    expect(tryObstacle(p, get('r1_clamp')).cleared).toBe(true);
    expect(p.flags).toContain('storm_returned');
  });

  it('Dani\'s rock gives a Storm Shard, but only Dani', () => {
    const p = newProgress('furnaxol');
    switchLeader(p, 'callum');
    expect(tryObstacle(p, get('r1_shard_rock')).cleared).toBe(false);
    expect(count(p, 'storm_shard')).toBe(0);
    switchLeader(p, 'dani');
    expect(tryObstacle(p, get('r1_shard_rock')).cleared).toBe(true);
    expect(count(p, 'storm_shard')).toBe(1);
  });

  it('every dialogue id the quest names exists', () => {
    for (const id of ids) {
      const o = get(id);
      for (const t of [o.blockedTalk, o.clearTalk, o.waitTalk]) if (t) expect(DIALOGUE_IDS, `${id}: ${t}`).toContain(t);
    }
    for (const s of MAPS.route1.statics) if (s.talk) expect(DIALOGUE_IDS).toContain(s.talk);
  });

  it('Wardeye\'s quest page has 5 steps and ticks off as the quest is done', () => {
    const p = newProgress('furnaxol');
    const q0 = questOf(p, 'wardeye')!;
    expect(q0.steps).toHaveLength(5);
    expect(q0.steps.every((s) => !s.done)).toBe(true);
    for (const [leader, id] of [['callum', 'r1_rod_plate'], ['haydon', 'r1_clerk'], ['nolan', 'r1_clamp']] as const) {
      switchLeader(p, leader);
      tryObstacle(p, get(id));
    }
    recordEncounter(p, 'wardeye');
    const q = questOf(p, 'wardeye')!;
    expect(q.steps.every((s) => s.done)).toBe(true);
    expect(q.done).toBe(true);
  });
});

describe('variants', () => {
  it('rolls a Prototype first, then a shiny, else nothing', () => {
    expect(rollVariant(seq(0))).toBe('prototype');
    expect(rollVariant(seq(0.5, 0))).toBe('shiny');
    expect(rollVariant(seq(0.99))).toBeUndefined();
  });

  it('a sealed shiny is remembered in the member and the entry, and bad variants are dropped on load', () => {
    const p = newProgress('furnaxol');
    const { member } = recordSeal(p, 'orbitot', 5, 'strong', 'shiny');
    expect(member.variant).toBe('shiny');
    expect(p.bestiary.orbitot.shiny).toBe(1);
    const raw = JSON.parse(JSON.stringify(p));
    expect(parseProgress(raw)!.teams.callum.find((m) => m.species === 'orbitot')?.variant).toBe('shiny');
    raw.teams.callum.find((m: Member) => m.species === 'orbitot').variant = 'gold';
    expect(parseProgress(raw)!.teams.callum.some((m) => m.species === 'orbitot')).toBe(false);
  });

  it('shiny palettes are per line', () => {
    expect(lineRoot('strafalcon')).toBe('fledjet');
    expect(lineRoot('voltaurus')).toBe('voltcalf');
    expect(shinyRecolor('cullet')).toEqual(shinyRecolor('furnaxol'));
  });

  it('recolouring keeps outlines and shifts saturated colours', () => {
    expect(recolorPixel(0x1c, 0x1b, 0x29, { hue: 150 })).toEqual([0x1c, 0x1b, 0x29]);
    expect(recolorPixel(220, 40, 40, { hue: 150 })).not.toEqual([220, 40, 40]);
  });
});
