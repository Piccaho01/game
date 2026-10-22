import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __battle: {
      phase(): string;
      outcome(): string | null;
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
  await page.goto('/?seed=3');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
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
  expect(errors).toEqual([]);
});
