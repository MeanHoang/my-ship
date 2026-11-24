#!/usr/bin/env node
// Every code change on a task branch gets a review before it leaves the task (MERGE-DEPLOY, "done" report, MR).
// Owner 2026-11-16: "khi có thay đổi code merge branch sửa fix cũng đều phải chạy ship review nhé tôi thấy miss không chạy luôn".
// Cause: K5 ran once per flow; later fixes (test-loop, review findings, owner asks) and master merges were committed
// and pushed with no review, and nothing recorded which commit the last review covered.
//
//   node .claude/scripts/review-gate.mjs            # exit 0 = everything since the last review is reviewed and no basic error; 2 = list what is not
// Basic errors (diff-guard layer-import-direction / absolute-path) fail the gate on the whole branch, reviewed or not.
//   node .claude/scripts/review-gate.mjs --mark     # K5 / ship-review end: record HEAD as reviewed in progress.md
//
// The record is one line in .claude/ship/<slug>/progress.md:  reviewed-sha: <sha> <ISO date>
// Commits that only touch .claude/, docs/ or *.md need no review. A merge after the last review → review the whole branch again
// (the base moved and conflict resolutions are new code); plain commits after it → review only <reviewed-sha>..HEAD.

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'origin/<base>';
const NO_REVIEW_PATH = /^(\.claude\/|docs\/)|\.md$/;

function main() {
  // Step 1: find the task's progress.md
  const root = git('rev-parse', '--show-toplevel');
  const progress = findProgress(root);
  if (!progress) return fail('no .claude/ship/<slug>/progress.md in this worktree (pass --progress <path>)');

  // Step 2: --mark records HEAD as reviewed
  const head = git('rev-parse', '--short=10', 'HEAD');
  if (process.argv.includes('--mark')) {
    writeReviewedSha(progress, head);
    console.log(`review-gate: marked ${head} as reviewed in ${path.relative(root, progress)}`);
    return 0;
  }

  // Step 3: list code commits and merges after the last reviewed sha
  const reviewed = readReviewedSha(progress);
  const from = reviewed || git('merge-base', BASE, 'HEAD');
  const commits = git('rev-list', '--reverse', `${from}..HEAD`, '--not', BASE).split('\n').filter(Boolean);
  const unreviewed = commits.map(describeCommit).filter(commit => commit.merge || commit.codeFiles.length);

  // Step 4: never-approvable diff-guard checks on the whole branch, reviewed or not (owner 2026-11-17, dev-zone:
  // "import ngược tầng … require đường dẫn tuyệt đối … lỗi cơ bản" reached the branch while K5 had not run)
  const basic = findNeverApprovable();
  if (basic.length) {
    console.log(`review-gate: ${basic.length} basic error(s) on the branch (diff-guard, never approvable) → fix them first:`);
    for (const line of basic) console.log(`  ${line}`);
    return 2;
  }

  // Step 5: report
  if (!unreviewed.length) {
    console.log(`review-gate: clean — no code change after ${reviewed ? `reviewed ${reviewed}` : `base ${from.slice(0, 10)}`}`);
    return 0;
  }
  const merged = unreviewed.some(commit => commit.merge);
  const range = !reviewed || merged ? `${BASE}...HEAD (whole branch: ${reviewed ? 'a merge came in after the last review' : 'never reviewed'})` : `${reviewed}..HEAD`;
  console.log(`review-gate: ${unreviewed.length} code change(s) not reviewed${reviewed ? ` since ${reviewed}` : ' (no reviewed-sha yet)'} → run /ship-review on ${range}, then --mark`);
  for (const commit of unreviewed) {
    console.log(`  ${commit.sha} ${commit.merge ? '[merge] ' : ''}${commit.subject}${commit.merge ? '' : ` (${commit.codeFiles.length} code file(s))`}`);
  }
  return 2;
}

function findNeverApprovable() {
  const script = path.join(path.dirname(new URL(import.meta.url).pathname), 'diff-guard.mjs');
  const base = git('merge-base', BASE, 'HEAD');
  let output = '';
  try {
    output = execFileSync('node', [script, '--base', base], {encoding: 'utf8'});
  } catch (error) {
    output = error.stdout || '';
  }
  return output.split('\n').map(line => line.trim()).filter(line => /^\[(layer-import-direction|absolute-path)\]/.test(line));
}

function describeCommit(sha) {
  const parents = git('rev-list', '--parents', '-n', '1', sha).split(' ').length - 1;
  const subject = git('log', '-1', '--format=%s', sha);
  const files = parents > 1 ? [] : git('diff-tree', '--no-commit-id', '--name-only', '-r', sha).split('\n').filter(Boolean);
  return {sha: sha.slice(0, 10), subject, merge: parents > 1, codeFiles: files.filter(file => !NO_REVIEW_PATH.test(file))};
}

function findProgress(root) {
  const explicit = argValue('--progress');
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  const shipDir = path.join(root, '.claude', 'ship');
  if (!fs.existsSync(shipDir)) return null;
  const branch = git('branch', '--show-current').replace(/^[^/]+\//, '');
  const candidates = fs.readdirSync(shipDir)
    .map(slug => path.join(shipDir, slug, 'progress.md'))
    .filter(file => fs.existsSync(file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  // .claude/ship is shared by every worktree (symlink to the main checkout): match this branch's slug, never "the newest file"
  const slugOf = file => path.basename(path.dirname(file));
  return candidates.find(file => branch.includes(slugOf(file)) || slugOf(file).includes(branch))
    || candidates.find(file => new RegExp(`^branch:.*${escapeRegex(branch)}`, 'mi').test(fs.readFileSync(file, 'utf8')))
    || null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readReviewedSha(progress) {
  return fs.readFileSync(progress, 'utf8').match(/^reviewed-sha:\s*([0-9a-f]{7,40})/m)?.[1] || null;
}

function writeReviewedSha(progress, sha) {
  const line = `reviewed-sha: ${sha} ${new Date().toISOString()}`;
  const text = fs.readFileSync(progress, 'utf8');
  fs.writeFileSync(progress, /^reviewed-sha:.*$/m.test(text) ? text.replace(/^reviewed-sha:.*$/m, line) : `${text.trimEnd()}\n\n${line}\n`);
}

function git(...args) {
  return execFileSync('git', args, {encoding: 'utf8'}).trim();
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : null;
}

function fail(message) {
  console.error(`review-gate: ${message}`);
  return 1;
}

process.exit(main());
