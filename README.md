# my-ship — a gated, evidence-first workflow kit for Claude Code

A set of Claude Code skills, workflow blocks, role cards and hooks that turn one coding session into a small team: a **parent** session that plans, asks and commits, and **subagents** (product, scout, implementer, verifier, reviewer) that read, code, prove and review. Built and battle-tested on a large production codebase, then split so any project can use it: everything project-specific lives in one file, `.claude/ship-profile.md`.

> Tiếng Việt: bộ skill `ship-*` cho Claude Code — hiểu task → chốt plan → code từng phase → **có bằng chứng (ảnh / test fail→pass) mới được nói "đã sửa"** → commit khi được đồng ý → review 1 vòng. Có chế độ treo máy (`/ship-auto`). Phần riêng của từng project nằm trong `ship-profile.md`.

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

## How a feature flows
```
Gate 1 🚦 understand: analysis.md, one question per turn, write the GOAL together
Gate 2 🚦 plan: 1 scout gathers facts → decide trade-offs → split small phases (you pick the order) → plan.html
Per phase: implementer codes (must name the existing pattern it copies)
           → verifier proves it (screenshots / failing→passing test + "fails again when the fix is removed")
           → 🚦 you say "commit"
After the last phase: one review round (must-fix vs optional) → push only when told
```
🚦 = the agent stops and waits. Silence is never consent.

## Product role
A `product` subagent (block P) works in three steps:
1. **P1 · current state + research** — it gets only the **goal** (who, what outcome, why now), never the spec's proposed solution, so its thinking is not anchored. It reads what the product already does in this area and researches with **a source and date for every claim** (search snippets never count), asking at most 4 forcing questions.
2. **P2 · proposal + mockup** — ≥3 options incl. "do nothing", a v1 with no-gos, and **2–4 key screens as local HTML mockups** in the project's real look (profile §14), rendered and screenshotted. Verdict Build / Reframe / Kill / need-data with a confidence.
3. **P3 · compare with the spec** — only now it reads the spec (e.g. a BA's task) and fills a table: spec says / product proposes / difference / follow which and why.
At later product decisions (trade-offs that change what users see, direction changes, items parked by auto mode) it returns with one decision card: options · recommendation · fails if · cheapest test · what would change my mind. It recommends; you decide. Built from gstack office-hours, BMAD deep-recon, pm-skills strategy-red-team, The Mom Test, Shape Up and Cagan's four risks.

## Unattended mode (`/ship-auto`)
After Gate 2 say **"move auto"** and give a stop time. A driver script runs **one fresh `claude -p` session per phase** (no drift over hours). Each phase is coded, proven, reviewed and auto-committed on the branch (never pushed). Mid-way discoveries are decided with a reversibility-first rule set (`workflow/auto-decide.md`); each decision gets its own `[D-auto-N]` commit so you can `git revert` exactly that choice. Risky decisions (data, other surfaces, cost, security) are parked for you. The run ends with `report.html`: what was built, the decisions to keep or reverse, what is parked.

## Hard guards (hooks)
| Hook | Does |
|---|---|
| `ship-mode-card` | injects the current mode's rules next to every message, so casual follow-up chat still follows the workflow |
| `ship-scope-guard` | blocks a commit containing a file not named in the task's `progress.md` (stops over-editing) |
| `ship-auto-guard` | in auto mode: blocks editing/deleting existing tests, fixtures and assertions; blocks deleting checklist items |
| `ship-auto-continue` | keeps a session-driven auto run going; stops on stall (2× no progress) or at the stop time |
| `ship-state-sync` / `ship-context-restore` | record session id / restore task context after compaction or resume |
| `branch-guard` | blocks `git stash -u`, `git add -A`, commits on a detached HEAD or another task's branch |

## Model per role (limits)
Every dispatch passes `model` explicitly (an omitted model inherits the session's, usually the most expensive):
product `opus` · scout `opus` · reviewer `opus` · implementer `sonnet` · verifier `sonnet` · parent = your session. Override per project in the profile §7.

## Install
Requirements: Claude Code, `git`, `python3`, `jq`.
```bash
git clone https://github.com/MeanHoang/my-ship.git
bash my-ship/install.sh /path/to/your/project
```
Then fill `/path/to/your/project/.claude/ship-profile.md` (14 short sections: base branch, surfaces, where to read real settings, test targets, dev stack, auth checks, implementers, review command, ship procedure, extra park items, project Standards, edge cases, product context, mockup design system). Restart Claude Code and type `/ship <task>`.
Re-run `install.sh` to update; your profile is never overwritten. The kit and task state are hidden via `.git/info/exclude` — remove those lines if your team wants to commit it.

## Layout
```
.claude/
├── skills/ship*/              8 skills (+ templates: progress, decisions, product, plan-doc.html, report.html)
├── workflow/ship-core.md      shared rules: routing, gates, --note, discoveries, artifacts, resume, models
├── workflow/blocks/K0…K7.md   open · evidence · reproduce · fix · confirm · review · commit · ship
├── workflow/blocks/P-product.md  product Discover / Decide
├── workflow/auto-decide.md    how the agent decides alone in /ship-auto
├── workflow/grill-me.md       when and how to ask the owner
├── workflow/mode-cards/       per-mode rule cards injected every turn
├── roles/*.md                 parent · product · scout · implementer · verifier · reviewer (+ Standards that grow)
├── hooks/                     the guards above
└── scripts/                   ship-auto-run.sh · ship-board.sh · ship-export.sh
ship-profile.example.md        copy to .claude/ship-profile.md and fill
```

## Influences
[garrytan/gstack](https://github.com/garrytan/gstack) · [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) · [phuryn/pm-skills](https://github.com/phuryn/pm-skills) · Anthropic — [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices), [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), [hooks guide](https://code.claude.com/docs/en/hooks-guide) · [obra/superpowers](https://github.com/obra/superpowers) · Geoffrey Huntley — [Ralph](https://ghuntley.com/ralph/) · Simon Willison — [Deliver code you have proven to work](https://simonwillison.net/2025/Dec/18/code-proven-to-work/) · Kent Beck — [Augmented coding](https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes) · Dex Horthy — [Advanced context engineering](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md).
