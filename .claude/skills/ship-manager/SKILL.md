---
name: ship-manager
description: Start or run the owner's work-manager chat across every workspace — which session waits on him, which may be stuck, what is running, what can be closed; open/close workspaces, nudge sessions, work report. Use when the owner types "/ship-manager", "tình hình các session", "session nào đang kẹt", "mở workspace cho task …", "đóng workspace …", "hôm nay làm được gì", "canh giúp các session".
---

# ship-manager

The owner starts it in its own terminal of the main checkout: `claude -n ship-manager "/ship-manager"`, in the permission mode he picks (profile §20).

1. Read the role: `.claude/roles/ship-manager.md` (what it does / never does) and profile §20. Follow them for the whole session.
2. Run `python3 .claude/scripts/ship-manager-status.py`; for every NEEDS_OWNER or SILENT row read its screen (`orca terminal list --json`, then `orca terminal read --terminal <handle>`).
3. Report per the role's Output (Vietnamese, most urgent first). Then wait for the owner.
4. Argument `status` (used by `/loop 15m /ship-manager status`): run step 2, report only what changed since your previous report in this session; nothing changed → one line "Không có gì mới (HH:MM)".

`/ship-board` is the one-shot table of ship tasks; `/ship-manager` is the chat that also reads screens, nudges, opens and closes workspaces.
