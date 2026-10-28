import { expect, test, type Page } from '@playwright/test';
import { ow, ready, tapKey, walkTo } from './walk';

type Ow = { talking(): boolean; npcs(): string[] };
const talking = (page: Page) => page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.talking());

/** Reads what's in front with A, and taps through the lines. */
async function read(page: Page) {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as unknown as { __overworld: Ow }).__overworld.talking(), null, { timeout: 5_000 });
  for (let i = 0; i < 12 && (await talking(page)); i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(250);
  }
  await ready(page);
}

test('into Callum\'s cottage and back out; into the sanctuary, the storage terminal, PATCH\'s workshop, and out', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset&player=furnaxol&seed=1');
  await ready(page);

  // The cottage: walk up to its red door and in.
  await walkTo(page, 6, 17);
  await tapKey(page, 'left');
  expect(await ow(page)).toMatchObject({ map: 'callum_house', x: 5, y: 6, dir: 'up' });
  // The Triple Cheese on the table.
  await walkTo(page, 4, 1);
  await tapKey(page, 'down');
  await read(page);
  // Out through the front, back on the doorstep facing away from the door.
  await walkTo(page, 5, 6);
  await tapKey(page, 'down');
  expect(await ow(page)).toMatchObject({ map: 'hollow_rest', x: 6, y: 17, dir: 'right' });

  // Up the hill and into the sanctuary.
  await walkTo(page, 5, 5);
  await tapKey(page, 'up');
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_hall', x: 3, y: 6 });
  // The storage terminal opens the sanctuary's STORAGE tab; BACK returns here.
  await walkTo(page, 3, 1);
  await tapKey(page, 'up');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as unknown as { __sanctuary?: { tab(): string } }).__sanctuary?.tab() === 'storage', null, { timeout: 30_000 });
  const back = await page.evaluate(() => (window as unknown as { __sanctuary: { buttonAt(n: string): { x: number; y: number } | null } }).__sanctuary.buttonAt('back'));
  await page.touchscreen.tap(back!.x, back!.y);
  await ready(page);
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_hall', x: 3, y: 1 });
  // Root Hall is behind rubble: walking at it doesn't go anywhere.
  await walkTo(page, 1, 1);
  await tapKey(page, 'up');
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_hall', x: 1, y: 1 });
  // PATCH's workshop, through the doorway in the left wall, and back.
  await walkTo(page, 0, 1);
  await tapKey(page, 'left');
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_workshop' });
  await tapKey(page, 'down');
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_hall', x: 0, y: 1 });
  // And out into Hollow Rest, by PATCH.
  await walkTo(page, 3, 6);
  await tapKey(page, 'down');
  expect(await ow(page)).toMatchObject({ map: 'hollow_rest', x: 5, y: 5, dir: 'down' });
  expect(errors).toEqual([]);
});

test('once Root Hall is restored the rubble is gone, the old keeper visits, and stored Patchlings roam', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('patchlings.save.v1', JSON.stringify({
      version: 3, leader: 'callum', nextUid: 9, wings: ['root_hall'], bestiary: {},
      teams: {
        callum: [{ uid: 1, species: 'furnaxol', level: 8, bond: 'strong' }], nolan: [{ uid: 2, species: 'zapail', level: 8, bond: 'strong' }],
        haydon: [{ uid: 3, species: 'sprigby', level: 8, bond: 'strong' }], dani: [{ uid: 4, species: 'gobbin', level: 8, bond: 'strong' }],
      },
      sanctuary: [{ uid: 5, species: 'sprigby', level: 5, bond: 'steady' }, { uid: 6, species: 'zapail', level: 4, bond: 'wary' }],
      pos: { map: 'sanctuary_hall', x: 3, y: 6, dir: 'up' },
    }));
  });
  await page.goto('/?seed=1');
  await ready(page);
  const npcs = () => page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.npcs());
  expect((await npcs()).filter((n) => n.startsWith('roam:'))).toHaveLength(2);
  await walkTo(page, 1, 0);
  await tapKey(page, 'up');
  expect(await ow(page)).toMatchObject({ map: 'sanctuary_roots' });
  expect(await npcs()).toContain('elder');
  expect(errors).toEqual([]);
});
