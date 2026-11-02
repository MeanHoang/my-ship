---
name: ship-verify
description: Use when the owner asks whether a change really works or a bug is really fixed ("is it really fixed", "prove it", "test this again"), before anyone claims "fixed", and whenever a verifier needs to open the app in a browser (K2, K4, K7 retest). Works on any branch, with or without a ship task.
---

# /ship-verify — prove it on the real app

Read first: `.claude/workflow/blocks/K2-reproduce.md`, `K4-confirm.md`, `.claude/roles/verifier.md`, profile §4/§5/§11 verifier.
Why it is built this way: verification is the step that lets you trust an agent (Lauren Tan, "trust ladder": a control skill plus a **feature map**). The browser part is a script, not prose, so the agent cannot forget a trap.

## The browser tool (profile §4 names it)
A small script the project owns (e.g. `.claude/skills/ship-verify/scripts/ui.mjs`) wrapping the browser CLI the team uses. It should offer:

| Command | Does |
|---|---|
| `doctor` | environment checks that caused stuck runs before: browser ready, dev stack listening, disk free, clock skew, dependencies older than the lockfile |
| `open <feature>` | opens a feature **by name** from the feature map (route + in-app clicks) and waits for its ready text; recovers known stuck states (an error page after a dev-server re-bundle, an endless loading screen) with at most 2 reloads, then stops with hints |
| `ready --text "<t>"` | the same wait for a page reached another way — never wait by re-taking screenshots |
| `shot <name>` | waits until the page content stops changing (no skeletons), saves under the task's `tmp/shots/` |
| `console` | recent console errors, duplicates folded |
| `measure <A> <B>` | box and centre offsets of two elements in px — alignment is measured, never judged from an image |

## The feature map (`feature-map.json`)
- One entry per feature: the names people use, route, in-app clicks, `ready` text, known traps.
- A missing feature → find its route in code, open it once, add it with the text you actually saw. A wrong entry → fix it in the same run. The map grows from real verifies, never from guesses.
- `diff-guard.mjs` flags a removed route that the map still opens.

## Steps
1. Name the claim in one line ("bug X no longer happens when Y") and the test target + why (profile §4).
2. Dispatch ONE verifier subagent (`model` per ship-core). Give it file paths to read, not pasted text. It never edits production code.
3. **BE:** the covering test FAILS without the change and PASSES with it (K4 revert check, patch-based, never `git stash`), plus the package's existing tests.
   **FE:** `doctor` → `open` → before/after `shot` in the same state and widths; content checks via page text / console.
4. **Goal check (when a ship task exists):** walk every GOAL line (`analysis.md` §6) and every `ACC:` line on the real app. Each: met / not met + image. A fix that works but misses the goal is "not proven".
5. Report: **proven / not proven / cannot verify (why)**, with raw output or opened images. No evidence → "not verified".
6. Started the local stack for this → stop it (profile §5).

## Keeping it good
- Every time a verify gets stuck or the owner finds something the verifier missed, add a case to `evals/cases.md`; re-run the eval after editing this skill or the browser tool (`evals/README.md`).
- A trap fixed in the tool is deleted from prose elsewhere — one place only.
