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
