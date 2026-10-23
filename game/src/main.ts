import '@fontsource/press-start-2p/400.css';
import Phaser from 'phaser';
import { SCREEN_W, VIEW_H, ZOOM } from './config';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { JournalScene } from './scenes/JournalScene';
import { NewGameScene } from './scenes/NewGameScene';

async function start() {
  // Text is drawn to textures, so the pixel font must be ready before the first scene.
  await document.fonts.load('8px "Press Start 2P"').catch(() => undefined);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: SCREEN_W * ZOOM,
    height: VIEW_H * ZOOM,
    backgroundColor: '#101018',
    pixelArt: true,
    // Use the real frame time so a slow device drops frames instead of running in slow motion.
    fps: { smoothStep: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    scene: [BootScene, NewGameScene, BattleScene, JournalScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

void start();
