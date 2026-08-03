const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto('about:blank');
  await page.addScriptTag({ path: path.join(__dirname, '..', '..', 'ev-quotes.js') });

  const shape = await page.evaluate(function () {
    return {
      count: window.EVQuotes.QUOTES.length,
      keys: Object.keys(window.EVQuotes.QUOTES[0]).sort(),
      allHttps: window.EVQuotes.QUOTES.every(function (q) { return /^https:\/\//.test(q.href); }),
      allFilled: window.EVQuotes.QUOTES.every(function (q) {
        return q.text.length > 40 && q.who.length > 3 && q.where.length > 8;
      })
    };
  });
  assert.strictEqual(shape.count, 7, 'pool should hold 7 quotes');
  assert.deepStrictEqual(shape.keys, ['href', 'text', 'where', 'who']);
  assert.ok(shape.allHttps, 'every href must be https');
  assert.ok(shape.allFilled, 'every field must be populated');

  // the special characters must survive the file round-trip
  const chars = await page.evaluate(function () {
    var all = window.EVQuotes.QUOTES.map(function (q) { return q.text; }).join(' ');
    return { aeligature: all.indexOf('dæmon') >= 0, emdash: all.indexOf('—') >= 0 };
  });
  assert.ok(chars.aeligature, 'the Washington quote must keep its ae ligature');
  assert.ok(chars.emdash, 'the Kennedy quote must keep its em dash');

  // dealing: fewer readers than quotes -> every reader served, all distinct
  const four = await page.evaluate(function () {
    var readers = [{}, {}, {}, {}];
    var n = window.EVQuotes.deal(readers);
    var got = readers.map(function (r) { return r.quote ? r.quote.who + '|' + r.quote.where : null; });
    return { n: n, got: got, unique: new Set(got).size, served: got.filter(Boolean).length };
  });
  assert.strictEqual(four.n, 4, 'should report 4 dealt');
  assert.strictEqual(four.served, 4, 'all 4 readers should be served');
  assert.strictEqual(four.unique, 4, 'no reader may share a quote');

  // more readers than quotes -> exactly pool-size served, the rest left null
  const ten = await page.evaluate(function () {
    var readers = []; for (var i = 0; i < 10; i++) readers.push({});
    var n = window.EVQuotes.deal(readers);
    var served = readers.filter(function (r) { return r.quote; });
    var keys = served.map(function (r) { return r.quote.where; });
    return { n: n, served: served.length, unique: new Set(keys).size };
  });
  assert.strictEqual(ten.n, 7, 'only 7 quotes exist to deal');
  assert.strictEqual(ten.served, 7);
  assert.strictEqual(ten.unique, 7, 'no repeats even when readers outnumber quotes');

  // dealing is randomised: the same 7 readers should not always land in the same order
  const varies = await page.evaluate(function () {
    var seen = {};
    for (var trial = 0; trial < 40; trial++) {
      var readers = []; for (var i = 0; i < 7; i++) readers.push({});
      window.EVQuotes.deal(readers);
      seen[readers.map(function (r) { return r.quote.where; }).join('>')] = 1;
    }
    return Object.keys(seen).length;
  });
  assert.ok(varies > 5, 'dealing should be shuffled, saw only ' + varies + ' orderings');

  console.log('01-deal: PASS');
  await browser.close();
})();
