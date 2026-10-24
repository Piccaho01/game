import { expect, test } from '@playwright/test';
import { ow, ready as waitReady, tapKey, walkTo } from './walk';

type Ow = { ready(): boolean; talking(): boolean; npcs(): string[] };
const ready = () => (window as unknown as { __overworld?: Ow }).__overworld?.ready();

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
  await waitReady(page);
  const npcs = await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.npcs());
  expect(npcs).toEqual(expect.arrayContaining(['patch', 'nolan', 'haydon', 'dani']));
  expect(npcs).not.toContain('callum');

  // Up the hill to the sanctuary's steps, where PATCH stands guard, and face him.
  await walkTo(page, 5, 5);
  await tapKey(page, 'left');
  expect(await ow(page)).toEqual({ map: 'hollow_rest', x: 5, y: 5, dir: 'left' });

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
