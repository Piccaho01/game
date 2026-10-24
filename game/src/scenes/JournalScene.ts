import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { SPECIES, TYPES } from '../engine/data';
import { CHARACTERS, leaderTeam, loreOf, sanctuaryPoints, SQUAD, stageOf, STAGES, TEAM_SIZE, type CharacterId, type Progress, type Stage } from '../engine/progress';
import type { Bond } from '../engine/seal';
import { saveProgress } from '../save';
import { button, buttonPagePoint, chip, emptySlot, hinge, menuBackdrop, panel, screenBackdrop, tapeLabel } from '../ui/kit';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { frontKey, idleAnimKey } from './BootScene';

type Tab = 'team' | 'bestiary';
const BOTTOM = SCREEN_H;
/** Bestiary entries per page on the touch screen: 3 columns, 4 rows. */
const DEX_PER_PAGE = 12;
const STAGE_NAMES: Record<Stage, string> = { sighted: 'Sighted', tracked: 'Tracked', studied: 'Studied', sealed: 'Sealed', bonded: 'Bonded' };
const BOND_NAMES: Record<Bond, string> = { strong: 'Strong bond', steady: 'Steady bond', wary: 'Wary' };

/** The four teams and the bestiary. Top screen: the selected Patchling; bottom screen: the lists. */
export class JournalScene extends Phaser.Scene {
  private progress!: Progress;
  private foe = 'sprigby';
  private tab: Tab = 'team';
  private top!: Phaser.GameObjects.Container;
  private bottom!: Phaser.GameObjects.Container;
  private selected: string | number | null = null;
  /** Whose team the TEAM tab shows (the leader's first). */
  private viewing: CharacterId = 'callum';
  private loreIndex = 0;
  private dexPage = 0;

  constructor() { super('journal'); }

  /** Where BACK goes: the overworld, or the test battle it came from. */
  private from: 'overworld' | 'battle' = 'battle';

  init(data: { foe?: string; tab?: Tab; from?: 'overworld' }) {
    this.foe = data.foe ?? 'sprigby';
    this.from = data.from ?? 'battle';
    this.tab = data.tab ?? 'team';
    this.selected = null;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.progress = this.registry.get('progress') as Progress;
    this.viewing = this.progress.leader;
    menuBackdrop(this);
    panel(this, 6, 8, SCREEN_W - 12, SCREEN_H - 19, 'paper');
    screenBackdrop(this, BOTTOM);
    hinge(this);
    this.top = this.add.container(0, 0);
    this.bottom = this.add.container(0, BOTTOM);
    this.render();
    (window as unknown as Record<string, unknown>).__journal = {
      tab: () => this.tab,
      team: () => leaderTeam(this.progress).map((m) => m.species),
      viewing: () => this.viewing,
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
  }

  private render() {
    this.bottom.removeAll(true);
    const tabBtn = (x: number, t: Tab, label: string) =>
      button(this, x, 16, 120, 24, label, this.tab === t ? TONES.seal : TONES.neutral, () => { this.tab = t; this.selected = null; this.render(); }, { name: `tab-${t}`, selected: this.tab === t });
    this.bottom.add([tabBtn(66, 'team', 'TEAM'), tabBtn(190, 'bestiary', 'BESTIARY')]);
    if (this.tab === 'team') this.renderTeam();
    else this.renderBestiary();
    this.bottom.add(button(this, 66, 172, 120, 28, 'BACK', TONES.neutral, () => (this.from === 'overworld' ? this.scene.start('overworld') : this.scene.start('battle', { foe: this.foe })), { name: 'back' }));
    this.renderTop();
  }

  private renderTeam() {
    const p = this.progress;
    // Whose team: one tab per friend, the leader marked.
    SQUAD.forEach((c, i) => {
      const ch = CHARACTERS[c];
      this.bottom.add(button(this, 35 + i * 62, 42, 58, 16, c === p.leader ? `${ch.name}*` : ch.name, this.viewing === c ? shade(hexToNum(ch.color), -0.25) : TONES.neutral,
        () => { this.viewing = c; this.selected = null; this.render(); }, { size: TEXT_SIZE.small, name: `team-${c}`, selected: this.viewing === c }));
    });
    const team = p.teams[this.viewing];
    for (let i = 0; i < TEAM_SIZE; i++) {
      const m = team[i];
      const x = 66 + (i % 2) * 124;
      const y = 70 + Math.floor(i / 2) * 29;
      if (!m) {
        this.bottom.add(emptySlot(this, x, y, 118, 24));
        continue;
      }
      const color = shade(hexToNum(TYPES[SPECIES[m.species].types[0]].color), -0.3);
      this.bottom.add(button(this, x, y, 118, 24, `${SPECIES[m.species].name} Lv${m.level}`, color,
        () => { this.selected = m.uid; this.render(); }, { sub: i === 0 ? 'LEAD' : BOND_NAMES[m.bond], name: `member${i}`, selected: this.selected === m.uid }));
    }
    this.bottom.add(pixelText(this, 128, 154, `Sanctuary: ${p.sanctuary.length} Patchling${p.sanctuary.length === 1 ? '' : 's'}  ${sanctuaryPoints(p)} pts`, { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0.5));
    const sel = team.findIndex((m) => m.uid === this.selected);
    if (sel > 0) {
      this.bottom.add(button(this, 190, 172, 120, 28, 'MAKE LEAD', TONES.go, () => {
        const [m] = team.splice(sel, 1);
        team.unshift(m);
        saveProgress(p);
        this.render();
      }, { name: 'lead' }));
    }
  }

  private renderBestiary() {
    const ids = Object.keys(SPECIES).sort((a, b) => SPECIES[a].dex - SPECIES[b].dex);
    const pages = Math.ceil(ids.length / DEX_PER_PAGE);
    this.dexPage = Math.min(this.dexPage, pages - 1);
    ids.slice(this.dexPage * DEX_PER_PAGE, (this.dexPage + 1) * DEX_PER_PAGE).forEach((id, i) => {
      const stage = stageOf(this.progress.bestiary[id]);
      const x = 46 + (i % 3) * 82;
      const y = 46 + Math.floor(i / 3) * 28;
      const dex = `#${String(SPECIES[id].dex).padStart(3, '0')}`;
      this.bottom.add(button(this, x, y, 78, 24, stage ? SPECIES[id].name : '???', stage ? TONES.patch : COLORS.metalLight,
        () => { this.loreIndex = this.selected === id ? this.loreIndex + 1 : 0; this.selected = id; this.render(); },
        { sub: stage ? STAGE_NAMES[stage] : dex, name: `dex-${id}`, selected: this.selected === id }));
    });
    const seen = ids.filter((id) => stageOf(this.progress.bestiary[id])).length;
    this.bottom.add(pixelText(this, 128, 154, `${seen}/${ids.length} seen   page ${this.dexPage + 1}/${pages}`, { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0.5));
    const turn = (d: number) => () => { this.dexPage = (this.dexPage + d + pages) % pages; this.render(); };
    this.bottom.add(button(this, 164, 172, 48, 28, '<', TONES.neutral, turn(-1), { name: 'dex-prev' }));
    this.bottom.add(button(this, 222, 172, 48, 28, '>', TONES.neutral, turn(1), { name: 'dex-next' }));
  }

  private renderTop() {
    this.top.removeAll(true);
    this.top.add(tapeLabel(this, 14, 2, this.tab === 'team' ? `${CHARACTERS[this.viewing].name.toUpperCase()}'S TEAM` : 'BESTIARY'));
    const member = typeof this.selected === 'number' ? this.progress.teams[this.viewing].find((m) => m.uid === this.selected) : undefined;
    const species = typeof this.selected === 'number'
      ? member?.species
      : this.selected ?? undefined;
    if (!species) {
      const hint = this.tab === 'team' ? 'Tap a Patchling.' : 'Tap an entry to read it.\nTap again for the next page.';
      this.top.add(pixelText(this, 128, 92, hint, { color: TEXT_COLORS.inkSoft }).setOrigin(0.5).setAlign('center'));
      return;
    }
    const sp = SPECIES[species];
    const stage = stageOf(this.progress.bestiary[species]);
    const seen = this.tab === 'team' || !!stage;
    // The Patchling stands on a little metal plinth on the left of the card.
    this.top.add(panel(this, 14, 112, 76, 12, 'metal'));
    const sprite = this.add.sprite(52, 118, frontKey(species)).setOrigin(0.5, 1);
    if (seen && this.anims.exists(idleAnimKey(species))) sprite.play(idleAnimKey(species));
    if (!seen) sprite.setTintFill(COLORS.ink);
    this.top.add(sprite);
    this.top.add(pixelText(this, 100, 18, seen ? sp.name : '???', { size: TEXT_SIZE.heading }));
    this.top.add(pixelText(this, 100, 33, `#${String(sp.dex).padStart(3, '0')}`, { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small }));
    if (seen) sp.types.forEach((t, i) => this.top.add(chip(this, 132 + i * 38, 32, TYPES[t].name, shade(hexToNum(TYPES[t].color), -0.2))));
    if (member) this.top.add(pixelText(this, 100, 46, `Lv${member.level}  ${BOND_NAMES[member.bond]}`, { color: TEXT_COLORS.rust, size: TEXT_SIZE.small }));
    const lore = loreOf(this.progress, species);
    if (lore.length) {
      const page = lore[this.loreIndex % lore.length];
      this.top.add(pixelText(this, 100, 60, `${STAGE_NAMES[page.stage]} (${(this.loreIndex % lore.length) + 1}/${lore.length})`, { color: TEXT_COLORS.rust, size: TEXT_SIZE.small }));
      this.top.add(pixelText(this, 100, 74, page.text, { size: TEXT_SIZE.small, wrap: 140 }));
    } else {
      this.top.add(pixelText(this, 100, 74, seen ? 'No entry yet.' : 'Not seen yet.', { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small, wrap: 140 }));
    }
    // Stage track: which of the five stages this entry has reached.
    STAGES.forEach((_, i) => {
      const on = stage && STAGES.indexOf(stage) >= i;
      const g = this.add.graphics();
      g.fillStyle(COLORS.ink).fillRect(15 + i * 15, 136, 13, 7);
      g.fillStyle(on ? TONES.patch : COLORS.paperShade).fillRect(16 + i * 15, 137, 11, 5);
      this.top.add(g);
    });
    this.top.add(pixelText(this, 15, 147, stage ? STAGE_NAMES[stage] : 'Not seen', { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.tiny }));
  }
}
