const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html';

async function makePage(browser, width) {
  const page = await browser.newPage({ viewport: { width: width, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  return page;
}

(async function () {
  const browser = await chromium.launch();
  const page = await makePage(browser, 1280);

  // the module must be loaded by the page itself, not injected
  assert.ok(await page.evaluate(function () { return !!window.EVQuotes && !!window.EVQuotes.open; }),
    'index.html must load ev-quotes.js and expose open()');

  await page.evaluate(function () {
    window.EVQuotes.open({
      headX: 600, headY: 500, tone: 'rgb(0, 125, 153)', quote: window.EVQuotes.QUOTES[0]
    });
  });
  // measure only once the fade-in has landed: until `.in` is applied the bubble still
  // carries its translateY(4px) start offset, which is not the position users see
  await page.waitForSelector('.ev-quote.in');
  await page.waitForTimeout(250);

  const info = await page.evaluate(function () {
    var q = window.EVQuotes.QUOTES[0];
    var el = document.querySelector('.ev-quote');
    var a = el.querySelector('a');
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return {
      count: window.EVQuotes.openCount(),
      role: el.getAttribute('role'),
      text: el.querySelector('q').textContent,
      expected: q.text,
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      linkText: a.textContent,
      where: el.querySelector('.where').textContent,
      borderColor: cs.borderTopColor,
      borderWidth: cs.borderTopWidth,
      pointer: cs.pointerEvents,
      zIndex: cs.zIndex,
      bottom: r.bottom,
      hasTail: !!el.querySelector('.tail') && !!el.querySelector('.tail-in')
    };
  });

  assert.strictEqual(info.count, 1);
  assert.strictEqual(info.role, 'note');
  assert.strictEqual(info.text, info.expected, 'quote text must be verbatim');
  assert.ok(/^https:\/\/tile\.loc\.gov\/.*#page=118$/.test(info.href), 'href lost its page anchor: ' + info.href);
  assert.strictEqual(info.target, '_blank');
  assert.strictEqual(info.rel, 'noopener');
  assert.strictEqual(info.linkText, 'George Washington');
  assert.ok(info.where.indexOf('Fenner') >= 0);
  assert.strictEqual(info.borderColor, 'rgb(0, 125, 153)', 'border must take the figure tone');
  assert.strictEqual(info.borderWidth, '2px');
  assert.strictEqual(info.pointer, 'auto', 'the bubble must be clickable');
  assert.strictEqual(info.zIndex, '70', 'must sit above the z-index:60 canvases');
  assert.ok(info.hasTail, 'tail needs both triangles for a continuous outline');
  assert.ok(Math.abs(info.bottom - (500 - 14)) < 3,
    'bubble bottom should sit 14px above the head, got ' + info.bottom);

  // the tail points at the head and stays inside the rounded corners
  const tail = await page.evaluate(function () {
    var el = document.querySelector('.ev-quote');
    var r = el.getBoundingClientRect();
    var t = el.querySelector('.tail').getBoundingClientRect();
    return { centre: t.left + t.width / 2, headX: 600, left: r.left, right: r.right };
  });
  assert.ok(Math.abs(tail.centre - tail.headX) < 3, 'tail must point at the head');

  await page.evaluate(function () { window.EVQuotes.closeAll(); });
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(function () { return document.querySelectorAll('.ev-quote').length; }), 0,
    'closeAll must remove the element from the DOM');

  // clamped to a narrow viewport. NOTE: index.html already overflows at 360px on its own
  // (a .btn-primary and three figure canvases reach ~422px), so this asserts the bubble
  // adds NO overflow of its own rather than asserting an absolute clean width.
  const narrow = await makePage(browser, 360);
  await narrow.waitForTimeout(1200);
  const baseline = await narrow.evaluate(function () {
    return document.documentElement.scrollWidth;
  });
  const clamp = await narrow.evaluate(function () {
    window.EVQuotes.open({ headX: 8, headY: 400, tone: '#007D99', quote: window.EVQuotes.QUOTES[3] });
    var el = document.querySelector('.ev-quote');
    var r = el.getBoundingClientRect();
    var t = el.querySelector('.tail').getBoundingClientRect();
    return {
      left: r.left, right: r.right,
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      inside: (t.left + t.width / 2) >= r.left + 10 && (t.left + t.width / 2) <= r.right - 10
    };
  });
  assert.ok(clamp.left >= 7, 'bubble must not hang off the left edge: ' + clamp.left);
  assert.ok(clamp.right <= clamp.winW + 1,
    'bubble must stay inside the viewport, right edge at ' + clamp.right);
  assert.ok(clamp.docW <= baseline,
    'bubble widened the page: ' + clamp.docW + ' > baseline ' + baseline);
  assert.ok(clamp.inside, 'clamped tail must stay within the rounded corners');

  // both themes keep the text legible against the card
  for (const theme of ['light', 'dark']) {
    const colors = await page.evaluate(function (t) {
      document.documentElement.dataset.theme = t;
      var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#FF5740', quote: window.EVQuotes.QUOTES[6] });
      var cs = getComputedStyle(h.el);
      var qs = getComputedStyle(h.el.querySelector('q'));
      window.EVQuotes.closeAll();
      return { bg: cs.backgroundColor, fg: qs.color };
    }, theme);
    assert.notStrictEqual(colors.bg, colors.fg, theme + ': text and background must differ');
    assert.ok(/^rgba?\(/.test(colors.bg) && colors.bg !== 'rgba(0, 0, 0, 0)',
      theme + ': bubble needs an opaque card background, got ' + colors.bg);
  }

  console.log('02-bubble: PASS');
  await browser.close();
})();
