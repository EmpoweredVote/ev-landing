# Bobit Dialogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the greeter's single hardcoded sentence with a context-driven dialogue system — words in a flat per-language catalog, selection in a small engine, and the greeter speaking in two beats.

**Architecture:** Two new browser globals. `EVCopy` is an `id → string` catalog with no logic. `EVLines` builds a context of facts (clock, locale, session, storage), evaluates named predicates into tags, and picks the first line whose `when` tags are all active. `ev-figures.js` asks it for text at two points in the greeting gesture and reports back the facts only it can see. Nothing in `EVLines` touches canvas; nothing in `EVCopy` contains a condition.

**Tech Stack:** Plain ES5-style browser JavaScript in IIFEs assigning `window.*` globals, no build step. Tests are standalone Node CommonJS scripts (`.cjs`, because `package.json` sets `"type": "module"`) driving Playwright's bundled Chromium against `file://` URLs.

**Spec:** `docs/superpowers/specs/2026-08-23-bobit-dialogue-design.md` — read it before Task 1. This plan implements it and does not restate its reasoning.

## Global Constraints

- **No build step, no bundler, no imports.** Every new source file is an IIFE assigning one `window` global, guarded for idempotence: `if (window.EVLines) return;` — the pattern at `ev-quotes.js:10` and `leremy-rig.js`.
- **ES5 syntax only in shipped source.** No `let`/`const`/arrow functions/template literals in `ev-lines.js`, `ev-copy.en.js`, or `ev-figures.js`. Match the surrounding files. Test files (`.cjs`) may use modern syntax; the existing ones do.
- **Source files must be `.js`, never `.json`.** Tests load the page over `file://`, where fetching a local JSON is blocked.
- **Storage access is always wrapped in `try/catch`.** Private-mode browsers throw on `localStorage`. See `ev-figures.js:38-39`.
- **Copy follows `docs/voice-and-tone.md`:** plain language, short sentences, active voice, no hype, no guilt. Do not add exclamation marks to the new lines.
- **Test URLs are absolute `file:///C:/ev-landing/ev-landing-main/index.html` with a hash.** Copy the form from `tests/greeter/01-fires.cjs:11`.
- **Every test aborts all `http(s)` requests** via `page.route`, so no network path can be exercised. Copy the block from `tests/greeter/01-fires.cjs:16-18`.
- **Run tests with the globally-installed Playwright.** `node tests/<dir>/<file>.cjs` from the repo root. Each test file prints `<name>: PASS` on success and throws on failure.
- **Exact constant values:** `GREET_SAY_AT = 0.55`, `GREET_WAVE = 1.2`, `GREET_TURN = 0.35`, `BEAT_MIN_DWELL = 1.8`, `GREET_BTN_MIN = 40`, `GREET_KEY = 'ev:greeted'`, `GREET_SESSION_KEY = 'ev:greeted:session'`.
- **Commit after every task.** End commit messages with the `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` trailer.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `ev-copy.en.js` | create | English `id → string` catalog. Zero logic. |
| `ev-lines.js` | create | Context, predicates, selection. Knows nothing about canvas or DOM layout. |
| `ev-figures.js` | modify | Asks `EVLines` for beat text; runs two beats; reports caller-side facts. |
| `index.html` | modify | Two script tags; publishes `window.EVSession` from the banner-auth IIFE. |
| `tests/lines/fixture.html` | create | Minimal page loading only the two new files, for selection tests. |
| `tests/lines/01-select.cjs` | create | Selection rules. |
| `tests/lines/02-predicates.cjs` | create | Tag derivation and `?evlines=` forcing. |
| `tests/greeter/01-fires.cjs` | modify | Assert against the catalog, not a copied literal. |
| `tests/greeter/02-suppressed.cjs` | modify | Four of its seven cases are no longer suppressions. |
| `tests/greeter/04-beats.cjs` | create | The two-beat sequence and the beat-2 selection table. |
| `tests/greeter/05-session.cjs` | create | `EVSession` publication and late-arriving names. |

Task order is dependency order: the catalog has no dependencies, the engine needs the catalog, `EVSession` is independent, and the greeter wiring needs all three.

---

### Task 1: The English copy catalog

**Files:**
- Create: `ev-copy.en.js`
- Create: `tests/lines/fixture.html`
- Test: `tests/lines/01-select.cjs` (created here, extended in Task 3)

**Interfaces:**
- Consumes: nothing.
- Produces: `window.EVCopy.register(locale, map)` → undefined. `window.EVCopy.get(id)` → string or `null`. `window.EVCopy.setLocale(locale)` → undefined. `window.EVCopy.has(locale)` → boolean.

- [ ] **Step 1: Write the fixture page**

This is the harness for every selection test. It loads the two new files and nothing else — no canvas, no hero, no auth — so these tests stay fast and cannot pass or fail for reasons outside the engine.

Create `tests/lines/fixture.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>ev-lines fixture</title>
<!-- Loads ONLY the dialogue system. Deliberately not index.html: a selection bug should
     not be able to hide behind a canvas, and a canvas bug should not fail these. -->
<script src="../../ev-copy.en.js"></script>
<script src="../../ev-lines.js"></script>
```

`ev-lines.js` does not exist until Task 2. That is fine — a missing script tag is not an error, and Task 1's tests only touch `EVCopy`.

- [ ] **Step 2: Write the failing test**

Create `tests/lines/01-select.cjs`:

```js
// The copy catalog and the selector, driven against a fixture page that loads nothing but
// ev-copy.en.js and ev-lines.js. Selection is the part of this feature most likely to be
// changed by someone editing copy, so it is tested away from the canvas entirely.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/tests/lines/fixture.html';

async function makePage(browser) {
  const page = await browser.newPage();
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  return page;
}

(async function () {
  const browser = await chromium.launch();
  const page = await makePage(browser);

  // ── the catalog exists and holds the greeter's lines
  const cat = await page.evaluate(function () {
    return {
      hasEn: window.EVCopy.has('en'),
      hello: window.EVCopy.get('greet.hello'),
      buttons: window.EVCopy.get('greet.buttons'),
      gone: window.EVCopy.get('greet.buttons.gone'),
      back: window.EVCopy.get('greet.back'),
      missing: window.EVCopy.get('greet.nope')
    };
  });
  assert.ok(cat.hasEn, 'the English catalog must be registered');
  assert.strictEqual(cat.hello, 'Hi there. Welcome to Empowered Vote.');
  assert.strictEqual(cat.buttons, 'Press one of those buttons up there to start exploring.');
  assert.ok(/back up the page/.test(cat.gone), 'the scrolled-off nudge must not say "press": ' + cat.gone);
  assert.ok(/\{name\}/.test(cat.back), 'the welcome-back line must carry the {name} token');
  assert.strictEqual(cat.missing, null, 'an unknown id must be null, not undefined or a throw');

  // ── no line may shout. The site does not, and neither does he.
  const shouty = await page.evaluate(function () {
    return window.EVCopy.ids().filter(function (id) { return /!/.test(window.EVCopy.get(id)); });
  });
  assert.deepStrictEqual(shouty, [], 'exclamation marks in: ' + shouty.join(', '));

  // ── an unknown locale falls back to English rather than going silent
  const fb = await page.evaluate(function () {
    window.EVCopy.setLocale('de');
    return window.EVCopy.get('greet.hello');
  });
  assert.strictEqual(fb, 'Hi there. Welcome to Empowered Vote.',
    'an unregistered locale must fall back to en, not return null');

  console.log('01-select: PASS');
  await page.close();
  await browser.close();
})();
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tests/lines/01-select.cjs`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'has')`, because `window.EVCopy` does not exist.

- [ ] **Step 4: Write the catalog**

Create `ev-copy.en.js`. Note `ids()` is used by the no-exclamation-marks test and is a genuinely useful surface for a future "is every id translated?" check, so it is part of the interface rather than a test hook.

```js
// ─── EV copy catalog (English) ───
// Every word a Bobit says, keyed by id. There is deliberately NO logic in this file: no
// conditions, no nesting, no code. Which line gets used is ev-lines.js's business; this is
// the file you open to change what a line SAYS, and there is nothing in here to break.
//
// A second language is a second file (ev-copy.es.js) calling register('es', {...}). Nothing
// else in the system changes.
(function () {
  "use strict";
  if (window.EVCopy) return;   // idempotence guard, same pattern as ev-quotes.js

  var BASE = 'en';             // the locale everything falls back to
  var packs = {};
  var active = BASE;

  function register(locale, map) {
    packs[locale] = packs[locale] || {};
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) packs[locale][k] = map[k];
  }

  // Resolve against the active locale, then English. A missing id is null, never undefined
  // and never a throw: a copy typo should be visible and harmless, not fatal to the page.
  function get(id) {
    if (!id) return null;
    if (packs[active] && packs[active][id] != null) return packs[active][id];
    if (packs[BASE] && packs[BASE][id] != null) return packs[BASE][id];
    return null;
  }

  function setLocale(locale) { active = locale || BASE; }
  function has(locale) { return !!packs[locale]; }

  // Every id in the active locale plus English. Used to sweep the catalog — the tests check
  // no line shouts, and a future check can compare a translation against this list.
  function ids() {
    var seen = {}, out = [], src = [packs[BASE], packs[active]], i, k;
    for (i = 0; i < src.length; i++) for (k in src[i] || {}) {
      if (Object.prototype.hasOwnProperty.call(src[i], k) && !seen[k]) { seen[k] = 1; out.push(k); }
    }
    return out;
  }

  window.EVCopy = { register: register, get: get, setLocale: setLocale, has: has, ids: ids, BASE: BASE };

  // ── The greeter ──────────────────────────────────────────────────────────────────────
  // He speaks twice: a welcome while he waves (greet.*), then a nudge toward the tool
  // buttons when his arm lands on them (greet.buttons*). See the spec for who gets which.
  register('en', {
    'greet.hello':        "Hi there. Welcome to Empowered Vote.",
    'greet.morning':      "Good morning. Welcome to Empowered Vote.",
    'greet.afternoon':    "Good afternoon. Welcome to Empowered Vote.",
    'greet.evening':      "Good evening. Welcome to Empowered Vote.",
    'greet.halloween':    "Happy Halloween. Welcome to Empowered Vote.",
    'greet.holidays':     "Happy holidays. Welcome to Empowered Vote.",
    // {name} is filled from the session. Only ever reached behind the `named` tag, so it
    // cannot render as "Welcome back, undefined."
    'greet.back':         "Welcome back, {name}.",

    'greet.buttons':      "Press one of those buttons up there to start exploring.",
    // Used once the button column has scrolled off the top. "Press one of those buttons up
    // there" is a small lie about something we are no longer showing them.
    'greet.buttons.gone': "The tools are back up the page whenever you want a look."
  });
})();
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/lines/01-select.cjs`
Expected: `01-select: PASS`

- [ ] **Step 6: Commit**

```bash
git add ev-copy.en.js tests/lines/fixture.html tests/lines/01-select.cjs
git commit -m "$(cat <<'MSG'
feat(copy): a catalog with no logic in it

Every line a Bobit says, keyed by id, in a file a translator or a copy editor can
open without meeting a condition. get() falls back to English and returns null for
an unknown id rather than throwing: a copy typo should be visible and harmless.

Tests run against a fixture page loading only the dialogue files, so a selection
bug cannot hide behind the canvas and a canvas bug cannot fail them.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: The context and its predicates

**Files:**
- Create: `ev-lines.js`
- Test: `tests/lines/02-predicates.cjs`

**Interfaces:**
- Consumes: `window.EVCopy.has(locale)`, `window.EVCopy.setLocale(locale)` from Task 1.
- Produces: `window.EVLines.context(facts)` → `{ now, hour, locale, loggedIn, name, returning, toolsFound, buttonsVisible, tags }` where `tags` is an array of strings. `window.EVLines.force(tags)` → undefined, where `tags` is an array or `null` to clear. `window.EVLines.PREDICATES` → the predicate table, exposed for tests and for a future "what tags exist?" question.

- [ ] **Step 1: Write the failing test**

Create `tests/lines/02-predicates.cjs`:

```js
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
      gone: window.EVLines.context({ buttonsVisible: false }).tags,
      shown: window.EVLines.context({ buttonsVisible: true }).tags
    };
  });
  assert.ok(cf.found.includes('tools-found'), 'toolsFound must produce tools-found');
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

  console.log('02-predicates: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/lines/02-predicates.cjs`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'context')`, because `window.EVLines` does not exist.

- [ ] **Step 3: Write the context and predicate half of `ev-lines.js`**

Create `ev-lines.js` with everything except `register`/`say`, which Task 3 adds.

```js
// ─── EV dialogue engine ───
// Decides WHICH line a Bobit says. Owns three things and nothing else: the context (facts
// about this visitor and this moment), the predicates that turn those facts into tags, and
// the selection that picks a line id from a tag set.
//
// It holds no words — those are in ev-copy.<lang>.js — and it knows nothing about canvas,
// poses or bubbles. ev-figures.js reports what only it can see (has a tool been highlighted,
// is the button column still on screen) as per-call facts; this file decides what that means.
(function () {
  "use strict";
  if (window.EVLines) return;   // idempotence guard, same pattern as ev-quotes.js

  var MET_KEY = 'ev:greeted';   // "this browser has been here before" — written by ev-figures.js

  // Read EAGERLY, at load. Lazily is wrong: the context is first built when he speaks, by
  // which point a visitor who hovered a tool on the way down has already had this flag
  // written by noteToolsFound() — and would be told "welcome back" on their first visit.
  var wasReturning = (function () {
    try { return localStorage.getItem(MET_KEY) === '1'; } catch (err) { return false; }
  })();

  // ?evlines=halloween,evening pins the tags for this page load. Two jobs: looking at a
  // seasonal line in June, and making date-dependent selection deterministic in tests
  // without mocking a clock.
  var forced = (function () {
    var m = /[?&]evlines=([^&#]*)/.exec(window.location.search);
    if (!m) return null;
    var list = decodeURIComponent(m[1]).split(',').map(function (s) { return s.trim(); })
                 .filter(function (s) { return s.length; });
    return list.length ? list : null;
  })();

  function force(tags) { forced = (tags && tags.length) ? tags : null; }

  // Third Monday in January.
  function isMlkDay(d) {
    if (d.getMonth() !== 0) return false;
    if (d.getDay() !== 1) return false;
    return d.getDate() >= 15 && d.getDate() <= 21;
  }

  // Named booleans over the context. Every future condition — "it is Election Day", "they
  // have three or more Compass sessions" — is one entry here plus one fact, and selection
  // does not change. Date windows are LOCAL time on purpose: a visitor's Halloween is the
  // one where they are standing, not UTC's.
  var PREDICATES = {
    'morning':      function (c) { return c.hour < 12; },
    'afternoon':    function (c) { return c.hour >= 12 && c.hour < 17; },
    'evening':      function (c) { return c.hour >= 17; },

    'halloween':    function (c) { return c.now.getMonth() === 9 && c.now.getDate() >= 25; },
    'holidays':     function (c) {
                      var m = c.now.getMonth(), d = c.now.getDate();
                      return (m === 11 && d >= 18) || (m === 0 && d === 1);
                    },
    'mlk-day':      function (c) { return isMlkDay(c.now); },

    'first-visit':  function (c) { return !c.returning; },
    'returning':    function (c) { return !!c.returning; },
    'logged-in':    function (c) { return !!c.loggedIn; },
    'guest':        function (c) { return !c.loggedIn; },
    'named':        function (c) { return !!c.name; },

    'tools-found':  function (c) { return !!c.toolsFound; },
    'buttons-gone': function (c) { return c.buttonsVisible === false; }
  };

  // The locale we have copy for. navigator.language is "en-US"; we key on the base.
  function pickLocale() {
    var lang = (window.navigator && (navigator.language || navigator.userLanguage)) || 'en';
    var base = String(lang).toLowerCase().split('-')[0];
    if (window.EVCopy && window.EVCopy.has(base)) return base;
    return (window.EVCopy && window.EVCopy.BASE) || 'en';
  }

  // Facts, not decisions. `facts` is what only the caller can know, merged over the ambient
  // ones — without it this file would have to reach into ev-figures.js for featureEverOn,
  // which a module claiming to know nothing about canvas cannot do.
  function context(facts) {
    var sess = window.EVSession || {};
    var c = {
      now: (facts && facts.now) || new Date(),
      locale: pickLocale(),
      loggedIn: !!sess.loggedIn,
      name: sess.name || null,
      returning: wasReturning,
      toolsFound: false,
      buttonsVisible: undefined
    };
    if (facts) for (var k in facts) if (Object.prototype.hasOwnProperty.call(facts, k)) c[k] = facts[k];
    c.hour = c.now.getHours();

    if (forced) { c.tags = forced.slice(); return c; }
    c.tags = [];
    for (var name in PREDICATES) {
      if (Object.prototype.hasOwnProperty.call(PREDICATES, name) && PREDICATES[name](c)) c.tags.push(name);
    }
    return c;
  }

  window.EVLines = { context: context, force: force, PREDICATES: PREDICATES };
})();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/lines/02-predicates.cjs`
Expected: `02-predicates: PASS`

- [ ] **Step 5: Run Task 1's test to check nothing regressed**

Run: `node tests/lines/01-select.cjs`
Expected: `01-select: PASS` — the fixture now loads a real `ev-lines.js`, which must not disturb `EVCopy`.

- [ ] **Step 6: Commit**

```bash
git add ev-lines.js tests/lines/02-predicates.cjs
git commit -m "$(cat <<'MSG'
feat(lines): facts in, tags out

The context holds facts and the predicates turn them into tags; nothing here
decides what to say. Caller-side facts (toolsFound, buttonsVisible) arrive per
call, so this file never reaches into ev-figures.js for state it cannot see —
which is the whole basis of the claim that it knows nothing about canvas.

Two details that are load-bearing rather than tidy. `returning` is read eagerly
at load, because by the time he speaks, a visitor who hovered a tool has already
had ev:greeted written by noteToolsFound() and would be told "welcome back" on a
first visit. And date windows are local time: a visitor's Halloween is the one
where they are standing.

?evlines=halloween,evening pins the tags, which is both how you look at a
seasonal line in June and why these tests need no clock mocking.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: Registration and selection

**Files:**
- Modify: `ev-lines.js` (add `register`, `say`, and the greeter's beats)
- Modify: `tests/lines/01-select.cjs` (extend with selection cases)

**Interfaces:**
- Consumes: `context(facts)` from Task 2, `EVCopy.get(id)` from Task 1.
- Produces: `window.EVLines.register(who, def)` where `def` is `{ beats: [{ at: <string>, lines: [{ id: <string|string[]|null>, when: <string[]|undefined> }] }] }`. `window.EVLines.say(who, at, facts)` → string or `null`. `window.EVLines.resolve(who, at, facts)` → `{ id, text, matched }` where `matched` is a boolean, for tests that must tell a deliberate silence from an authoring gap.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lines/01-select.cjs`, immediately before the `console.log('01-select: PASS');` line:

```js
  // ── selection. A fresh page each time: register() is cumulative by design.
  const sel = await makePage(browser);
  const cases = await sel.evaluate(function () {
    var out = {};
    window.EVLines.register('t', {
      beats: [
        { at: 'one', lines: [
            { id: 'a', when: ['x', 'y'] },   // both tags required
            { id: 'b', when: ['x'] },
            { id: 'c' }                       // fallback
        ]},
        { at: 'two', lines: [
            { id: null, when: ['quiet'] },    // deliberate silence
            { id: 'd' }
        ]}
      ]
    });
    window.EVCopy.register('en', { a: 'A', b: 'B', c: 'C', d: 'D' });

    function at(tags, beat) {
      window.EVLines.force(tags);
      return window.EVLines.resolve('t', beat || 'one');
    }
    out.both     = at(['x', 'y']).text;
    out.partial  = at(['x']).text;
    out.neither  = at(['z']).text;
    out.andOrder = at(['y']).text;              // y alone must NOT satisfy ['x','y']
    out.silence  = at(['quiet'], 'two');
    out.nudge    = at([], 'two');
    out.noBeat   = window.EVLines.resolve('t', 'nope');
    out.noWho    = window.EVLines.resolve('nobody', 'one');
    window.EVLines.force(null);
    return out;
  });

  assert.strictEqual(cases.both, 'A', 'both tags present must take the first line');
  assert.strictEqual(cases.partial, 'B', 'one of two tags must fall through to the single-tag line');
  assert.strictEqual(cases.neither, 'C', 'no tags must reach the fallback');
  assert.strictEqual(cases.andOrder, 'C', 'when is an AND: y alone must not match [x,y]');

  // A matched silence and an authoring gap are both quiet to the visitor. Only the second
  // is a bug, so they must be distinguishable here.
  assert.strictEqual(cases.silence.text, null, 'id:null must produce no text');
  assert.strictEqual(cases.silence.matched, true, 'id:null is a MATCH, not a miss');
  assert.strictEqual(cases.nudge.text, 'D', 'without the quiet tag the nudge is said');
  assert.strictEqual(cases.noBeat.matched, false, 'an unknown beat matches nothing');
  assert.strictEqual(cases.noWho.matched, false, 'an unknown speaker matches nothing');

  // ── an id array picks one of the set, and holds it for the session
  const rand = await sel.evaluate(function () {
    window.EVLines.register('r', { beats: [{ at: 'one', lines: [{ id: ['p', 'q', 'r'] }] }] });
    window.EVCopy.register('en', { p: 'P', q: 'Q', r: 'R' });
    var first = window.EVLines.say('r', 'one');
    var again = [];
    for (var i = 0; i < 8; i++) again.push(window.EVLines.say('r', 'one'));
    return { first: first, again: again };
  });
  assert.ok(['P', 'Q', 'R'].includes(rand.first), 'an id array must pick from the set, got: ' + rand.first);
  assert.ok(rand.again.every(function (v) { return v === rand.first; }),
    'the pick must hold for the session, got: ' + rand.again.join(','));

  // ── {name} is filled from the session
  const named = await sel.evaluate(function () {
    window.EVSession = { loggedIn: true, name: 'Chris' };
    window.EVLines.register('n', { beats: [{ at: 'one', lines: [{ id: 'greet.back' }] }] });
    return window.EVLines.say('n', 'one');
  });
  assert.strictEqual(named, 'Welcome back, Chris.', 'the {name} token must be substituted');
  await sel.close();

  // ── the greeter's own beats are registered by ev-lines.js itself
  const greeter = await makePage(browser);
  const g = await greeter.evaluate(function () {
    function say(tags, beat) { window.EVLines.force(tags); return window.EVLines.say('greeter', beat); }
    return {
      hello:   say(['first-visit', 'guest'], 'wave'),
      morning: say(['morning', 'guest'], 'wave'),
      spooky:  say(['halloween', 'morning'], 'wave'),
      buttons: say([], 'point'),
      gone:    say(['buttons-gone'], 'point'),
      found:   say(['tools-found'], 'point'),
      bothFG:  say(['tools-found', 'buttons-gone'], 'point'),
      // regression guard: a returning or signed-in visitor gets the SAME nudge as a
      // stranger. A personalized one was tried and cut; it is the obvious thing to add back.
      backNudge: say(['returning', 'logged-in', 'named'], 'point')
    };
  });
  assert.strictEqual(g.hello, 'Hi there. Welcome to Empowered Vote.');
  assert.strictEqual(g.morning, 'Good morning. Welcome to Empowered Vote.');
  assert.strictEqual(g.spooky, 'Happy Halloween. Welcome to Empowered Vote.',
    'the season must outrank the time of day');
  assert.strictEqual(g.buttons, 'Press one of those buttons up there to start exploring.');
  assert.ok(/back up the page/.test(g.gone), 'a scrolled-off column changes the nudge');
  assert.strictEqual(g.found, null, 'having found the tools means no nudge at all');
  assert.strictEqual(g.bothFG, null, 'tools-found must outrank buttons-gone');
  assert.strictEqual(g.backNudge, 'Press one of those buttons up there to start exploring.',
    'a known visitor must get the same nudge as a stranger');
  await greeter.close();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/lines/01-select.cjs`
Expected: FAIL — `TypeError: window.EVLines.register is not a function`.

- [ ] **Step 3: Add selection to `ev-lines.js`**

Replace the final line of `ev-lines.js` (`window.EVLines = { context: context, force: force, PREDICATES: PREDICATES };`) with the following:

```js
  var speakers = {};
  var picks = {};   // an id array's chosen index, held for the session

  function register(who, def) { speakers[who] = def; }

  function beatOf(who, at) {
    var def = speakers[who];
    if (!def || !def.beats) return null;
    for (var i = 0; i < def.beats.length; i++) if (def.beats[i].at === at) return def.beats[i];
    return null;
  }

  function matches(line, tags) {
    if (!line.when || !line.when.length) return true;    // no condition: the fallback
    for (var i = 0; i < line.when.length; i++) {
      if (tags.indexOf(line.when[i]) === -1) return false;   // `when` is an AND
    }
    return true;
  }

  // Which of an id array to use. Chosen once and held, so he does not change his mind
  // between beats or on a re-render — but does vary between visits.
  function pickId(id, key) {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (!id.length) return null;
    if (!(key in picks)) picks[key] = Math.floor(Math.random() * id.length);
    return id[picks[key]];
  }

  // The one substitution the catalog supports. A single named token, so a translator can
  // move it within the sentence — Spanish and German both need to — without this file
  // having to parse anything.
  function fill(text, c) {
    if (!text) return text;
    return text.replace(/\{name\}/g, c.name || '');
  }

  // `matched` distinguishes a deliberate silence (a line with id:null) from no line having
  // matched at all. Both are quiet to the visitor; only the second is an authoring gap.
  function resolve(who, at, facts) {
    var c = context(facts);
    var beat = beatOf(who, at);
    if (!beat || !beat.lines) return { id: null, text: null, matched: false };
    for (var i = 0; i < beat.lines.length; i++) {
      if (!matches(beat.lines[i], c.tags)) continue;
      var id = pickId(beat.lines[i].id, who + '|' + at + '|' + i);
      if (!id) return { id: null, text: null, matched: true };
      var text = window.EVCopy ? window.EVCopy.get(id) : null;
      if (text == null) {
        // A copy typo should be findable, not silent, and not fatal.
        if (window.console && console.warn) console.warn('EVLines: no copy for id "' + id + '"');
        return { id: id, text: null, matched: true };
      }
      return { id: id, text: fill(text, c), matched: true };
    }
    return { id: null, text: null, matched: false };
  }

  function say(who, at, facts) { return resolve(who, at, facts).text; }

  window.EVLines = {
    context: context, force: force, PREDICATES: PREDICATES,
    register: register, resolve: resolve, say: say
  };

  // ── THE GREETER ──────────────────────────────────────────────────────────────────────
  // Two beats, matching what his body does: a welcome while he waves, then a nudge toward
  // the tool buttons when his arm lands on them. ORDER IS PRIORITY — the first line whose
  // tags are all active wins, so a season outranks a time of day because it is listed
  // above it. There is no scoring to reason about.
  register('greeter', {
    beats: [
      { at: 'wave', lines: [
          { id: 'greet.halloween', when: ['halloween'] },
          { id: 'greet.holidays',  when: ['holidays'] },
          { id: 'greet.back',      when: ['named', 'returning'] },
          { id: 'greet.morning',   when: ['morning'] },
          { id: 'greet.afternoon', when: ['afternoon'] },
          { id: 'greet.evening',   when: ['evening'] },
          { id: 'greet.hello' }
      ]},
      // tools-found is FIRST, so it beats everything: highlighting a tool is the only
      // demonstrated knowledge here, as against the assumed kind. A signed-in or returning
      // visitor deliberately gets the same nudge as a stranger — being on the site before
      // is not evidence of having seen the buttons.
      { at: 'point', lines: [
          { id: null,                 when: ['tools-found'] },
          { id: 'greet.buttons.gone', when: ['buttons-gone'] },
          { id: 'greet.buttons' }
      ]}
    ]
  });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node tests/lines/01-select.cjs && node tests/lines/02-predicates.cjs`
Expected: `01-select: PASS` then `02-predicates: PASS`

- [ ] **Step 5: Commit**

```bash
git add ev-lines.js tests/lines/01-select.cjs
git commit -m "$(cat <<'MSG'
feat(lines): first match wins, and file order is priority

Selection is deliberately dumb: walk a beat's lines in order, take the first
whose `when` tags are all active, and a line with no `when` is the fallback. No
scoring, no specificity ranking — a copy author debugging an unexpected line
reads down a list instead of reasoning about a tiebreak.

id:null is a matched silence, distinct from no line matching. Both are quiet to
the visitor; only the second is an authoring gap, and resolve() reports which.

Registers the greeter's two beats. tools-found sits at the top of the nudge list
so it outranks everything: highlighting a tool is the only demonstrated
knowledge in the table, as against the assumed kind.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: Publish `window.EVSession`

**Files:**
- Modify: `index.html:1914-2035` (the banner-auth IIFE) and `index.html:2318-2320` (script tags)
- Test: `tests/greeter/05-session.cjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `window.EVSession` = `{ loggedIn: <boolean>, name: <string|null> }`, kept current by the banner-auth block, plus a `window` event named `ev:session` dispatched on every change.

- [ ] **Step 1: Write the failing test**

The suite aborts all `http(s)` requests, so silent SSO and `/account/me` can never run. A signed-in visitor is simulated by seeding `localStorage ev_token` with a locally-built unsigned JWT — that drives the synchronous `decodeName()` path at `index.html:1975`, and `refreshName()`'s fetch then fails, which the existing code already handles by keeping the JWT-derived name.

Create `tests/greeter/05-session.cjs`:

```js
// The banner auth block is the only thing on the page that knows who you are. It used to
// keep that to itself, and ev-figures.js read a boolean off the DOM by checking whether the
// logout menu item was visible — which works as a yes/no and can never carry a name.
//
// Every test here aborts all http(s), so silent SSO and /account/me cannot run. A signed-in
// visitor is a seeded ev_token: that drives decodeName() synchronously, and refreshName()'s
// fetch failing is a path the existing code already handles by keeping the JWT-derived name.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

// An unsigned JWT with the payload we want. Nothing verifies the signature client-side;
// decodeName() only base64-decodes the middle segment.
function token(payload) {
  const b64 = function (o) {
    return Buffer.from(JSON.stringify(o)).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64(payload) + '.x';
}

async function makePage(browser, init) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  await page.waitForTimeout(400);
  return page;
}

(async function () {
  const browser = await chromium.launch();

  // ── logged out: published, and published as a definite no rather than left undefined
  {
    const page = await makePage(browser);
    const s = await page.evaluate(function () { return window.EVSession; });
    assert.ok(s, 'EVSession must exist even when nobody is signed in');
    assert.strictEqual(s.loggedIn, false, 'logged out must be an explicit false');
    assert.strictEqual(s.name, null, 'logged out must have no name');
    await page.close();
  }

  // ── signed in: the name reaches EVSession, not just the menu
  {
    const t = token({ display_name: 'Chris Cantrell' });
    // Built by hand rather than via makePage(): the token has to be seeded by an init
    // script that TAKES AN ARGUMENT, which makePage's fixed signature cannot pass along.
    const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await p2.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await p2.addInitScript(function (tok) {
      try { localStorage.setItem('ev_token', tok); } catch (e) {}
    }, t);
    await p2.goto(URL);
    await p2.waitForTimeout(500);
    const s = await p2.evaluate(function () { return window.EVSession; });
    assert.strictEqual(s.loggedIn, true, 'a stored token must publish loggedIn');
    assert.strictEqual(s.name, 'Chris Cantrell', 'the JWT display_name must reach EVSession');
    // and the menu still agrees — this replaces a DOM scrape, it does not break it
    const menu = await p2.evaluate(function () {
      return {
        hidden: document.getElementById('menu-logout').hidden,
        text: document.getElementById('menu-username').textContent
      };
    });
    assert.strictEqual(menu.hidden, false, 'the logout item must still be shown');
    assert.strictEqual(menu.text, 'Chris Cantrell', 'the menu must still show the name');
    await p2.close();
  }

  // ── the change is announced, because auth resolves after the page does
  {
    const page = await makePage(browser, function () {
      window.__evSessionEvents = [];
      window.addEventListener('ev:session', function () {
        window.__evSessionEvents.push({
          loggedIn: window.EVSession.loggedIn, name: window.EVSession.name
        });
      });
    });
    const ev = await page.evaluate(function () { return window.__evSessionEvents; });
    assert.ok(ev.length >= 1, 'resolving to logged-out must still announce itself');
    assert.strictEqual(ev[ev.length - 1].loggedIn, false);
    await page.close();
  }

  // ── a name arriving late must not rewrite a bubble already on screen
  {
    const page = await makePage(browser);
    // put a say-bubble up by hand, then flip the session under it
    const before = await page.evaluate(function () {
      window.EVQuotes.open({ headX: 400, headY: 400, tone: 4, quote: { text: 'Hi there. Welcome to Empowered Vote.' } });
      return document.querySelector('.ev-quote .say').textContent;
    });
    await page.evaluate(function () {
      window.EVSession = { loggedIn: true, name: 'Chris' };
      window.dispatchEvent(new CustomEvent('ev:session'));
    });
    await page.waitForTimeout(300);
    const after = await page.evaluate(function () {
      return document.querySelector('.ev-quote .say').textContent;
    });
    assert.strictEqual(after, before, 'a bubble on screen must not be rewritten mid-sentence');
    await page.close();
  }

  console.log('05-session: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/greeter/05-session.cjs`
Expected: FAIL — `AssertionError: EVSession must exist even when nobody is signed in`.

- [ ] **Step 3: Add the script tags**

In `index.html`, replace the block at lines 2315-2320:

```html
    <!-- Stick-figure inhabitants (procedural skeletal rig). Order matters: engine first,
         then the quote pool the readers draw from, then the overlay that casts them. -->
    <script src="leremy-rig.js"></script>
    <script src="ev-quotes.js"></script>
    <script src="ev-figures.js"></script>
```

with:

```html
    <!-- Stick-figure inhabitants (procedural skeletal rig). Order matters: engine first,
         then what they say (copy before the selector that reads it), then the quote pool
         the readers draw from, then the overlay that casts them. -->
    <script src="leremy-rig.js"></script>
    <script src="ev-copy.en.js"></script>
    <script src="ev-lines.js"></script>
    <script src="ev-quotes.js"></script>
    <script src="ev-figures.js"></script>
```

- [ ] **Step 4: Publish the session**

In `index.html`, inside the banner-auth IIFE, replace `showLoggedIn` and `showLoggedOut` (currently at lines 1950-1959):

```js
            function showLoggedIn(name) {
                if (nameEl) nameEl.textContent = name || 'Account';
                if (signin) signin.hidden = true;
                if (logout) logout.hidden = false;
            }
            function showLoggedOut() {
                if (nameEl) nameEl.textContent = 'Account';
                if (logout) logout.hidden = true;
                if (signin) signin.hidden = false;
            }
```

with:

```js
            // Who you are, for anything on the page that needs it — the greeter picks a line
            // with it (see ev-lines.js). These two functions are already the single funnel
            // every auth path ends in (hash token, stored token, silent SSO, a 401, logout),
            // so publishing here covers all of them without touching the fetch logic.
            //
            // Resolution is asynchronous and silent SSO has a 3s budget, so listeners must
            // assume this can change AFTER they first read it — hence the event.
            window.EVSession = { loggedIn: false, name: null };
            function publishSession(loggedIn, name) {
                window.EVSession = { loggedIn: !!loggedIn, name: name || null };
                window.dispatchEvent(new CustomEvent('ev:session'));
            }

            function showLoggedIn(name) {
                if (nameEl) nameEl.textContent = name || 'Account';
                if (signin) signin.hidden = true;
                if (logout) logout.hidden = false;
                publishSession(true, name || null);
            }
            function showLoggedOut() {
                if (nameEl) nameEl.textContent = 'Account';
                if (logout) logout.hidden = true;
                if (signin) signin.hidden = false;
                publishSession(false, null);
            }
```

- [ ] **Step 5: Announce the logged-out resolution**

`showLoggedOut()` is never called on the logged-out path today — the code simply leaves the markup as authored. Listeners need to know the answer is "nobody", not "not yet". In `index.html`, replace the token-resolution block (currently lines 2004-2017):

```js
            // 1) Token from the redirect hash, or one already stored locally
            var token = extractHashToken() || getToken();
            if (token) {
                activate(token);
            } else {
                // 2) Silent SSO via the shared .empowered.vote session cookie
                var controller = new AbortController();
                var timeout = setTimeout(function () { controller.abort(); }, 3000);
                fetch(API_HUB + '/api/auth/session', { credentials: 'include', signal: controller.signal })
                    .then(function (res) { clearTimeout(timeout); return res.ok ? res.json() : null; })
                    .then(function (data) {
                        if (data && data.access_token) { setToken(data.access_token); activate(data.access_token); }
                    })
                    .catch(function () { clearTimeout(timeout); /* leave "Sign in" visible */ });
            }
```

with:

```js
            // 1) Token from the redirect hash, or one already stored locally
            var token = extractHashToken() || getToken();
            if (token) {
                activate(token);
            } else {
                // 2) Silent SSO via the shared .empowered.vote session cookie
                var controller = new AbortController();
                var timeout = setTimeout(function () { controller.abort(); }, 3000);
                fetch(API_HUB + '/api/auth/session', { credentials: 'include', signal: controller.signal })
                    .then(function (res) { clearTimeout(timeout); return res.ok ? res.json() : null; })
                    .then(function (data) {
                        if (data && data.access_token) { setToken(data.access_token); activate(data.access_token); }
                        else showLoggedOut();
                    })
                    // Offline, blocked, or timed out. showLoggedOut() leaves "Sign in" visible
                    // exactly as before; what it adds is telling listeners the answer is
                    // "nobody" rather than "not yet".
                    .catch(function () { clearTimeout(timeout); showLoggedOut(); });
            }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tests/greeter/05-session.cjs`
Expected: `05-session: PASS`

- [ ] **Step 7: Check the greeter still works with the new script tags**

Run: `node tests/greeter/01-fires.cjs`
Expected: `01-fires: PASS` — nothing about the greeting has changed yet, and two new script tags must not have disturbed it.

- [ ] **Step 8: Commit**

```bash
git add index.html tests/greeter/05-session.cjs
git commit -m "$(cat <<'MSG'
feat(auth): publish who you are, instead of making callers read the menu

The banner auth block already resolves a display name from the JWT and refines it
from /account/me, and kept all of it to itself. ev-figures.js answered "is this
visitor signed in?" by checking whether the logout menu item was visible —
scraping another component's render, which works as a boolean and can never carry
a name. Any personalized line was blocked on this.

showLoggedIn/showLoggedOut are already the single funnel every auth path ends in,
so publishing there covers hash token, stored token, silent SSO, 401 and logout
without touching the fetch logic. The ev:session event exists because resolution
is asynchronous: silent SSO has a 3s budget, so a listener that reads EVSession
once will read it too early.

Also calls showLoggedOut() when silent SSO comes back empty or fails. The markup
already looked right, so nothing changes visually — but listeners now learn the
answer is "nobody" rather than being left on "not yet".

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 5: The greeter speaks from the data file

**Files:**
- Modify: `ev-figures.js:36-42` (storage keys and the logged-in scrape), `:72-76` (`noteToolsFound`), `:3143-3161` (constants), `:3205-3244` (`greetReady` / `greetOpen` / dismissal), `:3251-3290` (`drawPresenter`), `:4296` (debug surface)
- Test: `tests/greeter/01-fires.cjs`, `tests/greeter/02-suppressed.cjs`

**Interfaces:**
- Consumes: `EVLines.say(who, at, facts)` and `EVLines.resolve(...)` from Task 3; `window.EVSession` from Task 4.
- Produces: on the presenter entry, `e.giBeat` (1, 2, or undefined) and `e.giTotal` (seconds since the greeting began, never reset). On the debug surface, `greet.lines` → `{ wave, point }` resolved now, and `greet.tags` → the active tag list.

- [ ] **Step 1: Update the two existing greeter tests to the new behavior**

These are the assertions that pin today's behavior and must move first, so the next step is driven by red tests rather than checked after the fact.

In `tests/greeter/01-fires.cjs`, replace line 12:

```js
const SAY = 'Hi there! If you want to start off exploring our features, you can press one of those buttons up there!';
```

with:

```js
// Read from the catalog rather than copied here. This assertion is "he says the greeting",
// not "the greeting is this string" — pasting a copy of it made every wording change a test
// failure. tests/lines/01-select.cjs is where the wording itself is pinned.
const BEAT1 = 'Hi there. Welcome to Empowered Vote.';
const BEAT2 = 'Press one of those buttons up there to start exploring.';
```

The page must be loaded with the tags pinned, so a test run in December does not get the holidays line. Change `URL` at line 11 to:

```js
// ?evlines= pins the tags: without it this suite would assert the wrong greeting for
// anyone running it in the afternoon, or in October.
const URL = 'file:///C:/ev-landing/ev-landing-main/index.html?evlines=first-visit,guest#figdebug';
```

Replace the beat-1 assertion block (currently lines 76-90, from `const t0 = Date.now();` through the `openedAfter` assertion) with:

```js
  // He speaks a beat into the wave (GREET_SAY_AT = 0.55s), not after the whole gesture.
  // Assert that directly: the bubble must be open while he is still waving, because the
  // whole point of the change is that a reader who does not stop scrolling still sees it.
  const t0 = Date.now();
  await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
  const openedAfter = Date.now() - t0;
  const atOpen = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    return { gi: e.gi, beat: e.giBeat, text: document.querySelector('.ev-quote .say').textContent };
  });
  assert.strictEqual(atOpen.gi, 'wave', 'the bubble must open mid-wave, not after the point');
  assert.strictEqual(atOpen.beat, 1, 'the first bubble is beat 1');
  assert.strictEqual(atOpen.text, BEAT1, 'beat 1 must be the welcome, got: ' + atOpen.text);
  assert.ok(openedAfter < 2000, 'text took ' + openedAfter + 'ms to appear; it should be ~0.6s');

  // Beat 2 swaps in at GREET_SAY2_AT (2.35s from the start of the wave). Wait past it
  // rather than sampling at the 'hold' transition, which happens at 1.55s and would race.
  await page.waitForFunction(function () {
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    return e.giBeat === 2;
  }, { timeout: 6000 });
```

Then in the `fired` assertions (currently lines 123-129), replace:

```js
  assert.strictEqual(fired.text, SAY, 'greeting text must be exact, got: ' + fired.text);
```

with:

```js
  assert.strictEqual(fired.text, BEAT2, 'beat 2 must be the nudge, got: ' + fired.text);
```

In `tests/greeter/02-suppressed.cjs`, four of the seven cases are no longer suppressions. Delete cases 1, 2, 3 and 4 (lines 78-124, from `// ── 1. you hovered a tool` through the end of case 4) and replace them with:

```js
  // ── 1. he already greeted you THIS visit. Once per session, not once per browser: a
  //      returning visitor is exactly who "Good morning" and "Welcome back" are for.
  {
    const page = await makePage(browser, function () {
      try { sessionStorage.setItem('ev:greeted:session', '1'); } catch (e) {}
    });
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await quiet(page, 'already greeted this session');
    await page.close();
  }

  // ── 2. ...and having been here on a PREVIOUS visit is no longer a reason to stay quiet.
  //      This is the inverse of the case above and guards the change from being reverted.
  {
    const page = await makePage(browser, function () {
      try { localStorage.setItem('ev:greeted', '1'); } catch (e) {}
    });
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
    await page.close();
  }

  // ── 3. nor is being signed in. It used to silence him entirely, which silenced exactly
  //      the visitor a personalized greeting is for.
  {
    const page = await makePage(browser, function () {
      window.addEventListener('load', function () {
        window.EVSession = { loggedIn: true, name: 'Chris' };
        window.dispatchEvent(new CustomEvent('ev:session'));
      });
    });
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await page.waitForSelector('.ev-quote.in', { timeout: 6000 });
    await page.close();
  }
```

- [ ] **Step 2: Run both tests to verify they fail**

Run: `node tests/greeter/01-fires.cjs`
Expected: FAIL — `AssertionError: beat 1 must be the welcome, got: Hi there! If you want to start off exploring our features...`

Run: `node tests/greeter/02-suppressed.cjs`
Expected: FAIL — case 1 opens a bubble (the session key means nothing yet), reported as `already greeted this session: he opened a bubble anyway`.

- [ ] **Step 3: Split the storage writers**

In `ev-figures.js`, replace lines 32-42:

```js
    // ── THE GREETER, part 1: when to keep quiet ─────────────────────────────────────────
    // Scroll into the hero having never highlighted a tool and the presenter Bobit flags you
    // down — see drawPresenter for the gesture itself. These are the reasons he does not:
    // anyone who has ever touched a tool, or who is signed in, has already found them.
    var GREET_KEY = 'ev:greeted';                     // "this browser has met the tools"
    var greetForce = location.hash === '#greeter';    // re-see it without clearing storage
    function greetSeen() { try { return localStorage.getItem(GREET_KEY) === '1'; } catch (err) { return false; } }
    function markGreetSeen() { try { localStorage.setItem(GREET_KEY, '1'); } catch (err) {} }
    // Logged in? Read it off the banner menu at FIRE time rather than caching it: the silent
    // SSO check is a fetch with a 3s budget, so at load we genuinely do not know yet.
    function greetLoggedIn() { var lo = document.getElementById('menu-logout'); return !!(lo && !lo.hidden); }
```

with:

```js
    // ── THE GREETER, part 1: when to keep quiet ─────────────────────────────────────────
    // Scroll into the hero and the presenter Bobit flags you down — see drawPresenter for
    // the gesture. He greets anyone, ONCE PER VISIT: a returning or signed-in visitor is
    // exactly who a contextual line ("Good morning", "Welcome back") is for, and the old
    // once-per-browser rule silenced precisely those people.
    //
    // Two keys, because they answer two different questions, and conflating them has a bug
    // in it. MET is "this browser has been here before" and feeds the returning/first-visit
    // predicates in ev-lines.js; it is also written by noteToolsFound(). SESSION is "he has
    // already spoken this visit" and is the only thing that stops him. If noteToolsFound()
    // wrote SESSION, hovering a tool before scrolling would silence the welcome as well as
    // the nudge — putting back, by the side door, the suppression this design removed.
    var GREET_KEY = 'ev:greeted';                     // MET
    var GREET_SESSION_KEY = 'ev:greeted:session';     // SESSION
    var greetForce = location.hash === '#greeter';    // re-see it without clearing storage
    function greetSeen() { try { return sessionStorage.getItem(GREET_SESSION_KEY) === '1'; } catch (err) { return false; } }
    function markMetTools() { try { localStorage.setItem(GREET_KEY, '1'); } catch (err) {} }
    function markGreeted() {
      try { sessionStorage.setItem(GREET_SESSION_KEY, '1'); } catch (err) {}
      markMetTools();
    }
```

In `ev-figures.js:72-76`, change `noteToolsFound` to write only the MET key:

```js
    function noteToolsFound() {
      featureEverOn = true;
      markMetTools();      // NOT markGreeted(): finding the tools must not silence the welcome
      entries.forEach(function (e) { if (e.gh) greetDismiss(e); });
    }
```

- [ ] **Step 4: Add the beat-2 constants and the text lookup**

In `ev-figures.js`, replace line 3150 (`var GREET_SAY = '...'`) with:

```js
    // Times since the greeting BEGAN, which needs its own clock: e.giT is reset to 0 on
    // every state transition, so it cannot express "2.35s into the whole gesture". Hence
    // e.giTotal, accumulated alongside it and never reset.
    var BEAT_MIN_DWELL = 1.8;   // beat 1 is never yanked away faster than this
    // Written as a max() rather than as 2.35 because it encodes two separate intents: never
    // say "those buttons up there" before the arm gets there, and never cut beat 1 short.
    // With today's constants the dwell rule is the binding one, so he holds the point for a
    // beat before the nudge lands — he gestures, then explains.
    var GREET_SAY2_AT = Math.max(GREET_WAVE + GREET_TURN, GREET_SAY_AT + BEAT_MIN_DWELL);
    // Only reached if ev-lines.js or ev-copy.en.js failed to load. A missing script should
    // degrade to a plain hello, not to a Bobit who waves at you in silence.
    var GREET_FALLBACK = 'Hi there. Welcome to Empowered Vote.';
```

Immediately after `greetAim` (which ends at line 3203), add:

```js
    // What the engine cannot see for itself. ev-lines.js knows nothing about canvas by
    // design, so the facts that only this file can observe are reported to it per call.
    function greetFacts(aim) {
      return { toolsFound: featureEverOn, buttonsVisible: !!aim && aim.vis >= GREET_BTN_MIN };
    }

    // 'wave' → the welcome, 'point' → the nudge. null means the data file has nothing for
    // this beat in this context, which is a legitimate answer and not an error.
    function greetText(at, aim) {
      if (!window.EVLines) return at === 'wave' ? GREET_FALLBACK : null;
      return window.EVLines.say('greeter', at, greetFacts(aim));
    }
```

- [ ] **Step 5: Rewrite the gate, the opener and the beat swap**

In `ev-figures.js`, in `greetReady` (lines 3205-3220), delete these two lines:

```js
      if (featureEverOn) return false;                    // you found them yourself
```

```js
      return !greetSeen() && !greetLoggedIn();
```

and replace the second with:

```js
      return !greetSeen();
```

Update the function's opening comment (lines 3202-3204) to:

```js
    // Is this the moment? Every clause is a reason to keep quiet. `featureEverOn` is
    // deliberately NOT one of them any more: having found the tools yourself is a reason to
    // skip the NUDGE, which ev-lines.js handles via the tools-found tag, not a reason to be
    // denied a greeting. Neither is being signed in.
```

Replace `greetOpen` (lines 3222-3234) with:

```js
    // Open a bubble carrying one beat's line. Returns false when there is nothing to say —
    // the caller must not assume a handle exists afterwards.
    function greetOpen(e, cr, w, feetY, col, at, aim, beat) {
      if (!window.EVQuotes) return false;
      var text = greetText(at, aim);
      if (!text) return false;
      var sx = window.scrollX || window.pageXOffset || 0;
      var sy = window.scrollY || window.pageYOffset || 0;
      // head top in DOCUMENT coords: pelvis is 112*S above his feet, head top another
      // (128 + R)*S above that — same measurement the readers' bubbles use
      e.gh = window.EVQuotes.open({
        headX: cr.left + sx + w / 2,
        headY: cr.top + sy + feetY - (112 + 128 + CFG.R) * S,
        tone: col,
        quote: { text: text }               // no `who`: he is speaking for himself
      });
      e.giBeat = beat;
      return true;
    }

    // ASK FIRST, THEN SWAP. Closing beat 1 before knowing whether beat 2 has anything to
    // say would take a visitor's welcome away and leave them looking at an empty head —
    // which is exactly what happens to someone who already found the tools.
    //
    // Note there is no `if (featureEverOn)` here. Whether the nudge is said, and how it is
    // worded, is the data file's call; this loop only asks at the right moment.
    function greetBeat2(e, cr, w, feetY, col, aim) {
      var text = greetText('point', aim);
      if (!text) { e.giBeat = 2; return; }       // marked done so it is not asked again
      if (e.gh) { window.EVQuotes.close(e.gh); e.gh = null; }
      greetOpen(e, cr, w, feetY, col, 'point', aim, 2);
    }
```

- [ ] **Step 6: Wire the beats into the pose loop**

In `ev-figures.js`, in `drawPresenter`, replace the greeting-start block and the `gi` state machine (lines 3256-3282) with:

```js
      if (greetReady(e, cr)) {
        e.gi = 'wave'; e.giT = 0; e.giTotal = 0; e.giFrom = null; e.giBeat = 0;
        markGreeted();                                    // once per visit, not once per browser
      }

      var pose;
      if (e.gi) {
        e.giT += dt;
        e.giTotal = (e.giTotal || 0) + dt;
        // where the buttons are RIGHT NOW — the page keeps moving under him while he talks
        var aim = greetAim(e);
        var point = aim ? presentPose(tt, cr, w, oyS, aim.x, aim.y) : A.standstill.frame(tt);
        if (e.gi === 'wave') {
          pose = A.greet.frame(e.giT, e._wave);
          // The bubble opens mid-wave, so the abort only applies while he is still silent: once
          // he has spoken, scrolling the buttons off is handled by the remembered aim instead.
          if (!e.gh && (!aim || aim.vis < GREET_BTN_MIN)) { e._giLast = pose; greetSettle(e); }
          else {
            if (!e.giBeat && e.giT >= GREET_SAY_AT) greetOpen(e, cr, w, feetY, col, 'wave', aim, 1);
            if (e.giT >= GREET_WAVE) { e.gi = 'turn'; e.giFrom = pose; e.giT = 0; }
          }
        } else if (e.gi === 'turn') {
          pose = lerpPose(e.giFrom, point, smooth01(e.giT / GREET_TURN));
          if (e.giT >= GREET_TURN) { e.gi = 'hold'; e.giT = 0; }
        } else if (e.gi === 'hold') {
          pose = point;
        } else {
          pose = lerpPose(e.giFrom || point, A.standstill.frame(tt), smooth01(e.giT / GREET_TURN));
          if (e.giT >= GREET_TURN) { e.gi = null; e.giDone = true; e.giFrom = null; }
        }
        // Beat 2, once the arm has arrived and beat 1 has had its dwell. Gated on 'turn' and
        // 'hold' so every dismissal path cancels it for free: a click, a click-off, Escape or
        // a poof all route through greetSettle(), which moves him to 'settle'. Without that,
        // dismissing at t=1.0s would get a bubble popping back at t=2.35s.
        if (e.giBeat === 1 && e.giTotal >= GREET_SAY2_AT && (e.gi === 'turn' || e.gi === 'hold')) {
          greetBeat2(e, cr, w, feetY, col, aim);
        }
      } else if (e.greet) {
```

- [ ] **Step 7: Update the debug surface**

In `ev-figures.js:4296`, replace:

```js
        SAY: GREET_SAY, SAY_AT: GREET_SAY_AT, WAVE: GREET_WAVE, TURN: GREET_TURN, KEY: GREET_KEY, force: greetForce,
```

with:

```js
        SAY_AT: GREET_SAY_AT, SAY2_AT: GREET_SAY2_AT, WAVE: GREET_WAVE, TURN: GREET_TURN,
        KEY: GREET_KEY, SESSION_KEY: GREET_SESSION_KEY, force: greetForce,
        // What he would say right now, and why. There is no single SAY constant to report
        // any more — that is the point of the change.
        lines: function () {
          return { wave: greetText('wave', null), point: greetText('point', null) };
        },
        tags: function () { return window.EVLines ? window.EVLines.context(greetFacts(null)).tags : []; },
```

- [ ] **Step 8: Run both tests to verify they pass**

Run: `node tests/greeter/01-fires.cjs`
Expected: `01-fires: PASS`

Run: `node tests/greeter/02-suppressed.cjs`
Expected: `02-suppressed: PASS`

- [ ] **Step 9: Run the rest of the greeter and quote suites**

Run: `node tests/greeter/03-sequence.cjs && node tests/quotes/02-bubble.cjs && node tests/quotes/05-integration.cjs`
Expected: three `PASS` lines. `03-sequence` exercises all five dismissal paths and is the suite most likely to catch a beat-2 bubble popping back after a dismissal.

If `03-sequence` fails on a bubble count, check that the failing dismissal path routes through `greetSettle()` — that is what cancels the pending swap.

- [ ] **Step 10: Commit**

```bash
git add ev-figures.js tests/greeter/01-fires.cjs tests/greeter/02-suppressed.cjs
git commit -m "$(cat <<'MSG'
feat(greeter): two beats, and the words come from the data file

He now says a short welcome while he waves and swaps in the button nudge once his
arm lands, so the copy tracks what his body is doing. Which line either beat
carries is ev-lines.js's decision; this file only asks at the right moment and
reports the facts only it can see.

Ask first, then swap. Closing beat 1 before knowing whether there is a nudge
would take a visitor's welcome away and leave an empty head — which is exactly
what happens to someone who already found the tools, and is why there is no
`if (featureEverOn)` in the draw loop any more.

Beat 2 is gated on the 'turn' and 'hold' states, so every dismissal path cancels
it for free: a click, a click-off, Escape and a poof all route through
greetSettle(). Without that, dismissing at t=1.0s got a bubble popping back at
t=2.35s, just after you got rid of one.

Own clock: e.giT is reset on every state transition, so e.giTotal carries "2.35s
into the gesture".

He greets anyone, once per visit. sessionStorage stops a repeat; localStorage
still records having been here, but now only feeds the returning/first-visit
predicates. noteToolsFound() writes only the latter — writing the session key
there would silence the welcome as well as the nudge.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 6: Lock the beat sequence

**Files:**
- Create: `tests/greeter/04-beats.cjs`
- Modify: `tests/greeter/shots.cjs`

**Interfaces:**
- Consumes: `e.giBeat`, `e.giTotal` from Task 5; `?evlines=` from Task 2.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the test**

This one is written after the implementation rather than before it: it covers the *combinations* of Task 5's mechanism, which is regression protection rather than a driver of design. The behavior it asserts was driven by Task 5's two tests.

Create `tests/greeter/04-beats.cjs`:

```js
// The two-beat greeting: a welcome while he waves, the nudge when his arm lands. Every case
// pins the tags with ?evlines= so a run in October does not get the Halloween line, and each
// asserts the SEQUENCE (which bubble, when, and how many) rather than just the end state.
//
// The beat-2 selection table lives in tests/lines/01-select.cjs. What is tested here is that
// the draw loop asks at the right moment and swaps correctly — not what the answer is.
const { chromium } = require('playwright');
const assert = require('assert');

const BASE = 'file:///C:/ev-landing/ev-landing-main/index.html';
const BEAT1 = 'Hi there. Welcome to Empowered Vote.';
const BEAT2 = 'Press one of those buttons up there to start exploring.';

async function makePage(browser, tags, init) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.addInitScript(function () {
    try { sessionStorage.removeItem('ev:greeted:session'); } catch (e) {}
    try { localStorage.removeItem('ev:greeted'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.style.scrollBehavior = 'auto';
      document.addEventListener('click', function (ev) {
        if (ev.target.closest && ev.target.closest('.logo-trigger')) ev.preventDefault();
      }, true);
    });
  });
  if (init) await page.addInitScript(init);
  await page.goto(BASE + '?evlines=' + tags + '#figdebug');
  await page.waitForTimeout(400);
  return page;
}

const STATE = function () {
  var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
  var el = document.querySelector('.ev-quote .say');
  return {
    gi: e.gi == null ? null : e.gi,
    beat: e.giBeat == null ? null : e.giBeat,
    total: e.giTotal || 0,
    bubbles: document.querySelectorAll('.ev-quote').length,
    text: el ? el.textContent : null
  };
};

async function scrollDownInto(page) {
  for (let i = 0; i < 80; i++) {
    const at = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
      var top = e.c.getBoundingClientRect().top, ih = window.innerHeight;
      var btn = document.querySelector('.showcase-logos').getBoundingClientRect().bottom;
      if (top > 70 && top + e.h < ih - 8 && btn > ih * 0.45 && window.scrollY >= 60) return true;
      window.scrollBy(0, 40);
      return false;
    });
    if (at) return true;
    await page.waitForTimeout(50);
  }
  return false;
}

async function untilBeat(page, n, ms) {
  await page.waitForFunction(function (want) {
    var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
    return e.giBeat === want;
  }, n, { timeout: ms || 8000 });
}

(async function () {
  const browser = await chromium.launch();

  // ── 1. the full sequence, and never two bubbles at once
  {
    const page = await makePage(browser, 'first-visit,guest');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    const one = await page.evaluate(STATE);
    assert.strictEqual(one.gi, 'wave', 'beat 1 opens during the wave, not after it');
    assert.strictEqual(one.text, BEAT1, 'beat 1 text: ' + one.text);
    assert.strictEqual(one.bubbles, 1, 'exactly one bubble at beat 1');

    // sample hard across the swap: two bubbles over one head, even for a frame, is a bug
    let maxBubbles = 0;
    for (let i = 0; i < 40; i++) {
      const s = await page.evaluate(STATE);
      maxBubbles = Math.max(maxBubbles, s.bubbles);
      if (s.beat === 2) break;
      await page.waitForTimeout(60);
    }
    assert.strictEqual(maxBubbles, 1, 'two bubbles were live at once during the swap');

    await untilBeat(page, 2);
    const two = await page.evaluate(STATE);
    assert.strictEqual(two.text, BEAT2, 'beat 2 text: ' + two.text);
    assert.strictEqual(two.bubbles, 1, 'exactly one bubble at beat 2');
    // 2.35s from the start of the wave, and never before the arm has arrived (1.55s)
    assert.ok(two.total >= 2.3, 'beat 2 came early, at ' + two.total.toFixed(2) + 's');
    assert.ok(two.gi === 'hold', 'beat 2 must land while he holds the point, not mid-turn');

    // and beat 2 stays: LIFE is 0, so bubbles wait for a tap rather than expiring
    await page.waitForTimeout(1500);
    const still = await page.evaluate(STATE);
    assert.strictEqual(still.text, BEAT2, 'beat 2 must not expire on its own');
    await page.close();
  }

  // ── 2. dismissal cancels the pending swap. This is the failure mode the split invents:
  //      a click at 1.0s getting a bubble back at 2.35s, just after you got rid of one.
  {
    const page = await makePage(browser, 'first-visit,guest');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    await page.mouse.click(5, 5);          // click-off: nowhere near him or the bubble
    await page.waitForTimeout(200);
    const gone = await page.evaluate(STATE);
    assert.strictEqual(gone.bubbles, 0, 'the click-off must close beat 1');
    await page.waitForTimeout(2600);       // well past GREET_SAY2_AT
    const after = await page.evaluate(STATE);
    assert.strictEqual(after.bubbles, 0, 'beat 2 popped back after a dismissal');
    await page.close();
  }

  // ── 3. Escape, same rule
  {
    const page = await makePage(browser, 'first-visit,guest');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2600);
    assert.strictEqual((await page.evaluate(STATE)).bubbles, 0, 'beat 2 popped back after Escape');
    await page.close();
  }

  // ── 4. found the tools: he still greets, and then says nothing more. Beat 1 must STAY —
  //      closing it to open nothing would take the welcome away for no reason.
  {
    const page = await makePage(browser, 'first-visit,guest,tools-found');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    await page.waitForTimeout(2600);
    const s = await page.evaluate(STATE);
    assert.strictEqual(s.beat, 2, 'beat 2 must be marked done so it is not asked every frame');
    assert.strictEqual(s.bubbles, 1, 'beat 1 must stay up when there is no nudge');
    assert.strictEqual(s.text, BEAT1, 'the surviving bubble must be the welcome: ' + s.text);
    await page.close();
  }

  // ── 5. the column has scrolled off: the nudge stops telling them to press it
  {
    const page = await makePage(browser, 'first-visit,guest,buttons-gone');
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 2);
    const s = await page.evaluate(STATE);
    assert.ok(/back up the page/.test(s.text), 'expected the scrolled-off nudge, got: ' + s.text);
    await page.close();
  }

  // ── 6. a signed-in visitor is greeted by name, and gets the SAME nudge as a stranger.
  //      The second half is the regression guard: a personalized nudge is the obvious
  //      thing for someone to add back, and it was tried and cut.
  {
    const page = await makePage(browser, 'returning,logged-in,named', function () {
      window.EVSession = { loggedIn: true, name: 'Chris' };
    });
    assert.ok(await scrollDownInto(page), 'could not reach the greeting window');
    await untilBeat(page, 1);
    assert.strictEqual((await page.evaluate(STATE)).text, 'Welcome back, Chris.',
      'a known visitor is greeted by name');
    await untilBeat(page, 2);
    assert.strictEqual((await page.evaluate(STATE)).text, BEAT2,
      'the nudge must not be personalized');
    await page.close();
  }

  console.log('04-beats: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run it**

Run: `node tests/greeter/04-beats.cjs`
Expected: `04-beats: PASS`

If case 1 fails on `two.gi === 'hold'`, check `GREET_SAY2_AT` resolves to 2.35 — the `max()` must be evaluated after `GREET_WAVE` and `GREET_TURN` are declared, so it has to appear below them in the file.

- [ ] **Step 3: Add a beat-2 screenshot**

Green tests can pass while a bubble sits wrong on the head, so beat 2 needs eyes on it.

Two changes to `tests/greeter/shots.cjs`. First, pin the tags in the URL at line 6, so the captured wording does not change with the season — otherwise every October the PNGs churn with a real-looking diff:

```js
const URL = 'file:///C:/ev-landing/ev-landing-main/index.html?evlines=first-visit,guest#greeter';   // #greeter ignores "seen this visit"
```

Second, replace the capture block (from `const tag = ...` through the `console.log`) with:

```js
      const tag = 'greeter-' + theme + '-' + width;
      await page.waitForFunction(function () {
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        return e.gi === 'wave';
      }, { timeout: 6000 });
      await page.waitForTimeout(1000);   // mid-wave, with beat 1 up
      await page.screenshot({ path: 'screenshots/' + tag + '-wave.png' });

      // Arm on the buttons, beat 1 still up. Waits for the STATE rather than sleeping:
      // this used to be waitForSelector('.ev-quote.in') + 500ms, which resolved instantly
      // because the wave shot had already opened the bubble, so what it caught was a
      // timing accident. Now that a second bubble follows, an accident would catch the
      // wrong one.
      await page.waitForFunction(function () {
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        return e.gi === 'hold' && e.giBeat === 1;
      }, { timeout: 6000 });
      await page.screenshot({ path: 'screenshots/' + tag + '-point.png' });

      // ...and the nudge that replaces it at GREET_SAY2_AT. A fixed wait here is what
      // makes screenshot suites flake under load, so wait for the beat itself.
      await page.waitForFunction(function () {
        var e = window.__evFigDebug.entries.find(function (x) { return x.spec.presenter; });
        return e.giBeat === 2;
      }, { timeout: 8000 });
      await page.waitForTimeout(400);    // let the fade finish
      await page.screenshot({ path: 'screenshots/' + tag + '-nudge.png' });
      console.log('wrote screenshots/' + tag + '-{wave,point,nudge}.png');
      await page.close();
```

Note this makes the existing `-point.png` shots deterministic for the first time; expect those four PNGs to change meaningfully, not just by anti-aliasing.

- [ ] **Step 4: Run the shots and look at them**

Run: `node tests/greeter/shots.cjs`

Then **open the four new `greeter-*-nudge.png` files and look at them.** Check the tail tip lands on his head, the bubble is fully inside the viewport at 390px wide, and the text is the nudge rather than the welcome. A passing test is not evidence that this looks right.

- [ ] **Step 5: Commit**

```bash
git add tests/greeter/04-beats.cjs tests/greeter/shots.cjs screenshots/
git commit -m "$(cat <<'MSG'
test(greeter): the beat sequence, and the swap that must not double up

Locks what Task 5 built: beat 1 during the wave, beat 2 at 2.35s while he holds
the point, and never two bubbles over one head — sampled hard across the swap,
because a single frame with both is still a bug.

Case 2 and 3 are the failure mode the split invents: dismissing at 1.0s used to
get a bubble popping back at 2.35s. Case 4 is the other half of ask-before-swap —
someone who found the tools keeps their welcome instead of watching it close to
make room for nothing.

Case 6 asserts a signed-in visitor is greeted by name AND gets the same nudge as
a stranger. The second half is deliberate: a personalized nudge was tried and
cut, and is the obvious thing for someone to add back.

Screenshots for the new bubble, because green tests pass while a tail points at
nothing.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 7: Full suite, docs, and the debug hash

**Files:**
- Modify: `README.md`
- Test: every suite

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [ ] **Step 1: Run the whole suite, detached**

There are now roughly 40 test files and the run takes long enough to hit a 10-minute foreground ceiling, so start it in the background and collect the result rather than waiting on it.

Run every `.cjs` under `tests/` except `tests/live/verify-deploy.cjs` (that one hits the network, which is deliberately unreachable here). Collect each file's exit code and its `PASS` line.

Expected: every suite prints `PASS`. Note that `tests/quotes/04-poses.cjs` is known to flake on "lookup must settle into hold" under load — if that is the only failure, re-run it alone before treating it as a regression.

- [ ] **Step 2: Check the screenshot churn**

`git status` will show many modified PNGs. Anti-aliasing differences between runs are expected and are not work. Only the four new `greeter-*-nudge.png` files are a real addition. Do not treat the rest of the churn as a change to investigate.

- [ ] **Step 3: Look at the greeting in a real browser**

Open `index.html?evlines=halloween,evening#greeter` and scroll down past the hero. Confirm: he waves, the Halloween welcome appears mid-wave, his arm swings up to the buttons, and about 0.8s later the welcome is replaced by the nudge.

Then open `index.html?evlines=first-visit,guest,tools-found#greeter` and confirm the welcome appears and simply stays — no second bubble, and nothing closes.

This is the step that catches what tests cannot: whether the timing reads as one person talking rather than two captions.

- [ ] **Step 4: Document the authoring workflow**

Add a section to `README.md` covering, in prose that matches the file's existing voice:

- Where copy lives (`ev-copy.en.js`) and that it holds no logic, so changing wording never means reading a condition.
- Where selection lives (`ev-lines.js`), and the one rule: file order is priority, first match wins, `when` is an AND.
- How to look at a line that is not currently true: `?evlines=halloween,evening` pins the tags. List the tag names.
- That `#greeter` makes him ignore having already greeted you this session.
- How to add a condition: one entry in `PREDICATES`, one fact in `context()`. Point at the two that already arrive per call (`toolsFound`, `buttonsVisible`) as the example to copy when the new fact is something only the caller can see.
- That a new language is one new file plus one script tag, and nothing else.

- [ ] **Step 5: Commit**

```bash
git add README.md screenshots/
git commit -m "$(cat <<'MSG'
docs(dialogue): how to change what a Bobit says

Where the words are, where the choosing is, and the one selection rule worth
remembering: file order is priority. Plus ?evlines= for looking at a line that is
not currently true, which is the thing you need on the day you write the December
greeting in August.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Self-Review

**Spec coverage.** Walked each section of the spec against the tasks:

| Spec section | Task |
|---|---|
| `ev-copy.en.js`, `{name}` substitution | 1, and `fill()` in 3 |
| `ev-lines.js` interface (`register`/`say`/`context`/`force`) | 2, 3 |
| Per-call facts, and why the boundary runs that way | 2 (`context`), 5 (`greetFacts`) |
| `.js` not `.json`, `file://` constraint | Global Constraints; fixture in 1 |
| Fallback if the scripts fail to load | 5 (`GREET_FALLBACK`) |
| `ev-quotes.js` untouched | no task modifies it; verified by running its suites in 5 |
| `window.EVSession` + `ev:session` | 4 |
| Context facts, predicates, local-time windows | 2 |
| Eager `returning` snapshot | 2, tested in `02-predicates` |
| Selection: first-match-wins, AND, fallback, `id` array, `id: null` | 3 |
| Unknown id → `null` + `console.warn` | 3 |
| `?evlines=` authoring override | 2 |
| Debug surface `lines` / `tags`, `SAY` dropped | 5 |
| Beat timing, `GREET_SAY2_AT`, `giTotal` | 5 |
| Ask-then-swap; beat 1 survives a silent beat 2 | 5, tested in 6 case 4 |
| Beat 2 needs a remembered aim, not a visible column | 5 (`greetAim` unchanged), 6 case 5 |
| Dismissal cancels the pending swap | 5 (state gate), 6 cases 2-3 |
| Eligibility: per-session, signed-in greeted | 5, tested in `02-suppressed` 1-3 |
| Two storage writers | 5 |
| Copy follows the voice guide | Global Constraints; no-exclamation sweep in 1 |
| Testing plan | 1, 2, 3, 4, 5, 6 |
| Out of scope | nothing implements remote copy, quote weighting, per-line frequency, account history, other cast, or Spanish |

One spec item has **no task and is intentionally uncovered**: the spec's beat-2 condition that "his head must still be on screen." Task 5 does not implement it, because `greetReady` already requires `cr.top >= GREET_HEAD_CLEAR` and `cr.bottom <= ih - GREET_FOOT_CLEAR` at the *start* of the greeting, and the whole gesture runs 2.35s — a visitor would have to scroll him fully off the top within that window. `tests/greeter/02-suppressed.cjs` case 6 covers exactly that flick-past and shows he settles without speaking. Adding a second clearance check would be untested code guarding a state the existing abort already reaches. **Flagging rather than silently dropping**: if the executor finds a way to reach beat 2 with his head above the viewport, that is a real gap and needs a clearance check in `greetBeat2()`.

**Placeholder scan.** Clean. Task 6 Step 3 originally said "follow the existing naming in `shots.cjs`" without quoting it, which is the kind of gesture this plan is not allowed to contain; `shots.cjs` was read and the step now carries the actual replacement. No "TBD", no "add error handling", no "similar to Task N".

Reading it also turned up a latent problem worth naming: the existing `-point.png` capture waits on `waitForSelector('.ev-quote.in')`, which resolves instantly because the preceding wave shot already opened that bubble. What it captures today is a timing accident that happens to land near the point. Harmless with one bubble; with two it would capture whichever one the load average chose. Task 6 Step 3 replaces it with a state wait, which means those four PNGs will change for real — call that out at review rather than filing it under the usual anti-aliasing churn.

**Type consistency.** Checked the names that cross task boundaries: `EVCopy.get/register/setLocale/has/ids/BASE` (Task 1 → 3), `EVLines.context/force/PREDICATES` (2 → 3, 5), `EVLines.register/resolve/say` (3 → 5, 6), `window.EVSession = { loggedIn, name }` and the `ev:session` event name (4 → 2, 5, 6), `e.giBeat` and `e.giTotal` (5 → 6), `greetFacts(aim)` and `greetText(at, aim)` (5 internal, used by the debug surface in the same task). `greetOpen` gained three parameters and has exactly one other caller, updated in the same step. Test constants `BEAT1`/`BEAT2` are defined identically in `01-fires.cjs` and `04-beats.cjs` — duplicated on purpose, since each file must run standalone.

One fix made during review: the `id` array's session-held pick is keyed `who + '|' + at + '|' + i`, not by id, so two beats offering the same array do not share a choice.
