# K2 — Reproduce

**Role:** verifier (`.claude/roles/verifier.md`). Never the implementer of the same bug.

**Test target first:** choose it per profile §4 and say it in one line (target + why) before reproducing.

## Input
K1 evidence (legs, settings + source, flow `file:line`), the test target/URL, `progress.md`.

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
If the profile defines one (profile §4): browser-only, never writes data, never clicks save/submit. Screenshots taken under an override carry `-override` in the filename.

## Output
Before-screenshot(s) + the evidence of cause (FE), or the failing test + raw output (BE). Paths under `tmp/`.

## Stop when
Reproduced → hand to K3 (or to the verdict in bug-check). Not reproducible → report what was tried; parent decides (`need-data` / `need-logging`).
