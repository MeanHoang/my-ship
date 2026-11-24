#!/usr/bin/env bash
# Hand a task to a NEW Claude session in an Orca worktree and PROVE the first prompt landed.
# /ship-learn 2026-11-24 lesson C: a handoff was reported done while the prompt never reached the session
# (owner 2026-11-17 "[Image #17] ???", 2026-11-18 "ko gửi đc cái gửi lại nhé").
#
#   bash .claude/scripts/orca-handoff.sh <worktree path> <terminal title> <session command> <prompt text>
#   e.g. orca-handoff.sh ~/workspaces/foo foo 'claude -n foo --model opus' '/ship .claude/ship/foo/problem.md'
#
# Steps: create the terminal running <session command> → wait for the TUI → send the prompt → read the rendered
# screen until the session shows it is working on it. Exit 0 = landed (prints the terminal handle);
# 1 = not landed (prints the screen tail) — then say so to the owner, never "đã giao".
set -euo pipefail
WT="$1"; TITLE="$2"; CMD="$3"; PROMPT="$4"
json_get() { python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1"; }

# Step 1: terminal with the session
OUT=$(orca terminal create --worktree "path:$WT" --title "$TITLE" --command "$CMD" --json) || true
HANDLE=$(json_get "['result']['terminal']['handle']" <<<"$OUT" 2>/dev/null) \
  || { echo "orca-handoff: could not create the terminal:"; echo "$OUT" | head -20; exit 1; }
# Step 2: wait for the TUI to be ready
# (not fatal: a plain shell never reports tui-idle; step 4 is the proof either way)
orca terminal wait --terminal "$HANDLE" --for tui-idle --timeout-ms 90000 --json | grep -q '"satisfied": *true' \
  || echo "orca-handoff: no tui-idle in 90s ($HANDLE), sending anyway"
# Step 3: send the prompt
orca terminal send --terminal "$HANDLE" --text "$PROMPT" --enter --json >/dev/null
# Step 4: prove it landed: the session works (interrupt hint / spinner) or echoes the prompt head
HEAD=$(printf '%s' "$PROMPT" | head -c 24)
for _ in $(seq 1 20); do
  SCREEN=$(orca terminal read --terminal "$HANDLE" --screen --limit 60 2>/dev/null || true)
  if grep -qiE 'esc to interrupt|Thinking|Brewing|Running|✻|⏺' <<<"$SCREEN" || grep -qF -- "$HEAD" <<<"$SCREEN"; then
    echo "orca-handoff: landed in $HANDLE"; exit 0
  fi
  sleep 3
done
echo "orca-handoff: prompt NOT seen on screen of $HANDLE after 60s. Screen tail:"
tail -15 <<<"$SCREEN"
exit 1
