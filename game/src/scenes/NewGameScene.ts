import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { ABILITIES, BESTIARY, SPECIES, TYPES } from '../engine/data';
import { CHARACTERS, newProgress, STARTERS, type CharacterId } from '../engine/progress';
import { saveProgress } from '../save';
import { pixelText } from '../ui/text';
import { button } from '../ui/widgets';
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
    const g = this.add.graphics();
    g.fillStyle(0x203048).fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.fillStyle(0x2a3c58).fillRoundedRect(6, 6, SCREEN_W - 12, SCREEN_H - 12, 6);
    g.fillStyle(0x282838).fillRect(0, BOTTOM, SCREEN_W, SCREEN_H);
    g.fillStyle(0x101018).fillRect(0, BOTTOM - 2, SCREEN_W, 4);
    this.top = this.add.container(0, 0);
    this.bottom = this.add.container(0, BOTTOM);
    this.render();
    (window as unknown as Record<string, unknown>).__newgame = {
      step: () => this.step,
      buttonAt: (name: string) => {
        const obj = this.bottom.list.find((o) => (o as Phaser.GameObjects.Container).name === name) as Phaser.GameObjects.Container | undefined;
        if (!obj) return null;
        const rect = this.game.canvas.getBoundingClientRect();
        const sx = rect.width / this.game.canvas.width;
        const sy = rect.height / this.game.canvas.height;
        return { x: rect.left + obj.x * ZOOM * sx, y: rect.top + (obj.y + BOTTOM) * ZOOM * sy };
      },
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
    this.bottom.add(pixelText(this, 128, 12, "Who's leading?", { color: '#ffffff', size: 10 }).setOrigin(0.5, 0));
    ids.forEach((id, i) => {
      const c = CHARACTERS[id];
      const color = this.leader === id ? 0x9050c0 : Phaser.Display.Color.HexStringToColor(c.color).darken(20).color;
      this.bottom.add(button(this, 66 + (i % 2) * 124, 52 + Math.floor(i / 2) * 50, 118, 42, c.name, color,
        () => { this.leader = id; this.render(); }, { sub: c.role, name: `char-${id}` }));
    });
    if (this.leader) this.bottom.add(button(this, 128, 168, 160, 30, 'LEAD THE WAY', 0x40a060, () => { this.step = 'starter'; this.render(); }, { name: 'confirm' }));

    if (!this.leader) {
      this.top.add(pixelText(this, 128, 40, 'PATCH', { color: '#a0e8ff', size: 10 }).setOrigin(0.5));
      this.top.add(pixelText(this, 128, 88, "This is your mess.\nOne of you leads the cleanup.\nThe others wait at the sanctuary.\n\nI'm working on a fix.", { color: '#ffffff', size: 6 }).setOrigin(0.5).setAlign('center'));
      return;
    }
    const c = CHARACTERS[this.leader];
    // Placeholder portrait until the M4 trainer sprites.
    const portrait = this.add.graphics();
    portrait.fillStyle(0x101018).fillRoundedRect(17, 33, 62, 78, 6);
    portrait.fillStyle(Phaser.Display.Color.HexStringToColor(c.color).color).fillRoundedRect(18, 34, 60, 76, 5);
    this.top.add([portrait, pixelText(this, 48, 72, c.name[0], { color: '#ffffff', size: 24, shadow: '#000000' }).setOrigin(0.5)]);
    this.top.add(pixelText(this, 92, 18, c.name, { color: '#ffffff', size: 10, shadow: '#000000' }));
    this.top.add(pixelText(this, 92, 34, c.role, { color: '#a0e8ff', size: 6 }));
    this.top.add(pixelText(this, 92, 50, `Assist: ${c.assist.name}`, { color: '#f0e0a0', size: 6 }));
    this.top.add(pixelText(this, 92, 62, c.assist.desc, { color: '#ffffff', size: 6, wrap: 150 }));
    this.top.add(pixelText(this, 92, 88, c.field, { color: '#c0c8e0', size: 6, wrap: 150 }));
    this.top.add(pixelText(this, 18, 134, `"${c.line}"`, { color: '#ffffff', size: 6, wrap: 220 }));
  }

  private renderStarter() {
    this.bottom.add(pixelText(this, 128, 12, 'Pick a starter', { color: '#ffffff', size: 10 }).setOrigin(0.5, 0));
    STARTERS.forEach((id, i) => {
      const sp = SPECIES[id];
      const color = this.starter === id ? 0x9050c0 : Phaser.Display.Color.HexStringToColor(TYPES[sp.types[0]].color).darken(28).color;
      this.bottom.add(button(this, 66 + (i % 2) * 124, 52 + Math.floor(i / 2) * 50, 118, 42, sp.name, color,
        () => { this.starter = id; this.render(); }, { sub: sp.types.map((t) => TYPES[t].name).join('/'), name: `starter-${id}` }));
    });
    this.bottom.add(button(this, 56, 168, 88, 30, 'BACK', 0x505060, () => { this.step = 'leader'; this.starter = null; this.render(); }, { name: 'back' }));
    if (this.starter) this.bottom.add(button(this, 170, 168, 140, 30, `CHOOSE ${SPECIES[this.starter].name.toUpperCase()}`, 0x40a060, () => this.begin(), { name: 'confirm' }));

    if (!this.starter) {
      this.top.add(pixelText(this, 128, 96, `${CHARACTERS[this.leader!].name}, pick a partner.\nAny of them. They don't bite.\n(One of them bites.)`, { color: '#ffffff', size: 6 }).setOrigin(0.5).setAlign('center'));
      return;
    }
    const sp = SPECIES[this.starter];
    const s = this.add.sprite(52, 120, frontKey(this.starter)).setOrigin(0.5, 1);
    if (this.anims.exists(idleAnimKey(this.starter))) s.play(idleAnimKey(this.starter));
    this.top.add(s);
    this.top.add(pixelText(this, 104, 18, sp.name, { color: '#ffffff', size: 10, shadow: '#000000' }));
    this.top.add(pixelText(this, 104, 34, sp.types.map((t) => TYPES[t].name).join('/'), { color: '#a0e8ff', size: 6 }));
    this.top.add(pixelText(this, 104, 46, `Ability: ${ABILITIES[sp.ability].name}`, { color: '#f0e0a0', size: 6 }));
    this.top.add(pixelText(this, 104, 62, BESTIARY[this.starter].sighted, { color: '#ffffff', size: 6, wrap: 140 }));
  }

  private begin() {
    if (!this.leader || !this.starter) return;
    const progress = newProgress(this.starter, this.leader);
    saveProgress(progress);
    this.registry.set('progress', progress);
    // First wild battle: a Route 1 common.
    this.scene.start('battle', { foe: 'fledjet' });
  }
}
