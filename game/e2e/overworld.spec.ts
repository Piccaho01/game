import { expect, test } from '@playwright/test';
import { ow, ready, tapKey, walkTo } from './walk';

type Pad = { padAt(): { x: number; y: number; reach: number } | null };

test('walk Hollow Rest with the D-pad and keys, off the island to Route 1, into tall grass and a wild battle, and back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // rate=1: every step in tall grass finds a Patchling.
  await page.goto('/?reset&player=sprigby&seed=1&rate=1');
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

  // A step along the upper terrace, then left into the tall grass at the island's edge.
  await walkTo(page, 1, 1);
  await page.keyboard.press('ArrowLeft');
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
  expect(pos).toMatchObject({ map: 'route1', x: 0, y: 1 });

  // The spot is saved: a reload comes back to it.
  await page.goto('/?seed=1');
  await ready(page);
  expect(await ow(page)).toEqual(pos);
  expect(errors).toEqual([]);
});
