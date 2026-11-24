<div align="center">

# my-ship

**A gated, evidence-first workflow kit for Claude Code.**

Understand the task → agree the plan → code → **prove it** → review → ship.

`npx github:MeanHoang/my-ship install`

</div>

---

## Why

Coding agents fail in the same expensive ways: they say "fixed" without proof, misread the goal, edit far beyond the ask, and forget the workflow a few turns later. my-ship turns one Claude Code session into a small team with hard gates, so none of that slips through.

- 🚦 **Gates** — the agent stops for you at the moments that matter, and silence is never consent
- 🧪 **Proof** — nothing is "done" without a screenshot or a failing → passing test
- 🔒 **Guards** — hooks block scope creep, lost work and weakened tests
- 🧩 **One profile** — everything project-specific lives in `.claude/ship-profile.md`

## Quick start

Requires `git`, `node` ≥ 18.17, `python3`, `jq`.

```bash
cd your-project
npx github:MeanHoang/my-ship install   # 1. install the skills
                                       # 2. fill in .claude/ship-profile.md
npx github:MeanHoang/my-ship doctor    # 3. check → "all good"
```

Restart Claude Code and type `/ship <task>`.

## Commands

| Command | |
|---|---|
| `install [dir]` | every skill + the shared core |
| `add <skill...>` | only the skills you pick |
| `list` | available skills, ✓ = installed |
| `update` | your skills, from the latest kit |
| `doctor` | tools, hooks and profile check |
| `remove <skill...>` · `--all` | uninstall |

Run each as `npx github:MeanHoang/my-ship <command>`. Your own hooks and your profile are never overwritten.

## Skills

| Skill | Use it for |
|---|---|
| `/ship <task>` | a feature that needs a plan |
| `/ship-auto` | the rest of a planned feature, unattended |
| `/ship-fix` | a one-sentence change |
| `/ship-bugs` | a batch of tester bugs |
| `/ship-verify` | proving a fix really works |
| `/ship-review` | one review round of a branch |
| `/ship-new` | a brand-new app from an idea |
| `/ship-board` | every running task at a glance |
| `/ship-manager` | one chat that watches all your workspaces |

## How a feature flows

```
Gate 0  problem    reproduce it and confirm the problem with you
Gate 1  understand one question at a time, write the goal together
Gate 2  plan       facts → trade-offs → small phases → acceptance checks
Code               tests first, then code until they pass
Review             one round, two reviewers, must-fix needs proof
Verify             every case on the real app, with evidence
Ship               commit + push automatically; MR and deploy only on your word
```

## Guards

| Hook | Blocks |
|---|---|
| `ship-scope-guard` | committing files outside the task |
| `block-git-discard` | commands that throw away uncommitted work |
| `branch-guard` | `stash -u`, `add -A`, commits on the wrong branch |
| `ship-auto-guard` | weakening tests in unattended mode |
| `ship-mode-card` | drifting from the workflow mid-chat |

## Credits

[gstack](https://github.com/garrytan/gstack) · [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) · [pm-skills](https://github.com/phuryn/pm-skills) · [superpowers](https://github.com/obra/superpowers) · [Claude Code best practices](https://code.claude.com/docs/en/best-practices) · [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) · [Ralph](https://ghuntley.com/ralph/) · [Code proven to work](https://simonwillison.net/2025/Dec/18/code-proven-to-work/) · [Augmented coding](https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes)
