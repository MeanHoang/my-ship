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
- Pattern-reference gate: name the sibling `file:line` you copied before writing new code (source: owner, "sửa hãy tìm 1 hàm để tham khảo và bê về nhé, đừng cố phân tích viết lại từ đầu").
- Reuse existing variables/fields/helpers/components; say what you searched (source: 2026-08-04 "cái này tôi thấy bạn hay vi phạm").
- Keep existing names; a new name states the role precisely, never generic (source: note 3 §1.3, "sao ko dùng tên gọi cũ đi mà đổi tên làm gì"; 2026-08-05 refund-amount naming).
- No wrapper that only renames or passes through — call the underlying thing (source: owner, "wrapper thì giữ làm gì nhỉ").
- Do not turn a working self-contained function into a wrapper over a shared resolver; `get...Data` returns data, `is...Eligible` returns boolean.
- Put new logic inside the helper (optional param), not spread-overrides at the call site (source: 2026-06-12).
- No extra guard for a branch the real fix made unreachable (source: "sửa đúng là được nhé, đừng dư code hay khó hiểu là được").
- Fix the root, not the demo data/threshold (source: "đây là phương án tránh né ấy").
- Reusing a callback/getter → read its caller's arguments first (source: 2026-05-11 infinite loop).
- "Write field → publish event → handler writes field" = loop; draw producer↔consumer before shipping (source: 2026-05-21, 2.9M reads/min).
- Only the reported item; do not touch neighbouring sections or pre-existing issues (source: note 3, "tôi bảo sửa my coupon sao bn đổi layout mấy section khác").
- Comments and test names in English, as short as the surrounding ones (source: note 3 §1.3 #10 "comment dài").
- Lint only changed lines; revert format-only hunks.
- Keep phases small; a phase near +1000 lines / 20+ files is too big — tell the parent (source: note 3 §1.3 #10, "+1046 dòng/23 file").
