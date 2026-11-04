#!/usr/bin/env node
// Pick which test cases to re-run after new code: cases whose `touches` match a file changed since a sha,
// plus every failed / not-run case, plus changed files no case touches. After a master merge: every case touching
// any of the task's files (master's own files are ignored). Format: .claude/workflow/test-design.md §3.
//
//   node .claude/scripts/select-cases.mjs --cases .claude/ship/<slug>/test-cases.md --since <sha> [--worktree <path>]
//
// Prints one JSON line: {ok, since, changedFiles, selected:[{id, reason}], unmatched:[file], skipped:N}.
// Why: owner 2026-11-03 "mới đẩy 1 code mới thì cx test cái code mới impact" — retest only what the new code touches.

import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

function main() {
  // Step 1: arguments
  const args = parseArgs(process.argv.slice(2));
  if (!args.cases || !args.since) return fail('usage: --cases <test-cases.md> --since <sha> [--worktree <path>]');
  if (!fs.existsSync(args.cases)) return fail(`cases file not found: ${args.cases}`);
  const worktree = args.worktree || process.cwd();

  // Step 2: files committed since the last tested sha (retests run after K6 commits; uncommitted files are
  // mostly the owner's local run files), kept only when they are part of the task's own diff vs master:
  // after merging master, `since..HEAD` also lists every master file (990 on 2026-11-04) and nothing matched.
  // Generated locale output, docs and the harness are not code paths.
  const notCode = file => /^(\.claude\/|docs\/)|\/locale\/output\//.test(file);
  const masterBase = gitLines(worktree, ['merge-base', (process.env.SHIP_BASE_REF || 'origin/main'), 'HEAD'])[0];
  const taskFiles = new Set(masterBase ? gitLines(worktree, ['diff', '--name-only', masterBase, 'HEAD']) : []);
  const mergedMaster = gitLines(worktree, ['rev-list', '--merges', `${args.since}..HEAD`]).length > 0;
  // A master merge can change how any task file behaves: every case touching a task file is re-run.
  const changedFiles = (mergedMaster ? [...taskFiles] : gitLines(worktree, ['diff', '--name-only', `${args.since}..HEAD`]))
    .filter(file => !notCode(file) && (!masterBase || taskFiles.has(file)));

  // Step 3: match cases
  const cases = parseCases(fs.readFileSync(args.cases, 'utf8'));
  const selected = [];
  const matchedFiles = new Set();
  for (const testCase of cases) {
    const hits = changedFiles.filter(file => testCase.touches.some(prefix => file.startsWith(prefix)));
    hits.forEach(file => matchedFiles.add(file));
    if (hits.length) selected.push({id: testCase.id, reason: `touches ${hits.slice(0, 3).join(', ')}`});
    else if (/❌|⬜/.test(testCase.status) || !testCase.status) selected.push({id: testCase.id, reason: `status ${testCase.status || 'empty'}`});
  }
  // Merge but no case matched (touches lists stale paths) → every case, never an empty retest.
  if (mergedMaster && !selected.some(item => item.reason.startsWith('touches'))) {
    cases.filter(testCase => !selected.some(item => item.id === testCase.id)).forEach(testCase => selected.push({id: testCase.id, reason: 'master merged, no touches match: run all'}));
  }
  const unmatched = changedFiles.filter(file => !matchedFiles.has(file));
  console.log(JSON.stringify({ok: true, since: args.since, mergedMaster, changedFiles: changedFiles.length, selected, unmatched, skipped: cases.length - selected.length}));
  return null;
}

function parseCases(text) {
  // Columns are found by header name (`touches`, `status`), so older tables without `start state` still parse.
  const lines = text.split('\n');
  const splitRow = line => line.split('|').slice(1, -1).map(cell => cell.trim());
  const header = lines.find(line => /^\|\s*id\s*\|/i.test(line) && /touches/i.test(line));
  if (!header) return [];
  const names = splitRow(header).map(name => name.toLowerCase());
  const touchesAt = names.indexOf('touches');
  const statusAt = names.indexOf('status');
  return lines.filter(line => /^\|\s*C\d+/.test(line)).map(line => {
    const cells = splitRow(line);
    const touches = (cells[touchesAt] || '').split(',').map(path => path.trim().replace(/^`|`$/g, '')).filter(Boolean);
    return {id: cells[0], touches, status: cells[statusAt] || ''};
  });
}

function gitLines(cwd, gitArgs) {
  try {
    return execFileSync('git', ['-C', cwd, ...gitArgs], {encoding: 'utf8'}).split('\n').map(line => line.trim()).filter(Boolean);
  } catch (error) {
    fail(`git ${gitArgs.join(' ')} failed: ${error.message.split('\n')[0]}`);
    return [];
  }
}

function parseArgs(argv) {
  const args = {cases: '', since: '', worktree: ''};
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index].replace(/^--/, '');
    if (key in args) args[key] = argv[++index];
  }
  return args;
}

function fail(reason) {
  console.log(JSON.stringify({ok: false, reason}));
  process.exitCode = 1;
  return null;
}

main();
