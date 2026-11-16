# P — Product judgement (Discover / Decide)

**Role:** product (`.claude/roles/product.md` + profile §11 product + §13), `model: sonnet`. Parent dispatches it; the owner decides.

## When it runs (parent calls it — the owner never has to remember)
| Moment | Mode |
|---|---|
| `/ship-new` Gate 0 (new app) | Discover P1 + P2 (no spec → no P3) |
| `/ship` Gate 1, before the GOAL is written — skipped only for `/ship-fix` / `/ship-bugs` | Discover P1 → P2 → P3 (if `product.md` exists: update, do not redo) |
| `/ship` 2b: a trade-off that changes what users see, scope, or cost to users | Decide |
| Discovery **B** (map was wrong) or **C** (direction changed) | Decide |
| `/ship-auto` parks a scope / UX item | Decide — the card goes into `report.html`; the run does not wait |

## Discover — three steps, blind first (owner decision 2026-09-29)
**Blind rule:** the product role receives only the **goal** — who has the problem, what outcome they want, why now — extracted by the parent from the task. It does NOT read the spec's proposed solution (the BA's screens, fields, flows) before P3. Why: a spec's solution anchors every later idea; the owner wants an independent product proposal, then a comparison. The parent writes the goal in 3–5 lines into the dispatch and keeps the spec link out of it.

### P1 · Current state + research
1. Restate the goal as the user's problem in one sentence (no solution words).
2. **Current state** (existing product only): what the app already does in this area — screens, settings, flows, real usage numbers (read-only queries), related tickets/reviews (profile §13). A new app → "none".
3. Research, cheapest first: the project's own evidence → the web (alternatives, their changelogs, 1–3★ reviews, forums). Budget: ~5 web **searches** (fetching pages to confirm a result does not count). Every kept claim gets source + date; a snippet alone never counts (roles/product.md Standards).
4. Three-layer synthesis: what everyone knows · what current sources say · where that is wrong for **us** (source: gstack ETHOS "Search Before Building").
5. Forcing questions the evidence could not answer — **one per turn, max 4 in total**, only via the parent:
   - Who exactly has this problem, and how often? (a name, a segment, a number)
   - What do they do today instead — even badly — and what does that cost them?
   - What is the smallest version that would already help them this week?
   - What happens if we do nothing?

### P2 · Product proposal + mockup
- **Base = the real current UI**, not Figma: start from a screenshot of today's widget / admin page on the test store (browser tool, profile §4), and show the design only as the change on top of it. Preview inside the real editor when one exists; no standalone set of pages. Anything the design does not show is labelled "chưa thiết kế", never invented (owner 2026-10-26 "dừng dựa theo ảnh figma lấy ảnh àny cho sát hiện tại", "dựng editor thôi … cần gì dựng nhiều"; 2026-10-27 "designer đâu có vẽ perk mặt sau").
1. Options (≥3 incl. the smallest and "do nothing") → recommended v1: appetite, solution, rabbit holes, **no-gos**.
2. **Mockup = the REAL current UI with the change applied** (owner 2026-11-03: "mockup phải dựa theo ui thật hiện tại"; 2026-11-02 wishlist task: a hand-drawn HTML mockup missed the header, product images, variant lines, Sold out and the real fonts → "mockup này ko sát thực tế", one extra hour to redo it on the real widget).
   - **Never redraw a surface that already exists** (widget, popup, loyalty page, admin page) as standalone HTML. Start from it on a granted test store (profile §4).
   - **Storefront / widget:** write the change as a patch, `.claude/ship/<slug>/tmp/mockups/<name>.css` (+ `<name>.js` only for markup the CSS cannot make), inject it into the live page with the browser tool and shoot before/after from the same page. Sample content (long names…) goes in before both shots, and those files are marked `-override`.
   - **Admin (cross-origin iframe, no injection):** screenshot the real page (a screenshot from the browser tool) as the base and overlay ONLY the new control in the design system's look (profile §14), labelled "dựng thêm"; everything else is the real pixels.
   - **A screen that does not exist yet** (new page/popup): only then local HTML, built from the nearest real screen's components and labelled "chưa có UI thật".
   - Widths: the browser's real viewport, reported as is. Never fake a phone by squeezing a panel with CSS; if the phone layout matters and no real phone viewport is available, say "chưa chụp mobile thật".
   - What to draw: the recommended v1 (need-data / Kill → the smallest option). One page `tmp/mockups/index.html` shows the before/after pairs with one-line captions (what changed, sample data yes/no, width).
   - Reopen every image before sending (designer Standards). Then ask ONE question with one recommendation; do not run several A/B rounds on the same mockup.
3. Verdict **Build / Reframe / Kill / need-data** + confidence:
   - **Build** — a specific problem with ≥1 behaviour/commitment signal, an identifiable user who wants it a lot, no untested High value-risk, appetite + no-gos written, confidence ≥80%.
   - **Reframe** — the problem is real but the literal ask / scope / cost is wrong → restate problem + smaller option.
   - **Kill** — only opinion/future-promise evidence, "many who want it a little", or it duplicates what users already do well enough. Say what evidence would reopen it.
   - **need-data** — confidence <50% → name the query / interview / experiment that settles it.
   - Priority: confidence <50% → **need-data wins** over Kill. Kill needs medium+ confidence.
   - "Why us" comes from profile §13; missing → it is a forcing question.
   (Rubric: synthesis of Cagan's four risks, Mom Test, Paul Graham, Shape Up, RICE confidence bands.)
4. Fill `product.md` (template `skills/ship/templates/product.md`): one screen of body, sources listed under it, open questions last. No mockup is possible (pure backend / API change) → say why and show the before/after data or API shape instead.

### P3 · Compare with the spec (only when a spec exists — skipped for a new app)
Now read the spec (e.g. the BA's task) and fill `product.md` §11:
| Point | Spec says | Product proposes | Difference | Follow which, why |
Cover: the problem statement, who it is for, v1 scope, screens/flow, settings added, what is left out, success metric. Say plainly where the spec is better. Contradictions with the code or data found in P1 → cite `file:line` / query.

### Gate
Parent posts: verdict + confidence, the 3 strongest sourced facts, the P3 table (if any), and runs `node .claude/scripts/page-images-check.mjs .claude/ship/<slug>/tmp/mockups/index.html` (exit 0) then `open .claude/ship/<slug>/tmp/mockups/index.html` so the mockup is on the owner's screen. 🚦 The owner decides (build / reframe / kill, and which side of each difference); the parent records it in `decisions.md`. Only then Gate 1 continues (analysis.md, GOAL).

## Decide — the decision card (same shape every time)
```
Decision: <the question, one line>
Options: A) …  B) …  C) do nothing / smallest
Recommend: <option> — because <evidence, sourced> (confidence: high/medium/low)
Fails if: <the assumption that kills it> · Cheapest test: <what would check it this week>
Would change my mind: <the evidence>
Predicted owner choice: <option>  (taste check — compared after he decides)
```
(Shape from pm-skills `strategy-red-team`: "Fails if / Evidence / Kill criterion / Cheapest test".)

## Output
Discover: `product.md` + mockup files + summary. Decide: the card, pasted into the gate message (or `report.html` in auto).

## Stop when
The brief or the card exists. Product never plans phases, never codes, never commits.
