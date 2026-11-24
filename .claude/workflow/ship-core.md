# Ship core — rules shared by every `ship-*` skill

Read by `/ship`, `/ship-auto`, `/ship-bugs`, `/ship-fix`, `/ship-verify`, `/ship-review`. Project-specific facts live in `.claude/ship-profile.md` (**profile §N**).

**Pieces:** blocks `.claude/workflow/blocks/K0…K7` + `P-product.md` (what each step does) · roles `.claude/roles/*.md` + profile §11 (who does it — give every subagent the file paths and have it read them first; never paste their text: pasting doubles the parent's context and goes stale, the owner's notes #2) · `.claude/workflow/grill-me.md` (when and how to ask) · `.claude/workflow/auto-decide.md` (deciding alone, auto only) · templates `.claude/skills/ship/templates/`.

## Which skill (Step 0 of every flow)
Run **K0**, read the state (`/branch-focus`, the task source's status + latest comments, existing `.claude/ship/<slug>/progress.md`), then say which flow and why in one line (he can overrule):

| Signals | Flow | `mode:` in state |
|---|---|---|
| Brand-new app / empty repo, from an idea | `/ship-new` | `NEW` |
| The whole diff fits in ONE sentence — one surface, no new setting/field, no shared component | `/ship-fix` | `LITE` |
| Task not started, needs understanding + a plan | `/ship` | `SHIP` |
| Branch has commits / `progress.md` exists | `/ship` (resume) | `CONTINUE` |
| Plan approved at Gate 2, owner leaves the machine running | `/ship-auto` | `SHIP`/`CONTINUE` + `auto: on` |
| Tester/UAT bug list on a branch | `/ship-bugs` | `STABILIZE` |
| "Is this really fixed?" / "prove it" on any change | `/ship-verify` | — |
| "Review this branch once" | `/ship-review` | — |
Ambiguous → ask. Hidden complexity found later **upgrades** the flow (fix → ship), never downgrades.

## Gate waiting protocol
The owner drives only the GATES; everything between runs on its own. Post the gate report in chat, end the turn, wait. Never advance on silence, never guess his answer. On a long wait, **edit** (not add) the single `> **NOW:**` line in `progress.md`, fill "Waiting on user" with the exact question, park.

## `--note` contract (every skill that takes one)
- **Steers attention, never authority.** It opens no gate: questions and FE live-fix approval still need him; new MR / deploy still need his instruction.
- **Persist it verbatim** as `note:` in the `<!-- state -->` block. **Answer it at the next gate** in one line.
- **A note can be wrong.** Evidence says X is not the place → report it with `file:line`; do not follow it into the wrong file.

## Who runs what
Parent = this session: orchestrates, verifies, asks, commits (`roles/parent.md`). Everything that reads, codes, screenshots or reviews is a **subagent** with its role file + profile §11 + its block; pass `model` explicitly (profile §7). Parent keeps conclusions; subagents swallow raw material. Parallel inside the task = subagents, never extra sessions. Single known file / one grep → inline, no dispatch.
**Every dispatch brief also carries** (2026-11-04 lessons):
- Tests: the runner table profile §4 (which runner owns which test file; jest vs vitest picked wrong = 39 min hung at 0% CPU). Run tests in the foreground with the Bash tool's `timeout` (≤ 600000 ms), never `run_in_background`, never watch mode (jest `--watchAll=false`, vitest `run`). A command that hits the timeout is reported with its last output, not retried blindly.
- Report: the full report goes to `.claude/ship/<slug>/tmp/logs/<role>-<item>.md`; the final message is ≤ 20 lines (verdict, counts, the file path). Long final messages were cut off three times.
- Git: never `git checkout -- / <ref> -- <path>`, `git restore` (except `--staged`), `git reset --hard`, `git stash`, `git clean` (hook `block-git-discard.sh` denies them for subagents too).

**Model per role — always pass `model` on the dispatch** (an omitted model inherits the session's, usually the most expensive; owner decision 2026-09-29; every role on `sonnet` since 2026-09-30, reviewer, scout, test-designer on `opus` since 2026-11-18 (owner: "fable đổi thành opus"; on `fable` 11-13 → 11-18)):
| Role | `model` | Why |
|---|---|---|
| parent | `opus` (Opus 5.5): every task session is launched with `claude --model opus` (profile §20, bug-check hand-off, `ship-auto-run.sh`); a session started otherwise switches with `/model opus`. Owner 2026-11-13: "role parent nâng lên opus" | decides, talks to the owner |
| scout | `opus` (Opus 5.5) | judgement-heavy reading; where invented facts start. Gathers the facts the plan stands on (Gate 2 · 2a). Owner 2026-11-13 plan roles on Fable 5.2, 2026-11-18 on Opus |
| product | `sonnet` | worth-it / scope judgement; research with sources |
| reviewer | `opus` (Opus 5.5) | judgement; a weak review lets bugs through. Owner 2026-11-13: "đổi harness ship review chạy fable 5.2". Moved to Opus 2026-11-18. Also the Claude cross-verify of Codex findings (same role) |
| implementer | `sonnet` | follows a plan with a pattern reference; checked by verifier + reviewer. New implementer after two rejected fixes → a fresh `sonnet` with a rewritten brief |
| verifier | `sonnet` | runs tests / drives the browser; evidence is machine-checked |
| test-designer | `opus` (Opus 5.5) | writes `test-cases.md` before the first verify, without the diff (`workflow/test-design.md`); its cases become the plan's ACC lines (Gate 2 · 2c+). Owner 2026-11-13 |
A project may override this table in profile §7.

**The line:** reading and rendering run alone; every step that DECIDES (grill, trade-offs, phase order, verdicts, commits) stays with parent + owner — a subagent cannot talk to him.

## Discoveries mid-implementation
Coding surfaces things planning could not — normal, not failure. Name the size, follow its path; never keep coding past it silently.
- **A — technical trade-off** (which file/approach, an unpriced coupling). Stop the item, ask in the 2b rhythm (fact `file:line`, options, recommendation). New evidence → `facts.md`; new open point → `analysis.md` §5. Settled → `decisions.md`, edit only that phase card in `plan.html`, re-project `progress.md`. Resume.
- **B — the map was wrong** (Gate 1 belief false). Correct `analysis.md` with evidence; product role writes a Decide card (block P). **Gate:** *"bản đồ mình duyệt ở Gate 1 sai chỗ này — …"*, say whether the GOAL still holds; he decides. Then as A.
- **C — the direction changed** (a surface drops in/out, the split no longer makes sense). Product Decide card first (block P); then re-enter 2c for the remaining work only; committed phases stay. Append **why** to `decisions.md`.
Test: does it change what the code does (A), what we believed (B), or what we build next (C)? In `/ship-auto` the same test runs through `auto-decide.md`.

## Artifact contract (`.claude/ship/<slug>/`, never committed)
| File | Lifetime | Contains |
|---|---|---|
| `product.md` | whole task (updated, not redone) | one-screen product brief + verdict (block P) |
| `analysis.md` | whole task (correctable per B) | the one doc for HIM while planning: §1–§6; §5 = the single open-points ledger |
| `facts.md` | append-only | `claim \| verdict \| file:line`; no recommendations; he does not read it |
| `plan.html` | rendered at 2d, re-rendered on A/C | the plan; source of the checklist |
| `progress.md` | rewritten constantly | state block + checkboxes (+ `Files:` per item) + ONE `> **NOW:**` + "Waiting on user" |
| `decisions.md` | append-only forever | decision + why + rejected option, lessons, tech debt |
| `report.html` | end of `/ship-auto` | what was built + decisions to keep/reverse + parked items |
| `tmp/{shots,mockups,logs}/` | disposable | every screenshot, mockup, log, repro output |
Laws: `progress.md` is a projection of the plan (or bug list), not a journal — tick, don't narrate; exactly one NOW line; nothing derivable from git/tests; soft ceiling ~150 lines. Every file a commit may touch is named in it (the scope-guard hook checks). A lesson written twice leaves `decisions.md` → the project's local rules, a hook, or a test. After a commit delete that item's `tmp/shots/`.

## Resume protocol
1. `git status` + `git diff` first — the tree beats the doc. Never discard anything.
2. Read the `<!-- state -->` block, the NOW line, the first unticked box.
3. Reconcile ticks against `git log`/diff; untick what git contradicts and say so.
4. Read `decisions.md` before touching code.
5. More than one NOW line → keep the one consistent with `git log`, delete the rest, mention it.

## Rules
- **A page shown to the owner has no broken image:** before `open` of any local HTML (`tmp/mockups/index.html`, `report.html`, `plan.html`), run `node .claude/scripts/page-images-check.mjs <page>`; exit 2 → fix the paths / re-shoot first (/ship-learn 2026-11-16: "ảnh lỗi vậy ???").
- A turn answering his pushback shows what was checked: re-read it, name the `file:line` and what you found (incl. "anh đúng" or "không verify được"). "đã sửa rồi anh" without an image or test output is the highest-risk sentence here.
- The same fix rejected twice → stop, log what failed, new implementer (roles/parent.md).
- Commit = automatic once the item has its evidence, one commit per item (K6, owner 2026-11-02); `/ship` and `/ship-auto` commit per phase after the single K5 review. Push of the task branch follows each commit automatically (K6, owner 2026-11-03); new MR / deploy / retest = separate explicit instruction (K7).
- Blocked or ambiguous → ask in grill-me shape; narrate while working; in chat name every decision in a few plain words — its D-number lives only in `decisions.md` (owner 2026-10-27 "đặt tên cho rõ ràng nhé"; checked by the work-brain Stop hook).
- Bugs reported by a tester/QA (any `ship-*` flow, not only `/ship-bugs`) → once the owner says the fixes are on the test env: retest, then report back where the tester wrote them — per bug a plain-language explanation + screenshot, tick, one comment tagging the tester (`.claude/workflow/tester-report.md`; case study 2026-10-13).

## Portability — moving the kit to another repo
Copy: `.claude/skills/ship*/` (incl. `ship-new`), `.claude/workflow/` (blocks, ship-core, grill-me, auto-decide, mode-cards), `.claude/roles/`, hooks `ship-*.sh` + `branch-guard.sh`, `.claude/scripts/ship-auto-run.sh`, and their wiring in `settings.local.json`. Then write that repo's `.claude/ship-profile.md` with the same section numbers (§1 repo basics · §2 surfaces · §3 real settings · §4 test targets/browser · §5 dev stack · §6 auth · §7 implementers/models · §8 review command · §9 ship · §10 auto park extras · §11 Standards per role · §12 Review Focus defaults · §13 product context). Add `.claude/ship/` to `.git/info/exclude`.
