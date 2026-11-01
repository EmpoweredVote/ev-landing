// Which tags are active, given a clock and a session. Selection itself is 01-select's job;
// this is only about deriving the facts. Dates and hours are injected rather than mocked —
// context(facts) takes an explicit `now`, so there is no clock to fake and no flake to chase.
const { chromium } = require('playwright');
const assert = require('assert');

const BASE = 'file:///C:/ev-landing/ev-landing-main/tests/lines/fixture.html';

async function makePage(browser, query) {
  const page = await browser.newPage();
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(BASE + (query || ''));
  return page;
}

// tags for a given local date/time, with no session
function tagsAt(page, y, m, d, h) {
  return page.evaluate(function (a) {
    return window.EVLines.context({ now: new Date(a[0], a[1], a[2], a[3], 0, 0) }).tags;
  }, [y, m, d, h]);
}

// how many days to the next federal Election Day, as the greeter would count them
function daysAt(page, y, m, d) {
  return page.evaluate(function (a) {
    return window.EVLines.context({ now: new Date(a[0], a[1], a[2], 12, 0, 0) }).daysToElection;
  }, [y, m, d]);
}

// the computed election date for a year, as [y, m, d] or null
function electionFor(page, y) {
  return page.evaluate(function (yy) {
    var e = window.EVLines.federalElectionDay(yy);
    return e ? [e.getFullYear(), e.getMonth(), e.getDate()] : null;
  }, y);
}

(async function () {
  const browser = await chromium.launch();
  const page = await makePage(browser);

  // ── hour windows, at their boundaries. Noon is afternoon, not morning.
  assert.ok((await tagsAt(page, 2026, 5, 10, 0)).includes('morning'), 'midnight is morning');
  assert.ok((await tagsAt(page, 2026, 5, 10, 11)).includes('morning'), '11:00 is morning');
  const noon = await tagsAt(page, 2026, 5, 10, 12);
  assert.ok(noon.includes('afternoon'), '12:00 is afternoon');
  assert.ok(!noon.includes('morning'), '12:00 must not also be morning');
  assert.ok((await tagsAt(page, 2026, 5, 10, 16)).includes('afternoon'), '16:00 is afternoon');
  assert.ok((await tagsAt(page, 2026, 5, 10, 17)).includes('evening'), '17:00 is evening');
  assert.ok((await tagsAt(page, 2026, 5, 10, 23)).includes('evening'), '23:00 is evening');

  // ── exactly one time-of-day tag, always. Two would make selection order load-bearing
  //    in a way the copy author cannot see.
  for (const h of [0, 6, 11, 12, 15, 17, 20, 23]) {
    const t = await tagsAt(page, 2026, 5, 10, h);
    const tod = t.filter(function (x) { return ['morning', 'afternoon', 'evening'].includes(x); });
    assert.strictEqual(tod.length, 1, h + ':00 produced ' + tod.length + ' time-of-day tags: ' + tod);
  }

  // ── date windows. Month is 0-based in the Date constructor: 9 = October, 11 = December.
  assert.ok((await tagsAt(page, 2026, 9, 25, 12)).includes('halloween'), '25 Oct is halloween');
  assert.ok((await tagsAt(page, 2026, 9, 31, 23)).includes('halloween'), '31 Oct 23:00 is still halloween');
  assert.ok(!(await tagsAt(page, 2026, 9, 24, 12)).includes('halloween'), '24 Oct is not halloween');
  assert.ok(!(await tagsAt(page, 2026, 10, 1, 12)).includes('halloween'), '1 Nov is not halloween');
  assert.ok((await tagsAt(page, 2026, 11, 18, 12)).includes('holidays'), '18 Dec is holidays');
  assert.ok((await tagsAt(page, 2026, 11, 31, 12)).includes('holidays'), '31 Dec is holidays');
  assert.ok((await tagsAt(page, 2027, 0, 1, 12)).includes('holidays'), '1 Jan is holidays');
  assert.ok(!(await tagsAt(page, 2027, 0, 2, 12)).includes('holidays'), '2 Jan is not holidays');
  // MLK Day is the third Monday in January: 19 Jan 2026, 18 Jan 2027.
  assert.ok((await tagsAt(page, 2026, 0, 19, 12)).includes('mlk-day'), '19 Jan 2026 is MLK Day');
  assert.ok((await tagsAt(page, 2027, 0, 18, 12)).includes('mlk-day'), '18 Jan 2027 is MLK Day');
  assert.ok(!(await tagsAt(page, 2026, 0, 12, 12)).includes('mlk-day'), '12 Jan 2026 is the 2nd Monday');

  // ── THE ELECTION DATE IS A RULE, NOT A TABLE. First Tuesday after the first Monday in
  //    November of an even year. A table is a thing somebody has to remember to extend, and
  //    the failure when they don't is silent — the countdown just never appears again, in an
  //    off year, on a page nobody is watching. So the rule is asserted against four real
  //    cycles: this is the thing that would otherwise be wrong forever.
  assert.deepStrictEqual(await electionFor(page, 2022), [2022, 10, 8], '2022 election is 8 Nov');
  assert.deepStrictEqual(await electionFor(page, 2024), [2024, 10, 5], '2024 election is 5 Nov');
  assert.deepStrictEqual(await electionFor(page, 2026), [2026, 10, 3], '2026 election is 3 Nov');
  assert.deepStrictEqual(await electionFor(page, 2028), [2028, 10, 7], '2028 election is 7 Nov');
  assert.strictEqual(await electionFor(page, 2027), null, 'no federal election in an odd year');

  // ── the fact itself. It looks FORWARD and is never null and never negative, which is what
  //    keeps "{days}" from ever rendering as an empty string or a minus number.
  assert.strictEqual(await daysAt(page, 2026, 10, 3), 0, 'election day is 0');
  assert.strictEqual(await daysAt(page, 2026, 10, 2), 1, 'the day before is 1');
  assert.strictEqual(await daysAt(page, 2026, 9, 4), 30, '4 Oct is 30 days out');
  assert.strictEqual(await daysAt(page, 2026, 10, 4), 734, 'the day after rolls to the 2028 election');
  assert.strictEqual(await daysAt(page, 2027, 5, 15), 511, 'mid odd-year still counts forward');

  // ── session facts, and the guest/first-visit defaults with no session at all
  const guest = await tagsAt(page, 2026, 5, 10, 9);
  assert.ok(guest.includes('guest'), 'no session means guest');
  assert.ok(guest.includes('first-visit'), 'nothing in storage means first-visit');
  assert.ok(!guest.includes('named'), 'no name means no named tag');

  const known = await page.evaluate(function () {
    window.EVSession = { loggedIn: true, name: 'Chris' };
    return window.EVLines.context({ now: new Date(2026, 5, 10, 9) }).tags;
  });
  assert.ok(known.includes('logged-in'), 'EVSession.loggedIn must produce logged-in');
  assert.ok(known.includes('named'), 'a name must produce named');
  assert.ok(!known.includes('guest'), 'signed in must not also be guest');

  // ── caller-side facts arrive per call, not from the ambient context
  const cf = await page.evaluate(function () {
    return {
      found: window.EVLines.context({ toolsFound: true }).tags,
      notFound: window.EVLines.context({ toolsFound: false }).tags,
      gone: window.EVLines.context({ buttonsVisible: false }).tags,
      shown: window.EVLines.context({ buttonsVisible: true }).tags
    };
  });
  assert.ok(cf.found.includes('tools-found'), 'toolsFound must produce tools-found');
  // The other direction of the same predicate, so an always-true implementation (one that
  // ignores its argument) cannot slip through. buttons-gone already gets both directions
  // below; tools-found only had the positive one, which is the gap this closes.
  assert.ok(!cf.notFound.includes('tools-found'), 'toolsFound:false must not produce tools-found');
  assert.ok(cf.gone.includes('buttons-gone'), 'buttonsVisible:false must produce buttons-gone');
  assert.ok(!cf.shown.includes('buttons-gone'), 'buttonsVisible:true must not produce buttons-gone');

  await page.close();

  // ── ?evlines= pins the tags, so a seasonal line can be looked at in June
  const forced = await makePage(browser, '?evlines=halloween,evening');
  const ft = await forced.evaluate(function () {
    return window.EVLines.context({ now: new Date(2026, 5, 10, 9) }).tags;
  });
  assert.deepStrictEqual(ft.slice().sort(), ['evening', 'halloween'],
    'forced tags must REPLACE the derived ones, got: ' + ft.join(','));
  await forced.close();

  // ── ?evdays= is the lever for the NUMBER, and it has one job. A value that is not a
  //    non-negative integer is ignored outright rather than reaching {days}: without this,
  //    ?evdays=abc puts "Election Day is NaN days away" in the greeter's mouth.
  for (const bad of ['abc', '', '-5', '1.5', '1e3', ' 7']) {
    const p = await makePage(browser, '?evdays=' + encodeURIComponent(bad));
    assert.strictEqual(await daysAt(p, 2026, 10, 1), 2,
      '?evdays=' + JSON.stringify(bad) + ' must be ignored, not override the real count');
    await p.close();
  }
  const pinned = await makePage(browser, '?evdays=7');
  assert.strictEqual(await daysAt(pinned, 2026, 5, 10), 7, '?evdays=7 overrides the count');
  assert.strictEqual(await daysAt(pinned, 2026, 10, 3), 7, '?evdays= wins over the real date too');
  await pinned.close();

  // ── returning is snapshotted at load, so a tool hover during the visit cannot
  //    retroactively make a first-timer "returning"
  const ret = await browser.newPage();
  await ret.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await ret.addInitScript(function () {
    try { localStorage.setItem('ev:greeted', '1'); } catch (e) {}
  });
  await ret.goto(BASE);
  const before = await ret.evaluate(function () { return window.EVLines.context().tags; });
  assert.ok(before.includes('returning'), 'ev:greeted set before load must mean returning');
  assert.ok(!before.includes('first-visit'), 'returning and first-visit are exclusive');
  await ret.close();

  const late = await browser.newPage();
  await late.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await late.goto(BASE);
  const after = await late.evaluate(function () {
    try { localStorage.setItem('ev:greeted', '1'); } catch (e) {}   // as noteToolsFound() does
    return window.EVLines.context().tags;
  });
  assert.ok(after.includes('first-visit'),
    'a flag written AFTER load must not turn a first-timer into a returning visitor');
  await late.close();

  // ── locale-aware get() — pickLocale() triggers setLocale() on every context call
  const de = await browser.newPage({ locale: 'de-DE' });
  await de.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await de.goto(BASE);
  await de.evaluate(function () {
    window.EVCopy.register('de', { 'greet.hello': 'Guten Tag' });
    window.EVLines.context();  // triggers pickLocale(), which should call setLocale('de')
  });
  const deHello = await de.evaluate(function () {
    return window.EVCopy.get('greet.hello');
  });
  assert.strictEqual(deHello, 'Guten Tag', 'de locale should return German string');
  await de.close();

  // ── negative: en-US page with de pack should still get English
  const enStable = await browser.newPage();
  await enStable.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await enStable.goto(BASE);
  await enStable.evaluate(function () {
    window.EVCopy.register('de', { 'greet.hello': 'Guten Tag' });
    window.EVLines.context();
  });
  const enHello = await enStable.evaluate(function () {
    return window.EVCopy.get('greet.hello');
  });
  assert.strictEqual(enHello, 'Hi there. Welcome to Empowered Vote.', 'en-US locale should return English despite de pack');
  await enStable.close();

  console.log('02-predicates: PASS');
  await browser.close();
})();
