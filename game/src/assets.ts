/**
 * Sprites come straight from the claude-pxl output in ../art, so a newly exported creature
 * shows up in game without copying files. Keyed by the `sprite` field in patchlings.json.
 */
const anims = import.meta.glob('../../art/creatures/out/anims/*_idle.{png,json}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const stills = import.meta.glob('../../art/creatures/out/sprites/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export interface SpriteAsset { idle?: { png: string; json: string }; still?: string }

const base = (p: string) => p.split('/').pop()!.replace(/\.(png|json)$/, '');

/** Overworld walk sheets (art/tools/walk2sheet.py): <id>_walk.png, 24x32 frames, rows down/left/right/up. */
const walks = import.meta.glob('../../art/trainers/out/*_walk.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const WALK_SHEETS: Record<string, string> = Object.fromEntries(
  Object.entries(walks).map(([path, url]) => [base(path).replace(/_walk$/, ''), url]),
);
export const WALK_FRAME = { w: 24, h: 32 };
/** Single standing poses (art/tools/pose2sprite.py): <id>_stand.png. */
const stands = import.meta.glob('../../art/trainers/out/*_stand.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const STANDS: Record<string, string> = Object.fromEntries(
  Object.entries(stands).map(([path, url]) => [base(path).replace(/_stand$/, ''), url]),
);

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
