# Test design — write the cases first, then test them; retest only what the new code touches

Owner 2026-11-03: "cần 1 con viết test từ đầu vẽ test case luồng ảnh hưởng rồi test chứ không phải nhấn thử là ăn"; then "đừng lúc nào cx test lại hết test case impact thôi … mới đẩy 1 code mới thì … test cái code mới impact … test lại hết okie nhưng tốn token và lâu".
Sources weighed (2026-11-03 research): decision tables + equivalence/boundary + state transitions + pairwise (Sogeti multi-agent decision tables; arXiv 2505.09830; Meta TestGen-LLM: humans/spec define partitions, the model fills them); Claude Code best practices (test cases before code).

## 1. When
- `/ship`: at Gate 2 · 2c+, the acceptance list IS `test-cases.md` (each `ACC:` line names its case id).
- `/ship-bugs`, `/bug-check` fix session, `/ship-fix`: once per task, before the first K4.
- **Mandatory and complete, for every task** (owner 2026-11-16: "admin ui có tác động … verify bấm thử trên màn hình để test như 1 merchant là cực kỳ quan trọng, chỉ sửa db hay call api mà thực sự cần thiết thôi … viết test case là bắt buộc và đầy đủ … test thực sự sơ sài"): no verify starts before `test-cases.md` exists and `cases-check.mjs` exits 0 on it. Complete = every factor value is in at least one case (or under `dropped:` with why), every case has an expected result, and every screen the change shows up on (admin page, storefront, email, checkout) has its own case. A one-line label change still lists each screen and language it appears on. Tester bugs that escaped (/ship-learn 2026-11-24) add three musts: every storefront version that renders the change (widget V3 / V4, LP V2, Hub) has its own case incl. the blocked / error state and its exact text (V3 showed the wrong error); every new or changed text has a narrow-width case, 390 / 768 px, for cut or overflow; a task with a design frame has a case comparing element order and position with the design (two buttons swapped).
- Dispatched as ONE `test-designer` subagent (`model: opus`, Opus 5.5), given the paths `.claude/roles/test-designer.md`, this file, profile §11/§12. Re-run it only when the requirement changes.

## 2. Method (in this order)
1. **Flows.** From the requirement + master code + impact map: every entry point that reaches the changed behaviour (admin action, webhook, cron, storefront, REST API) and every surface that shows its result.
2. **Factors.** Everything the result depends on, each with its values (equivalence classes + boundaries). Always consider:
   - customer: guest / member, which tier, already received the reward or not, meets the condition / just below / just above, B2B;
   - shop: legacy / migrated, feature or setting on / off, kill switches (e.g. `disableBulkRewards`), plan without the feature, multi-currency / markets, large shop;
   - each setting the code branches on (e.g. `allowRewardAgain`), with absent / old-record values;
   - timing / state: before / after the change, in-flight jobs or messages created by old code, repeat actions (twice, after undo).
   - languages / currencies / markets: primary only · 2+ published · the longest-text language (de or fr) for layout (labels wrapping, buttons pushed down). A language case needs a store that really publishes that language (owner 2026-11-16: "test ngôn ngữ nhưng store có đúng 1 ngôn ngữ mặc định mà cx cho pass đc ?????"; "vỡ layout đấy nếu chữ dịch dài ra").
3. **State transitions (mandatory for stateful domains)** (owner 2026-11-24, after Tobi Lütke's "make implicit state machines explicit": the costly the app bugs sat in transitions — refund/edit after earn ( bugs 8–10), Pub/Sub redelivery duplicating logs, milestone re-grant). When any case `touches` points / store credit / rewards & coupons / redemption / tier tier / referral / milestone / order refund-cancel-edit / webhook or Pub/Sub handlers / import-migration, write a `## Transitions` table BEFORE the cases: every state the record can be in, every event that moves it (including repeats, redelivery, out-of-order, undo, events the code must refuse), the next state, and the side effects (points, coupon, email, webhook, metafield). Each row `T<n>` is named in at least one case's `factors` or `steps` cell (a row no case can reach → `dropped: T<n> — <why>`). Not stateful → one line `no transitions: <why>` under `## Factors`. `cases-check.mjs` enforces both.
4. **Rules → cases.** Rule-driven → decision table (drop impossible combinations, merge rows with the same outcome). Lifecycle → state transitions (current state, event, next state; include the not-allowed events). More than 3 factors left → pairwise (every pair of values appears in at least one case); keep every rule-table row and every boundary as its own case.
5. **Expected result** per case, from the requirement / `decisions.md` / master behaviour that must stay. Unknown → `ASK`.
6. **How** per case — **as a merchant / customer first.** Anything a merchant or shopper does on a screen (save a setting, click redeem, edit in the editor, place an order) is `ui:<store>` (profile §4): click it in the real the app's admin / the platform admin / storefront, like the merchant would. The UI goes through the real save path (validation, side effects, cache, publish); an API call or DB write skips it and can pass a case that is broken for merchants. Other routes only when really needed, each with `why not UI: …` in the row: `unit:<test file>::<name>` (pure logic), `script:<path>` / `api:` (the change IS a webhook, cron, REST/MCP endpoint, or the state is unreachable from a screen: migrated shop, in-flight message). A task with no screen at all writes one line `no UI surface: <why>` under `## Factors` instead. Nothing can reach it → `cannot: <why>`, still listed.
7. **touches:** the files or folders (master paths, prefix match) the case exercises, from the flow trace and the impact map. Used to pick retests.

## 3. File format — `.claude/ship/<slug>/test-cases.md`
```
## Factors
- customer: guest | member-no-tier | member-tier-gold | already-got-reward
- shop: normal | migrated | disableBulkRewards=true
- allowRewardAgain: on | off | absent

## Transitions  (stateful domains, §2.3)
| id | state before | event | state after | side effects |
|---|---|---|---|---|
| T1 | member Silver, no entry reward | order paid → spend crosses Gold | Gold | entry coupon created, tier/upgraded webhook |
| T2 | Gold, entry reward given | same Pub/Sub message delivered again | Gold (unchanged) | no second coupon |

## Setup  (built BEFORE the first case; ids recorded here so retests reuse them)
| id | what | where | how to build | built (record id / customer email) | proof (read back) |
|---|---|---|---|---|---|
| S1 | 1 Gold member who never got the entry reward | staging | the app's admin customer page → Adjust tier → Gold | ⬜ | ⬜ |
| S2 | shop publishes en + ja + de | staging | Admin API `shopLocales` / the platform admin Languages | ⬜ | ⬜ |

## Cases
| id | factors | start state | steps | expected | how | touches | status |
|---|---|---|---|---|---|---|---|
| C1 | member-tier-gold, normal, off, T1 | S1, flag off, logged in as S1 | relaunch tiers, pick "Send to everyone" | gold members who never got the reward get it once | ui:staging | src/services/tier/, src/pages/Tier/ | ⬜ |
```
Case `factors` cell: the factor values written as in `## Factors` (that is how `cases-check.mjs` checks coverage). A value with no case goes on a line `dropped: <value> — <why>` under `## Factors`.
`how to build`: the admin / storefront screen route first (that is also a test of the merchant path). database / API / script only for what no screen can make or for volume (10+ customers, 20+ orders), and the cell says `why not UI: …`.
`proof`: the state read back from the store after building it, never the build command's own output: a file under `tmp/logs/` (e.g. `shopLocales` query result) or the quoted value (`"locales: en, ja, de"`).
`start state`: every setting / login / data the case needs, set explicitly at the start of the case. Never rely on what the previous case or round left behind (a real round: "the flag was already OFF, left by an earlier attempt").
`status`: `⬜` not run · `✅ <sha> <kind>:<evidence path>` passed on that commit, `kind` = `shot` (UI screenshot) · `api` · `db` · `unit` — a UI case passed by an API call is `api`, never `shot` · `❌ <sha> <one line>` failed · `⛔ <why>` cannot run. The verifier updates it with evidence paths in `tmp/`.

## 4. Running and retesting (K4 + test-loop)
- **Before the first case (parent, ~1 min):** browser preflight — the browser tool (profile §4) answers. Down → tell the owner in one line NOW and run the non-browser cases meanwhile; never discover it 27 minutes into a UI round.
- **Gate:** `node .claude/scripts/cases-check.mjs --cases .claude/ship/<slug>/test-cases.md` exits 0 before the first case (coverage, expected, ui-first). Exit 2 → back to the test-designer with the findings; do not start testing on a thin table.
- **Build the Setup table first** (free hand on local/staging, profile §4) and write the ids into it, then read each state back from the store and fill `proof`. The store lacks the state (one language, one currency, plan without the feature) → build it; a case on an unproven row is never `✅`. A row that cannot be built → its cases become `⛔ no data: <why>` right away, not after a round.
- **Split by how:** `unit:` / `script:` / DB-read cases go to one subagent, UI cases to one verifier, dispatched in parallel (one browser = one UI verifier, never two). Two verifiers never share one store's program, customer or cart: same store → one after the other; in parallel only on different stores, each with its own Setup rows (2026-11-04: two parallel verifiers overwrote each other's program config, cases re-run).
- **Order UI cases by state** to switch as little as possible: store → logged-out before logged-in → setting value. Logging out = open `/account/logout` on the storefront.
- **First verify of the task: run every case.** Report the counts line by evidence kind: `N cases: ✅ X (shot A, api B, db C, unit D), ❌ Y, ⛔ Z (why)`. The parent opens every cited image before saying "có ảnh". A `⛔` is never silent.
- **After a new fix commit / push: run only the impacted cases**, not the whole table:
  `node .claude/scripts/select-cases.mjs --cases .claude/ship/<slug>/test-cases.md --since <last tested sha>`
  It returns the cases whose `touches` match a file changed since that sha (after a master merge: every case touching any task file; master's own files are ignored; never an empty retest), plus every `❌` / `⬜` case, plus the changed files no case touches (`unmatched`). For `unmatched` files: add or extend a case (test-designer, or the parent in one line), then run it.
- Run the whole table again only when the owner asks, or before the final report when the fixes since the first full run touched shared code (a file that more than half the cases list). Say which in the report.
- **Evidence budget per UI case:** read state with `find` / `get_page_text` / `javascript_tool`  or a DB read; click by the ref `find` returns, not by screenshot coordinates; ONE screenshot per case at the result moment (visual cases only), plus the before shot for FE bugs. Wait for text with `find`, never `computer wait` + screenshot. (One real round: 169 calls, 42 screenshots, 30 waits for 28 clicks.)
- A `ui:` case passes only on screen evidence (a `tmp/shots/` image, or a `tmp/logs/` page-text read for a text check). Its `status` kind is `shot`; an API response or DB read alongside it is extra proof, never the pass itself.
- Before any report that says cases passed: `node .claude/scripts/cases-check.mjs --cases .claude/ship/<slug>/test-cases.md` must exit 0 (a `✅` case on a setup row with no proof fails it). Paste its first line in the report.
- Done = every case `✅` or an accepted `⛔`. A case `❌` after 3 fixes → stop (test-loop.md §4).
