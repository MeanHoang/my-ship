#!/usr/bin/env bash
# ship-export.sh — copy the project-neutral ship-* kit into a standalone repo (e.g. my-ship).
#
# Why: the kit is developed inside a real project, but other projects install it from the
# standalone repo. Re-running this after any harness edit keeps that repo in sync.
# It copies ONLY the core (never ship-profile.md, the project's local rules, roles/lessons, project
# skills) and strips owner-private citations (memory file names, internal ticket ids).
#
# Usage: bash .claude/scripts/ship-export.sh <dest-repo-dir>

set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"          # .claude of the source project
DEST="${1:?usage: ship-export.sh <dest-repo-dir>}"
[ -d "$DEST/.git" ] || { echo "$DEST is not a git repo"; exit 1; }

SKILLS=(ship ship-new ship-auto ship-bugs ship-fix ship-verify ship-review ship-board ship-manager)
HOOKS=(ship-mode-card ship-auto-continue ship-auto-guard ship-scope-guard ship-state-sync ship-context-restore branch-guard block-git-discard)
SCRIPTS=(ship-auto-run.sh ship-board.sh ship-export.sh branch-drift.mjs merge-survival.mjs plan-add.mjs select-cases.mjs codex-review.mjs ship-manager-status.py)

rm -rf "$DEST/.claude/skills" "$DEST/.claude/workflow" "$DEST/.claude/roles" "$DEST/.claude/hooks" "$DEST/.claude/scripts"
mkdir -p "$DEST/.claude/skills" "$DEST/.claude/hooks" "$DEST/.claude/scripts" "$DEST/.claude/roles"
for s in "${SKILLS[@]}"; do cp -R "$SRC/skills/$s" "$DEST/.claude/skills/"; done
cp -R "$SRC/workflow" "$DEST/.claude/"
# The QA report procedure is project-specific; another repo writes its own in its profile §9.
rm -rf "$DEST/.claude/workflow/tester-report.md" "$DEST/.claude/workflow/tester-report"
cp "$SRC"/roles/*.md "$DEST/.claude/roles/"
for h in "${HOOKS[@]}"; do cp "$SRC/hooks/$h.sh" "$DEST/.claude/hooks/"; done
for f in "${SCRIPTS[@]}"; do cp "$SRC/scripts/$f" "$DEST/.claude/scripts/"; done
chmod +x "$DEST"/.claude/hooks/*.sh "$DEST"/.claude/scripts/*.sh "$DEST"/.claude/scripts/*.py

# Strip owner-private citations; keep the owner's quotes and dates (they show why a rule exists).
python3 - "$DEST/.claude" <<'PY'
import os, re, sys
root = sys.argv[1]
for dp, _, fs in os.walk(root):
    for f in fs:
        p = os.path.join(dp, f)
        if not f.endswith((".md", ".sh", ".html")):
            continue
        s = open(p, encoding="utf-8").read()
        o = s
        s = re.sub(r"memory (`feedback_[a-z_]+`|`project_[a-z_]+`)(, (`feedback_[a-z_]+`|`project_[a-z_]+`))*[,;]? ?", "", s)
        s = re.sub(r"\(memory `feedback_[a-z_]+`\)", "", s)
        s = re.sub(r"#\s*Ratchet trace: \S+\n", "", s)
        s = re.sub(r"\bJOY-\d+:? ?", "", s)
        s = re.sub(r" ?\(source: ?\)", "", s).replace("(source:", "(source:").replace("(source: ", "(source: ")
        s = re.sub(r"\(source: ([^)]*?)[;,] ?\)", r"(source: \1)", s)
        if f == "README.md" and dp.endswith("roles"):
            s = re.sub(r"\n## Lessons.*", "\n", s, flags=re.S)
        s = s.replace("a task worktree", "a task worktree")
        if s != o:
            open(p, "w", encoding="utf-8").write(s)
PY
# Project-private step (optional, never exported): turns project details into generic text and refuses
# to finish while any private term remains. Exit 2 = do not publish.
if [ -f "$SRC/scripts/ship-export-neutralize.py" ]; then python3 "$SRC/scripts/ship-export-neutralize.py" "$DEST"; fi
echo "exported core to $DEST/.claude"
