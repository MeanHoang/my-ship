# K8 — Live watch: retest, health and real usage after a feature goes live on prod (opt-in per task)

**Only for tasks the owner names** (owner 2026-11-24: "chỉ với 1 số task tôi nói sẽ có bước gồm kiểm tra test lại bằng test env và check logging theo dõi healthy của tính năng mới live báo cáo dạng số liệu kiểu store nào dùng bao nhiêu người dùng tuỳ vào bài toán báo họ dùng như nào"). Trigger: he says "theo dõi sau live", "live watch", "báo số liệu sau live" for a task → write `live_watch: on (<date> — <his words>)` in `progress.md`. Without that line this block never runs. Why: a task is not done at "MR merged"; the owner wants proof that the live feature works and is used (Tobi Lütke, Slack C075S03NANN p1795482309526889: measure accepted merchant outcome, not PRs).

**Role:** parent (plan, numbers, report); one `verifier` for the retest. **Used by:** any ship entry point, after the owner says the change is deployed to prod (or the deployed bundle shows it, K7 "Live state").

## 0. Plan the watch (once, before or at deploy; owner OKs it with the readiness)
Write `.claude/ship/<slug>/live-watch.md`:
- **Retest cases:** 3–5 main cases from `test-cases.md` (the GOAL lines), run on the production test account (profile §4) (the app's admin UI only, small data, profile §4). A case that needs writes the prod store must not take → run it on staging with the same build, and say so.
- **Health signals:** for each new/changed code path, the exact `gcp-logs` filter (function name + log text / severity) for errors, and one for success. Baseline = the same filter over the 7 days before deploy (a measured number; never an invented threshold).
- **Usage questions, chosen for THIS feature** (ask the owner in one line if unsure which matter): which shops turned it on / used it, how many, how many customers or records it touched, how they use it (which setting values, which surface, how often). Each with its source: database query (prod read-only), BigQuery (partition filter), log count, the app MCP. Name the collection/field or log line.
- **Check points:** right after deploy · ~24h · ~7d (or the next real run of a sparse job).

## 1. At each check point
1. **Retest** (only at "right after deploy", and again if a later fix ships): verifier runs the retest cases, one screenshot per case → `tmp/shots/live-*`.
2. **Health:** run each filter; errors vs baseline; quote the top new error line with shop and record id. New error class or over baseline → report at once (do not wait for the table), with: the error line, shops hit, rollback or fix proposal.
3. **Usage:** run each query read-only. Real shop domains stay internal (Slack/the task tracker only when the owner asks to post). Zero usage is a valid result: say "0 shop" and since when, never "ổn".
4. Access fails (PERMISSION_DENIED on prod database/BigQuery, no SA) → quote the error, use the next source (logs, the app MCP per shop), and list in the report what could not be counted. Never estimate a number.

## 2. Report (Plain Vietnamese, one message per check point)
```
Sau live <mốc> (<time>): <one-line verdict: chạy ổn / có lỗi mới / chưa có ai dùng>
Retest (production test account): N/N đạt (ảnh: ...)
Sức khoẻ: lỗi <x> (trước deploy <y>/ngày) · thành công <z>  — nguồn: <filter>
Ai dùng:
| Shop | Bật lúc | Khách/bản ghi | Dùng thế nào |
Chưa đếm được: <...> (<error>)
```
Also write the numbers into `live-watch.md` and, when the task has a tracker card, the "Sau deploy" part of 🚀 Readiness and the Close-out.

## Stop when
The ~7d check point is reported (or the owner says stop). Then `live_watch: done <date>` in `progress.md`.
