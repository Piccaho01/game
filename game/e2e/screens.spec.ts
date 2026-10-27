import { expect, test, type Page } from '@playwright/test';
import { csPlaying, skipCutscene, walkUntilStory, type Cs } from './cutscene';
import { ready, tapKey, walkTo } from './walk';

/**
 * Screenshots of every screen at phone size, saved to screens/ (CI uploads them with each run),
 * so a look change can be reviewed without opening the game.
 */
const DIR = 'screens';

type Hooks = { buttonAt(n: string): { x: number; y: number } | null };

async function tapOn(page: Page, hook: '__battle' | '__newgame' | '__journal' | '__intro', name: string) {
  const pt = await page.evaluate(([h, n]) => (window as unknown as Record<string, Hooks>)[h].buttonAt(n), [hook, name] as const);
  expect(pt, `button ${name}`).not.toBeNull();
  await page.touchscreen.tap(pt!.x, pt!.y);
  await page.waitForTimeout(150);
}

const shot = (page: Page, name: string) => page.screenshot({ path: `${DIR}/${name}.png` });

test('screens', async ({ page }) => {
  // The whole opening plays through first, so this run is long.
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // The opening cutscene: one shot per card, then PATCH naming a starter (spotlit).
  const csStep = () => page.evaluate(() => (window as unknown as { __cutscene: Cs }).__cutscene.step());
  await page.goto('/?reset&seed=2');
  await csPlaying(page, 'opening');
  const vp = page.viewportSize()!;
  // [step reached, file, ms to let it settle]
  const shots: [number, string, number][] = [[2, '00a-cut-couch', 1300], [13, '00b-cut-plan', 1300], [23, '00c-cut-blowup', 250], [27, '00d-cut-landing', 1300], [40, '00e-cut-sanctuary', 1500], [49, '00f-cut-starter-spot', 1300]];
  for (let i = 0; i < 400 && shots.length; i++) {
    if ((await csStep()) >= shots[0][0]) {
      const [, file, ms] = shots.shift()!;
      await page.waitForTimeout(ms);
      await shot(page, file);
      continue;
    }
    await page.touchscreen.tap(vp.width / 2, vp.height * 0.8);
    await page.waitForTimeout(200);
  }
  await skipCutscene(page, 'opening');
  await page.waitForFunction(() => (window as unknown as { __newgame?: { step(): string } }).__newgame?.step() === 'starters', null, { timeout: 60_000 });
  await page.waitForTimeout(300);
  await shot(page, '03a-newgame-starters');
  await tapOn(page, '__newgame', 'back');
  await page.waitForFunction(() => (window as unknown as { __newgame?: { step(): string } }).__newgame?.step() === 'leader', null, { timeout: 60_000 });
  await page.waitForTimeout(300);
  await shot(page, '01-newgame-patch');
  await tapOn(page, '__newgame', 'char-callum');
  await shot(page, '02-newgame-leader');
  await tapOn(page, '__newgame', 'confirm');
  await page.waitForTimeout(300);
  await shot(page, '03a-newgame-starters');
  await tapOn(page, '__newgame', 'starter-gobbin');
  await page.waitForTimeout(200);
  await shot(page, '03b-newgame-starter-picked');
  await tapOn(page, '__newgame', 'friend-callum');
  await tapOn(page, '__newgame', 'confirm');
  await csPlaying(page, 'starters_picked');
  await page.waitForTimeout(1500);
  await shot(page, '03b2-story-reactions');
  await skipCutscene(page, 'starters_picked');
  await page.waitForTimeout(300);
  await shot(page, '03c-newgame-lead');
  await tapOn(page, '__newgame', 'confirm');

  // Beat 6 on the map: the four huddle round the leader and talk.
  await csPlaying(page, 'first_step');
  await page.waitForTimeout(1800);
  await shot(page, '04-story-first-step');
  await skipCutscene(page, 'first_step');

  // Overworld: Hollow Rest by the crater, up at the sanctuary, and the town sign by the edge.
  await ready(page);
  await page.waitForTimeout(400);
  await shot(page, '04-overworld');
  await walkTo(page, 8, 9);
  await page.waitForTimeout(300);
  await shot(page, '04a-overworld-squad');
  await walkTo(page, 6, 6);
  await page.waitForTimeout(300);
  await shot(page, '04b-overworld-sanctuary');
  // Beat 7: Connor in the group chat, at the town sign.
  await walkUntilStory(page, 14, 17);
  await csPlaying(page, 'connor_hook');
  for (let i = 0; i < 40 && (await csStep()) < 5; i++) {
    await page.touchscreen.tap(vp.width / 2, vp.height * 0.8);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);
  await shot(page, '05a-story-connor-chat');
  await skipCutscene(page, 'connor_hook');
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
    await page.waitForFunction(() => window.__battle.phase() === 'fight');
  await shot(page, '07-battle-fight');
  await tapOn(page, '__battle', 'move2');
  await page.waitForTimeout(400);
  await shot(page, '08-battle-message');
  await page.waitForFunction(() => ['menu', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });

  // Win quickly so the end screen and the Journal are reachable.
  for (let turn = 0; turn < 20 && (await page.evaluate(() => window.__battle.phase())) === 'menu'; turn++) {
    await tapOn(page, '__battle', 'fight');
    await page.waitForFunction(() => window.__battle.phase() === 'fight');
    await tapOn(page, '__battle', 'move2');
    await page.waitForFunction(() => ['menu', 'over'].includes(window.__battle.phase()), null, { timeout: 30_000 });
  }
  await shot(page, '09-battle-end');
  await tapOn(page, '__battle', 'journal');
  await page.waitForFunction(() => !!(window as unknown as { __journal?: unknown }).__journal);
  await page.waitForTimeout(200);
  await tapOn(page, '__journal', 'member0');
  await shot(page, '10-journal-team');
  await tapOn(page, '__journal', 'team-dani');
  await page.waitForTimeout(200);
  await shot(page, '10b-journal-team-dani');
  await tapOn(page, '__journal', 'tab-bag');
  await tapOn(page, '__journal', 'item-triple_stack_scroll');
  await page.waitForTimeout(200);
  await shot(page, '10d-journal-bag');
  await tapOn(page, '__journal', 'tab-bestiary');
  await tapOn(page, '__journal', 'dex-next');
  await tapOn(page, '__journal', 'dex-fledjet');
  await shot(page, '11-journal-bestiary');
  expect(errors).toEqual([]);
});

// World track: the houses, the sanctuary base and Route 1 (a save placed in each spot, then a reload).
test('screens: interiors and Route 1', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const spots: [string, { map: string; x: number; y: number; dir: string }, string[]][] = [
    ['20-callum-house', { map: 'callum_house', x: 3, y: 4, dir: 'up' }, []],
    ['21-nolan-house', { map: 'nolan_house', x: 3, y: 4, dir: 'up' }, []],
    ['22-haydon-shed', { map: 'haydon_shed', x: 2, y: 3, dir: 'up' }, []],
    ['23-dani-house', { map: 'dani_house', x: 3, y: 4, dir: 'up' }, []],
    ['24-sanctuary-hall', { map: 'sanctuary_hall', x: 4, y: 6, dir: 'up' }, []],
    ['25-sanctuary-workshop', { map: 'sanctuary_workshop', x: 3, y: 4, dir: 'up' }, []],
    ['26-sanctuary-hall-restored', { map: 'sanctuary_hall', x: 3, y: 5, dir: 'up' }, ['root_hall']],
    ['27-sanctuary-roots', { map: 'sanctuary_roots', x: 3, y: 5, dir: 'up' }, ['root_hall']],
    ['28-route1-top', { map: 'route1', x: 4, y: 3, dir: 'down' }, []],
    ['29-route1-bridge', { map: 'route1', x: 12, y: 9, dir: 'right' }, []],
    ['30-route1-checkpoint', { map: 'route1', x: 19, y: 15, dir: 'down' }, []],
  ];
  for (const [name, pos, wings] of spots) {
    await page.goto('/?reset&skipintro');
    await page.evaluate(([p, w]) => localStorage.setItem('patchlings.save.v1', JSON.stringify({
      version: 3, leader: 'callum', nextUid: 9, wings: w, bestiary: {},
      teams: {
        callum: [{ uid: 1, species: 'furnaxol', level: 8, bond: 'strong' }], nolan: [{ uid: 2, species: 'zapail', level: 8, bond: 'strong' }],
        haydon: [{ uid: 3, species: 'sprigby', level: 8, bond: 'strong' }], dani: [{ uid: 4, species: 'gobbin', level: 8, bond: 'strong' }],
      },
      sanctuary: [{ uid: 5, species: 'sprigby', level: 5, bond: 'steady' }, { uid: 6, species: 'gobbin', level: 4, bond: 'wary' }, { uid: 7, species: 'zapail', level: 4, bond: 'wary' }],
      pos: p,
    })), [pos, wings] as const);
    await page.goto('/?seed=1');
    await ready(page);
    await page.waitForTimeout(2200);
    await shot(page, name);
  }
  expect(errors).toEqual([]);
});
