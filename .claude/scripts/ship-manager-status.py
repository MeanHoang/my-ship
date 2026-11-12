#!/usr/bin/env python3
"""One-screen status of every workspace (Orca worktree) for the ship-manager session (role `.claude/roles/ship-manager.md`).

Reads only: `orca worktree ps --json`, each worktree's git state and its `.claude/ship/*/progress.md` NOW line.
Changes nothing. Usage: python3 .claude/scripts/ship-manager-status.py [--json] [--all]
  --all  also list archived / closed workspaces

Flags per workspace (most urgent first):
  NEEDS_OWNER     agent finished its turn and the last message asks the owner something
  SILENT          agent is working but printed nothing for > SILENT_MINUTES (the kit asks every running session for a status every
                  15 min, profile §20, so a longer silence breaks that rule; it is not proof of a hang)
  DIRTY/UNPUSHED  uncommitted files / commits not on the remote
  MERGED_CLEAN    branch is already in origin/<base>, nothing uncommitted or unpushed → candidate to close (owner decides)
  NO_SESSION      no live terminal in the workspace
  DONE_IDLE       agent finished, no question → finished or parked
"""
import json
import os
import re
import subprocess
import sys
import time
from glob import glob

SILENT_MINUTES = 15  # profile §20: every running session reports at least every 15 minutes
ASK = re.compile(r'\?\s*$|Anh (muốn|chọn|xác nhận|cho phép|duyệt|quyết)|chờ anh|anh (OK|đồng ý)|Waiting on (user|owner)', re.I | re.M)
ORDER = ['NEEDS_OWNER', 'SILENT', 'UNPUSHED', 'DIRTY', 'MERGED_CLEAN', 'NO_SESSION', 'DONE_IDLE', 'WORKING']


def run():
    show_all = '--all' in sys.argv
    # Step 1: every workspace (Orca worktree)
    worktrees = orca_worktrees()
    # Step 2: one row per workspace with its flags
    rows = [build_row(w) for w in worktrees if show_all or not w.get('isArchived')]
    rows.sort(key=lambda r: min([ORDER.index(f) for f in r['flags']] or [len(ORDER)]))
    # Step 3: print
    if '--json' in sys.argv:
        print(json.dumps(rows, ensure_ascii=False, indent=1))
        return
    print(f"{time.strftime('%Y-%m-%d %H:%M')} · {len(rows)} workspace\n")
    for row in rows:
        print(f"[{', '.join(row['flags']) or '-'}] {row['repo']}/{row['name']}  ({row['branch']})")
        print(f"   agent: {row['agent_state']} {row['agent_minutes']} phút · output cuối {row['output_minutes']} phút trước"
              f" · tool {row['tool'] or '-'} · git: {row['dirty']} file chưa commit, {row['unpushed']} commit chưa push")
        if row['now']:
            print(f"   NOW: {row['now'][:200]}")
        if row['last_message']:
            print(f"   tin cuối: {row['last_message'][:220]}")
        print()


def build_row(worktree):
    path = worktree['path']
    agents = worktree.get('agents') or []
    agent = agents[0] if agents else {}
    now_ms = time.time() * 1000
    state = (agent.get('mainAgent') or {}).get('state') or agent.get('state') or 'none'
    last_message = tail_text(agent.get('lastAssistantMessage') or '')
    git = git_state(path)
    row = {
        'name': worktree.get('displayName'), 'path': path, 'branch': (worktree.get('branch') or '').replace('refs/heads/', ''),
        'comment': worktree.get('comment') or '', 'agent_state': state, 'tool': agent.get('toolName'),
        'agent_minutes': minutes(now_ms, agent.get('stateStartedAt')), 'output_minutes': minutes(now_ms, worktree.get('lastOutputAt')),
        'live_terminals': worktree.get('liveTerminalCount') or 0, 'last_message': last_message,
        'repo': worktree.get('repo'), **git,
    }
    row['now'] = now_line(path, row['branch'], row['name'] or '') if row['branch'] not in ('master', 'main') else ''
    row['flags'] = flags(row, agent.get('lastAssistantMessage') or '')
    return row


def flags(row, full_message):
    result = []
    if row['agent_state'] == 'done' and ASK.search(full_message[-600:]):
        result.append('NEEDS_OWNER')
    if row['agent_state'] == 'working' and row['output_minutes'] is not None and row['output_minutes'] > SILENT_MINUTES:
        result.append('SILENT')
    if row['unpushed']:
        result.append('UNPUSHED')
    if row['dirty']:
        result.append('DIRTY')
    if row['merged'] and not row['dirty'] and not row['unpushed']:
        result.append('MERGED_CLEAN')
    if not row['live_terminals']:
        result.append('NO_SESSION')
    elif row['agent_state'] == 'done' and 'NEEDS_OWNER' not in result:
        result.append('DONE_IDLE')
    elif row['agent_state'] == 'working' and 'SILENT' not in result:
        result.append('WORKING')
    return result


def git_state(path):
    if not os.path.isdir(path):
        return {'dirty': 0, 'unpushed': 0, 'merged': False}
    # Read only: the manager reports uncommitted files, it never cleans them (some are the owner's local run files).
    dirty = [line for line in git(path, 'status', '--porcelain').splitlines() if line and not line.startswith('??')]
    unpushed = git(path, 'rev-list', '--count', '@{u}..HEAD').strip()
    branch = git(path, 'rev-parse', '--abbrev-ref', 'HEAD').strip()
    base = git(path, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').strip() or 'origin/main'
    merged = branch not in (base.split('/', 1)[-1], 'HEAD', '') and \
        subprocess.run(['git', '-C', path, 'merge-base', '--is-ancestor', 'HEAD', base], capture_output=True).returncode == 0
    return {'dirty': len(dirty), 'unpushed': int(unpushed) if unpushed.isdigit() else 0, 'merged': merged}


def now_line(path, branch, name):
    """`.claude/ship` is one folder shared by every worktree (symlink to the main checkout), so pick the task's own
    progress.md: its state block `branch:` equals this branch, else its slug is part of the branch or workspace name."""
    candidates = glob(os.path.join(path, '.claude/ship/*/progress.md'))
    by_branch = [f for f in candidates if re.search(r'^branch:\s*' + re.escape(branch) + r'\s*$', read(f), re.M)]
    by_slug = [f for f in candidates if os.path.basename(os.path.dirname(f)) in (branch + ' ' + name)]
    for progress in (by_branch or by_slug)[:1]:
        for line in read(progress).splitlines():
            if line.startswith('> **NOW:**'):
                return line[len('> **NOW:**'):].strip()
    return ''


def read(path):
    try:
        return open(path, errors='ignore').read()
    except OSError:
        return ''


def orca_worktrees():
    result = subprocess.run(['orca', 'worktree', 'ps', '--json'], capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        sys.exit(f'orca worktree ps failed: {result.stderr.strip()[:300]} (is Orca running? `orca status`)')
    return json.loads(result.stdout)['result']['worktrees']


def git(path, *args):
    return subprocess.run(['git', '-C', path, *args], capture_output=True, text=True).stdout


def tail_text(text):
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    return ' / '.join(lines[-2:]) if lines else ''


def minutes(now_ms, then_ms):
    return round((now_ms - then_ms) / 60000) if then_ms else None


if __name__ == '__main__':
    run()
