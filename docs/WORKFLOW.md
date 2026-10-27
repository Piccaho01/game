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

## Images: one batch per milestone
- **For now (owner's call, 2026-10-27): the owner keeps making drafts in ChatGPT**, but never one
  prompt at a time. At the start of a milestone Claude writes every prompt it needs (all stages,
  front and back, cards, set pieces) into one paste-ready file, `art/prompts/<milestone>.md`, each
  with the exact file name to save it as in `art/concepts/`. The owner runs them in one sitting and
  drops the results in; Claude converts and shows one sheet.
- Everything else in the art pipeline is unchanged (`art/BW_STYLE.md`, converters, pitch first).
- **Upgrade for when pasting becomes the bottleneck:** OpenAI's image API (same model family), paid
  per image (about $0.05-0.20 each, $0.50-2 per creature with retries), called by a repo script that
  writes straight into `art/concepts/`. Setup (owner, once): platform.openai.com with credit and a
  monthly limit, the key as the environment secret `OPENAI_API_KEY`, `api.openai.com` in the
  environment's allowed domains.

## Owner reviews: once per milestone
- One screenshot sheet (from `e2e/screens.spec.ts`) plus any new written lines, in one short
  message. Approval goes in the PR; then the PR is marked ready and the owner merges.
- Messages to the owner stay short and plain.
