import { describe, expect, it } from 'vitest';
import { DIALOGUE_IDS, linesFor } from '../src/engine/dialogue';
import { HEAL_SPOT, isBlocked, MAPS, npcAt, npcsFor, step } from '../src/engine/overworld';
import { canBattle, healTeam, keepBattleDamage, newProgress, parseProgress, recordSeal, teamBattlers } from '../src/engine/progress';

describe('HP carries between wild battles', () => {
  it('keeps damage and status, and heals back to full', () => {
    const p = newProgress('gobbin');
    recordSeal(p, 'zapail', 5, 'steady');
    const team = teamBattlers(p);
    team[0].hp = 7;
    team[0].status = 'brn';
    team[1].hp = 0;
    team[1].status = 'par';
    keepBattleDamage(p, team);
    expect(p.team[0]).toMatchObject({ hp: 7, status: 'brn' });
    // A fainted Patchling keeps no status.
    expect(p.team[1].hp).toBe(0);
    expect(p.team[1].status).toBeUndefined();
    const again = teamBattlers(p);
    expect(again[0].hp).toBe(7);
    expect(again[0].status).toBe('brn');
    expect(canBattle(p)).toBe(true);
    // Survives a save and load.
    expect(parseProgress(JSON.parse(JSON.stringify(p)))!.team[0]).toMatchObject({ hp: 7, status: 'brn' });
    healTeam(p);
    expect(teamBattlers(p).every((b) => b.hp === b.stats.hp && b.status === null)).toBe(true);
    expect(p.team[0].hp).toBeUndefined();
  });

  it('a team that is all down cannot battle', () => {
    const p = newProgress('sprigby');
    const team = teamBattlers(p);
    team[0].hp = 0;
    keepBattleDamage(p, team);
    expect(canBattle(p)).toBe(false);
  });

  it('full HP is saved as nothing (old saves stay valid)', () => {
    const p = newProgress('sprigby');
    keepBattleDamage(p, teamBattlers(p));
    expect(Object.keys(p.team[0]).sort()).toEqual(['bond', 'level', 'species', 'uid']);
  });
});

describe('dialogue', () => {
  it('every NPC talks with lines that exist, and leaders get their own version where written', () => {
    for (const map of Object.values(MAPS)) for (const n of map.npcs) expect(DIALOGUE_IDS, `${map.id}/${n.id}`).toContain(n.talk);
    expect(linesFor('patch_heal', 'dani')[0].text).toMatch(/On time/);
    expect(linesFor('patch_heal', 'callum')[1].text).toMatch(/spreadsheet/);
    expect(linesFor('friend_nolan', 'dani')[0].who).toBe('Nolan');
    expect(() => linesFor('nope', 'dani')).toThrow();
  });
});

describe('NPCs', () => {
  const town = MAPS.hollow_rest;

  it('the friend who leads is not also waiting at the sanctuary', () => {
    const ids = (l: 'callum' | 'nolan' | 'haydon' | 'dani') => npcsFor(town, l).map((n) => n.id);
    expect(ids('dani')).toContain('nolan');
    expect(ids('dani')).not.toContain('dani');
    expect(ids('callum')).not.toContain('callum');
    expect(ids('callum')).toContain('patch');
  });

  it('every NPC stands on open ground, PATCH takes two tiles, and NPCs block steps', () => {
    for (const map of Object.values(MAPS)) {
      for (const n of map.npcs) for (let dx = 0; dx < (n.w ?? 1); dx++) expect(isBlocked(map, n.x + dx, n.y), `${map.id}/${n.id}`).toBe(false);
    }
    const npcs = npcsFor(town, 'callum');
    const patch = town.npcs.find((n) => n.id === 'patch')!;
    expect(npcAt(npcs, patch.x + 1, patch.y)?.id).toBe('patch');
    const below = { map: 'hollow_rest', x: patch.x, y: patch.y + 1, dir: 'down' as const };
    expect(step(below, 'up', (x, y) => !!npcAt(npcs, x, y)).moved).toBe(false);
  });

  it('the heal spot is open ground facing a healer', () => {
    const map = MAPS[HEAL_SPOT.map];
    expect(isBlocked(map, HEAL_SPOT.x, HEAL_SPOT.y)).toBe(false);
    const dy = HEAL_SPOT.dir === 'up' ? -1 : HEAL_SPOT.dir === 'down' ? 1 : 0;
    const dx = HEAL_SPOT.dir === 'left' ? -1 : HEAL_SPOT.dir === 'right' ? 1 : 0;
    expect(npcAt(map.npcs, HEAL_SPOT.x + dx, HEAL_SPOT.y + dy)?.heal).toBe(true);
  });
});
