# K7 — Ship (only on explicit instruction)

**Roles:** parent (git, deploy); verifier for the post-pipeline retest.

## Input
Committed branch, the owner's instruction naming what to do (push / PR-MR / deploy / retest after pipeline).

## Before pushing
- Fetch the base branch (profile §1); base moved in files this branch touches → tell the owner before pushing.
- The project's pre-push checks (profile §9), e.g. translations.
- Nothing uncommitted of this task left behind.

## Push + PR/MR (on "push")
- Push the branch and open the PR/MR the way profile §9 says. Always return the link. CI runs on push by itself; do not ask again.

## Deploy (on "deploy …")
- Only the project's deploy procedure (profile §9). Show the exact push set and wait for one confirm.

## Test after pipeline — ONLY when the owner asks
1. Watch the pipeline with `Monitor` (or `/loop`), about once a minute, until success or failure (credentials: profile §6/§9).
2. Failure → report the failing job + log tail. Stop.
3. Success → verifier retests exactly the fixed items on that environment (targets: profile §4), one screenshot per item → `tmp/shots/`, sent as images.

## Stop when
The requested step is done and reported with links/images. Never chain push → deploy → retest without each being asked.
