import { expect, type Page } from '@playwright/test';

export interface Pos { map: string; x: number; y: number; dir: string }
type Ow = { pos(): Pos; ready(): boolean; talking(): boolean; npcs(): string[]; pathTo(x: number, y: number): string[] | null };
const KEY: Record<string, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

export const ow = (page: Page) => page.evaluate(() => (window as unknown as { __overworld: Ow }).__overworld.pos());
export const ready = (page: Page) => page.waitForFunction(() => (window as unknown as { __overworld?: Ow }).__overworld?.ready(), null, { timeout: 60_000 });

/** One key tap: one step (or a turn when something's in the way). */
export async function tapKey(page: Page, dir: string) {
  const before = await ow(page);
  await page.keyboard.press(KEY[dir]);
  await page.waitForFunction((b) => {
    const o = (window as unknown as { __overworld: Ow }).__overworld;
    const p = o.pos();
    return o.ready() && (p.x !== b.x || p.y !== b.y || p.dir !== b.dir || p.map !== b.map);
  }, before, { timeout: 5_000 }).catch(() => undefined);
  await ready(page);
}

/** Walks to a tile on the current map along the game's own shortest path, with real key taps. */
export async function walkTo(page: Page, x: number, y: number) {
  const dirs = await page.evaluate(([tx, ty]) => (window as unknown as { __overworld: Ow }).__overworld.pathTo(tx, ty), [x, y] as const);
  expect(dirs, `a path to ${x},${y}`).not.toBeNull();
  for (const d of dirs!) await tapKey(page, d);
  expect(await ow(page)).toMatchObject({ x, y });
}

type Story = { story(): string | null; ready(): boolean; pathTo(x: number, y: number): string[] | null };
export const storyNow = (page: Page) => page.evaluate(() => (window as unknown as { __overworld: Story }).__overworld.story());

/** Walks toward a tile until a story scene starts on the way (it starts by itself when the leader steps into its spot). */
export async function walkUntilStory(page: Page, x: number, y: number) {
  const dirs = await page.evaluate(([tx, ty]) => (window as unknown as { __overworld: Story }).__overworld.pathTo(tx, ty), [x, y] as const);
  expect(dirs, `a path to ${x},${y}`).not.toBeNull();
  for (const d of dirs!) {
    if (await storyNow(page)) return;
    await page.keyboard.press(KEY[d]);
    await page.waitForFunction(() => {
      const o = (window as unknown as { __overworld: Story }).__overworld;
      return o.ready() || !!o.story();
    }, null, { timeout: 5_000 });
  }
}

/** Taps through story lines (each tap finishes the typing, then moves on) until `done`. */
export async function tapUntil(page: Page, done: () => Promise<boolean>, max = 250) {
  for (let i = 0; i < max && !(await done()); i++) {
    await page.touchscreen.tap(195, 250); // the top screen: nothing to press there
    await page.waitForTimeout(120);
  }
  expect(await done()).toBe(true);
}
