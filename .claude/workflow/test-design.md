# Test design — write the cases first, then test them; retest only what the new code touches

Owner 2026-11-03: "cần 1 con viết test từ đầu vẽ test case luồng ảnh hưởng rồi test chứ không phải nhấn thử là ăn"; then "đừng lúc nào cx test lại hết test case impact thôi … mới đẩy 1 code mới thì … test cái code mới impact … test lại hết okie nhưng tốn token và lâu".
Sources weighed (2026-11-03 research): decision tables + equivalence/boundary + state transitions + pairwise (Sogeti multi-agent decision tables; arXiv 2505.09830; Meta TestGen-LLM: humans/spec define partitions, the model fills them); Claude Code best practices (test cases before code).

## 1. When
- `/ship`: at Gate 2 · 2c+, the acceptance list IS `test-cases.md` (each `ACC:` line names its case id).
- `/ship-bugs`, `/bug-check` fix session, `/ship-fix`: once per task, before the first K4. Size follows the change: a one-surface label change may be 2–3 cases; anything with conditions gets the full table.
- Dispatched as ONE `test-designer` subagent (`model: fable`, Fable 5.2), given the paths `.claude/roles/test-designer.md`, this file, profile §11/§12. Re-run it only when the requirement changes.

## 2. Method (in this order)
1. **Flows.** From the requirement + master code + impact map: every entry point that reaches the changed behaviour (admin action, webhook, cron, storefront, REST API) and every surface that shows its result.
2. **Factors.** Everything the result depends on, each with its values (equivalence classes + boundaries). Always consider:
   - customer: guest / member, which tier, already received the reward or not, meets the condition / just below / just above, B2B;
   - shop: legacy / migrated, feature or setting on / off, kill switches (e.g. `disableBulkRewards`), plan without the feature, multi-currency / markets, large shop;
   - each setting the code branches on (e.g. `allowRewardAgain`), with absent / old-record values;
   - timing / state: before / after the change, in-flight jobs or messages created by old code, repeat actions (twice, after undo).
   - languages / currencies / markets: primary only · 2+ published · the longest-text language (de or fr) for layout (labels wrapping, buttons pushed down). A language case needs a store that really publishes that language (owner 2026-11-16: "test ngôn ngữ nhưng store có đúng 1 ngôn ngữ mặc định mà cx cho pass đc ?????"; "vỡ layout đấy nếu chữ dịch dài ra").
3. **Rules → cases.** Rule-driven → decision table (drop impossible combinations, merge rows with the same outcome). Lifecycle → state transitions (current state, event, next state; include the not-allowed events). More than 3 factors left → pairwise (every pair of values appears in at least one case); keep every rule-table row and every boundary as its own case.
4. **Expected result** per case, from the requirement / `decisions.md` / master behaviour that must stay. Unknown → `ASK`.
5. **How** per case: `ui:<store>` (profile §4) or `unit:<test file>::<name>` / `script:<path>` when the UI cannot reach the state (migrated shop, in-flight message). Nothing can reach it → `cannot: <why>`, still listed.
6. **touches:** the files or folders (master paths, prefix match) the case exercises, from the flow trace and the impact map. Used to pick retests.

## 3. File format — `.claude/ship/<slug>/test-cases.md`
```
## Factors
- customer: guest | member-no-tier | member-tier-gold | already-got-reward
- shop: normal | migrated | disableBulkRewards=true
- allowRewardAgain: on | off | absent

## Setup  (built BEFORE the first case; ids recorded here so retests reuse them)
| id | what | where | how to build | built (record id / customer email) | proof (read back) |
|---|---|---|---|---|---|
| S1 | 1 Gold member who never got the entry reward | staging | DB write (users, tier=gold) or the admin's "Adjust tier" | ⬜ | ⬜ |
| S2 | shop publishes en + ja + de | staging | Admin API `shopLocales` / the platform admin Languages | ⬜ | ⬜ |

## Cases
| id | factors | start state | steps | expected | how | touches | status |
|---|---|---|---|---|---|---|---|
| C1 | member-tier-gold, normal, off | S1, flag off, logged in as S1 | relaunch tiers, pick "Send to everyone" | gold members who never got the reward get it once | ui:staging | src/services/tier/, src/pages/Tier/ | ⬜ |
```
`proof`: the state read back from the store after building it, never the build command's own output: a file under `tmp/logs/` (e.g. `shopLocales` query result) or the quoted value (`"locales: en, ja, de"`).
`start state`: every setting / login / data the case needs, set explicitly at the start of the case. Never rely on what the previous case or round left behind (a real round: "the flag was already OFF, left by an earlier attempt").
`status`: `⬜` not run · `✅ <sha> <kind>:<evidence path>` passed on that commit, `kind` = `shot` (UI screenshot) · `api` · `db` · `unit` — a UI case passed by an API call is `api`, never `shot` · `❌ <sha> <one line>` failed · `⛔ <why>` cannot run. The verifier updates it with evidence paths in `tmp/`.

## 4. Running and retesting (K4 + test-loop)
- **Before the first case (parent, ~1 min):** browser preflight — the browser tool (profile §4) answers. Down → tell the owner in one line NOW and run the non-browser cases meanwhile; never discover it 27 minutes into a UI round.
- **Build the Setup table first** (free hand on local/staging, profile §4) and write the ids into it, then read each state back from the store and fill `proof`. The store lacks the state (one language, one currency, plan without the feature) → build it; a case on an unproven row is never `✅`. A row that cannot be built → its cases become `⛔ no data: <why>` right away, not after a round.
- **Split by how:** `unit:` / `script:` / DB-read cases go to one subagent, UI cases to one verifier, dispatched in parallel (one browser = one UI verifier, never two). Two verifiers never share one store's program, customer or cart: same store → one after the other; in parallel only on different stores, each with its own Setup rows (2026-11-04: two parallel verifiers overwrote each other's program config, cases re-run).
- **Order UI cases by state** to switch as little as possible: store → logged-out before logged-in → setting value. Logging out = open `/account/logout` on the storefront.
- **First verify of the task: run every case.** Report the counts line by evidence kind: `N cases: ✅ X (shot A, api B, db C, unit D), ❌ Y, ⛔ Z (why)`. The parent opens every cited image before saying "có ảnh". A `⛔` is never silent.
- **After a new fix commit / push: run only the impacted cases**, not the whole table:
  `node .claude/scripts/select-cases.mjs --cases .claude/ship/<slug>/test-cases.md --since <last tested sha>`
  It returns the cases whose `touches` match a file changed since that sha (after a master merge: every case touching any task file; master's own files are ignored; never an empty retest), plus every `❌` / `⬜` case, plus the changed files no case touches (`unmatched`). For `unmatched` files: add or extend a case (test-designer, or the parent in one line), then run it.
- Run the whole table again only when the owner asks, or before the final report when the fixes since the first full run touched shared code (a file that more than half the cases list). Say which in the report.
- **Evidence budget per UI case:** read state with `find` / `get_page_text` / `javascript_tool`  or a DB read; click by the ref `find` returns, not by screenshot coordinates; ONE screenshot per case at the result moment (visual cases only), plus the before shot for FE bugs. Wait for text with `find`, never `computer wait` + screenshot. (One real round: 169 calls, 42 screenshots, 30 waits for 28 clicks.)
- Before any report that says cases passed: `node .claude/scripts/cases-check.mjs --cases .claude/ship/<slug>/test-cases.md` must exit 0 (a `✅` case on a setup row with no proof fails it). Paste its first line in the report.
- Done = every case `✅` or an accepted `⛔`. A case `❌` after 3 fixes → stop (test-loop.md §4).
