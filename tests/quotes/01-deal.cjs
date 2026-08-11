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
  assert.strictEqual(shape.count, 20, 'pool should hold 20 quotes');
  assert.deepStrictEqual(shape.keys, ['href', 'text', 'where', 'who']);
  assert.ok(shape.allHttps, 'every href must be https');
  assert.ok(shape.allFilled, 'every field must be populated');

  // the special characters must survive the file round-trip
  const chars = await page.evaluate(function () {
    var all = window.EVQuotes.QUOTES.map(function (q) { return q.text; }).join(' ');
    // pick the 1958 Loyola quote by its citation, not by being the first Kennedy in the array —
    // there is a second Kennedy entry now (American University, 1963) and [0] would silently
    // start checking the wrong quote's punctuation if the order ever changed
    var jfk = window.EVQuotes.QUOTES.filter(function (q) { return q.where.indexOf('Loyola') >= 0; })[0];
    return {
      aeligature: all.indexOf('dæmon') >= 0,
      jfkEnDash: jfk.text.indexOf('for the past – let us accept') >= 0,
      jfkNoEmDash: jfk.text.indexOf('—') < 0,
      jfkNoComma: jfk.text.indexOf('Democratic answer but the right') >= 0,
      jfkStarts: jfk.text.indexOf('Let us not seek the Republican') === 0,
      jfkOwnWordsOnly: jfk.text.indexOf('faction') < 0 && jfk.text.indexOf('poet') < 0
    };
  });
  assert.ok(chars.aeligature, 'the Washington quote must keep its ae ligature');
  // the JFK Library text uses an EN dash here; popular reprints substitute an em dash or a
  // full stop, and this quote had drifted to the em-dash version once already
  assert.ok(chars.jfkEnDash, 'the Kennedy quote must use an en dash before "let us accept"');
  assert.ok(chars.jfkNoEmDash, 'the Kennedy quote must not reintroduce an em dash');
  assert.ok(chars.jfkNoComma, 'no comma after "the Democratic answer" — the source has none');
  assert.ok(chars.jfkStarts, 'the Kennedy quote must begin at "Let us not seek the Republican"');
  // he closes the speech on a poet's verse; it must stay out, because everything in a bubble
  // is attributed to the named speaker and those are another author's words
  assert.ok(chars.jfkOwnWordsOnly, 'the Kennedy quote must contain only his own words');

  // Lincoln, first inaugural: two punctuation points that reprints get wrong and that two
  // independent transcriptions (American Presidency Project, Avalon) agree on. Selected by
  // citation text for the same reason the Kennedy check is — both Lincoln entries cite the
  // same speech, so they are told apart by their opening words.
  const abe = await page.evaluate(function () {
    var all = window.EVQuotes.QUOTES.filter(function (q) { return q.who === 'Abraham Lincoln'; });
    var friends = all.filter(function (q) { return q.text.indexOf('We are not enemies') === 0; })[0];
    var major = all.filter(function (q) { return q.text.indexOf('A majority held') === 0; })[0];
    return {
      n: all.length,
      noCommaAfterStrained: friends.text.indexOf('may have strained it must not break') >= 0,
      strainedIt: friends.text.indexOf('strained them') < 0,
      endsAtAffection: /bonds of affection\.$/.test(friends.text),
      noMysticChords: friends.text.indexOf('mystic chords') < 0,
      sentimentsPlural: major.text.indexOf('popular opinions and sentiments,') >= 0,
      keepsTheClause: major.text.indexOf('and always changing easily with deliberate changes') >= 0
    };
  });
  assert.strictEqual(abe.n, 2, 'two Lincoln passages expected');
  // "Though passion may have strained, it must not break" is the common reprint; the source has
  // no comma there, and it is "strained it", not "strained them"
  assert.ok(abe.noCommaAfterStrained, 'no comma after "strained" — the source has none');
  assert.ok(abe.strainedIt, '"strained it", not "strained them"');
  // the trim is deliberate: the mystic-chords sentence runs ~60 words and overflows the bubble
  assert.ok(abe.endsAtAffection, 'the friends quote must stop at a sentence boundary');
  assert.ok(abe.noMysticChords, 'the mystic-chords sentence stays out of the trimmed form');
  assert.ok(abe.sentimentsPlural, '"sentiments" is plural in the source');
  // the clause between the commas is what separates his majority from a mob — never trim it
  assert.ok(abe.keepsTheClause, 'the majority quote must keep its middle clause');

  // Identity key is the TEXT, not who/where: several entries legitimately share a citation now
  // (two passages from the Farewell Address, two from Truman's 1952 citizenship address), so
  // keying on `where` would read two genuinely different quotes as one repeat.
  // dealing: fewer readers than quotes -> every reader served, all distinct
  const four = await page.evaluate(function () {
    var readers = [{}, {}, {}, {}];
    var n = window.EVQuotes.deal(readers);
    var got = readers.map(function (r) { return r.quote ? r.quote.text : null; });
    return { n: n, got: got, unique: new Set(got).size, served: got.filter(Boolean).length };
  });
  assert.strictEqual(four.n, 4, 'should report 4 dealt');
  assert.strictEqual(four.served, 4, 'all 4 readers should be served');
  assert.strictEqual(four.unique, 4, 'no reader may share a quote');

  // more readers than quotes -> exactly pool-size served, the rest left null. Reader count has to
  // stay ahead of the pool for this to exercise anything; it was 10 against a pool of 7.
  const over = await page.evaluate(function () {
    var pool = window.EVQuotes.QUOTES.length;
    var readers = []; for (var i = 0; i < pool + 6; i++) readers.push({});
    var n = window.EVQuotes.deal(readers);
    var served = readers.filter(function (r) { return r.quote; });
    var keys = served.map(function (r) { return r.quote.text; });
    return { pool: pool, n: n, served: served.length, unique: new Set(keys).size };
  });
  assert.strictEqual(over.n, over.pool, 'only ' + over.pool + ' quotes exist to deal');
  assert.strictEqual(over.served, over.pool);
  assert.strictEqual(over.unique, over.pool, 'no repeats even when readers outnumber quotes');

  // dealing is randomised: the same readers should not always land in the same order
  const varies = await page.evaluate(function () {
    var seen = {};
    for (var trial = 0; trial < 40; trial++) {
      var readers = []; for (var i = 0; i < 7; i++) readers.push({});
      window.EVQuotes.deal(readers);
      seen[readers.map(function (r) { return r.quote.text; }).join('>')] = 1;
    }
    return Object.keys(seen).length;
  });
  assert.ok(varies > 5, 'dealing should be shuffled, saw only ' + varies + ' orderings');

  console.log('01-deal: PASS');
  await browser.close();
})();
