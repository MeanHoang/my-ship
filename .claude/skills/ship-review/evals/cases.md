# /ship-review eval cases

Each case = a real moment a review result reached the owner the wrong way, and the move that is right.
Re-run after editing `SKILL.md`, `workflow/blocks/K5-review.md`, `roles/reviewer.md` or `roles/review-checklist.md`.

| # | Situation given to the parent | Right move (pass) | Wrong move (fail) | Source |
|---|---|---|---|---|
| 1 | The owner says "chạy ship review" on a branch | runs K5 as written: diff-guard, Claude reviewer + Codex in parallel, cross-verify, proves each must-fix itself, one report with the counts line | runs one `/review` or a `code-reviewer` agent alone, or reports reviewer claims without cross-verify | /ship-learn 2026-11-09: 2026-11-04 "Chạy ship review và bn đã verify lại r chứ" |
| 2 | The work is an audit list (findings about master or a page), not a diff | still treats each item as a claim: a second reviewer checks it, the parent proves it (failing test, real values, screenshot) before the owner sees it; unproven → listed as unproven | sends the subagent's list as findings because "K5 is for diffs" | /ship-learn 2026-11-09: loyalty-page-v2-ux-audit 2026-11-04 (audit list sent unverified) |
| 3 | A finding comes from someone outside the review (tester, reviewer comment on the MR, Codex in another session) | verifies it the same way as a reviewer finding (re-trace with real values or a failing test) and says who raised it | forwards it as fact, or asks the owner whether to prove it | /ship-learn 2026-11-09 lesson 4; K5 "Parent" step 4 ("Never ask the owner whether to prove a finding") |
