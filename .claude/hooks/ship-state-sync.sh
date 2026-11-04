#!/usr/bin/env bash
# Stop hook — ghi lại DẤU VẾT KỸ THUẬT của session vào khối `<!-- state -->` của progress.md.
#
# Vì sao cần: tắt máy là mất tiến trình, và cmux chỉ khôi phục giao diện chứ không khôi phục
# session. Sáng hôm sau muốn `claude --resume` thì phải đi mò tên file trong
# ~/.claude/projects/. Ghi sẵn session id vào đúng chỗ đang theo dõi đầu việc là hết mò.
# Cũng là lưới an toàn cho compact: sau khi context bị tóm tắt, file vẫn còn.
#
# CỐ Ý KHÔNG ghi nhật ký công việc vào progress.md. File đó là DANH SÁCH ĐẦU VIỆC để
# người và agent đọc mà biết phải làm gì tiếp — nhét log vào là làm phình đúng thứ vừa
# được dọn. Lý do / quyết định thuộc về decisions.md, và đó là việc của model, không
# phải của hook. Hook chỉ đụng metadata trong comment.
#
# Luôn exit 0 — không bao giờ chặn.

set -uo pipefail
INPUT=$(cat 2>/dev/null || true)

python3 - "$INPUT" <<'PY' 2>/dev/null || true
import json, os, re, subprocess, sys, datetime

try:
    hook = json.loads(sys.argv[1] or "{}")
except Exception:
    hook = {}

cwd = hook.get("cwd") or os.getcwd()
sid = hook.get("session_id") or ""


def git(*a):
    try:
        return subprocess.run(("git", "-C", cwd) + a, capture_output=True,
                              text=True, timeout=5).stdout.strip()
    except Exception:
        return ""


root = git("rev-parse", "--show-toplevel")
branch = git("rev-parse", "--abbrev-ref", "HEAD")
head = git("rev-parse", "--short", "HEAD")
if not root or not branch:
    sys.exit(0)

ship = os.path.join(root, ".claude", "ship")
if not os.path.isdir(ship):
    sys.exit(0)

# Đầu việc nào? Khớp theo BRANCH trong khối state — tên thư mục không đáng tin
# (checkout chính không mang tên slug).
target = None
for slug in sorted(os.listdir(ship)):
    p = os.path.join(ship, slug, "progress.md")
    if not os.path.isfile(p):
        continue
    head_txt = open(p, encoding="utf-8", errors="replace").read(1200)
    m = re.search(r"^\s*branch:\s*(.+?)\s*$", head_txt, re.M)
    if m and m.group(1).strip() == branch:
        target = p
        break

# Không khớp branch → tìm hồ sơ ghi lệch tên (vd `branch: feature-x` thay vì `feature/x`,
# tức là ghi tên thư mục worktree). Lệch tên thì hook này và the task board đều bỏ qua
# hồ sơ trong im lặng (sự cố 2026-10-12, in-app-ui-figma-redesign). Đúng 1 hồ sơ gần
# đúng → tự sửa dòng `branch:`; nhiều hơn → chỉ báo.
if not target and branch not in ("master", "main", "HEAD"):
    near_names = {branch.replace("/", "-"), os.path.basename(root)}
    near = []
    for slug in sorted(os.listdir(ship)):
        p = os.path.join(ship, slug, "progress.md")
        if not os.path.isfile(p):
            continue
        head_txt = open(p, encoding="utf-8", errors="replace").read(1200)
        b = re.search(r"^\s*branch:\s*(.+?)\s*$", head_txt, re.M)
        w = re.search(r"^\s*worktree:\s*(.+?)\s*$", head_txt, re.M)
        if (b and b.group(1).strip() in near_names) or (w and w.group(1).strip() == root):
            near.append(p)
    if len(near) == 1:
        fixed_txt = open(near[0], encoding="utf-8", errors="replace").read()
        fixed_txt = re.sub(r"^(\s*branch:).*$", rf"\1 {branch}", fixed_txt, count=1, flags=re.M)
        with open(near[0], "w", encoding="utf-8") as fh:
            fh.write(fixed_txt)
        target = near[0]
        print(json.dumps({"systemMessage": f"ship-state-sync: sửa `branch:` trong {os.path.relpath(near[0], root)} thành `{branch}` (trước đó lệch tên nhánh git)."}))
    elif len(near) > 1:
        print(json.dumps({"systemMessage": f"ship-state-sync: nhánh `{branch}` không khớp progress.md nào; có {len(near)} hồ sơ gần đúng, sửa tay dòng `branch:`: " + ", ".join(os.path.relpath(p, root) for p in near)}))
if not target:
    sys.exit(0)

txt = open(target, encoding="utf-8", errors="replace").read()
m = re.search(r"<!-- state\n(.*?)\n-->", txt, re.S)
if not m:
    sys.exit(0)

block = m.group(1)
now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
fields = {"session": sid, "head": head, "updated": now}

# NOW line kept honest (2026-11-04: a NOW line two days old survived several commits and an outward post).
# The session writes NOW itself (K6); this only catches the case it forgot: HEAD moved since the last sync
# while the NOW text did not change → rewrite NOW as "(auto …) last commit …", keeping the old text short.
import hashlib
now_re = re.compile(r"^>\s*\*\*NOW:?\*\*:?\s*(.*)$", re.M)
nm = now_re.search(txt)
now_text = nm.group(1).strip() if nm else ""
now_hash = hashlib.sha1(now_text.encode()).hexdigest()[:10]
prev_hash = (re.search(r"^\s*now_hash:\s*(\S+)", block, re.M) or [None, ""])[1]
prev_head = (re.search(r"^\s*now_head:\s*(\S+)", block, re.M) or [None, ""])[1]
if now_hash != prev_hash or not prev_head:
    prev_head = head                      # NOW was (re)written by the session: it describes this HEAD
elif head and head != prev_head:
    subject = git("log", "-1", "--format=%s")[:90]
    before = re.sub(r"^\(auto [^)]*\)[^|]*\|\s*trước đó:\s*", "", now_text)[:140]
    auto = f"(auto {now}) commit mới nhất `{head}` {subject} — dòng NOW chưa được cập nhật | trước đó: {before}"
    txt = now_re.sub(lambda _: f"> **NOW:** {auto}", txt, count=1) if nm else txt[:m.end()] + f"\n\n> **NOW:** {auto}" + txt[m.end():]
    m = re.search(r"<!-- state\n(.*?)\n-->", txt, re.S)
    now_hash = hashlib.sha1(auto.encode()).hexdigest()[:10]
    prev_head = head
fields.update({"now_hash": now_hash, "now_head": prev_head})
if not sid:
    fields.pop("session")

for k, v in fields.items():
    if re.search(rf"^\s*{k}:", block, re.M):
        block = re.sub(rf"^\s*{k}:.*$", f"{k}: {v}", block, count=1, flags=re.M)
    else:
        block = block.rstrip() + f"\n{k}: {v}"

new = txt[:m.start()] + "<!-- state\n" + block + "\n-->" + txt[m.end():]
if new != txt:
    with open(target, "w", encoding="utf-8") as fh:
        fh.write(new)
PY

exit 0
