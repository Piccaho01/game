import { expect, test } from '@playwright/test';

type S = { wings(): string[]; busy(): boolean; buttonAt(n: string): { x: number; y: number } | null };

test('in the sanctuary hall, at the CRT stones, the first wing is restored with the bestiary points', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 25 points: the four bonded starters (20), a sealed Orbitot (4), a sighted Fledjet (1). Standing at the stones.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const rec = (r: object) => ({ encounters: 0, defeats: 0, seals: 0, strongBonds: 0, scans: 0, ...r });
    localStorage.setItem('patchlings.save.v1', JSON.stringify({
      version: 3, leader: 'nolan', nextUid: 6, sanctuary: [], wings: [],
      teams: {
        nolan: [{ uid: 1, species: 'sprigby', level: 8, bond: 'strong' }, { uid: 2, species: 'orbitot', level: 4, bond: 'steady' }],
        callum: [{ uid: 3, species: 'furnaxol', level: 8, bond: 'strong' }],
        haydon: [{ uid: 4, species: 'zapail', level: 8, bond: 'strong' }],
        dani: [{ uid: 5, species: 'gobbin', level: 8, bond: 'strong' }],
      },
      bestiary: {
        ...Object.fromEntries(['sprigby', 'furnaxol', 'zapail', 'gobbin'].map((s) => [s, rec({ encounters: 1, seals: 1, strongBonds: 1 })])),
        orbitot: rec({ seals: 1 }), fledjet: rec({ encounters: 1 }),
      },
      pos: { map: 'sanctuary_hall', x: 5, y: 0, dir: 'up' },
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

test('sanctuary storage: Callum deposits, Dani withdraws it onto her team', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  type St = S & { tab(): string; team(): string[]; storage(): string[] };
  const st = () => page.evaluate(() => {
    const s = (window as unknown as { __sanctuary: St }).__sanctuary;
    return { team: s.team(), storage: s.storage() };
  });
  const tap = async (name: string) => {
    const pt = await page.evaluate((n) => (window as unknown as { __sanctuary: S }).__sanctuary.buttonAt(n), name);
    expect(pt, `button ${name}`).not.toBeNull();
    await page.touchscreen.tap(pt!.x, pt!.y);
    await page.waitForTimeout(150);
  };
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('patchlings.save.v1', JSON.stringify({
      version: 3, leader: 'callum', nextUid: 8, wings: [], bestiary: {},
      teams: {
        callum: [{ uid: 1, species: 'furnaxol', level: 8, bond: 'strong' }, { uid: 5, species: 'orbitot', level: 5, bond: 'steady', hp: 3 }],
        nolan: [{ uid: 2, species: 'zapail', level: 8, bond: 'strong' }],
        haydon: [{ uid: 3, species: 'sprigby', level: 8, bond: 'strong' }],
        dani: [{ uid: 4, species: 'gobbin', level: 8, bond: 'strong' }],
      },
      sanctuary: [{ uid: 6, species: 'fledjet', level: 4, bond: 'wary' }, { uid: 7, species: 'orbitot', level: 3, bond: 'strong' }],
      pos: { map: 'sanctuary_hall', x: 5, y: 0, dir: 'up' },
    }));
  });
  await page.goto('/?seed=1');
  await page.waitForFunction(() => (window as unknown as { __overworld?: { ready(): boolean } }).__overworld?.ready(), null, { timeout: 60_000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !!(window as unknown as { __sanctuary?: S }).__sanctuary?.buttonAt('tab-storage'), null, { timeout: 30_000 });
  await tap('tab-storage');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'screens/15-sanctuary-storage.png' });
  await tap('team1');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'screens/16-sanctuary-storage-picked.png' });
  await tap('deposit');
  expect(await st()).toEqual({ team: ['furnaxol'], storage: ['fledjet', 'orbitot', 'orbitot'] });
  // The last one stays: DEPOSIT is switched off.
  await tap('team0');
  await tap('deposit');
  expect((await st()).team).toEqual(['furnaxol']);

  // Back out, SWITCH round to Dani, and she takes the Orbitot Callum left.
  await tap('back');
  await page.waitForFunction(() => (window as unknown as { __overworld?: { ready(): boolean } }).__overworld?.ready(), null, { timeout: 30_000 });
  for (let i = 0; i < 3; i++) {
    const pt = await page.evaluate(() => (window as unknown as { __overworld: S }).__overworld.buttonAt('switch'));
    await page.touchscreen.tap(pt!.x, pt!.y);
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !!(window as unknown as { __sanctuary?: S }).__sanctuary?.buttonAt('tab-storage'), null, { timeout: 30_000 });
  await tap('tab-storage');
  await tap('store2');
  await tap('withdraw');
  expect(await st()).toEqual({ team: ['gobbin', 'orbitot'], storage: ['fledjet', 'orbitot'] });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('patchlings.save.v1')!));
  expect(save.leader).toBe('dani');
  expect(save.teams.dani[1]).toEqual({ uid: 5, species: 'orbitot', level: 5, bond: 'steady' });
  expect(save.teams.callum.map((m: { species: string }) => m.species)).toEqual(['furnaxol']);
  expect(errors).toEqual([]);
});
