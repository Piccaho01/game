import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { ABILITIES, BESTIARY, SPECIES, TYPES } from '../engine/data';
import { CHARACTERS, newProgress, STARTERS, type CharacterId } from '../engine/progress';
import { saveProgress } from '../save';
import { button, buttonPagePoint, chip, hinge, menuBackdrop, panel, patchPortrait, pxRect, screenBackdrop, tapeLabel } from '../ui/kit';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { frontKey, idleAnimKey } from './BootScene';

type Step = 'leader' | 'starter';
const BOTTOM = SCREEN_H;

/** New game: pick who leads (bible §6), then any starter (§13). Top screen shows the pick. */
export class NewGameScene extends Phaser.Scene {
  private step: Step = 'leader';
  private leader: CharacterId | null = null;
  private starter: string | null = null;
  private top!: Phaser.GameObjects.Container;
  private bottom!: Phaser.GameObjects.Container;

  constructor() { super('newgame'); }

  create() {
    this.step = 'leader';
    this.leader = null;
    this.starter = null;
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    menuBackdrop(this);
    panel(this, 6, 8, SCREEN_W - 12, SCREEN_H - 19, 'paper');
    screenBackdrop(this, BOTTOM);
    hinge(this);
    this.top = this.add.container(0, 0);
    this.bottom = this.add.container(0, BOTTOM);
    this.render();
    (window as unknown as Record<string, unknown>).__newgame = {
      step: () => this.step,
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
  }

  private render() {
    this.top.removeAll(true);
    this.bottom.removeAll(true);
    if (this.step === 'leader') this.renderLeader();
    else this.renderStarter();
  }

  private renderLeader() {
    const ids = Object.keys(CHARACTERS) as CharacterId[];
    this.bottom.add(pixelText(this, 128, 12, "Who's leading?", { color: TEXT_COLORS.light, size: TEXT_SIZE.heading, shadow: '#000000' }).setOrigin(0.5, 0));
    ids.forEach((id, i) => {
      const c = CHARACTERS[id];
      this.bottom.add(button(this, 66 + (i % 2) * 124, 52 + Math.floor(i / 2) * 50, 118, 42, c.name, shade(hexToNum(c.color), -0.25),
        () => { this.leader = id; this.render(); }, { sub: c.role, name: `char-${id}`, selected: this.leader === id }));
    });
    if (this.leader) this.bottom.add(button(this, 128, 168, 160, 30, 'LEAD THE WAY', TONES.go, () => { this.step = 'starter'; this.render(); }, { name: 'confirm' }));

    if (!this.leader) {
      this.top.add(tapeLabel(this, 14, 2, 'PATCH'));
      this.top.add(patchPortrait(this, 128, 52));
      this.top.add(pixelText(this, 128, 120, "This is your mess.\nOne of you leads the cleanup.\nThe others wait at the sanctuary.\n\nI'm working on a fix.", { size: TEXT_SIZE.small }).setOrigin(0.5).setAlign('center'));
      return;
    }
    const c = CHARACTERS[this.leader];
    const color = hexToNum(c.color);
    this.top.add(tapeLabel(this, 14, 2, 'LEADER'));
    // Placeholder portrait until the M4 trainer sprites: a card in their outfit colour.
    const portrait = this.add.graphics();
    pxRect(portrait, 17, 21, 64, 80, COLORS.ink, 3);
    pxRect(portrait, 18, 22, 62, 78, color, 2);
    portrait.fillStyle(shade(color, -0.25)).fillRect(18, 78, 62, 20);
    portrait.fillStyle(shade(color, 0.3)).fillRect(20, 23, 58, 1);
    this.top.add([portrait, pixelText(this, 49, 58, c.name[0], { color: TEXT_COLORS.light, size: 24, shadow: '#000000' }).setOrigin(0.5)]);
    this.top.add(pixelText(this, 92, 20, c.name, { size: TEXT_SIZE.heading }));
    this.top.add(pixelText(this, 92, 35, c.role, { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small }));
    this.top.add(chip(this, 92, 48, `Assist: ${c.assist.name}`, TONES.patch));
    this.top.add(pixelText(this, 92, 62, c.assist.desc, { size: TEXT_SIZE.small, wrap: 148 }));
    this.top.add(pixelText(this, 92, 88, c.field, { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small, wrap: 148 }));
    this.top.add(pixelText(this, 18, 124, `"${c.line}"`, { color: TEXT_COLORS.rust, size: TEXT_SIZE.small, wrap: 220 }));
  }

  private renderStarter() {
    this.bottom.add(pixelText(this, 128, 12, 'Pick a starter', { color: TEXT_COLORS.light, size: TEXT_SIZE.heading, shadow: '#000000' }).setOrigin(0.5, 0));
    STARTERS.forEach((id, i) => {
      const sp = SPECIES[id];
      this.bottom.add(button(this, 66 + (i % 2) * 124, 52 + Math.floor(i / 2) * 50, 118, 42, sp.name, shade(hexToNum(TYPES[sp.types[0]].color), -0.3),
        () => { this.starter = id; this.render(); }, { sub: sp.types.map((t) => TYPES[t].name).join('/'), name: `starter-${id}`, selected: this.starter === id }));
    });
    this.bottom.add(button(this, 56, 168, 88, 30, 'BACK', TONES.neutral, () => { this.step = 'leader'; this.starter = null; this.render(); }, { name: 'back' }));
    if (this.starter) this.bottom.add(button(this, 170, 168, 140, 30, `CHOOSE ${SPECIES[this.starter].name.toUpperCase()}`, TONES.go, () => this.begin(), { name: 'confirm' }));

    this.top.add(tapeLabel(this, 14, 2, 'STARTER'));
    if (!this.starter) {
      this.top.add(pixelText(this, 128, 92, `${CHARACTERS[this.leader!].name}, pick a partner.\nAny of them. They don't bite.\n(One of them bites.)`, { size: TEXT_SIZE.small }).setOrigin(0.5).setAlign('center'));
      return;
    }
    const sp = SPECIES[this.starter];
    this.top.add(panel(this, 14, 114, 76, 12, 'metal'));
    const s = this.add.sprite(52, 120, frontKey(this.starter)).setOrigin(0.5, 1);
    if (this.anims.exists(idleAnimKey(this.starter))) s.play(idleAnimKey(this.starter));
    this.top.add(s);
    this.top.add(pixelText(this, 100, 20, sp.name, { size: TEXT_SIZE.heading }));
    sp.types.forEach((t, i) => this.top.add(chip(this, 100 + i * 38, 34, TYPES[t].name, shade(hexToNum(TYPES[t].color), -0.2))));
    this.top.add(pixelText(this, 100, 48, `Ability: ${ABILITIES[sp.ability].name}`, { color: TEXT_COLORS.rust, size: TEXT_SIZE.small }));
    this.top.add(pixelText(this, 100, 62, BESTIARY[this.starter].sighted, { size: TEXT_SIZE.small, wrap: 140 }));
  }

  private begin() {
    if (!this.leader || !this.starter) return;
    const progress = newProgress(this.starter, this.leader);
    saveProgress(progress);
    this.registry.set('progress', progress);
    // Out into Hollow Rest (PATCH's intro comes before this in M4 step 5).
    this.scene.start('overworld');
  }
}
