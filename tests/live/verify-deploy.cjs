// ─── Post-deploy verification against the LIVE site ───────────────────────────────────────────
//
// Everything else under tests/ drives file:// — this drives the deployed hosts, which is a
// different question: is the thing on the internet the thing main says it should be, and does the
// gag still work there? Run it after every deploy.
//
//   NODE_PATH=<playwright> node tests/live/verify-deploy.cjs
//   NODE_PATH=<playwright> node tests/live/verify-deploy.cjs https://ev-landing.onrender.com
//
// Expectations are DERIVED FROM THE REPO, never hardcoded: the quote pool and every quote's text
// are read out of the working tree's ev-quotes.js and compared against what the host serves. So a
// quote added, removed or reworded needs no edit here, and a stale deploy fails loudly.
//
// Note on hosts: empowered.vote sits behind a Cloudflare edge cache (s-maxage=300), so for up to
// five minutes after a deploy it can still serve the previous build while ev-landing.onrender.com
// (the origin) is already current. A mismatch here right after a push is usually that, not a
// failure — re-run after the cache expires before believing it.
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');
const HOSTS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['https://empowered.vote', 'https://ev-landing.onrender.com'];

// what the repo says the pool should be
function expectedQuotes() {
  const sandbox = { window: {} };
  const src = fs.readFileSync(path.join(REPO, 'ev-quotes.js'), 'utf8');
  new Function('window', src)(sandbox.window);
  const q = sandbox.window.EVQuotes.QUOTES;
  assert.ok(Array.isArray(q) && q.length, 'could not read QUOTES out of the local ev-quotes.js');
  return q;
}

async function checkHost(browser, host, expected) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', r => {
    // let the site's own origin through, block third parties (analytics, fonts) so nothing hangs
    const u = r.request().url();
    return (u.indexOf(host) === 0 || u.indexOf('data:') === 0) ? r.continue() : r.abort();
  });
  await page.goto(host + '/#figdebug', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!window.__evFigDebug, { timeout: 30000 });
  await page.waitForFunction(() => !!window.EVQuotes, { timeout: 30000 });
  await page.waitForTimeout(1500);

  // ── 1. the deployed pool is exactly the repo's pool ──────────────────────────────────────────
  const live = await page.evaluate(() => window.EVQuotes.QUOTES.map(q => ({
    text: q.text, who: q.who, where: q.where, href: q.href
  })));
  assert.strictEqual(live.length, expected.length,
    host + ': serving ' + live.length + ' quotes, the repo has ' + expected.length +
    ' — stale deploy, or an edge cache still holding the old build');
  expected.forEach((e, i) => {
    ['text', 'who', 'where', 'href'].forEach(f => {
      assert.strictEqual(live[i][f], e[f],
        host + ': quote ' + i + ' field "' + f + '" differs from the repo.\n  live: ' +
        live[i][f] + '\n  repo: ' + e[f]);
    });
  });
  assert.ok(live.every(q => /^https:\/\//.test(q.href)), host + ': a quote href is not https');

  // ── 2. the poof gag still runs, and fleeing figures stand on their real floor ────────────────
  await page.evaluate(() => {
    window.__ink = e => {
      const sw = e.c.width, sh = e.c.height;
      const d = e.ctx.getImageData(0, 0, sw, sh).data;
      for (let y = sh - 1; y >= 0; y--) {
        const rb = y * sw * 4;
        for (let x = 0; x < sw; x++) if (d[rb + x * 4 + 3] > 8) return y / (sh / e.h);
      }
      return -1;
    };
    const d = window.__evFigDebug;
    const e = d.entries.filter(x => x.spec.mode !== 'why' && x.w)[0];
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    d.poof.victim = e; d.poof.phase = 'holding'; d.poof.t = 2.9;
  });

  // dt is pinned to 0 through 'stunned', so ink measured here is what poofArmFlee will scan
  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'stunned', { timeout: 15000 });
  const pre = await page.evaluate(() => window.__evFigDebug.entries.map((e, i) => {
    if (e.gone || e.spec.mode === 'why' || !e.w) return null;
    const r = e.c.getBoundingClientRect();
    if (r.bottom < -40 || r.top > window.innerHeight + 40) return null;   // will be culled
    const ib = window.__ink(e);
    return ib < 0 ? null : { i, mode: e.spec.mode, inkScreen: r.top + ib, off: ib - (e.h - 6) };
  }).filter(Boolean));

  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'fleeing', { timeout: 15000 });
  const raising = await page.evaluate(() =>
    window.__evFigDebug.entries.filter(e => e.fl === 'raise').length);
  assert.ok(raising > 0, host + ': nobody entered the "raise" sub-phase — the hands-up beat is missing');

  const post = await page.evaluate(idxs => idxs.map(i => {
    const e = window.__evFigDebug.entries[i];
    if (e.flFloor == null || e.gone) return null;
    const r = e.c.getBoundingClientRect();
    return { floorScreen: r.top + e.flFloor, fl: e.fl };
  }), pre.map(p => p.i));

  let checked = 0, worst = 0;
  pre.forEach((p, k) => {
    const a = post[k];
    if (!a) return;
    checked++;
    const d = Math.abs(a.floorScreen - p.inkScreen);
    if (d > worst) worst = d;
    assert.ok(d <= 2, host + ': ' + p.mode + ' starts his run ' + d.toFixed(1) +
      'px from the floor he was standing on');
  });
  assert.ok(checked > 0, host + ': nobody measurable fled, so the floor check proved nothing');

  // nobody covers ground during the raise
  const still = await page.evaluate(async () => {
    const r = window.__evFigDebug.entries.filter(e => e.fl === 'raise');
    if (!r.length) return true;
    const a = r.map(e => e.flX);
    await new Promise(z => setTimeout(z, 120));
    return r.every((e, i) => Math.abs(e.flX - a[i]) < 1.5 || e.fl !== 'raise');
  });
  assert.ok(still, host + ': a figure moved during the raise — it should be a standing beat');

  // ── 3. the room empties, and the content figures stay ───────────────────────────────────────
  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'cleared', { timeout: 30000 });
  const end = await page.evaluate(() => ({
    left: [...new Set(window.__evFigDebug.entries
      .filter(e => !e.gone && e.c.parentNode).map(e => e.spec.mode))],
    why: window.__evFigDebug.entries
      .filter(e => e.spec.mode === 'why' && e.c.parentNode).length
  }));
  assert.deepStrictEqual(end.left, ['why'], host + ': figures left behind: ' + end.left.join(','));
  assert.strictEqual(end.why, 3, host + ': all three why illustrations must stay');

  assert.strictEqual(errs.length, 0, host + ': page errors — ' + errs.join(' | '));

  const offConv = pre.filter(p => Math.abs(p.off) > 8).length;
  console.log('  ' + host + '\n    pool ' + live.length + ' matches the repo exactly · raise ran on ' +
    raising + ' figure(s) · ' + checked + ' floor(s) verified, worst ' + worst.toFixed(1) +
    'px off (' + offConv + ' off the h-6 line) · room cleared, 3 why figures kept · no page errors');
  if (!offConv) {
    console.log('    note: every figure on screen this run was a conventional (h-6) mode, so the ' +
      'seat/rope case was not exercised — tests/poof/08-flee-floor.cjs covers that one.');
  }
  await page.close();
}

(async function () {
  const expected = expectedQuotes();
  console.log('repo expects ' + expected.length + ' quotes from ' +
    new Set(expected.map(q => q.who)).size + ' speakers; checking ' + HOSTS.length + ' host(s):');
  const browser = await chromium.launch();
  try {
    for (const host of HOSTS) await checkHost(browser, host, expected);
  } finally {
    await browser.close();
  }
  console.log('verify-deploy: PASS');
})();
