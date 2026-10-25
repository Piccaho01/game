import { expect, test } from '@playwright/test';
import { ow, ready as waitReady, tapKey, walkTo } from './walk';

type Ow = { ready(): boolean; talking(): boolean; npcs(): string[]; leader(): string; followers(): { id: string; x: number; y: number; visible: boolean }[]; buttonAt(n: string): { x: number; y: number } | null };
const ready = () => (window as unknown as { __overworld?: Ow }).__overworld?.ready();

test('the other three follow the leader, and PATCH heals everyone', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // An old (v2) save: Callum leads; his Sprigby is hurt and burned.
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
  expect(npcs).toContain('patch');
  const followers = () => page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.followers());
  expect((await followers()).map((f) => f.id)).toEqual(['nolan', 'haydon', 'dani']);

  // Up the hill to the sanctuary's steps, where PATCH stands guard, and face him.
  await walkTo(page, 5, 5);
  // After a walk they're strung out behind, each next to the one ahead.
  const line = await followers();
  const chain = [{ x: 5, y: 5 }, ...line];
  line.forEach((f, i) => expect(Math.abs(f.x - chain[i].x) + Math.abs(f.y - chain[i].y)).toBeLessThanOrEqual(1));
  expect(line[0].visible).toBe(true);
  await tapKey(page, 'left');
  expect(await ow(page)).toEqual({ map: 'hollow_rest', x: 5, y: 5, dir: 'left' });

  await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as unknown as { __overworld: Ow }).__overworld.talking());
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'screens/12-patch-heal.png' });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!));
  expect(save.version).toBe(3);
  expect(save.teams.callum[0].hp).toBeUndefined();
  expect(save.teams.callum[0].status).toBeUndefined();
  // Read through the lines (each press finishes the typing, then moves on).
  for (let i = 0; i < 8 && !(await page.evaluate(ready)); i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(ready);
  expect(errors).toEqual([]);
});

test('SWITCH hands the lead to the next friend; their team battles', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset&player=sprigby&seed=1');
  await waitReady(page);
  const o = () => page.evaluate(() => {
    const w = (window as unknown as { __overworld: Ow }).__overworld;
    return { leader: w.leader(), followers: w.followers().map((f) => f.id) };
  });
  expect(await o()).toEqual({ leader: 'callum', followers: ['nolan', 'haydon', 'dani'] });
  await tapKey(page, 'right');
  await tapKey(page, 'right');
  const pt = await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.buttonAt('switch'));
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screens/04c-overworld-switch.png' });
  expect(await o()).toEqual({ leader: 'nolan', followers: ['haydon', 'dani', 'callum'] });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!));
  expect(save.leader).toBe('nolan');
  // Nolan's Zapail fights the next battle.
  await page.goto('/?foe=fledjet&seed=2');
  await page.waitForFunction(() => (window as unknown as { __battle?: { phase(): string } }).__battle?.phase() === 'menu', null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { __battle: { active(): string } }).__battle.active())).toBe('Zapail');
  expect(errors).toEqual([]);
});
