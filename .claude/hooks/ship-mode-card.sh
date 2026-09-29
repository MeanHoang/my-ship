#!/usr/bin/env bash
# UserPromptSubmit hook — chèn THẺ CHẾ ĐỘ của bộ ship-* vào cạnh mỗi tin nhắn của anh.
#
# Vì sao cần: một skill /ship-* chỉ nạp SKILL.md MỘT LẦN ở lượt gõ lệnh. Vài lượt sau anh chat
# thường ("à thêm bug này nữa") thì skill đã trôi xa lên đầu context và AI làm như chat
# tự do — bỏ qua tái hiện / xác nhận / commit từng bug (anh báo 29/09).
# Hook này chỉ chèn 5–8 dòng luật của chế độ đang chạy + dòng NOW, lượt nào cũng có.
#
# Branch không có .claude/ship/<task>/progress.md → im lặng. Luôn exit 0.

set -uo pipefail
INPUT=$(cat 2>/dev/null || true)

python3 - "$INPUT" <<'PY' 2>/dev/null || true
import json, os, re, subprocess, sys

try:
    hook = json.loads(sys.argv[1] or "{}")
except Exception:
    hook = {}
cwd = hook.get("cwd") or os.getcwd()


def git(*a):
    try:
        return subprocess.run(("git", "-C", cwd) + a, capture_output=True,
                              text=True, timeout=5).stdout.strip()
    except Exception:
        return ""


root = git("rev-parse", "--show-toplevel")
branch = git("rev-parse", "--abbrev-ref", "HEAD")
ship = os.path.join(root, ".claude", "ship") if root else ""
if not branch or not os.path.isdir(ship):
    sys.exit(0)

target = None
for s in sorted(os.listdir(ship)):
    p = os.path.join(ship, s, "progress.md")
    if not os.path.isfile(p):
        continue
    m = re.search(r"^\s*branch:\s*(.+?)\s*$",
                  open(p, encoding="utf-8", errors="replace").read(1500), re.M)
    if m and m.group(1).strip() == branch:
        target = p
        break
if not target:
    sys.exit(0)

txt = open(target, encoding="utf-8", errors="replace").read()


def field(k):
    m = re.search(rf"^\s*{k}:\s*(.+?)\s*$", txt[:1500], re.M)
    return m.group(1).strip().lower() if m else ""


mode = field("mode")
auto = field("auto")
cards = os.path.join(root, ".claude", "workflow", "mode-cards")
parts = []
for name in ([mode] if mode in ("ship", "continue", "stabilize", "lite", "new") else []) + (["auto"] if auto == "on" else []):
    f = os.path.join(cards, f"{name}.md")
    if os.path.isfile(f):
        parts.append(open(f, encoding="utf-8").read().strip())
if not parts:
    sys.exit(0)

m = re.search(r"^>\s*\*\*NOW:?\*\*:?\s*(.+)$", txt, re.M)
parts.append(f"NOW ({os.path.relpath(target, root)}): {m.group(1).strip() if m else '(no NOW line)'}")

print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "\n\n".join(parts),
}}))
PY

exit 0
