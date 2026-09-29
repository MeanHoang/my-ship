# K5 — Review, one round

**Role:** reviewer (`.claude/roles/reviewer.md`), ONE subagent. Parent re-verifies and reports.

## When
**Once**, after ALL fixes of the batch (bugs) or ALL phases (feature) are done and confirmed (K4). Never per fix, never per phase, never a second round. A big risk seen mid-way → grill the owner (`.claude/workflow/grill-me.md`), do not add a review round.

## Scope
`git diff <base>...HEAD` (merge-base diff, base per profile §1) plus uncommitted changes of this task. Exclude generated files (profile §1) except to check they match their sources.

## Reviewer subagent
1. Read first: `progress.md` (the owner calls it process.md — goal, settled scope), `decisions.md`, `.claude/roles/reviewer.md` + profile §11 reviewer (together: the owner's checklist).
2. **Run the project's review command itself** inside the subagent (profile §8) — never a paraphrase of it, never a different reviewer agent.
3. Then walk the reviewer Standards list against the diff; each finding cites the Standards line it breaks.
4. BE fixes: confirm the test was not weakened and nothing is hard-coded to pass.

## Finding format
Severity is only `must-fix` (breaks behaviour / misses the GOAL, with a concrete scenario) or `optional` (everything else). Only must-fix findings are fixed; optional ones are listed for the owner.
`severity | file:line | what breaks, concrete scenario | standard/surface | suggested fix`. No `file:line` + scenario → drop it. Only issues introduced by this diff (). No style nitpicks.

## Parent
1. Open every must-fix finding's `file:line` yourself before reporting; drop what does not hold.
2. One report to the owner: findings + recommendation each. He decides.
3. Accepted findings → K3 → K4 → **their own commit** (K6), without re-running K5.

## Stop when
Report delivered. Nothing is fixed before the owner picks.
