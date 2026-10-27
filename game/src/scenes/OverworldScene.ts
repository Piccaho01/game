import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { linesFor } from '../engine/dialogue';
import { facing, findPath, followStep, heightAt, lineUp, MAPS, npcAt, OBJECTS, objectAction, rollEncounter, signAt, stairAxis, START, step, type Dir, type Npc, type Opens, type Position, type Spot } from '../engine/overworld';
import { gateAt, met, peopleOn, roamersOn } from '../engine/world';
import { SPECIES } from '../engine/data';
import { CHARACTERS, healTeam, leaderTeam, partyMode, SQUAD, switchLeader, type CharacterId, type Progress } from '../engine/progress';
import { createRng, type Rng } from '../engine/rng';
import { MAP_ART, type MapLayout, type MapSprite } from '../assets';
import { walkerTextures } from '../overworld/tileArt';
import { saveProgress } from '../save';
import { DialogBox } from '../ui/dialog';
import { followKey, frontKey, groundKey, propKey, standKey, walkKey } from './BootScene';
import { buttonPagePoint, faceIcon, hinge, isoPad, listRow, monIcon, roundButton, screenBackdrop, tapeLabel } from '../ui/kit';
import { hexToNum, shade, TONES } from '../ui/theme';
import { tweenAsync, wait } from '../ui/widgets';

const STEP_MS = 170;
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
/** Which of a follower Patchling's 8 angles faces each grid direction (art/followers: front, front-left, left, back-left, back, back-right, right, front-right). */
const FOLLOW_VIEW: Record<Dir, number> = { down: 1, right: 7, left: 3, up: 5 };
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYS: Record<string, Dir> = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };

/**
 * The overworld (M4): the map on the top screen following the leader, the D-pad and buttons on
 * the touch screen. Walking is grid-based; tall grass rolls for wild Patchlings, which open the
 * battle scene and come back to the same spot. The other three friends walk behind the leader in
 * a line (bible §6), the leader's lead Patchling right behind them; SWITCH hands the lead to the next one.
 */
export class OverworldScene extends Phaser.Scene {
  private progress!: Progress;
  private pos!: Position;
  private world!: Phaser.GameObjects.Container;
  private layout!: MapLayout;
  /** Buildings and other multi-tile pieces: the leader is drawn in front of or behind each by footprint. */
  private big: { img: Phaser.GameObjects.Image; sp: MapSprite }[] = [];
  private player!: Phaser.GameObjects.Image;
  /** In line behind the leader: their lead Patchling (when it has follower art), then the other three. */
  private followers: Follower[] = [];
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
    // Every screen eases in.
    this.cameras.main.fadeIn(180, 16, 16, 24);
    this.progress = this.registry.get('progress') as Progress;
    this.pos = { ...(this.progress.pos ?? START) };
    const params = new URLSearchParams(location.search);
    this.rng = createRng(params.has('seed') ? Number(params.get('seed')) : Math.floor(Math.random() * 2 ** 31));
    this.rateOverride = params.has('rate') ? Number(params.get('rate')) : null;
    this.moving = false;
    this.busy = false;
    this.padDir = null;
    this.queued = null;

    this.world = this.add.container(0, 0).setDepth(0);
    this.player = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1);
    this.followers = [];
    this.setLeaderLook();
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
    this.world.remove(this.player);
    for (const f of this.followers) this.world.remove(f.img);
    this.world.removeAll(true);
    this.world.add(this.add.image(0, 0, groundKey(map.id)).setOrigin(0, 0).setDepth(-100000));
    this.big = [];
    for (const sp of this.layout.sprites) {
      // Rubble and the like: gone once its wing is restored (engine/world.ts).
      if (sp.until && met(sp.until, this.progress)) continue;
      const img = this.add.image(sp.x, sp.y, propKey(sp.art)).setOrigin(0, 0).setDepth(sp.decal ? -50000 : sp.key);
      this.world.add(img);
      if (!sp.decal && (sp.wx > 1 || sp.wy > 1)) this.big.push({ img, sp });
    }
    // The map's people, the recurring cast who are here now, and Patchlings living in the sanctuary.
    this.npcs = [...peopleOn(map, this.progress), ...roamersOn(map.id, this.progress.sanctuary, (sp) => this.textures.exists(followKey(sp)))
      .map((r): Npc => ({ id: `roam:${r.member.uid}`, x: r.x, y: r.y, dir: 'down', sprite: `mon:${r.member.species}`, talk: 'roamer' }))];
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
    this.lineUpFollowers();
    this.placePlayer();
  }

  /** The leader's walker, their lead Patchling, and the other three behind in SWITCH order. */
  private setLeaderLook() {
    const leader = this.progress.leader;
    this.walker = walkerTextures(this, leader, CHARACTERS[leader].color);
    const i = SQUAD.indexOf(leader);
    // Solo mode (Journal > OPTIONS): just the leader and their Patchling on the map.
    const rest: Omit<Follower, 'img' | 'at'>[] = partyMode(this.progress) === 'solo' ? [] : [1, 2, 3].map((k) => ({ id: SQUAD[(i + k) % SQUAD.length] }));
    const lead = leaderTeam(this.progress)[0]?.species;
    if (lead && this.textures.exists(followKey(lead))) rest.unshift({ id: lead, mon: true });
    const spots = this.followers.map((f) => f.at);
    for (const f of this.followers) { this.tweens.killTweensOf(f.img); f.img.destroy(); }
    this.followers = rest.map((f, k) => ({ ...f, img: this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1), at: spots[k] ?? { ...this.pos } }));
    if (this.world) for (const f of this.followers) this.world.add(f.img);
    this.face(this.pos.dir, 0);
  }

  /** On arrival the three fall in behind the leader. */
  private lineUpFollowers() {
    const line = lineUp(this.pos, this.followers.length, this.blocker);
    this.followers.forEach((f, i) => {
      f.at = line[i];
      if (!this.world.exists(f.img)) this.world.add(f.img);
    });
    this.placeFollowers();
  }

  private placeFollowers() {
    for (const f of this.followers) {
      const p = this.feet(f.at.x, f.at.y);
      f.img.setPosition(p.x, p.y);
      this.faceFollower(f, f.at.dir, 0);
    }
    this.sortFollowers();
  }

  /**
   * Followers sharing a tile with someone ahead of them are hidden behind them (bunched up).
   * Mid-step: `spots`/`lead` are where everyone is going, `depthTiles` the tiles they sort by.
   */
  private sortFollowers(depthTiles?: Spot[], spots = this.followers.map((f) => f.at), lead: { x: number; y: number } = this.pos) {
    this.followers.forEach((f, i) => {
      const ahead = [lead, ...spots.slice(0, i)];
      f.img.setVisible(!ahead.some((a) => a.x === spots[i].x && a.y === spots[i].y));
      f.img.setDepth(this.depthAt(f.img, depthTiles?.[i] ?? spots[i]) - 1);
    });
  }

  private faceFollower(f: Follower, dir: Dir, step: 0 | 1 | 2) {
    if (f.mon) {
      f.img.setTexture(followKey(f.id), FOLLOW_VIEW[dir]).setFlipX(false);
      return;
    }
    const sheet = walkKey(f.id);
    const view = WALK_VIEW[dir];
    if (this.textures.exists(sheet)) f.img.setTexture(sheet, view.row * 3 + step).setFlipX(view.flip);
    else f.img.setTexture(`${walkerTextures(this, f.id, CHARACTERS[f.id as CharacterId].color)}:${dir}:${step ? 1 : 0}`);
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
    if (n.sprite.startsWith('mon:')) {
      s.setTexture(followKey(n.sprite.slice(4)), FOLLOW_VIEW[dir]);
    } else if (n.sprite.startsWith('walk:') && this.textures.exists(walkKey(n.sprite.slice(5)))) {
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
    if (this.followers.length && this.followers[0].img.active) this.sortFollowers();
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
    this.ui.add(isoPad(this, 72, 112, 100, (d) => { this.padDir = d; if (d) this.queued = d; }).setName('dpad'));
    // While someone talks, the tap itself moves the text on (DialogBox), so A only starts things.
    this.ui.add(roundButton(this, 196, 102, 26, 'A', TONES.act, () => { if (!this.busy) void this.interact(); }, 'a'));
    this.drawLeaderUi();
  }

  /** Who leads (face card), SWITCH (with the next friend's face) and JOURNAL (with the lead Patchling). */
  private drawLeaderUi() {
    for (const n of ['leader-tape', 'switch', 'journal']) this.ui.getByName(n)?.destroy();
    const id = this.progress.leader;
    const leader = CHARACTERS[id];
    const nextId = SQUAD[(SQUAD.indexOf(id) + 1) % SQUAD.length];
    const next = CHARACTERS[nextId];
    const lead = leaderTeam(this.progress)[0];
    this.ui.add(listRow(this, 66, 24, 120, 32, {
      title: leader.name, sub: `leads · ${leader.assist.name}`, color: shade(hexToNum(leader.color), -0.2), icon: faceIcon(walkKey(id)), name: 'leader-tape', passive: true,
    }));
    this.ui.add(listRow(this, 196, 24, 108, 32, {
      title: 'SWITCH', sub: `to ${next.name}`, color: shade(hexToNum(next.color), -0.22), icon: faceIcon(walkKey(nextId)),
      onTap: () => this.switchLeader(), name: 'switch',
    }));
    this.ui.add(listRow(this, 196, 164, 108, 30, {
      title: 'JOURNAL', sub: 'Team & bestiary', color: TONES.seal, icon: lead ? monIcon(frontKey(lead.species)) : { text: 'J' },
      onTap: () => this.openJournal(), name: 'journal',
    }));
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
    kb.on('keydown-TAB', (e: KeyboardEvent) => { e.preventDefault(); this.switchLeader(); });
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
    const res = step(this.pos, dir, this.blocker);
    if (!res.moved) {
      // Bumped into something: just face it.
      this.pos = { ...this.pos, dir };
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
    const fwd = <T extends { x: number; y: number }>(a: T, b: T) => (a.x + a.y > b.x + b.y ? a : b);
    const ahead = fwd(res.pos, this.pos);
    // The three behind each step into the place of the one ahead, at the same time.
    const trail = followStep(this.followers.map((f) => f.at), this.pos);
    const crossing = trail.map((t, i) => ({ ...fwd(t, this.followers[i].at), dir: t.dir }));
    const moves = this.followers.map((f, i) => {
      const moved = trail[i].x !== f.at.x || trail[i].y !== f.at.y;
      this.faceFollower(f, trail[i].dir, moved ? this.stepFrame : 0);
      const p = this.feet(trail[i].x, trail[i].y);
      if (moved && f.mon) {
        // Patchlings hop along instead of walking.
        const from = { x: f.img.x, y: f.img.y };
        const k = { t: 0 };
        return tweenAsync(this, {
          targets: k, t: 1, duration: STEP_MS,
          onUpdate: () => f.img.setPosition(from.x + (p.x - from.x) * k.t, from.y + (p.y - from.y) * k.t - Math.sin(k.t * Math.PI) * 4),
        });
      }
      return moved ? tweenAsync(this, { targets: f.img, x: p.x, y: p.y, duration: STEP_MS }) : Promise.resolve();
    });
    await Promise.all([tweenAsync(this, {
      targets: this.player, x: to.x, y: to.y,
      duration: STEP_MS, onUpdate: () => { this.follow(ahead); this.sortFollowers(crossing, trail, res.pos); },
    }), ...moves]);
    this.pos = res.pos;
    this.followers.forEach((f, i) => { f.at = trail[i]; this.faceFollower(f, trail[i].dir, 0); });
    this.sortFollowers();
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
    this.time.delayedCall(480, () => this.scene.start('battle', { foe: wild.species, level: wild.level, from: 'overworld', bg: map.battle }));
    return true;
  }

  private save() {
    this.progress.pos = { ...this.pos };
    saveProgress(this.progress);
  }

  // ---------- buttons ----------

  /** People, Patchlings, and anything still standing until a wing or flag (rubble) are in the way. */
  private blocker = (x: number, y: number) => !!npcAt(this.npcs, x, y) || !!gateAt(MAPS[this.pos.map], x, y, this.progress);

  private async interact() {
    if (this.moving || this.busy) return;
    const { x, y } = facing(this.pos);
    const npc = npcAt(this.npcs, x, y);
    if (npc) {
      this.faceNpc(npc, OPPOSITE[this.pos.dir]);
      if (npc.heal) this.heal();
      if (npc.id.startsWith('roam:')) await this.say([{ text: `${SPECIES[npc.sprite.slice(4)]?.name ?? 'It'} has made itself at home.` }]);
      else await this.talk(npc.talk);
      this.faceNpc(npc, npc.dir ?? 'down');
      return;
    }
    const map = MAPS[this.pos.map];
    const gate = gateAt(map, x, y, this.progress);
    const act: { text?: string; talk?: string; opens?: Opens; rest?: boolean } | null = gate ? OBJECTS[gate.kind] : signAt(map, x, y) ?? objectAction(map, this.pos);
    if (act?.opens === 'storage') this.scene.start('sanctuary', { tab: 'storage' });
    else if (act?.opens) this.scene.start(act.opens);
    else {
      if (act?.rest) this.heal();
      if (act?.talk) await this.talk(act.talk);
      else if (act?.text) await this.say([{ text: act.text }]);
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

  /** SWITCH: the next friend takes the lead (their team battles, their assist applies); the line shuffles round. */
  private switchLeader() {
    if (this.moving || this.busy) return;
    switchLeader(this.progress);
    this.setLeaderLook();
    this.placeFollowers();
    this.follow();
    this.drawLeaderUi();
    this.save();
    // A little hop so the change reads.
    this.tweens.add({ targets: this.player, y: this.player.y - 4, duration: 70, yoyo: true });
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
      pathTo: (x: number, y: number) => findPath(this.pos.map, this.pos, { x, y }, this.blocker),
      talking: () => this.dialog.open,
      npcs: () => this.npcs.map((n) => n.id),
      leader: () => this.progress.leader,
      /** The three behind the leader, in order: who and where. */
      followers: () => this.followers.filter((f) => !f.mon).map((f) => ({ id: f.id, x: f.at.x, y: f.at.y, visible: f.img.visible })),
      /** The Patchling hopping along behind the leader, if any. */
      pet: () => this.followers.find((f) => f.mon)?.id ?? null,
      /** Everyone behind the leader in order, the Patchling included. */
      line: () => this.followers.map((f) => ({ id: f.id, x: f.at.x, y: f.at.y })),
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

/** Someone in line behind the leader: one of the friends, or (`mon`) the leader's lead Patchling. */
interface Follower { id: string; mon?: boolean; img: Phaser.GameObjects.Image; at: Spot }
