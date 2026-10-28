# How we work (from 2026-10-27)

The owner (Callum) is the ideas side and approves visuals and dialogue; Claude builds. These rules
exist to save the owner's time and the token bill: they come from what went wrong in M2-M4b
(duplicate story builds, stacked PRs, image prompts pasted one at a time into ChatGPT).

## Start of every session (do this before anything else)
1. Read `CLAUDE.md` (the bible), then `docs/PLAN.md` (status, the latest handoff note).
2. Check the state on GitHub: open PRs, and whether the branch you were given already exists
   with commits. **If it does, continue from it; never rebuild work that is already there.**
   If its PR is merged, restart the branch from `main`.
3. Say in one or two lines what you found and what you'll do, then start.

## One milestone per session
- A session takes one milestone (or one clearly named piece of it) to done: code, tests, CI green,
  screenshots, PR. Then it writes a short **handoff note** in `docs/PLAN.md` (done, next, waiting
  on the owner) and stops. The next session starts fresh from that note, which is far cheaper than
  carrying a long conversation.
- **At most two sessions at once**, on files that don't overlap. Never stack PRs on PRs.

## Opus leads, Sonnet does the chores
- The milestone session runs on **Opus**: planning, design calls, art conversion, tricky systems
  (battle maths, engine, save migrations).
- **Sonnet** does routine, well-specified work: data entry (moves, lore, dialogue JSON), tests for
  code that exists, CI fixes with a clear error, small UI tweaks, doc updates.
  - Inside a session: the lead hands a chore to a Sonnet subagent (Agent tool, `model: sonnet`)
    with an exact brief, then checks the result.
  - Or by hand: the lead writes a chore list in `docs/PLAN.md`; the owner opens a new session and
    types `/model sonnet`.
- If a Sonnet result is wrong twice, the lead does it.

## Images: one prompt file per milestone
- The owner makes the drafts in ChatGPT by hand (no API script). To keep that quick, the lead writes
  **every prompt for the milestone** (all pieces, front and back) into one paste-ready file,
  `art/prompts/<milestone>.md`, before the code starts: each prompt complete on its own, with the
  images to attach and the path to save the result as. The owner runs them in one sitting.
- Only ask for what the game uses: walk sheets only for characters who walk (the four, followers).
  NPCs who stand still get two standing frames on their character sheet, never a walk sheet.
- The owner reads the file on a phone (GitHub app): keep each prompt in its own code block, wrapped
  to about 38 characters so it reads without scrolling and copies whole; check every block is closed
  after any edit. The file lives on the working branch, so give the owner the direct link.
- The owner sends results back in the chat in prompt order (no need to save them in the repo);
  the lead saves them to the listed paths and converts them in the same session.
- Use drafts whole when they work: a room concept becomes the room (`art/tools/room_concept.py`),
  a character sheet's small standing frame becomes the NPC (`art/tools/pose2sprite.py`). Piece
  sheets are only for when something has to move or come and go.
- New jokes or people from the owner mid-milestone: write the lines, add them to bible §11 and the
  prompt file, show the lines in chat. No separate approval round.
- Everything else in the art pipeline is unchanged (`art/BW_STYLE.md`, converters, pitch first).

## Building the game: chapters (from 2026-10-28)
The game is built in **chapters**, not place by place. A chapter is one playable slice: an area
(town or route), its story beat (and its Connor/Tally moment), the Patchlings that live there,
the sanctuary wing it restores and the inside jokes placed in it. One chapter = one cycle:
1. **Pitch** (one session, short): one doc in `docs/chapters/<n>.md` with the area, the story
   beats, every Patchling line, the jokes and the art list. The owner approves it in one reply.
2. **Art prompts**: every image the chapter needs in one file, `art/prompts/<chapter>.md`. The
   owner makes them in one sitting and sends them back in order.
3. **Build** (one session): convert the art, code, data, tests, screenshots.
4. **Review**: one screenshot sheet. Fix rounds stay on the same branch.
5. **PR only when the owner says the whole batch is right** (owner's rule, 2026-10-28). Check
   with screenshots and fast tests while fixing; full e2e once at the end.
Playtest feedback comes back as one list and is fixed in one session, as its own batch.

## Patchlings: whole evolution lines only (owner's rule, 2026-10-28)
A new Patchling is always pitched, drawn and built as its **full evolution line** (every stage,
front + back + idle) in one batch: no stage 1 now and evolutions later. The pitch has every stage;
the prompt file has every stage's concept and sprites.

## Owner reviews: once per milestone
- One screenshot sheet (from `e2e/screens.spec.ts`) plus any new written lines, in one short
  message. Approval goes in the PR; then the PR is marked ready and the owner merges.
- Messages to the owner stay short and plain.
