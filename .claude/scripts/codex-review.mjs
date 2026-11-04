#!/usr/bin/env node
// K5 second reviewer: run Codex (owner's ChatGPT-plan login, ~85k tokens a run) on this worktree's diff,
// or ask Codex to cross-verify the Claude reviewer's findings. One-shot `codex exec`, no session, no lane.
//
//   node .claude/scripts/codex-review.mjs review --out <file.json> [--base <sha>] [--worktree <path>]
//   node .claude/scripts/codex-review.mjs verify --candidates <claude-findings.json> --out <file.json> [...]
//
// Exit 0 = findings written to --out (a JSON array). Exit 3 = Codex unavailable (not installed, quota,
// timeout, unparsable answer): K5 goes on with the Claude reviewer only and the report says
// "Codex reviewer missing: <reason>". Never block K5 on this script.
// Why two reviewers: benchmark 2026-11-02 on real merge requests. Claude + Codex on the same
// checklist caught 72% of verified bugs vs 39% for the old single review, and each model found bugs the
// other missed (Codex: a P1; Claude: a migrated-account case and a stray CI change).

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';

const CODEX_BIN = process.env.CODEX_BIN || 'codex';
const TIMEOUT_MS = 30 * 60 * 1000;
const CHECKLIST = '.claude/roles/review-checklist.md';

function main() {
  // Step 1: arguments and the diff base
  const args = parseArgs(process.argv.slice(2));
  if (!['review', 'verify'].includes(args.mode) || !args.out) return unavailable('usage: review|verify --out <file> [--candidates <file>]', 1);
  const worktree = args.worktree || git(process.cwd(), ['rev-parse', '--show-toplevel']);
  const base = args.base || git(worktree, ['merge-base', (process.env.SHIP_BASE_REF || 'origin/main'), 'HEAD']);

  // Step 2: build the prompt
  const prompt = args.mode === 'review' ? reviewPrompt(worktree, base) : verifyPrompt(worktree, base, args.candidates);
  if (!prompt) return unavailable(`candidates file not found: ${args.candidates}`, 1);

  // Step 3: run Codex once, read its last message
  const lastMessagePath = `${args.out}.last.txt`;
  fs.mkdirSync(path.dirname(path.resolve(args.out)), {recursive: true});
  const run = spawnSync(CODEX_BIN, ['exec', '--skip-git-repo-check', '-C', worktree, '-s', 'workspace-write', '--output-last-message', lastMessagePath, prompt],
    {stdio: ['ignore', 'pipe', 'pipe'], timeout: TIMEOUT_MS, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  if (run.error) return unavailable(run.error.code === 'ETIMEDOUT' ? 'timeout after 30 min' : `cannot start codex: ${run.error.message}`);
  if (run.status !== 0) return unavailable(`codex exit ${run.status}: ${tail(run.stderr || run.stdout)}`);

  // Step 4: parse and save the findings
  const findings = parseFindings(readText(lastMessagePath));
  if (!findings) return unavailable(`no JSON findings in codex answer: ${tail(readText(lastMessagePath))}`);
  fs.writeFileSync(args.out, JSON.stringify(findings, null, 1));
  console.log(JSON.stringify({ok: true, mode: args.mode, base, findings: findings.length, out: args.out}));
  return null;
}

function reviewPrompt(worktree, base) {
  return `You are the second reviewer (K5) of the change in ${worktree}: \`git diff ${base}\` plus uncommitted changes.
Read first: ${CHECKLIST} (do every step), .claude/roles/reviewer.md (Standards), and the task's progress.md / decisions.md under .claude/ship/ if present.
Rules: report only problems introduced by this diff; each finding needs file:line and a concrete scenario (inputs/state -> wrong result); no style comments; do not modify tracked files (scratch only under /tmp); no network.
${OUTPUT_SPEC}`;
}

function verifyPrompt(worktree, base, candidatesPath) {
  if (!candidatesPath || !fs.existsSync(candidatesPath)) return '';
  return `You are the CROSS-VERIFIER (K5) for the change in ${worktree} (\`git diff ${base}\`). Another reviewer reported the candidates below.
For EACH: open the cited code and the callers/writers needed, decide REAL or FALSE. FALSE only with a concrete refutation (a line that prevents it, a writer proving the data shape differs, a run). Unsure = keep it as REAL with lower confidence. Merge duplicates. Do not modify tracked files.
Return the candidates you did not refute, each with "confidence" (0-100) and "verdict_reason"; list refuted ones with "refuted": true and the refuting file:line.
${OUTPUT_SPEC}

Candidates:
${readText(candidatesPath)}`;
}

const OUTPUT_SPEC = `Final answer: ONLY a JSON array in one \`\`\`json block:
[{"file": "...", "line": 123, "severity": "must-fix|should-fix|minor", "title": "one line", "scenario": "concrete inputs -> wrong result", "evidence": "what you read or ran"}]`;

function parseFindings(text) {
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/g)].map(match => match[1]).reverse();
  for (const block of [...blocks, text]) {
    try {
      const value = JSON.parse(block);
      if (Array.isArray(value)) return value;
    } catch {
      // try the next block
    }
  }
  return null;
}

function parseArgs(argv) {
  const args = {mode: argv[0] || '', out: '', base: '', worktree: '', candidates: ''};
  for (let index = 1; index < argv.length; index++) {
    const key = argv[index].replace(/^--/, '');
    if (key in args) args[key] = argv[++index];
  }
  return args;
}

function git(cwd, gitArgs) {
  return execFileSync('git', ['-C', cwd, ...gitArgs], {encoding: 'utf8'}).trim();
}

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function tail(text = '') {
  return text.trim().split('\n').slice(-3).join(' | ').slice(0, 300);
}

function unavailable(reason, code = 3) {
  console.log(JSON.stringify({ok: false, reason}));
  process.exitCode = code;
  return null;
}

main();
