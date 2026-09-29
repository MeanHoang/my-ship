# K1 — Read the evidence (three legs)

**Role:** scout (`.claude/roles/scout.md`) — one scout, or **three in parallel (one per leg) when the bug is hard**. Several unrelated bugs on different surfaces → one scout per bug, in parallel. Parent cross-checks.

## Input
The report (ticket / chat / spec / owner's words), the affected account or tenant, `progress.md`, `--note`.

## The three legs — a missing leg is said out loud, never guessed
| Leg | Find | Do not |
|---|---|---|
| **1. Problem** | Exact symptom, does it reproduce, how many users/records are hit (a **number**) | Take the reporter's description as fact. Image links in the report → open them in the browser now |
| **2. Code** | The flow as numbered steps, each `file:line` | Infer from function names — open the file |
| **3. Real settings / data** | The account's **actual** configuration | Assume defaults — most bugs live here |

## Leg 2 reads the code the user actually runs
- Production bug → read the base branch (profile §1), not a feature branch: `git show <base>:<path>` when this branch touches the area. If base and an unreleased branch differ in the buggy area, that diff is a finding (the fix may already exist unreleased → `skip (already fixed, pending release)`).
- Tester (UAT) bug → read the task branch, and run **attribution** first: `git log -S` / `git blame` → introducing commit + author + date. From base or another dev → report it, do not fix (owner decides).

## Leg 3 — reading real settings
Sources, their priority order and what each cannot see: **profile §3**. Never call a write tool to read. An account you cannot reach → ask the owner once, listing exactly which settings/documents the flow reads (`file:line`); save what he gives under `tmp/logs/`, source `owner-provided`.

Say which source each setting came from.

## Cross-check (parent)
Put the legs side by side; the bug is usually the **mismatch** — settings say A, code reads B (typical mismatches for this repo: profile §3).
Parent **re-opens the load-bearing `file:line` itself**. Two scouts disagreeing is a finding to report, never resolved by picking one.

## Output
`progress.md` legs filled (bug template) or `facts.md` rows `claim | verdict | file:line` (feature). Settings with their source. Numbers with the query that produced them. Logs/screens → `tmp/`.

## Stop when
All three legs have evidence, or a leg is proven unreachable (say what was tried). Scouts never propose fixes — that is the verdict / K3.
