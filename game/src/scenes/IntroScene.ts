import Phaser from 'phaser';

/**
 * A new game opens here (BootScene starts 'intro'): the opening cutscene, beats 1-5 of
 * docs/INTRO_SCRIPT.md (data/cutscenes/opening.json), which leads into the starter pick.
 */
export class IntroScene extends Phaser.Scene {
  constructor() { super('intro'); }

  create() {
    this.scene.start('cutscene', { id: 'opening' });
  }
}
