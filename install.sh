#!/usr/bin/env bash
# install.sh — install (or update) the ship-* kit into a project.
#
#   bash install.sh /path/to/your/project
#
# Copies .claude/{skills/ship*,workflow,roles,hooks/ship-*,hooks/branch-guard.sh,scripts/ship-*}
# into the project, wires the hooks into .claude/settings.local.json (merged, never
# overwritten), hides the kit + task state from git via .git/info/exclude, and creates
# .claude/ship-profile.md from the example if the project has none.
# Re-running = update. Your ship-profile.md is never touched once it exists.

set -euo pipefail
KIT="$(cd "$(dirname "$0")" && pwd)"
PRJ="$(cd "${1:?usage: install.sh <project-dir>}" && pwd)"
[ -d "$PRJ/.git" ] || [ -f "$PRJ/.git" ] || { echo "✗ $PRJ is not a git repo"; exit 1; }
command -v python3 >/dev/null || { echo "✗ python3 is required"; exit 1; }
command -v jq >/dev/null || echo "⚠ jq not found — branch-guard.sh needs it (brew install jq / apt install jq)"

mkdir -p "$PRJ/.claude/skills" "$PRJ/.claude/hooks" "$PRJ/.claude/scripts"
for s in "$KIT"/.claude/skills/ship*; do rm -rf "$PRJ/.claude/skills/$(basename "$s")"; cp -R "$s" "$PRJ/.claude/skills/"; done
rm -rf "$PRJ/.claude/workflow"; cp -R "$KIT/.claude/workflow" "$PRJ/.claude/"
mkdir -p "$PRJ/.claude/roles"; cp "$KIT"/.claude/roles/*.md "$PRJ/.claude/roles/"
cp "$KIT"/.claude/hooks/*.sh "$PRJ/.claude/hooks/"
cp "$KIT"/.claude/scripts/*.sh "$PRJ/.claude/scripts/"
chmod +x "$PRJ"/.claude/hooks/*.sh "$PRJ"/.claude/scripts/*.sh
echo "✓ kit copied"

if [ ! -f "$PRJ/.claude/ship-profile.md" ]; then
  cp "$KIT/ship-profile.example.md" "$PRJ/.claude/ship-profile.md"
  echo "✓ created .claude/ship-profile.md — FILL IT IN before the first /ship"
else
  echo "✓ kept your existing .claude/ship-profile.md"
fi

python3 - "$PRJ/.claude/settings.local.json" <<'PY'
import json, os, sys
p = sys.argv[1]
d = json.load(open(p)) if os.path.isfile(p) else {}
hooks = d.setdefault("hooks", {})
def cmd(name, timeout=10):
    return {"type": "command", "command": f'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/{name}.sh"', "timeout": timeout}
wanted = [
    ("PreToolUse", "Write|Edit", ["ship-auto-guard"]),
    ("PreToolUse", "Bash", ["branch-guard", "ship-auto-guard", "ship-scope-guard"]),
    ("Stop", None, ["ship-state-sync", "ship-auto-continue"]),
    ("PreCompact", None, ["ship-state-sync"]),
    ("SessionStart", "startup|resume|compact", ["ship-context-restore"]),
    ("UserPromptSubmit", None, ["ship-mode-card"]),
]
added = 0
for event, matcher, names in wanted:
    groups = hooks.setdefault(event, [])
    group = next((g for g in groups if g.get("matcher") == matcher), None)
    if group is None:
        group = {"hooks": []}
        if matcher:
            group["matcher"] = matcher
        groups.append(group)
    have = {h.get("command") for h in group["hooks"]}
    for n in names:
        c = cmd(n)
        if c["command"] not in have:
            group["hooks"].append(c); added += 1
json.dump(d, open(p, "w"), indent=2); open(p, "a").write("\n")
print(f"✓ settings.local.json: {added} hook(s) wired")
PY

GITDIR="$(git -C "$PRJ" rev-parse --git-common-dir)"; case "$GITDIR" in /*) ;; *) GITDIR="$PRJ/$GITDIR";; esac
EX="$GITDIR/info/exclude"; mkdir -p "$(dirname "$EX")"; touch "$EX"
for e in .claude/ship/ .claude/ship-profile.md .claude/settings.local.json .claude/workflow/ .claude/roles/ \
         .claude/skills/ship .claude/skills/ship-new .claude/skills/ship-auto .claude/skills/ship-bugs .claude/skills/ship-fix \
         .claude/skills/ship-verify .claude/skills/ship-review .claude/skills/ship-board \
         .claude/hooks/ship-mode-card.sh .claude/hooks/ship-auto-continue.sh .claude/hooks/ship-auto-guard.sh \
         .claude/hooks/ship-scope-guard.sh .claude/hooks/ship-state-sync.sh .claude/hooks/ship-context-restore.sh \
         .claude/hooks/branch-guard.sh .claude/scripts/ship-auto-run.sh .claude/scripts/ship-board.sh .claude/scripts/ship-export.sh; do
  grep -qxF "$e" "$EX" || echo "$e" >> "$EX"
done
echo "✓ kit + task state hidden from git (.git/info/exclude). Want to commit it for your team instead? Remove those lines."
echo
echo "Next: fill .claude/ship-profile.md, restart Claude Code, then type /ship <task>."
