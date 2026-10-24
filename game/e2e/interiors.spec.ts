import { expect, test } from '@playwright/test';
import { ow, ready, tapKey, walkTo } from './walk';

type Ow = { ready(): boolean; talking(): boolean; npcs(): string[] };
const shot = (page: import('@playwright/test').Page, name: string) => page.screenshot({ path: `screens/${name}.png` });

test("into Callum's cottage and out, then into the sanctuary and PATCH's workshop", async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset&player=sprigby&seed=1');
  await ready(page);

  // The cottage's door is on its +x side: walk into it (left) from the door tile.
  await walkTo(page, 6, 17);
  await tapKey(page, 'left');
  expect(await ow(page)).toMatchObject({ map: 'callum_house', x: 6, y: 3 });
  await page.waitForTimeout(1900);
  await shot(page, '15-interior-cottage');
  // Read the Triple Cheese bag on the table.
  await walkTo(page, 3, 4);
  await tapKey(page, 'up');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as unknown as { __overworld: Ow }).__overworld.talking());
  await page.waitForTimeout(900);
  await shot(page, '16-interior-read');
  for (let i = 0; i < 6 && !(await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.ready())); i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
  }
  await ready(page);
  // Out through the open front, back on the door tile facing away.
  await walkTo(page, 6, 3);
  await tapKey(page, 'right');
  expect(await ow(page)).toEqual({ map: 'hollow_rest', x: 6, y: 17, dir: 'right' });

  // Up to the sanctuary steps and in.
  await walkTo(page, 6, 5);
  await tapKey(page, 'up');
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_hall', x: 4, y: 7 });
  await page.waitForTimeout(1900);
  await shot(page, '17-sanctuary-hall');
  // The rubble keeps Root Hall shut on a new game.
  expect(await page.evaluate(() => (window as unknown as { __overworld: { pathTo(x: number, y: number): unknown } }).__overworld.pathTo(6, 0))).toBeNull();
  // Through the left arch to PATCH's workshop.
  await walkTo(page, 0, 3);
  await tapKey(page, 'left');
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_workshop', x: 7, y: 3 });
  await page.waitForTimeout(1900);
  await shot(page, '18-sanctuary-workshop');
  // The place is saved: a reload comes back inside.
  await page.goto('/?seed=1');
  await ready(page);
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_workshop', x: 7, y: 3 });
  expect(errors).toEqual([]);
});

test('with Root Hall restored the rubble is gone and the old keeper has moved in', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('patchlings.save.v1', JSON.stringify({
      version: 2, leader: 'haydon', nextUid: 2, sanctuary: [], bestiary: {}, wings: ['root_hall'],
      team: [{ uid: 1, species: 'zapail', level: 8, bond: 'strong' }],
      pos: { map: 'sanctuary_hall', x: 4, y: 7, dir: 'up' },
    }));
  });
  await page.goto('/?seed=1');
  await ready(page);
  expect(await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.npcs())).toContain('elder');
  await page.waitForTimeout(1900);
  await shot(page, '19-sanctuary-hall-restored');
  await walkTo(page, 6, 0);
  await tapKey(page, 'up');
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_root_hall' });
  await page.waitForTimeout(1900);
  await shot(page, '20-sanctuary-root-hall');
  expect(errors).toEqual([]);
});
