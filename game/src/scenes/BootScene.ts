import Phaser from 'phaser';
import { BATTLE_BGS, FOLLOW_FRAME, FOLLOW_SHEETS, ITEM_ICONS, MAP_ART, PROP_ART, SPRITES, STANDS, TRAINER_BATTLE, WALK_FRAME, WALK_SHEETS, type SpriteAsset } from '../assets';
import { SPECIES, TYPES } from '../engine/data';
import { newProgress } from '../engine/progress';
import { ITEMS } from '../engine/items';
import { clearProgress, loadProgress, saveProgress } from '../save';

/** Texture key for a species' battle sprite; always exists after boot (real art or a placeholder). */
export const frontKey = (species: string) => `front:${species}`;
export const idleAnimKey = (species: string) => `idle:${species}`;
/** The player's Patchling is shown from behind, like BW; optional per species (`<sprite>_back`). */
export const backKey = (species: string) => `back:${species}`;
/** A character's overworld walk sheet (leaders now; NPCs later). */
export const walkKey = (id: string) => `walk:${id}`;
/** A single standing pose (PATCH in town): art/trainers/out/<id>_stand.png. */
export const standKey = (id: string) => `stand:${id}`;
/** A baked isometric map's ground, and the upright pieces placed on it. */
export const groundKey = (id: string) => `ground:${id}`;
export const propKey = (art: string) => `prop:${art}`;
export const backIdleAnimKey = (species: string) => `idle:back:${species}`;
/** A location's battle backdrop (256x192). */
export const battleBgKey = (id: string) => `battlebg:${id}`;
/** A friend's big pixel figure for the assist cut-in. */
export const trainerKey = (id: string) => `trainer:${id}`;
/** A Patchling's follower frames (8 angles). */
export const followKey = (species: string) => `follow:${species}`;
/** An item's icon, drawn at boot (a rolled scroll in the item's colour). */
export const itemKey = (id: string) => `item:${id}`;

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    for (const [id, sp] of Object.entries(SPECIES)) {
      if (!sp.sprite) continue;
      this.loadArt(frontKey(id), SPRITES[sp.sprite]);
      this.loadArt(backKey(id), SPRITES[`${sp.sprite}_back`]);
    }
    for (const [id, url] of Object.entries(WALK_SHEETS)) {
      this.load.spritesheet(walkKey(id), url, { frameWidth: WALK_FRAME.w, frameHeight: WALK_FRAME.h });
    }
    for (const [id, url] of Object.entries(STANDS)) this.load.image(standKey(id), url);
    for (const [id, url] of Object.entries(ITEM_ICONS)) this.load.image(itemKey(id), url);
    for (const [id, art] of Object.entries(MAP_ART)) this.load.image(groundKey(id), art.png);
    for (const [id, url] of Object.entries(PROP_ART)) this.load.image(propKey(id), url);
    for (const [id, url] of Object.entries(BATTLE_BGS)) this.load.image(battleBgKey(id), url);
    for (const [id, url] of Object.entries(TRAINER_BATTLE)) this.load.image(trainerKey(id), url);
    for (const [id, url] of Object.entries(FOLLOW_SHEETS)) this.load.spritesheet(followKey(id), url, { frameWidth: FOLLOW_FRAME, frameHeight: FOLLOW_FRAME });
  }

  create() {
    for (const [id, sp] of Object.entries(SPECIES)) {
      const key = frontKey(id);
      if (!this.textures.exists(key)) this.makePlaceholder(key, TYPES[sp.types[0]].color, sp.dex);
      this.makeIdle(key, idleAnimKey(id));
      if (this.textures.exists(backKey(id))) this.makeIdle(backKey(id), backIdleAnimKey(id));
    }
    this.makeItemIcons();
    const params = new URLSearchParams(location.search);
    // ?reset clears the save. A new game goes to the character and starter pick, unless ?player
    // names a starter (a shortcut for tests and quick checks). ?foe jumps straight into a battle.
    if (params.has('reset')) clearProgress();
    let progress = loadProgress();
    const starter = params.get('player');
    if (!progress && starter && SPECIES[starter]) {
      progress = newProgress(starter);
      // A test shortcut: past the opening's story scenes unless ?story.
      if (!params.has('story')) progress.flags = ['opening'];
      saveProgress(progress);
    }
    if (!progress) {
      // A new game opens on the intro (?skipintro goes straight to the pick, for tests).
      this.scene.start(params.has('skipintro') ? 'newgame' : 'intro');
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

  /** Seal scroll icons: the owner's art (ITEM_ICONS); any item without it gets a rolled scroll in its colour, 18x22. */
  private makeItemIcons() {
    for (const [id, it] of Object.entries(ITEMS)) {
      if (this.textures.exists(itemKey(id))) continue;
      const c = Phaser.Display.Color.HexStringToColor(it.color).color;
      const dark = Phaser.Display.Color.ValueToColor(c).darken(35).color;
      const light = Phaser.Display.Color.ValueToColor(c).lighten(20).color;
      const g = this.make.graphics({}, false);
      g.fillStyle(0x1c1b29).fillRect(3, 3, 12, 16).fillRect(1, 1, 16, 5).fillRect(1, 16, 16, 5);
      g.fillStyle(c).fillRect(4, 5, 10, 12);
      g.fillStyle(light).fillRect(4, 5, 2, 12);
      g.fillStyle(dark).fillRect(2, 2, 14, 3).fillRect(2, 17, 14, 3);
      g.fillStyle(light).fillRect(3, 2, 12, 1).fillRect(3, 17, 12, 1);
      g.fillStyle(0xc2502f).fillRect(8, 9, 2, 4);
      g.generateTexture(itemKey(id), 18, 22);
      g.destroy();
    }
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
