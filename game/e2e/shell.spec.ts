import { expect, test, type Page } from '@playwright/test';
import { csPlaying } from './cutscene';
import { ow, ready, tapKey, walkTo } from './walk';

/** The game shell (M6): title screen, pause menu, evolve scene, blackout. */
type Hook = '__title' | '__pause' | '__evolve' | '__overworld' | '__battle';
type Pt = { x: number; y: number } | null;

const SAVE = 'patchlings.save.v1';
const scenes = (page: Page) => page.evaluate(() => (window as unknown as { __game: { scene: { getScenes(a: boolean): { scene: { key: string } }[] } } }).__game.scene.getScenes(true).map((s) => s.scene.key));
const sceneActive = (page: Page, key: string) => page.waitForFunction((k) => (window as unknown as { __game?: { scene: { getScenes(a: boolean): { scene: { key: string } }[] } } }).__game?.scene.getScenes(true).some((s) => s.scene.key === k), key, { timeout: 60_000 });
const sceneGone = (page: Page, key: string) => page.waitForFunction((k) => !(window as unknown as { __game: { scene: { getScenes(a: boolean): { scene: { key: string } }[] } } }).__game.scene.getScenes(true).some((s) => s.scene.key === k), key, { timeout: 30_000 });
const waitView = (page: Page, hook: '__title' | '__pause', v: string) => page.waitForFunction(([h, want]) => (window as unknown as Record<string, { view(): string } | undefined>)[h]?.view() === want, [hook, v] as const, { timeout: 30_000 });
const local = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const saveOf = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), SAVE);

/** Waits for a button to exist, then taps it with a real touch. */
async function tapBtn(page: Page, hook: Hook, name: string) {
  await page.waitForFunction(([h, n]) => !!(window as unknown as Record<string, { buttonAt(n: string): Pt } | undefined>)[h]?.buttonAt(n), [hook, name] as const, { timeout: 30_000 });
  const pt = await page.evaluate(([h, n]) => (window as unknown as Record<string, { buttonAt(n: string): Pt }>)[h].buttonAt(n), [hook, name] as const);
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForTimeout(150);
}
const buttonAt = (page: Page, hook: Hook, name: string) => page.evaluate(([h, n]) => (window as unknown as Record<string, { buttonAt(n: string): Pt }>)[h].buttonAt(n), [hook, name] as const);
const tapMid = async (page: Page) => { const vp = page.viewportSize()!; await page.touchscreen.tap(vp.width / 2, vp.height / 2); await page.waitForTimeout(150); };

async function newSave(page: Page, player: string) {
  await page.goto(`/?reset&player=${player}&seed=1`);
  await ready(page);
}

test('title with a save: press, menu, new-game confirm, settings, continue', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await newSave(page, 'gobbin');
  await page.goto('/?title');
  await waitView(page, '__title', 'press');
  await tapMid(page);
  await waitView(page, '__title', 'menu');
  expect(await buttonAt(page, '__title', 'continue')).not.toBeNull();

  await tapBtn(page, '__title', 'new-game');
  await waitView(page, '__title', 'confirm');
  await tapBtn(page, '__title', 'cancel-new');
  await waitView(page, '__title', 'menu');
  expect(await local(page, SAVE)).not.toBeNull();

  await tapBtn(page, '__title', 'settings');
  await waitView(page, '__title', 'settings');
  await tapBtn(page, '__title', 'opt-speed-fast');
  expect(await local(page, 'patchlings.textSpeed')).toBe('fast');
  await tapBtn(page, '__title', 'back');
  await waitView(page, '__title', 'menu');

  await tapBtn(page, '__title', 'continue');
  await ready(page);
  expect((await scenes(page))).toContain('overworld');
  expect(errors).toEqual([]);
});

test('title without a save: no CONTINUE; NEW GAME starts the intro', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?reset&title');
  await waitView(page, '__title', 'press');
  await tapMid(page);
  await waitView(page, '__title', 'menu');
  expect(await buttonAt(page, '__title', 'continue')).toBeNull();
  await tapBtn(page, '__title', 'new-game');
  await csPlaying(page, 'opening');
  expect(errors).toEqual([]);
});

test('title new game over a save: ERASE AND START OVER wipes it and starts the intro', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await newSave(page, 'gobbin');
  expect(await local(page, SAVE)).not.toBeNull();
  await page.goto('/?title');
  await waitView(page, '__title', 'press');
  await tapMid(page);
  await waitView(page, '__title', 'menu');
  await tapBtn(page, '__title', 'new-game');
  await waitView(page, '__title', 'confirm');
  await tapBtn(page, '__title', 'confirm-new');
  await csPlaying(page, 'opening');
  expect(await local(page, SAVE)).toBeNull();
  expect(errors).toEqual([]);
});

test('pause menu: settings, solo, Escape, quit to title', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await newSave(page, 'sprigby');
  const followers = () => page.evaluate(() => (window as unknown as { __overworld: { followers(): { visible: boolean }[] } }).__overworld.followers());
  expect((await followers()).every((f) => f.visible)).toBe(true);

  await tapBtn(page, '__overworld', 'menu');
  await sceneActive(page, 'pause');
  await waitView(page, '__pause', 'menu');
  await tapBtn(page, '__pause', 'settings');
  await waitView(page, '__pause', 'settings');
  await tapBtn(page, '__pause', 'opt-solo');
  expect(await local(page, 'patchlings.party')).toBe('solo');
  await tapBtn(page, '__pause', 'back');
  await waitView(page, '__pause', 'menu');
  await tapBtn(page, '__pause', 'resume');
  await sceneGone(page, 'pause');
  await ready(page);
  await page.waitForTimeout(300);

  // Escape opens it, Escape closes it.
  await page.keyboard.press('Escape');
  await sceneActive(page, 'pause');
  await waitView(page, '__pause', 'menu');
  await page.keyboard.press('Escape');
  await sceneGone(page, 'pause');
  expect(await scenes(page)).toContain('overworld');

  // QUIT TO TITLE.
  await tapBtn(page, '__overworld', 'menu');
  await sceneActive(page, 'pause');
  await tapBtn(page, '__pause', 'title');
  await sceneActive(page, 'title');
  await waitView(page, '__title', 'press');
  expect(await scenes(page)).not.toContain('pause');
  expect(errors).toEqual([]);
});

/** Taps the top screen (to move dialogue on) until the evolve scene reaches `step`. */
async function evolveUntil(page: Page, step: string, ms = 30_000) {
  const vp = page.viewportSize()!;
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if ((await page.evaluate(() => (window as unknown as { __evolve?: { step(): string } }).__evolve?.step())) === step) return;
    await page.touchscreen.tap(vp.width / 2, vp.height * 0.2);
    await page.waitForTimeout(250);
  }
  throw new Error(`evolve did not reach ${step}`);
}

test('evolve preview: plays to done and continues to the overworld; STOP holds it back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await newSave(page, 'furnaxol');
  const before = await local(page, SAVE);
  await page.goto('/?evolve=furnaxol');
  await evolveUntil(page, 'done');
  await tapBtn(page, '__evolve', 'continue');
  await ready(page);
  expect(await local(page, SAVE)).toBe(before); // a preview touches no save

  await newSave(page, 'gobbin');
  await page.goto('/?evolve=gobbin');
  await tapBtn(page, '__evolve', 'stop');
  await evolveUntil(page, 'stopped');
  expect(await page.evaluate(() => (window as unknown as { __evolve: { queue(): number } }).__evolve.queue())).toBe(1);
  expect(errors).toEqual([]);
});

/** Edits the save in place: `fn` gets the parsed progress. */
async function editSave(page: Page, fn: (s: any) => void) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const s = await saveOf(page);
  fn(s);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE, JSON.stringify(s)] as const);
}

/** From Hollow Rest down the stairs to Route 1 and left into the tall grass: with rate=1 a wild battle starts. */
async function intoGrass(page: Page) {
  await ready(page);
  await walkTo(page, 17, 19);
  await tapKey(page, 'right');
  expect(await ow(page)).toMatchObject({ map: 'route1' });
  await walkTo(page, 1, 1);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => (window as unknown as { __battle?: { phase(): string } }).__battle?.phase() === 'menu', null, { timeout: 60_000 });
}

const outcome = (page: Page) => page.evaluate(() => (window as unknown as { __battle: { outcome(): string | null } }).__battle.outcome());
const phase = (page: Page) => page.evaluate(() => (window as unknown as { __battle: { phase(): string } }).__battle.phase());
async function fightTurn(page: Page, move: number) {
  await tapBtn(page, '__battle', 'fight');
  await page.waitForFunction(() => (window as unknown as { __battle: { phase(): string } }).__battle.phase() === 'fight');
  await tapBtn(page, '__battle', `move${move}`);
  // Back at the menu, or the battle has ended (a won fight goes on to messages, then another scene).
  await page.waitForFunction(() => {
    const b = (window as unknown as { __battle: { phase(): string; outcome(): string | null } }).__battle;
    return ['menu', 'over'].includes(b.phase()) || b.outcome() !== null;
  }, null, { timeout: 30_000 });
}

test('a real evolution after a won battle: Furnaxol becomes Cullet', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await newSave(page, 'furnaxol');
  await editSave(page, (s) => { const m = s.teams[s.leader][0]; m.level = 15; m.xp = 16 ** 3 - 1; });
  await page.goto('/?seed=1&rate=1');
  await intoGrass(page);
  for (let i = 0; i < 20 && (await phase(page)) === 'menu' && !(await outcome(page)); i++) await fightTurn(page, 2); // Glassblow
  await page.waitForFunction(() => (window as unknown as { __battle: { outcome(): string | null } }).__battle.outcome() === 'win');
  // The XP messages, then the evolve scene starts by itself.
  await sceneActive(page, 'evolve');
  await evolveUntil(page, 'done', 40_000);
  await tapBtn(page, '__evolve', 'continue');
  await sceneActive(page, 'overworld');
  await ready(page);
  const s = await saveOf(page);
  expect(s.teams[s.leader][0].species).toBe('cullet');
  expect(s.teams[s.leader][0].level).toBe(16);
  expect(errors).toEqual([]);
});

test('blackout: a fainted team wakes at PATCH, healed', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await newSave(page, 'furnaxol');
  await editSave(page, (s) => { for (const m of s.teams[s.leader]) m.hp = 1; });
  await page.goto('/?seed=1&rate=1');
  await intoGrass(page);
  // Moves that don't hurt (index 0/1 may be status); try each in turn until the foe has finished us off.
  for (let i = 0; i < 30 && (await phase(page)) === 'menu' && !(await outcome(page)); i++) await fightTurn(page, 0);
  await page.waitForFunction(() => (window as unknown as { __battle: { outcome(): string | null } }).__battle.outcome() === 'lose', null, { timeout: 30_000 });
  await sceneActive(page, 'overworld');
  // PATCH's lines: Space finishes the typing, then moves on.
  await page.waitForFunction(() => (window as unknown as { __overworld?: { talking(): boolean } }).__overworld?.talking(), null, { timeout: 30_000 });
  for (let i = 0; i < 20 && (await page.evaluate(() => (window as unknown as { __overworld: { talking(): boolean } }).__overworld.talking())); i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
  }
  await ready(page);
  const where = await ow(page);
  expect(where).toMatchObject({ map: 'hollow_rest', x: 5, y: 5 });
  const s = await saveOf(page);
  for (const m of s.teams[s.leader]) expect(m.hp).toBeUndefined();
  expect(errors).toEqual([]);
});

// Solo picked in the pause menu applies as soon as the map resumes.
test('pause menu: SOLO takes effect on RESUME (followers hidden)', async ({ page }) => {
  await newSave(page, 'sprigby');
  await tapBtn(page, '__overworld', 'menu');
  await sceneActive(page, 'pause');
  await tapBtn(page, '__pause', 'settings');
  await tapBtn(page, '__pause', 'opt-solo');
  await tapBtn(page, '__pause', 'back');
  await tapBtn(page, '__pause', 'resume');
  await sceneGone(page, 'pause');
  await page.waitForTimeout(300);
  const f = await page.evaluate(() => (window as unknown as { __overworld: { followers(): { visible: boolean }[] } }).__overworld.followers());
  expect(f.some((x) => x.visible)).toBe(false);
});
