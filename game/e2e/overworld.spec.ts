import { expect, test, type Page } from '@playwright/test';

interface Pos { map: string; x: number; y: number; dir: string }
type Overworld = {
  pos(): Pos;
  ready(): boolean;
  padAt(): { x: number; y: number; reach: number } | null;
};
const ow = (page: Page) => page.evaluate(() => (window as unknown as { __overworld: Overworld }).__overworld.pos());
const ready = (page: Page) => page.waitForFunction(() => (window as unknown as { __overworld?: Overworld }).__overworld?.ready(), null, { timeout: 60_000 });

/** Holds a key until the leader's position matches. */
async function holdUntil(page: Page, key: string, done: (p: Pos) => boolean) {
  await page.keyboard.down(key);
  for (let i = 0; i < 100 && !done(await ow(page)); i++) await page.waitForTimeout(40);
  await page.keyboard.up(key);
  await ready(page);
  expect(done(await ow(page)), `after holding ${key}: ${JSON.stringify(await ow(page))}`).toBe(true);
}

/** One quick key tap is one step (or a turn when blocked). */
async function tapKey(page: Page, key: string) {
  const before = await ow(page);
  await page.keyboard.press(key);
  await page.waitForFunction((b) => {
    const o = (window as unknown as { __overworld: Overworld }).__overworld;
    const p = o.pos();
    return o.ready() && (p.x !== b.x || p.y !== b.y || p.dir !== b.dir || p.map !== b.map);
  }, before, { timeout: 5_000 }).catch(() => undefined);
  await ready(page);
}

test('walk Hollow Rest with the D-pad and keys, out to Route 1, into tall grass and a wild battle, and back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // rate=1: every step in tall grass finds a Patchling.
  await page.goto('/?reset&player=sprigby&seed=1&rate=1');
  await ready(page);
  expect(await ow(page)).toEqual({ map: 'hollow_rest', x: 10, y: 13, dir: 'down' });

  // The touch D-pad: hold the down arm for one step.
  const pad = await page.evaluate(() => (window as unknown as { __overworld: Overworld }).__overworld.padAt());
  expect(pad).not.toBeNull();
  await page.mouse.move(pad!.x, pad!.y + pad!.reach);
  await page.mouse.down();
  await page.waitForFunction(() => (window as unknown as { __overworld: Overworld }).__overworld.pos().y >= 14);
  await page.mouse.up();
  await ready(page);

  // Keys: hold down off the bottom of the village onto Route 1 (it may walk on a step or two).
  await holdUntil(page, 'ArrowDown', (p) => p.map === 'route1');
  // Single taps: back up to the top row, left along it, then down into the tall grass.
  while ((await ow(page)).y > 1) await tapKey(page, 'ArrowUp');
  for (let i = 0; i < 5; i++) await tapKey(page, 'ArrowLeft');
  expect(await ow(page)).toMatchObject({ map: 'route1', x: 5, y: 1 });
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  const foe = await page.evaluate(() => (window as unknown as { __battle: { foe(): { species: string; level: number } } }).__battle.foe());
  expect(['orbitot', 'fledjet']).toContain(foe.species);
  expect(foe.level).toBeGreaterThanOrEqual(3);
  expect(foe.level).toBeLessThanOrEqual(5);

  for (let turn = 0; turn < 20 && (await page.evaluate(() => window.__battle.phase())) === 'menu'; turn++) {
    const tap = async (name: string) => {
      const pt = await page.evaluate((n) => window.__battle.buttonAt(n), name);
      await page.touchscreen.tap(pt!.x, pt!.y);
    };
    await tap('fight');
    await page.waitForFunction(() => window.__battle.phase() === 'fight');
    await tap('move0');
    await page.waitForFunction(() => ['menu', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });
  }
  expect(await page.evaluate(() => window.__battle.phase())).toBe('over');
  const where = await page.evaluate(() => window.__battle.buttonAt('continue'));
  await page.touchscreen.tap(where!.x, where!.y);
  await ready(page);
  const pos = await ow(page);
  expect(pos.map).toBe('route1');
  expect(pos.y).toBe(2);

  // The spot is saved: a reload comes back to it.
  await page.goto('/?seed=1');
  await ready(page);
  expect(await ow(page)).toEqual(pos);
  expect(errors).toEqual([]);
});
