#!/usr/bin/env bash
# PreToolUse(Write|Edit|Bash) — hai hàng rào chỉ bật khi `/ship-auto` đang chạy (auto: on).
#
# 1. KHÔNG SỬA TEST CHO QUA. Chạy đêm không ai nhìn: test fail lúc 2h sáng, AI đổi
#    `toBe(50)` thành `toBe(45)` là phase "xanh", report báo xong, bug vẫn còn.
#    Luật trong roles/implementer.md là luật mềm → hạ xuống hook (note 5, 29/09).
#    Chỉ bảo vệ thứ ĐÃ CÓ TRÊN nhánh gốc (base_ref) — test do chính branch này viết thì AI sửa tự do.
#      - file test (__tests__/, .test., .spec., tests/, test/, e2e/): chặn xoá/sửa dòng assert có trên master
#      - fixture tests/fixtures/*: chặn sửa/xoá file có trên master (đó là output mong đợi)
#      - file bất kỳ: chặn xoá/sửa dòng assert!/assert_eq! (test Rust viết chung file code)
#      - Bash: chặn rm / git rm / mv / sed -i / perl -i / ghi đè `>` lên file test có trên master
#
# 2. KHÔNG XOÁ VIỆC KHỎI CHECKLIST. AI "dọn" progress.md, xoá 2 ô chưa làm → hook Stop
#    tưởng hết việc → cho dừng → report ghi "xong". Số ô `- [` chỉ được tăng, không giảm.
#    Việc bị park giữ nguyên ô, chỉ thêm ⏸ vào đầu chữ.
#
# Ngoài auto → im lặng. Luôn exit 0; chặn bằng permissionDecision deny.

set -uo pipefail
INPUT=$(cat 2>/dev/null || true)

python3 - "$INPUT" <<'PY' 2>/dev/null || true
import json, os, re, shlex, subprocess, sys

try:
    hook = json.loads(sys.argv[1] or "{}")
except Exception:
    sys.exit(0)

cwd = hook.get("cwd") or os.getcwd()
tool = hook.get("tool_name") or ""
ti = hook.get("tool_input") or {}


def git(*a):
    try:
        return subprocess.run(("git", "-C", cwd) + a, capture_output=True,
                              text=True, timeout=5).stdout
    except Exception:
        return ""


def base_ref():
    """Base branch: $SHIP_BASE_BRANCH -> origin/HEAD -> origin/main -> origin/master."""
    env = os.environ.get("SHIP_BASE_BRANCH")
    if env:
        return env
    head = git("symbolic-ref", "--short", "refs/remotes/origin/HEAD").strip()
    if head:
        return head
    for ref in ("origin/main", "origin/master"):
        if git("rev-parse", "--verify", "--quiet", ref).strip():
            return ref
    return "origin/master"


root = git("rev-parse", "--show-toplevel").strip()
branch = git("rev-parse", "--abbrev-ref", "HEAD").strip()
ship = os.path.join(root, ".claude", "ship") if root else ""
if not branch or not os.path.isdir(ship):
    sys.exit(0)

progress = None
for s in sorted(os.listdir(ship)):
    p = os.path.join(ship, s, "progress.md")
    if os.path.isfile(p):
        head = open(p, encoding="utf-8", errors="replace").read(1500)
        m = re.search(r"^\s*branch:\s*(.+?)\s*$", head, re.M)
        if m and m.group(1).strip() == branch:
            progress = p
            break
if not progress:
    sys.exit(0)
m = re.search(r"^\s*auto:\s*(\S+)", open(progress, encoding="utf-8", errors="replace").read(1500), re.M)
if not m or m.group(1).lower() != "on":
    sys.exit(0)
BASE = base_ref()


def deny(msg):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": msg,
    }}))
    sys.exit(0)


TEST_PATH = re.compile(r"(__tests__/|\.test\.|\.spec\.|(^|/)(tests?|e2e)/)")
FIXTURE = re.compile(r"(^|/)tests?/fixtures/")
ASSERT_JS = re.compile(r"\b(expect|assert)\s*[\.(]|\.should\b|\bt\.(is|deepEqual|truthy|falsy)\(")
ASSERT_RS = re.compile(r"\bassert(_eq|_ne)?!\s*\(")
BOX = re.compile(r"^\s*- \[[ xX]\]", re.M)


def rel(path):
    ap = path if os.path.isabs(path) else os.path.join(cwd, path)
    try:
        return os.path.relpath(os.path.realpath(ap), os.path.realpath(root))
    except Exception:
        return path


def on_master(r):
    return subprocess.run(("git", "-C", root, "cat-file", "-e", f"{BASE}:{r}"),
                          capture_output=True).returncode == 0


def master_lines(r):
    return set(l.strip() for l in git("show", f"{BASE}:{r}").splitlines() if l.strip())


def removed_protected(r, old, new):
    """Lines present in `old`, gone from `new`, that are assertions existing on master."""
    is_test = bool(TEST_PATH.search(r))
    new_set = set(l.strip() for l in new.splitlines())
    master = None
    hits = []
    for l in old.splitlines():
        s = l.strip()
        if not s or s in new_set:
            continue
        if not (ASSERT_RS.search(s) or (is_test and ASSERT_JS.search(s))):
            continue
        if master is None:
            master = master_lines(r)
        if s in master:
            hits.append(s)
    return hits


MSG_TEST = ("⛔ AUTO: không được sửa/xoá assert có sẵn trên master ({f}: `{l}`). "
            "Test fail thì sửa CODE, không sửa test. Nếu test cũ sai thật → PARK mục này "
            "(ghi vào 'Waiting on user' kèm lý do), làm việc khác.")
MSG_FIX = ("⛔ AUTO: {f} là fixture (output mong đợi) có sẵn trên master — không sửa/xoá. "
           "Thêm fixture MỚI thì được. Fixture cũ sai thật → PARK.")

# --- Write / Edit ---
if tool in ("Write", "Edit"):
    path = ti.get("file_path") or ""
    r = rel(path)
    ap = os.path.join(root, r)

    # 2. checklist count
    if os.path.realpath(ap) == os.path.realpath(progress):
        cur = open(progress, encoding="utf-8", errors="replace").read()
        if tool == "Write":
            before, after = len(BOX.findall(cur)), len(BOX.findall(ti.get("content") or ""))
        else:
            old, new = ti.get("old_string") or "", ti.get("new_string") or ""
            n = cur.count(old) if ti.get("replace_all") else 1
            before, after = len(BOX.findall(old)) * n, len(BOX.findall(new)) * n
        if after < before:
            deny(f"⛔ AUTO: sửa này làm checklist mất {before - after} ô. Số ô chỉ được tăng. "
                 "Việc không làm được → giữ ô, thêm ⏸ vào đầu chữ và ghi lý do ở 'Waiting on user'.")
        sys.exit(0)

    if not on_master(r):
        sys.exit(0)
    if FIXTURE.search(r):
        deny(MSG_FIX.format(f=r))
    if tool == "Write":
        old = open(ap, encoding="utf-8", errors="replace").read() if os.path.isfile(ap) else ""
        new = ti.get("content") or ""
    else:
        old, new = ti.get("old_string") or "", ti.get("new_string") or ""
    hits = removed_protected(r, old, new)
    if hits:
        deny(MSG_TEST.format(f=r, l=hits[0][:80]))
    sys.exit(0)

# --- Bash ---
if tool == "Bash":
    cmd = ti.get("command") or ""
    try:
        words = shlex.split(cmd, posix=True)
    except Exception:
        words = cmd.split()
    # rm / mv / sed -i / perl -i → every path in the command is a target.
    # `>` / `>>` / tee → only the file right after it is a target (running a test with
    # `> log.txt` is normal verification and must pass).
    if re.search(r"(^|[;&|(]\s*)(rm|git\s+rm|mv|git\s+mv)\s|\b(sed|perl)\s+(-\S*\s+)*-i", cmd):
        targets = words
    else:
        targets = re.findall(r">>?\s*([^\s;&|]+)", cmd) + re.findall(r"\btee\s+(?:-a\s+)?([^\s;&|]+)", cmd)
    for w in targets:
        if "/" not in w and "." not in w:
            continue
        r = rel(w.strip("'\""))
        if (TEST_PATH.search(r) or FIXTURE.search(r)) and on_master(r):
            deny(f"⛔ AUTO: lệnh này xoá/sửa file test có sẵn trên master ({r}) bằng Bash. "
                 "Test fail thì sửa CODE. Test cũ sai thật → PARK.")
    sys.exit(0)
PY

exit 0
