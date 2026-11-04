# K6 — Commit + push (automatic, no asking)

**Role:** parent only. Subagents never commit.

**Owner decision 2026-11-03** (owner 2026-11-03: "mặc định commit and push … ko cần hỏi ý kiến chỉ hỏi ý kiến nếu sửa gì đó như nào có trade off thôi"): commit and push need no word from him. Replaces 2026-11-02 "ko push". New MR, deploy, push of `master` / `<integration-branch>` (those deploy) still need his instruction (K7).

## Input
A confirmed item (K4 evidence) or accepted review fixes.

## When to commit (no asking)
- **Tester bug / `/bug-check` fix / `/ship-fix`:** right after that item's evidence exists (K4: after-image, or fail→pass + revert check) and its cheap checks pass (unit tests + eslint of its files + `node .claude/scripts/diff-guard.mjs` exit 0).
- **`/ship` feature (batch flow, owner 2026-10-29):** all phases coded → the ONE K5 review has no must-fix left → one commit per phase. Split the tree by phase: stage explicit paths; a file shared by several phases is split by hunk (`git diff <file>` → filtered patch → `git apply --cached`), each commit names its phase. Then ONE K4 verify over all phases; its fixes get their own commits.
- **`/ship-auto`:** same as `/ship`, plus one **separate** commit per auto decision tagged `[D-auto-<N>]` (`.claude/workflow/auto-decide.md`); write the sha into its `decisions.md` entry.
- No evidence yet, or a check failed → do not commit; report the item as not done.
- The item report says what was committed (sha + one line), not a question.
- **Push right after the commit**, every flow (incl. `/ship-auto`): `git push -u origin <task branch>`. An MR that already exists updates by itself; never add MR-create options. The report gives sha + "đã push". Push fails (rejected: remote moved, hook, network) → do not force; `git fetch` + report the reason, keep the commit local.
- Do not push when: the branch is `master`/`main` or a staging/integration branch (`<integration-branch>`; only exception: the `<integration-branch>` session handling a `MERGE-DEPLOY` request, `.claude/workflow/test-loop.md` §5), the project's pre-push checks (profile §9) fail, or the commit holds anything from the never-stage list. Say which in the report.
- **Never open an MR or deploy** without his instruction (K7).

## Granularity
| Flow | One commit per |
|---|---|
| Tester bugs (STABILIZE) | bug |
| Feature (SHIP) | phase |
| Single bug (project bug skill) | the fix |
| K5 findings | fix round |

## How
0. Hook `ship-scope-guard.sh` denies a commit containing a file not named in `progress.md` (phase checklist, bug `Files:` line, or "Việc phát sinh ngoài plan"). Out-of-plan but needed → one line in "Việc phát sinh ngoài plan" with the reason, and name it in the report to the owner. Not needed → unstage and drop it.
1. `git status` + `git diff --stat` → stage **explicit paths** of this item only. Never `git add -A` / `git add .`.
2. Never stage: `.claude/ship/**`, docs/tracking files, format-only hunks outside the change, plus the project's list (profile §9).
3. Message in **English**, repo convention (`fix:` / `feat:` / `refactor:` — check `git log`), plus the attribution trailer from the session instructions. Exception: a `[deploy-only]` commit carries no body except the `--only` argument (see profile §9).
4. Never amend, never `--no-verify`, never force push. Then push (rules above).
5. Never stage secrets or local run files (`.env*`, credential files, profile §9 list).

## Before reporting the commit
Did the owner correct the work on this item ("sao lại…", "không phải…", a rejected fix)? If yes, draft ONE Standards line + target role and put it in the same report: *"Thêm vào Standards của `<role>`: '<line>'?"* (roles/README.md flow). Nothing to add → say nothing.

## After
- `progress.md`: tick the item and rewrite the single `> **NOW:**` line in the SAME turn as the commit (what is done at `<sha>`, what is next, what waits on the owner). Same after a ticket/MR post or a deploy. Forgotten → the Stop hook rewrites it as `(auto …) commit mới nhất …`; seeing an `(auto …)` NOW means: rewrite it properly now.
- `decisions.md`: append only if the item produced a real decision or lesson.
- Delete that item's `tmp/shots/` (the images were already sent in chat).

## Stop when
Committed → next item.
