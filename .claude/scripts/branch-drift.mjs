#!/usr/bin/env node
// Warn before coding (and before MERGE-DEPLOY) when the task branch has drifted from master:
// how many master commits it lacks, and which files would CONFLICT if master (or the integration
// branch) were merged now. Conflicts are measured with `git merge-tree`, nothing is written.
//
//   node .claude/scripts/branch-drift.mjs [--against origin/<integration-branch>] [--no-fetch]
//
// Prints one JSON line: {ok, branch, behind:{<ref>:N}, conflicts:{<ref>:[files]}, warn}. Exit 2 when any
// conflict exists (warn=true), else 0.
// Why: owner 2026-11-04 "cảnh báo trc khi code nhánh đang tụt với master quá nhiều" — the a real task
// branch was 436 commits behind master; <integration-branch> hit 41 translation conflicts and fixed the same
// logic twice. No count threshold is invented: the warning is driven by real conflicts; the count is shown.

import {execFileSync} from 'node:child_process';

const BASE = (process.env.SHIP_BASE_REF || 'origin/main');

function main() {
  // Step 1: arguments + fresh refs
  const args = parseArgs(process.argv.slice(2));
  const refs = [BASE, ...args.against];
  if (!args.noFetch) fetchRefs(refs);

  // Step 2: behind count + conflict files per ref
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const behind = {};
  const conflicts = {};
  for (const ref of refs) {
    if (!git(['rev-parse', '-q', '--verify', ref]).trim()) {
      behind[ref] = null;
      conflicts[ref] = [`ref ${ref} not found`];
      continue;
    }
    behind[ref] = Number(git(['rev-list', '--count', `HEAD..${ref}`]).trim() || 0);
    conflicts[ref] = conflictFiles(ref);
  }

  // Step 3: report
  const warn = Object.values(conflicts).some(files => files.length > 0);
  console.log(JSON.stringify({ok: true, branch, behind, conflicts, warn}));
  if (warn) {
    console.log(
      'WARN: merging now conflicts. Merge origin/<base> into this branch first (the merge procedure of this project), ' +
        'before writing code / before MERGE-DEPLOY. Tell the owner in one line: behind N, conflict files.'
    );
    process.exitCode = 2;
  }
  return null;
}

function conflictFiles(ref) {
  // `git merge-tree --write-tree --name-only` (git >= 2.38) lists conflicted paths after the tree id; exit 1 = conflicts.
  try {
    execFileSync('git', ['merge-tree', '--write-tree', '--name-only', '--no-messages', 'HEAD', ref], {encoding: 'utf8'});
    return [];
  } catch (error) {
    const out = String(error.stdout || '');
    if (error.status !== 1) return [`merge-tree failed: ${String(error.stderr || error.message).split('\n')[0]}`];
    return out.split('\n').slice(1).map(line => line.trim()).filter(Boolean);
  }
}

function fetchRefs(refs) {
  const branches = refs.filter(ref => ref.startsWith('origin/')).map(ref => ref.slice('origin/'.length));
  try {
    execFileSync('git', ['fetch', '-q', 'origin', ...branches], {stdio: 'ignore', timeout: 60000});
  } catch {
    console.error('fetch failed; using local refs');
  }
}

function git(gitArgs) {
  try {
    return execFileSync('git', gitArgs, {encoding: 'utf8'});
  } catch {
    return '';
  }
}

function parseArgs(argv) {
  const args = {against: [], noFetch: false};
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--no-fetch') args.noFetch = true;
    if (argv[index] === '--against') args.against.push(argv[++index]);
  }
  return args;
}

main();
