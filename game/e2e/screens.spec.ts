import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ready, storyNow, tapKey, tapUntil, walkTo, walkUntilStory } from './walk';

/**
 * Screenshots of every screen at phone size, saved to screens/ (CI uploads them with each run),
 * so a look change can be reviewed without opening the game.
 */
const DIR = 'screens';

type Hooks = { buttonAt(n: string): { x: number; y: number } | null };

async function tapOn(page: Page, hook: '__battle' | '__newgame' | '__journal' | '__cutscene', name: string) {
  const pt = await page.evaluate(([h, n]) => (window as unknown as Record<string, Hooks>)[h].buttonAt(n), [hook, name] as const);
  expect(pt, `button ${name}`).not.toBeNull();
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForTimeout(150);
}

const shot = (page: Page, name: string) => page.screenshot({ path: `${DIR}/${name}.png` });

test('screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // The story cards: each card, a line or two in (taps move the lines on).
  type Cut = { card(): string; step(): number; talking(): boolean };
  const card = () => page.evaluate(() => (window as unknown as { __cutscene?: Cut }).__cutscene?.card());
  const stepNo = () => page.evaluate(() => (window as unknown as { __cutscene: Cut }).__cutscene.step());
  await page.goto('/?reset&seed=2');
  await page.waitForFunction(() => (window as unknown as { __cutscene?: Cut }).__cutscene?.card() === '01_couch', null, { timeout: 60_000 });
  await page.waitForTimeout(2500);
  await shot(page, '00a-story-couch');
  const steps = JSON.parse(readFileSync('src/data/cutscenes.json', 'utf8')).scenes.opening.steps as { card?: string; text?: string }[];
  const at = (pred: (s: { card?: string; text?: string }) => boolean) => steps.findIndex(pred);
  // A shot a moment after a given step starts (its line typed out).
  const shotAt = async (index: number, name: string, ms = 2200) => {
    await tapUntil(page, async () => (await stepNo()) >= index);
    await page.waitForTimeout(ms);
    await shot(page, name);
  };
  await shotAt(at((s) => !!s.text?.startsWith('And a region')), '00b-story-plan');
  await shotAt(at((s) => !!s.text?.startsWith("CALLUM'S LAPTOP")), '00c-story-blowup', 900);
  await shotAt(at((s) => !!s.text?.startsWith('The computer blew up')), '00d-story-landing');
  await shotAt(at((s) => !!s.text?.startsWith('Furnaxol.')), '00e-story-starters');
  expect(await card()).toBe('05_starters');
  await tapOn(page, '__cutscene', 'skip');
  await page.waitForFunction(() => (window as unknown as { __newgame?: { step(): string } }).__newgame?.step() === 'leader', null, { timeout: 60_000 });
  await page.waitForTimeout(300);
  await shot(page, '01-newgame-patch');
  await tapOn(page, '__newgame', 'char-callum');
  await shot(page, '02-newgame-leader');
  await tapOn(page, '__newgame', 'confirm');
  await tapOn(page, '__newgame', 'starter-furnaxol');
  await shot(page, '03-newgame-starter');
  await tapOn(page, '__newgame', 'confirm');

  // The first step out: the four and PATCH outside the sanctuary, talking.
  await page.waitForFunction(() => (window as unknown as { __overworld?: { story(): string | null } }).__overworld?.story() === 'first_step', null, { timeout: 60_000 });
  await page.waitForTimeout(4500);
  await shot(page, '04a-story-first-step');
  await tapUntil(page, async () => (await storyNow(page)) === null);

  // Overworld: up at the sanctuary, then down toward the town sign, where Connor pings the chat.
  await ready(page);
  await page.waitForTimeout(400);
  await shot(page, '04-overworld');
  await walkUntilStory(page, 14, 16);
  await page.waitForFunction(() => (window as unknown as { __overworld: { story(): string | null } }).__overworld.story() === 'connor_hook', null, { timeout: 10_000 });
  await page.waitForTimeout(9000);
  await shot(page, '04c-story-connor-chat');
  await tapUntil(page, async () => (await storyNow(page)) === null);
  await ready(page);
  await walkTo(page, 14, 17);
  await tapKey(page, 'left');
  await page.keyboard.press('Space');
  await page.waitForTimeout(1500);
  await shot(page, '05-overworld-sign');

  await page.goto('/?foe=fledjet&seed=2');
  await page.waitForFunction(() => window.__battle?.phase() === 'menu', null, { timeout: 60_000 });
  await shot(page, '06-battle-menu');
  await tapOn(page, '__battle', 'fight');
  await shot(page, '07-battle-fight');
  await tapOn(page, '__battle', 'move2');
  await page.waitForTimeout(400);
  await shot(page, '08-battle-message');
  await page.waitForFunction(() => ['menu', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });

  // Win quickly so the end screen and the Journal are reachable.
  for (let turn = 0; turn < 20 && (await page.evaluate(() => window.__battle.phase())) === 'menu'; turn++) {
    await tapOn(page, '__battle', 'fight');
    await tapOn(page, '__battle', 'move2');
    await page.waitForFunction(() => ['menu', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });
  }
  await shot(page, '09-battle-end');
  await tapOn(page, '__battle', 'journal');
  await page.waitForFunction(() => !!(window as unknown as { __journal?: unknown }).__journal);
  await page.waitForTimeout(200);
  await tapOn(page, '__journal', 'member0');
  await shot(page, '10-journal-team');
  await tapOn(page, '__journal', 'tab-bestiary');
  await tapOn(page, '__journal', 'dex-next');
  await tapOn(page, '__journal', 'dex-fledjet');
  await shot(page, '11-journal-bestiary');
  expect(errors).toEqual([]);
});
