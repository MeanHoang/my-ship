#!/usr/bin/env bash
# ship-auto-run.sh — chạy `/ship-auto` bằng PHIÊN MỚI CHO MỖI PHASE.
#
# Vì sao: chạy nhiều giờ trong một phiên thì context dài dần, compact nhiều lần, luật đầu
# phiên mờ đi → phase cuối làm ẩu hơn phase đầu ("drift" — Cursor, Anthropic; note 5 mục 4).
# AI không tự gõ /clear được, nên vòng lặp phải nằm NGOÀI Claude: mỗi vòng một `claude -p`
# mới, đọc progress.md / decisions.md / plan.html từ đĩa, làm ĐÚNG MỘT phase rồi thoát.
#
# Dùng:
#   bash .claude/scripts/ship-auto-run.sh [worktree]          # parent tự gọi lúc "move auto"
#   CLAUDE_BIN=/path/fake bash .claude/scripts/ship-auto-run.sh   # test vòng lặp, không tốn token
#
# Dừng khi: auto != on · quá auto_until (1 phiên cuối viết report) · 2 vòng liền không tiến
# triển (1 phiên cuối viết report). Log mỗi vòng: .claude/ship/<task>/tmp/logs/auto-run-*.jsonl
# Không bao giờ push — phiên con theo luật K6 Exception / K7.

set -uo pipefail

WT=${1:-$(git rev-parse --show-toplevel 2>/dev/null)}
CLAUDE_BIN=${CLAUDE_BIN:-claude}
cd "$WT" || { echo "không vào được $WT"; exit 1; }

# In ra: đường dẫn progress.md, auto, auto_until, chữ ký tiến triển (NOW|HEAD|số ô đã tick)
state() {
  python3 - <<'PY'
import os, re, subprocess
root = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip()
branch = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True).stdout.strip()
head = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
ship = os.path.join(root, ".claude", "ship")
for s in sorted(os.listdir(ship)) if os.path.isdir(ship) else []:
    p = os.path.join(ship, s, "progress.md")
    if not os.path.isfile(p):
        continue
    t = open(p, encoding="utf-8", errors="replace").read()
    m = re.search(r"^\s*branch:\s*(.+?)\s*$", t[:1500], re.M)
    if not m or m.group(1).strip() != branch:
        continue
    g = lambda k: (re.search(rf"^\s*{k}:\s*(.+?)\s*$", t[:1500], re.M) or [None, ""])[1]
    now = (re.search(r"^>\s*\*\*NOW:?\*\*:?\s*(.+)$", t, re.M) or [None, ""])[1]
    sig = f"{now}|{head}|{len(re.findall(r'^- \[x\]', t, re.M))}"
    print(p); print(g("auto").lower()); print(g("auto_until")); print(sig)
    break
PY
}

read_state() { { read -r PROGRESS; read -r AUTO; read -r UNTIL; read -r SIG; } < <(state); }

read_state
[ -n "${PROGRESS:-}" ] || { echo "không tìm thấy progress.md cho branch này"; exit 1; }
[ "$AUTO" = "on" ] || { echo "auto đang là '$AUTO', không chạy"; exit 0; }
LOGS="$(dirname "$PROGRESS")/tmp/logs"; mkdir -p "$LOGS"
REL=${PROGRESS#"$WT"/}

# Giữ máy thức trong lúc chạy (tự tắt khi script thoát)
command -v caffeinate >/dev/null && caffeinate -i -w $$ &

PHASE_PROMPT="You are the PARENT of a ship-auto run, in a FRESH session started by .claude/scripts/ship-auto-run.sh (auto_driver: script). The owner is away.
1. Read .claude/skills/ship-auto/SKILL.md, .claude/workflow/ship-core.md, .claude/workflow/auto-decide.md, .claude/ship-profile.md, then $REL, its decisions.md and plan.html. Run the Resume protocol (ship-core).
2. Do EXACTLY ONE unit of work: the first unticked phase that is not marked ⏸ — K3 implementer → K4 verifier → per-phase review (profile §8) → K6 auto-commit → tick with evidence → update NOW. Subagents in the foreground.
3. If no phase can proceed: do the End steps instead (K5 once, report.html, auto: done, awaiting: user).
4. Then STOP. Do not start a second phase — the script opens a new session for it. Never push."

final() {
  echo "[$(date +%H:%M)] phiên cuối: $1"
  "$CLAUDE_BIN" -p --dangerously-skip-permissions --output-format stream-json --verbose \
    "You are the PARENT of a ship-auto run (fresh session, auto_driver: script). $1 Do NOT start a new phase. Read $REL and decisions.md, write report.html per .claude/skills/ship-auto/SKILL.md 'End' (say in section 4 why the run stopped), set auto: done and awaiting: user in the state block, then stop. Never push." \
    > "$LOGS/auto-run-final-$(date +%Y%m%d-%H%M).jsonl" 2>&1
}

n=0; stalls=0
while :; do
  read_state
  [ "$AUTO" = "on" ] || { echo "[$(date +%H:%M)] auto=$AUTO → xong"; exit 0; }
  if [ -n "$UNTIL" ] && [ "$(date '+%Y-%m-%d %H:%M')" \> "$UNTIL" -o "$(date '+%Y-%m-%d %H:%M')" = "$UNTIL" ]; then
    final "The stop time $UNTIL has passed."; exit 0
  fi
  n=$((n+1)); before=$SIG
  echo "[$(date +%H:%M)] vòng $n"
  "$CLAUDE_BIN" -p --dangerously-skip-permissions --output-format stream-json --verbose "$PHASE_PROMPT" \
    > "$LOGS/auto-run-$(printf %02d $n)-$(date +%Y%m%d-%H%M).jsonl" 2>&1
  read_state
  [ "$AUTO" = "on" ] || { echo "[$(date +%H:%M)] auto=$AUTO → xong"; exit 0; }
  if [ "$SIG" = "$before" ]; then stalls=$((stalls+1)); else stalls=0; fi
  if [ "$stalls" -ge 2 ]; then
    final "The run is stuck: two sessions in a row made no progress (NOW, HEAD and ticks unchanged)."; exit 0
  fi
done
