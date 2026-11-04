#!/usr/bin/env node
// After merging master into a task branch: did every line the task added survive, and is every function the
// task added still called somewhere? Run right after the merge (in progress or committed), before tests.
//
//   node .claude/scripts/merge-survival.mjs [--merge <merge sha>]
//
// No --merge: a merge in progress (MERGE_HEAD, result = working tree), else the latest merge commit on the
// first-parent line (result = HEAD). Prints one JSON line; exit 2 when lines were lost or a function is orphaned.
// Why: 2026-11-04 lesson 6 — after merging master a subagent took master's whole file, the drawer fix vanished
// and only a failing test showed it. the merge procedure of this project Step 4 runs this.

import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const SKIP_FILE = /^(\.claude\/|docs\/)|\/locale\/output\/|\/storage\/translations\/|\.(lock|snap)$|package-lock\.json$|yarn\.lock$/;
const TRIVIAL_LINE = /^[\s{}()[\];,]*$/;
const DEFINED_NAME = /(?:export\s+(?:async\s+)?function\s+|export\s+const\s+|^\s*(?:async\s+)?function\s+)([A-Za-z_$][\w$]*)/;

function main() {
  // Step 1: which merge (paths are repo-relative)
  process.chdir(git(['rev-parse', '--show-toplevel']).trim() || process.cwd());
  const mergeArg = argValue('--merge');
  const inProgress = !mergeArg && Boolean(git(['rev-parse', '-q', '--verify', 'MERGE_HEAD']).trim());
  const merge = mergeArg || (inProgress ? null : git(['rev-list', '--first-parent', '--merges', '-n', '1', 'HEAD']).trim());
  if (!inProgress && !merge) return report({ok: true, note: 'no merge found'}, 0);
  const ours = inProgress ? 'HEAD' : `${merge}^1`;
  const theirs = inProgress ? 'MERGE_HEAD' : `${merge}^2`;
  const base = git(['merge-base', ours, theirs]).trim();
  const readResult = file => (inProgress ? readDisk(file) : git(['show', `${merge}:${file}`]));

  // Step 2: lines the task had added before the merge, and whether the result still has them
  const files = git(['diff', '--name-only', '--diff-filter=AM', base, ours]).split('\n').filter(file => file && !SKIP_FILE.test(file));
  const lost = [];
  const definedNames = new Set();
  for (const file of files) {
    const added = addedLines(base, ours, file);
    added.forEach(line => (line.match(DEFINED_NAME) || [])[1] && definedNames.add(line.match(DEFINED_NAME)[1]));
    const resultLines = new Set(readResult(file).split('\n').map(line => line.trim()));
    const missing = added.filter(line => !resultLines.has(line));
    if (missing.length) lost.push({file, added: added.length, lost: missing.length, sample: missing.slice(0, 3)});
  }

  // Step 3: functions the task added that nothing references any more
  const orphans = [...definedNames].filter(name => referenceCount(name, inProgress ? null : merge) <= 1);

  return report({ok: true, merge: merge || 'in-progress', base: base.slice(0, 10), taskFiles: files.length, lost, orphans}, lost.length || orphans.length ? 2 : 0);
}

function addedLines(base, ours, file) {
  return git(['diff', '-U0', base, ours, '--', file]).split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.slice(1).trim())
    .filter(line => !TRIVIAL_LINE.test(line));
}

function referenceCount(name, merge) {
  const out = git(merge ? ['grep', '-c', '-w', name, merge, '--', 'packages', 'extensions'] : ['grep', '-c', '-w', name, '--', 'packages', 'extensions']);
  return out.split('\n').filter(Boolean).reduce((sum, line) => sum + Number(line.split(':').pop() || 0), 0);
}

function report(payload, exitCode) {
  console.log(JSON.stringify(payload));
  if (exitCode) {
    console.log('WARN: task lines lost or functions orphaned by the merge. For each file: restore the task\'s hunk next to master\'s change (per-hunk union), or write in decisions.md why master\'s version replaces it; then re-run the tests of each fix.');
  }
  process.exitCode = exitCode;
  return null;
}

function readDisk(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function git(gitArgs) {
  try {
    return execFileSync('git', gitArgs, {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  } catch (error) {
    return String(error.stdout || '');
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : '';
}

main();
