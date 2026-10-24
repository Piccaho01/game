import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { castAfter, chatAt, checkScene, FRIENDS, OVERWORLD_SCENES, SCENES, speaker, type StageScene } from '../src/engine/cutscene';
import { parseProgress } from '../src/engine/progress';

const CARDS = readdirSync(new URL('../../art/cutscenes/out', import.meta.url)).map((f) => f.replace(/\.png$/, ''));

describe('story scenes', () => {
  it('every scene checks out: speakers, cards, cast, walks', () => {
    for (const id of Object.keys(SCENES)) expect(checkScene(id, CARDS), id).toEqual([]);
  });

  it('the opening runs the five cards in order, then hands off to the starter pick', () => {
    const s = SCENES.opening;
    expect(s.kind).toBe('cards');
    expect(s.steps.filter((st) => 'card' in st).map((st) => (st as { card: string }).card))
      .toEqual(['01_couch', '02_plan', '03_blowup', '04_landing', '05_starters']);
    expect(s.kind === 'cards' && s.then).toBe('starters');
  });

  it('every friend has a line in the opening (the comedy is the group)', () => {
    const who = new Set(SCENES.opening.steps.flatMap((st) => ('who' in st ? [st.who] : [])));
    for (const f of FRIENDS) expect(who).toContain(f);
  });

  it('speakers: the four from characters.json, PATCH and Connor from the scenes file', () => {
    expect(speaker('callum').name).toBe('Callum');
    expect(speaker('patch').name).toBe('PATCH');
    expect(speaker('connor').name).toBe('Connor');
    expect(() => speaker('bob' as never)).toThrow();
  });

  it('the first step ends with the four on their own tiles, around PATCH', () => {
    const end = castAfter(SCENES.first_step as StageScene);
    for (const f of FRIENDS) expect(end[f]).toBeDefined();
    expect(end.patch).toMatchObject({ x: 4, y: 5 });
  });

  it("Connor's hook starts by the town sign, once", () => {
    expect(chatAt('hollow_rest', 14, 17, [])).toBe('connor_hook');
    expect(chatAt('hollow_rest', 14, 17, ['connor_hook'])).toBeNull();
    expect(chatAt('hollow_rest', 6, 6, [])).toBeNull();
    expect(chatAt('route1', 14, 17, [])).toBeNull();
  });

  it('old saves (from before the story scenes) skip them; new ones keep what played', () => {
    const base = { version: 2, leader: 'callum', nextUid: 2, sanctuary: [], bestiary: {}, team: [{ uid: 1, species: 'sprigby', level: 5, bond: 'strong' }] };
    expect(parseProgress(base)!.story).toBeUndefined();
    expect(parseProgress({ ...base, story: ['first_step', 7] })!.story).toEqual(['first_step']);
    expect(OVERWORLD_SCENES).toEqual(['first_step', 'connor_hook']);
  });
});
