#!/usr/bin/env node
// Compares the published figures of two briefing editions, for the changelog's
// "By the numbers" bullet.  Reads the data-auto values only, never the prose.
//
//   node changelog/briefing-figures.mjs                 newest edition vs the one in last-run.json
//   node changelog/briefing-figures.mjs 2026-11-03 2026-11-06
//
// Prints JSON: { from, to, link, moves: [...], skipped: [...] }.
// A figure is SKIPPED, never compared, when either edition does not carry its key.
// That is the label-change trap from decision 0036: on 2026-11-06 `stances_served`
// became `stances_live`, and comparing the two would print a jump that never happened.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BRIEFING = join(here, '..', 'briefing');

// First value of every data-auto key in an edition's HTML.
export function extractFigures(html) {
  const out = {};
  const re = /data-auto="([a-z0-9_]+)"[^>]*>([^<]*)</g;
  let m;
  while ((m = re.exec(html))) if (!(m[1] in out)) out[m[1]] = m[2].trim();
  return out;
}

// "31,540" -> 31540.  Anything that is not a plain whole number ("2.2 million",
// "~900", a date) returns null and is never compared.
export function parseCount(s) {
  if (typeof s !== 'string' || !/^\d{1,3}(,\d{3})*$|^\d+$/.test(s.trim())) return null;
  return Number(s.replace(/,/g, ''));
}

// Round DOWN to two significant figures, for "more than N".  1,343 -> 1,300.
export function roundDown(n) {
  if (n < 100) return n;
  const p = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.floor(n / p) * p;
}

export function compareFigures(before, after, allow) {
  const moves = [];
  const skipped = [];
  for (const [key, spec] of Object.entries(allow)) {
    if (!(key in before) || !(key in after)) {
      skipped.push({ key, reason: `not printed in ${!(key in before) ? 'the earlier' : 'the later'} edition (label changed or figure new)` });
      continue;
    }
    const a = parseCount(before[key]);
    const b = parseCount(after[key]);
    if (a === null || b === null) { skipped.push({ key, reason: 'not a whole number' }); continue; }
    const delta = b - a;
    if (Math.abs(delta) < spec.min_move) continue;
    const n = Math.abs(delta);
    const r = roundDown(n);
    moves.push({
      key, product: spec.product, label: spec.label, before: a, after: b, delta,
      direction: delta > 0 ? 'up' : 'down',
      // Exact when the rounding would change nothing ("up 4"), else rounded down.
      say: r === n ? `${delta > 0 ? 'up' : 'down'} ${n.toLocaleString('en-US')}` : `${delta > 0 ? 'up by more than' : 'down by more than'} ${r.toLocaleString('en-US')}`,
      total: roundDown(b) === b ? b.toLocaleString('en-US') : `more than ${roundDown(b).toLocaleString('en-US')}`,
    });
  }
  return { moves, skipped };
}

// Dated editions, oldest first.  The current edition's dated folder holds only a
// forwarder until it is superseded, so its figures are read from briefing/index.html.
export function editions(dir = BRIEFING) {
  return readdirSync(dir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && existsSync(join(dir, d, 'index.html'))).sort();
}

export function editionHtml(date, dir = BRIEFING) {
  const dated = readFileSync(join(dir, date, 'index.html'), 'utf8');
  if (/data-auto="/.test(dated)) return dated;
  const current = readFileSync(join(dir, 'index.html'), 'utf8');
  const asof = extractFigures(current).asof;
  const want = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  // A forwarder for an edition that is no longer current was never frozen (2026-10-30
  // is one).  Its figures are gone; return null and let the caller step back one edition.
  return asof === want ? current : null;
}

// The newest edition before `date` whose figures can still be read.
export function previousReadable(date, dir = BRIEFING) {
  const list = editions(dir).filter((d) => d < date).reverse();
  for (const d of list) if (editionHtml(d, dir)) return d;
  return null;
}

function main() {
  const allow = JSON.parse(readFileSync(join(here, 'figures.json'), 'utf8')).figures;
  const list = editions();
  let [from, to] = process.argv.slice(2);
  if (!to) {
    to = list[list.length - 1];
    from = JSON.parse(readFileSync(join(here, 'last-run.json'), 'utf8')).edition;
  }
  if (from === to) {
    console.log(JSON.stringify({ from, to, moves: [], skipped: [], note: 'no new edition since the last run' }, null, 2));
    return;
  }
  const note = [];
  if (!editionHtml(to)) throw new Error(`briefing/${to} has no readable figures`);
  if (!editionHtml(from)) {
    const prev = previousReadable(from);
    note.push(`briefing/${from} was never frozen, so its figures are gone; compared against ${prev} instead`);
    from = prev;
  }
  const result = compareFigures(extractFigures(editionHtml(from)), extractFigures(editionHtml(to)), allow);
  console.log(JSON.stringify({ from, to, link: `/briefing/${to}`, ...result, note }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
