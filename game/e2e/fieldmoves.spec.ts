import { expect, test } from '@playwright/test';
import { ow, ready, tapKey, walkTo } from './walk';

type Ow = { obstacles(): string[]; talking(): boolean; ready(): boolean; pathTo(x: number, y: number): string[] | null; buttonAt(n: string): { x: number; y: number } | null };
const o = () => (window as unknown as { __overworld: Ow }).__overworld;

test('a boulder only Dani can shift: Callum gets a hint, Dani clears it and finds a scroll', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // The same shortcut inside the page, for page.evaluate.
  await page.addInitScript(() => { (window as unknown as { o: () => unknown }).o = () => (window as unknown as { __overworld: unknown }).__overworld; });
  await page.goto('/?reset&player=furnaxol&seed=1');
  await ready(page);
  expect(await page.evaluate(() => o().obstacles())).toContain('hollow_boulder');
  // Walk up beside the boulder (7,14) and face it.
  const spots: [number, number, string][] = [[8, 14, 'left'], [6, 14, 'right'], [7, 13, 'down'], [7, 15, 'up']];
  let face = '';
  for (const [x, y, d] of spots) {
    if (await page.evaluate(([px, py]) => o().pathTo(px, py) !== null, [x, y] as const)) { await walkTo(page, x, y); face = d; break; }
  }
  expect(face).not.toBe('');
  await tapKey(page, face);
  const read = async () => {
    for (let i = 0; i < 10 && !(await page.evaluate(() => o().ready())); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
  };
  await page.keyboard.press('Space');
  await page.waitForFunction(() => o().talking());
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'screens/05b-fieldmove-hint.png' });
  await read();
  expect(await page.evaluate(() => o().obstacles())).toContain('hollow_boulder');
  // SWITCH round to Dani (Callum -> Nolan -> Haydon -> Dani) and try again.
  for (let i = 0; i < 3; i++) {
    const pt = await page.evaluate(() => o().buttonAt('switch'));
    await page.touchscreen.tap(pt!.x, pt!.y);
    await page.waitForTimeout(250);
  }
  await page.keyboard.press('Space');
  await page.waitForFunction(() => o().talking());
  await read();
  await page.waitForFunction(() => !o().obstacles().includes('hollow_boulder'), null, { timeout: 10_000 });
  await read();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!));
  expect(save.cleared).toEqual(['hollow_boulder']);
  expect(save.items.gilded_scroll).toBe(1);
  expect(await ow(page)).toMatchObject({ map: 'hollow_rest' });
  expect(errors).toEqual([]);
});
