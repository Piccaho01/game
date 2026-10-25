/**
 * Sprites come straight from the claude-pxl output in ../art, so a newly exported creature
 * shows up in game without copying files. Keyed by the `sprite` field in patchlings.json.
 */
const anims = import.meta.glob('../../art/creatures/out/anims/*_idle.{png,json}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const stills = import.meta.glob('../../art/creatures/out/sprites/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export interface SpriteAsset { idle?: { png: string; json: string }; still?: string }

const base = (p: string) => p.split('/').pop()!.replace(/\.(png|json)$/, '');

/** Overworld walk sheets (art/tools/walk2sheet.py): <id>_walk.png, 24x40 frames; row 0 walks toward the viewer (facing down-left), row 3 away (up-left). */
const walks = import.meta.glob('../../art/trainers/out/*_walk.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const WALK_SHEETS: Record<string, string> = Object.fromEntries(
  Object.entries(walks).map(([path, url]) => [base(path).replace(/_walk$/, ''), url]),
);
export const WALK_FRAME = { w: 24, h: 40 };
/** Single standing poses (art/tools/pose2sprite.py): <id>_stand.png. */
const stands = import.meta.glob('../../art/trainers/out/*_stand.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const STANDS: Record<string, string> = Object.fromEntries(
  Object.entries(stands).map(([path, url]) => [base(path).replace(/_stand$/, ''), url]),
);

/** Isometric maps baked by art/tools/iso_map.py: the ground image and where everything upright stands. */
export interface MapSprite { art: string; x: number; y: number; fx: number; fy: number; wx: number; wy: number; key: number; decal: boolean }
export interface MapLayout { origin: { x: number; y: number }; tile: { w: number; h: number; z: number }; size: { w: number; h: number }; sprites: MapSprite[] }
const mapPngs = import.meta.glob('../../art/locations/out/maps/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const mapJsons = import.meta.glob('../../art/locations/out/maps/*.json', { eager: true, import: 'default' }) as Record<string, MapLayout>;
export const MAP_ART: Record<string, { png: string; layout: MapLayout }> = Object.fromEntries(
  Object.entries(mapJsons).map(([path, layout]) => [base(path), { layout, png: mapPngs[path.replace(/\.json$/, '.png')] }]),
);
/** The upright pieces those maps use, colour-graded to match (art/locations/out/graded). */
const props = import.meta.glob('../../art/locations/out/graded/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const PROP_ART: Record<string, string> = Object.fromEntries(Object.entries(props).map(([path, url]) => [base(path), url]));

export const SPRITES: Record<string, SpriteAsset> = {};
for (const [path, url] of Object.entries(anims)) {
  const key = base(path).replace(/_idle$/, '');
  const entry = (SPRITES[key] ??= {});
  entry.idle ??= { png: '', json: '' };
  entry.idle[path.endsWith('.json') ? 'json' : 'png'] = url;
}
for (const [path, url] of Object.entries(stills)) {
  const key = base(path);
  if (key.includes('_')) continue; // _flats, _shaded, _sil are pipeline previews
  (SPRITES[key] ??= {}).still = url;
}

/** Battle backdrops per location (art/battle/out/<id>.png, 256x192): the owner's drafts, converted. */
const battleBgs = import.meta.glob('../../art/battle/out/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const BATTLE_BGS: Record<string, string> = Object.fromEntries(Object.entries(battleBgs).map(([path, url]) => [base(path), url]));
/** The friends' big pixel figures for the assist cut-ins (art/tools/sheet2battle.py): <id>_battle.png. */
const trainerBattle = import.meta.glob('../../art/trainers/out/*_battle.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const TRAINER_BATTLE: Record<string, string> = Object.fromEntries(
  Object.entries(trainerBattle).map(([path, url]) => [base(path).replace(/_battle$/, ''), url]),
);
/** Patchlings following in the overworld (art/tools/turnaround2follow.py): 8 angles, FOLLOW_FRAME square. */
const follows = import.meta.glob('../../art/followers/out/*_follow.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const FOLLOW_SHEETS: Record<string, string> = Object.fromEntries(
  Object.entries(follows).map(([path, url]) => [base(path).replace(/_follow$/, ''), url]),
);
export const FOLLOW_FRAME = 32;
