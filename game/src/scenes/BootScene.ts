import Phaser from 'phaser';
import { SPRITES, type SpriteAsset } from '../assets';
import { SPECIES, TYPES } from '../engine/data';
import { newProgress } from '../engine/progress';
import { clearProgress, loadProgress, saveProgress } from '../save';

/** Texture key for a species' battle sprite; always exists after boot (real art or a placeholder). */
export const frontKey = (species: string) => `front:${species}`;
export const idleAnimKey = (species: string) => `idle:${species}`;
/** The player's Patchling is shown from behind, like BW; optional per species (`<sprite>_back`). */
export const backKey = (species: string) => `back:${species}`;
export const backIdleAnimKey = (species: string) => `idle:back:${species}`;

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    for (const [id, sp] of Object.entries(SPECIES)) {
      if (!sp.sprite) continue;
      this.loadArt(frontKey(id), SPRITES[sp.sprite]);
      this.loadArt(backKey(id), SPRITES[`${sp.sprite}_back`]);
    }
  }

  create() {
    for (const [id, sp] of Object.entries(SPECIES)) {
      const key = frontKey(id);
      if (!this.textures.exists(key)) this.makePlaceholder(key, TYPES[sp.types[0]].color, sp.dex);
      this.makeIdle(key, idleAnimKey(id));
      if (this.textures.exists(backKey(id))) this.makeIdle(backKey(id), backIdleAnimKey(id));
    }
    const params = new URLSearchParams(location.search);
    // ?reset clears the save. A new game goes to the character and starter pick, unless ?player
    // names a starter (a shortcut for tests and quick checks). ?foe jumps straight into a battle.
    if (params.has('reset')) clearProgress();
    let progress = loadProgress();
    const starter = params.get('player');
    if (!progress && starter && SPECIES[starter]) {
      progress = newProgress(starter);
      saveProgress(progress);
    }
    if (!progress) {
      this.scene.start('newgame');
      return;
    }
    this.registry.set('progress', progress);
    const foe = params.get('foe');
    if (foe && SPECIES[foe]) {
      this.scene.start('battle', { foe, seed: params.has('seed') ? Number(params.get('seed')) : undefined });
      return;
    }
    this.scene.start('overworld');
  }

  private loadArt(key: string, art: SpriteAsset | undefined) {
    if (art?.idle?.png && art.idle.json) {
      this.load.atlas(key, art.idle.png, art.idle.json);
      this.load.json(`${key}:json`, art.idle.json);
    } else if (art?.still) this.load.image(key, art.still);
  }

  private makeIdle(key: string, animKey: string) {
    const frames = this.textures.get(key).getFrameNames();
    if (frames.length > 1) this.anims.create({ key: animKey, ...this.idleFrames(key, frames), repeat: -1 });
  }

  /** pxl atlases name frames <name>_<n> with per-frame durations in the JSON. */
  private idleFrames(key: string, names: string[]) {
    const sorted = names.sort((a, b) => Number(a.split('_').pop()) - Number(b.split('_').pop()));
    const json = this.cache.json.get(`${key}:json`) as { frames?: Record<string, { duration?: number }> } | undefined;
    return { frames: sorted.map((frame) => ({ key, frame, duration: json?.frames?.[frame]?.duration ?? 100 })) };
  }

  /** A blobby stand-in in the type colour until the real sprite is approved (M2). */
  private makePlaceholder(key: string, color: string, dex: number) {
    const c = Phaser.Display.Color.HexStringToColor(color);
    const dark = Phaser.Display.Color.ValueToColor(c.color).darken(45).color;
    const light = Phaser.Display.Color.ValueToColor(c.color).lighten(25).color;
    const g = this.make.graphics({}, false);
    g.fillStyle(0x101010).fillEllipse(48, 66, 58, 50).fillEllipse(54, 40, 40, 36);
    g.fillStyle(dark).fillEllipse(48, 66, 54, 46).fillEllipse(54, 40, 36, 32);
    g.fillStyle(c.color).fillEllipse(45, 63, 46, 38).fillEllipse(51, 38, 30, 26);
    g.fillStyle(light).fillEllipse(40, 56, 16, 10);
    g.fillStyle(0x101010).fillRect(40, 36, 4, 6).fillRect(52, 36, 4, 6);
    g.fillStyle(0xffffff).fillRect(40, 36, 2, 2).fillRect(52, 36, 2, 2);
    g.fillStyle(0x101010).fillRect(22, 84, 52, 2);
    g.generateTexture(key, 96, 96);
    g.destroy();
    // Mark it so the scene can label it as a placeholder.
    this.registry.set(`placeholder:${key}`, dex);
  }
}
