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
  await page.goto('/?seed=3&player=furnaxol');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__battle.log())).toEqual(['A wild Sprigby appeared!', 'Go! Furnaxol!', 'Bestiary: Sprigby sighted. New entry!']);

  for (let turn = 0; turn < 20; turn++) {
    await tap(page, 'fight');
    await page.waitForFunction(() => window.__battle.phase() === 'fight');
    await tap(page, 'move2'); // Glassblow
    await page.waitForFunction(() => ['menu', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });
    if ((await page.evaluate(() => window.__battle.phase())) === 'over') break;
  }

  expect(await page.evaluate(() => window.__battle.outcome())).toBe('win');
  expect(await page.evaluate(() => window.__battle.log())).toContain('The wild Sprigby fainted!');
  expect(await page.evaluate(() => window.__battle.log())).toContain('Bestiary: Sprigby is now Tracked.');

  // The end screen offers the next fight.
  await tap(page, 'next');
  await page.waitForFunction(() => window.__battle.log()[0] === 'A wild Zapail appeared!', null, { timeout: 60_000 });

  // Progress is saved: after a reload Sprigby is already in the bestiary, so no new entry.
  await page.goto('/?seed=3');
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

test('a new game picks a leader and a starter, then the first battle starts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tapNew = async (name: string) => {
    const pt = await page.evaluate((n) => (window as unknown as { __newgame: { buttonAt(n: string): { x: number; y: number } | null } }).__newgame.buttonAt(n), name);
    expect(pt, `button ${name}`).not.toBeNull();
    await page.touchscreen.tap(pt!.x, pt!.y);
  };
  await page.goto('/?seed=2');
  await page.waitForFunction(() => (window as unknown as { __newgame?: { step(): string } }).__newgame?.step() === 'leader', null, { timeout: 60_000 });
  await tapNew('char-dani');
  await tapNew('confirm');
  await page.waitForFunction(() => (window as unknown as { __newgame: { step(): string } }).__newgame.step() === 'starter');
  await tapNew('starter-gobbin');
  await tapNew('confirm');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__battle.active())).toBe('Gobbin');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!));
  expect(save.leader).toBe('dani');
  expect(save.team[0].species).toBe('gobbin');
  expect(errors).toEqual([]);
});
