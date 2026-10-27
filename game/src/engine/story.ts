import triggersJson from '../data/cutscenes/triggers.json';
import { CHARACTERS, SQUAD, type CharacterId, type Progress } from './progress';
import { heightAt, isBlocked, MAPS, type Dir, type Position, type Spot } from './overworld';

/**
 * The story as data (Track B): cutscene scripts (data/cutscenes/<id>.json), the story flags in the
 * save, and the overworld triggers that play scenes. The scenes themselves are
 * scenes/CutsceneScene.ts; this file is the part that can be tested without a browser.
 */
export type Speaker = CharacterId | 'patch' | 'connor' | 'system' | 'narration';
export const SPEAKERS: Speaker[] = [...SQUAD, 'patch', 'connor', 'system', 'narration'];
export type Fx = 'shake' | 'flash' | 'boom';

export interface Step {
  /** Change the card on the top screen (art/cutscenes/out/<card>.png). */
  card?: string;
  /** How the card comes in: fade (from black), slide (pushes the last one off), cut. */
  enter?: 'fade' | 'slide' | 'cut';
  /** A tape on the touch screen naming the beat. */
  title?: string;
  /** A line on the touch screen... */
  who?: Speaker;
  text?: string;
  /** ...or a message in the group chat on the phone (`text` is the message). */
  chat?: Speaker;
  phone?: 'open' | 'close';
  /** The member count in the chat's header from here on. */
  members?: number;
  /** Light one part of the card ([x, y, w, h] on the top screen), the rest dimmed; null clears it. */
  spot?: [number, number, number, number] | null;
  fx?: Fx;
  sfx?: string;
  /** Move on by itself after this many ms (someone gets cut off) instead of waiting for a tap. */
  auto?: number;
  /** Expands into one line from each friend about the starter they took (needs `picks`). */
  reactions?: boolean;
}

export interface Script {
  id: string;
  /** In the overworld, the four gather round the leader for this scene. */
  stage?: 'huddle';
  chatTitle?: string;
  /** Flags set (besides the scene's own id) once it has played. */
  sets?: string[];
  /** Full-screen scenes: where to go after (SKIP goes there too). */
  next?: { scene: string; data?: Record<string, unknown> };
  reactions?: Partial<Record<CharacterId, Record<string, string>>>;
  steps: Step[];
}

const files = import.meta.glob('../data/cutscenes/*.json', { eager: true, import: 'default' }) as Record<string, Script & { triggers?: unknown }>;
export const SCRIPTS: Record<string, Script> = Object.fromEntries(
  Object.values(files).filter((f) => Array.isArray(f.steps)).map((s) => [s.id, s]),
);

/** The name on a speaker's tape ('' for narration and system lines). */
export function speakerName(who: Speaker): string {
  if (who === 'patch') return 'PATCH';
  if (who === 'connor') return 'Connor';
  if (who === 'system' || who === 'narration') return '';
  return CHARACTERS[who].name;
}

/** Their colour: outfit colours for the four, PATCH's CRT blue, Connor's red hoodie. */
export function speakerColor(who: Speaker): string {
  if (who === 'patch') return '#3a78c8';
  if (who === 'connor') return '#c23a3a';
  if (who === 'system' || who === 'narration') return '#55576a';
  return CHARACTERS[who].color;
}

/** Problems with a script (unknown speakers, missing cards, empty lines); empty when it's fine. */
export function checkScript(s: Script, cards: string[]): string[] {
  const out: string[] = [];
  if (!s.id) out.push('no id');
  if (!s.steps?.length) out.push(`${s.id}: no steps`);
  s.steps.forEach((st, i) => {
    const at = `${s.id} step ${i}`;
    if (st.who && !SPEAKERS.includes(st.who)) out.push(`${at}: unknown speaker ${st.who}`);
    if (st.chat && !SPEAKERS.includes(st.chat)) out.push(`${at}: unknown chat speaker ${st.chat}`);
    if ((st.who || st.chat) && !st.text?.trim()) out.push(`${at}: a line with no text`);
    if (st.text && !st.who && !st.chat) out.push(`${at}: text with no speaker`);
    if (st.card && !cards.includes(st.card)) out.push(`${at}: no card ${st.card}`);
    if (st.reactions) {
      for (const c of SQUAD) if (!s.reactions?.[c]) out.push(`${at}: no reactions for ${c}`);
    }
  });
  return out;
}

/** The steps to play: `reactions` turns into each friend's line about the starter they took. */
export function stepsFor(s: Script, picks?: Partial<Record<CharacterId, string>>): Step[] {
  return s.steps.flatMap((st) => {
    if (!st.reactions) return [st];
    return SQUAD.filter((c) => picks?.[c] && s.reactions?.[c]?.[picks[c]!])
      .map((c): Step => ({ who: c, text: s.reactions![c]![picks![c]!] }));
  });
}

// ---------- flags ----------

/** Saves from before the story had none of it: they count as having seen the opening. */
export const OPENING_DONE = 'opening';

export function hasFlag(p: Progress, flag: string) {
  return !!p.flags?.includes(flag);
}

/** A scene has played: its id and whatever it `sets` go into the save's flags. */
export function markSeen(p: Progress, id: string) {
  const flags = (p.flags ??= []);
  for (const f of [id, ...(SCRIPTS[id]?.sets ?? [])]) if (!flags.includes(f)) flags.push(f);
}

// ---------- overworld triggers ----------

export interface Trigger {
  scene: string;
  map: string;
  on: 'arrive' | 'area';
  area?: [number, number, number, number];
  after?: string[];
  unless?: string[];
}
export const TRIGGERS = (triggersJson as { triggers: Trigger[] }).triggers;

/** The story scene that should play now, if any: `event` is arriving on a map or taking a step. */
export function sceneFor(p: Progress, pos: Position, event: 'arrive' | 'step', triggers: Trigger[] = TRIGGERS): string | null {
  for (const t of triggers) {
    if (t.map !== pos.map || hasFlag(p, t.scene)) continue;
    if (t.after?.some((f) => !hasFlag(p, f)) || t.unless?.some((f) => hasFlag(p, f))) continue;
    if (t.on === 'arrive' && event !== 'arrive') continue;
    if (t.on === 'area') {
      const [x, y, w, h] = t.area ?? [0, 0, 0, 0];
      if (pos.x < x || pos.y < y || pos.x >= x + w || pos.y >= y + h) continue;
    }
    return t.scene;
  }
  return null;
}

/** Which way someone on `from` turns to look at `to`. */
export function faceToward(from: { x: number; y: number }, to: { x: number; y: number }): Dir {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

/**
 * Where the others stand round the leader for a story scene: free tiles next to them at the same
 * height (in front first, so the group stays on screen), each facing the leader. When there's no
 * room, someone shares the leader's tile.
 */
export function huddle(pos: Position, n: number, blocked: (x: number, y: number) => boolean = () => false): Spot[] {
  const map = MAPS[pos.map];
  const z = heightAt(map, pos.x, pos.y);
  const rings: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2], [-2, 0], [0, -2]];
  const free = rings.map(([dx, dy]) => ({ x: pos.x + dx, y: pos.y + dy }))
    .filter((t) => !isBlocked(map, t.x, t.y) && !blocked(t.x, t.y) && heightAt(map, t.x, t.y) === z
      && map.warps.every((w) => w.x !== t.x || w.y !== t.y));
  return Array.from({ length: n }, (_, i) => {
    const t = free[i] ?? { x: pos.x, y: pos.y };
    return { ...t, dir: t.x === pos.x && t.y === pos.y ? pos.dir : faceToward(t, pos) };
  });
}

