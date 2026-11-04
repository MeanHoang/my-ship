# K2 — Reproduce

**Role:** verifier (`.claude/roles/verifier.md`). Never the implementer of the same bug.

**Test target first:** choose it per profile §4 and say it in one line (target + why) before reproducing.

## Input
K1 evidence (legs, settings + source, flow `file:line`), the test target/URL, `progress.md`.

**Before evidence comes before any fix code** (K3 does not start without `tmp/shots/<bug>-1-before.png` or `tmp/logs/<bug>-fail.txt`). Local cannot show it → reproduce NOW where the bug lives (the tester's store / staging) while it still runs the old build, i.e. before the fix's `MERGE-DEPLOY`. Truly impossible (needs a prod-only state) → write in `progress.md` at K2 time "không có ảnh trước: <why>, bằng chứng thay thế: <failing test>", not at the end (2026-11-04: the bug was only reproduced after the fix was deployed, so "before" was a unit test only).

## FE bug (UI)
1. Browser (profile §4) → the exact page/state from the report (same account, user state, viewport).
2. Screenshot the bug → `tmp/shots/<bug>-1-before.png`. Several widths when layout is involved (typical widths: profile §4).
3. Capture what explains it: `read_console_messages`, `read_network_requests`, the DOM/computed style of the broken node → `tmp/logs/`.
4. Cannot reproduce with the real data → use the project's browser override recipe (profile §4) to feed the actual settings, or report "not reproduced" with what was tried.

## BE bug
1. Write a **failing** test or script that reproduces the report with the account's real settings shape.
   - Preferred: a unit test beside its sibling test (find the package's existing test files and copy their setup). It ships with the fix.
   - No test harness for that path → a throwaway script `tmp/logs/repro-<bug>.js`, output saved next to it.
2. Run it and keep the raw failing output (`tmp/logs/<bug>-fail.txt`). A test that passes before the fix does not reproduce the bug — rewrite it.

## Browser override
For PRODUCTION data shown in the browser (profile §4): browser-only, never writes data, never clicks save/submit. This is not about test stores: on local / staging the verifier builds any setup it needs, saves included (`roles/verifier.md` "Setup is your job"). Screenshots taken under an override carry `-override` in the filename.

## Output
Before-screenshot(s) + the evidence of cause (FE), or the failing test + raw output (BE). Paths under `tmp/`.

## Stop when
Reproduced → hand to K3 (or to the verdict in bug-check). Not reproducible → report what was tried; parent decides (`need-data` / `need-logging`).
