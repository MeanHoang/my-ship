---
name: ship-auto
description: Use when a /ship plan has passed Gate 2 and the owner wants the rest to run unattended ("move auto", "treo máy", "chạy auto qua đêm", "--auto"), or when he says "dừng auto" / asks how an auto run went.
---

# /ship-auto — unattended run after Gate 2

Read first: `.claude/workflow/ship-core.md`, `.claude/workflow/auto-decide.md`, `.claude/ship-profile.md` (§5, §6, §10).
For big features the owner leaves the machine running. Gate 1 and Gate 2 stay in `/ship` (a wrong plan makes every later phase wrong). Everything after Gate 2 runs without him; he reads `report.html` at the end.

For big features the owner leaves the machine running. Gate 1 and Gate 2 are **unchanged** (a wrong plan makes every later phase wrong). Everything after Gate 2 runs without him; he reads `report.html` at the end.

## Start (only on "move auto" at Gate 2 of `/ship`, or `--auto` given and Gate 2 passed)
1. Preflight, all in one message — anything failing is fixed or parked BEFORE he leaves: `git status` clean except this task · auth per profile §6 · disk `df -h /` · dev stack needed? (profile §5) and who owns the ports · browser connected if any phase needs FE verification (not connected → those K4 checks are parked, BE phases still run).
2. Ask him ONE line: *"Cho chạy đến mấy giờ?"* → `auto_until: YYYY-MM-DD HH:MM` (no answer = no limit, say so).
3. State block: `auto: on`, `auto_driver: script`, `auto_until: …`, `awaiting: none`, `gate: none`. NOW → "AUTO — Phase 1".
4. Launch the driver, detached so closing the tab does not kill it:
   `nohup bash .claude/scripts/ship-auto-run.sh "$(git rev-parse --show-toplevel)" > .claude/ship/<slug>/tmp/logs/auto-run.out 2>&1 &`
   It opens a **fresh `claude -p` session per phase** (no drift over hours), stops at `auto_until`, and stops after 2 sessions without progress — each stop ends with one last session that writes the report.
   Fallback `auto_driver: session` (he wants to watch in this chat, or the script cannot start): this session loops itself, kept going by the Stop hook `ship-auto-continue.sh`.
5. Tell him in one line: phases that will run, stop time, what is parked already, "em sẽ không push", how to stop (`dừng auto`).
6. While the script runs, THIS session only reads and answers — it never edits the task's files or code (two writers = broken state).

## Loop, per phase (dependent phases in plan order; phases with disjoint files may run as parallel implementer subagents):
1. K3 implementer → K4 verifier (evidence mandatory; no evidence = not done).
2. FE live-fix approval is replaced by the verifier's before / live-try / after shots; the parent accepts only if the after-shot matches the phase's Verify line. All shots go into the report.
3. **Per-phase review (auto only):** reviewer subagent runs the project's review command (profile §8) on this phase's diff, and states spec compliance: missing / extra / misunderstood vs the phase card. Must-fix findings → one fix round → K4 again. Still failing → park the phase (auto-decide §5).
4. K6 auto-commit (K6 "Exception"). Tick **with the evidence next to it** (`- [x] … — evidence: tmp/shots/… · test name · sha`); a tick without evidence is not done. Heading ✅, NOW → next phase.
5. Discoveries A/B/C → `.claude/workflow/auto-decide.md`: decide or park; every decision = its own `[D-auto-N]` commit + `decisions.md` entry with its revert command.
6. Dispatch subagents in the **foreground** during auto (never `run_in_background`): the Stop hook fires at turn end, and a turn that ends while a subagent still runs counts as a stall.

## End
1. K5 once over the whole branch (cross-phase issues). Must-fix → own commit; the rest go to the report.
2. Render `.claude/skills/ship/templates/report.html` → `.claude/ship/<slug>/report.html` (copy, fill placeholders, never edit its `<style>`), `open` it.
3. State: `auto: done`, `awaiting: user`; NOW → "AUTO xong — đọc report.html"; "Waiting on user" = the parked list + the D-auto decisions to confirm. Every parked scope/UX item carries a product Decide card (block P, `opus`) so he can decide in one read.
4. Never push, deploy or post to the task tracker / chat.

## Owner back
 he answers per decision "giữ" / "đảo". "đảo D-auto-N" → `git revert <sha>` (his consent is that message), then build the rejected option through the normal (non-auto) flow. Parked items → normal gates. He can type "dừng auto" any time → `auto: off`, report what is done.

## Hard guards while `auto: on`
 (hook `ship-auto-guard.sh`): editing/deleting an assertion or fixture that exists on the base branch is denied (fix the code; a truly wrong old test → park); the `progress.md` checklist may never lose a checkbox (park = keep the box, prefix `⏸`). Time limit and stall stop: `auto_until` + 2 sessions/pushes without progress (NOW + HEAD + ticks unchanged).
