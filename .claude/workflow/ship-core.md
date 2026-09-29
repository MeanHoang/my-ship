# Ship core — rules shared by every `ship-*` skill

Read by `/ship`, `/ship-auto`, `/ship-bugs`, `/ship-fix`, `/ship-verify`, `/ship-review`. Project-specific facts live in `.claude/ship-profile.md` (**profile §N**).

**Pieces:** blocks `.claude/workflow/blocks/K0…K7` + `P-product.md` (what each step does) · roles `.claude/roles/*.md` + profile §11 (who does it — paste both into every subagent prompt) · `.claude/workflow/grill-me.md` (when and how to ask) · `.claude/workflow/auto-decide.md` (deciding alone, auto only) · templates `.claude/skills/ship/templates/`.

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
- **Steers attention, never authority.** It opens no gate: questions, FE live-fix approval and each commit still need him. "cứ commit luôn" is not consent for an unreported item — ask once.
- **Persist it verbatim** as `note:` in the `<!-- state -->` block. **Answer it at the next gate** in one line.
- **A note can be wrong.** Evidence says X is not the place → report it with `file:line`; do not follow it into the wrong file.

## Who runs what
Parent = this session: orchestrates, verifies, asks, commits (`roles/parent.md`). Everything that reads, codes, screenshots or reviews is a **subagent** with its role file + profile §11 + its block; pass `model` explicitly (profile §7). Parent keeps conclusions; subagents swallow raw material. Parallel inside the task = subagents, never extra sessions. Single known file / one grep → inline, no dispatch.
**Model per role — always pass `model` on the dispatch** (an omitted model inherits the session's, usually the most expensive; owner decision 2026-09-29):
| Role | `model` | Why |
|---|---|---|
| parent | the session's own (owner picks); `/ship-auto` phase sessions inherit it | decides, talks to the owner |
| scout | `opus` | judgement-heavy reading; where invented facts start |
| product | `opus` | worth-it / scope judgement; research with sources |
| reviewer | `opus` | judgement; a weak review lets bugs through |
| implementer | `sonnet` | follows a plan with a pattern reference; checked by verifier + reviewer. New implementer after two rejected fixes → `opus` |
| verifier | `sonnet` | runs tests / drives the browser; evidence is machine-checked |
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
Laws: `progress.md` is a projection of the plan (or bug list), not a journal — tick, don't narrate; exactly one NOW line; nothing derivable from git/tests; soft ceiling ~150 lines. Every file a commit may touch is named in it (the scope-guard hook checks). A lesson written twice leaves `decisions.md` → CLAUDE.local.md, a hook, or a test. After a commit delete that item's `tmp/shots/`.

## Resume protocol
1. `git status` + `git diff` first — the tree beats the doc. Never discard anything.
2. Read the `<!-- state -->` block, the NOW line, the first unticked box.
3. Reconcile ticks against `git log`/diff; untick what git contradicts and say so.
4. Read `decisions.md` before touching code.
5. More than one NOW line → keep the one consistent with `git log`, delete the rest, mention it.

## Rules
- A turn answering his pushback shows what was checked: re-read it, name the `file:line` and what you found (incl. "anh đúng" or "không verify được"). "đã sửa rồi anh" without an image or test output is the highest-risk sentence here.
- The same fix rejected twice → stop, log what failed, new implementer (roles/parent.md).
- Commit = strict per-item consent (K6; exception only in `/ship-auto`). Push / deploy / retest = separate explicit instruction (K7).
- Blocked or ambiguous → ask in grill-me shape; narrate while working; every decision carries its number.

## Portability — moving the kit to another repo
Copy: `.claude/skills/ship*/` (incl. `ship-new`), `.claude/workflow/` (blocks, ship-core, grill-me, auto-decide, mode-cards), `.claude/roles/`, hooks `ship-*.sh` + `branch-guard.sh`, `.claude/scripts/ship-auto-run.sh`, and their wiring in `settings.local.json`. Then write that repo's `.claude/ship-profile.md` with the same section numbers (§1 repo basics · §2 surfaces · §3 real settings · §4 test targets/browser · §5 dev stack · §6 auth · §7 implementers/models · §8 review command · §9 ship · §10 auto park extras · §11 Standards per role · §12 Review Focus defaults · §13 product context). Add `.claude/ship/` to `.git/info/exclude`.
