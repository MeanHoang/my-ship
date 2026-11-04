#!/usr/bin/env node
// Record files outside the plan in this task's progress.md ("## Việc phát sinh ngoài plan"), so the
// ship-scope-guard hook lets the commit through — in the SAME command as the commit:
//
//   node .claude/scripts/plan-add.mjs --why "<reason>" <file> [file...] && git commit …
//
// Why: owner 2026-11-04 (a real task lesson 7): every out-of-plan file cost a separate progress.md edit
// command and a second commit try. The guard still blocks silent over-editing; this only makes the
// declared exception one step.

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const HEADING = '## Việc phát sinh ngoài plan';

function main() {
  // Step 1: arguments
  const {why, files} = parseArgs(process.argv.slice(2));
  if (!why || !files.length) return fail('usage: plan-add.mjs --why "<reason>" <file> [file...]');

  // Step 2: find this branch's progress.md (same match as ship-scope-guard.sh: `branch:` line)
  const root = git(['rev-parse', '--show-toplevel']);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const progress = findProgress(path.join(root, '.claude', 'ship'), branch);
  if (!progress) return fail(`no .claude/ship/*/progress.md with branch: ${branch}`);

  // Step 3: append one line per file under the heading (created at the end when missing)
  const today = new Date().toISOString().slice(0, 10);
  const lines = files.map(file => `- \`${path.relative(root, path.resolve(file))}\` — ${why} (${today})`);
  const text = fs.readFileSync(progress, 'utf8');
  fs.writeFileSync(progress, insertUnderHeading(text, lines));
  console.log(`plan-add: ${lines.length} line(s) → ${path.relative(root, progress)}`);
  return null;
}

function insertUnderHeading(text, lines) {
  const at = text.indexOf(HEADING);
  if (at === -1) return `${text.replace(/\n*$/, '\n\n')}${HEADING}\n${lines.join('\n')}\n`;
  const next = text.indexOf('\n## ', at + HEADING.length);
  const end = next === -1 ? text.length : next;
  const section = text.slice(0, end).replace(/\n*$/, '\n');
  return `${section}${lines.join('\n')}\n${next === -1 ? '' : '\n'}${text.slice(end).replace(/^\n+/, '')}`;
}

function findProgress(shipDir, branch) {
  if (!fs.existsSync(shipDir)) return null;
  for (const slug of fs.readdirSync(shipDir).sort()) {
    const file = path.join(shipDir, slug, 'progress.md');
    if (!fs.existsSync(file)) continue;
    const match = fs.readFileSync(file, 'utf8').slice(0, 1500).match(/^\s*branch:\s*(.+?)\s*$/m);
    if (match && match[1] === branch) return file;
  }
  return null;
}

function git(gitArgs) {
  return execFileSync('git', gitArgs, {encoding: 'utf8'}).trim();
}

function parseArgs(argv) {
  const args = {why: '', files: []};
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--why') args.why = argv[++index] || '';
    else args.files.push(argv[index]);
  }
  return args;
}

function fail(reason) {
  console.error(`plan-add: ${reason}`);
  process.exitCode = 1;
  return null;
}

main();
