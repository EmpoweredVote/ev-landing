// briefing/freeze.mjs must freeze the current briefing whichever line ending the
// checkout uses: LF on a Mac or Linux, CRLF on the Windows machine that runs the
// scheduled edition. It used to demand CRLF and refuse everywhere else.
//
// Freezes a copy of briefing/index.html in each ending, checks that every edit landed,
// that the ending was kept, and that the two results are the same page.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert';

const src = readFileSync('briefing/index.html', 'utf8').replace(/\r\n/g, '\n');
const dir = mkdtempSync(join(tmpdir(), 'freeze-'));
const run = (name, text) => {
  const f = join(dir, name);
  writeFileSync(f, text);
  const r = spawnSync(process.execPath, ['briefing/freeze.mjs', f, '2026-01-02', 'January 2, 2026'], { encoding: 'utf8' });
  return { r, out: readFileSync(f, 'utf8') };
};
try {
  const lf = run('lf.html', src);
  assert.strictEqual(lf.r.status, 0, 'LF freeze failed: ' + lf.r.stderr);
  const crlf = run('crlf.html', src.replace(/\n/g, '\r\n'));
  assert.strictEqual(crlf.r.status, 0, 'CRLF freeze failed: ' + crlf.r.stderr);

  assert.ok(!lf.out.includes('\r'), 'LF page gained a CR');
  assert.ok(!/[^\r]\n/.test(crlf.out), 'CRLF page gained a bare LF');
  assert.strictEqual(crlf.out.replace(/\r\n/g, '\n'), lf.out, 'LF and CRLF freezes differ');

  for (const want of [
    '<title>Empowered Vote: State of the Platform &mdash; January 2, 2026</title>',
    '<link rel="canonical" href="https://empowered.vote/briefing/2026-01-02" />\n<meta name="robots" content="noindex">\n',
    '  .archived{',
    '<div class="wrap">\n<div class="archived">\n  <b>This is an archived briefing.</b>',
  ]) assert.ok(lf.out.includes(want), 'missing after freeze: ' + want.slice(0, 60));

  const mixed = run('mixed.html', src.replace('\n', '\r\n'));
  assert.notStrictEqual(mixed.r.status, 0, 'mixed line endings should be refused');
  assert.ok(!mixed.out.includes('class="archived"'), 'refused freeze still wrote the file');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log('PASS briefing-freeze: LF and CRLF both freeze the same way');
