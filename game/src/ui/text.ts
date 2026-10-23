import Phaser from 'phaser';
import { FONT, ZOOM } from '../config';
import { TEXT_COLORS } from './theme';

export function pixelText(scene: Phaser.Scene, x: number, y: number, text: string, opts: { color?: string; size?: number; wrap?: number; shadow?: string } = {}) {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONT,
    fontSize: `${opts.size ?? 8}px`,
    color: opts.color ?? TEXT_COLORS.ink,
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    lineSpacing: 6,
  });
  if (opts.shadow) t.setShadow(1, 1, opts.shadow, 0, false, true);
  return t.setResolution(ZOOM);
}
