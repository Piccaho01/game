import Phaser from 'phaser';

/**
 * Rain on a screen area (Chapter 1): a cool grey-blue wash and short slanted streaks falling, with
 * the odd splash ring on the ground. Drawn live, no art. Used on the map and in battle.
 * `stop()` fades it out (the storm passing); `destroy()` removes it at once.
 */
export interface RainLayer { stop(ms?: number): Promise<void>; destroy(): void; lightning(): void }

export function rainLayer(scene: Phaser.Scene, area: { x: number; y: number; w: number; h: number }, depth: number, opts: { heavy?: boolean } = {}): RainLayer {
  const { x, y, w, h } = area;
  const wash = scene.add.rectangle(x, y, w, h, 0x203048, 0).setOrigin(0).setDepth(depth);
  const flash = scene.add.rectangle(x, y, w, h, 0xf4f8ff, 0).setOrigin(0).setDepth(depth + 1);
  const g = scene.add.graphics().setDepth(depth);
  const mask = scene.make.graphics({}, false).fillRect(x, y, w, h);
  g.setMask(mask.createGeometryMask());
  const n = Math.round((w * h) / (opts.heavy ? 260 : 420));
  const rnd = new Phaser.Math.RandomDataGenerator(['rain']);
  const drops = Array.from({ length: n }, () => ({ x: x + rnd.between(0, w + 40), y: y + rnd.between(-h, h), v: rnd.realInRange(3.2, 4.6), len: rnd.between(4, 7) }));
  const splashes: { x: number; y: number; t: number }[] = [];
  let alpha = 0;
  scene.tweens.add({ targets: wash, fillAlpha: 0.22, duration: 600 });
  scene.tweens.addCounter({ from: 0, to: 1, duration: 600, onUpdate: (tw) => { alpha = tw.getValue() ?? 1; } });
  const draw = () => {
    g.clear();
    for (const d of drops) {
      d.y += d.v;
      d.x -= d.v * 0.35;
      if (d.y > y + h) {
        if (rnd.frac() < 0.25) splashes.push({ x: d.x, y: y + rnd.between(h * 0.3, h), t: 0 });
        d.y = y - rnd.between(0, 20);
        d.x = x + rnd.between(0, w + 40);
      }
      g.lineStyle(1, 0xc8dcf0, 0.55 * alpha).lineBetween(Math.round(d.x), Math.round(d.y), Math.round(d.x + d.len * 0.35), Math.round(d.y - d.len));
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.t++;
      g.lineStyle(1, 0xd8e8f8, (1 - s.t / 10) * 0.6 * alpha).strokeEllipse(s.x, s.y, 2 + s.t * 0.6, 1 + s.t * 0.25);
      if (s.t >= 10) splashes.splice(i, 1);
    }
  };
  scene.events.on('update', draw);
  const destroy = () => {
    scene.events.off('update', draw);
    g.destroy();
    mask.destroy();
    wash.destroy();
    flash.destroy();
  };
  scene.events.once('shutdown', destroy);
  return {
    destroy,
    stop: (ms = 800) => new Promise<void>((done) => {
      scene.tweens.add({ targets: wash, fillAlpha: 0, duration: ms });
      scene.tweens.addCounter({ from: alpha, to: 0, duration: ms, onUpdate: (tw) => { alpha = tw.getValue() ?? 0; }, onComplete: () => { destroy(); done(); } });
    }),
    lightning: () => {
      flash.setFillStyle(0xf4f8ff, 0.85);
      scene.tweens.add({ targets: flash, fillAlpha: 0, duration: 380, ease: 'Quad.easeOut' });
    },
  };
}
