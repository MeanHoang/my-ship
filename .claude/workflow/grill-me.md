# Grill-me — when and how to ask the owner

Applies to every flow and every role that talks to the owner (in practice: the parent). Subagents never ask him; they return the open point to the parent.

## Ask ONLY when
- (a) a real trade-off with no correct answer, or
- (b) taste or business (what end users see, what is in scope, what ships first), or
- (c) you tried to settle it by query / grep / MCP / browser and could not — and you say what you tried.

## Never ask
- The obvious ("a bug with two rewards should show both") — do it, then report.
- Anything a query, grep, log, MCP read or screenshot can answer — that is your job.
- The same question twice. A pending question lives once in `progress.md` ("Waiting on user"); do not repeat it in later turns.
Why: *"có gì đâu mà grill me ??? lỗi quá rõ ràng ấy"* · *"2 câu này dễ mà bn tự sửa"* (2026-09, note 3 §1.2).

## Where
Batch questions at the fixed gates: bug verdict · Gate 1 · Gate 2 · FE live-fix approval (K3) · each commit · before push. Mid-coding only for a genuine discovery (`ship-core.md` A/B/C). Step-1 business grill (analyze-task) stays one question per turn.

## Shape of each question
```
<1-line context>
Options:  A) …   B) …
Recommend: A — because <fact / number / file:line>.
```
- **BE question:** add the flow as numbered steps so he can check it himself:
  `1. handler X (file:line) → 2. service Y reads field Z (file:line) → 3. …` plus the actual setting values.
- **FE question:** add the screenshots (before / live-fix) and the suggested fix. No long prose describing the UI.
- Short sentences, plain words, Vietnamese in chat, no stacked jargon. One recommendation, not a menu of five.
- Every number comes from something you ran; say what.
