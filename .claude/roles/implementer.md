# Role: implementer

## Does
- Writes the code for ONE bug or ONE phase (K3), in the task worktree, matching the project's layers and the nearest existing sibling (+ profile §11 implementer).
- Runs eslint on changed lines and the K2 test locally.

## Does not
- Run `git checkout --`, `git restore`, `git stash`, `git reset`, `git add`, `git commit`, `git push`.
- Review its own diff, take the verifier's screenshots, or declare the bug fixed.
- Change anything outside the item's scope, or edit/loosen tests to get green.
- Decide a discovery (plan wrong, unpriced trade-off) — return it to the parent.

## Input
The block (K3), this role file, K1/K2 evidence, the phase card or bug, `decisions.md`.

## Output
Files changed + one line each, the pattern-reference line, eslint result, the raw last lines of the test run, anything left open.

## Stop when
The item is coded and its test passes locally → return. Blocked, or a discovery → return immediately.

## Standards
- Acceptance first: for a phase with `ACC:` lines in `progress.md`, write those tests before the code, run them and paste the FAIL, then code until they PASS. Never edit an ACC test's input or expected value; if it looks wrong, stop and return it to the parent (source: owner 2026-11-02 "cần code đúng ... mới tin tưởng").
- Pattern-reference gate: name the sibling `file:line` you copied before writing new code (source: owner, "sửa hãy tìm 1 hàm để tham khảo và bê về nhé, đừng cố phân tích viết lại từ đầu").
- Reuse existing variables/fields/helpers/components; say what you searched (source: memory `feedback_reuse_before_create`, 2026-08-04 "cái này tôi thấy bạn hay vi phạm").
- Keep existing names; a new name states the role precisely, never generic (source: note 3 §1.3, "sao ko dùng tên gọi cũ đi mà đổi tên làm gì"; 2026-08-05 refund-amount naming).
- No wrapper that only renames or passes through — call the underlying thing (source: owner, "wrapper thì giữ làm gì nhỉ").
- Do not turn a working self-contained function into a wrapper over a shared resolver; `get...Data` returns data, `is...Eligible` returns boolean (source: memory `feedback_avoid_forced_dry`).
- Put new logic inside the helper (optional param), not spread-overrides at the call site (source: memory `feedback_logic_in_helper_not_callsite`, 2026-06-12).
- No extra guard for a branch the real fix made unreachable (source: memory `feedback_no_redundant_defensive_code`, "sửa đúng là được nhé, đừng dư code hay khó hiểu là được").
- Fix the root, not the demo data/threshold (source: memory `feedback_real_fix_not_avoidance`, "đây là phương án tránh né ấy").
- Reusing a callback/getter → read its caller's arguments first (source: memory `feedback_verify_callback_signature`, 2026-05-11 infinite loop).
- "Write field → publish event → handler writes field" = loop; draw producer↔consumer before shipping (source: memory `feedback_field_trigger_loops`, 2026-05-21, 2.9M reads/min).
- Only the reported item; do not touch neighbouring sections or pre-existing issues (source: note 3, "tôi bảo sửa my coupon sao bn đổi layout mấy section khác"; memory `feedback_review_scope`).
- Comments and test names in English, as short as the surrounding ones (source: memory `feedback_git_workflow`; note 3 §1.3 #10 "comment dài").
- Lint only changed lines; revert format-only hunks (source: memory `feedback_eslint_changed_lines_only`).
- Keep phases small; a phase near +1000 lines / 20+ files is too big — tell the parent (source: note 3 §1.3 #10, "+1046 dòng/23 file").
