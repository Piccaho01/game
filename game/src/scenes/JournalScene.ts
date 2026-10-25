import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { SPECIES, TYPES } from '../engine/data';
import { CHARACTERS, leaderTeam, loreOf, partyMode, sanctuaryPoints, SQUAD, stageOf, STAGES, TEAM_SIZE, type CharacterId, type Progress, type Stage } from '../engine/progress';
import type { Bond } from '../engine/seal';
import { saveProgress } from '../save';
import { button, buttonPagePoint, chip, emptySlot, faceIcon, hinge, listRow, menuBackdrop, monIcon, panel, screenBackdrop, tabs, tapeLabel } from '../ui/kit';
import { createBattler } from '../engine/battler';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { frontKey, idleAnimKey, itemKey, walkKey } from './BootScene';
import { count, ITEMS, scrollsInBag } from '../engine/items';
import { isMuted, setMuted } from '../ui/sfx';

type Tab = 'team' | 'bestiary' | 'bag' | 'options';
const BOTTOM = SCREEN_H;
/** Bestiary entries per page on the touch screen: 3 columns, 4 rows. */
const DEX_PER_PAGE = 12;
const STAGE_NAMES: Record<Stage, string> = { sighted: 'Sighted', tracked: 'Tracked', studied: 'Studied', sealed: 'Sealed', bonded: 'Bonded' };
const BOND_NAMES: Record<Bond, string> = { strong: 'Strong bond', steady: 'Steady bond', wary: 'Wary' };

/** The four teams, the bestiary and the options. Top screen: the selected Patchling; bottom screen: the lists. */
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
    // Every screen eases in.
    this.cameras.main.fadeIn(180, 16, 16, 24);
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
      party: () => partyMode(this.progress),
      viewing: () => this.viewing,
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
  }

  private render() {
    this.bottom.removeAll(true);
    this.bottom.add(tabs<Tab>(this, 128, 15, 240, [{ id: 'team', label: 'TEAM' }, { id: 'bestiary', label: 'BESTIARY' }, { id: 'bag', label: 'BAG' }, { id: 'options', label: 'OPTIONS' }],
      this.tab, (t) => { this.tab = t; this.selected = null; this.render(); }, TONES.seal));
    if (this.tab === 'team') this.renderTeam();
    else if (this.tab === 'bestiary') this.renderBestiary();
    else if (this.tab === 'bag') this.renderBag();
    else this.renderOptions();
    this.bottom.add(button(this, 66, 172, 120, 28, 'BACK', TONES.neutral, () => (this.from === 'overworld' ? this.scene.start('overworld') : this.scene.start('battle', { foe: this.foe })), { name: 'back' }));
    this.renderTop();
  }

  private renderTeam() {
    const p = this.progress;
    // Whose team: one tab per friend, the leader marked.
    SQUAD.forEach((c, i) => {
      const ch = CHARACTERS[c];
      this.bottom.add(listRow(this, 35 + i * 62, 42, 58, 20, {
        title: ch.name, color: this.viewing === c ? shade(hexToNum(ch.color), -0.2) : TONES.neutral, icon: faceIcon(walkKey(c)),
        onTap: () => { this.viewing = c; this.selected = null; this.render(); }, name: `team-${c}`, selected: this.viewing === c,
      }));
    });
    const team = p.teams[this.viewing];
    for (let i = 0; i < TEAM_SIZE; i++) {
      const m = team[i];
      const x = 66 + (i % 2) * 124;
      const y = 72 + Math.floor(i / 2) * 29;
      if (!m) {
        this.bottom.add(emptySlot(this, x, y, 118, 25));
        continue;
      }
      const color = shade(hexToNum(TYPES[SPECIES[m.species].types[0]].color), -0.3);
      const max = createBattler(m.species, m.level, undefined, m.bond).stats.hp;
      const hp = m.hp ?? max;
      this.bottom.add(listRow(this, x, y, 118, 26, {
        title: SPECIES[m.species].name, right: `Lv${m.level}`, color, icon: monIcon(frontKey(m.species)),
        meter: { frac: hp / max, color: hp / max > 0.5 ? 0x5fe0a8 : hp / max > 0.2 ? 0xf2c14e : 0xff6a5a },
        onTap: () => { this.selected = m.uid; this.render(); }, name: `member${i}`, selected: this.selected === m.uid,
      }));
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

  /** The bag (shared by the four): seal scrolls with counts; tap one to read it. */
  private renderBag() {
    const ids = scrollsInBag(this.progress);
    if (!ids.length) this.bottom.add(pixelText(this, 128, 80, 'The bag is empty.\nPATCH tops up Seal Scrolls when he heals you.', { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0.5).setAlign('center'));
    ids.slice(0, 10).forEach((id, i) => {
      const it = ITEMS[id];
      this.bottom.add(listRow(this, 66 + (i % 2) * 124, 42 + Math.floor(i / 2) * 26, 118, 23, {
        title: it.name.replace(' Scroll', ''), titleSize: it.name.length > 16 ? TEXT_SIZE.tiny : TEXT_SIZE.small, right: `x${count(this.progress, id)}`, color: shade(hexToNum(it.color), -0.45),
        icon: { key: itemKey(id) }, onTap: () => { this.selected = id; this.render(); }, name: `item-${id}`, selected: this.selected === id,
      }));
    });
  }

  /** Options: who shows on the map (all four or just you), and sound. */
  private renderOptions() {
    const p = this.progress;
    const party = partyMode(p);
    const head = { color: TEXT_COLORS.dim, size: TEXT_SIZE.small };
    this.bottom.add(pixelText(this, 128, 38, 'Who walks with you on the map', head).setOrigin(0.5, 0));
    const setParty = (m: 'squad' | 'solo') => () => { p.settings = { ...p.settings, party: m }; saveProgress(p); this.render(); };
    this.bottom.add(button(this, 66, 72, 118, 34, 'SQUAD', party === 'squad' ? TONES.go : TONES.neutral, setParty('squad'), { sub: 'All four friends', name: 'opt-squad', selected: party === 'squad' }));
    this.bottom.add(button(this, 190, 72, 118, 34, 'SOLO', party === 'solo' ? TONES.go : TONES.neutral, setParty('solo'), { sub: 'You + your Patchling', name: 'opt-solo', selected: party === 'solo' }));
    this.bottom.add(pixelText(this, 128, 98, 'Sound effects', head).setOrigin(0.5, 0));
    const muted = isMuted();
    const setSound = (on: boolean) => () => { setMuted(!on); this.render(); };
    this.bottom.add(button(this, 66, 128, 118, 28, 'ON', !muted ? TONES.go : TONES.neutral, setSound(true), { name: 'opt-sound-on', selected: !muted }));
    this.bottom.add(button(this, 190, 128, 118, 28, 'OFF', muted ? TONES.go : TONES.neutral, setSound(false), { name: 'opt-sound-off', selected: muted }));
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
      this.bottom.add(listRow(this, x, y, 78, 25, {
        title: stage ? SPECIES[id].name : '???', titleSize: TEXT_SIZE.tiny, sub: stage ? STAGE_NAMES[stage] : dex, color: stage ? TONES.patch : COLORS.metalLight,
        icon: monIcon(frontKey(id), !stage),
        onTap: () => { this.loreIndex = this.selected === id ? this.loreIndex + 1 : 0; this.selected = id; this.render(); },
        name: `dex-${id}`, selected: this.selected === id,
      }));
    });
    const seen = ids.filter((id) => stageOf(this.progress.bestiary[id])).length;
    this.bottom.add(pixelText(this, 128, 154, `${seen}/${ids.length} seen   page ${this.dexPage + 1}/${pages}`, { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0.5));
    const turn = (d: number) => () => { this.dexPage = (this.dexPage + d + pages) % pages; this.render(); };
    this.bottom.add(button(this, 164, 172, 48, 28, '<', TONES.neutral, turn(-1), { name: 'dex-prev' }));
    this.bottom.add(button(this, 222, 172, 48, 28, '>', TONES.neutral, turn(1), { name: 'dex-next' }));
  }

  private renderTop() {
    this.top.removeAll(true);
    this.top.add(tapeLabel(this, 14, 2, this.tab === 'team' ? `${CHARACTERS[this.viewing].name.toUpperCase()}'S TEAM` : this.tab === 'options' ? 'OPTIONS' : this.tab === 'bag' ? 'BAG' : 'BESTIARY'));
    if (this.tab === 'bag') {
      const it = typeof this.selected === 'string' ? ITEMS[this.selected] : undefined;
      if (!it) {
        this.top.add(pixelText(this, 128, 92, 'Seal scrolls: you need one to seal.\nTap one to read it.', { color: TEXT_COLORS.inkSoft }).setOrigin(0.5).setAlign('center'));
        return;
      }
      this.top.add(this.add.image(52, 80, itemKey(this.selected as string)).setScale(3));
      this.top.add(pixelText(this, 100, 24, it.name, { size: it.name.length > 14 ? TEXT_SIZE.body : TEXT_SIZE.heading, wrap: 145 }));
      this.top.add(chip(this, 100, 40, it.short, shade(hexToNum(it.color), -0.35)));
      this.top.add(pixelText(this, 100, 56, it.desc, { size: TEXT_SIZE.small, wrap: 140 }));
      this.top.add(pixelText(this, 100, 120, `In the bag: ${count(this.progress, this.selected as string)}`, { color: TEXT_COLORS.rust, size: TEXT_SIZE.small }));
      return;
    }
    if (this.tab === 'options') {
      const solo = partyMode(this.progress) === 'solo';
      this.top.add(pixelText(this, 18, 24, solo ? 'Solo' : 'Squad', { size: TEXT_SIZE.heading }));
      this.top.add(pixelText(this, 18, 42, solo
        ? 'Just whoever leads and their lead Patchling walk the map. The others still show up in cutscenes, and SWITCH still swaps who leads.'
        : 'All four friends walk the map in a line, with the leader\'s Patchling hopping behind them.', { size: TEXT_SIZE.small, wrap: 220 }));
      return;
    }
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
