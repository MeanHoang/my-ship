#!/usr/bin/env node
// Refuse a ✅ case whose start state was never proven on the store.
// Owner 2026-11-16 (/ship-learn 3): "test ngôn ngữ nhưng store có đúng 1 ngôn ngữ mặc định mà cx cho pass đc ?????"
// — a language case passed on a store that had only its primary language, so the factor value under test never existed.
// Format: .claude/workflow/test-design.md §3 (Setup table has a `proof` column: the state read back from the store).
//
//   node .claude/scripts/cases-check.mjs --cases .claude/ship/<slug>/test-cases.md
//
// exit 0 = every ✅ case stands on proven setup; 2 = findings (printed); 1 = usage / parse error.

import fs from 'node:fs';
import path from 'node:path';

function main() {
  // Step 1: read the file
  const casesPath = argValue('--cases');
  if (!casesPath || !fs.existsSync(casesPath)) return fail('usage: --cases <test-cases.md> (file must exist)');
  const text = fs.readFileSync(casesPath, 'utf8');
  const setup = readTable(sectionOf(text, 'Setup'));
  const cases = readTable(sectionOf(text, 'Cases'));
  if (!cases.rows.length) return fail('no "## Cases" table found');

  // Step 2: which setup rows are proven (proof cell names a file that exists, or a quoted read-back)
  const proofColumn = setup.header.findIndex(name => /proof/i.test(name));
  const findings = [];
  if (setup.rows.length && proofColumn < 0) findings.push('Setup table has no `proof` column (test-design.md §3): add it and fill it from a read-back of the store');
  const proven = new Set(setup.rows.filter(row => isProof(row[proofColumn], casesPath)).map(row => row[0]));

  // Step 3: every ✅ case must only use proven setup rows
  const stateColumn = cases.header.findIndex(name => /start state/i.test(name));
  const statusColumn = cases.header.findIndex(name => /status/i.test(name));
  for (const row of cases.rows) {
    if (!/✅/.test(row[statusColumn] || '')) continue;
    const used = [...new Set((row[stateColumn] || '').match(/\bS\d+\b/g) || [])];
    const unproven = used.filter(id => !proven.has(id));
    if (unproven.length) findings.push(`${row[0]} is ✅ but uses setup ${unproven.join(', ')} with no proof — read the state back from the store first, or mark the case ⛔`);
  }

  // Step 4: report
  console.log(`cases-check: ${cases.rows.length} case(s), ${setup.rows.length} setup row(s), ${proven.size} proven, ${findings.length} finding(s)`);
  for (const finding of findings) console.log(`  ${finding}`);
  return findings.length ? 2 : 0;
}

/** A proof is a path to an existing evidence file (relative to the task folder) or a quoted read-back value. */
function isProof(cell, casesPath) {
  const value = (cell || '').trim();
  if (!value || /^(⬜|—|-|todo)$/i.test(value)) return false;
  if (/["“`]/.test(value)) return true;
  const file = value.match(/(?:^|\s)((?:tmp|\.claude)\/\S+)/)?.[1];
  return Boolean(file && fs.existsSync(path.join(path.dirname(casesPath), file)));
}

function sectionOf(text, title) {
  const start = text.search(new RegExp(`^##\\s+${title}\\b`, 'm'));
  if (start < 0) return '';
  const rest = text.slice(start + 3);
  const next = rest.search(/^##\s/m);
  return next < 0 ? rest : rest.slice(0, next);
}

function readTable(section) {
  const lines = section.split('\n').filter(line => line.trim().startsWith('|'));
  const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
  if (lines.length < 2) return {header: [], rows: []};
  return {header: cells(lines[0]), rows: lines.slice(2).map(cells)};
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : null;
}

function fail(message) {
  console.error(`cases-check: ${message}`);
  return 1;
}

process.exit(main());
