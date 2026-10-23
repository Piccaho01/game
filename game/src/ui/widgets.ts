import Phaser from 'phaser';
import { pixelText } from './text';

export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, color: number,
  onTap?: () => void, opts: { size?: number; sub?: string; name?: string } = {},
) {
  const c = scene.add.container(x, y);
  if (opts.name) c.setName(opts.name);
  const light = Phaser.Display.Color.ValueToColor(color).lighten(18).color;
  const dark = Phaser.Display.Color.ValueToColor(color).darken(30).color;
  const g = scene.add.graphics();
  g.fillStyle(0x101018).fillRoundedRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 4, 8);
  g.fillStyle(dark).fillRoundedRect(-w / 2, -h / 2 + 2, w, h, 7);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 7);
  g.fillStyle(light).fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, Math.min(8, h / 4), 3);
  c.add(g);
  const textY = opts.sub ? -6 : 0;
  c.add(pixelText(scene, 0, textY, label, { color: onTap ? '#ffffff' : '#b0b0b8', size: opts.size ?? 8, shadow: '#00000080' }).setOrigin(0.5));
  if (opts.sub) c.add(pixelText(scene, 0, 10, opts.sub, { color: '#f0f0f0', size: 6 }).setOrigin(0.5));
  if (onTap) {
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => c.setY(y + 2));
    c.on('pointerout', () => c.setY(y));
    c.on('pointerup', () => { c.setY(y); onTap(); });
  }
  return c;
}

export function wait(scene: Phaser.Scene, ms: number) {
  return new Promise<void>((r) => scene.time.delayedCall(ms, r));
}

export function tweenAsync(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig) {
  return new Promise<void>((r) => scene.tweens.add({ ...config, onComplete: () => r() }));
}
