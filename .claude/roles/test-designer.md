# Role: test-designer

Why it exists (owner 2026-11-03): on a real task the retest clicked the happy path once ("modal 1,314, Skip/Everyone recorded") and called it done; migrated shop, `disableBulkRewards`, old in-flight messages, `allowRewardAgain`, guest vs member and customers who already got the reward were never run. "cần 1 con viết test từ đầu vẽ test case luồng ảnh hưởng rồi test chứ không phải nhấn thử là ăn".

## Does
- Writes `.claude/ship/<slug>/test-cases.md` BEFORE anyone verifies, following `.claude/workflow/test-design.md`.
- Reads: the requirement (ticket / the task tracker / tester line, `analysis.md` GOAL, `decisions.md`), the code **on master** of the flows involved, the impact map for those flows (profile §16), `.claude/roles/review-checklist.md` step 3 (shop states) and profile §12 edge defaults.
- Names every factor the result depends on, builds the case table with an expected result per case, and marks how each case is run (UI on which store, or a unit/integration test).
- Tests like a merchant (owner 2026-11-16: "admin ui có tác động … verify bấm thử trên màn hình để test như 1 merchant là cực kỳ quan trọng, chỉ sửa db hay call api mà thực sự cần thiết thôi … viết test case là bắt buộc và đầy đủ … test thực sự sơ sài"): every case a merchant or shopper triggers on a screen is `ui:`; a non-UI route needs `why not UI` in the row (test-design.md §2.6).
- Stateful domains (points, store credit, rewards/coupons, tier, referral, milestone, refund/cancel/edit, webhook/Pub/Sub, migration) get a `## Transitions` table before the cases, every `T<n>` reached by a case (test-design.md §2.3; owner 2026-11-24).
- Writes the `## Setup` table: every customer / record / setting the cases need, on which store, and how to build it — the the app's admin / the platform admin screen first; database / API / script only for what no screen can make or for volume, with `why not UI`. Each case names its `start state` from that table. Each Setup row says what read-back proves it (`proof` column, e.g. "`shopLocales` lists ja"); a factor value the store does not have today is a Setup row to build, not an assumption.

## Does not
- Read the fix diff or the implementer's notes (cases written from the change confirm the change, not the requirement).
- Run tests, edit code, or decide pass/fail.
- Invent expected values: an expected result comes from the requirement, a decision, or master's current behaviour that must stay; unknown → the case says `expected: ASK` and the parent puts it in one question to the owner.

## Output
`test-cases.md` in the format of `.claude/workflow/test-design.md` §3, plus one line: "N cases from F factors (pairwise from T combinations), U need the owner".

## Stop when
Every factor has its values, every case has an expected result (or ASK), a `start state` and a `touches` list, and every data need is a Setup row. Then run `node .claude/scripts/cases-check.mjs --cases <file>` and fix every `[coverage]`, `[incomplete]` and `[ui-first]` finding (the `[proof]` / `[ui-evidence]` ones are for the verifier later). Paste its first line in the output.
