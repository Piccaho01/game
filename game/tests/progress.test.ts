import { describe, expect, it } from 'vitest';
import { createBattler } from '../src/engine/battler';
import {
  loreOf, newProgress, parseProgress, recordDefeat, recordEncounter, recordSeal, sanctuaryPoints, stageOf, TEAM_SIZE,
} from '../src/engine/progress';

describe('team and sanctuary', () => {
  it('a new game has the starter on a team of up to six', () => {
    const p = newProgress('gobbin');
    expect(TEAM_SIZE).toBe(6);
    expect(p.team).toEqual([{ uid: 1, species: 'gobbin', level: 8, bond: 'strong' }]);
    expect(p.sanctuary).toEqual([]);
    expect(stageOf(p.bestiary.gobbin)).toBe('bonded');
  });

  it('seals join the team until it has six, then go straight to the sanctuary', () => {
    const p = newProgress('furnaxol');
    const where = Array.from({ length: 7 }, () => recordSeal(p, 'zapail', 5, 'steady').where);
    expect(where).toEqual(['team', 'team', 'team', 'team', 'team', 'sanctuary', 'sanctuary']);
    expect(p.team).toHaveLength(6);
    expect(p.sanctuary).toHaveLength(2);
    expect(new Set([...p.team, ...p.sanctuary].map((m) => m.uid)).size).toBe(8);
  });

  it('a better seal means better stats', () => {
    const strong = createBattler('sprigby', 10, undefined, 'strong').stats;
    const wary = createBattler('sprigby', 10, undefined, 'wary').stats;
    expect(strong.atk).toBeGreaterThan(wary.atk);
    expect(wary).toEqual(createBattler('sprigby', 10).stats);
  });
});

describe('bestiary', () => {
  it('stages climb with encounters and defeats', () => {
    const p = newProgress('furnaxol');
    expect(stageOf(p.bestiary.sprigby)).toBeNull();
    expect(recordEncounter(p, 'sprigby')).toEqual({ species: 'sprigby', from: null, to: 'sighted' });
    expect(recordDefeat(p, 'sprigby')).toEqual({ species: 'sprigby', from: 'sighted', to: 'tracked' });
    recordDefeat(p, 'sprigby');
    expect(recordDefeat(p, 'sprigby')?.to).toBe('studied');
    expect(recordEncounter(p, 'sprigby')).toBeNull();
  });

  it('a strong seal on first sight jumps to Bonded and unlocks all lore', () => {
    const p = newProgress('furnaxol');
    recordEncounter(p, 'zapail');
    expect(recordSeal(p, 'zapail', 5, 'strong').change).toEqual({ species: 'zapail', from: 'sighted', to: 'bonded' });
    expect(loreOf(p, 'zapail').map((l) => l.stage)).toEqual(['sighted', 'tracked', 'studied', 'sealed', 'bonded']);
    expect(loreOf(p, 'gobbin')).toEqual([]);
  });

  it('a wary seal stops at Sealed', () => {
    const p = newProgress('furnaxol');
    recordEncounter(p, 'gobbin');
    expect(recordSeal(p, 'gobbin', 5, 'wary').change?.to).toBe('sealed');
  });

  it('sanctuary points add up every entry by stage', () => {
    const p = newProgress('furnaxol');
    recordEncounter(p, 'sprigby'); // sighted: 1
    recordEncounter(p, 'zapail');
    recordSeal(p, 'zapail', 5, 'steady'); // sealed: 4
    expect(sanctuaryPoints(p)).toBe(5 + 5); // plus the bonded starter
  });
});

describe('save', () => {
  it('round-trips through JSON and drops unknown species', () => {
    const p = newProgress('furnaxol');
    recordEncounter(p, 'sprigby');
    recordSeal(p, 'zapail', 5, 'steady');
    expect(parseProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
    const old = JSON.parse(JSON.stringify(p));
    old.team.push({ uid: 99, species: 'missingno', level: 5, bond: 'wary' });
    old.bestiary.missingno = { encounters: 1, defeats: 0, seals: 0, strongBonds: 0 };
    expect(parseProgress(old)).toEqual(p);
  });

  it('a save from before the character pick belongs to Callum', () => {
    const p = newProgress('gobbin', 'dani');
    const v1 = { ...JSON.parse(JSON.stringify(p)), version: 1 };
    delete v1.leader;
    expect(parseProgress(v1)).toEqual({ ...p, leader: 'callum' });
    expect(parseProgress(JSON.parse(JSON.stringify(p)))?.leader).toBe('dani');
  });

  it('rejects garbage', () => {
    expect(parseProgress(null)).toBeNull();
    expect(parseProgress({ version: 2 })).toBeNull();
    expect(parseProgress({ version: 1, team: [], sanctuary: [], bestiary: {} })).toBeNull();
    expect(parseProgress({ version: 3, team: [{ uid: 1, species: 'gobbin', level: 5, bond: 'wary' }], sanctuary: [], bestiary: {} })).toBeNull();
  });
});
