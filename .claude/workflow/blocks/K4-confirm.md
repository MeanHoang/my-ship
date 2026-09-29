# K4 — Confirm

**Role:** verifier (`.claude/roles/verifier.md`) — a fresh subagent, not the implementer.

## Input
K3 diff, the K2 before-evidence (same URL / state / widths, same test), `progress.md`.

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
3. Run the existing tests of the touched package/folder (not the whole monorepo) → no new failures vs `origin/master`.
4. Check the diff did not touch the test's assertions (`git diff -- <test file>` shows only additions of the new case).

## Report rules
- Numbers come from the command output you just ran, pasted — never from memory or the implementer's claim (an agent once reported 104 passing tests; the run had 89).
- "Fixed" is only said with the after-image or the passing output attached.
- Cannot run it (stack down, no access) → say "not verified" and why. Never imply it was.

## Output
Before/after image pair (FE) or fail→pass output (BE) + the revert-check output (FAIL without fix, PASS with it) + the regression run. Parent forwards images to the owner as images, not descriptions.

**Delivering images = they open on his screen.** A path in the report is not delivery (hit 28/09: two after-shots existed, he never saw them). The owner reads the chat in a terminal, so:
- 1–2 images → `open <before.png> <after.png>` (macOS Preview).
- More, or before/after pairs → write `tmp/shots/<bug>-compare.html` (each pair side by side, caption = state + width) and `open` it.
- Missing image → say which and why in one line, e.g. "Không có ảnh before: thay đổi chỉ là số request, bằng chứng thay thế = đếm log `firebase-debug.log` 7 → 1 request."

## Stop when
Confirmed → parent reports the item and asks for commit (K6). Still broken → back to K3 once with the new evidence; broken again → parent stops and asks the owner with both attempts.
