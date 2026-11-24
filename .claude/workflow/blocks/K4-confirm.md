# K4 — Confirm

**Role:** verifier (`.claude/roles/verifier.md`) — a fresh subagent, not the implementer.

## Input
K3 diff, the K2 before-evidence (same URL / state / widths, same test), `progress.md`.

## Which cases
The cases come from `.claude/ship/<slug>/test-cases.md`, written by the `test-designer` before the first K4 (`.claude/workflow/test-design.md`; no file yet → dispatch it first). Gate: `cases-check.mjs --cases <file>` exits 0 before the first case (complete table, merchant-first `ui:` cases); exit 2 → back to the test-designer. Clicking the happy path once is not a verify (owner 2026-11-03). First verify of the task: every case, report `N cases: ✅ X, ❌ Y, ⛔ Z (why)`. Every later retest: only the cases `select-cases.mjs --since <last tested sha>` returns (+ new cases for its `unmatched` files), not the whole table.

## Where to test, and the loop
Follow `.claude/workflow/test-loop.md`: ask the owner once per task **local or staging** (`test_target:` in `progress.md`), then loop test → fix → commit+push → retest until every item passes. Local: the stack is released when the loop ends. Staging: the `<integration-branch>` session merges + deploys; this session only monitors, then retests.

## Browser
Every page is opened the `/ship-verify` way: environment check, then the browser tool (profile §4) on the feature's route, waiting for its ready text.

## FE
1. Run the changed code where it can be seen:
   - local stack in this worktree (profile §5), or a staging environment after K7;
   - production data needed → local build + the profile §4 browser override (data/CSS only).
2. Screenshot in the **same state** as the before-shot → `tmp/shots/<bug>-3-after.png`. Same widths as K2.
3. Compare with before and with the live-fix image. Different from the live try → say how.

## BE
1. Re-run the K2 test → must pass. Show the raw output lines.
2. **Revert check — the test must fail without the fix.** A test that also passes on the old code proves nothing (Simon Willison, "Your job is to deliver code you have proven to work"; HN: suites of 467 green tests around a misunderstood bug). Never `git stash`:
   ```bash
   P=.claude/ship/<slug>/tmp/logs/revert-check-<item>.patch
   git diff -- <changed NON-test files> > "$P"      # saved first: the fix can always be restored from here
   git apply -R "$P"                                  # code back to before the fix, new test kept
   <run the K2 test>                                  # must FAIL — paste the failing line
   git apply "$P"                                     # fix back
   <run the K2 test>                                  # must PASS again
   git diff --stat                                    # same as before the check
   ```
   Run the test with the runner's cache off for these two runs (jest `--no-cache`, mocha/ts-node transpile cache off) — a reverted file changed within the same second can be served stale (seen in the dry run 29/09).
   Passes without the fix → the test does not catch the bug: report "test không bắt được lỗi", back to K2. `git apply` back fails → stop, report, the patch file holds the fix. Fix already committed → the same with `git diff HEAD~1 -- <files>`.
3. Run the existing tests of the touched package/folder (not the whole monorepo) → no new failures vs the base branch.
4. Check the diff did not touch the test's assertions (`git diff -- <test file>` shows only additions of the new case).
5. `node .claude/scripts/diff-guard.mjs` (no argument, from this worktree) must exit 0: no master line rewritten in a core calculation file, no new `return undefined`, no removed test assertion. Exit 2 → back to K3 (or the owner's approval recorded in `decisions.md`). Paste its output.
6. Impact map hard checks (profile §16, no argument, from this worktree): section 0 must say `none`. Exit code 2 → the change broke a Pub/Sub / Cloud Tasks / route edge: back to K3 before reporting. Paste section 0 in the report; name the section 1 flows you did not retest.

## Goal check (feature or any task with `analysis.md`)
After the per-item checks, walk every line of the GOAL (`analysis.md` §6) and each main flow of `plan.html` §4 on the real app (browser tool, profile §4). Per line: **met / not met** + image or output. A change whose items pass but misses a GOAL line is reported "not proven" for that line (owner, the owner's notes: "còn khá nhiều bug và không đúng ý mình").

## Report rules
- Numbers come from the command output you just ran, pasted — never from memory or the implementer's claim (an agent once reported 104 passing tests; the run had 89).
- "Fixed" is only said with the after-image or the passing output attached.
- Cannot run it (stack down, no access) → say "not verified" and why. Never imply it was.

## Output
Before/after image pair (FE) or fail→pass output (BE) + the revert-check output (FAIL without fix, PASS with it) + the regression run. Parent forwards images to the owner as images, not descriptions.

**Delivering images = they open on his screen.** A path in the report is not delivery (hit 28/09: two after-shots existed, he never saw them). The owner reads the chat in a terminal, so:
- 1–2 images → `open <before.png> <after.png>` (macOS Preview).
- More, or before/after pairs → write `tmp/shots/<bug>-compare.html` (each pair side by side, caption = state + width) and `open` it.
- Missing image → say which and why in one line, e.g. "Không có ảnh before: thay đổi chỉ là số request, bằng chứng thay thế = đếm log the local log 7 → 1 request."

## Stop when
First, if this verify started the dev stack: `release` it (profile §5) before reporting.
Confirmed → commit + push (K6), report. Still broken → K3 with the new evidence and retest (test-loop.md); the same item broken after 3 fixes → stop and ask the owner with the 3 attempts.
