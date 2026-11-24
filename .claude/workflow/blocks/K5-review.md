# K5 — Review, one round

**Role:** reviewer (`.claude/roles/reviewer.md`, `model: opus` per the ship-core table): TWO reviewers in parallel on the same checklist (`.claude/roles/review-checklist.md`), one Claude subagent + one Codex run; each cross-verifies the other's findings. Parent re-verifies and reports.
Why: benchmark 2026-11-02 on real merge requests: Claude + Codex on this checklist caught 72% of verified bugs vs 39% for the old single review; each model found bugs the other missed.

## First: machine checks
The reviewer runs `node .claude/scripts/diff-guard.mjs` before reading the diff. Every finding is a **must-fix** unless `decisions.md` records the owner approving that exact line. The review does not repeat what the script checks; it spends its attention on logic.

## Shape
The report has the two parts in `roles/reviewer.md` Output: "right thing?" (GOAL / ACC covered, extra, misread) and "right code?" (diff-guard + proven must-fix). Only proven must-fix items block the commit.

## When
**Once**, after ALL fixes of the batch (bugs) or ALL phases (feature) are done and confirmed (K4). Never per fix, never per phase, never a second round. A big risk seen mid-way → grill the owner (`.claude/workflow/grill-me.md`), do not add a review round.

## Scope
Run `node .claude/scripts/review-gate.mjs` first; it prints the range. First review of the task, or a merge of master since the last review → `git diff <base>...HEAD` (merge-base diff, base per profile §1; conflict resolutions are new code). Only plain commits since the last review → `git diff <reviewed-sha>..HEAD` (a delta review: same reviewers, smaller diff). Plus uncommitted changes of this task. Exclude generated files (profile §1) except to check they match their sources.

## Reviewer subagent
Before dispatch the parent saves `git status --porcelain` (and `git rev-parse HEAD`); after the reviewer returns, both must be identical. A difference = the reviewer edited the repo: list the changed files at the top of the report; do not revert them yourself (no `restore`/`checkout --` without the owner).

1. Read first: `progress.md` (the owner calls it process.md — goal, settled scope), `decisions.md`, `.claude/roles/reviewer.md` + profile §11 reviewer (together: the owner's checklist).
2. **Run the project's review command itself** inside the subagent (profile §8) — never a paraphrase of it, never a different reviewer agent.
3. Then walk **every step of `.claude/roles/review-checklist.md`** and the reviewer Standards list against the diff; each finding cites the checklist step or Standards line it comes from.
4. BE fixes: confirm the test was not weakened and nothing is hard-coded to pass. Then **check each fixture against real records** with `a read of a real record of that collection in a test environment` (reviewer Standards "Fixtures match real records"): a green test on a fixture real data never has proves nothing. The report lists each fixture checked: collection, env, exit code.
5. Backend diff → run the impact map on the whole branch (profile §16, no argument). Section 0 not `none` = must-fix. Read the section 4 units the diff did not touch (call graph + change history; measured to catch about half of what fixers later had to change) and the section 3 readers of collections the diff writes to with a new shape; a finding from here cites the impact-map line that led to it.

## Codex reviewer, same turn
In parallel with the Claude subagent (background Bash, one-shot `codex exec`, no session, no lane; owner's Codex/ChatGPT-plan login, about 85k tokens a run; owner OK 2026-11-02):
`node .claude/scripts/codex-review.mjs review --out .claude/ship/<slug>/tmp/logs/k5-codex-review.json`

**Cross-verify** once both are back (in parallel):
- Codex checks Claude's findings: save them as JSON, then `codex-review.mjs verify --candidates <claude.json> --out .claude/ship/<slug>/tmp/logs/k5-codex-verify.json`.
- A Claude subagent (reviewer role, cross-verify) checks Codex's findings.

A finding is dropped only with a concrete refutation; unsure = kept. Merge duplicates. The report says which reviewer found each item.

**Codex unavailable** (exit 3: quota, not installed, timeout, unparsable answer): go on with the Claude reviewer only and its own self-check. Put `Codex reviewer missing: <reason>` at the top of the report. Never block or ask.

## Edge review, same turn
Backend diff → also run the `edge-review` skill on this branch (`prepare.mjs --worktree <this worktree>`), in parallel with the reviewer subagent. Edge tests built on the branch's own fixtures inherit their blind spots; the fixture check above covers that. Its confirmed `regression` items join the must-fix findings with their failing test as proof; `pre-existing` gaps and siblings are listed separately for the owner (scope rule — not fixed without his word). Numbers and cost: profile §17.

## Finding format
Severity is only `must-fix` (breaks behaviour / misses the GOAL, with a concrete scenario) or `optional` (everything else). Only must-fix findings are fixed; optional ones are listed for the owner.
`severity | file:line | what breaks, concrete scenario | standard/surface | suggested fix`. No `file:line` + scenario → drop it. Only issues introduced by this diff. No style nitpicks (lint and `diff-guard` own them). At most 5 `optional` items.

## Parent — verify every finding BEFORE the owner sees it
Reviewers (Claude, Codex, edge-review) report claims, not facts. The owner reads only what the parent has checked (owner 2026-11-03: "review tìm rất nhiều bug mà parent ko verify lại à cứ để loạt hết tôi đọc"; that round the parent skipped the cross-verify, sent a finding it had only read, asked "anh có muốn em chạy test để chứng minh", and listed a case already waiting on a teammate).
1. **Cross-verify is not optional.** Codex checks Claude's and edge-review's findings, a Claude subagent checks Codex's (section above). Codex unavailable → a Claude subagent checks all of them. Never replace it with "em tự mở code" alone.
2. **Merge duplicates** across the three sources (same file/function + same wrong behaviour = one item, note who found it).
3. **Drop what is already settled.** Check each item against `decisions.md`, the `progress.md` "Waiting on" / open-questions lines and the owner's words in this task: already decided → not a finding (one line at the end: "N items match earlier decisions: <decision>"); waiting on someone (e.g. a PO answer) → not a finding, at most one line "still waiting on <who>: <question>".
4. **Prove each remaining must-fix yourself**: a failing test/script you ran (scratch or throwaway tree; built with the real writer's data shape, a real-record read where a record is involved), or a numbered flow with file:line and real values that you re-traced. Cannot prove it within this K5 → it is `optional`, not must-fix. Never ask the owner whether to prove a finding: proving it is your job.
5. **Report only the verified result** (one report, plain Vietnamese):
   - must-fix: each with its proof (test name + fail/pass output, or the flow), who found it, recommendation;
   - optional: at most 5, one line each;
   - counts at the end: "Reviewers raised N → duplicates D, already decided X, refuted R (with the refuting line), unproven → optional U".
6. Accepted findings → K3 → K4 → **their own commit** (K6) → a delta review of just those fix commits (same reviewers, `<reviewed-sha>..HEAD`), because a fix is new code (owner 2026-11-16: "khi có thay đổi code merge branch sửa fix cũng đều phải chạy ship review nhé tôi thấy miss không chạy luôn").
7. **Mark:** when no proven must-fix is left unfixed, `node .claude/scripts/review-gate.mjs --mark` (writes `reviewed-sha: <HEAD>` in `progress.md`). Never mark before the review ran on that range.

## Stop when
Report delivered. Nothing is fixed before the owner picks.
