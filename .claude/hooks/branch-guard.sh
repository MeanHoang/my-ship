#!/usr/bin/env bash
# PreToolUse(Bash): guard the two git mistakes that cost real work.
#
# 1. `git stash -u` / `--include-untracked` — swallows untracked files AND an
#    in-progress merge into stash^3, where `git diff` does not show them.
#
# 2. commit/push while checked out on ANOTHER task's branch. The working dir gets
#    switched mid-session, and a fix once landed on the wrong MR.
#    Detection: the ship slug most recently mentioned in this session's transcript
#    declares its branch in .claude/ship/<slug>/progress.md ("Branch: `name`").
#    No slug mentioned → no claim to check against → allow (part 1 still applies).

set -uo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -n "$cmd" ] || exit 0

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  exit 0
}

# `git` chỉ tính là LỆNH khi đứng đầu chuỗi, hoặc ngay sau ; & | ( — không phải sau
# khoảng trắng bất kỳ. Nếu không, một lệnh chỉ *nhắc tới* chuỗi "git commit" trong văn bản
# (viết tài liệu, sửa chính hook này) cũng bị chặn. Đã dính đúng bẫy đó 05/08.
G='(^|[;&|(])[[:space:]]*git[[:space:]]+'

# --- 1. stash that swallows untracked files ---
if printf '%s' "$cmd" | grep -qE "${G}stash" \
   && printf '%s' "$cmd" | grep -qE '(--include-untracked|--all([[:space:]]|$)|(^|[[:space:]])-[a-zA-Z]*[ua][a-zA-Z]*([[:space:]]|$))'; then
  deny "⛔ git stash -u/--include-untracked nuốt cả file untracked lẫn merge đang dở vào stash^3 — git diff KHÔNG thấy chúng. Dùng git stash push -- <file cụ thể>, hoặc commit tạm trên branch."
fi

# --- 2. blanket staging ---
# ship-core already forbids this in prose; a worktree makes it dangerous enough to gate.
# The harness symlinks .claude/skills/* into each worktree, so `git add -A` there would
# commit absolute-path symlinks into the repo.
if printf '%s' "$cmd" | grep -qE "${G}add[[:space:]]+(-A([[:space:]]|$)|--all([[:space:]]|$)|\.([[:space:]]|$))"; then
  deny "⛔ Không dùng git add -A / git add . — stage theo đường dẫn file cụ thể. (Trong worktree, add hàng loạt sẽ nuốt cả symlink harness vào repo.)"
fi

# --- 3. commit/push on another task's branch ---
printf '%s' "$cmd" | grep -qE "${G}(commit|push)([[:space:]]|$)" || exit 0

project=${CLAUDE_PROJECT_DIR:-$(pwd)}

# --- 3a. detached HEAD: a commit there belongs to no branch and is easy to lose ---
# `branch --show-current` is empty when detached, which used to fall through to "allow"
# (hit 28/09: a task worktree sat on b4aef1a). Judge the dir the command runs in.
run_dir=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null); [ -n "$run_dir" ] || run_dir=$project
cd_target=$(printf '%s' "$cmd" | sed -nE 's/^[[:space:]]*cd[[:space:]]+"?([^"&;]+)"?[[:space:]]*(&&|;).*/\1/p' | head -1 | sed -E 's/[[:space:]]+$//')
[ -n "$cd_target" ] && { case "$cd_target" in /*) run_dir=$cd_target ;; *) run_dir="$run_dir/$cd_target" ;; esac; }
if git -C "$run_dir" rev-parse --git-dir >/dev/null 2>&1 && ! git -C "$run_dir" symbolic-ref -q HEAD >/dev/null; then
  rebasing=0
  for d in rebase-merge rebase-apply; do
    [ -d "$(git -C "$run_dir" rev-parse --git-path "$d" 2>/dev/null)" ] && rebasing=1
  done
  [ "$rebasing" = 1 ] || deny "⛔ HEAD đang detached ở $(git -C "$run_dir" rev-parse --short HEAD) — commit ở đây không thuộc nhánh nào, dễ mất. Checkout đúng nhánh của task trước (git switch <branch>), rồi mới commit/push."
fi

current=$(git -C "$project" branch --show-current 2>/dev/null)
[ -n "$current" ] || exit 0

transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)
[ -n "$transcript" ] && [ -f "$transcript" ] || exit 0

slug=$(grep -oE '\.claude/ship/[a-z0-9._-]+' "$transcript" 2>/dev/null | tail -1 | awk -F/ '{print $3}')
[ -n "$slug" ] || exit 0

progress="$project/.claude/ship/$slug/progress.md"
[ -f "$progress" ] || exit 0

# The work usually lives in a worktree while the session stays rooted at the main checkout,
# so $project's branch is the wrong thing to compare — it reports whatever the main checkout
# happens to be on and denies every correct commit made inside the worktree (hit 21/08).
# progress.md records where the work actually is; trust that over cwd.
worktree=$(grep -oE '^worktree: *[^ ]+' "$progress" 2>/dev/null | head -1 | awk '{print $2}')
if [ -n "$worktree" ] && [ "$worktree" != "-" ] && [ -e "$worktree/.git" ]; then
  wt_branch=$(git -C "$worktree" branch --show-current 2>/dev/null)
  [ -n "$wt_branch" ] && current=$wt_branch
fi

declared=$(grep -oE 'Branch: *`[^`]+`' "$progress" 2>/dev/null | head -1 | sed -E 's/.*`(.*)`/\1/')
[ -n "$declared" ] || exit 0
[ "$declared" = "$current" ] && exit 0

deny "⛔ Branch hiện tại là '$current' nhưng task '$slug' khai branch '$declared' trong progress.md. Working dir có thể đã bị session khác chuyển branch. Kiểm tra bằng git branch --show-current rồi checkout đúng branch trước khi commit/push."
