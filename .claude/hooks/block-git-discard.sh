#!/usr/bin/env bash
# PreToolUse(Bash) — deny git commands that throw away uncommitted work, for the session AND its subagents
# (PreToolUse hooks also fire on subagent tool calls).
#
# Why: owner rule "no restore, checkout --, stash or reset unless asked" was text only; a subagent used
# `git checkout` against it on 2026-11-03 (nothing lost that time) and on 2026-08-18 one discarded another
# agent's WIP with `git checkout --`.
#
# Denied: git checkout [<ref>] -- <path> | git checkout . | git restore (without --staged) |
#         git reset --hard/--merge/--keep | git stash (except list/show) | git clean -f
# Allowed: branch switches (`git checkout <branch>`, `-b`), `git restore --staged`, plain `git reset` (unstage).
# The owner asked for it explicitly → the parent appends `# owner-asked: "<his words>"` to the command.
# Always exit 0; block with permissionDecision deny.

set -uo pipefail
INPUT=$(cat 2>/dev/null || true)

python3 - "$INPUT" <<'PY' 2>/dev/null || true
import json, re, sys

try:
    hook = json.loads(sys.argv[1] or "{}")
except Exception:
    sys.exit(0)
cmd = (hook.get("tool_input") or {}).get("command") or ""
if "git" not in cmd or re.search(r"#\s*owner-asked:", cmd):
    sys.exit(0)

reason = None
for part in re.split(r"&&|\|\||;|\n|\|", cmd):
    p = part.strip()
    m = re.search(r"(^|\s)git(\s+-C\s+\S+)?\s+(checkout|restore|reset|stash|clean)\b(.*)$", p)
    if not m:
        continue
    sub, rest = m.group(3), m.group(4)
    if sub == "checkout" and (re.search(r"(^|\s)--(\s|$)", rest) or re.search(r"(^|\s)\.(\s|$)", rest)):
        reason = "git checkout -- <path> / checkout . (discards file changes)"
    elif sub == "restore" and "--staged" not in rest:
        reason = "git restore <path> (discards file changes)"
    elif sub == "reset" and re.search(r"--(hard|merge|keep)\b", rest):
        reason = "git reset --hard/--merge/--keep"
    elif sub == "stash" and not re.match(r"\s*(list|show)\b", rest):
        reason = "git stash (hides work; -u swallows untracked files and merge state)"
    elif sub == "clean" and re.search(r"-\w*f", rest):
        reason = "git clean -f (deletes untracked files)"
    if reason:
        break

if not reason:
    sys.exit(0)
print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": (
        f"⛔ {reason} bị chặn: lệnh này có thể xoá bản sửa chưa commit (của mình hoặc agent khác). "
        "Muốn bỏ một thay đổi của CHÍNH mình → sửa ngược bằng Edit, hoặc `git diff -- <file> > tmp/logs/x.patch && git apply -R tmp/logs/x.patch` (patch giữ lại để khôi phục). "
        "Subagent: DỪNG và báo parent. Anh chủ đã yêu cầu rõ → thêm `# owner-asked: \"<lời anh>\"` cuối lệnh."),
}}))
PY

exit 0
