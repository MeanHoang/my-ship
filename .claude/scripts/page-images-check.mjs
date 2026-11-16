#!/usr/bin/env node
// Check every image a local HTML page shows (mockup index, report.html, plan.html) before it reaches the owner.
// Owner 2026-11-12 (/ship-learn 3): "ảnh lỗi vậy ???" — a mockup page went out with broken images.
//
//   node .claude/scripts/page-images-check.mjs <page.html> [<page.html> …]
//
// Local files must exist, be non-empty and start with a PNG/JPEG/GIF/WebP/SVG signature; http(s) images must answer
// 200 with an image content type. exit 0 = all load, 2 = broken images (listed), 1 = usage error.

import fs from 'node:fs';
import path from 'node:path';

async function main() {
  // Step 1: arguments
  const pages = process.argv.slice(2);
  if (!pages.length) return fail('usage: page-images-check.mjs <page.html> [...]');

  // Step 2: collect and check every image of every page
  const broken = [];
  let total = 0;
  for (const page of pages) {
    if (!fs.existsSync(page)) {
      broken.push(`${page}: page not found`);
      continue;
    }
    const sources = imageSources(fs.readFileSync(page, 'utf8'));
    total += sources.length;
    for (const source of sources) {
      const problem = source.startsWith('http') ? await remoteProblem(source) : localProblem(source, page);
      if (problem) broken.push(`${page}: ${source.slice(0, 120)} — ${problem}`);
    }
  }

  // Step 3: report
  console.log(`page-images-check: ${pages.length} page(s), ${total} image(s), ${broken.length} broken`);
  for (const line of broken) console.log(`  ${line}`);
  return broken.length ? 2 : 0;
}

/** <img src>, <source srcset> first entry, and CSS url(...); data: URIs are checked for a non-empty payload. */
function imageSources(html) {
  const found = [];
  for (const match of html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) found.push(match[1]);
  for (const match of html.matchAll(/<source\b[^>]*?\bsrcset\s*=\s*["']([^"'\s,]+)/gi)) found.push(match[1]);
  for (const match of html.matchAll(/url\(\s*["']?([^"')]+?)["']?\s*\)/gi)) {
    if (/\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(match[1]) || match[1].startsWith('data:image')) found.push(match[1]);
  }
  return [...new Set(found)];
}

function localProblem(source, page) {
  if (source.startsWith('data:')) return /^data:image\/[\w+.-]+;base64,.{20,}/.test(source) ? null : 'empty or non-image data URI';
  const file = path.resolve(path.dirname(page), decodeURIComponent(source.replace(/^file:\/\//, '').split(/[?#]/)[0]));
  if (!fs.existsSync(file)) return `missing file ${file}`;
  const head = fs.readFileSync(file).subarray(0, 16);
  if (!head.length) return 'empty file (0 bytes)';
  return isImageSignature(head) ? null : 'not an image (bad file signature)';
}

async function remoteProblem(url) {
  try {
    const response = await fetch(url, {method: 'GET', signal: AbortSignal.timeout(10000)});
    if (!response.ok) return `HTTP ${response.status}`;
    const type = response.headers.get('content-type') || '';
    return type.startsWith('image/') ? null : `content-type ${type || 'missing'}`;
  } catch (error) {
    return `fetch failed: ${error.message}`;
  }
}

function isImageSignature(head) {
  const hex = head.toString('hex');
  const text = head.toString('utf8').trimStart();
  return hex.startsWith('89504e47') || hex.startsWith('ffd8ff') || hex.startsWith('47494638')
    || (hex.startsWith('52494646') && head.subarray(8, 12).toString() === 'WEBP') || text.startsWith('<svg') || text.startsWith('<?xml');
}

function fail(message) {
  console.error(`page-images-check: ${message}`);
  return 1;
}

process.exit(await main());
