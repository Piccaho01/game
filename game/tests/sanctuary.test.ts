import { describe, expect, it } from 'vitest';
import { newProgress, parseProgress, recordEncounter, recordSeal, sanctuaryPoints } from '../src/engine/progress';
import { restoreWing, wingState, WINGS } from '../src/engine/sanctuary';

describe('sanctuary wings', () => {
  it('the first wing opens once the bestiary earns its points, and wings go in order', () => {
    const p = newProgress('sprigby');
    expect(sanctuaryPoints(p)).toBe(20); // the four bonded starters
    expect(wingState(p, 'root_hall')).toBe('locked');
    expect(restoreWing(p, 'root_hall')).toBe(false);
    recordSeal(p, 'orbitot', 4, 'steady');
    recordEncounter(p, 'fledjet');
    expect(sanctuaryPoints(p)).toBe(WINGS[0].points);
    expect(wingState(p, 'root_hall')).toBe('ready');
    expect(restoreWing(p, 'root_hall')).toBe(true);
    expect(wingState(p, 'root_hall')).toBe('restored');
    expect(restoreWing(p, 'root_hall')).toBe(false);
    // The next wing needs its own points.
    expect(wingState(p, 'tide_gallery')).toBe('locked');
    // Saved and loaded.
    expect(parseProgress(JSON.parse(JSON.stringify(p)))!.wings).toEqual(['root_hall']);
  });

  it('a later wing stays locked until the ones before it are restored, whatever the points', () => {
    const p = newProgress('sprigby');
    for (const id of ['orbitot', 'fledjet', 'zapail', 'gobbin', 'furnaxol', 'craterra', 'contrailon', 'cullet', 'tesnail', 'fernaroo']) recordSeal(p, id, 5, 'strong');
    p.flags = [...(p.flags ?? []), 'storm_returned'];
    expect(sanctuaryPoints(p)).toBeGreaterThanOrEqual(WINGS.find((w) => w.id === 'tide_gallery')!.points);
    expect(wingState(p, 'tide_gallery')).toBe('locked');
    restoreWing(p, 'root_hall');
    expect(wingState(p, 'tide_gallery')).toBe('locked');
    expect(restoreWing(p, 'lantern_loft')).toBe(true);
    expect(wingState(p, 'tide_gallery')).toBe('ready');
  });

  it('the Lantern Loft also needs the storm back on Route 1 (Chapter 1)', () => {
    const p = newProgress('sprigby');
    for (const id of ['orbitot', 'fledjet', 'craterra', 'contrailon', 'voltcalf']) recordSeal(p, id, 5, 'strong');
    restoreWing(p, 'root_hall');
    expect(sanctuaryPoints(p)).toBeGreaterThanOrEqual(WINGS.find((w) => w.id === 'lantern_loft')!.points);
    expect(wingState(p, 'lantern_loft')).toBe('locked');
    p.flags = [...(p.flags ?? []), 'storm_returned'];
    expect(wingState(p, 'lantern_loft')).toBe('ready');
  });

  it('old saves without wings load with none restored', () => {
    const p = newProgress('gobbin') as unknown as Record<string, unknown>;
    delete p.wings;
    expect(parseProgress(p)!.wings).toEqual([]);
  });
});
