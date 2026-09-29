---
name: ship-bugs
description: Use when testers/UAT report one or more bugs on a feature branch that is already being built or tested ("tester báo bug", a list of bug numbers in the task comments, "fix mấy bug UAT này"). Not for a production bug reported by an end user (use the project's production-bug skill, profile §1).
---

# /ship-bugs — tester bug batch (mode STABILIZE)

Read first: `.claude/workflow/ship-core.md`, `.claude/ship-profile.md`.

| # | Step | Block | Role | Stop? |
|---|---|---|---|---|
| 1 | Read the bug list (by number) | — | parent | — |
| 2 | Per bug: real settings on the test target + code + **attribution** (`git log -S` → commit, author, date) | K1 | scout; bugs on different surfaces → scouts in parallel | from base / another dev → report, do not fix |
| 3 | Per bug, **sequential**: reproduce → fix → confirm | K2 → K3 → K4 | verifier → implementer → verifier | FE live-fix approval; real trade-offs only |
| 4 | Per bug: commit | K6 | parent | 🚦 "commit" — **one commit per bug** |
| 5 | End of batch: review once | K5 | reviewer | findings → own fix commits |
| 6 | Push / deploy / retest | K7 | parent + verifier | only when told |

`progress.md` (`mode: STABILIZE`) projects the bug list: one `###` per bug with a `Files:` line (filled after K1) and rows attribution → reproduce → fix → confirm → commit, plus one K5 row. A bug reported mid-batch → new `###` at the end of the queue, same loop. Scope: only reported bugs, no refactors.
