// Drive the built page like a user: click readers, check the REAL bubble opens, is anchored to the
// head, holds the right text, and fits. Then screenshot it.
//
//   node tools/bubble-rig/build.cjs
//   NODE_PATH=<playwright> node tools/bubble-rig/verify.cjs [built.html] [screenshot-dir]
//
// Screenshots are written next to the built file by default. The built page is body-content only
// (that is what the artifact host expects), so this wraps it in a minimal document first — the same
// skeleton the host supplies.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const HERE = __dirname;
const BUILT = process.argv[2] || path.join(HERE, 'bubble-rig.html');
const SHOTS = process.argv[3] || path.dirname(BUILT);
const WRAPPED = path.join(SHOTS, 'bubble-rig.wrapped.html');
const URL = 'file:///' + WRAPPED.replace(/\\/g, '/');
const SP = SHOTS;   // screenshots land here

(async function () {
  if (!fs.existsSync(BUILT)) {
    throw new Error('no built page at ' + BUILT + ' — run tools/bubble-rig/build.cjs first');
  }
  const inner = fs.readFileSync(BUILT, 'utf8');
  fs.writeFileSync(WRAPPED,
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>*{margin:0}</style></head><body>' + inner + '</body></html>');

  const browser = await chromium.launch();

  for (const [theme, width, tag] of [['light', 1280, 'light-wide'], ['dark', 1280, 'dark-wide'], ['light', 390, 'light-phone']]) {
    const page = await browser.newPage({ viewport: { width, height: 950 }, colorScheme: theme, deviceScaleFactor: 2 });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
    await page.goto(URL);
    await page.waitForTimeout(900);

    // derive the expectation from the pool itself, so removing a quote can't leave this stale
    const pool = await page.evaluate(() => window.EVQuotes.QUOTES.length);
    const n = await page.locator('.reader').count();
    assert.strictEqual(n, pool, tag + ': ' + n + ' readers rendered for a pool of ' + pool);
    const orphans = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.theme-head h2')).map(h => h.textContent)
        .filter(t => /wiring bug/i.test(t)));
    assert.strictEqual(orphans.length, 0, tag + ': the page reported unplaced quotes — ' + orphans.join('; '));

    // the quote text must NOT be printed on the page anywhere outside a bubble
    const leaked = await page.evaluate(() => {
      const first = window.EVQuotes.QUOTES[0].text.slice(0, 40);
      const body = document.body.innerText;
      return body.includes(first);
    });
    assert.ok(!leaked, tag + ': quote text is printed on the page, which defeats the test');

    // click a reader with a LONG quote (Jefferson/Carrington, index 3, 296 chars)
    const target = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.reader'));
      const i = btns.findIndex(b => b.getAttribute('aria-label').indexOf('Edward Carrington') >= 0);
      btns[i].scrollIntoView({ block: 'center', behavior: 'instant' });
      return i;
    });
    await page.waitForTimeout(400);
    await page.locator('.reader').nth(target).click();
    await page.waitForSelector('.ev-quote.in', { timeout: 4000 });
    await page.waitForTimeout(400);

    const b = await page.evaluate(() => {
      const el = document.querySelector('.ev-quote');
      const r = el.getBoundingClientRect();
      const q = el.querySelector('q');
      const a = el.querySelector('.attrib a');
      const tail = el.querySelector('.tail');
      const cs = getComputedStyle(el);
      return {
        w: Math.round(r.width), h: Math.round(r.height),
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        left: Math.round(r.left), right: Math.round(r.right),
        text: q.textContent.slice(0, 45),
        who: a.textContent, href: a.getAttribute('href'),
        border: cs.borderTopColor, hasTail: !!tail,
        vw: document.documentElement.clientWidth,
        vh: window.innerHeight,
        scrollW: document.documentElement.scrollWidth,
        // is the bubble pointing at the reader's head?
        headX: (() => {
          const p = document.querySelector('.reader[data-open="1"] .perch').getBoundingClientRect();
          return Math.round(p.left + 54);
        })(),
        tailX: Math.round(tail.getBoundingClientRect().left + 11)
      };
    });

    const expectW = Math.min(300, b.vw - 16);
    assert.strictEqual(b.w, expectW, tag + ': bubble width ' + b.w + ' but CSS implies ' + expectW);
    assert.ok(b.left >= 0 && b.right <= b.vw, tag + ': bubble is off-screen horizontally [' + b.left + '..' + b.right + '] vw=' + b.vw);
    assert.ok(b.scrollW <= b.vw, tag + ': open bubble caused horizontal page scroll');
    assert.ok(b.hasTail, tag + ': bubble has no tail');
    assert.ok(Math.abs(b.tailX - b.headX) < 26, tag + ': tail at ' + b.tailX + ' is not pointing at the head at ' + b.headX);
    assert.ok(b.text.length > 20, tag + ': bubble has no quote text');

    console.log(tag + ': ' + n + ' readers · bubble ' + b.w + '×' + b.h + 'px, top=' + b.top +
      ', tail→head off by ' + Math.abs(b.tailX - b.headX) + 'px · ' + b.who +
      (b.top < 0 ? '  <-- CLIPPED ABOVE VIEWPORT' : '') +
      (errs.length ? '\n  errors: ' + errs.slice(0, 3).join(' | ') : ''));

    await page.screenshot({ path: path.join(SP, 'rig-' + tag + '-bubble.png') });

    // now the measuring bench
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#measure').click();
    await page.waitForSelector('table.heights tbody tr');
    const heights = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table.heights tbody tr'));
      return {
        count: rows.length,
        tall: rows.filter(r => r.className === 'tall').length,
        first: rows[0].innerText.replace(/\s+/g, ' ').trim(),
        last: rows[rows.length - 1].innerText.replace(/\s+/g, ' ').trim()
      };
    });
    assert.strictEqual(heights.count, pool, tag + ': bench measured ' + heights.count +
      ' bubbles for a pool of ' + pool);
    console.log('  bench: ' + heights.count + ' measured, ' + heights.tall + ' flagged tall' +
      '\n    tallest  ' + heights.first + '\n    shortest ' + heights.last);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SP, 'rig-' + tag + '-bench.png') });
    await page.close();
  }

  // expiry: does the bubble close itself after LIFE seconds and send him back to his book?
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForTimeout(800);
  await page.evaluate(() => { document.querySelectorAll('.reader')[0].scrollIntoView({ block: 'center', behavior: 'instant' }); });
  await page.locator('.reader').first().click();
  await page.waitForSelector('.ev-quote.in');
  await page.mouse.move(5, 5);   // off him, so his timer actually runs
  const life = await page.evaluate(() => window.EVQuotes.LIFE);
  await page.waitForFunction(() => window.EVQuotes.openCount() === 0, { timeout: (life + 6) * 1000 });
  const after = await page.evaluate(() => ({
    open: window.EVQuotes.openCount(),
    dom: document.querySelectorAll('.ev-quote').length,
    hint: document.querySelector('.reader').querySelector('.hint').textContent
  }));
  console.log('expiry: after LIFE=' + life + 's → openCount=' + after.open +
    ', bubbles in DOM=' + after.dom + ', hint="' + after.hint + '"');
  assert.strictEqual(after.open, 0, 'bubble did not expire');

  // Escape closes
  await page.locator('.reader').first().click();
  await page.waitForSelector('.ev-quote.in');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const esc = await page.evaluate(() => window.EVQuotes.openCount());
  assert.strictEqual(esc, 0, 'Escape did not close the bubble');
  console.log('escape: closes · OK');

  await page.close();
  await browser.close();
  console.log('\nALL CHECKS PASSED');
})();
