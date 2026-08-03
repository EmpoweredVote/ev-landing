const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

async function load(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(String(e)); });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  page.__errors = errors;
  return page;
}

// index.html sets `scroll-behavior: smooth`, so scrollIntoView ANIMATES — a rect captured
// in the same tick is stale and every hit-test built from it misses. Scroll instantly,
// let it settle, then measure.
async function bringIntoView(page) {
  const ok = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode === 'seat' && x.spec.quote;
    })[0];
    if (!e) return false;
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    return true;
  });
  if (!ok) return false;
  await page.waitForTimeout(250);
  return true;
}

async function readerBox(page) {
  return page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode === 'seat' && x.spec.quote;
    })[0];
    if (!e) return null;
    var r = e.c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height - 42 - 40, where: e.spec.quote.where };
  });
}

// click a reader through the real DOM, at his canvas centre
async function clickReader(page) {
  if (!await bringIntoView(page)) return null;
  const box = await readerBox(page);
  if (!box) return null;
  await page.mouse.click(box.x, box.y);
  return box;
}

(async function () {
  const browser = await chromium.launch();

  // the guarantee: a reader with a quote exists on every load
  for (let i = 0; i < 6; i++) {
    const page = await load(browser);
    const cast = await page.evaluate(function () {
      var es = window.__evFigDebug.entries;
      var readers = es.filter(function (x) { return x.spec.mode === 'seat' && x.spec.anim === 'read' && !x.spec.phone; });
      var quoted = readers.filter(function (x) { return x.spec.quote; });
      var wheres = quoted.map(function (x) { return x.spec.quote.where; });
      return { readers: readers.length, quoted: quoted.length, unique: new Set(wheres).size };
    });
    assert.ok(cast.readers >= 1, 'load ' + i + ': every cast must include at least one reader');
    assert.ok(cast.quoted >= 1, 'load ' + i + ': at least one reader must carry a quote');
    assert.strictEqual(cast.quoted, cast.unique, 'load ' + i + ': quotes must not repeat within a cast');
    await page.close();
  }

  let page = await load(browser);

  // readers are out of the generic hover-wave — drawReader owns their hover entirely
  await bringIntoView(page);
  const hoverAt = await readerBox(page);
  await page.mouse.move(hoverAt.x, hoverAt.y);
  await page.waitForTimeout(500);
  const hoverOwnership = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'seat' && x.spec.quote; })[0];
    return { greet: e.greet || 0, glance: e.qGlance };
  });
  assert.strictEqual(hoverOwnership.greet, 0,
    'a reader must not go through the generic greet — drawReader owns reader hover');
  assert.ok(hoverOwnership.glance > 0,
    'hovering a quotable reader must raise the glance blend, got ' + hoverOwnership.glance);

  // click opens a bubble carrying that figure's own quote
  const clicked = await clickReader(page);
  assert.ok(clicked, 'no quotable reader found to click');
  await page.waitForSelector('.ev-quote', { timeout: 3000 });
  const opened = await page.evaluate(function () {
    var el = document.querySelector('.ev-quote');
    return { where: el.querySelector('.where').textContent, href: el.querySelector('a').href };
  });
  assert.strictEqual(opened.where, clicked.where, 'bubble must show the quote dealt to that figure');
  assert.ok(/^https:/.test(opened.href));

  // hovering HIM pauses the timer
  await page.mouse.move(clicked.x, clicked.y);
  await page.waitForTimeout(300);                    // let a frame call setHeld(true)
  const pausedByFigure = await page.evaluate(function () {
    for (var i = 0; i < 20; i++) window.EVQuotes.tick(1);
    return window.EVQuotes.openCount();
  });
  assert.strictEqual(pausedByFigure, 1, 'hovering the Bobit must pause his bubble timer');

  // Esc closes and he goes back to reading
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(function () { return document.querySelectorAll('.ev-quote').length; }), 0,
    'Escape must close the bubble');
  await page.waitForTimeout(900);
  assert.strictEqual(await page.evaluate(function () {
    return window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'seat' && x.spec.quote; })[0].qs;
  }), 'read', 'after Escape he must settle back to reading');
  await page.close();

  // clicking him a second time closes it
  page = await load(browser);
  const c2 = await clickReader(page);
  await page.waitForSelector('.ev-quote');
  await page.waitForTimeout(700);
  await page.mouse.click(c2.x, c2.y);
  await page.waitForTimeout(500);
  assert.strictEqual(await page.evaluate(function () { return document.querySelectorAll('.ev-quote').length; }), 0,
    'a second click must dismiss');
  await page.close();

  // clicking somewhere else closes it
  page = await load(browser);
  await clickReader(page);
  await page.waitForSelector('.ev-quote');
  await page.waitForTimeout(700);
  await page.mouse.click(5, 5);
  await page.waitForTimeout(500);
  assert.strictEqual(await page.evaluate(function () { return document.querySelectorAll('.ev-quote').length; }), 0,
    'clicking off must dismiss');

  // clicking INSIDE the bubble must not dismiss it
  await page.waitForTimeout(900);
  await clickReader(page);
  await page.waitForSelector('.ev-quote');
  await page.waitForTimeout(700);
  const inside = await page.evaluate(function () {
    var r = document.querySelector('.ev-quote').getBoundingClientRect();
    return { x: r.left + 8, y: r.top + 8 };
  });
  await page.mouse.click(inside.x, inside.y);
  await page.waitForTimeout(500);
  assert.strictEqual(await page.evaluate(function () { return document.querySelectorAll('.ev-quote').length; }), 1,
    'clicking inside the bubble must not dismiss it');

  // a quote-less reader shrugs and opens nothing
  const noQuoteBox = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'seat' && x.spec.quote; })[0];
    e.spec.quote = null; e.qs = 'read'; e.qsT = 0; e.qh = null;
    e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
    return true;
  });
  assert.ok(noQuoteBox);
  await page.waitForTimeout(300);
  const nq = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode === 'seat' && x.spec.anim === 'read' && !x.spec.quote;
    })[0];
    var r = e.c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height - 42 - 40 };
  });
  await page.mouse.click(nq.x, nq.y);
  await page.waitForTimeout(300);
  const shrug = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode === 'seat' && x.spec.anim === 'read' && !x.spec.quote;
    })[0];
    return { state: e.qs, bubbles: document.querySelectorAll('.ev-quote').length };
  });
  assert.strictEqual(shrug.state, 'shrug', 'a reader with no quote must shrug when clicked');
  assert.strictEqual(shrug.bubbles, 0);

  assert.deepStrictEqual(page.__errors, [], 'page threw errors: ' + page.__errors.join('; '));

  console.log('05-integration: PASS');
  await browser.close();
})();
