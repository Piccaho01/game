import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/500.css';
import Phaser from 'phaser';
import { SCREEN_W, VIEW_H, ZOOM } from './config';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { JournalScene } from './scenes/JournalScene';
import { NewGameScene } from './scenes/NewGameScene';
import { OverworldScene } from './scenes/OverworldScene';
import { IntroScene } from './scenes/IntroScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { SanctuaryScene } from './scenes/SanctuaryScene';
import { TitleScene } from './scenes/TitleScene';
import { PauseScene } from './scenes/PauseScene';
import { EvolveScene } from './scenes/EvolveScene';
import { unlockAudio } from './ui/sfx';

async function start() {
  unlockAudio();
  // Text is drawn to textures, so the pixel font must be ready before the first scene.
  await Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('12px "Pixelify Sans"')]).catch(() => undefined);
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
    scene: [BootScene, TitleScene, IntroScene, CutsceneScene, NewGameScene, OverworldScene, BattleScene, EvolveScene, JournalScene, SanctuaryScene, PauseScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

void start();
