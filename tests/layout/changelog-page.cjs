// The /changelog page loads entries.json over HTTP and renders it, with zero entries
// and with many, in both themes, with no page errors and no sideways scroll on a
// phone.  It needs a server (module scripts and fetch do not work from file://), so
// it starts a small one on the repo root and swaps entries.json per case.
const { chromium } = require('playwright');
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MANY = fs.readFileSync(path.join(ROOT, 'tests/changelog/fixture-many.json'), 'utf8');
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.png': 'image/png', '.css': 'text/css' };

let entriesBody = '[]';
const server = http.createServer(function (req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/changelog/entries.json') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(entriesBody); }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async function () {
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const failures = [];
  const cases = [
    { name: 'zero', body: '[]', items: 0 },
    { name: 'many', body: MANY, items: JSON.parse(MANY).length },
    { name: 'broken', body: '{ nope', items: 0, error: true },
  ];
  for (const c of cases) {
    for (const width of [360, 1200]) {
      for (const theme of ['light', 'dark']) {
        entriesBody = c.body;
        const page = await browser.newPage({ viewport: { width: width, height: 900 } });
        const errors = [];
        page.on('pageerror', function (e) { errors.push(e.message); });
        await page.route('**/*', function (r) {
          return r.request().url().startsWith(base) ? r.continue() : r.abort();
        });
        await page.addInitScript(function (t) { localStorage.setItem('ev:color-scheme', t); }, theme);
        await page.goto(base + '/changelog/');
        await page.waitForFunction(function () { return document.querySelector('#changelog .cl-empty, #changelog .cl-error, #changelog .cl-week'); });
        const r = await page.evaluate(function () {
          return {
            items: document.querySelectorAll('.cl-item').length,
            weeks: Array.from(document.querySelectorAll('.cl-week h2')).map(function (h) { return h.textContent; }),
            empty: !!document.querySelector('.cl-empty'),
            error: !!document.querySelector('.cl-error'),
            injected: !!document.querySelector('.cl-text b'),
            scrollW: document.documentElement.scrollWidth,
            clientW: document.documentElement.clientWidth,
            theme: document.documentElement.dataset.theme,
            bg: getComputedStyle(document.body).backgroundColor,
          };
        });
        const tag = c.name + ' ' + width + 'px ' + theme + ': ';
        if (r.items !== c.items) failures.push(tag + r.items + ' items, want ' + c.items);
        if (c.name === 'zero' && !r.empty) failures.push(tag + 'no empty note');
        if (c.error && !r.error) failures.push(tag + 'no load-error note');
        if (c.name === 'many' && r.weeks[0] !== 'Week of November 9, 2026') failures.push(tag + 'first week is ' + r.weeks[0]);
        if (r.injected) failures.push(tag + 'entry HTML was not escaped');
        if (r.scrollW > r.clientW) failures.push(tag + 'sideways scroll ' + r.scrollW + ' > ' + r.clientW);
        if (r.theme !== theme) failures.push(tag + 'theme ' + r.theme);
        if (errors.length) failures.push(tag + 'page errors: ' + errors.join(' | '));
        if (c.name === 'many' && width === 360) await page.screenshot({ path: path.join(require('os').tmpdir(), 'changelog-' + theme + '.png'), fullPage: true });
        await page.close();
      }
    }
  }
  await browser.close();
  server.close();
  assert.deepStrictEqual(failures, []);
  console.log('ok: changelog page renders 0, many and a broken file, in both themes, at 360px and 1200px');
})().catch(function (e) { console.error(e); server.close(); process.exit(1); });
