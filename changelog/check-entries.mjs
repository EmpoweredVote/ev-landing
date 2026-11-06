#!/usr/bin/env node
// The blocking word check from ev-cto decision 0036, "Guardrails".
//
//   node changelog/check-entries.mjs          check, drop rejected entries, rewrite entries.json
//   node changelog/check-entries.mjs --dry    check and report only; change nothing
//   node changelog/check-entries.mjs --file <path>   check another file (the tests use this)
//
// A rejected entry is DROPPED, not published, and the reason is printed.  The rest
// stay.  Exit code is non-zero only when the file itself is broken (not JSON, not an
// array) — a dropped entry is the check working, not failing.
//
// The rules live in rules.mjs.  The list of products a voter can reach is read from
// the home page (index.html) on every run.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkEntries, listedProducts, isSortedNewestFirst } from './rules.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ENTRIES = join(here, 'entries.json');
const HOME = join(here, '..', 'index.html');
const NAMES = join(here, 'blocked-names.txt');

export function loadBlockedNames(path = NAMES) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
}

function main() {
  const dry = process.argv.includes('--dry');
  const fi = process.argv.indexOf('--file');
  const file = fi > -1 ? process.argv[fi + 1] : ENTRIES;
  let entries;
  try {
    entries = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`BROKEN: ${file} is not valid JSON: ${e.message}`);
    process.exit(2);
  }
  if (!Array.isArray(entries)) {
    console.error('BROKEN: changelog/entries.json must be a JSON array');
    process.exit(2);
  }
  const listed = listedProducts(readFileSync(HOME, 'utf8'));
  if (!listed.length) {
    console.error('BROKEN: found no products on the home page (index.html a.logo-trigger[data-name])');
    process.exit(2);
  }
  const { kept, dropped } = checkEntries(entries, { listed, extraNames: loadBlockedNames() });
  console.log(`Listed products: ${listed.map((p) => p.name).join(', ')}`);
  for (const d of dropped) {
    const e = d.entry || {};
    console.log(`DROPPED entry ${d.index} (${e.date} · ${e.product}): ${JSON.stringify(e.text)}`);
    for (const r of d.reasons) console.log(`    - ${r}`);
  }
  if (!isSortedNewestFirst(kept)) {
    kept.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // stable: same-date order kept
    console.log('Re-sorted entries newest first.');
  }
  console.log(`${kept.length} kept, ${dropped.length} dropped${dry ? ' (dry run: nothing written)' : ''}`);
  if (!dry && (dropped.length || JSON.stringify(kept) !== JSON.stringify(entries))) {
    writeFileSync(file, JSON.stringify(kept, null, 2) + '\n');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
