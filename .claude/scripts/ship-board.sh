#!/usr/bin/env bash
# Bảng mọi feature đang chạy — feature nào ĐANG CHỜ user xếp lên đầu.
#
# Vì sao cần: mỗi task một progress.md, muốn biết cái nào chờ mình phải mở từng file.
# Khi chạy nhiều feature song song thì nút thắt là user, nên thứ cần thấy trước tiên là
# "cái nào đang chờ tôi", không phải "cái nào đang chạy".
#
# Đọc khối `<!-- state ... -->` ở đầu progress.md (skills/ship/templates/progress.md).
# Task cũ chưa có khối đó vẫn hiện, cột state để "—".

#
# Cờ: --unstick  bấm Enter/Escape hộ những tab đang kẹt (mặc định chỉ BÁO, không đụng).

set -uo pipefail
UNSTICK=0; [ "${1:-}" = "--unstick" ] && UNSTICK=1
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "không ở trong git repo" >&2; exit 1; }


python3 - "$ROOT" <<'PY'
import glob, os, re, subprocess, sys

root = sys.argv[1]

# Worktree thật (git worktree) để tìm transcript + lệnh resume đúng chỗ.
wts, cur = [], None
for line in subprocess.run(["git", "-C", root, "worktree", "list", "--porcelain"],
                           capture_output=True, text=True).stdout.splitlines():
    if line.startswith("worktree "):
        cur = {"path": line[9:], "branch": ""}; wts.append(cur)
    elif line.startswith("branch ") and cur:
        cur["branch"] = line[7:].replace("refs/heads/", "")
def _git(*a):
    return subprocess.run(["git", "-C", root, *a], capture_output=True, text=True).stdout.strip()
# Base branch: $SHIP_BASE_BRANCH -> origin/HEAD -> origin/main -> origin/master
BASE = os.environ.get("SHIP_BASE_BRANCH") or _git("symbolic-ref", "--short", "refs/remotes/origin/HEAD") \
    or next((r for r in ("origin/main", "origin/master") if _git("rev-parse", "--verify", "--quiet", r)), "origin/master")
subprocess.run(["git", "-C", root, "fetch", "-q", "origin", BASE.split("/", 1)[-1]], capture_output=True)

def merged(br):
    """Branch của task đã nằm trong nhánh gốc (BASE) → task xong, không còn chờ ai."""
    if br in ("—", ""):
        return False
    for ref in (br, "origin/" + br):
        if subprocess.run(["git", "-C", root, "rev-parse", "-q", "--verify", ref],
                          capture_output=True).returncode == 0:
            return subprocess.run(["git", "-C", root, "merge-base", "--is-ancestor", ref, BASE],
                                  capture_output=True).returncode == 0
    return False
rows = []

for p in sorted(glob.glob(os.path.join(root, ".claude/ship/*/progress.md"))):
    slug = os.path.basename(os.path.dirname(p))
    txt = open(p, encoding="utf-8", errors="replace").read()
    head = txt[:1200]

    def field(name, default="—"):
        m = re.search(rf"^\s*{name}:\s*(.+?)\s*$", head, re.M)
        return m.group(1) if m else default

    has_state = "<!-- state" in head
    branch = field("branch")
    if branch == "—":                       # task cũ: lấy từ dòng "- Branch: `...`"
        m = re.search(r"Branch:\s*`([^`]+)`", txt)
        branch = m.group(1) if m else "—"

    gate = field("gate", "none") if has_state else "—"
    awaiting = field("awaiting") if has_state else "—"
    step = field("step") if has_state else "—"
    phase = field("phase") if has_state else "—"
    rnd = field("round", "0") if has_state else "—"
    kind = field("kind", "feature") if has_state else "—"
    verdict = field("verdict", "-") if has_state else "-"

    # NOW marker: dòng người đọc, cắt ngắn
    m = re.search(r"^>\s*\*\*NOW:?\*\*:?\s*(.+)$", txt, re.M)
    now = (m.group(1).strip() if m else "")[:70]

    done = txt.count("✅")
    todo = txt.count("⬜")

    # Tuổi + kích thước session con. Session sống quá lâu = context phình = chậm và đắt,
    # và nó vẫn chạy theo kickoff LÚC KHỞI ĐỘNG nên không thấy luật thêm sau đó.
    age_h, sess_mb, resume_id = None, 0, ""
    wt = next((w for w in wts if branch != "—" and w["branch"] == branch), None) \
        or next((w for w in wts if os.path.basename(w["path"]) == slug), None)
    wt_path = wt["path"] if wt else ""
    pdir = os.path.expanduser("~/.claude/projects/" + re.sub(r"[^A-Za-z0-9]", "-", wt_path)) if wt_path else ""
    if os.path.isdir(pdir):
        import glob as _g
        # id để `claude --resume` — transcript được ghi gần đây nhất.
        # Tắt máy là mất tiến trình; không có id này thì sáng hôm sau phải đi mò trong ~/.claude/projects.
        js = _g.glob(pdir + "/*.jsonl")
        if js:
            resume_id = os.path.basename(max(js, key=os.path.getmtime))[:-6]
        for jf in js:
            mb = os.path.getsize(jf) / 1024 / 1024
            if mb < 0.5:            # bỏ qua session con lặt vặt của skill
                continue
            sess_mb = max(sess_mb, mb)
            try:
                import json as _j, datetime as _d
                with open(jf, errors="replace") as fh:
                    for i, line in enumerate(fh):
                        if i > 400:            # timestamp không nằm ngay dòng đầu
                            break
                        if '"timestamp"' not in line:
                            continue
                        t = _j.loads(line).get("timestamp")
                        if not t:
                            continue
                        st = _d.datetime.fromisoformat(t.replace("Z", "+00:00"))
                        h = (_d.datetime.now(st.tzinfo) - st).total_seconds() / 3600
                        age_h = h if age_h is None else max(age_h, h)
                        break
            except Exception:
                pass

    rows.append(dict(slug=slug, branch=branch, gate=gate, awaiting=awaiting, kind=kind,
                     verdict=verdict, step=step, phase=phase, rnd=rnd, now=now,
                     done=done, todo=todo, age_h=age_h, sess_mb=sess_mb,
                     resume_id=resume_id, wt_path=wt_path, merged=merged(branch)))

# ưu tiên: đang chờ user > đang chạy > xong
def rank(r):
    if r["merged"]: return 3                      # branch đã vào master → xong
    if r["gate"] not in ("none", "—"): return 0
    if r["awaiting"] == "user": return 0          # bug đã có verdict, chờ user phán
    if r["awaiting"] not in ("none", "—"): return 1
    return 2

rows.sort(key=lambda r: (rank(r), r["slug"]))

waiting = [r for r in rows if rank(r) == 0]
print()
if waiting:
    def why(r):
        if r["gate"] not in ("none", "—"): return r["gate"]
        if r["verdict"] not in ("-", "—"): return r["verdict"]
        return "chờ anh"
    print(f"⚠️  {len(waiting)} đầu việc ĐANG CHỜ ANH: " + ", ".join(f"{r['slug']} ({why(r)})" for r in waiting))
else:
    print("✅ Không có đầu việc nào đang chờ anh.")
print()

w = max([len(r["slug"]) for r in rows] + [7])
print(f"{'':2}{'ĐẦU VIỆC'.ljust(w)}  {'LOẠI':8} {'GATE':9} {'CHỜ':9} {'KẾT LUẬN':13} {'BƯỚC':6} {'SESSION':11} NOW")
print("─" * (w + 62))
for r in rows:
    mark = {0: "🚦", 1: "· ", 3: "✓ "}.get(rank(r), "  ")
    step = r["step"] if r["phase"] in ("-", "—") else f"{r['step']}·{r['phase']}"
    if r["age_h"] is None:
        sess = "—"
    else:
        flag = "⚠" if (r["age_h"] > 12 or r["sess_mb"] > 5) else " "
        sess = f"{flag}{r['age_h']:.0f}h/{r['sess_mb']:.0f}MB"
    print(f"{mark}{r['slug'].ljust(w)}  {r['kind']:8} {r['gate']:9} {r['awaiting']:9} "
          f"{r['verdict']:13} {step:6} {sess:11} {r['now'][:52]}")

# Hồi sinh sau khi tắt máy: chỉ `claude --resume <id>` giữ được context.
res = [r for r in rows if r["resume_id"] and rank(r) < 2]
if res:
    print("\n── hồi sinh session (sau khi tắt máy) ──")
    for r in res:
        print(f"  cd {r['wt_path']} && claude --dangerously-skip-permissions --resume {r['resume_id']}")
done_n = sum(1 for r in rows if r["merged"])
if done_n:
    print(f"\n({done_n} task ✓ đã merge vào nhánh gốc — có thể dọn tmp/ của chúng)")

no_state = [r for r in rows if r["gate"] == "—"]
if no_state:
    print(f"\n({len(no_state)}/{len(rows)} task chưa có khối `state` — chỉ hiện NOW. Thêm header từ "
          f"feature-team/templates/progress-header.md để lên bảng đầy đủ.)")
PY

echo
echo "── worktree đang mở ──"
git -C "$ROOT" worktree list
