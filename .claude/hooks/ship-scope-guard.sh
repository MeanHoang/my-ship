#!/usr/bin/env bash
# PreToolUse(Bash) — chặn commit có file NGOÀI PLAN của task ship-*.
#
# Vì sao: bảo sửa `my coupon`, AI đổi luôn layout mấy section khác (the owner's notes, 23/09).
# Cộng đồng gọi là "over-editing": "asked for a one-line fix and get back 40 changed lines
# across four files" (HN 47866913, 422 điểm). Review cuối lô mới thấy thì đã muộn.
#
# Luật: mọi file sắp commit phải được nhắc tới trong progress.md của task (đường dẫn
# hoặc tên file) — trong checklist phase/bug, hoặc trong "Việc phát sinh ngoài plan".
# Ngoài plan mà thật sự cần → `plan-add.mjs --why "<lý do>" <file> && git commit …` (1 lệnh) ghi dòng vào
# "Việc phát sinh ngoài plan" kèm lý do
# (và decisions.md nếu là quyết định), rồi commit lại. Muốn gỡ → git restore --staged.
# Luôn cho qua: test/fixture mới, file dịch (locale), file CI (.gitlab-ci.yml / .github/workflows),
# và commit merge (đang có MERGE_HEAD) — file từ master không phải sửa lan (owner 2026-10-26).
#
# Chỉ chạy khi branch có progress.md. Luôn exit 0; chặn bằng permissionDecision deny.

set -uo pipefail
INPUT=$(cat 2>/dev/null || true)

python3 - "$INPUT" <<'PY' 2>/dev/null || true
import json, os, re, shlex, subprocess, sys

try:
    hook = json.loads(sys.argv[1] or "{}")
except Exception:
    sys.exit(0)
cmd = (hook.get("tool_input") or {}).get("command") or ""
G = r"(^|[;&|(])\s*git\s+"
if not re.search(G + r"commit(\s|$)", cmd):
    sys.exit(0)

cwd = hook.get("cwd") or os.getcwd()
m = re.match(r'^\s*cd\s+"?([^"&;]+?)"?\s*(&&|;)', cmd)
if m:
    cwd = m.group(1) if os.path.isabs(m.group(1)) else os.path.join(cwd, m.group(1))


def git(*a):
    try:
        return subprocess.run(("git", "-C", cwd) + a, capture_output=True,
                              text=True, timeout=5).stdout
    except Exception:
        return ""


root = git("rev-parse", "--show-toplevel").strip()
# A merge commit (e.g. master -> task branch) carries upstream files by design: not over-editing.
if git("rev-parse", "-q", "--verify", "MERGE_HEAD").strip():
    sys.exit(0)
branch = git("rev-parse", "--abbrev-ref", "HEAD").strip()
ship = os.path.join(root, ".claude", "ship") if root else ""
if not branch or not os.path.isdir(ship):
    sys.exit(0)
progress = None
for s in sorted(os.listdir(ship)):
    p = os.path.join(ship, s, "progress.md")
    if os.path.isfile(p):
        m = re.search(r"^\s*branch:\s*(.+?)\s*$",
                      open(p, encoding="utf-8", errors="replace").read(1500), re.M)
        if m and m.group(1).strip() == branch:
            progress = p
            break
if not progress:
    sys.exit(0)
plan = open(progress, encoding="utf-8", errors="replace").read()
# `plan-add.mjs --why "<reason>" <files> && git commit` in the same command: those files are being declared now.
for part in re.split(r"&&|;|\|\|", cmd):
    if "plan-add.mjs" not in part or "--why" not in part:
        continue
    try:
        pa = shlex.split(part)
    except Exception:
        pa = part.split()
    pa = pa[pa.index(next(a for a in pa if a.endswith("plan-add.mjs"))) + 1:]
    skip = False
    for a in pa:
        if skip:
            skip = False
            continue
        if a == "--why":
            skip = True
            continue
        plan += "\n" + a

# Files about to be committed: already staged + `git add <paths>` in this same command.
files = set(l.strip() for l in git("diff", "--cached", "--name-only").splitlines() if l.strip())
for part in re.split(r"&&|;|\|\|", cmd):
    mm = re.search(r"(^|\s)git\s+add\s+(.*)$", part.strip())
    if not mm:
        continue
    try:
        args = shlex.split(mm.group(2))
    except Exception:
        args = mm.group(2).split()
    for a in args:
        if a.startswith("-"):
            continue
        ap = a if os.path.isabs(a) else os.path.join(cwd, a)
        try:
            files.add(os.path.relpath(os.path.realpath(ap), os.path.realpath(root)))
        except Exception:
            files.add(a)

ALWAYS = re.compile(r"(__tests__/|\.test\.|\.spec\.|(^|/)(tests?|e2e)/|(^|/)locales?/|(^|/)translations?/|^\.gitlab-ci\.yml$|^\.github/workflows/)")
outside = []
for f in sorted(files):
    if ALWAYS.search(f):
        continue
    if f in plan or os.path.basename(f) in plan:
        continue
    outside.append(f)
if not outside:
    sys.exit(0)

rel = os.path.relpath(progress, root)
lst = ", ".join(outside[:6]) + (f" (+{len(outside) - 6})" if len(outside) > 6 else "")
print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": (
        f"⛔ Commit có file NGOÀI PLAN ({rel}): {lst}. "
        "Không cần → `git restore --staged <file>` (và bỏ thay đổi đó). "
        "Thật sự cần → ghi vào progress.md và commit lại trong MỘT lệnh: "
        f"`node .claude/scripts/plan-add.mjs --why \"<lý do>\" {' '.join(outside)} && <lệnh commit cũ>` "
        "(quyết định thì ghi cả decisions.md). "
        "Chế độ thường: nói rõ file ngoài plan này trong báo cáo cho anh."),
}}))
PY

exit 0
