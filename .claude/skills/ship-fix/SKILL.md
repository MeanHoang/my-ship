---
name: ship-fix
description: Use when the change can be described in one sentence ("đổi label X thành Y", "thêm field Z vào response W", "fix typo/margin ở …") — one surface, no new setting or stored field, no shared component touched. Not for anything that needs a plan or touches several surfaces (/ship).
---

# /ship-fix — one-sentence change (mode LITE)

Read first: `.claude/workflow/ship-core.md`, `.claude/ship-profile.md`.
Source: Anthropic best practices *"If you could describe the diff in one sentence, skip the plan"*; Böckeler: the full spec flow on a small change is *"a sledgehammer to crack a nut"*.

1. K0. Say in one line why this is LITE. `progress.md` (`mode: LITE`) = one `###` item: the sentence, a `Files:` line, rows fix → confirm → commit. No `analysis.md`, `facts.md`, `plan.html`.
2. K1 inline by the parent (a known file / one grep) — a scout only if it is not.
3. K3 implementer → K4 verifier (evidence unchanged: image / fail→pass + revert check; FE live-try approval still applies).
4. K6 🚦 "commit". K5 once (one reviewer), then K7 only when told.

**Escalate to `/ship`** the moment it stops being one sentence: a shared component or another surface is touched, a new setting/field appears, or the scope guard blocks a second file. Tell him: *"việc này to hơn 1 câu vì …, em chuyển sang /ship"* and set `mode: SHIP`.
