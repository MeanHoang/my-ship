#!/usr/bin/env node
// Check test-cases.md before testing (is the table complete, merchant-first?) and before reporting passes (is each ✅ real?).
// Owner 2026-11-16 (/ship-learn 3): "test ngôn ngữ nhưng store có đúng 1 ngôn ngữ mặc định mà cx cho pass đc ?????"
// Owner 2026-11-16: "trường admin ui có tác động … verify bấm thử trên màn hình để test như 1 merchant là cực kỳ quan trọng
// chỉ sửa db hay call api mà thực sự cần thiết thôi … viết test case là bắt buộc và đầy đủ … tôi thấy test thực sự sơ sài".
// Format: .claude/workflow/test-design.md §3.
//
//   node .claude/scripts/cases-check.mjs --cases .claude/ship/<slug>/test-cases.md
//
// Checks (each failure is one finding line):
//   1. every factor value from `## Factors` appears in at least one case row (or is listed under `dropped:` with why)
//   2. every case has expected + how; a case driven by a merchant/customer screen is `ui:`; a non-ui how says `why not UI`
//   3. every Setup row built by DB / API / script says why the UI route was not used
//   4. a ✅ ui case cites screen evidence (tmp/shots image or tmp/logs page read); an API call or DB read is not a UI pass
//   5. a ✅ case only uses Setup rows with proof (state read back from the store)
//   6. a case whose expected result is something visible is checked on the screen, not only via API/DB/unit
//   7. cases touching a stateful domain have a `## Transitions` table, every T<n> reached by a case (owner 2026-11-24)
// exit 0 = clean; 2 = findings (printed); 1 = usage / parse error.

import fs from 'node:fs';
import path from 'node:path';

const NON_UI_REASON = /why not ui|ui (cannot|can't|has no)|no ui|not reachable (in|from|by) (the )?ui|không có ui|ui không/i;
const DB_OR_API_BUILD = /\bdb\b|rest v2|internal (api|endpoint)|admin api|graphql|curl|script|\bapi\b/i;
const STOP_WORDS = new Set(['the', 'and', 'with', 'for', 'not', 'one', 'its', 'has', 'from', 'only', 'any']);
const EVIDENCE = /\.(png|jpe?g|webp)\b|tmp\/(shots|logs)\/|\bshot\b/i;
// "test verify store front xem có đúng đổi đc ko chứ" (owner 2026-11-17): an API 200 was taken as the storefront result
const VISIBLE_RESULT = /\b(shows?|shown|displays?|visible|renders?|appears?|storefront|widget|modal|popup|banner|badge|toast)\b|hiển thị|màn hình/i;
// error-code / response-contract rows and grep checks are not a screen result (replayed 2026-11-24 on 16 real tables)
const API_CONTRACT = /^\W*(ERR|OK|HTTP)\b|\b(returns?|response|status \d{3}|payload|grep|does not depend)\b/i;
const STATEFUL_PATHS = /point|storeCredit|store-credit|reward|coupon|redeem|redemption|vipTier|tier|referral|milestone|refund|cancel|orderController|order\/|webhook|pubsub|onCreateActivity|migrat|import/i;
const UI_BUILD =/app admin|platform admin|\bui\b|theme editor|storefront|click|bấm|settings? →|→/i;

function main() {
  // Step 1: read the file
  const casesPath = argValue('--cases');
  if (!casesPath || !fs.existsSync(casesPath)) return fail('usage: --cases <test-cases.md> (file must exist)');
  const text = fs.readFileSync(casesPath, 'utf8');
  const setup = readTables(sectionOf(text, 'Setup'));
  const cases = readTables(sectionOf(text, 'Cases'));
  if (!cases.rows.length) return fail('no "## Cases" table found');
  const findings = [];

  // Step 2: completeness — every factor value is exercised by some case
  const dropped = sectionOf(text, 'Factors').toLowerCase().split(/^dropped:/m)[1] || '';
  for (const {factor, value} of readFactors(sectionOf(text, 'Factors'))) {
    const needle = normalize(value);
    const words = needle.split(/[^\p{L}\p{N}_.+-]+/u).filter(word => word.length > 1 && !STOP_WORDS.has(word));
    if (!words.length || dropped.includes(needle)) continue;
    const covered = cases.rows.some(row => {
      const rowText = ` ${normalize(row.cells.join(' '))} `;
      return words.every(word => new RegExp(`[^\\p{L}\\p{N}]${escapeRegex(word)}[^\\p{L}\\p{N}]`, 'u').test(rowText));
    });
    if (!covered) {
      findings.push(`[coverage] factor "${factor}" value "${value}" is in no case: add a case, or list it under "dropped:" with why`);
    }
  }

  // Step 3: each case — expected, how, merchant-first (a backend-only task declares `no UI surface: <why>` once)
  const noUiSurface = /^\s*[-*]?\s*no ui surface:\s*\S/im.test(text);
  for (const row of cases.rows) {
    const expected = row.get(/^expected/);
    const how = row.get(/^how$/);
    if (!expected || /^(⬜|—|-)$/.test(expected)) findings.push(`[incomplete] ${row.id} has no expected result`);
    if (!how) {
      findings.push(`[incomplete] ${row.id} has no how`);
      continue;
    }
    if (!noUiSurface && !/^ui/i.test(how) && !/^(unit|cannot)/i.test(how) && !NON_UI_REASON.test(row.cells.join(' '))) {
      findings.push(`[ui-first] ${row.id} is "${how.slice(0, 40)}" with no "why not UI": a merchant/customer action is tested on the screen (test-design.md §2.6)`);
    }
    // a result the shopper / merchant SEES is checked where they see it, not by the API that feeds it (/ship-learn 2026-11-24 G)
    if (!noUiSurface && VISIBLE_RESULT.test(expected) && !API_CONTRACT.test(expected) && !/^(cannot|unit)/i.test(how) && !/\bui\b/i.test(how.replace(/why not ui[^|]*/i, ''))) {
      findings.push(`[end-result] ${row.id} expects something visible ("${expected.slice(0, 50)}") but is checked by "${how.slice(0, 20)}": check it on the screen (ui:<store>), or split into an API case + a ui case`);
    }
  }

  // Step 4: each Setup row built through DB / API says why not the UI
  const setupHow = setup.rows.length ? setup.rows[0].index(/how to build|cách dựng/) : -1;
  for (const row of setup.rows) {
    const build = row.cells[setupHow] || '';
    if (DB_OR_API_BUILD.test(build) && !UI_BUILD.test(build) && !NON_UI_REASON.test(build)) {
      findings.push(`[ui-first] setup ${row.id} is built by DB/API with no "why not UI": build it through the admin screen, or say why the UI cannot`);
    }
  }

  // Step 5: each ✅ case — UI evidence for UI cases, proven setup rows
  const proven = new Set(setup.rows.filter(row => isProof(row.get(/proof/), casesPath)).map(row => row.id));
  if (setup.rows.length && setup.rows[0].index(/proof/) < 0) findings.push('[proof] Setup table has no `proof` column (test-design.md §3): add it and fill it from a read-back of the store');
  for (const row of cases.rows) {
    const status = row.get(/^status/);
    if (!/✅/.test(status)) continue;
    const apiOnly = /\b(api|db)\b\s*:/i.test(status) && !/\bshot\b|\.(png|jpe?g|webp)\b/i.test(status);
    if (/^ui/i.test(row.get(/^how$/)) && (!EVIDENCE.test(status) || apiOnly)) {
      findings.push(`[ui-evidence] ${row.id} is a UI case marked ✅ with no screen evidence (a tmp/shots image or a tmp/logs page read): an API call or DB read does not pass a UI case`);
    }
    const used = [...new Set((row.get(/start state/) || '').match(/\bS\d+\b/g) || [])];
    const unproven = used.filter(id => !proven.has(id));
    if (unproven.length) findings.push(`[proof] ${row.id} is ✅ but uses setup ${unproven.join(', ')} with no proof — read the state back from the store first, or mark the case ⛔`);
  }

  // Step 6: stateful domain → a Transitions table, every row reached by a case (test-design.md §2.3)
  findings.push(...findMissingStateTransitionCases(text, cases.rows));

  // Step 7: report
  const run = cases.rows.filter(row => /[✅❌⛔]/.test(row.get(/^status/))).length;
  console.log(`cases-check: ${cases.rows.length} case(s) (${run} run), ${setup.rows.length} setup row(s), ${proven.size} proven, ${findings.length} finding(s)`);
  for (const finding of findings) console.log(`  ${finding}`);
  return findings.length ? 2 : 0;
}

/** Cases touching a stateful domain need `## Transitions` (or `no transitions: <why>`); each T<n> row is named in a case or dropped. */
function findMissingStateTransitionCases(text, caseRows) {
  const touches = caseRows.map(row => row.get(/^touches/)).join(' ');
  const stateful = STATEFUL_PATHS.test(touches);
  const transitions = readTables(sectionOf(text, 'Transitions')).rows.filter(row => /^T\d+$/i.test(row.id));
  if (/^\s*[-*]?\s*no transitions:\s*\S/im.test(text)) return [];
  if (!transitions.length) {
    return stateful
      ? ['[transitions] cases touch a stateful domain (points / rewards / tier / referral / milestone / refund / webhook …) but there is no `## Transitions` table: add one, or write "no transitions: <why>" under ## Factors']
      : [];
  }
  const caseText = caseRows.map(row => row.cells.join(' ')).join('\n');
  const dropped = sectionOf(text, 'Factors') + sectionOf(text, 'Transitions');
  return transitions
    .filter(row => !new RegExp(`\\b${row.id}\\b`).test(caseText) && !new RegExp(`dropped:\\s*${row.id}\\b`, 'i').test(dropped))
    .map(row => `[transitions] ${row.id} (${(row.cells[2] || '').slice(0, 50)}) is reached by no case: name it in a case's factors/steps, or "dropped: ${row.id} — <why>"`);
}

/** `- name: v1 | v2 | v3` lines; values inside backticks/brackets are kept as written. */
function readFactors(section) {
  const out = [];
  for (const line of section.split('\n')) {
    const match = line.match(/^\s*[-*]\s+([^:]{1,60}):\s*(.+)$/);
    if (!match || !match[2].includes('|') || /^(dropped|no ui surface)/i.test(match[1])) continue;
    for (const value of match[2].split('|')) out.push({factor: match[1].trim(), value: value.trim()});
  }
  return out;
}

/** A proof is a path to an existing evidence file (relative to the task folder) or a quoted read-back value. */
function isProof(cell, casesPath) {
  const value = (cell || '').trim();
  if (!value || /^(⬜|—|-|todo)$/i.test(value)) return false;
  if (/["“`]/.test(value)) return true;
  const file = value.match(/(?:^|\s)((?:tmp|\.claude)\/\S+)/)?.[1];
  return Boolean(file && fs.existsSync(path.join(path.dirname(casesPath), file)));
}

/** Every table under the section (some files split cases into several tables), rows keyed by their header. */
function readTables(section) {
  const rows = [];
  let header = null;
  for (const line of section.split('\n')) {
    if (!line.trim().startsWith('|')) {
      header = null;
      continue;
    }
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
    if (!header) {
      header = cells;
      continue;
    }
    if (cells.every(cell => /^:?-+:?$/.test(cell))) continue;
    const columns = header;
    const index = pattern => columns.findIndex(name => pattern.test(name.toLowerCase()));
    rows.push({id: cells[0], cells, index, get: pattern => cells[index(pattern)] || ''});
  }
  return {rows};
}

function sectionOf(text, title) {
  const start = text.search(new RegExp(`^##\\s+(\\d+\\.\\s*)?${title}\\b`, 'mi'));
  if (start < 0) return '';
  const rest = text.slice(start + 3);
  const next = rest.search(/^##\s/m);
  return next < 0 ? rest : rest.slice(0, next);
}

function normalize(value) {
  return value.toLowerCase().replace(/\([^)]*\)|[`*_"“”]/g, '').replace(/\s+/g, ' ').trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
