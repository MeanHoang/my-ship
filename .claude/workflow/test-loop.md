# Test loop — pick local or staging, then test → fix → retest until it passes

Why: the owner picks where a task is tested once; then test → fix → retest runs by itself and the other session only merges and deploys (owner 2026-11-03).
Used by K4 (and K7 retest) in every flow: `/ship`, `/ship-bugs`, `/ship-fix`, `/bug-check` fix sessions, `/ship-verify`.

## 1. Ask once per task: local or staging
At the first K4 of the task, unless `progress.md` already has `test_target:` or the owner named it this task, ask ONE question (grill-me shape):
```
Test task này ở đâu?
A) Local: nhanh, không chờ deploy.   B) Staging: qua session của nhánh tích hợp gộp + deploy.
Em đề xuất <A|B> — vì <reason>.
```
Recommend **local** when nothing needs a public URL. Recommend **staging** when a webhook, a deployed extension or staging-only data is needed, or a tester reported the bug on staging.
Write the answer into `progress.md` as `test_target: local` or `test_target: staging` and never ask again in this task. The owner may switch it any time with one word.

## 2. Local loop
1. Start the local stack (profile §5).
2. Test every case in `test-cases.md` (K4: browser tool, profile §4; backend fail→pass + revert check).
3. Case fails → fix (K3) → commit + push (K6) → retest only the cases `select-cases.mjs --since <last tested sha>` returns (test-design.md §4) **on the same running stack**. Loop.
4. All items pass, or the loop stops (§4) → **always** stop the local stack (profile §5) before reporting. Before the report: `node .claude/scripts/review-gate.mjs` exit 0 (fixes made in the loop get their review now). The stack never stays up after the loop.

## 3. Staging loop (the task session only monitors deploys)
Step 0, once per bug: take the K2 before evidence on staging BEFORE the first `MERGE-DEPLOY` that carries its fix (staging still runs the old build).
The task session never touches `<integration-branch>` itself. The session that owns it (named in profile §19, found with `ListAgents`) merges and deploys.
1. Commit + push the task branch (K6). Note the pushed sha.
   Then `node .claude/scripts/review-gate.mjs` must exit 0: a fix or merge since the last review → `/ship-review` on the range it prints, `--mark`, then continue (owner 2026-11-16: "khi có thay đổi code merge branch sửa fix cũng đều phải chạy ship review nhé tôi thấy miss không chạy luôn"). Then `branch-drift.mjs --against origin/<integration-branch>`. Exit 2 → merge the base branch into the task branch first (the merge procedure of this project, conflicts in this task's files only), push, then send. Conflict that remains against `<integration-branch>` only (another task's files) → name those files in the MERGE-DEPLOY message so the integration session knows before it starts.
2. `SendMessage` to that session, first line exactly:
   `MERGE-DEPLOY staging: branch <task branch> sha <sha> from <this session name>`
   then one line on what the task changed (files / area) so it can resolve conflicts.
   No such session, or the message is held/denied (`[Cross-session delivery notice]`) → tell the owner in one line ("session <integration-branch> không nhận tin: <why>") and wait for him. Never merge or push `<integration-branch>` from the task session.
3. Monitor only: do nothing else on the task until the reply arrives (it is delivered automatically; do not poll `ListAgents`). Also arm one long fallback (ScheduleWakeup / Monitor, ~45 min): no reply by then → check `git fetch origin <integration-branch> && git merge-base --is-ancestor <sha> origin/<integration-branch>` and the deployed bundle (profile §9), report the state to the owner.
4. Reply `DEPLOYED …` → first round: every case in `test-cases.md`; later rounds: only the cases `select-cases.mjs --since <last tested sha>` returns (test-design.md §4). On staging, K4 rules, images.
   Reply `BLOCKED …` → stop the loop, tell the owner the reason verbatim.
5. Item fails → fix (K3) → commit + push → back to step 2 with the new sha. Loop.
6. All cases ✅ (or accepted ⛔) → `node .claude/scripts/review-gate.mjs` exit 0 (else `/ship-review` the range, `--mark`) → report (proof per case + the counts line + the review-gate line) and stop.

## 4. Stop the loop and ask the owner when
- the same item failed after **3** fixes (show the 3 attempts);
- the fix needs a choice with a real trade-off (grill-me);
- staging: the merge conflicts in files this task does not own, or the pipeline fails in a job this task did not cause (the integration session replies `BLOCKED`).
Nothing else stops it: no "ok để em test tiếp?" between rounds.

## 5. The integration session (`<integration-branch>`) on a `MERGE-DEPLOY` message
This is the standing order for that session (owner 2026-11-03); it needs no extra word from him per request.
1. Requests are handled one at a time, in arrival order. Several waiting → may merge them together, one deploy.
2. `git fetch origin` → merge `origin/<task branch>` into `<integration-branch>` with the the merge procedure of this project.
   Conflict only in that task's files → resolve (per-hunk union), run the cheap checks the skill names.
   Conflict in someone else's files, or unclear → abort the merge, reply `BLOCKED staging: conflict in <files> (<owner branch>)` to the requester, tell the owner.
3. Push `<integration-branch>` (allowed for this request: the K6 "never push <integration-branch>" rule is lifted only here) and deploy the way profile §9 says.
4. Watch the pipeline to the end (profile §9).
   Green → reply `DEPLOYED staging: <integration-branch> <sha> includes <task sha>, pipeline <id/url>`.
   Red → our merge caused it → fix in `<integration-branch>` once and redeploy; otherwise reply `BLOCKED staging: pipeline <job> failed: <log tail>` and tell the owner.
5. Reply with `SendMessage` to the requester's name from the request line. The owner sees a one-line status in this session too.
