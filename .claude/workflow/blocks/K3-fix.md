# K3 — Fix

**Roles:** verifier (FE live try) → parent (show the owner) → implementer (`.claude/roles/implementer.md`) writes code. Which implementer agent and which model: profile §7 — always pass `model` explicitly.

## Input
K2 output, K1 flow, `progress.md`, `decisions.md`, the role file, and for a feature the phase card from `plan.html` §4.

## FE — prove the direction in the browser first
1. Verifier tries the fix **live** in the browser (DevTools CSS / the profile §4 override). No code yet.
2. Screenshot → `tmp/shots/<bug>-2-live-fix-override.png`.
3. Parent sends the owner **both images** (before + live fix) and a 2–3 line suggested code change (which file, which rule). 🚦 Wait for his OK.
4. Only then the implementer changes code.
Why: real codebases have hidden couplings; a fix guessed from reading code alone is vague. A live try proves the direction first.

**This gate is not optional** — it applies to tester bugs AND to every FE phase of a feature. Skipping straight to the implementer is a process error (hit 28/09, Phase 3 of `lp-v2-save-perf`).
- FE change with **nothing visible to try live** (request count, performance, a toast that needs a backend failure) → the parent still stops here and sends: *"Không thử live được vì <lý do>. Bằng chứng thay thế sẽ là <log count / unit test / …>. Anh OK để em code không?"* 🚦 Wait for his OK.
- A behaviour that only appears on failure (e.g. an error toast when an external API fails) → the plan must say how K4 will force that failure (override the response, stub the service); "only a unit test covers it" is stated, not hidden.

## BE — make the failing test pass
- Code until the K2 test passes. **Never** edit, skip, loosen or delete the test to get green; never hard-code the test's input/expected value in production code. Test genuinely wrong → stop and tell the parent why.

## Every implementer dispatch carries
- The role file and this block path.
- This line verbatim: *"KHÔNG chạy `git checkout --`, `git restore`, `git stash`, `git reset` trên bất kỳ file nào. Thấy thay đổi chưa commit của người khác đang chắn đường thì DỪNG và báo lại."* (2026-08-18: a subagent discarded another agent's WIP with `git checkout --`.)
- **Pattern-reference gate** — before any new function/component/file, the implementer states: *"Copied pattern from `<file:line>` — `<name>`. Differences: `<...>`"*. The file must exist on the current tree. No sibling anywhere → say so and what it was modelled on. No reference named = no new code.
- Scope: only the reported bug / the phase. Nothing adjacent.

## Parallel implementers
Only when their files are disjoint (e.g. independent feature phases on different surfaces). Same file or same shared component → sequential. Tester bugs are always sequential.

## Output
Diff summary (files, what changed), the pattern-reference line, eslint result on changed lines, test/lint commands run with their raw last lines.

## Stop when
Code done → K4. A discovery (the plan/map/direction is wrong, or a trade-off nobody priced) → stop and return it to the parent; the parent classifies it A/B/C (`ship-core.md` Discoveries) and grills if needed. The implementer never decides it.
