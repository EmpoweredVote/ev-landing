// Every raster that is GENERATED from a brand SVG must match the SVG it came from.
//
// Nothing else in this repo notices when a brand SVG changes and its rasters do not,
// which is exactly how the Compass share cards went wrong: #30 changed the dark
// Compass mark from the UI teal to the brand skyblue on 2026-10-17, the cards were
// never rebuilt, and for four days the file whose whole job is to represent us on
// LinkedIn and YouTube showed the old colour. Nobody saw it, because a stale PNG
// looks exactly like a fresh one until you put it beside its source.
//
// The check is the obvious one and it is the only honest one: run the generators and
// see whether anything moves. Do NOT be tempted to replace this with a cheaper
// comparison that renders an SVG and diffs it against its PNG -- that was tried on
// 2026-10-21 and it is worthless here, because every product trims its rasters
// differently (Civic Trivia flush to ink, Compass flush left with 1% on the other
// three sides), so an honest pixel comparison reports 47-73% "mismatch" on files that
// rebuild byte-identically. Comparing aspect ratios against the SVG viewBox fails the
// same way, for the same reason.
//
// WHAT THIS DOES NOT COVER. Only two of the six products can be rebuilt at all:
// Compass and Civic Trivia. Essentials, Read & Rank, Treasury Tracker and Fallacy
// Finders have no generator -- their PNGs were exported from a design tool and nothing
// in this repo can reproduce them, so this test is silent about them and cannot be
// made to speak. tools/og-card/gen-og-card.mjs is also left out: it needs
// @resvg/resvg-js, which is not installed, so including it would fail for a reason
// that has nothing to do with whether a card is stale.
//
// THIS TEST WRITES TO THE WORKING TREE AND PUTS IT BACK. The generators have no
// dry-run mode, so the only way to ask them anything is to let them write. Every file
// under the two output trees is read into memory first and restored afterwards in a
// finally block, including on a crash -- by bytes, not by git, so an uncommitted change
// you already had survives untouched and nothing is ever discarded. It does mean this
// file must not run at the same time as another copy of itself.
//
//   node tests/brand/01-rasters-match-svgs.cjs
const { execFileSync } = require('child_process');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../..');

// The three generators that read brand/ and write rasters, with what each one claims
// to produce. The counts are asserted so that a generator quietly writing fewer files
// than it used to is itself a failure.
const GENERATORS = [
  { script: 'tools/gen-compass-rasters.mjs',    expect: 36 },
  { script: 'tools/gen-ctc-logo-rasters.mjs',   expect: 8 },
  { script: 'tools/video/make-thumbnails.mjs',  expect: 12 }
];

// Everything those three can write to. Nothing outside these two trees is touched.
const OUTPUT_TREES = ['brand', 'tools/video/thumbnails'];

function walk(rel, into) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return into;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = rel + '/' + entry.name;
    if (entry.isDirectory()) walk(child, into);
    else if (entry.isFile()) into.set(child, fs.readFileSync(path.join(ROOT, child)));
  }
  return into;
}

function snapshot() {
  const m = new Map();
  for (const tree of OUTPUT_TREES) walk(tree, m);
  return m;
}

const before = snapshot();
const failures = [];
const ran = [];

try {
  for (const gen of GENERATORS) {
    let out;
    try {
      out = execFileSync(process.execPath, [gen.script], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      failures.push(`${gen.script} would not run: ${(e.stderr || e.message).trim().split('\n').slice(-3).join(' | ')}`);
      continue;
    }
    // every generator ends by saying how many files it wrote
    const n = (out.match(/(\d+)\s+(?:logo PNGs|thumbnails|files)/) || [])[1];
    ran.push(`${gen.script}: ${n || '?'} files`);
    if (n && Number(n) !== gen.expect) {
      failures.push(`${gen.script} wrote ${n} files, expected ${gen.expect} — ` +
        `if that is deliberate, change the count here`);
    }
  }

  const after = snapshot();

  for (const [rel, bytes] of after) {
    const was = before.get(rel);
    if (!was) {
      failures.push(`${rel} is new — a generator produces it but it was never committed`);
    } else if (!was.equals(bytes)) {
      failures.push(`${rel} does not match the SVG it is generated from`);
    }
  }
  for (const rel of before.keys()) {
    if (!after.has(rel)) failures.push(`${rel} disappeared when the generators ran`);
  }
} finally {
  // Put the tree back exactly as it was, whatever happened above.
  const now = snapshot();
  for (const [rel, bytes] of before) {
    const cur = now.get(rel);
    if (!cur || !cur.equals(bytes)) fs.writeFileSync(path.join(ROOT, rel), bytes);
  }
  for (const rel of now.keys()) {
    if (!before.has(rel)) fs.unlinkSync(path.join(ROOT, rel));
  }
}

console.log(ran.join('\n'));

if (failures.length) {
  console.error(
    'generated rasters are out of date with their brand SVGs:\n  ' + failures.join('\n  ') +
    '\n\nRebuild them and commit the result:\n' +
    GENERATORS.map((g) => '  node ' + g.script).join('\n') +
    '\n\n(The working tree has been left as it was. Nothing was committed and nothing discarded.)'
  );
}
assert.deepStrictEqual(failures, [], 'brand rasters must match their SVGs');
console.log(`01-rasters-match-svgs: PASS (${before.size} files checked across ${OUTPUT_TREES.length} trees)`);
