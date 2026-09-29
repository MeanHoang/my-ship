# Auto-decide — how the parent decides alone in `/ship-auto`

Applies only while `auto: on` in the `<!-- state -->` block of `progress.md`. The owner approved the plan at Gate 2 and left; he reads the final report. Every decision made here must be **explainable in one line and reversible with one command**.

## 1. Classify first (same test as `ship-core.md` "Discoveries")
- **A — technical trade-off** → decide here (section 2).
- **B — the map was wrong** (Gate 1 belief false) → decide here only if the GOAL still holds unchanged; otherwise PARK.
- **C — direction changed** (a surface drops in/out, the phase split no longer makes sense) → PARK that part; continue phases that do not depend on it.

## 2. Pick the option in this order (first rule that separates the options wins)
1. **The GOAL and `decisions.md`.** An option that contradicts a settled decision is out.
2. **Existing pattern.** The option that copies a sibling `file:line` beats a new design.
3. **Reversible.** The option that is cheaper to undo (no data written, no schema change, behind a flag) wins.
4. **Live shops untouched.** Existing shops without the new field behave exactly as on master (grandfather or gate).
5. **Smaller diff / fewer surfaces.**
Still tied → take the option a scout can verify with a test or screenshot, and say so.

## 3. Never decide alone — PARK instead
Park = write it under "Waiting on user" in `progress.md` (scope / UX items: with a product Decide card, block P), keep the dependent checkboxes and prefix their text with `⏸` (`- [ ] ⏸ …` — never delete a box, the guard hook denies it), move on to independent work.
- Writing, migrating, backfilling or deleting real data.
- Changing the GOAL, the scope list, or what end users see beyond the approved plan.
- Queries or jobs whose cost grows with data size.
- Auth, HMAC, permissions, PII.
- Changing live behaviour of another surface that uses shared code (surfaces: profile §2).
- New dependency, new deployable unit (function/service), new database index.
- Anything in the project's extra park list (profile §10).
- Two evidence sources that disagree and no test can settle.

## 4. Record every decision (the owner reverses from this)
Append to `decisions.md`, newest first:
```
## <YYYY-MM-DD> — D-auto-<N>: <decision in one line>
**Vì:** <rule from section 2 that decided it + fact / file:line>
**Đã loại:** <option B> — <why>
**Commit:** <sha> (<message>)   ← filled after K6
**Đảo ngược:** `git revert <sha>` → then <what to build instead, one line>
**Ai chốt:** AI (auto) — chờ anh duyệt ở report
```
The code of one decision lives in **its own commit** tagged `[D-auto-<N>]`, never mixed with other work, so `git revert` removes exactly that choice.

## 5. Stop the whole run (set `auto: done`, write the report) when
- Every remaining item is parked or done.
- The same item failed verification twice after a fix (do not try a third approach blind).
- A hard hook denied an action twice for the same item.
- The stop time `auto_until` has passed.
- The GOAL can no longer be met without a parked decision.
