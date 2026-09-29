# K0 — Open the task

**Role:** parent (`.claude/roles/parent.md`). **Used by:** every flow, once, first.

## Input
Task link or description, optional `--note`, the workspace (git worktree) the owner opened for this task.

## Do
1. **Right worktree, right base.** One workspace (worktree) = one task. Work in THIS worktree; never `cd` to the primary checkout, never create another worktree for the same task.
   - `git branch --show-current` + `git status --short`.
   - New task → fetch the base branch (profile §1) and branch from it with the profile's naming. Never branch from another feature branch or from a merge/integration branch.
   - Existing task branch → `git log --oneline <base>..HEAD` must show only this task's commits. Anything else (someone else's branch, another feature branch) → stop and ask.
   - Uncommitted changes that are not this task's → stop and ask. Never `git stash`, `git checkout --`, `git restore`, `git reset`.
2. **Harness present.** `.claude/skills/ship/`, `.claude/workflow/`, `.claude/roles/`, `.claude/ship-profile.md` exist in the worktree. Missing → `/sync-harness` (or `.claude/scripts/bootstrap-worktree.sh <worktree>`) and re-check. The global SessionStart hook normally does this already. Still missing → stop, tell the owner.
3. **Auth check — only what the flow will need, all at once, before work starts** (checks: profile §6). Report every failure in ONE line to the owner; continue with what does not need it.
4. **Artifacts dir** `.claude/ship/<slug>/` (already git-excluded via `.git/info/exclude`; verify the line exists):
   ```
   .claude/ship/<slug>/
   ├── progress.md  decisions.md  analysis.md  facts.md  plan.html   ← keep
   └── tmp/{shots,mockups,logs}/                                     ← disposable
   ```
   - `progress.md` from `.claude/skills/ship/templates/progress.md` (or a project skill's own template). `decisions.md` from `.claude/skills/ship/templates/decisions.md` when the task will make decisions.
   - **Every screenshot, mockup, log, repro script output goes under `tmp/`.** Never to `.playwright-cli/`, the repo root, or `docs/`.
5. **Persist `--note`** verbatim into the `<!-- state -->` block as `note:`.

## Local dev (only if a later block needs it)
Start, scope, port guard and stop: profile §5. Never kill another worktree's stack. Unit tests, eslint, builds need no lock.

## Output
One short message: worktree path · branch (and its base) · auth line · ship dir · mode/flow picked and why.

## Stop when
Wrong base, foreign uncommitted changes, or harness missing after bootstrap → ask the owner. Otherwise hand over to K1 (bugs) or Gate 1 (feature).

## Rules
- Session boundary: never read or write another task's `.claude/ship/<other>/` ().
- Stage explicit paths only, ever. `.claude/ship/` never reaches a commit.
