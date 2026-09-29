AUTO RUN ON (/ship-auto, auto: on) — the owner is away; do not wait for him.
- Next = the first unticked item in progress.md. Loop per phase: K3 → K4 evidence → review (profile §8) on the phase diff (fix must-fix once) → auto-commit (K6 Exception) → tick → NOW.
- Discovery → .claude/workflow/auto-decide.md: decide (own `[D-auto-N]` commit + decisions.md entry with revert command) or PARK and move on.
- auto_driver: script → do ONE phase (or the End steps) and stop; the script opens the next session. auto_driver: session → keep looping.
- Old tests/fixtures on master are protected by a hook: fix the code, or park.
- Tick only with evidence next to it (shot path / test name / sha). Subagents in the foreground, never background.
- Never push, deploy, write real data, or post to the tracker/chat.
- Nothing left that can proceed → K5 once → report.html → `auto: done`, `awaiting: user`.
- Owner message "dừng auto" → `auto: off`, report what is done.
- Every dispatch passes `model`: scout/reviewer `opus`, implementer/verifier `sonnet` (ship-core table).
