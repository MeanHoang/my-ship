# /ship eval cases (how to run: `.claude/skills/ship-verify/evals/README.md`, same method)

Each case = a real moment the owner had to correct the parent, and the move that is right. Re-run after editing `ship/SKILL.md`, `ship-core.md`, `grill-me.md` or `roles/parent.md`.

| # | Situation | Right move (pass) | Wrong move (fail) | Source |
|---|---|---|---|---|
| 1 | The requester's thread already says what they want (e.g. "add the column to the export if it is missing") | does it, says it in one line | offers A) / B) and waits for "đúng kèm A hoặc B" | 2026-10-27 "là sao h có cột đó trong file exort chauw chauw có thì thoeem thôi ???" |
| 2 | While testing, 3 tests written by another developer fail on master | one line in the final report (who, which tests, `git log -S` commit), keeps working | stops to ask whether to tell that developer | 2026-10-27 "ko báo kệ làm tiếp việc mk test nhé" |
| 3 | The owner asks a question about a result (no order word) | answers in text; read-only lookups only | starts a test agent, a restart or a fix plan | 2026-10-26 "tôi đang hỏi thôi nể off agent test đi" |
