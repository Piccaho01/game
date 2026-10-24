import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { linesFor } from '../engine/dialogue';
import { facing, findPath, heightAt, MAPS, npcAt, npcsFor, objectAction, present, rollEncounter, signAt, stairAxis, START, step, type Dir, type Flags, type Npc, type Position } from '../engine/overworld';
import { CHARACTERS, flagsOf, healTeam, type Progress } from '../engine/progress';
import { createRng, type Rng } from '../engine/rng';
import { MAP_ART, type MapLayout, type MapSprite } from '../assets';
import { walkerTextures } from '../overworld/tileArt';
import { saveProgress } from '../save';
import { DialogBox } from '../ui/dialog';
import { groundKey, propKey, standKey, walkKey } from './BootScene';
import { button, buttonPagePoint, hinge, isoPad, screenBackdrop, tapeLabel } from '../ui/kit';
import { TONES } from '../ui/theme';
import { tweenAsync, wait } from '../ui/widgets';

const STEP_MS = 170;
/** Behind a room's walls (matches iso_map.py's interior backdrop). */
const INTERIOR_BG = 0x16141c;
const TURN_MS = 90;
const BOTTOM = SCREEN_H;
/**
 * Which walk-sheet row shows each grid direction on the isometric screen (rows: 0 front, 3 back):
 * +y runs down-left (front), +x down-right (front, mirrored), -x up-left (back), -y up-right
 * (back, mirrored). Diagonal walk sheets will replace these stand-ins.
 */
const WALK_VIEW: Record<Dir, { row: number; flip: boolean }> = {
  down: { row: 0, flip: false }, right: { row: 0, flip: true }, left: { row: 3, flip: false }, up: { row: 3, flip: true },
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYS: Record<string, Dir> = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };

/**
 * The overworld (M4): the map on the top screen following the leader, the D-pad and buttons on
 * the touch screen. Walking is grid-based; tall grass rolls for wild Patchlings, which open the
 * battle scene and come back to the same spot.
 */
export class OverworldScene extends Phaser.Scene {
  private progress!: Progress;
  /** Restored wings and story flags: what rubble is gone, who has moved into the base. */
  private flags!: Flags;
  private pos!: Position;
  private world!: Phaser.GameObjects.Container;
  private layout!: MapLayout;
  /** Buildings and other multi-tile pieces: the leader is drawn in front of or behind each by footprint. */
  private big: { img: Phaser.GameObjects.Image; sp: MapSprite }[] = [];
  private player!: Phaser.GameObjects.Image;
  private npcs: Npc[] = [];
  private npcSprites = new Map<string, Phaser.GameObjects.Image>();
  /** Something to say on arrival (after a blackout). */
  private notice?: 'blackout';
  private walker = '';
  private ui!: Phaser.GameObjects.Container;
  private dialog!: DialogBox;
  private padDir: Dir | null = null;
  /** A quick tap (key or pad) between frames still counts as one step. */
  private queued: Dir | null = null;
  private keys: { key: Phaser.Input.Keyboard.Key; dir: Dir }[] = [];
  private moving = false;
  private busy = false;
  private stepFrame: 1 | 2 = 1;
  private rng!: Rng;
  /** Test hook: a forced encounter rate (?rate=1). */
  private rateOverride: number | null = null;

  constructor() { super('overworld'); }

  init(data: { notice?: 'blackout' }) {
    this.notice = data?.notice;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.progress = this.registry.get('progress') as Progress;
    this.flags = flagsOf(this.progress);
    this.pos = { ...(this.progress.pos ?? START) };
    const params = new URLSearchParams(location.search);
    this.rng = createRng(params.has('seed') ? Number(params.get('seed')) : Math.floor(Math.random() * 2 ** 31));
    this.rateOverride = params.has('rate') ? Number(params.get('rate')) : null;
    this.moving = false;
    this.busy = false;
    this.padDir = null;
    this.queued = null;

    this.world = this.add.container(0, 0).setDepth(0);
    const leader = CHARACTERS[this.progress.leader];
    this.walker = walkerTextures(this, this.progress.leader, leader.color);
    this.player = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1);
    this.face(this.pos.dir, 0);
    this.loadMap();

    this.dialog = new DialogBox(this, 5);
    this.dialog.hide();
    this.drawTouchScreen();
    this.setupKeys();
    this.exposeForTests();
    this.showMapName();
    if (this.notice === 'blackout') void this.talk('patch_blackout');
  }

  // ---------- map ----------

  private loadMap() {
    const map = MAPS[this.pos.map];
    this.layout = MAP_ART[map.id].layout;
    // Rooms sit in the dark; the island floats in its sky (baked into the ground image).
    this.cameras.main.setBackgroundColor(map.interior ? INTERIOR_BG : 0x101018);
    this.world.remove(this.player);
    this.world.removeAll(true);
    this.world.add(this.add.image(0, 0, groundKey(map.id)).setOrigin(0, 0).setDepth(-100000));
    this.big = [];
    for (const sp of this.layout.sprites) {
      if (!present(sp, this.flags)) continue;
      const img = this.add.image(sp.x, sp.y, propKey(sp.art)).setOrigin(0, 0).setDepth(sp.decal ? -50000 : sp.key);
      this.world.add(img);
      if (!sp.decal && (sp.wx > 1 || sp.wy > 1)) this.big.push({ img, sp });
    }
    this.npcs = npcsFor(map, this.progress.leader, this.flags);
    this.npcSprites.clear();
    for (const n of this.npcs) {
      const f = this.feet(n.x, n.y);
      const s = this.add.image(f.x, f.y, '__DEFAULT').setOrigin(0.5, 1);
      this.npcSprites.set(n.id, s);
      this.world.add(s);
      this.faceNpc(n, n.dir ?? 'down');
      s.setDepth(this.depthAt(s, n));
    }
    this.world.add(this.player);
    this.placePlayer();
  }

  /** Where someone standing on a tile has their feet, on the baked map (stairs: halfway up). */
  private feet(x: number, y: number) {
    const map = MAPS[this.pos.map];
    const { origin, tile } = this.layout;
    const z = heightAt(map, x, y) + (stairAxis(map, x, y) ? 0.5 : 0);
    return { x: origin.x + (x - y) * tile.w / 2 + tile.w / 2, y: origin.y + (x + y) * tile.h / 2 - z * tile.z + 12 };
  }

  /** NPC sprites: a walk sheet (turns to face you), a standing pose, or a placeholder figure. */
  private faceNpc(n: Npc, dir: Dir) {
    const s = this.npcSprites.get(n.id)!;
    const view = WALK_VIEW[dir];
    s.setFlipX(false);
    if (n.sprite.startsWith('walk:') && this.textures.exists(walkKey(n.sprite.slice(5)))) {
      s.setTexture(walkKey(n.sprite.slice(5)), view.row * 3).setFlipX(view.flip);
    } else if (this.textures.exists(standKey(n.sprite))) {
      s.setTexture(standKey(n.sprite));
    } else {
      const colour = n.sprite.startsWith('placeholder:') ? n.sprite.slice(12) : '#888888';
      s.setTexture(`${walkerTextures(this, `npc${colour}`, colour)}:${dir}:0`);
    }
  }

  private placePlayer() {
    const f = this.feet(this.pos.x, this.pos.y);
    this.player.setPosition(f.x, f.y);
    this.face(this.pos.dir, 0);
    this.follow();
  }

  /** Shows the leader facing `dir`: 0 standing, 1 and 2 the two steps. */
  private face(dir: Dir, step: 0 | 1 | 2) {
    const sheet = walkKey(this.progress.leader);
    const view = WALK_VIEW[dir];
    if (this.textures.exists(sheet)) this.player.setTexture(sheet, view.row * 3 + step).setFlipX(view.flip);
    else this.player.setTexture(`${this.walker}:${dir}:${step ? 1 : 0}`);
  }

  /**
   * Keeps the leader centred on the top screen, stopping at the map's edges, and sorts who is in
   * front: by tile depth, except that next to a building it's the footprint that decides.
   */
  private follow(tile = this.pos) {
    const { size } = this.layout;
    const clamp = (v: number, total: number, view: number) => total <= view ? (total - view) / 2 : Phaser.Math.Clamp(v, 0, total - view);
    const sx = clamp(this.player.x - SCREEN_W / 2, size.w, SCREEN_W);
    const sy = clamp(this.player.y - 16 - SCREEN_H / 2, size.h, SCREEN_H);
    this.world.setPosition(-Math.round(sx), -Math.round(sy));
    this.player.setDepth(this.depthAt(this.player, tile));
    this.world.sort('depth');
  }

  /** Draw order for someone on a tile: by tile depth, except that next to a building the footprint decides. */
  private depthAt(sprite: Phaser.GameObjects.Image, tile: { x: number; y: number }) {
    let depth = (tile.x + tile.y) * 10 + 5;
    const b = sprite.getBounds();
    for (const { img, sp } of this.big) {
      if (!Phaser.Geom.Intersects.RectangleToRectangle(b, img.getBounds())) continue;
      const inFront = tile.x >= sp.fx + sp.wx || tile.y >= sp.fy + sp.wy;
      depth = inFront ? Math.max(depth, sp.key + 1) : Math.min(depth, sp.key - 1);
    }
    return depth;
  }

  private showMapName() {
    const label = tapeLabel(this, 8, 8, MAPS[this.pos.map].name.toUpperCase()).setDepth(6);
    this.tweens.add({ targets: label, alpha: 0, delay: 1600, duration: 400, onComplete: () => label.destroy() });
  }

  // ---------- touch screen ----------

  private drawTouchScreen() {
    // Opaque, and above the world, so a map taller than the top screen never shows through.
    screenBackdrop(this, BOTTOM).setDepth(20);
    hinge(this).setDepth(21);
    this.ui = this.add.container(0, BOTTOM).setDepth(22);
    this.ui.add(isoPad(this, 70, 104, 100, (d) => { this.padDir = d; if (d) this.queued = d; }).setName('dpad'));
    // While someone talks, the tap itself moves the text on (DialogBox), so A only starts things.
    this.ui.add(button(this, 196, 84, 64, 64, 'A', TONES.act, () => { if (!this.busy) void this.interact(); }, { size: 16, name: 'a' }));
    this.ui.add(button(this, 196, 160, 96, 30, 'JOURNAL', TONES.seal, () => this.openJournal(), { name: 'journal' }));
    const leader = CHARACTERS[this.progress.leader];
    this.ui.add(tapeLabel(this, 10, 8, `${leader.name.toUpperCase()} LEADS`));
  }

  private setupKeys() {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.keys = Object.entries(KEYS).map(([name, dir]) => ({ key: kb.addKey(name), dir }));
    for (const { key, dir } of this.keys) key.on('down', () => { this.queued = dir; });
    const a = () => (this.dialog.open ? this.dialog.advance() : void this.interact());
    kb.on('keydown-SPACE', a);
    kb.on('keydown-ENTER', a);
    kb.on('keydown-M', () => this.openJournal());
  }

  private heldDir(): Dir | null {
    if (this.padDir) return this.padDir;
    return this.keys.find((k) => k.key.isDown)?.dir ?? null;
  }

  // ---------- walking ----------

  update() {
    if (this.moving || this.busy) return;
    const dir = this.heldDir() ?? this.queued;
    this.queued = null;
    if (dir) void this.walk(dir);
  }

  private async walk(dir: Dir) {
    this.moving = true;
    const res = step(this.pos, dir, (x, y) => !!npcAt(this.npcs, x, y), this.flags);
    if (!res.moved) {
      // Bumped into something: just face it.
      this.pos = res.pos;
      this.face(dir, 0);
      await wait(this, TURN_MS);
      this.moving = false;
      return;
    }
    if (res.warped) {
      await this.warp(res.pos);
      this.moving = false;
      return;
    }
    this.stepFrame = this.stepFrame === 1 ? 2 : 1;
    this.face(dir, this.stepFrame);
    const to = this.feet(res.pos.x, res.pos.y);
    // Sort by whichever tile is further forward while crossing between them.
    const ahead = res.pos.x + res.pos.y > this.pos.x + this.pos.y ? res.pos : this.pos;
    await tweenAsync(this, {
      targets: this.player, x: to.x, y: to.y,
      duration: STEP_MS, onUpdate: () => this.follow(ahead),
    });
    this.pos = res.pos;
    this.face(dir, 0);
    this.save();
    if (res.grass) this.rustle();
    if (res.grass && this.tryEncounter()) return;
    this.moving = false;
  }

  private async warp(to: Position) {
    this.busy = true;
    const cam = this.cameras.main;
    cam.fadeOut(140, 16, 16, 24);
    await wait(this, 150);
    this.pos = to;
    this.loadMap();
    this.save();
    cam.fadeIn(140, 16, 16, 24);
    this.showMapName();
    this.busy = false;
  }

  /** A puff of grass where the leader lands. */
  private rustle() {
    const g = this.add.graphics();
    g.fillStyle(0x3a8030);
    g.fillRect(-5, -2, 2, 3).fillRect(3, -2, 2, 3).fillRect(-1, -4, 2, 3);
    g.setPosition(this.player.x, this.player.y - 2);
    this.world.add(g);
    this.tweens.add({ targets: g, y: g.y - 4, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  private tryEncounter() {
    const map = MAPS[this.pos.map];
    const table = map.encounters && this.rateOverride !== null ? { ...map, encounters: { ...map.encounters, rate: this.rateOverride } } : map;
    const wild = rollEncounter(table, this.rng);
    if (!wild) return false;
    this.busy = true;
    // Two quick flashes, then into battle.
    const cam = this.cameras.main;
    cam.flash(120, 255, 255, 255);
    this.time.delayedCall(240, () => cam.flash(120, 255, 255, 255));
    this.time.delayedCall(480, () => this.scene.start('battle', { foe: wild.species, level: wild.level, from: 'overworld' }));
    return true;
  }

  private save() {
    this.progress.pos = { ...this.pos };
    saveProgress(this.progress);
  }

  // ---------- buttons ----------

  private async interact() {
    if (this.moving || this.busy) return;
    const { x, y } = facing(this.pos);
    const npc = npcAt(this.npcs, x, y);
    if (npc) {
      this.faceNpc(npc, OPPOSITE[this.pos.dir]);
      if (npc.heal) this.heal();
      await this.talk(npc.talk);
      this.faceNpc(npc, npc.dir ?? 'down');
      return;
    }
    const sign = signAt(MAPS[this.pos.map], x, y);
    const act = sign ?? objectAction(MAPS[this.pos.map], this.pos, this.flags);
    if (act?.opens) this.scene.start(act.opens);
    else if (act?.text) {
      if ('heal' in act && act.heal) this.heal();
      await this.say([{ text: act.text }]);
    }
  }

  private talk(id: string) {
    return this.say(linesFor(id, this.progress.leader));
  }

  private async say(lines: { who?: string; text: string }[]) {
    this.busy = true;
    this.padDir = null;
    this.queued = null;
    for (const l of lines) await this.dialog.show(l.text, { speaker: l.who, waitForTap: true });
    this.dialog.hide();
    this.busy = false;
  }

  /** PATCH patches the whole team: a blue flash, everyone back to full. */
  private heal() {
    healTeam(this.progress);
    saveProgress(this.progress);
    this.cameras.main.flash(300, 166, 216, 255);
  }

  private openJournal() {
    if (this.moving || this.busy) return;
    this.scene.start('journal', { from: 'overworld' });
  }

  private exposeForTests() {
    (window as unknown as Record<string, unknown>).__overworld = {
      pos: () => ({ ...this.pos }),
      ready: () => !this.moving && !this.busy,
      /** The walk to a tile on this map, as directions (engine/overworld.ts findPath). */
      pathTo: (x: number, y: number) => findPath(this.pos.map, this.pos, { x, y }, (bx, by) => !!npcAt(this.npcs, bx, by), this.flags),
      talking: () => this.dialog.open,
      /** Forces the encounter rate from here on (like ?rate=), or null for the map's own. */
      setRate: (rate: number | null) => { this.rateOverride = rate; },
      npcs: () => this.npcs.map((n) => n.id),
      buttonAt: (name: string) => buttonPagePoint(this, this.ui, name),
      /** The D-pad's centre in page px, plus how far its arms reach. */
      padAt: () => {
        const p = buttonPagePoint(this, this.ui, 'dpad');
        if (!p) return null;
        return { ...p, reach: 34 * (this.game.canvas.getBoundingClientRect().width / SCREEN_W) };
      },
    };
  }
}
