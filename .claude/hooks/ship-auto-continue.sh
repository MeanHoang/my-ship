#!/usr/bin/env bash
# Stop hook — giữ `/ship-auto` chạy tiếp khi anh treo máy.
#
# Vì sao cần: model trả lời xong là kết thúc lượt và ĐỨNG CHỜ. Ở chế độ auto không có ai
# gõ tiếp, nên cả đêm máy chỉ đứng yên sau phase đầu. Hook này chặn việc dừng khi
# progress.md còn `auto: on` và đẩy nó sang việc kế tiếp.
#
# Chống chạy vòng vô ích: mỗi lần đẩy ghi lại chữ ký (NOW + HEAD + số ô đã tick) vào
# tmp/auto-stop.json. Hai lần đẩy liên tiếp mà chữ ký không đổi = đang kẹt → cho dừng,
# để anh về thấy NOW thay vì đốt token cả đêm.
#
# Luôn exit 0.

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
m = re.search(r"^\s*auto:\s*(\S+)", txt[:1500], re.M)
if not m or m.group(1).lower() != "on":
    sys.exit(0)
# Script driver (ship-auto-run.sh) owns the loop: each phase is its own `claude -p` session
# and must END after its phase. Pushing here would give the run two drivers.
m = re.search(r"^\s*auto_driver:\s*(\S+)", txt[:1500], re.M)
if m and m.group(1).lower() == "script":
    sys.exit(0)

m = re.search(r"^>\s*\*\*NOW:?\*\*:?\s*(.+)$", txt, re.M)
now = m.group(1).strip() if m else ""
sig = f"{now}|{git('rev-parse', 'HEAD')}|{len(re.findall(r'^- \[x\]', txt, re.M))}"

state_dir = os.path.join(os.path.dirname(target), "tmp")
os.makedirs(state_dir, exist_ok=True)
state_file = os.path.join(state_dir, "auto-stop.json")
try:
    prev = json.load(open(state_file))
except Exception:
    prev = {}

# Stop time the owner set at "move auto" (`auto_until: YYYY-MM-DD HH:MM`). Past it: one last
# push to write the report, then let the session stop — no new phase starts.
m = re.search(r"^\s*auto_until:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})", txt[:1500], re.M)
if m:
    import datetime
    if datetime.datetime.now() >= datetime.datetime.strptime(m.group(1), "%Y-%m-%d %H:%M"):
        if prev.get("timeup_sent") == m.group(1):
            sys.exit(0)
        prev["timeup_sent"] = m.group(1)
        json.dump(prev, open(state_file, "w"))
        print(json.dumps({"decision": "block", "reason": (
            "ship-auto: stop time " + m.group(1) + " has passed. Do NOT start a new phase. "
            "If a phase is mid-way, leave it uncommitted and untick it. Write report.html with what is "
            "done (section 4: stopped at the time limit), set `auto: done` and `awaiting: user`, then stop.")}))
        sys.exit(0)

stalls = prev.get("stalls", 0) + 1 if prev.get("sig") == sig else 0
prev.update({"sig": sig, "stalls": stalls})
json.dump(prev, open(state_file, "w"))

if stalls >= 2:
    sys.exit(0)  # stuck: let it stop, NOW shows where

print(json.dumps({
    "decision": "block",
    "reason": ("ship-auto is on (" + os.path.relpath(target, root) + "). "
               "Do not wait for the owner. Continue with the first unticked item; follow "
               ".claude/workflow/auto-decide.md for any decision. NOW: " + (now or "(none)") + ". "
               "If nothing can proceed: K5 once, write report.html, set `auto: done` and "
               "`awaiting: user` in the state block, then stop."),
}))
PY

exit 0
