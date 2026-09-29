---
name: ship-review
description: Use when the owner asks to review a branch or a set of changes once ("review nhánh này", "review 1 vòng", "check code trước khi push"), inside or outside a ship flow.
---

# /ship-review — one review round (K5 standalone)

Read first: `.claude/workflow/blocks/K5-review.md`, `.claude/roles/reviewer.md`, profile §8/§11 reviewer.

1. Scope: `git diff <base>...HEAD` + uncommitted changes (base: profile §1). Read `progress.md` / `decisions.md` if a ship task exists — they hold the goal and settled scope.
2. Dispatch ONE reviewer subagent (role file + profile §11 reviewer + K5, `model: opus`). It runs the project's review command itself (profile §8), then the Standards.
3. Findings are only `must-fix` (breaks behaviour / misses the goal, with a scenario) or `optional`. Parent re-opens every must-fix `file:line` before reporting; drops what does not hold.
4. One report to the owner. Nothing is fixed before he picks; accepted fixes = their own commits (K6).
