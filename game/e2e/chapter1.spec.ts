import { expect, test, type Page } from '@playwright/test';
import { ready } from './walk';

/**
 * Chapter 1 (finish Route 1): the storm quest end to end with real taps, Wardeye in the rain,
 * shiny and Prototype battles, the new hall, and screenshots of each (screens/30-*.png).
 */
const DIR = 'screens';
const KEY = 'patchlings.save.v1';
const shot = (page: Page, name: string) => page.screenshot({ path: `${DIR}/${name}.png` });
type Ow = { buttonAt(n: string): { x: number; y: number } | null; talking(): boolean; story(): string | null; ready(): boolean; weather(): string | null; obstacles(): string[] };
const owv = <T>(page: Page, f: (o: Ow) => T) => page.evaluate(f as never) as Promise<T>;

async function edit(page: Page, f: (p: Record<string, any>) => void) {
  const p = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
  f(p);
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, p] as const);
  await page.goto('/');
  await ready(page);
}

async function pressA(page: Page) {
  const pt = await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.buttonAt('a'));
  await page.touchscreen.tap(pt!.x, pt!.y);
}

/** Taps through whatever is being said or played until the map is free again. */
async function tapThrough(page: Page, max = 120) {
  for (let i = 0; i < max; i++) {
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => { const o = (window as unknown as { __overworld: Ow }).__overworld; return { r: o.ready(), t: o.talking(), s: o.story() }; });
    if (st.r && !st.t && !st.s) return;
    await page.touchscreen.tap(195, 700);
  }
}

test('chapter 1: the storm quest brings the rain back and Wardeye waits at the rod', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset&player=gobbin&seed=4');
  await ready(page);
  // At the rod: first look sights Wardeye; then Callum scans it.
  await edit(page, (p) => { p.pos = { map: 'route1', x: 2, y: 5, dir: 'left' }; p.leader = 'callum'; });
  await shot(page, '30-route1-rod');
  await pressA(page); await tapThrough(page);
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).bestiary.wardeye?.encounters, KEY)).toBe(1);
  await pressA(page); await tapThrough(page);
  // Haydon taunts the clerk.
  await edit(page, (p) => { p.pos = { map: 'route1', x: 3, y: 3, dir: 'left' }; p.leader = 'haydon'; });
  await pressA(page); await tapThrough(page);
  // Nolan frees the rod: the storm.
  await edit(page, (p) => { p.pos = { map: 'route1', x: 2, y: 2, dir: 'left' }; p.leader = 'nolan'; });
  await pressA(page); await tapThrough(page, 200);
  const save = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
  expect(save.cleared).toEqual(expect.arrayContaining(['r1_rod_plate', 'r1_clerk', 'r1_clamp']));
  expect(save.flags).toContain('storm_returned');
  expect(save.items.storm_shard).toBe(1);
  expect(await owv(page, () => (window as unknown as { __overworld: Ow }).__overworld.weather())).toBe('rain');
  await shot(page, '31-route1-rain');
  // Wardeye in the rain: talk to the rod, into battle.
  await edit(page, (p) => { p.pos = { map: 'route1', x: 2, y: 5, dir: 'left' }; });
  await pressA(page);
  for (let i = 0; i < 40 && !(await page.evaluate(() => !!(window as unknown as { __battle?: unknown }).__battle)); i++) { await page.touchscreen.tap(195, 700); await page.waitForTimeout(250); }
  await page.waitForFunction(() => (window as unknown as { __battle?: { phase(): string } }).__battle?.phase() === 'menu', null, { timeout: 30_000 });
  const foe = await page.evaluate(() => (window as unknown as { __battle: { foe(): { species: string }; weather(): string } }).__battle);
  expect(await page.evaluate(() => (window as unknown as { __battle: { foe(): { species: string } } }).__battle.foe().species)).toBe('wardeye');
  expect(await page.evaluate(() => (window as unknown as { __battle: { weather(): string } }).__battle.weather())).toBe('rain');
  void foe;
  await shot(page, '32-wardeye-battle');
  expect(errors).toEqual([]);
});

test('chapter 1: shiny, Prototype, the new Patchlings and the hall render', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset&player=gobbin');
  await ready(page);
  for (const [q, name] of [['foe=voltcalf&weather=rain', '33-voltcalf-rain'], ['foe=voltaurus&variant=shiny&level=20', '34-shiny-voltaurus'], ['foe=harrowjaw&variant=prototype&level=40', '35-prototype-harrowjaw']] as const) {
    await page.goto(`/?${q}&seed=3`);
    await page.waitForFunction(() => (window as unknown as { __battle?: { phase(): string } }).__battle?.phase() === 'menu', null, { timeout: 30_000 });
    await page.waitForTimeout(400);
    await shot(page, name);
  }
  await page.goto('/');
  await ready(page);
  await edit(page, (p) => { p.pos = { map: 'sanctuary_hall', x: 3, y: 5, dir: 'up' }; });
  await shot(page, '36-hall');
  expect(errors).toEqual([]);
});
