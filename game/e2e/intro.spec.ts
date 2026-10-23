import { expect, test } from '@playwright/test';

type Intro = { part(): string; buttonAt(n: string): { x: number; y: number } | null };

test('a new game opens on the intro, and SKIP goes to the leader pick', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset');
  await page.waitForFunction(() => (window as unknown as { __intro?: Intro }).__intro?.part() === 'chat', null, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  const pt = await page.evaluate(() => (window as unknown as { __intro: Intro }).__intro.buttonAt('skip'));
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForFunction(() => (window as unknown as { __newgame?: { step(): string } }).__newgame?.step() === 'leader', null, { timeout: 30_000 });
  expect(errors).toEqual([]);
});
