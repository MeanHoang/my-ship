# Roles

## How the Standards grow (read this first)
1. The owner corrects an agent (e.g. *"sao lại đặt tên chung chung thế"*).
2. The parent drafts **one Standards line** + the target role, and ASKS: *"Thêm vào Standards của `<role>`: '<line>'?"* Never append on its own (the `memory-consent` rule applies here too).
3. On yes → append to that role's `## Standards`, format: `- <rule> (source: <YYYY-MM-DD> "<owner's quote>")`.
4. A line violated a **second** time is promoted to a harder layer — a hook or a test — and the Standards line points to it.
5. Coding/review/naming lessons live here, not in memory. Memory keeps only facts about the owner (language, explanation style, how he works).

## How roles are used
- Project-specific Standards live in `.claude/ship-profile.md` §11 under the role's name — paste that section together with the role file. Roles here stay project-neutral.
- The parent pastes the matching role file (path + content) into every subagent prompt, together with the block it runs (`.claude/workflow/blocks/K*.md`). A subagent reads its Standards before working.
- One subagent = one role. A role that needs another role's work returns to the parent instead of doing it.

| Role | File | Runs blocks |
|---|---|---|
| parent | `parent.md` | K0, cross-check in K1, gates, K5 re-verify, K6, K7 |
| scout | `scout.md` | K1, feature 1a/2a |
| implementer | `implementer.md` | K3 (code) |
| verifier | `verifier.md` | K2, K3 live try, K4, K7 retest |
| reviewer | `reviewer.md` | K5 |

Every role file has exactly: Does / Does not / Input / Output / Stop when / Standards.

