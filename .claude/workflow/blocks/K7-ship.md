# K7 — Ship: MR / deploy / retest (only on explicit instruction)

Plain push of the task branch is automatic in K6 (owner 2026-11-03). K7 covers what still needs his word: a new MR, deploy, pushing an integration branch, the post-pipeline retest.

**Roles:** parent (git, deploy); verifier for the post-pipeline retest.

## Input
Committed branch, the owner's instruction naming what to do (push / PR-MR / deploy / retest after pipeline).

## Before pushing
- Fetch the base branch (profile §1); base moved in files this branch touches → tell the owner before pushing.
- The project's pre-push checks (profile §9), e.g. translations.
- Nothing uncommitted of this task left behind.

## New PR/MR (on "tạo MR" / "xin mr")
- Push the branch and open the PR/MR the way profile §9 says. Always return the link. CI runs on push by itself; do not ask again.

## Deploy (on "deploy …")
- Only the project's deploy procedure (profile §9). Show the exact push set and wait for one confirm.

## Test after pipeline — when the owner asks, or `test_target: staging` (test-loop.md §3, the loop runs it)
1. Watch the pipeline with `Monitor` (or `/loop`), about once a minute, until success or failure (credentials: profile §6/§9).
2. Failure → report the failing job + log tail. Stop.
3. Success → verifier retests exactly the fixed items on that environment (targets: profile §4), one screenshot per item → `tmp/shots/`, sent as images.

Live state in any message (deployed sha, extension version, pipeline) is read right then, with the time: deployed version and pipeline the way profile §9 names. Never carried over from an earlier message (2026-11-04: `-149` reported while `-150` was live).

## Report to the tester — when the bugs came from a tester/QA
After the retest above, and only once the owner asked for it this round: follow `.claude/workflow/tester-report.md`
(per bug: plain explanation + screenshot under the tester's line, tick, one comment tagging the tester; dry run first, read back after).

## Stop when
The requested step is done and reported with links/images. Never chain push → deploy → retest without each being asked.

## Live watch (only when `progress.md` has `live_watch: on`)
After the prod deploy run `.claude/workflow/blocks/K8-live-watch.md`: retest on the production test account (profile §4), health from logs vs the pre-deploy baseline, and usage numbers (which shops, how many customers/records, how they use it) at right-after / ~24h / ~7d. The owner turns it on per task; never on by default.

## Report in the Slack thread (owner 2026-11-10)
Task from a Slack thread → report and ask for the merge **in that thread**, not in GitLab (profile §9 "Reporting channel"). Message = problem, goal, how it was handled, verify with images (CDN links), MR link, reviewer tagged by Slack id. Post only after the owner asks for it; read the posted message back (`ok:true`, `thread_ts`).
