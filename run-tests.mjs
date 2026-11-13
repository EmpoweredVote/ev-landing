// Runs every test in tests/, one child process at a time, and exits non-zero if any
// failed.  `shots.cjs` files are screenshot helpers rather than tests, and tests/live/
// needs a deployed site to point at, so both are skipped unless --live is passed.
//
// ONE FILE AT A TIME, deliberately.  Each test launches its own Chromium and drives real
// animation frames; run in parallel they starve each other and start failing on timing
// rather than on behaviour.  The whole set is around 25 minutes, which is why the README
// says to run it detached rather than in a foreground call.
//
// THE 600s PER-FILE TIMEOUT IS LOAD-BEARING, and what it looks like when it fires is worth
// knowing: a test that hangs before its browser comes up is killed here and reported as a
// plain FAIL at 600s.  That reads exactly like a real failure and is not one — it happened
// on 2026-11-01 to tests/poof/09-raise.cjs, which passes alone in 0.44s.  Re-run any
// failure on its own before believing it.
//
// Pass one or more path prefixes to run only those tests, for example
// `node run-tests.mjs tests/layout`.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const LIVE = process.argv.includes('--live');
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('--')).map((a) => a.replace(/\\/g, '/').replace(/\/$/, ''));
const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) { walk(f); continue; }
    if (!/\.(cjs|mjs)$/.test(e)) continue;
    if (/shots\.cjs$/.test(e)) continue;
    if (!LIVE && f.includes('live')) continue;
    const rel = f.replace(/\\/g, '/');
    if (ONLY.length && !ONLY.some((o) => rel === o || rel.startsWith(o + '/'))) continue;
    files.push(rel);
  }
};
walk('tests');
files.sort();
if (!files.length) { console.log('No tests matched ' + ONLY.join(', ')); process.exit(1); }

const fail = [];
let n = 0;
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [f], { encoding: 'utf8', timeout: 600000 });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const ok = r.status === 0;
  n++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(secs).padStart(3)}s  ${f}`);
  if (!ok) {
    fail.push(f);
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-14).join('\n');
    console.log(out.replace(/^/gm, '        '));
  }
}
console.log(`\n${n - fail.length}/${n} passed`);
if (fail.length) { console.log('FAILED:\n  ' + fail.join('\n  ')); process.exit(1); }
