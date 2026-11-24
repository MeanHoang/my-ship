# G0 — Problem check (Gate 0): understand and see the problem before any research, grill or plan

**Role:** parent, with one `scout` (`model: opus`) for the source + code and one `verifier` (`model: sonnet`) for the reproduction, dispatched in parallel. **Used by:** `/ship` (step 0b), right after K0. Always needs the owner, also with `--auto`.

Why (owner 2026-11-16): *"tôi chạy ship nó chạy 1 lúc lâu rồi nó ra câu hỏi trong khi chưa chắc nó hiểu đúng vấn đề mà chính tôi cũng chưa hiểu vấn đề này nên là cần có 1 gate xác định vấn đề verify tái hiện rồi báo tôi là đã hiểu đúng vấn đề chưa rồi mới sang grill me"*. A long product research and a grill built on a wrong reading of the task waste the run and the owner's answers; the owner may not understand the problem yet either, so this report must also explain it to him.

## Do (short: no product research, no mockups, no plan in this block)
1. **The requester's own words.** Open the source itself (the task tracker page + its comments, Slack thread, support chat, ticket, tester note) and the images in it. Keep up to 3 verbatim quotes with where they came from. Spec written by BA with AI → trust the goal only (profile §1).
2. **One real example.** Restate the problem as one concrete case: who (merchant / shopper, which kind), on which screen, does what, sees what, expected what. Name the exact screen / setting / record.
3. **See it on the real app** (test stores, profile §4; profile §4):
   - bug or complaint → reproduce it the K2 way (`.claude/workflow/blocks/K2-reproduce.md`): before-screenshot of the merchant / shopper screen, or a failing test for pure backend;
   - feature or change → screenshot today's screen at the exact place that will change, plus the code path `file:line` that produces it today;
   - "how many are hit" → a query or log count if one can answer it cheaply (say the source), otherwise "chưa đếm";
   - cannot reproduce → say so, the two routes tried and what each showed, and what that may mean (already fixed, data-specific, different surface).
4. **Label every statement:** `đã thấy` (screenshot / log / query, with path) · `đọc code` (`file:line`) · `giả định` (not checked). Never present a `giả định` as seen.
5. **Write `analysis.md` §0 "Vấn đề"** with items 1–4 (the later §1–§6 of Gate 1 build on it), evidence under `tmp/shots/` and `tmp/logs/`.

## 🚦 Report to the owner, then stop
Plain Vietnamese, written so he understands the problem from this message alone (he may not know it yet):
```
Em hiểu vấn đề là: <1–2 câu, theo 1 ví dụ thật: ai, màn hình nào, làm gì, thấy gì, mong gì>
Người báo nói: "<trích nguyên văn>" (<nguồn>)
Em đã xem tận nơi / tái hiện: <đường dẫn ảnh hoặc log> → thấy <...>   (hoặc: chưa tái hiện được: thử A → ..., thử B → ...)
Vì sao xảy ra (nếu đã thấy): 1. <bước> (file:line) → 2. ... 
Còn là giả định: <...>
Anh xác nhận em hiểu đúng vấn đề chưa?
```
Attach the screenshot(s) (open them first; `page-images-check.mjs` for an HTML page).
Wait for his explicit "đúng" / "ok". He corrects → fix §0, re-check what changed, report again. Until then: no block P, no `analysis.md` §1–§6, no grill question, no plan, no code.

## Stop when
He confirmed the problem. Write in `progress.md`: `gate0: confirmed <date> — <his words>`.
