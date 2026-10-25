import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { SPECIES, TYPES } from '../engine/data';
import { CHARACTERS, DEFAULT_STARTERS, newProgress, SQUAD, STARTERS, type CharacterId } from '../engine/progress';
import { saveProgress } from '../save';
import { button, buttonPagePoint, chip, faceIcon, hinge, listRow, menuBackdrop, monIcon, panel, patchPortrait, pxRect, screenBackdrop, sectionLabel, tapeLabel } from '../ui/kit';
import { pixelText } from '../ui/text';
import { COLORS, hexToNum, shade, TEXT_COLORS, TEXT_SIZE, TONES } from '../ui/theme';
import { frontKey, idleAnimKey, walkKey } from './BootScene';

type Step = 'leader' | 'starters' | 'lead';
const BOTTOM = SCREEN_H;

/**
 * New game: meet the four (each friend's card, bible §6), then who takes which starter (one each,
 * §13), then who leads first. Top screen shows the pick.
 */
export class NewGameScene extends Phaser.Scene {
  private step: Step = 'leader';
  private leader: CharacterId | null = null;
  /** Who has which starter. */
  private picks: Record<CharacterId, string> = { ...DEFAULT_STARTERS };
  /** The starter tapped first, waiting for a friend to give it to. */
  private starter: string | null = null;
  private top!: Phaser.GameObjects.Container;
  private bottom!: Phaser.GameObjects.Container;

  constructor() { super('newgame'); }

  create() {
    this.step = 'leader';
    this.leader = null;
    this.picks = { ...DEFAULT_STARTERS };
    this.starter = null;
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    // Every screen eases in.
    this.cameras.main.fadeIn(180, 16, 16, 24);
    menuBackdrop(this);
    panel(this, 6, 8, SCREEN_W - 12, SCREEN_H - 19, 'paper');
    screenBackdrop(this, BOTTOM);
    hinge(this);
    this.top = this.add.container(0, 0);
    this.bottom = this.add.container(0, BOTTOM);
    this.render();
    (window as unknown as Record<string, unknown>).__newgame = {
      step: () => this.step,
      picks: () => ({ ...this.picks }),
      leader: () => this.leader,
      buttonAt: (name: string) => buttonPagePoint(this, this.bottom, name),
    };
  }

  private render() {
    this.top.removeAll(true);
    this.bottom.removeAll(true);
    if (this.step === 'leader') this.renderLeader();
    else if (this.step === 'starters') this.renderStarters();
    else this.renderLead();
  }

  private renderLeader() {
    const ids = Object.keys(CHARACTERS) as CharacterId[];
    this.bottom.add(pixelText(this, 128, 10, "Who's leading?", { color: TEXT_COLORS.light, size: TEXT_SIZE.heading, shadow: '#000000' }).setOrigin(0.5, 0));
    this.bottom.add(sectionLabel(this, 128, 25, 'Meet the four'));
    ids.forEach((id, i) => {
      const c = CHARACTERS[id];
      this.bottom.add(listRow(this, 66 + (i % 2) * 124, 58 + Math.floor(i / 2) * 46, 118, 40, {
        title: c.name, sub: c.role, color: shade(hexToNum(c.color), -0.22), icon: faceIcon(walkKey(id)),
        onTap: () => { this.leader = id; this.render(); }, name: `char-${id}`, selected: this.leader === id,
      }));
    });
    if (this.leader) this.bottom.add(button(this, 128, 168, 160, 30, 'LEAD THE WAY', TONES.go, () => { this.step = 'starters'; this.render(); }, { name: 'confirm' }));

    if (!this.leader) {
      this.top.add(tapeLabel(this, 14, 2, 'PATCH'));
      this.top.add(patchPortrait(this, 128, 52));
      this.top.add(pixelText(this, 128, 120, "This is your mess.\nOne of you leads the cleanup.\nThe other three tag along.\n\nI'm working on a fix.", { size: TEXT_SIZE.small }).setOrigin(0.5).setAlign('center'));
      return;
    }
    this.renderCard(this.leader, 'LEADER');
  }

  /** A friend's card on the top screen: outfit colour, walk sprite, role, assist, a line. */
  private renderCard(id: CharacterId, tape: string, quoteWrap = 220) {
    const c = CHARACTERS[id];
    const color = hexToNum(c.color);
    this.top.add(tapeLabel(this, 14, 2, tape));
    // A card in their outfit colour (the battle portraits come with the trainer battle sprites).
    const portrait = this.add.graphics();
    pxRect(portrait, 17, 21, 64, 80, COLORS.ink, 3);
    pxRect(portrait, 18, 22, 62, 78, color, 2);
    portrait.fillStyle(shade(color, -0.25)).fillRect(18, 78, 62, 20);
    portrait.fillStyle(shade(color, 0.3)).fillRect(20, 23, 58, 1);
    this.top.add(portrait);
    // Their overworld sprite at 2x on the card; the initial if a sheet is missing.
    if (this.textures.exists(walkKey(id))) this.top.add(this.add.image(49, 97, walkKey(id), 0).setOrigin(0.5, 1).setScale(2));
    else this.top.add(pixelText(this, 49, 58, c.name[0], { color: TEXT_COLORS.light, size: 24, shadow: '#000000' }).setOrigin(0.5));
    this.top.add(pixelText(this, 92, 20, c.name, { size: TEXT_SIZE.heading }));
    this.top.add(pixelText(this, 92, 35, c.role, { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small }));
    this.top.add(chip(this, 92, 48, `Assist: ${c.assist.name}`, TONES.patch));
    // Stacked by measured height: the descriptions wrap to different lengths per leader.
    const desc = pixelText(this, 92, 62, c.assist.desc, { size: TEXT_SIZE.small, wrap: 148 });
    const field = pixelText(this, 92, desc.y + desc.height + 4, c.field, { color: TEXT_COLORS.inkSoft, size: TEXT_SIZE.small, wrap: 148 });
    const quoteY = Math.max(108, field.y + field.height + 8);
    this.top.add([desc, field, pixelText(this, 18, quoteY, `"${c.line}"`, { color: TEXT_COLORS.rust, size: TEXT_SIZE.small, wrap: quoteWrap })]);
  }

  /** Tap a starter, then the friend who takes it; that friend's old starter goes to whoever had this one. */
  private renderStarters() {
    this.bottom.add(pixelText(this, 128, 6, 'Who takes which?', { color: TEXT_COLORS.light, size: TEXT_SIZE.heading, shadow: '#000000' }).setOrigin(0.5, 0));
    this.bottom.add(pixelText(this, 128, 20, this.starter ? `Now tap who takes ${SPECIES[this.starter].name}.` : 'Tap a starter, then a friend.', { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0.5, 0));
    STARTERS.forEach((id, i) => {
      const sp = SPECIES[id];
      this.bottom.add(listRow(this, 62, 47 + i * 29, 104, 26, {
        title: sp.name, color: shade(hexToNum(TYPES[sp.types[0]].color), -0.3), icon: monIcon(frontKey(id)),
        onTap: () => { this.starter = this.starter === id ? null : id; this.render(); }, name: `starter-${id}`, selected: this.starter === id,
      }));
    });
    SQUAD.forEach((c, i) => {
      const ch = CHARACTERS[c];
      this.bottom.add(listRow(this, 186, 47 + i * 29, 124, 26, {
        title: ch.name, sub: `has ${SPECIES[this.picks[c]].name}`, color: shade(hexToNum(ch.color), -0.22), icon: faceIcon(walkKey(c)),
        onTap: () => this.give(c), name: `friend-${c}`, selected: !!this.starter && this.picks[c] === this.starter,
      }));
    });
    this.bottom.add(button(this, 56, 172, 88, 28, 'BACK', TONES.neutral, () => { this.step = 'leader'; this.starter = null; this.render(); }, { name: 'back' }));
    this.bottom.add(button(this, 170, 172, 140, 28, 'DONE', TONES.go, () => { this.step = 'lead'; this.starter = null; this.render(); }, { name: 'confirm' }));

    // Top screen: the four, each standing under their starter.
    this.top.add(tapeLabel(this, 14, 2, 'STARTERS'));
    SQUAD.forEach((c, i) => {
      const cx = 37 + i * 61;
      const sp = this.picks[c];
      if (this.starter === sp) {
        const g = this.add.graphics();
        pxRect(g, cx - 29, 16, 58, 164, COLORS.gold, 3);
        pxRect(g, cx - 28, 17, 56, 162, COLORS.paper, 2);
        this.top.add(g);
      }
      this.top.add(pixelText(this, cx, 22, CHARACTERS[c].name, { size: TEXT_SIZE.small }).setOrigin(0.5, 0));
      this.top.add(pixelText(this, cx, 32, SPECIES[sp].name, { color: TEXT_COLORS.rust, size: TEXT_SIZE.tiny }).setOrigin(0.5, 0));
      const s = this.add.sprite(cx, 100, frontKey(sp)).setOrigin(0.5, 1);
      if (this.anims.exists(idleAnimKey(sp))) s.play(idleAnimKey(sp));
      this.top.add(s);
      if (this.textures.exists(walkKey(c))) this.top.add(this.add.image(cx, 178, walkKey(c), 0).setOrigin(0.5, 1).setScale(2));
      else this.top.add(pixelText(this, cx, 150, CHARACTERS[c].name[0], { size: 24 }).setOrigin(0.5));
    });
  }

  private give(to: CharacterId) {
    if (!this.starter) return;
    const from = SQUAD.find((c) => this.picks[c] === this.starter)!;
    this.picks[from] = this.picks[to];
    this.picks[to] = this.starter;
    this.starter = null;
    this.render();
  }

  /** Who leads first (the friend picked on the first screen, unless changed here). */
  private renderLead() {
    this.bottom.add(pixelText(this, 128, 12, 'Who leads first?', { color: TEXT_COLORS.light, size: TEXT_SIZE.heading, shadow: '#000000' }).setOrigin(0.5, 0));
    SQUAD.forEach((c, i) => {
      const ch = CHARACTERS[c];
      this.bottom.add(listRow(this, 66 + (i % 2) * 124, 54 + Math.floor(i / 2) * 46, 118, 40, {
        title: ch.name, sub: `with ${SPECIES[this.picks[c]].name}`, color: shade(hexToNum(ch.color), -0.22), icon: faceIcon(walkKey(c)),
        onTap: () => { this.leader = c; this.render(); }, name: `lead-${c}`, selected: this.leader === c,
      }));
    });
    this.bottom.add(pixelText(this, 128, 142, 'Switch any time with SWITCH.', { color: TEXT_COLORS.dim, size: TEXT_SIZE.small }).setOrigin(0.5));
    this.bottom.add(button(this, 56, 172, 88, 28, 'BACK', TONES.neutral, () => { this.step = 'starters'; this.render(); }, { name: 'back' }));
    this.bottom.add(button(this, 170, 172, 140, 28, "LET'S GO", TONES.go, () => this.begin(), { name: 'confirm' }));
    if (this.leader) this.renderPartner(this.leader);
  }

  /** The lead's card, with the starter they took on its plinth. */
  private renderPartner(id: CharacterId) {
    // The quote makes room for the starter in the corner.
    this.renderCard(id, 'LEADS FIRST', 156);
    const sp = this.picks[id];
    const s = this.add.sprite(212, 184, frontKey(sp)).setOrigin(0.5, 1).setFlipX(true);
    if (this.anims.exists(idleAnimKey(sp))) s.play(idleAnimKey(sp));
    this.top.add(s);
  }

  private begin() {
    if (!this.leader) return;
    const progress = newProgress(this.picks, this.leader);
    saveProgress(progress);
    this.registry.set('progress', progress);
    // Out into Hollow Rest (PATCH's intro comes before this in M4 step 5).
    this.scene.start('overworld');
  }
}
