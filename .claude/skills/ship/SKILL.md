---
name: ship
description: Use when the owner hands over a feature or task that needs understanding and a plan before code ("/ship <task-url>", "ship task này", "làm task này từ đầu đến cuối"), or when resuming a branch that already has `.claude/ship/<slug>/progress.md`. Not for one-sentence changes (/ship-fix) or tester bug lists (/ship-bugs).
---

# /ship — feature with gates (modes SHIP / CONTINUE)

Read first: `.claude/workflow/ship-core.md` (skill routing, gate protocol, `--note`, who runs what, discoveries, artifacts, resume, rules) and `.claude/ship-profile.md`.

## Arguments
`<task-url>` — the task. `--note "<free text>"` — optional steer (ship-core contract). `--auto` — after Gate 2 hand over to `/ship-auto`.

## Step 0
K0, then route per ship-core "Which skill". Existing branch/progress → `mode: CONTINUE`: resume protocol, reconcile plan vs commits, continue at the next unfinished phase; re-run Gate 1/2 only for remaining scope if requirements shifted.

## Flow
| # | Step | Block | Role | Stop? |
|---|---|---|---|---|
| 1 | Verify the spec | 1a | scout | — |
| 2 | Understand (business) | 1b–1d | parent | 🚦 **Gate 1** (one question per turn) |
| 3 | Gather facts | 2a | one scout for all surfaces by default | — |
| 4 | Decide trade-offs, split phases, render plan | 2b, 2c, 2d | parent (2d: subagent) | 🚦 **Gate 2** |
| 5 | Per phase: code → confirm | K3 → K4 | implementer → verifier; phases with disjoint files may run in parallel | discoveries only |
| 6 | Per phase: commit | K6 | parent | 🚦 "commit" |
| 7 | After all phases: review once | K5 | reviewer | findings → own fix commits |
| 8 | Push / deploy / retest | K7 | parent + verifier | only when told |

### Gate 1 — Understand
The project's spec tool (profile §1): 1a verify (scout, `file:line`, real numbers — a query that can settle a point settles it here), 1b write `analysis.md` (§1 domain · §2 who hurts, how many · §3 what the app does today · §4 gap · §5 open-points ledger · §6 GOAL empty), 1c grill **one question per turn** — only what he can answer without reading code, 1d fill §6 GOAL with him and copy it into `decisions.md`. No plan here. Ends on his explicit move ("ok", "bước 2", "tiếp" — proceed, not commit).

### Gate 2 — Plan (all verification and all open questions end here)
- **2a Gather (read-only)** — ONE scout covering every touched surface + backend path by default (parallel scouts each re-read the same shared code — HN: *"launched 7 sub agents which burned through my budget"*); split only for surfaces that share no code. Each confirms/refutes the spec with `file:line` and, per surface, checks: field-trigger loops, the settings chain (profile §2), whether the surface is live, existing users without the new data, database indexes. Output `facts.md`: `claim | verdict | file:line`.
- **2b Decide 🚦** — load only spec + `analysis.md` + `facts.md`. Facts kill questions first. Ledger = `analysis.md` §5, posted each round. One question at a time, blockers first, grill-me shape. **2b may not end while any §5 row is open**; before asking whether it is settled post *"Chưa đụng tới: … · Không verify được: … · Giả định còn lại: …"* — sweep other surfaces (profile §2), live users, rollback, data written before the change, other readers of changed fields. Settled decisions (why + rejected option) → `decisions.md`.
- **2c Split 🚦** — small phases by flow/surface, each separately reviewable; inner order config UI → backend → end-user surface. You propose the grouping; **he settles the order** (*"Phase nào anh muốn thấy chạy trước?"* · *"Cái nào rơi khỏi v1?"*). 5–10 lines per phase in chat (changes, files, Pattern line, verify line).
- **2d Render (subagent)** — copy `templates/plan-doc.html`, fill placeholders, never edit its `<style>`. Sections: 1 overview + goal · 2 current state · 3 trade-offs · 3b modules touched (incl. **who else uses it**) · 4 phases (Pattern line + fix + verify) · 5 risks · 6 open points · 7 out of scope · **Review Focus**: the edge inputs no phase test covers yet (defaults: profile §12), each with the test that pins it in the phase that owns the code. `open` it + 3–5 line gist. Decision changes go back to 2b.
- After his "move": **generate `progress.md` from `plan.html` §4** — each phase `### ⬜ Phase N — name`, its Pattern line, one `- [ ]` per `<li>` naming its file, its Verify line, plus the template's fixed rows. "move auto" → `/ship-auto`.

### Per phase
1. Light touchpoint re-check (only files an earlier phase changed). No new fan-out.
2. **K3** — pattern-reference gate (no reference `file:line` = no new code), layer rules, translations in the same phase, no pass-through wrappers.
3. **K4** — screenshots / tests + revert check.
4. Report: what changed, files, pattern line, lint, before/after images or fail→pass output, what to look at. End with the K6 consent line (+ a Standards line if he corrected this phase). Phase heading 👀, NOW → "chờ commit phase N".
5. **K6** on his "commit" → heading ✅, NOW → next phase.
No per-phase review — K5 once, after the last phase.
