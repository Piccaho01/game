import { describe, expect, it } from 'vitest';
import { followStep, isBlocked, lineUp, MAPS, START, step, type Spot } from '../src/engine/overworld';

const town = MAPS.hollow_rest;
const touching = (a: Spot, b: Spot) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1;

describe('the squad follows the leader', () => {
  it('lines up behind the leader on open ground', () => {
    const line = lineUp(START, 3);
    expect(line).toHaveLength(3);
    [START, ...line].slice(0, -1).forEach((s, i) => expect(touching(s, line[i])).toBe(true));
    for (const s of line) expect(isBlocked(town, s.x, s.y)).toBe(false);
    // Facing down, they stand above the leader, all facing down too.
    expect(line[0]).toEqual({ x: START.x, y: START.y - 1, dir: 'down' });
  });

  it('bunches up where the ground stops (and around NPCs)', () => {
    const line = lineUp(START, 3, () => true);
    expect(line).toEqual([0, 1, 2].map(() => ({ x: START.x, y: START.y, dir: START.dir })));
  });

  it('each step, everyone takes the place of the one ahead', () => {
    const from = { x: 5, y: 5, dir: 'right' as const };
    const trail: Spot[] = [{ x: 4, y: 5, dir: 'right' }, { x: 4, y: 4, dir: 'down' }, { x: 4, y: 4, dir: 'down' }];
    expect(followStep(trail, from)).toEqual([
      { x: 5, y: 5, dir: 'right' }, { x: 4, y: 5, dir: 'down' }, { x: 4, y: 4, dir: 'down' },
    ]);
  });

  it('walking back into the first follower swaps places with them', () => {
    const res = step(START, 'up');
    expect(res.moved).toBe(true);
    const line = lineUp(START, 3);
    const after = followStep(line, START);
    expect(after[0]).toMatchObject({ x: START.x, y: START.y });
    expect(after[0].dir).toBe('down');
  });
});
