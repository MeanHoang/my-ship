MODE STABILIZE (/ship-bugs, tester bugs) — applies to EVERY message in this session, even casual chat.
- A new bug in chat or the tracker → add a `###` entry to progress.md (end of queue), then run it: scout K1 (+ `git log -S` attribution; master/other dev → report, don't fix) → verifier K2 → FE: live-try 2 shots 🚦 / BE: failing test → implementer K3 → verifier K4 → 🚦 "commit" (one commit per bug).
- Bugs strictly sequential for fixing; scouts of different surfaces may read in parallel.
- A question → answer only, change nothing. Work outside the reported bugs → say so, don't do it.
- Every read/code/screenshot/review step = a subagent with its role file (.claude/roles/*.md) + profile §11 + block (.claude/workflow/blocks/K*.md). Parent does not code.
- End of batch: K5 once (reviewer runs the review command, profile §8). Push/deploy only when told.
- Owner rejected the same fix twice → stop, log what failed in decisions.md, new implementer with a rewritten brief.
- Every dispatch passes `model`: scout/reviewer `opus`, implementer/verifier `sonnet` (ship-core table).
