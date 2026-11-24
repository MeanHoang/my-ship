---
name: ship-review
description: Use when the owner asks to review a branch or a set of changes once ("review nhánh này", "review 1 vòng", "check code trước khi push"), inside or outside a ship flow.
---

# /ship-review — one review round (K5 standalone)

Read first: `.claude/workflow/blocks/K5-review.md`, `.claude/roles/reviewer.md`, profile §8/§11 reviewer.

1. Scope: run `node .claude/scripts/review-gate.mjs` — it prints the range: the whole branch (`git diff <base>...HEAD`, base: profile §1) on the first review or after a merge of master; otherwise only `<reviewed-sha>..HEAD`. Plus uncommitted changes. Read `progress.md` / `decisions.md` if a ship task exists — they hold the goal and settled scope.
2. Run K5 as written: the Claude reviewer subagent (role file + `roles/review-checklist.md` + profile §11 reviewer + K5, `model: opus` (Opus 5.5, ship-core model table); it runs the project's review command itself, profile §8) **and** the Codex reviewer (`.claude/scripts/codex-review.mjs review`) in parallel; backend diff → edge-review too.
3. Cross-verify, merge duplicates, drop what `decisions.md` / "Waiting on" already settles, and prove every remaining must-fix yourself (K5 "Parent" steps 1–5). Findings are only `must-fix` (proven) or `optional`.
4. When no proven must-fix is left unfixed: `node .claude/scripts/review-gate.mjs --mark`. Fixes made from this review get their own delta review before the next mark (K5 step 6).
5. One report to the owner with only the verified result and the counts line. Never ask him whether to prove a finding. Nothing is fixed before he picks; accepted fixes = their own commits (K6).
