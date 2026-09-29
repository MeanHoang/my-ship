# K6 — Commit (strict consent)

**Role:** parent only. Subagents never commit.

## Input
A confirmed item (K4 evidence) or accepted review fixes, and the owner's latest message.

## Consent
- Commit only when the owner's **latest message** says "commit" (or "ok commit") for **this** item. Look for the word each time; do not infer it from context or from an earlier approval.
- "sửa nhé", "fix nhé", "tiếp", "ừ" ≠ commit. Ambiguous → ONE question: *"OK này là commit <item> luôn đúng không?"*
- Consent never carries over: next bug / next phase / late fix → new consent. (2026-08-05 after two approved commits the third was chained on "sửa nhé" and had to be questioned.)
- A `--note` like "cứ commit luôn" is not consent for an unreported item.
- The item report ends with one line asking for it, e.g. *"Nói 'commit' để em commit bug #3."*

## Exception — `/ship-auto` (owner approved at Gate 2, 2026-09-29)
While `auto: on` in the `progress.md` state block, the parent commits **without asking**, because the owner is away and per-item commits are what make each choice revertable:
- One commit per phase (feature) or per bug, only after its K4 evidence exists.
- One **separate** commit per auto decision, message tagged `[D-auto-<N>]` (see `.claude/workflow/auto-decide.md`); write the sha back into its `decisions.md` entry.
- Everything under "How" below still applies (explicit paths, English, no amend, no `--no-verify`). **Never push** — push stays K7 on his instruction.
- `auto: off` / `done` → strict consent again.

## Granularity
| Flow | One commit per |
|---|---|
| Tester bugs (STABILIZE) | bug |
| Feature (SHIP) | phase |
| Single bug (project bug skill) | the fix |
| K5 findings | fix round the owner accepted |

## How
0. Hook `ship-scope-guard.sh` denies a commit containing a file not named in `progress.md` (phase checklist, bug `Files:` line, or "Việc phát sinh ngoài plan"). Out-of-plan but needed → one line in "Việc phát sinh ngoài plan" with the reason, and name it in the report to the owner. Not needed → unstage and drop it.
1. `git status` + `git diff --stat` → stage **explicit paths** of this item only. Never `git add -A` / `git add .`.
2. Never stage: `.claude/ship/**`, docs/tracking files, format-only hunks outside the change, plus the project's list (profile §9).
3. Message in **English**, repo convention (`fix:` / `feat:` / `refactor:` — check `git log`), plus the attribution trailer from the session instructions. Exception: a `[deploy-only]` commit carries no body except the `--only` argument (see `deploy-staging`).
4. Never amend, never `--no-verify`, never push (push = K7 on a separate instruction).

## Before the consent line
Did the owner correct the work on this item ("sao lại…", "không phải…", a rejected fix)? If yes, draft ONE Standards line + target role and put it in the same report: *"Thêm vào Standards của `<role>`: '<line>'?"* (roles/README.md flow). Nothing to add → say nothing.

## After
- `progress.md`: tick the item, move the single `> **NOW:**` line.
- `decisions.md`: append only if the item produced a real decision or lesson.
- Delete that item's `tmp/shots/` (the images were already sent in chat).

## Stop when
Committed → next item. No consent → park (edit NOW, fill "Waiting on user") and end the turn.
