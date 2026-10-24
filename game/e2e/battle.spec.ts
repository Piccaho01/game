import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __battle: {
      phase(): string;
      outcome(): string | null;
      bond(): string | null;
      active(): string;
      log(): string[];
      hp(): { player: number; foe: number };
      buttonAt(name: string): { x: number; y: number } | null;
    };
  }
}

/** Taps a bottom-screen button with a real touch at its on-screen position. */
async function tap(page: Page, name: string) {
  const pt = await page.evaluate((n) => window.__battle.buttonAt(n), name);
  expect(pt, `button ${name}`).not.toBeNull();
  await page.touchscreen.tap(pt!.x, pt!.y);
}

test('boots on a phone and Furnaxol wins the placeholder battle', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=3&player=furnaxol&foe=sprigby');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  // Sprigby is Haydon's starter, so it's already in the bestiary: no new entry.
  expect(await page.evaluate(() => window.__battle.log())).toEqual(['A wild Sprigby appeared!', 'Go! Furnaxol!']);

  for (let turn = 0; turn < 20; turn++) {
    await tap(page, 'fight');
    await page.waitForFunction(() => window.__battle.phase() === 'fight');
    await tap(page, 'move2'); // Glassblow
    await page.waitForFunction(() => ['menu', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });
    if ((await page.evaluate(() => window.__battle.phase())) === 'over') break;
  }

  expect(await page.evaluate(() => window.__battle.outcome())).toBe('win');
  expect(await page.evaluate(() => window.__battle.log())).toContain('The wild Sprigby fainted!');

  // The end screen offers the next fight.
  await tap(page, 'next');
  await page.waitForFunction(() => window.__battle.log()[0] === 'A wild Zapail appeared!', null, { timeout: 60_000 });

  // Progress is saved: the defeat counts, and after a reload Callum's Furnaxol still leads.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!).bestiary.sprigby.defeats)).toBe(1);
  await page.goto('/?seed=3&foe=sprigby');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__battle.log())).toEqual(['A wild Sprigby appeared!', 'Go! Furnaxol!']);
  expect(errors).toEqual([]);
});

test('a seal with no taps breaks, and the wild Patchling gets its turn', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=4&foe=zapail&player=furnaxol');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  await tap(page, 'seal');
  await page.waitForFunction(() => window.__battle.phase() === 'sealing');
  await page.waitForFunction(() => window.__battle.phase() === 'menu', null, { timeout: 30_000 });
  const log = await page.evaluate(() => window.__battle.log());
  expect(log).toContain('Argh! The wild Zapail broke the seal!');
  expect(log.some((l) => l.startsWith('The wild Zapail used'))).toBe(true);
  expect(await page.evaluate(() => window.__battle.outcome())).toBeNull();
  expect(errors).toEqual([]);
});

test('switching: a voluntary switch, then a forced pick when the active Patchling faints', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // A weak two-Patchling team against a wild Furnaxol.
  await page.addInitScript(() => {
    localStorage.setItem('patchlings.save.v1', JSON.stringify({
      version: 1, nextUid: 3, sanctuary: [], bestiary: {},
      team: [{ uid: 1, species: 'sprigby', level: 2, bond: 'wary' }, { uid: 2, species: 'zapail', level: 2, bond: 'wary' }],
    }));
  });
  await page.goto('/?seed=5&foe=furnaxol');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__battle.active())).toBe('Sprigby');

  await tap(page, 'team');
  await page.waitForFunction(() => window.__battle.phase() === 'team');
  await tap(page, 'member1');
  await page.waitForFunction(() => ['menu', 'switching', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__battle.log())).toContain('Come back, Sprigby!');
  expect(await page.evaluate(() => window.__battle.active())).toBe('Zapail');

  // Fight on until Zapail faints and Sprigby has to come back in.
  for (let turn = 0; turn < 20; turn++) {
    const phase = await page.evaluate(() => window.__battle.phase());
    if (phase !== 'menu') break;
    await tap(page, 'fight');
    await page.waitForFunction(() => window.__battle.phase() === 'fight');
    await tap(page, 'move0');
    await page.waitForFunction(() => ['menu', 'switching', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });
  }
  expect(await page.evaluate(() => window.__battle.phase())).toBe('switching');
  await tap(page, 'member0');
  await page.waitForFunction(() => window.__battle.phase() === 'menu', null, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__battle.active())).toBe('Sprigby');
  expect(errors).toEqual([]);
});

test('a new game: a leader card, who takes which starter, who leads first, then out into Hollow Rest', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  type Ng = { step(): string; picks(): Record<string, string>; leader(): string | null; buttonAt(n: string): { x: number; y: number } | null };
  const tapNew = async (name: string) => {
    const pt = await page.evaluate((n) => (window as unknown as { __newgame: Ng }).__newgame.buttonAt(n), name);
    expect(pt, `button ${name}`).not.toBeNull();
    await page.touchscreen.tap(pt!.x, pt!.y);
    await page.waitForTimeout(100);
  };
  const step = () => page.evaluate(() => (window as unknown as { __newgame: Ng }).__newgame.step());
  await page.goto('/?seed=2&skipintro');
  await page.waitForFunction(() => (window as unknown as { __newgame?: Ng }).__newgame?.step() === 'leader', null, { timeout: 60_000 });
  await tapNew('char-dani');
  await tapNew('confirm');
  expect(await step()).toBe('starters');
  const picks = () => page.evaluate(() => (window as unknown as { __newgame: Ng }).__newgame.picks());
  expect(await picks()).toEqual({ haydon: 'sprigby', dani: 'gobbin', callum: 'furnaxol', nolan: 'zapail' });
  // Dani takes Furnaxol; Callum gets Dani's Gobbin. A friend tapped with no starter picked does nothing.
  await tapNew('friend-nolan');
  await tapNew('starter-furnaxol');
  await tapNew('friend-dani');
  expect(await picks()).toEqual({ haydon: 'sprigby', dani: 'furnaxol', callum: 'gobbin', nolan: 'zapail' });
  await tapNew('confirm');
  expect(await step()).toBe('lead');
  expect(await page.evaluate(() => (window as unknown as { __newgame: Ng }).__newgame.leader())).toBe('dani');
  await tapNew('lead-haydon');
  await tapNew('confirm');
  await page.waitForFunction(() => (window as unknown as { __overworld?: { ready(): boolean } }).__overworld?.ready(), null, { timeout: 60_000 });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!));
  expect(save.version).toBe(3);
  expect(save.leader).toBe('haydon');
  expect(Object.fromEntries(Object.entries(save.teams as Record<string, { species: string }[]>).map(([c, t]) => [c, t.map((m) => m.species)])))
    .toEqual({ callum: ['gobbin'], nolan: ['zapail'], haydon: ['sprigby'], dani: ['furnaxol'] });
  expect(errors).toEqual([]);
});

test("the leader's assist is free and once per battle (Callum's Scan)", async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=6&foe=orbitot&player=sprigby');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  await tap(page, 'assist');
  await page.waitForFunction(() => window.__battle.phase() === 'menu', null, { timeout: 30_000 });
  const log = await page.evaluate(() => window.__battle.log());
  expect(log).toContain('Callum scanned the wild Orbitot!');
  expect(log.some((l) => l.startsWith('Weak to: '))).toBe(true);
  expect(log).toContain('Bestiary: Orbitot is now Studied.');
  expect(log.some((l) => l.startsWith('The wild Orbitot used'))).toBe(false);
  // Used up: the button no longer answers.
  await tap(page, 'assist');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__battle.phase())).toBe('menu');
  expect(errors).toEqual([]);
});
