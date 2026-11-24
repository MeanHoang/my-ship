# my-ship — a gated, evidence-first workflow kit for Claude Code

A set of Claude Code skills, workflow blocks, role cards and hooks that turn one coding session into a small team: a **parent** session that plans, asks and commits, and **subagents** (product, scout, implementer, verifier, reviewer) that read, code, prove and review. Built and battle-tested on a large production codebase, then split so any project can use it: everything project-specific lives in one file, `.claude/ship-profile.md`.

> Tiếng Việt: bộ skill `ship-*` cho Claude Code — hiểu task → chốt plan → code từng phase → **có bằng chứng (ảnh / test fail→pass) mới được nói "đã sửa"** → commit khi được đồng ý → review 1 vòng. Có chế độ treo máy (`/ship-auto`). Phần riêng của từng project nằm trong `ship-profile.md`.

## Quick start
Needs `git`, `node` ≥ 18.17, `python3` and `jq`. Nothing to clone or `npm install`: `npx` runs the CLI straight from GitHub.

```bash
cd /path/to/your/project                         # any git repo
npx github:MeanHoang/my-ship install             # 1. install every ship-* skill
# edit .claude/ship-profile.md                   # 2. fill in your project's profile
npx github:MeanHoang/my-ship doctor              # 3. check: tools, hooks, profile → "all good"
# restart Claude Code, then type: /ship <task>   # 4. go
```

Only want some skills? `npx github:MeanHoang/my-ship add ship ship-review`. See every command in [Install](#install).

> **Cài đặt (tiếng Việt):** mở thư mục project (repo git) → chạy `npx github:MeanHoang/my-ship install` → điền `.claude/ship-profile.md` → chạy `npx github:MeanHoang/my-ship doctor` thấy `all good` → mở lại Claude Code và gõ `/ship <task>`. Chỉ cần vài skill: `npx github:MeanHoang/my-ship add ship ship-review`. Cập nhật bản mới: `npx github:MeanHoang/my-ship update`. Gỡ: `npx github:MeanHoang/my-ship remove --all`.

## What problem it solves
Measured on several thousand owner messages across months of real sessions: the most expensive failures were the agent claiming "fixed" without proof, misreading the goal, editing far beyond the ask, breaking other surfaces through shared code, forgetting the workflow a few turns after the skill loaded, and burning limits by running every subagent on the top model. Each rule here exists because of one of those.

## Skills
| Command | Use when |
|---|---|
| `/ship-new` | a brand-new app from an idea: product gate (research + mockup) → stack gate → walking skeleton → profile written for you |
| `/ship <task>` | a feature that needs understanding + a plan (Gate 1 understand → Gate 2 plan → phases) |
| `/ship-auto` | the plan passed Gate 2 and you want the rest to run unattended |
| `/ship-fix` | the change fits in one sentence (no plan) |
| `/ship-bugs` | testers reported a batch of bugs on a branch |
| `/ship-verify` | "is this really fixed?" — prove it, anywhere |
| `/ship-review` | one review round of a branch, anywhere |
| `/ship-board` | table of every running task and what waits on you |
| `/ship-manager` | a chat that manages all your workspaces: who waits on you, who may be stuck, open/close workspaces, work report |

## How a feature flows
```
Gate 1 🚦 understand: analysis.md, one question per turn, write the GOAL together
Gate 2 🚦 plan: 1 scout gathers facts → decide trade-offs → split small phases (you pick the order) → plan.html
Gate 2 also turns every GOAL line into an ACC: check (a test with real input/expected value, or a page + what must show)
Code all phases: implementer writes the ACC tests FIRST (they must fail), then codes until they pass,
                 naming the existing pattern it copies
diff-guard (machine checks of your review rules) → ONE review: "right thing?" + "right code?" (must-fix needs proof)
→ auto-commit + push one per phase → ONE verify over all phases incl. a walk through every GOAL line on the real app
→ new MR and deploy only when told
```
🚦 = the agent stops and waits. Silence is never consent.

## What's new (2026-11-16): proven test setup, image check, models
- **A case passes only on a proven start state.** `test-cases.md` Setup rows get a `proof` column: the state read back from the store (e.g. which languages it really publishes). `scripts/cases-check.mjs` fails any ✅ case that stands on an unproven row, so a language case can no longer pass on a single-language store.
- **No broken image reaches you.** `scripts/page-images-check.mjs <page.html>` checks every local and remote image of a mockup / report page; the kit runs it before opening a page.
- **Test design factors** add languages (primary only / several / longest text for layout).
- **Models:** parent `opus`; reviewer, scout and test-designer `fable`; the rest `sonnet` (`workflow/ship-core.md` table). `/ship-auto` phase sessions start with `--model opus`.

## What's new (2026-11-12): ship manager
One chat to run the rest. Start it in its own terminal of the main checkout: `claude -n ship-manager "/ship-manager"`.
- **Status of every workspace** (`scripts/ship-manager-status.py`, read-only, needs the Orca CLI): which session asks you something, which is working but silent for more than 15 minutes, what is running (its `NOW` line), what is merged and clean, what has unpushed or uncommitted work.
- **Reads the screen before saying "stuck"**: a permission prompt or a question on screen means it waits on you.
- **Acts on your word only**: nudges a silent session, opens a workspace with the kit installed and the first prompt sent, closes a merged one after showing its checks. It never codes, commits, approves or answers in your place.
- **Watch mode**: `/loop 15m /ship-manager status` reports only what changed.
- Run every session in the same permission mode: a session in another mode holds messages from other sessions for your approval.

## What's new (2026-11, second update)
From real test rounds that were too slow or reported the wrong thing.
- **Commit and push the task branch automatically.** Ask only about a real trade-off. A new MR, a deploy, or pushing the base or integration branch still needs your word.
- **Test cases first (`workflow/test-design.md`, role `test-designer`).** Factors → decision table → `test-cases.md` with a `## Setup` table and a start state per case. The first verify runs every case; a retest runs only what `select-cases.mjs --since <sha>` returns.
- **Test loop (`workflow/test-loop.md`).** Pick local or staging once per task, then test → fix → commit → retest by itself. It stops only on 3 failed fixes of one item, a real trade-off, or a failure that is not yours. Staging goes through one session that owns the integration branch.
- **The verifier builds its own setup.** Saves, plan changes, theme switches and test data on test environments are its job. A case is `⛔` only after two different routes failed.
- **Before evidence comes first (K2, K3).** No fix code without a before screenshot or a failing test, or a written reason.
- **Two reviewers (K5).** A Claude subagent and a one-shot Codex run share `roles/review-checklist.md` and cross-verify. Codex missing → the review goes on and says so. The parent proves each must-fix before you read it.
- **New checks:** `branch-drift.mjs` (how far behind, which files would conflict, nothing written), `merge-survival.mjs` (task lines lost or functions orphaned by a merge), `plan-add.mjs` (declare an out-of-plan file in the same command as the commit), hook `block-git-discard` (denies `checkout --`, `restore`, `reset --hard`, `stash`, `clean -f`, for subagents too).
- **Handoff state:** the stop hook rewrites a stale `NOW` line after a new commit; a new session is shown `Waiting on user` and `Trạng thái store test`, so it neither asks again nor rebuilds data.

## What's new (2026-11)
Built from Lauren Tan's "trust ladder" talk (Cursor): you only hand more to an agent once you trust its output, and trust comes from verification plus hard checks, not more prose rules.
- **Commits are automatic.** An item commits as soon as its evidence exists (one commit per bug / phase).
- **`diff-guard.mjs`** turns your repeated review comments into checks (core lines rewritten, `return undefined`, weakened tests, a mapped route removed). Runs at K4, first in K5, and before every commit.
- **ACC-first:** each GOAL line becomes a concrete check at Gate 2; tests are written before the code.
- **Two-part review:** "right thing?" (GOAL / ACC covered, nothing extra, nothing misread) and "right code?" — a must-fix needs a failing test or a numbered flow with real values.
- **`/ship-verify` = browser tool + feature map:** open a feature by name, wait for real content, recover known stuck states, measure alignment instead of eyeballing it. Plus **eval cases** (`evals/cases.md`) to re-test a skill after you edit it.
- Subagents get file paths to read, not pasted role text.

## Product role
A `product` subagent (block P) works in three steps:
1. **P1 · current state + research** — it gets only the **goal** (who, what outcome, why now), never the spec's proposed solution, so its thinking is not anchored. It reads what the product already does in this area and researches with **a source and date for every claim** (search snippets never count), asking at most 4 forcing questions.
2. **P2 · proposal + mockup** — ≥3 options incl. "do nothing", a v1 with no-gos, and **2–4 key screens as local HTML mockups** in the project's real look (profile §14), rendered and screenshotted. Verdict Build / Reframe / Kill / need-data with a confidence.
3. **P3 · compare with the spec** — only now it reads the spec (e.g. a BA's task) and fills a table: spec says / product proposes / difference / follow which and why.
At later product decisions (trade-offs that change what users see, direction changes, items parked by auto mode) it returns with one decision card: options · recommendation · fails if · cheapest test · what would change my mind. It recommends; you decide. Built from gstack office-hours, BMAD deep-recon, pm-skills strategy-red-team, The Mom Test, Shape Up and Cagan's four risks.

## Unattended mode (`/ship-auto`)
After Gate 2 say **"move auto"** and give a stop time. A driver script runs **one fresh `claude -p` session per phase** (no drift over hours). Each phase is coded, proven, reviewed and auto-committed on the branch. Mid-way discoveries are decided with a reversibility-first rule set (`workflow/auto-decide.md`); each decision gets its own `[D-auto-N]` commit so you can `git revert` exactly that choice. Risky decisions (data, other surfaces, cost, security) are parked for you. The run ends with `report.html`: what was built, the decisions to keep or reverse, what is parked.

## Hard guards (hooks)
| Hook | Does |
|---|---|
| `ship-mode-card` | injects the current mode's rules next to every message, so casual follow-up chat still follows the workflow |
| `ship-scope-guard` | blocks a commit containing a file not named in the task's `progress.md` (stops over-editing) |
| `block-git-discard` | blocks git commands that throw away uncommitted work, unless the owner asked (`# owner-asked: "<words>"`) |
| `ship-auto-guard` | in auto mode: blocks editing/deleting existing tests, fixtures and assertions; blocks deleting checklist items |
| `ship-auto-continue` | keeps a session-driven auto run going; stops on stall (2× no progress) or at the stop time |
| `ship-state-sync` / `ship-context-restore` | record session id / restore task context after compaction or resume |
| `diff-guard.mjs` (script) | your review rules as checks; exit 2 = must-fix (config `.claude/diff-guard.json`) |
| `branch-guard` | blocks `git stash -u`, `git add -A`, commits on a detached HEAD or another task's branch |

## Model per role (limits)
Every dispatch passes `model` explicitly (an omitted model inherits the session's, usually the most expensive):
`sonnet` by default (product, implementer, verifier) · `fable` for reviewer, scout and test-designer · parent `opus` (task sessions start with `--model opus`). Override per project in the profile §7.

## Install
Requirements: Claude Code, `git`, `node` ≥ 18.17, `python3`, `jq`. No npm install needed: run the CLI straight from GitHub.
```bash
cd /path/to/your/project
npx github:MeanHoang/my-ship install            # every ship-* skill + the shared core
npx github:MeanHoang/my-ship add ship ship-review   # or only the skills you want
npx github:MeanHoang/my-ship list               # what exists, ✓ = installed here
npx github:MeanHoang/my-ship update             # re-install your skills from the latest kit
npx github:MeanHoang/my-ship doctor             # requirements, hook wiring, profile filled in
npx github:MeanHoang/my-ship remove ship-auto   # or --all (also removes the core and hook wiring)
```
Every skill reads the same shared core (`.claude/workflow`, `roles`, `hooks`, `scripts`), so `add` always installs it. Hooks are merged into `.claude/settings.local.json` (your own hooks stay), `.claude/ship-profile.md` is created once and never overwritten, the kit is hidden from git through `.git/info/exclude` (remove those lines if your team wants to commit it), and `.claude/my-ship.json` records the version and skills installed.

Then fill `.claude/ship-profile.md` (14 short sections: base branch, surfaces, where to read real settings, test targets, dev stack, auth checks, implementers, review command, ship procedure, extra park items, project Standards, edge cases, product context, mockup design system), check with `doctor`, restart Claude Code and type `/ship <task>`.
`bash install.sh <project>` still works and runs `my-ship install`.

## Layout
```
.claude/
├── skills/ship*/              9 skills (+ templates: progress, decisions, product, plan-doc.html, report.html)
├── workflow/ship-core.md      shared rules: routing, gates, --note, discoveries, artifacts, resume, models
├── workflow/blocks/K0…K7.md   open · evidence · reproduce · fix · confirm · review · commit · ship
├── workflow/blocks/P-product.md  product Discover / Decide
├── workflow/auto-decide.md    how the agent decides alone in /ship-auto
├── workflow/grill-me.md       when and how to ask the owner
├── workflow/mode-cards/       per-mode rule cards injected every turn
├── roles/*.md                 parent · product · scout · implementer · verifier · reviewer · test-designer · ship-manager (+ Standards that grow)
├── hooks/                     the guards above
├── skills/ship*/evals/        eval cases: re-test a skill after editing it
└── scripts/                   ship-auto-run.sh · ship-board.sh · ship-export.sh · diff-guard.mjs · ship-manager-status.py
ship-profile.example.md        copy to .claude/ship-profile.md and fill
```

## Influences
[garrytan/gstack](https://github.com/garrytan/gstack) · [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) · [phuryn/pm-skills](https://github.com/phuryn/pm-skills) · Anthropic — [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices), [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), [hooks guide](https://code.claude.com/docs/en/hooks-guide) · [obra/superpowers](https://github.com/obra/superpowers) · Geoffrey Huntley — [Ralph](https://ghuntley.com/ralph/) · Simon Willison — [Deliver code you have proven to work](https://simonwillison.net/2025/Dec/18/code-proven-to-work/) · Kent Beck — [Augmented coding](https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes) · Dex Horthy — [Advanced context engineering](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md).
