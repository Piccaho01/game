import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W, ZOOM } from '../config';
import { castAfter, chatAt, isLine, OVERWORLD_SCENES, SCENES, speaker, type CastId, type ChatScene, type LineStep, type StageScene } from '../engine/cutscene';
import { linesFor } from '../engine/dialogue';
import { DIRS, facing, findPath, heightAt, MAPS, npcAt, npcsFor, objectAction, rollEncounter, signAt, stairAxis, START, step, type Dir, type Npc, type Position } from '../engine/overworld';
import { CHARACTERS, healTeam, type Progress } from '../engine/progress';
import { createRng, type Rng } from '../engine/rng';
import { MAP_ART, type MapLayout, type MapSprite } from '../assets';
import { walkerTextures } from '../overworld/tileArt';
import { saveProgress } from '../save';
import { ChatPhone } from '../ui/chat';
import { DialogBox } from '../ui/dialog';
import { groundKey, propKey, standKey, walkKey } from './BootScene';
import { tapeColor } from './CutsceneScene';
import { button, buttonPagePoint, hinge, isoPad, screenBackdrop, tapeLabel } from '../ui/kit';
import { TONES } from '../ui/theme';
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
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYS: Record<string, Dir> = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };

/**
 * The overworld (M4): the map on the top screen following the leader, the D-pad and buttons on
 * the touch screen. Walking is grid-based; tall grass rolls for wild Patchlings, which open the
 * battle scene and come back to the same spot.
 */
export class OverworldScene extends Phaser.Scene {
  private progress!: Progress;
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
  /** A story scene to play on arrival whatever the save says (?scene=<id>). */
  private forcedStory?: string;
  /** The story scene playing now (data/cutscenes.json), for tests. */
  private story: string | null = null;

  constructor() { super('overworld'); }

  init(data: { notice?: 'blackout'; scene?: string }) {
    this.notice = data?.notice;
    this.forcedStory = data?.scene;
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM).setRoundPixels(true);
    this.progress = this.registry.get('progress') as Progress;
    this.pos = { ...(this.progress.pos ?? START) };
    const params = new URLSearchParams(location.search);
    this.rng = createRng(params.has('seed') ? Number(params.get('seed')) : Math.floor(Math.random() * 2 ** 31));
    this.rateOverride = params.has('rate') ? Number(params.get('rate')) : null;
    this.moving = false;
    this.busy = false;
    this.story = null;
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
    else {
      // A story scene waiting on this map (the first step out after the opening).
      const played = this.progress.story;
      const next = this.forcedStory ?? (played && OVERWORLD_SCENES.find((id) => {
        const sc = SCENES[id];
        return sc.kind === 'stage' && sc.map === this.pos.map && !played.includes(id);
      }));
      if (next) void this.playStory(next);
    }
  }

  // ---------- map ----------

  private loadMap() {
    const map = MAPS[this.pos.map];
    this.layout = MAP_ART[map.id].layout;
    this.world.remove(this.player);
    this.world.removeAll(true);
    this.world.add(this.add.image(0, 0, groundKey(map.id)).setOrigin(0, 0).setDepth(-100000));
    this.big = [];
    for (const sp of this.layout.sprites) {
      const img = this.add.image(sp.x, sp.y, propKey(sp.art)).setOrigin(0, 0).setDepth(sp.decal ? -50000 : sp.key);
      this.world.add(img);
      if (!sp.decal && (sp.wx > 1 || sp.wy > 1)) this.big.push({ img, sp });
    }
    this.npcs = npcsFor(map, this.progress.leader);
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
    this.scrollTo(this.player.x, this.player.y);
    this.player.setDepth(this.depthAt(this.player, tile));
    this.world.sort('depth');
  }

  /** Centres the top screen on a point of the map, stopping at the map's edges. */
  private scrollTo(px: number, py: number) {
    const { size } = this.layout;
    const clamp = (v: number, total: number, view: number) => total <= view ? (total - view) / 2 : Phaser.Math.Clamp(v, 0, total - view);
    const sx = clamp(px - SCREEN_W / 2, size.w, SCREEN_W);
    const sy = clamp(py - 16 - SCREEN_H / 2, size.h, SCREEN_H);
    this.world.setPosition(-Math.round(sx), -Math.round(sy));
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
    const res = step(this.pos, dir, (x, y) => !!npcAt(this.npcs, x, y));
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
    const chat = this.progress.story && chatAt(this.pos.map, this.pos.x, this.pos.y, this.progress.story);
    if (chat) {
      this.moving = false;
      void this.playStory(chat);
      return;
    }
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
    const act = sign ?? objectAction(MAPS[this.pos.map], this.pos);
    if (act?.opens) this.scene.start(act.opens);
    else if (act?.text) await this.say([{ text: act.text }]);
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

  // ---------- story scenes (data/cutscenes.json) ----------

  private async playStory(id: string) {
    const sc = SCENES[id];
    if (!sc || sc.kind === 'cards') return;
    this.busy = true;
    this.story = id;
    this.padDir = null;
    this.queued = null;
    if (sc.kind === 'stage') await this.playStage(sc);
    else await this.playChat(sc);
    if (this.progress.story && !this.progress.story.includes(id)) this.progress.story.push(id);
    this.save();
    this.story = null;
    this.busy = false;
  }

  private storyLine(l: LineStep) {
    const s = speaker(l.who);
    return this.dialog.show(l.text, { speaker: s.name || undefined, speakerColor: tapeColor(l.who), waitForTap: !l.cut });
  }

  /** Someone in a stage scene: PATCH standing, a friend from their walk sheet (0 standing, 1/2 steps). */
  private dressActor(img: Phaser.GameObjects.Image, id: CastId, dir: Dir, stepFrame: 0 | 1 | 2 = 0) {
    if (id === 'patch') {
      if (this.textures.exists(standKey('patch'))) img.setTexture(standKey('patch'));
      return;
    }
    const view = WALK_VIEW[dir];
    if (this.textures.exists(walkKey(id))) img.setTexture(walkKey(id), view.row * 3 + stepFrame).setFlipX(view.flip);
    else img.setTexture(`${walkerTextures(this, id, CHARACTERS[id].color)}:${dir}:${stepFrame ? 1 : 0}`);
  }

  /**
   * The four and PATCH standing together on the map, talking: the camera holds on the scene, the
   * cast walk and turn as the script says, whoever talks hops. The leader ends up at their own
   * spot and play carries on from there.
   */
  private async playStage(sc: StageScene) {
    if (this.pos.map !== sc.map) {
      this.pos = { ...this.pos, map: sc.map, ...MAPS[sc.map].spawn };
      this.loadMap();
    }
    const ids = Object.keys(sc.cast) as CastId[];
    // The cast stand in for the leader and the NPC versions of the friends and PATCH.
    this.player.setVisible(false);
    for (const id of ids) this.npcSprites.get(id)?.setVisible(false);
    const actors = new Map<CastId, { img: Phaser.GameObjects.Image; x: number; y: number; dir: Dir }>();
    const taken = new Set<string>();
    for (const id of ids) {
      const [x, y, dir] = sc.cast[id]!;
      const f = this.feet(x, y);
      const img = this.add.image(f.x, f.y, '__DEFAULT').setOrigin(0.5, 1);
      this.dressActor(img, id, dir);
      // People starting on the same tile (coming out of a door) appear as they step out.
      img.setVisible(!taken.has(`${x},${y}`));
      taken.add(`${x},${y}`);
      img.setDepth(this.depthAt(img, { x, y }));
      this.world.add(img);
      actors.set(id, { img, x, y, dir });
    }
    this.world.sort('depth');
    const cam = this.feet(...sc.camera);
    this.scrollTo(cam.x, cam.y);

    for (const step of sc.steps) {
      if ('walk' in step) {
        // In a line: the leader steps out first, the rest follow a beat apart.
        const order = (Object.keys(step.walk) as CastId[]).sort((a, b) => Number(b === this.progress.leader) - Number(a === this.progress.leader));
        await Promise.all(order.map(async (id, i) => {
          const a = actors.get(id)!;
          await wait(this, i * STEP_MS * 1.6);
          let frame: 1 | 2 = 1;
          for (const d of step.walk[id]!) {
            const nx = a.x + DIRS[d].dx;
            const ny = a.y + DIRS[d].dy;
            const to = this.feet(nx, ny);
            const ahead = nx + ny > a.x + a.y ? { x: nx, y: ny } : { x: a.x, y: a.y };
            a.img.setVisible(true);
            this.dressActor(a.img, id, d, frame);
            frame = frame === 1 ? 2 : 1;
            await tweenAsync(this, {
              targets: a.img, x: to.x, y: to.y, duration: STEP_MS * 1.3,
              onUpdate: () => { a.img.setDepth(this.depthAt(a.img, ahead)); this.world.sort('depth'); },
            });
            Object.assign(a, { x: nx, y: ny, dir: d });
            this.dressActor(a.img, id, d);
          }
        }));
      } else if ('face' in step) {
        for (const [id, d] of Object.entries(step.face) as [CastId, Dir][]) {
          const a = actors.get(id)!;
          a.dir = d;
          this.dressActor(a.img, id, d);
        }
      } else if (isLine(step)) {
        const a = actors.get(step.who as CastId);
        if (a) this.tweens.add({ targets: a.img, y: a.img.y - 3, duration: 90, yoyo: true });
        await this.storyLine(step);
      }
    }
    this.dialog.hide();
    const end = castAfter(sc)[this.progress.leader];
    for (const a of actors.values()) a.img.destroy();
    for (const id of ids) this.npcSprites.get(id)?.setVisible(true);
    this.player.setVisible(true);
    if (end) this.pos = { map: sc.map, x: end.x, y: end.y, dir: end.dir };
    this.placePlayer();
  }

  /** THE BOYS chat pops up on the leader's phone; after the phone goes away, lines go to the text box. */
  private async playChat(sc: ChatScene) {
    // A ping over the leader's head, a buzz, then the phone.
    const ping = tapeLabel(this, 0, 0, '!');
    ping.setPosition(this.player.x - 6, this.player.y - 52);
    this.world.add(ping.setDepth(99999));
    this.world.sort('depth');
    this.cameras.main.shake(160, 0.004);
    await wait(this, 600);
    ping.destroy();
    const phone = new ChatPhone(this, 40, 8, 176, 176, sc.title, sc.members, 8);
    phone.root.y = SCREEN_H;
    await tweenAsync(this, { targets: phone.root, y: 8, duration: 260, ease: 'Back.Out' });
    const hurry = () => { phone.hurry = true; };
    this.input.on('pointerdown', hurry);
    this.input.keyboard?.on('keydown-SPACE', hurry);
    let open = true;
    for (const step of sc.steps) {
      if ('members' in step) phone.members(step.members);
      else if ('phone' in step && open) {
        open = false;
        await wait(this, 400);
        await tweenAsync(this, { targets: phone.root, alpha: 0, duration: 250 });
        phone.destroy();
      } else if (isLine(step)) {
        if (open) await phone.say(step);
        else await this.storyLine(step);
      }
    }
    this.input.off('pointerdown', hurry);
    this.input.keyboard?.off('keydown-SPACE', hurry);
    if (open) phone.destroy();
    this.dialog.hide();
  }

  private exposeForTests() {
    (window as unknown as Record<string, unknown>).__overworld = {
      pos: () => ({ ...this.pos }),
      /** The story scene playing now, or null. */
      story: () => this.story,
      /** Story scenes this save has played (undefined: past them all). */
      played: () => this.progress.story,
      ready: () => !this.moving && !this.busy,
      /** The walk to a tile on this map, as directions (engine/overworld.ts findPath). */
      pathTo: (x: number, y: number) => findPath(this.pos.map, this.pos, { x, y }, (bx, by) => !!npcAt(this.npcs, bx, by)),
      talking: () => this.dialog.open,
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
