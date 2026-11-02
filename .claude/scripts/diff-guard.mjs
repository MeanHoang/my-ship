#!/usr/bin/env node
/**
 * diff-guard — the owner's review rules as machine checks, run on a branch's diff before review.
 * Every "don't do X" a human repeats in review becomes a check (Lauren Tan, "hard constraints beat soft rules").
 *
 *   node .claude/scripts/diff-guard.mjs [--base <ref>]
 *     base defaults to merge-base(HEAD, origin/<mainBranch>); the diff covers commits + staged + unstaged.
 *   exit 0 = clean, 2 = findings (each one is must-fix unless the owner approved it in decisions.md).
 *
 * Config: .claude/diff-guard.json (see ship-profile.example.md §18)
 *   {"mainBranch": "main", "coreFiles": ["src/billing/calc.js"], "codePath": "^(src|packages)/.+\\.(js|ts)$",
 *    "routesPath": "^src/routes/.+\\.js$", "featureMap": ".claude/skills/ship-verify/feature-map.json"}
 *
 * Checks:
 *  1. core-lines        a main-branch line removed or re-indented in a shared core file (new logic goes in its own
 *                       file behind a guard; never rewrite the formula every flow uses).
 *  2. return-undefined  added `return undefined` (return null / '' / [] / {} instead).
 *  3. test-weakened     a removed `expect(` / `assert` line in a test file.
 *  4. feature-map-route a removed route `path:` that the /ship-verify feature map still opens (added routes: info).
 * Add a check only from a review comment the owner has made at least twice; name its rule in this header.
 */
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';

const CONFIG = readConfig('.claude/diff-guard.json');
const CORE_FILES = CONFIG.coreFiles || [];
const CODE_PATH = new RegExp(CONFIG.codePath || '^(src|packages|apps|lib)/.+\\.(js|jsx|ts|tsx|mjs)$');
const TEST_PATH = /(\.test\.|__tests__\/|\.spec\.)/;
const ROUTES_PATH = CONFIG.routesPath ? new RegExp(CONFIG.routesPath) : null;
const ROUTE_LINE = /path: ?['"]([^'"]+)['"]/;
const FEATURE_MAP = CONFIG.featureMap || '.claude/skills/ship-verify/feature-map.json';

const run = () => {
  // Step 1: pick the base and list changed files
  const baseArg = process.argv.indexOf('--base');
  const base = baseArg > -1 ? process.argv[baseArg + 1] : git('merge-base', 'HEAD', `origin/${CONFIG.mainBranch || 'main'}`).trim();
  const changedFiles = git('diff', '--name-only', base).split('\n').filter(Boolean);

  // Step 2: run each check on the diff
  const findings = [
    ...findRewrittenCoreLines(base, changedFiles.filter(file => CORE_FILES.includes(file))),
    ...findAddedLinesMatching(base, changedFiles.filter(file => CODE_PATH.test(file) && !TEST_PATH.test(file)), /\breturn undefined\b/, 'return-undefined'),
    ...findRemovedLinesMatching(base, changedFiles.filter(file => TEST_PATH.test(file)), /\b(expect\(|assert[.(])/, 'test-weakened'),
    ...findRemovedMappedRoutes(base, changedFiles.filter(file => ROUTES_PATH && ROUTES_PATH.test(file)))
  ];
  const addedRoutes = changedFiles.filter(file => ROUTES_PATH && ROUTES_PATH.test(file))
    .flatMap(file => diffLines(base, file).filter(entry => entry.sign === '+' && ROUTE_LINE.test(entry.text)))
    .map(entry => entry.text.match(ROUTE_LINE)[1]);

  // Step 3: report
  console.log(`diff-guard: base ${base.slice(0, 10)}, ${changedFiles.length} changed file(s), ${findings.length} finding(s)`);
  for (const finding of findings) console.log(`  [${finding.check}] ${finding.file}:${finding.line}  ${finding.text}`);
  if (addedRoutes.length) console.log(`  info: new admin route(s) ${addedRoutes.join(', ')} — add to feature-map.json when a verify first opens them`);
  if (findings.length) console.log('Fix them, or record the owner\'s approval for each in decisions.md and name it in the review report.');
  return findings.length ? 2 : 0;
};

/** Every '-' line in a core file is a master line that was removed or rewritten (re-indent included). */
function findRewrittenCoreLines(base, files) {
  return files.flatMap(file => diffLines(base, file).filter(entry => entry.sign === '-').map(entry => ({
    check: 'core-lines', file, line: entry.oldLine, text: entry.text.trim().slice(0, 120)
  })));
}

function findAddedLinesMatching(base, files, pattern, check) {
  return files.flatMap(file => diffLines(base, file).filter(entry => entry.sign === '+' && pattern.test(entry.text)).map(entry => ({
    check, file, line: entry.newLine, text: entry.text.trim().slice(0, 120)
  })));
}

function findRemovedLinesMatching(base, files, pattern, check) {
  return files.flatMap(file => diffLines(base, file).filter(entry => entry.sign === '-' && pattern.test(entry.text)).map(entry => ({
    check, file, line: entry.oldLine, text: entry.text.trim().slice(0, 120)
  })));
}

/** A route removed from the routes files while feature-map.json still sends verifiers there. */
function findRemovedMappedRoutes(base, files) {
  let mappedRoutes;
  try {
    mappedRoutes = new Set(JSON.parse(readFileSync(FEATURE_MAP, 'utf8')).features.map(feature => feature.route).filter(Boolean));
  } catch {
    return [];
  }
  return files.flatMap(file => diffLines(base, file)
    .filter(entry => entry.sign === '-' && ROUTE_LINE.test(entry.text))
    .filter(entry => [...mappedRoutes].some(route => route.endsWith(entry.text.match(ROUTE_LINE)[1])))
    .map(entry => ({check: 'feature-map-route', file, line: entry.oldLine, text: `${entry.text.trim()} is still in feature-map.json — update the map`})));
}

function readConfig(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Parse `git diff -U0` into {sign, oldLine, newLine, text}. */
function diffLines(base, file) {
  const entries = [];
  let oldLine = 0;
  let newLine = 0;
  for (const raw of git('diff', '-U0', base, '--', file).split('\n')) {
    const hunk = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      continue;
    }
    if (raw.startsWith('---') || raw.startsWith('+++')) continue;
    if (raw.startsWith('-')) entries.push({sign: '-', oldLine: oldLine++, newLine: null, text: raw.slice(1)});
    else if (raw.startsWith('+')) entries.push({sign: '+', oldLine: null, newLine: newLine++, text: raw.slice(1)});
  }
  return entries;
}

function git(...args) {
  return execFileSync('git', args, {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
}

process.exit(run());
