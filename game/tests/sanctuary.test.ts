import { describe, expect, it } from 'vitest';
import { newProgress, parseProgress, recordSeal, sanctuaryPoints } from '../src/engine/progress';
import { restoreWing, wingState } from '../src/engine/sanctuary';

describe('sanctuary wings', () => {
  it('Root Hall opens once the four seal their first wild Patchling, and wings go in order', () => {
    const p = newProgress('sprigby');
    expect(wingState(p, 'root_hall')).toBe('locked');
    expect(restoreWing(p, 'root_hall')).toBe(false);
    recordSeal(p, 'orbitot', 4, 'steady');
    expect(wingState(p, 'root_hall')).toBe('ready');
    expect(restoreWing(p, 'root_hall')).toBe(true);
    expect(wingState(p, 'root_hall')).toBe('restored');
    expect(restoreWing(p, 'root_hall')).toBe(false);
    // The next wing waits on its own story.
    expect(wingState(p, 'lantern_loft')).toBe('locked');
    // Saved and loaded.
    expect(parseProgress(JSON.parse(JSON.stringify(p)))!.wings).toEqual(['root_hall']);
  });

  it('points no longer open wings: only the story does (owner\'s call, Chapter 1)', () => {
    const p = newProgress('sprigby');
    for (const id of ['orbitot', 'fledjet', 'craterra', 'contrailon', 'cullet', 'tesnail', 'fernaroo', 'voltcalf']) recordSeal(p, id, 5, 'strong');
    expect(sanctuaryPoints(p)).toBeGreaterThanOrEqual(60);
    restoreWing(p, 'root_hall');
    expect(wingState(p, 'lantern_loft')).toBe('locked');
    p.flags = [...(p.flags ?? []), 'storm_returned'];
    expect(wingState(p, 'lantern_loft')).toBe('ready');
    // A later wing stays locked until the ones before it are restored, even once its story has opened it.
    p.flags.push('tide_gallery_open');
    expect(wingState(p, 'tide_gallery')).toBe('locked');
    expect(restoreWing(p, 'lantern_loft')).toBe(true);
    expect(wingState(p, 'tide_gallery')).toBe('ready');
  });

  it('old saves without wings load with none restored', () => {
    const p = newProgress('gobbin') as unknown as Record<string, unknown>;
    delete p.wings;
    expect(parseProgress(p)!.wings).toEqual([]);
  });
});
