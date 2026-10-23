import { expect, test } from '@playwright/test';

type S = { wings(): string[]; busy(): boolean; buttonAt(n: string): { x: number; y: number } | null };

test('at the sanctuary stones, the first wing is restored with the bestiary points', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 10 points: the bonded starter (5), a sealed Orbitot (4), a sighted Fledjet (1). Standing at the stones.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const rec = (r: object) => ({ encounters: 0, defeats: 0, seals: 0, strongBonds: 0, scans: 0, ...r });
    localStorage.setItem('patchlings.save.v1', JSON.stringify({
      version: 2, leader: 'nolan', nextUid: 3, sanctuary: [], wings: [],
      team: [{ uid: 1, species: 'sprigby', level: 8, bond: 'strong' }, { uid: 2, species: 'orbitot', level: 4, bond: 'steady' }],
      bestiary: { sprigby: rec({ encounters: 1, seals: 1, strongBonds: 1 }), orbitot: rec({ seals: 1 }), fledjet: rec({ encounters: 1 }) },
      pos: { map: 'hollow_rest', x: 5, y: 5, dir: 'up' },
    }));
  });
  await page.goto('/?seed=1');
  await page.waitForFunction(() => (window as unknown as { __overworld?: { ready(): boolean } }).__overworld?.ready(), null, { timeout: 60_000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !!(window as unknown as { __sanctuary?: S }).__sanctuary?.buttonAt('restore'), null, { timeout: 30_000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screens/13-sanctuary-ready.png' });
  const pt = await page.evaluate(() => (window as unknown as { __sanctuary: S }).__sanctuary.buttonAt('restore'));
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForFunction(() => (window as unknown as { __sanctuary: S }).__sanctuary.wings().includes('root_hall'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screens/14-sanctuary-restored.png' });
  for (let i = 0; i < 10 && (await page.evaluate(() => (window as unknown as { __sanctuary: S }).__sanctuary.busy())); i++) {
    await page.touchscreen.tap(195, 300);
    await page.waitForTimeout(300);
  }
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!));
  expect(save.wings).toEqual(['root_hall']);
  expect(errors).toEqual([]);
});
