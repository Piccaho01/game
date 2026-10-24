import { expect, test } from '@playwright/test';
import { ow, ready, tapKey, walkTo } from './walk';

type Pad = { padAt(): { x: number; y: number; reach: number } | null };

test('walk Hollow Rest with the D-pad and keys, off the island to Route 1, into tall grass and a wild battle, and back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // rate=0 on the way; rate=1 for the last step: every step in tall grass then finds a Patchling.
  await page.goto('/?reset&player=sprigby&seed=1&rate=0');
  await ready(page);
  const start = await ow(page);
  expect(start).toMatchObject({ map: 'hollow_rest' });

  // The isometric D-pad: hold the down-left arm (the grid's +y) for one step.
  const pad = await page.evaluate(() => (window as unknown as { __overworld: Pad }).__overworld.padAt());
  expect(pad).not.toBeNull();
  await page.mouse.move(pad!.x - pad!.reach * 0.7, pad!.y + pad!.reach * 0.7);
  await page.mouse.down();
  await page.waitForFunction((y0) => (window as unknown as { __overworld: { pos(): { y: number } } }).__overworld.pos().y > y0, start.y);
  await page.mouse.up();
  await ready(page);
  expect(await ow(page)).toMatchObject({ x: start.x, y: start.y + 1 });

  // Keys: down the stairs cut into the island's front cliff, onto Route 1.
  await walkTo(page, 17, 19);
  await tapKey(page, 'right');
  expect(await ow(page)).toMatchObject({ map: 'route1' });
  await page.waitForTimeout(1900);
  await page.screenshot({ path: 'screens/21-route1.png' });

  // Down the path to a patch of tall grass, then a step into it (from its left).
  type P = { pathTo(x: number, y: number): string[] | null; setRate(r: number | null): void };
  let target: [number, number] | null = null;
  for (const [x, y] of [[13, 11], [12, 15], [3, 4], [11, 16]] as const) {
    const near = await page.evaluate(([tx, ty]) => (window as unknown as { __overworld: P }).__overworld.pathTo(tx, ty), [x - 1, y] as const);
    if (near) { target = [x, y]; break; }
  }
  expect(target).not.toBeNull();
  await walkTo(page, target![0] - 1, target![1]);
  await page.evaluate(() => (window as unknown as { __overworld: P }).__overworld.setRate(1));
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  const foe = await page.evaluate(() => (window as unknown as { __battle: { foe(): { species: string; level: number } } }).__battle.foe());
  expect(['orbitot', 'fledjet']).toContain(foe.species);

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
  expect(pos).toMatchObject({ map: 'route1', x: target![0], y: target![1] });

  // The spot is saved: a reload comes back to it.
  await page.goto('/?seed=1');
  await ready(page);
  expect(await ow(page)).toEqual(pos);
  expect(errors).toEqual([]);
});
