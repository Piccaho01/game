import Phaser from 'phaser';
import { BODY_FONT, BODY_SCALE, FONT, ZOOM } from '../config';
import { TEXT_COLORS } from './theme';

/**
 * Text on the logical pixel grid. Titles (size 10 and up) and anything marked `display` use the
 * pixel display font; everything else the easier-to-read body font.
 */
export function pixelText(scene: Phaser.Scene, x: number, y: number, text: string, opts: { color?: string; size?: number; wrap?: number; shadow?: string; display?: boolean } = {}) {
  const size = opts.size ?? 8;
  const display = opts.display ?? size >= 10;
  const t = scene.add.text(x, y, text, {
    fontFamily: display ? FONT : BODY_FONT,
    fontSize: `${display ? size : Math.round(size * BODY_SCALE)}px`,
    color: opts.color ?? TEXT_COLORS.ink,
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    lineSpacing: display ? 6 : 2,
  });
  if (opts.shadow) t.setShadow(1, 1, opts.shadow, 0, false, true);
  return t.setResolution(ZOOM);
}
