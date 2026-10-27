import { describe, expect, it } from 'vitest';
import { createBattler } from '../src/engine/battler';
import {
  assignStarters, deposit, leaderTeam, loreOf, newProgress, partyMode, parseProgress, recordDefeat, recordEncounter, recordScan, recordSeal, sanctuaryPoints, stageOf, switchLeader, TEAM_SIZE, withdraw,
} from '../src/engine/progress';

describe('team and sanctuary', () => {
  it('a new game has the starter on a team of up to six', () => {
    const p = newProgress('gobbin');
    expect(TEAM_SIZE).toBe(6);
    expect(leaderTeam(p)).toEqual([{ uid: 1, species: 'gobbin', level: 8, bond: 'strong' }]);
    expect(p.sanctuary).toEqual([]);
    expect(stageOf(p.bestiary.gobbin)).toBe('bonded');
  });

  it('seals join the team until it has six, then go straight to the sanctuary', () => {
    const p = newProgress('furnaxol');
    const where = Array.from({ length: 7 }, () => recordSeal(p, 'zapail', 5, 'steady').where);
    expect(where).toEqual(['team', 'team', 'team', 'team', 'team', 'sanctuary', 'sanctuary']);
    expect(leaderTeam(p)).toHaveLength(6);
    expect(p.sanctuary).toHaveLength(2);
    expect(new Set([...leaderTeam(p), ...p.sanctuary].map((m) => m.uid)).size).toBe(8);
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
    expect(stageOf(p.bestiary.orbitot)).toBeNull();
    expect(recordEncounter(p, 'orbitot')).toEqual({ species: 'orbitot', from: null, to: 'sighted' });
    expect(recordDefeat(p, 'orbitot')).toEqual({ species: 'orbitot', from: 'sighted', to: 'tracked' });
    recordDefeat(p, 'orbitot');
    expect(recordDefeat(p, 'orbitot')?.to).toBe('studied');
    expect(recordEncounter(p, 'orbitot')).toBeNull();
  });

  it('a strong seal on first sight jumps to Bonded and unlocks all lore', () => {
    const p = newProgress('furnaxol');
    recordEncounter(p, 'fledjet');
    expect(recordSeal(p, 'fledjet', 5, 'strong').change).toEqual({ species: 'fledjet', from: 'sighted', to: 'bonded' });
    expect(loreOf(p, 'fledjet').map((l) => l.stage)).toEqual(['sighted', 'tracked', 'studied', 'sealed', 'bonded']);
    expect(loreOf(p, 'orbitot')).toEqual([]);
  });

  it("Callum's Scan makes an entry Studied", () => {
    const p = newProgress('furnaxol');
    recordEncounter(p, 'orbitot');
    expect(recordScan(p, 'orbitot')).toEqual({ species: 'orbitot', from: 'sighted', to: 'studied' });
  });

  it('a wary seal stops at Sealed', () => {
    const p = newProgress('furnaxol');
    recordEncounter(p, 'orbitot');
    expect(recordSeal(p, 'orbitot', 5, 'wary').change?.to).toBe('sealed');
  });

  it('sanctuary points add up every entry by stage', () => {
    const p = newProgress('furnaxol');
    recordEncounter(p, 'orbitot'); // sighted: 1
    recordEncounter(p, 'fledjet');
    recordSeal(p, 'fledjet', 5, 'steady'); // sealed: 4
    expect(sanctuaryPoints(p)).toBe(5 + 4 * 5); // plus the four bonded starters
  });
});

describe('save', () => {
  it('round-trips through JSON and drops unknown species', () => {
    const p = newProgress('furnaxol');
    recordEncounter(p, 'sprigby');
    recordSeal(p, 'zapail', 5, 'steady');
    expect(parseProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
    const old = JSON.parse(JSON.stringify(p));
    old.teams.callum.push({ uid: 99, species: 'missingno', level: 5, bond: 'wary' });
    old.bestiary.missingno = { encounters: 1, defeats: 0, seals: 0, strongBonds: 0 };
    expect(parseProgress(old)).toEqual(p);
  });

  it('a save from before the character pick belongs to Callum', () => {
    const v1 = { version: 1, nextUid: 2, team: [{ uid: 1, species: 'gobbin', level: 8, bond: 'strong' }], sanctuary: [], bestiary: {} };
    const p = parseProgress(v1)!;
    expect(p.leader).toBe('callum');
    expect(p.teams.callum.map((m) => m.species)).toEqual(['gobbin']);
    expect(parseProgress(JSON.parse(JSON.stringify(newProgress('gobbin', 'dani'))))?.leader).toBe('dani');
  });

  it('a v2 save: the old team goes to its leader, the other three get the remaining starters', () => {
    const v2 = {
      version: 2, leader: 'nolan', nextUid: 4, wings: ['root_hall'], pos: { map: 'hollow_rest', x: 6, y: 6, dir: 'up' },
      team: [{ uid: 1, species: 'sprigby', level: 8, bond: 'strong', hp: 4 }, { uid: 2, species: 'orbitot', level: 5, bond: 'steady' }],
      sanctuary: [{ uid: 3, species: 'fledjet', level: 4, bond: 'wary' }],
      bestiary: { sprigby: { encounters: 1, defeats: 0, seals: 1, strongBonds: 1, scans: 0 }, orbitot: { encounters: 3, defeats: 1, seals: 1, strongBonds: 0, scans: 0 } },
    };
    const p = parseProgress(v2)!;
    expect(p.version).toBe(3);
    expect(p.leader).toBe('nolan');
    expect(p.teams.nolan).toEqual(v2.team);
    // Nolan took Sprigby, so Haydon (Sprigby by default) gets Nolan's default, Zapail.
    expect(p.teams.callum.map((m) => m.species)).toEqual(['furnaxol']);
    expect(p.teams.haydon.map((m) => m.species)).toEqual(['zapail']);
    expect(p.teams.dani.map((m) => m.species)).toEqual(['gobbin']);
    expect(p.teams.dani[0]).toMatchObject({ level: 8, bond: 'strong' });
    expect(p.sanctuary).toEqual(v2.sanctuary);
    expect(p.wings).toEqual(['root_hall']);
    expect(p.pos).toEqual(v2.pos);
    expect('team' in p).toBe(false);
    // Fresh uids, all different; their starters' entries open.
    const uids = [...Object.values(p.teams).flat(), ...p.sanctuary].map((m) => m.uid);
    expect(new Set(uids).size).toBe(uids.length);
    expect(p.nextUid).toBeGreaterThan(Math.max(...uids));
    for (const s of ['furnaxol', 'zapail', 'gobbin']) expect(stageOf(p.bestiary[s])).toBe('bonded');
    expect(p.bestiary.orbitot.encounters).toBe(3);
    // Loads again as itself.
    expect(parseProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('older bestiary records get the scan counter', () => {
    const p = newProgress('furnaxol');
    const old = JSON.parse(JSON.stringify(p));
    delete old.bestiary.furnaxol.scans;
    expect(parseProgress(old)?.bestiary.furnaxol.scans).toBe(0);
  });

  it('rejects garbage', () => {
    expect(parseProgress(null)).toBeNull();
    expect(parseProgress({ version: 2 })).toBeNull();
    expect(parseProgress({ version: 1, team: [], sanctuary: [], bestiary: {} })).toBeNull();
    expect(parseProgress({ version: 4, team: [{ uid: 1, species: 'gobbin', level: 5, bond: 'wary' }], sanctuary: [], bestiary: {} })).toBeNull();
    // A v3 save whose leader has no team.
    expect(parseProgress({ version: 3, leader: 'dani', nextUid: 2, teams: { callum: [{ uid: 1, species: 'gobbin', level: 5, bond: 'wary' }] }, sanctuary: [], bestiary: {} })).toBeNull();
  });
});

describe('the squad', () => {
  it('each friend takes one starter; the defaults are Haydon-Sprigby, Dani-Gobbin, Callum-Furnaxol, Nolan-Zapail', () => {
    const p = newProgress({ callum: 'furnaxol', nolan: 'zapail', haydon: 'sprigby', dani: 'gobbin' }, 'haydon');
    expect(Object.fromEntries(Object.entries(p.teams).map(([c, t]) => [c, t.map((m) => m.species)])))
      .toEqual({ callum: ['furnaxol'], nolan: ['zapail'], haydon: ['sprigby'], dani: ['gobbin'] });
    expect(leaderTeam(p)[0].species).toBe('sprigby');
    for (const s of ['furnaxol', 'zapail', 'sprigby', 'gobbin']) expect(stageOf(p.bestiary[s])).toBe('bonded');
    expect(assignStarters('gobbin', 'callum')).toEqual({ callum: 'gobbin', nolan: 'zapail', haydon: 'sprigby', dani: 'furnaxol' });
  });

  it('SWITCH cycles the leader; seals go to the leader of the moment', () => {
    const p = newProgress('furnaxol');
    expect(switchLeader(p)).toBe('nolan');
    recordSeal(p, 'orbitot', 5, 'steady');
    expect(p.teams.nolan.map((m) => m.species)).toEqual(['zapail', 'orbitot']);
    expect(p.teams.callum).toHaveLength(1);
    switchLeader(p); switchLeader(p);
    expect(switchLeader(p)).toBe('callum');
  });

  it('the sanctuary is shared: one deposits, another withdraws', () => {
    const p = newProgress('furnaxol');
    const orb = recordSeal(p, 'orbitot', 5, 'steady').member;
    leaderTeam(p)[1].hp = 2;
    expect(deposit(p, orb.uid)).toBe(true);
    expect(p.sanctuary).toEqual([{ uid: orb.uid, species: 'orbitot', level: 5, bond: 'steady' }]);
    // The last one on a team stays.
    expect(deposit(p, leaderTeam(p)[0].uid)).toBe(false);
    switchLeader(p, 'dani');
    expect(withdraw(p, orb.uid)).toBe(true);
    expect(p.teams.dani.map((m) => m.species)).toEqual(['gobbin', 'orbitot']);
    expect(p.sanctuary).toEqual([]);
    expect(withdraw(p, orb.uid)).toBe(false);
    // No room on a full team.
    for (let i = 0; i < 4; i++) recordSeal(p, 'fledjet', 5, 'wary');
    const spare = recordSeal(p, 'fledjet', 5, 'wary');
    expect(spare.where).toBe('sanctuary');
    expect(withdraw(p, spare.member.uid)).toBe(false);
  });
});

describe('options', () => {
  it('party mode defaults to squad, saves solo, and drops junk', () => {
    const p = newProgress('furnaxol');
    expect(partyMode(p)).toBe('squad');
    p.settings = { party: 'solo' };
    const back = parseProgress(JSON.parse(JSON.stringify(p)))!;
    expect(partyMode(back)).toBe('solo');
    const junk = { ...JSON.parse(JSON.stringify(p)), settings: { party: 'everyone' } };
    expect(partyMode(parseProgress(junk)!)).toBe('squad');
    expect('settings' in parseProgress(junk)!).toBe(false);
  });
});
