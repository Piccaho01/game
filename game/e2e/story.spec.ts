import { expect, test, type Page } from '@playwright/test';
import { ow, ready, storyNow as story, tapUntil, walkTo, walkUntilStory } from './walk';

type Cut = { id(): string; step(): number; card(): string; talking(): boolean; buttonAt(n: string): { x: number; y: number } | null };
type Ow = { story(): string | null; played(): string[] | undefined; ready(): boolean };
type NewGame = { step(): string; buttonAt(n: string): { x: number; y: number } | null };

const cut = <T>(page: Page, f: (c: Cut) => T) => page.evaluate(`(${f.toString()})(window.__cutscene)`) as Promise<T>;

async function tapNew(page: Page, name: string) {
  const pt = await page.evaluate((n) => (window as unknown as { __newgame: NewGame }).__newgame.buttonAt(n), name);
  expect(pt, `button ${name}`).not.toBeNull();
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForTimeout(150);
}

test('a new game opens on the story cards; taps move the lines on, SKIP goes to the pick', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset');
  await page.waitForFunction(() => (window as unknown as { __cutscene?: Cut }).__cutscene?.card() === '01_couch', null, { timeout: 60_000 });
  expect(await cut(page, (c) => c.id())).toBe('opening');
  await tapUntil(page, async () => (await cut(page, (c) => c.card())) === '02_plan');
  const pt = await cut(page, (c) => c.buttonAt('skip'));
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForFunction(() => (window as unknown as { __newgame?: NewGame }).__newgame?.step() === 'leader', null, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('after the pick: the first step plays on the map, then Connor pings the chat at the town sign', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset&seed=2&scene=opening');
  await page.waitForFunction(() => !!(window as unknown as { __cutscene?: Cut }).__cutscene?.buttonAt('skip'), null, { timeout: 60_000 });
  const pt = await cut(page, (c) => c.buttonAt('skip'));
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForFunction(() => (window as unknown as { __newgame?: NewGame }).__newgame?.step() === 'leader', null, { timeout: 30_000 });
  await tapNew(page, 'char-nolan');
  await tapNew(page, 'confirm');
  await tapNew(page, 'starter-zapail');
  await tapNew(page, 'confirm');

  await page.waitForFunction(() => (window as unknown as { __overworld?: Ow }).__overworld?.story() === 'first_step', null, { timeout: 60_000 });
  await tapUntil(page, async () => (await story(page)) === null);
  await ready(page);
  // Nolan, leading, stands where the scene left him.
  expect(await ow(page)).toEqual({ map: 'hollow_rest', x: 7, y: 7, dir: 'left' });

  // Down to the town sign: the chat pops up on its own.
  await walkUntilStory(page, 14, 16);
  await page.waitForFunction(() => (window as unknown as { __overworld: Ow }).__overworld.story() === 'connor_hook', null, { timeout: 10_000 });
  await tapUntil(page, async () => (await story(page)) === null);
  await ready(page);
  expect(await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.played())).toEqual(['first_step', 'connor_hook']);
  // Played once: walking on doesn't bring it back.
  const here = await ow(page);
  await walkTo(page, 14, 17);
  expect(await story(page)).toBeNull();
  expect(here.map).toBe('hollow_rest');
  expect(errors).toEqual([]);
});
