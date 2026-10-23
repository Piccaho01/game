import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { SPECIES, TYPES } from '../engine/data';
import { loreOf, sanctuaryPoints, stageOf, STAGES, TEAM_SIZE, type Progress, type Stage } from '../engine/progress';
import type { Bond } from '../engine/seal';
import { saveProgress } from '../save';
import { pixelText } from '../ui/text';
import { button } from '../ui/widgets';
import { frontKey, idleAnimKey } from './BootScene';

type Tab = 'team' | 'bestiary';
const BOTTOM = SCREEN_H;
const STAGE_NAMES: Record<Stage, string> = { sighted: 'Sighted', tracked: 'Tracked', studied: 'Studied', sealed: 'Sealed', bonded: 'Bonded' };
const BOND_NAMES: Record<Bond, string> = { strong: 'Strong bond', steady: 'Steady bond', wary: 'Wary' };

/** The team and the bestiary. Top screen: the selected Patchling; bottom screen: the lists. */
export class JournalScene extends Phaser.Scene {
  private progress!: Progress;
  private foe = 'sprigby';
  private tab: Tab = 'team';
  private top!: Phaser.GameObjects.Container;
  private bottom!: Phaser.GameObjects.Container;
  private selected: string | number | null = null;
  private loreIndex = 0;

  constructor() { super('journal'); }

  init(data: { foe?: string; tab?: Tab }) {
    this.foe = data.foe ?? 'sprigby';
    this.tab = data.tab ?? 'team';
    this.selected = null;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.progress = this.registry.get('progress') as Progress;
    const g = this.add.graphics();
    g.fillStyle(0x30284a).fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.fillStyle(0x3a3258).fillRoundedRect(6, 6, SCREEN_W - 12, SCREEN_H - 12, 6);
    g.fillStyle(0x282838).fillRect(0, BOTTOM, SCREEN_W, SCREEN_H);
    g.fillStyle(0x101018).fillRect(0, BOTTOM - 2, SCREEN_W, 4);
    this.top = this.add.container(0, 0);
    this.bottom = this.add.container(0, BOTTOM);
    this.render();
    (window as unknown as Record<string, unknown>).__journal = { tab: () => this.tab, team: () => this.progress.team.map((m) => m.species) };
  }

  private render() {
    this.bottom.removeAll(true);
    const tabBtn = (x: number, t: Tab, label: string) =>
      button(this, x, 16, 120, 24, label, this.tab === t ? 0x9050c0 : 0x505060, () => { this.tab = t; this.selected = null; this.render(); }, { name: `tab-${t}` });
    this.bottom.add([tabBtn(66, 'team', 'TEAM'), tabBtn(190, 'bestiary', 'BESTIARY')]);
    if (this.tab === 'team') this.renderTeam();
    else this.renderBestiary();
    this.bottom.add(button(this, 66, 172, 120, 28, 'BACK', 0x505060, () => this.scene.start('battle', { foe: this.foe }), { name: 'back' }));
    this.renderTop();
  }

  private renderTeam() {
    const p = this.progress;
    for (let i = 0; i < TEAM_SIZE; i++) {
      const m = p.team[i];
      const x = 66 + (i % 2) * 124;
      const y = 50 + Math.floor(i / 2) * 36;
      if (!m) {
        this.bottom.add(button(this, x, y, 118, 30, '-', 0x383848));
        continue;
      }
      const color = Phaser.Display.Color.HexStringToColor(TYPES[SPECIES[m.species].types[0]].color).darken(28).color;
      this.bottom.add(button(this, x, y, 118, 30, `${SPECIES[m.species].name} Lv${m.level}`, this.selected === m.uid ? 0x9050c0 : color,
        () => { this.selected = m.uid; this.render(); }, { sub: i === 0 ? 'LEAD' : BOND_NAMES[m.bond], name: `member${i}` }));
    }
    this.bottom.add(pixelText(this, 128, 154, `Sanctuary: ${p.sanctuary.length} Patchling${p.sanctuary.length === 1 ? '' : 's'}  ${sanctuaryPoints(p)} pts`, { color: '#c0b0e0', size: 6 }).setOrigin(0.5));
    const sel = p.team.findIndex((m) => m.uid === this.selected);
    if (sel > 0) {
      this.bottom.add(button(this, 190, 172, 120, 28, 'MAKE LEAD', 0x40a060, () => {
        const [m] = p.team.splice(sel, 1);
        p.team.unshift(m);
        saveProgress(p);
        this.render();
      }, { name: 'lead' }));
    }
  }

  private renderBestiary() {
    const ids = Object.keys(SPECIES).sort((a, b) => SPECIES[a].dex - SPECIES[b].dex);
    ids.forEach((id, i) => {
      const stage = stageOf(this.progress.bestiary[id]);
      const x = 46 + (i % 3) * 82;
      const y = 46 + Math.floor(i / 3) * 28;
      const dex = `#${String(SPECIES[id].dex).padStart(3, '0')}`;
      this.bottom.add(button(this, x, y, 78, 24, stage ? SPECIES[id].name : '???', this.selected === id ? 0x9050c0 : stage ? 0x4a5878 : 0x383848,
        () => { this.loreIndex = this.selected === id ? this.loreIndex + 1 : 0; this.selected = id; this.render(); },
        { sub: stage ? STAGE_NAMES[stage] : dex, name: `dex-${id}` }));
    });
    const seen = ids.filter((id) => stageOf(this.progress.bestiary[id])).length;
    this.bottom.add(pixelText(this, 190, 172, `${seen}/${ids.length} seen`, { color: '#c0b0e0', size: 6 }).setOrigin(0.5));
  }

  private renderTop() {
    this.top.removeAll(true);
    const species = typeof this.selected === 'number'
      ? this.progress.team.find((m) => m.uid === this.selected)?.species
      : this.selected ?? undefined;
    if (!species) {
      const hint = this.tab === 'team' ? 'Tap a Patchling.' : 'Tap an entry to read it.\nTap again for the next page.';
      this.top.add(pixelText(this, 128, 96, hint, { color: '#d0c8f0', size: 8 }).setOrigin(0.5).setAlign('center'));
      return;
    }
    const sp = SPECIES[species];
    const stage = stageOf(this.progress.bestiary[species]);
    const seen = this.tab === 'team' || !!stage;
    const sprite = this.add.sprite(52, 118, frontKey(species)).setOrigin(0.5, 1);
    if (seen && this.anims.exists(idleAnimKey(species))) sprite.play(idleAnimKey(species));
    if (!seen) sprite.setTintFill(0x101018);
    this.top.add(sprite);
    this.top.add(pixelText(this, 104, 16, seen ? sp.name : '???', { color: '#ffffff', size: 10, shadow: '#000000' }));
    this.top.add(pixelText(this, 104, 32, `#${String(sp.dex).padStart(3, '0')}  ${seen ? sp.types.map((t) => TYPES[t].name).join('/') : '???'}`, { color: '#c0b0e0', size: 6 }));
    const member = typeof this.selected === 'number' ? this.progress.team.find((m) => m.uid === this.selected) : undefined;
    if (member) this.top.add(pixelText(this, 104, 44, `Lv${member.level}  ${BOND_NAMES[member.bond]}`, { color: '#f0e0a0', size: 6 }));
    const lore = loreOf(this.progress, species);
    if (lore.length) {
      const page = lore[this.loreIndex % lore.length];
      this.top.add(pixelText(this, 104, 58, `${STAGE_NAMES[page.stage]} (${(this.loreIndex % lore.length) + 1}/${lore.length})`, { color: '#a0e8ff', size: 6 }));
      this.top.add(pixelText(this, 104, 72, page.text, { color: '#ffffff', size: 6, wrap: 140 }));
    } else {
      this.top.add(pixelText(this, 104, 72, seen ? 'No entry yet.' : 'Not seen yet.', { color: '#a0a0c0', size: 6, wrap: 140 }));
    }
    // Stage track: which of the five stages this entry has reached.
    STAGES.forEach((_, i) => {
      const on = stage && STAGES.indexOf(stage) >= i;
      this.top.add(this.add.rectangle(16 + i * 18, 170, 14, 6, on ? 0xa0e8ff : 0x505070).setOrigin(0, 0.5));
    });
  }
}
