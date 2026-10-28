import { expect, test, type Page } from '@playwright/test';
import { ow, ready, tapKey, walkTo } from './walk';

type Ow = { obstacles(): string[]; talking(): boolean; ready(): boolean; leader(): string; pathTo(x: number, y: number): string[] | null; buttonAt(n: string): { x: number; y: number } | null };
const o = () => (window as unknown as { __overworld: Ow }).__overworld;

const read = async (page: Page) => {
  for (let i = 0; i < 40 && !(await page.evaluate(() => o().ready() && !o().talking())); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(280); }
  await ready(page);
};
const obstacles = (page: Page) => page.evaluate(() => o().obstacles());
const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!));
const switchTo = async (page: Page, who: string) => {
  for (let i = 0; i < 4 && (await page.evaluate(() => o().leader())) !== who; i++) {
    const pt = await page.evaluate(() => o().buttonAt('switch'));
    await page.touchscreen.tap(pt!.x, pt!.y);
    await page.waitForTimeout(300);
  }
  expect(await page.evaluate(() => o().leader())).toBe(who);
};
/** Walk to the first reachable neighbour of (tx,ty) and face it. */
const faceTile = async (page: Page, tx: number, ty: number, prefer: [number, number, string][]) => {
  const spots: [number, number, string][] = [...prefer, [tx + 1, ty, 'left'], [tx - 1, ty, 'right'], [tx, ty - 1, 'down'], [tx, ty + 1, 'up']];
  for (const [x, y, d] of spots) {
    if (await page.evaluate(([px, py]) => o().pathTo(px, py) !== null, [x, y] as const)) { await walkTo(page, x, y); await tapKey(page, d); return; }
  }
  throw new Error(`no reachable neighbour of ${tx},${ty}`);
};
const interact = async (page: Page) => {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => o().talking(), null, { timeout: 10_000 });
  await page.waitForTimeout(700);
};

test('Route 1 field moves: stone (Callum), bridge (Nolan), officer (Haydon)', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { (window as unknown as { o: () => unknown }).o = () => (window as unknown as { __overworld: unknown }).__overworld; });
  await page.goto('/?reset&player=furnaxol&seed=1');
  await ready(page);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('patchlings.save.v1')!);
    s.pos = { map: 'route1', x: 2, y: 0, dir: 'down' };
    localStorage.setItem('patchlings.save.v1', JSON.stringify(s));
  });
  await page.goto('/?seed=1&rate=0');
  await ready(page);
  expect(await ow(page)).toMatchObject({ map: 'route1' });
  expect(await page.evaluate(() => o().leader())).toBe('callum');
  expect(await obstacles(page)).toEqual(expect.arrayContaining(['route1_bridge', 'route1_officer', 'route1_stone']));

  const start = (await save(page)).items;
  // 1. Callum reads the stone.
  await faceTile(page, 2, 8, []);
  await interact(page);
  await read(page);
  await page.waitForFunction(() => !o().obstacles().includes('route1_stone'), null, { timeout: 10_000 });
  expect((await save(page)).items.echo_scroll).toBe((start.echo_scroll ?? 0) + 2); // reward is +2 on top of the starting bag

  // 2. Bridge: Callum is blocked, Nolan fixes it.
  await faceTile(page, 13, 9, [[12, 9, 'right']]);
  expect(await ow(page)).toMatchObject({ x: 12, y: 9 });
  await interact(page);
  await page.screenshot({ path: 'screens/05c-route1-bridge-broken.png' });
  await read(page);
  expect(await obstacles(page)).toContain('route1_bridge');
  await switchTo(page, 'nolan');
  await interact(page);
  await read(page);
  await page.waitForFunction(() => !o().obstacles().includes('route1_bridge'), null, { timeout: 10_000 });
  await read(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screens/05d-route1-bridge-fixed.png' });

  // 3. Officer: Nolan is blocked, Haydon baits him away.
  await faceTile(page, 17, 8, [[16, 8, 'right']]);
  expect(await ow(page)).toMatchObject({ x: 17, y: 8 });
  await interact(page);
  await page.screenshot({ path: 'screens/05e-route1-officer.png' });
  await read(page);
  expect(await obstacles(page)).toContain('route1_officer');
  await switchTo(page, 'haydon');
  await interact(page);
  await read(page);
  await page.waitForFunction(() => !o().obstacles().includes('route1_officer'), null, { timeout: 10_000 });
  await read(page);
  const s = await save(page);
  expect(s.items.rain_check_scroll).toBe((start.rain_check_scroll ?? 0) + 2);
  expect(s.cleared).toEqual(expect.arrayContaining(['route1_stone', 'route1_bridge', 'route1_officer']));
  await walkTo(page, 18, 17);

  expect(errors).toEqual([]);
});
