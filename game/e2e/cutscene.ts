import { expect, type Page } from '@playwright/test';

/** E2E helpers for story scenes (scenes/CutsceneScene.ts, window.__cutscene). */
export type Cs = { id(): string; step(): number; steps(): number; done(): boolean; buttonAt(n: string): { x: number; y: number } | null };

export const csPlaying = (page: Page, id: string) => page.waitForFunction(
  (i) => { const c = (window as unknown as { __cutscene?: Cs }).__cutscene; return c?.id() === i && !c.done(); }, id, { timeout: 60_000 },
);

export async function skipCutscene(page: Page, id: string) {
  await csPlaying(page, id);
  await page.waitForTimeout(300);
  const pt = await page.evaluate(() => (window as unknown as { __cutscene: Cs }).__cutscene.buttonAt('skip'));
  expect(pt).not.toBeNull();
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForFunction(() => (window as unknown as { __cutscene: Cs }).__cutscene.done());
}

/** Taps through a scene line by line (on the touch screen, away from SKIP) until it ends. */
export async function tapThrough(page: Page, id: string, max = 200) {
  await csPlaying(page, id);
  const vp = page.viewportSize()!;
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(() => (window as unknown as { __cutscene: Cs }).__cutscene.done())) return i;
    await page.touchscreen.tap(vp.width / 2, vp.height * 0.8);
    await page.waitForTimeout(220);
  }
  throw new Error(`${id} did not end after ${max} taps`);
}

/** Walks toward a tile, one key tap at a time, until a story scene starts on the map (or it gets there). */
export async function walkUntilStory(page: Page, x: number, y: number) {
  type Ow = { pathTo(x: number, y: number): string[] | null; story(): string | null; ready(): boolean };
  const dirs = await page.evaluate(([tx, ty]) => (window as unknown as { __overworld: Ow }).__overworld.pathTo(tx, ty), [x, y] as const);
  expect(dirs, `a path to ${x},${y}`).not.toBeNull();
  const KEY: Record<string, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  for (const d of dirs!) {
    await page.keyboard.press(KEY[d]);
    await page.waitForTimeout(260);
    if (await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.story())) return;
    await page.waitForFunction(() => (window as unknown as { __overworld: Ow }).__overworld.ready() || !!(window as unknown as { __overworld: Ow }).__overworld.story());
    if (await page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.story())) return;
  }
}
