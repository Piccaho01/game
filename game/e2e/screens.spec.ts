import { expect, test, type Page } from '@playwright/test';

/**
 * Screenshots of every screen at phone size, saved to screens/ (CI uploads them with each run),
 * so a look change can be reviewed without opening the game.
 */
const DIR = 'screens';

type Hooks = { buttonAt(n: string): { x: number; y: number } | null };

async function tapOn(page: Page, hook: '__battle' | '__newgame' | '__journal', name: string) {
  const pt = await page.evaluate(([h, n]) => (window as unknown as Record<string, Hooks>)[h].buttonAt(n), [hook, name] as const);
  expect(pt, `button ${name}`).not.toBeNull();
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForTimeout(150);
}

const shot = (page: Page, name: string) => page.screenshot({ path: `${DIR}/${name}.png` });

test('screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?reset&seed=2');
  await page.waitForFunction(() => (window as unknown as { __newgame?: { step(): string } }).__newgame?.step() === 'leader', null, { timeout: 60_000 });
  await page.waitForTimeout(300);
  await shot(page, '01-newgame-patch');
  await tapOn(page, '__newgame', 'char-callum');
  await shot(page, '02-newgame-leader');
  await tapOn(page, '__newgame', 'confirm');
  await tapOn(page, '__newgame', 'starter-furnaxol');
  await shot(page, '03-newgame-starter');
  await tapOn(page, '__newgame', 'confirm');

  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  await shot(page, '04-battle-menu');
  await tapOn(page, '__battle', 'fight');
  await shot(page, '05-battle-fight');
  await tapOn(page, '__battle', 'move2');
  await page.waitForTimeout(400);
  await shot(page, '06-battle-message');
  await page.waitForFunction(() => ['menu', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });

  // Win quickly so the end screen and the Journal are reachable.
  for (let turn = 0; turn < 20 && (await page.evaluate(() => window.__battle.phase())) === 'menu'; turn++) {
    await tapOn(page, '__battle', 'fight');
    await tapOn(page, '__battle', 'move2');
    await page.waitForFunction(() => ['menu', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });
  }
  await shot(page, '07-battle-end');
  await tapOn(page, '__battle', 'journal');
  await page.waitForFunction(() => !!(window as unknown as { __journal?: unknown }).__journal);
  await page.waitForTimeout(200);
  await tapOn(page, '__journal', 'member0');
  await shot(page, '08-journal-team');
  await tapOn(page, '__journal', 'tab-bestiary');
  await tapOn(page, '__journal', 'dex-next');
  await tapOn(page, '__journal', 'dex-fledjet');
  await shot(page, '09-journal-bestiary');
  expect(errors).toEqual([]);
});
