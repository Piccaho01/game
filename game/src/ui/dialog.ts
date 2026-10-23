import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W } from '../config';
import { drawPanel, tapeLabel } from './kit';
import { pixelText } from './text';
import { COLORS, TEXT_COLORS } from './theme';

const CHAR_MS = 18;
const LINE_HOLD_MS = 700;
const BOX_H = 38;

export interface ShowOpts {
  /** A name taped to the box's top edge (NPC dialogue). */
  speaker?: string;
  /** Wait for a tap after the line instead of moving on by itself (dialogue the player reads). */
  waitForTap?: boolean;
}

/**
 * The text box along the bottom of the top screen (battle messages, dialogue). A tap anywhere
 * finishes the typing, then moves on.
 */
export class DialogBox {
  private box: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Graphics;
  private speaker?: Phaser.GameObjects.Container;
  private skip?: () => void;
  private readonly y = SCREEN_H - BOX_H - 7;

  constructor(private scene: Phaser.Scene, private depth = 5) {
    this.box = drawPanel(scene.add.graphics().setDepth(depth), 4, this.y, SCREEN_W - 8, BOX_H, 'paper');
    this.text = pixelText(scene, 14, this.y + 9, '', { color: TEXT_COLORS.ink, wrap: SCREEN_W - 32 }).setDepth(depth + 1);
    this.arrow = scene.add.graphics().setDepth(depth + 1).setVisible(false);
    this.arrow.fillStyle(COLORS.rust).fillRect(0, 0, 7, 1).fillRect(1, 1, 5, 1).fillRect(2, 2, 3, 1).fillRect(3, 3, 1, 1);
    this.arrow.setPosition(SCREEN_W - 20, this.y + BOX_H - 9);
    scene.tweens.add({ targets: this.arrow, y: this.arrow.y + 2, duration: 300, yoyo: true, repeat: -1 });
    scene.input.on('pointerdown', () => this.skip?.());
  }

  private setSpeaker(name?: string) {
    this.speaker?.destroy();
    this.speaker = name ? tapeLabel(this.scene, 12, this.y - 6, name).setDepth(this.depth + 2) : undefined;
  }

  /** Hides the box (the overworld only shows it while someone talks). */
  hide() {
    this.setSpeaker();
    for (const o of [this.box, this.text, this.arrow]) o.setVisible(false);
  }

  private reveal() {
    this.box.setVisible(true);
    this.text.setVisible(true);
  }

  /** What a tap does: finish the typing, or move on. For keys (Space, Enter). */
  advance() {
    this.skip?.();
  }

  get open() {
    return this.box.visible && !!this.skip;
  }

  /** A line that stays up while the player chooses. */
  prompt(line: string) {
    this.reveal();
    this.setSpeaker();
    this.arrow.setVisible(false);
    this.text.setText(line);
  }

  /** Types the line out, then waits briefly (or for a tap) before resolving. */
  show(line: string, opts: ShowOpts = {}) {
    this.reveal();
    this.setSpeaker(opts.speaker);
    return new Promise<void>((resolve) => {
      let done = false;
      let hold: Phaser.Time.TimerEvent | undefined;
      let typed = false;
      this.text.setText('');
      this.arrow.setVisible(false);
      // Driven by elapsed time, not frames, so slow devices skip letters instead of crawling.
      const counter = { shown: 0 };
      const typer = this.scene.tweens.add({
        targets: counter, shown: line.length, duration: line.length * CHAR_MS,
        onUpdate: () => this.text.setText(line.slice(0, Math.floor(counter.shown))),
        onComplete: () => finishTyping(),
      });
      const finish = () => {
        if (done) return;
        done = true;
        hold?.remove();
        this.skip = undefined;
        this.arrow.setVisible(false);
        resolve();
      };
      const finishTyping = () => {
        if (typed) return;
        typed = true;
        typer.stop();
        this.text.setText(line);
        this.arrow.setVisible(true);
        if (!opts.waitForTap) hold = this.scene.time.delayedCall(LINE_HOLD_MS, finish);
        this.skip = finish;
      };
      this.skip = finishTyping;
    });
  }
}
