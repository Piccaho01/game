import Phaser from 'phaser';
import type { Progress } from '../engine/progress';
import { saveProgress } from '../save';
import { CHAR_MS, party, setParty, setSound, setTextSpeed, soundOn, textSpeed, type TextSpeed } from '../settings';
import { drawPanel, button, tapeLabel } from './kit';
import { pixelText } from './text';
import { COLORS, TEXT_COLORS, TEXT_SIZE, TONES } from './theme';
import { SCREEN_H, SCREEN_W } from '../config';

/**
 * The settings on the touch screen (M6): sound, text speed, squad/solo. Shared by the title
 * screen, the pause menu and the Journal's OPTIONS tab. Adds its pieces to `into` from `y0` down
 * (about 130 px tall) and calls `changed` after every pick so the caller can redraw.
 * Buttons are named `opt-*` for tests.
 */
export function settingsPanel(scene: Phaser.Scene, into: Phaser.GameObjects.Container, y0: number, progress: Progress | null, changed: () => void) {
  const head = { color: TEXT_COLORS.dim, size: TEXT_SIZE.small };
  const pick = (fn: () => void) => () => { fn(); if (progress) saveProgress(progress); changed(); };

  into.add(pixelText(scene, 128, y0, 'Sound effects', head).setOrigin(0.5, 0));
  const on = soundOn();
  into.add(button(scene, 66, y0 + 24, 118, 22, 'ON', on ? TONES.go : TONES.neutral, pick(() => setSound(true)), { name: 'opt-sound-on', selected: on }));
  into.add(button(scene, 190, y0 + 24, 118, 22, 'OFF', !on ? TONES.go : TONES.neutral, pick(() => setSound(false)), { name: 'opt-sound-off', selected: !on }));

  into.add(pixelText(scene, 128, y0 + 44, 'Text speed', head).setOrigin(0.5, 0));
  const speed = textSpeed();
  (['slow', 'normal', 'fast'] as TextSpeed[]).forEach((s, i) => {
    into.add(button(scene, 46 + i * 82, y0 + 68, 78, 22, s.toUpperCase(), s === speed ? TONES.go : TONES.neutral, pick(() => setTextSpeed(s)), { name: `opt-speed-${s}`, selected: s === speed }));
  });

  into.add(pixelText(scene, 128, y0 + 88, 'Who walks with you on the map', head).setOrigin(0.5, 0));
  const mode = party(progress);
  into.add(button(scene, 66, y0 + 114, 118, 30, 'SQUAD', mode === 'squad' ? TONES.go : TONES.neutral, pick(() => setParty('squad', progress)), { sub: 'All four friends', name: 'opt-squad', selected: mode === 'squad' }));
  into.add(button(scene, 190, y0 + 114, 118, 30, 'SOLO', mode === 'solo' ? TONES.go : TONES.neutral, pick(() => setParty('solo', progress)), { sub: 'You + your Patchling', name: 'opt-solo', selected: mode === 'solo' }));
}

/** A line in each text speed, for the top screen's preview box. */
export const SPEED_SAMPLE: Record<TextSpeed, string> = {
  slow: 'Slow. Every word, savoured. Like a loading bar.',
  normal: 'Normal speed. As I designed it. You\'re welcome.',
  fast: 'Fast. For people who skip my tutorials. So, all of you.',
};

/**
 * A text box along the bottom of the top screen that types PATCH's line at the chosen speed.
 * Pass the last one back in to replace it.
 */
export function speedPreview(scene: Phaser.Scene, old?: Phaser.GameObjects.Container) {
  old?.destroy();
  const c = scene.add.container(0, 0).setDepth(20);
  const y = SCREEN_H - 45;
  c.add(drawPanel(scene.add.graphics(), 4, y, SCREEN_W - 8, 38, 'paper'));
  c.add(tapeLabel(scene, 12, y - 6, 'PATCH', COLORS.crt));
  const line = SPEED_SAMPLE[textSpeed()];
  const text = pixelText(scene, 14, y + 6, '', { color: TEXT_COLORS.ink, wrap: SCREEN_W - 32 });
  c.add(text);
  const counter = { shown: 0 };
  const typer = scene.tweens.add({ targets: counter, shown: line.length, duration: line.length * CHAR_MS[textSpeed()], delay: 150, onUpdate: () => text.setText(line.slice(0, Math.floor(counter.shown))) });
  c.once('destroy', () => typer.remove());
  return c;
}

/** The top screen's explainer for the current squad/solo pick. */
export function partyBlurb(progress: Progress | null) {
  return party(progress) === 'solo'
    ? 'Solo: just whoever leads and their lead Patchling walk the map. The others still show up in cutscenes, and SWITCH still swaps who leads.'
    : 'Squad: all four friends walk the map in a line, with the leader\'s Patchling hopping behind them.';
}
