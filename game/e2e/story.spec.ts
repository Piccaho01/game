import { expect, test } from '@playwright/test';
import { csPlaying, skipCutscene, tapThrough, walkUntilStory, type Cs } from './cutscene';
import { ow, ready, walkTo } from './walk';

type Ng = { step(): string; buttonAt(n: string): { x: number; y: number } | null };
type Ow = { story(): string | null; followers(): { id: string; visible: boolean }[]; ready(): boolean };
const SAVE = 'patchlings.save.v1';


test('a new game opens on the opening cutscene; SKIP goes to the starter pick', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset');
  await csPlaying(page, 'opening');
  // The owner's cards load (a wrong path would show the placeholder board instead).
  expect(await page.evaluate(() => (window as unknown as { __game: { textures: { exists(k: string): boolean } } }).__game.textures.exists('card:01_couch'))).toBe(true);
  // A few taps move it on, line by line.
  const vp = page.viewportSize()!;
  for (let i = 0; i < 4; i++) { await page.touchscreen.tap(vp.width / 2, vp.height * 0.8); await page.waitForTimeout(400); }
  expect(await page.evaluate(() => (window as unknown as { __cutscene: Cs }).__cutscene.step())).toBeGreaterThan(1);
  await skipCutscene(page, 'opening');
  await page.waitForFunction(() => (window as unknown as { __newgame?: Ng }).__newgame?.step() === 'starters', null, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('the whole opening plays through to the pick, then the friends react, then out into Hollow Rest', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tapNew = async (name: string) => {
    const pt = await page.evaluate((n) => (window as unknown as { __newgame: Ng }).__newgame.buttonAt(n), name);
    expect(pt, `button ${name}`).not.toBeNull();
    await page.touchscreen.tap(pt!.x, pt!.y);
    await page.waitForTimeout(150);
  };
  await page.goto('/?reset&seed=1');
  await tapThrough(page, 'opening', 400);
  await page.waitForFunction(() => (window as unknown as { __newgame?: Ng }).__newgame?.step() === 'starters', null, { timeout: 30_000 });
  await tapNew('confirm');
  await tapThrough(page, 'starters_picked');
  await page.waitForFunction(() => (window as unknown as { __newgame: Ng }).__newgame.step() === 'lead');
  await tapNew('lead-nolan');
  await tapNew('confirm');
  // Beat 6 plays on arrival: the four huddle round the leader.
  await csPlaying(page, 'first_step');
  expect(await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.story())).toBe('first_step');
  await tapThrough(page, 'first_step');
  await ready(page);
  let save = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), SAVE);
  expect(save.flags).toEqual(['first_step']);
  // Beat 7: Connor pings the group chat at the town sign.
  await walkUntilStory(page, 14, 16);
  await csPlaying(page, 'connor_hook');
  await tapThrough(page, 'connor_hook');
  await ready(page);
  save = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), SAVE);
  expect(save.flags).toEqual(['first_step', 'connor_hook', 'opening']);
  // Once only: walking about the sign again plays nothing.
  const at = await ow(page);
  await walkTo(page, at.x, at.y + 1);
  expect(await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.story())).toBeNull();
  expect(errors).toEqual([]);
});

test('story scenes show all four friends even in Solo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset&player=sprigby&seed=1');
  await ready(page);
  // Solo, and back before the first step.
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    s.settings = { party: 'solo' };
    s.flags = [];
    delete s.pos;
    localStorage.setItem(k, JSON.stringify(s));
  }, SAVE);
  await page.goto('/?seed=1');
  await csPlaying(page, 'first_step');
  const friends = await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.followers());
  expect(friends.map((f) => f.id).sort()).toEqual(['dani', 'haydon', 'nolan']);
  expect(friends.every((f) => f.visible)).toBe(true);
  await page.screenshot({ path: 'screens/12c-story-solo-huddle.png' });
  await skipCutscene(page, 'first_step');
  await ready(page);
  // Back to Solo after the scene.
  expect(await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.followers())).toEqual([]);
  expect(errors).toEqual([]);
});
