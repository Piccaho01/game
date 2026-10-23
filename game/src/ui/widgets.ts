import Phaser from 'phaser';

export function wait(scene: Phaser.Scene, ms: number) {
  return new Promise<void>((r) => scene.time.delayedCall(ms, r));
}

export function tweenAsync(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig) {
  return new Promise<void>((r) => scene.tweens.add({ ...config, onComplete: () => r() }));
}
