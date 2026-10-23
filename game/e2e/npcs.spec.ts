import { expect, test, type Page } from '@playwright/test';

type Ow = { pos(): { map: string; x: number; y: number; dir: string }; ready(): boolean; talking(): boolean; npcs(): string[] };
const ow = (page: Page) => page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.pos());
const ready = () => (window as unknown as { __overworld?: Ow }).__overworld?.ready();

async function tapKey(page: Page, key: string) {
  const before = await ow(page);
  await page.keyboard.press(key);
  await page.waitForFunction((b) => {
    const o = (window as unknown as { __overworld: Ow }).__overworld;
    const p = o.pos();
    return o.ready() && (p.x !== b.x || p.y !== b.y || p.dir !== b.dir);
  }, before, { timeout: 5_000 }).catch(() => undefined);
  await page.waitForFunction(ready, null, { timeout: 10_000 });
}

test('the friends wait at the sanctuary, and PATCH heals the team', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Callum leads; his Sprigby is hurt and burned.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('patchlings.save.v1', JSON.stringify({
      version: 2, leader: 'callum', nextUid: 2, sanctuary: [], bestiary: {},
      team: [{ uid: 1, species: 'sprigby', level: 8, bond: 'strong', hp: 3, status: 'brn' }],
    }));
  });
  await page.goto('/?seed=1');
  await page.waitForFunction(ready, null, { timeout: 60_000 });
  const npcs = await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.npcs());
  expect(npcs).toEqual(expect.arrayContaining(['patch', 'nolan', 'haydon', 'dani']));
  expect(npcs).not.toContain('callum');

  // Up the path into the sanctuary, right to stand under PATCH, face him.
  while ((await ow(page)).y > 3) await tapKey(page, 'ArrowUp');
  while ((await ow(page)).x < 13) await tapKey(page, 'ArrowRight');
  await tapKey(page, 'ArrowUp');
  expect(await ow(page)).toEqual({ map: 'hollow_rest', x: 13, y: 3, dir: 'up' });

  await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as unknown as { __overworld: Ow }).__overworld.talking());
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'screens/12-patch-heal.png' });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!));
  expect(save.team[0].hp).toBeUndefined();
  expect(save.team[0].status).toBeUndefined();
  // Read through the lines (each press finishes the typing, then moves on).
  for (let i = 0; i < 8 && !(await page.evaluate(ready)); i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(ready);
  expect(errors).toEqual([]);
});
