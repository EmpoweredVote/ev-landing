# Bobit Quote Readers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **STATUS: all 5 tasks implemented and verified 2026-08-02** on `feat/bobit-quote-readers`.
> All five test scripts pass; light and dark screenshots captured in `screenshots/`.
> **Not merged** — see "Before this ships" at the bottom: the Kennedy link still needs a
> browser check, and `main` auto-deploys to Render.
>
> Deviations from the plan as written, all committed:
> - The zero-reader guarantee needed three tiers, not one. Promoting a sitter fails on casts
>   that contain no seats at all, which is what the first test run hit. It now promotes a
>   sitter, else recasts a note-card figure as a reader, else appends one.
> - `quoteHold`'s arm angles were retuned after looking at the render. 0° is straight DOWN in
>   this rig and 90° is horizontal, so the planned `armRU 70` (and a first "fix" at 88) held
>   the book out in front rather than in his lap. Low upper arms with forward forearms
>   (`armRU 30 / armRF 88`) is what actually drops it.
> - Two test assertions were wrong as written, not the code: the bubble position must be
>   measured after `.in` lands (before that it still carries its `translateY(4px)` start
>   offset), and `index.html` already overflows horizontally at 360px on its own, so the
>   overflow test compares against a baseline instead of asserting an absolute width.

**Goal:** Clicking a reading Bobit makes him sit up, lower his book and open a speech bubble carrying a verified presidential quote, with the speaker's name linking to the primary source.

**Architecture:** A new `ev-quotes.js` owns the quote pool and the bubble as real DOM (the figure canvases are `pointer-events:none`, so a canvas-drawn bubble could not hold a clickable link). `ev-figures.js` gains a `drawReader` pose state machine modelled on the existing `drawPhoneSeat`, and decides who speaks and when. Bubble theming lives in `index.html`'s `<style>` block with the rest of the design tokens; positioning is set inline from JS, exactly as the figure canvases already work.

**Tech Stack:** Vanilla ES5-style browser JS, no build step, no runtime dependencies. Verification via globally-installed Playwright driving the local `index.html` over `file://`.

**Spec:** `docs/superpowers/specs/2026-08-02-bobit-quote-readers-design.md`

## Global Constraints

- **No build step and no runtime dependencies.** This is a static site; `ev-quotes.js` is a plain `<script src>` file.
- **Match `ev-figures.js` style:** `var` (never `let`/`const`), function expressions (no arrow functions or classes), wrapped in an IIFE with an idempotence guard (`if (window.EVQuotes) return;`).
- **Files are UTF-8.** `index.html` declares `<meta charset="UTF-8" />`. The Washington quote contains `æ` (`dæmon`) and the Kennedy quote contains an em dash `—`; both must survive verbatim. Write source files as UTF-8, never Latin-1.
- **Colors come from tokens.** Bubble colors use `var(--card)`, `var(--border)`, `var(--heading)`, `var(--muted)`, `var(--shadow-md)`, `var(--radius-card)`. The only per-figure color is the tone from the existing `figColor(tone)`, passed in as a `--tone` custom property. Never hardcode a hex value.
- **Pool size is read from the table's length**, never hardcoded. It is 7 at launch.
- **He never turns.** `flip` is derived from `spec.x > 0.5` and must not be reassigned anywhere in this feature. No `targetFlip`, no mirror-symmetric midpoint pose — both belong to an approach that was considered and rejected.
- **Test scripts must be `.cjs`.** `package.json` sets `"type": "module"`, and `NODE_PATH` is only consulted by CommonJS `require()` — ESM `import` ignores it entirely, so an `.mjs` test would fail to resolve Playwright.
- **Playwright invocation** (global install, not in the repo):
  ```bash
  NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/<script>.cjs
  ```
- **Every test page must block outbound requests** or PostHog and fonts hang the run:
  ```js
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  ```
- **`file://` gotchas:** `canvas.getImageData()` throws `SecurityError`, so never assert on pixels — assert on state, DOM and geometry instead. Do not stub `Math.random`; PostHog's inline init consumes from the sequence and shifts values. To get a fresh random cast, use `page.reload()` — re-navigating to the same `#figdebug` URL is a same-document hash change and does not re-run the script.

## File Structure

| File | Responsibility |
|---|---|
| `ev-quotes.js` (new, ~190 lines) | The quote table; dealing quotes to readers; building, placing, timing and removing bubble DOM. Knows nothing about the rig. |
| `ev-figures.js` (modify) | `drawReader` pose state machine, owning every seated reader's hover and click; taking readers out of the generic hover-wave; the click hit-test; dealing after `buildCast()`; the zero-reader guarantee; calling `EVQuotes.tick` from the existing frame loop. |
| `index.html` (modify) | One `<script src>` tag; the `.ev-quote` CSS rules in the existing `<style>` block. |
| `tests/quotes/*.cjs` (new) | Playwright verification, one script per task. |

---

### Task 1: Quote table and dealing

**Files:**
- Create: `ev-quotes.js`
- Test: `tests/quotes/01-deal.cjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `window.EVQuotes.QUOTES` — array of `{text: string, who: string, where: string, href: string}`. `window.EVQuotes.deal(readers)` — takes an array of spec objects, sets `spec.quote` on `min(QUOTES.length, readers.length)` of them chosen at random, each a distinct entry; returns the number dealt.

- [ ] **Step 1: Write the failing test**

Create `tests/quotes/01-deal.cjs`:

```js
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
    return { aeligature: all.indexOf('d\u00E6mon') >= 0, emdash: all.indexOf('\u2014') >= 0 };
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/01-deal.cjs
```

Expected: FAIL — `ev-quotes.js` does not exist, so `addScriptTag` rejects with an ENOENT error.

- [ ] **Step 3: Create `ev-quotes.js` with the table and dealing**

```js
// ─── EV quote bubbles ───
// Owns the presidential-quote pool and the speech bubbles that seated readers open.
// Deliberately knows nothing about the leremy rig: ev-figures.js decides WHO speaks
// and WHEN, this file owns WHAT they say and the DOM that shows it.
//
// Every href below was checked on 2026-08-02; see presidential_quotes.md for the
// verification notes and the two attributions that had to be corrected.
(function () {
  "use strict";
  if (window.EVQuotes) return;   // idempotence guard, same pattern as leremy-rig.js

  var QUOTES = [
    {
      text: "If we mean to support the Liberty and Independence which it has cost us so much blood and treasure to establish, we must drive far away the d\u00E6mon of party spirit and local reproach.",
      who: "George Washington",
      where: "to Gov. Arthur Fenner, 4 June 1790",
      href: "https://tile.loc.gov/storage-services/service/mss/mgw/mgw2/022/022.pdf#page=118"
    },
    {
      text: "Let me\u2026 warn you in the most solemn manner against the baneful effects of the spirit of party. It serves always to distract the public councils and enfeeble the public administration.",
      who: "George Washington",
      where: "Farewell Address, 19 September 1796",
      href: "https://www.govinfo.gov/content/pkg/CDOC-105sdoc22/html/CDOC-105sdoc22.htm"
    },
    {
      text: "There is nothing I dread So much, as a Division of the Republick into two great Parties, each arranged under its Leader, and concerting Measures in opposition to each other.",
      who: "John Adams",
      where: "to Jonathan Jackson, 2 October 1780",
      href: "https://www.masshist.org/publications/adams-papers/index.php/volume/PJA10/pageid/PJA10p193"
    },
    {
      text: "Cherish therefore the spirit of our people, and keep alive their attention. Do not be too severe upon their errors, but reclaim them by enlightening them. If once they become inattentive to the public affairs, you and I, and Congress, and Assemblies, judges and governors shall all become wolves.",
      who: "Thomas Jefferson",
      where: "to Edward Carrington, 16 January 1787",
      href: "https://press-pubs.uchicago.edu/founders/documents/amendI_speechs8.html"
    },
    {
      text: "I think by far the most important bill in our whole code is that for the diffusion of knowledge among the people. No other sure foundation can be devised for the preservation of freedom, and happiness.",
      who: "Thomas Jefferson",
      where: "to George Wythe, 13 August 1786",
      href: "https://tjrs.monticello.org/letter/1283"
    },
    {
      text: "I know no safe depository of the ultimate powers of the society but the people themselves\u2026 the remedy is not to take it from them, but to inform their discretion by education.",
      who: "Thomas Jefferson",
      where: "to William C. Jarvis, 28 September 1820",
      href: "https://tjrs.monticello.org/letter/382"
    },
    {
      text: "Let us not despair but act. Let us not seek the Republican answer or the Democratic answer but the right answer. Let us not seek to fix the blame for the past \u2014 let us accept our own responsibility for the future.",
      who: "John F. Kennedy",
      where: "Loyola College Alumni Banquet, Baltimore, 18 February 1958",
      href: "https://www.jfklibrary.org/archives/other-resources/john-f-kennedy-speeches/baltimore-md-19580218"
    }
  ];

  // Fisher-Yates over 0..n-1
  function shuffled(n) {
    var a = [], i, j, t;
    for (i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Deal one distinct quote to each reader, in random order, until the pool runs out.
  // Readers left over keep spec.quote undefined and fall back to a wave/shrug.
  function deal(readers) {
    var pool = shuffled(QUOTES.length);
    var order = shuffled(readers.length);
    var n = Math.min(pool.length, order.length), i;
    for (i = 0; i < n; i++) readers[order[i]].quote = QUOTES[pool[i]];
    return n;
  }

  window.EVQuotes = { QUOTES: QUOTES, deal: deal };
})();
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/01-deal.cjs
```

Expected: `01-deal: PASS`

- [ ] **Step 5: Commit**

```bash
git add ev-quotes.js tests/quotes/01-deal.cjs
git commit -m "feat(quotes): quote pool and no-repeat dealing"
```

---

### Task 2: The bubble element

**Files:**
- Modify: `ev-quotes.js` (add `open`, `close`, `closeAll`, placement)
- Modify: `index.html:1074` (insert CSS immediately before `</style>`)
- Modify: `index.html:2007` (add the `<script src>` tag)
- Test: `tests/quotes/02-bubble.cjs`

**Interfaces:**
- Consumes: `EVQuotes.QUOTES` from Task 1.
- Produces:
  - `EVQuotes.open(anchor)` where `anchor` is `{headX, headY, tone, quote}` — `headX`/`headY` in **document** coordinates, `tone` a CSS color string, `quote` an entry from `QUOTES`. Returns a handle `{el, life, held, setHeld(bool), quote}`.
  - `EVQuotes.close(handle)`, `EVQuotes.closeAll()`, `EVQuotes.openCount()`.

- [ ] **Step 1: Write the failing test**

Create `tests/quotes/02-bubble.cjs`:

```js
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

  const info = await page.evaluate(function () {
    var q = window.EVQuotes.QUOTES[0];
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: 'rgb(0, 125, 153)', quote: q });
    var el = h.el;
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

  // clamped to a narrow viewport: no horizontal page scroll, tail still aimed at the head
  const narrow = await makePage(browser, 360);
  const clamp = await narrow.evaluate(function () {
    window.EVQuotes.open({ headX: 8, headY: 400, tone: '#007D99', quote: window.EVQuotes.QUOTES[3] });
    var el = document.querySelector('.ev-quote');
    var r = el.getBoundingClientRect();
    var t = el.querySelector('.tail').getBoundingClientRect();
    return {
      left: r.left, right: r.right,
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      tailCentre: t.left + t.width / 2,
      inside: (t.left + t.width / 2) >= r.left + 10 && (t.left + t.width / 2) <= r.right - 10
    };
  });
  assert.ok(clamp.left >= 7, 'bubble must not hang off the left edge: ' + clamp.left);
  assert.ok(clamp.docW <= clamp.winW + 1,
    'bubble caused horizontal page scroll: ' + clamp.docW + ' > ' + clamp.winW);
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/02-bubble.cjs
```

Expected: FAIL on the first assertion — `index.html must load ev-quotes.js and expose open()`.

- [ ] **Step 3: Add the CSS to `index.html`**

Insert immediately before `</style>` on line 1074. Everything derives from existing tokens; `--tone` is set per-bubble from JS.

```css
        /* ── Quote bubbles (a reading Bobit you clicked). The figure canvases are
           pointer-events:none, so the bubble is real DOM in order to hold a link. ── */
        .ev-quote {
            position: absolute;
            z-index: 70;
            box-sizing: border-box;
            width: 300px;
            max-width: calc(100vw - 16px);
            padding: 15px 17px;
            background: var(--card);
            border: 2px solid var(--tone, var(--teal));
            border-radius: var(--radius-card);
            box-shadow: var(--shadow-md);
            color: var(--heading);
            opacity: 0;
            transform: translateY(4px);
            transition: opacity .18s ease, transform .18s ease;
            pointer-events: auto;
        }
        .ev-quote.in { opacity: 1; transform: translateY(0); }
        .ev-quote q {
            display: block;
            quotes: "\201C" "\201D";
            font-size: 0.9rem;
            line-height: 1.55;
            font-style: italic;
        }
        .ev-quote .attrib { margin-top: 11px; font-size: 0.8rem; }
        .ev-quote .attrib a {
            color: var(--tone, var(--teal));
            font-weight: 700;
            font-style: normal;
            text-decoration: underline;
            text-underline-offset: 2px;
        }
        .ev-quote .attrib .where {
            display: block;
            color: var(--muted);
            font-size: 0.74rem;
            margin-top: 2px;
        }
        /* tail: stacked triangles so the 2px outline reads as one continuous line */
        .ev-quote .tail, .ev-quote .tail-in {
            position: absolute;
            width: 0; height: 0;
            border-style: solid;
            border-color: transparent;
            border-bottom-width: 0;
        }
        .ev-quote .tail {
            bottom: -14px;
            border-width: 14px 11px 0;
            border-top-color: var(--tone, var(--teal));
        }
        .ev-quote .tail-in {
            bottom: -11px;
            border-width: 11px 8px 0;
            border-top-color: var(--card);
        }
        @media (prefers-reduced-motion: reduce) {
            .ev-quote { transition: none; }
        }
```

- [ ] **Step 4: Add the script tag to `index.html`**

Replace lines 2005-2007 so `ev-quotes.js` loads **before** `ev-figures.js`. Ordering is defensive rather than strictly required — `ev-figures.js` defers its work to `DOMContentLoaded` — but loading the dependency first means `window.EVQuotes` is guaranteed present whenever that callback runs.

```html
    <!-- Stick-figure inhabitants (procedural skeletal rig). Order matters: engine first,
         then the quote pool the readers draw from, then the overlay that casts them. -->
    <script src="leremy-rig.js"></script>
    <script src="ev-quotes.js"></script>
    <script src="ev-figures.js"></script>
```

- [ ] **Step 5: Add bubble construction and placement to `ev-quotes.js`**

Insert after `deal`, replacing the final `window.EVQuotes = ...` line.

```js
  var live = [];   // open bubble handles

  function place(h) {
    var el = h.el;
    var w = el.offsetWidth, hh = el.offsetHeight;
    var sx = window.scrollX || window.pageXOffset || 0;
    var docW = document.documentElement.clientWidth;
    var left = h.headX - w / 2;
    var maxL = sx + docW - w - 8;
    if (left > maxL) left = maxL;
    if (left < sx + 8) left = sx + 8;
    el.style.left = left + "px";
    el.style.top = (h.headY - hh - 14) + "px";
    // the tail slides along the bottom edge so it keeps pointing at his head even
    // when the bubble has been clamped sideways; kept clear of the rounded corners
    var tx = h.headX - left;
    if (tx < 18) tx = 18;
    if (tx > w - 18) tx = w - 18;
    h.tail.style.left = (tx - 11) + "px";
    h.tailIn.style.left = (tx - 8) + "px";
  }

  function open(anchor) {
    var el = document.createElement("div");
    el.className = "ev-quote";
    el.setAttribute("role", "note");
    el.style.setProperty("--tone", anchor.tone);

    var q = document.createElement("q");
    q.textContent = anchor.quote.text;

    var at = document.createElement("div");
    at.className = "attrib";
    at.appendChild(document.createTextNode("\u2014 "));
    var a = document.createElement("a");
    a.href = anchor.quote.href;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = "Open the source";
    a.textContent = anchor.quote.who;
    at.appendChild(a);
    var where = document.createElement("span");
    where.className = "where";
    where.textContent = anchor.quote.where;
    at.appendChild(where);

    var tail = document.createElement("span"); tail.className = "tail";
    var tailIn = document.createElement("span"); tailIn.className = "tail-in";

    el.appendChild(q);
    el.appendChild(at);
    el.appendChild(tail);
    el.appendChild(tailIn);

    var h = {
      el: el, tail: tail, tailIn: tailIn,
      headX: anchor.headX, headY: anchor.headY,
      quote: anchor.quote,
      life: 0, held: false, pointerIn: false, focusIn: false,
      setHeld: function (v) { h.held = !!v; }
    };

    // a click inside the bubble must not read as a click-off-to-dismiss
    el.addEventListener("click", function (ev) { ev.stopPropagation(); });
    el.addEventListener("mouseenter", function () { h.pointerIn = true; });
    el.addEventListener("mouseleave", function () { h.pointerIn = false; });
    el.addEventListener("focusin", function () { h.focusIn = true; });
    el.addEventListener("focusout", function () { h.focusIn = false; });

    document.body.appendChild(el);
    place(h);
    live.push(h);
    // let layout settle so the fade actually animates from opacity 0
    window.requestAnimationFrame(function () { el.classList.add("in"); });
    return h;
  }

  function close(h) {
    var i = live.indexOf(h);
    if (i < 0) return;               // already closing; never double-remove
    live.splice(i, 1);
    h.el.classList.remove("in");
    window.setTimeout(function () {
      if (h.el.parentNode) h.el.parentNode.removeChild(h.el);
    }, 260);
  }

  function closeAll() {
    var all = live.slice();
    for (var i = 0; i < all.length; i++) close(all[i]);
    return all;
  }

  function openCount() { return live.length; }

  window.EVQuotes = {
    QUOTES: QUOTES, deal: deal,
    open: open, close: close, closeAll: closeAll, openCount: openCount
  };
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/02-bubble.cjs
```

Expected: `02-bubble: PASS`

- [ ] **Step 7: Commit**

```bash
git add ev-quotes.js index.html tests/quotes/02-bubble.cjs
git commit -m "feat(quotes): speech bubble DOM, tokens-based styling and clamped placement"
```

---

### Task 3: Timer, hold-to-pause, and dismissal

**Files:**
- Modify: `ev-quotes.js` (add `tick`, `LIFE`)
- Test: `tests/quotes/03-timer.cjs`

**Interfaces:**
- Consumes: `open`/`close`/`openCount` from Task 2; the handle's `setHeld(bool)`.
- Produces: `EVQuotes.tick(dt)` — advances every open bubble's timer by `dt` seconds, closes any that expire, and returns an array of the handles it closed (so the caller can start those figures resuming). `EVQuotes.LIFE` — the lifetime in seconds, `12`.

The pause condition spans both modules: `ev-quotes.js` knows about pointer-over-bubble and focus-inside-bubble from its own listeners, but only `ev-figures.js` can hit-test a canvas to tell whether the pointer is over the *figure*. So `setHeld` is the figure code's input, and `tick` pauses on that **or** its own pointer/focus state.

- [ ] **Step 1: Write the failing test**

Create `tests/quotes/03-timer.cjs`:

```js
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);

  assert.strictEqual(await page.evaluate(function () { return window.EVQuotes.LIFE; }), 12,
    'lifetime should be 12 seconds');

  // runs down and closes, reporting the handle it closed
  const expiry = await page.evaluate(function () {
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[0] });
    var closedEarly = window.EVQuotes.tick(11.5).length;
    var stillOpen = window.EVQuotes.openCount();
    var closedNow = window.EVQuotes.tick(0.6);
    return {
      closedEarly: closedEarly,
      stillOpen: stillOpen,
      closedNow: closedNow.length,
      sameHandle: closedNow[0] === h,
      remaining: window.EVQuotes.openCount()
    };
  });
  assert.strictEqual(expiry.closedEarly, 0, 'must not close before 12s');
  assert.strictEqual(expiry.stillOpen, 1);
  assert.strictEqual(expiry.closedNow, 1, 'must close once past 12s');
  assert.ok(expiry.sameHandle, 'tick must return the handle it closed');
  assert.strictEqual(expiry.remaining, 0);

  // setHeld(true) pauses it indefinitely — this is the figure-hover case
  const held = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[1] });
    h.setHeld(true);
    for (var i = 0; i < 60; i++) window.EVQuotes.tick(1);   // a whole minute
    var survived = window.EVQuotes.openCount();
    h.setHeld(false);
    var closed = window.EVQuotes.tick(12.1).length;
    return { survived: survived, closed: closed };
  });
  assert.strictEqual(held.survived, 1, 'a held bubble must never expire');
  assert.strictEqual(held.closed, 1, 'releasing the hold lets it expire again');

  // pointer over the bubble pauses it without the figure code doing anything
  const hovered = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[2] });
    h.el.dispatchEvent(new MouseEvent('mouseenter'));
    for (var i = 0; i < 30; i++) window.EVQuotes.tick(1);
    var survived = window.EVQuotes.openCount();
    h.el.dispatchEvent(new MouseEvent('mouseleave'));
    var closed = window.EVQuotes.tick(12.1).length;
    return { survived: survived, closed: closed };
  });
  assert.strictEqual(hovered.survived, 1, 'pointer-over-bubble must pause the timer');
  assert.strictEqual(hovered.closed, 1);

  // keyboard focus inside the bubble also pauses it
  const focused = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[3] });
    h.el.querySelector('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    for (var i = 0; i < 30; i++) window.EVQuotes.tick(1);
    return window.EVQuotes.openCount();
  });
  assert.strictEqual(focused, 1, 'focus inside the bubble must pause the timer');

  // several bubbles each run their own clock
  const many = await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var a = window.EVQuotes.open({ headX: 300, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[0] });
    window.EVQuotes.tick(8);
    var b = window.EVQuotes.open({ headX: 900, headY: 500, tone: '#FF5740', quote: window.EVQuotes.QUOTES[1] });
    var firstOut = window.EVQuotes.tick(4.5);        // a expires, b has only had 4.5s
    return { count: window.EVQuotes.openCount(), closed: firstOut.length, wasA: firstOut[0] === a };
  });
  assert.strictEqual(many.closed, 1, 'only the older bubble should expire');
  assert.ok(many.wasA);
  assert.strictEqual(many.count, 1, 'the newer bubble stays open');

  // double-close must not throw or double-remove
  await page.evaluate(function () {
    window.EVQuotes.closeAll();
    var h = window.EVQuotes.open({ headX: 600, headY: 500, tone: '#007D99', quote: window.EVQuotes.QUOTES[0] });
    window.EVQuotes.close(h);
    window.EVQuotes.close(h);
  });

  console.log('03-timer: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/03-timer.cjs
```

Expected: FAIL — `window.EVQuotes.LIFE` is `undefined`, not `12`.

- [ ] **Step 3: Add the timer to `ev-quotes.js`**

Add `LIFE` beside the other module constants, and `tick` after `openCount`:

```js
  var LIFE = 12;   // seconds a bubble survives untouched

  function tick(dt) {
    var closed = [], i, h, paused;
    for (i = live.length - 1; i >= 0; i--) {
      h = live[i];
      // any of these means the reader is still reading: over the bubble, over the
      // Bobit (the figure code's job, via setHeld), or tabbed into the link
      paused = h.held || h.pointerIn || h.focusIn;
      if (paused) continue;
      h.life += dt;
      if (h.life >= LIFE) { closed.push(h); close(h); }
    }
    return closed;
  }
```

Then extend the export:

```js
  window.EVQuotes = {
    QUOTES: QUOTES, deal: deal, LIFE: LIFE,
    open: open, close: close, closeAll: closeAll, openCount: openCount, tick: tick
  };
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/03-timer.cjs
```

Expected: `03-timer: PASS`

- [ ] **Step 5: Commit**

```bash
git add ev-quotes.js tests/quotes/03-timer.cjs
git commit -m "feat(quotes): 12s bubble timer that pauses while you're reading"
```

---

### Task 4: The `drawReader` pose state machine

**Files:**
- Modify: `ev-figures.js` (add poses and `drawReader` next to `drawPhoneSeat`, which ends at line 1274)
- Test: `tests/quotes/04-poses.cjs`

**Interfaces:**
- Consumes: existing in-scope helpers `A` (`= R.ANIMATIONS`, line 18), `S` (`0.32`, line 20), `lerpPose` (line 280), `smooth01` (line 278), `drawFig` (line 393), `mx`/`my` (line 24), `R.REST`, `CFG` (line 18). `EVQuotes.open/close` from Tasks 2-3.
- Produces: `drawReader(e, ctx, w, h, tt, col, dt, cr)` — draws one seated reader and advances `e.qs`. States: `'read'`, `'lookup'`, `'hold'`, `'resume'`, `'shrug'`. Sets `e._qSX`/`e._qFY` (screen-coordinate click hitbox) and `e.qh` (the open bubble handle, or null).

**This function owns every plain seated reader, quote or no quote** — including the hover wave that quote-less readers have always had. That is deliberate: an earlier draft routed only quotable readers here and left the wave and the shrug duplicated in the generic seat branch, which meant two places to keep in step. One owner, one code path.

The pose functions are built by mutating a `clone(REST)` equivalent, matching how `phoneAbsorbed` and the cartwheel poses already do it. `R.REST` is exported by the rig.

- [ ] **Step 1: Write the failing test**

Create `tests/quotes/04-poses.cjs`. It forces one seated reader into a known state rather than relying on the random cast.

```js
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });

  // the four pose builders must exist and produce every joint the rig needs
  const poses = await page.evaluate(function () {
    var d = window.__evFigDebug;
    var keys = ['lean', 'headTilt', 'bob', 'hunch', 'armRU', 'armRF', 'armLU', 'armLF',
                'legRU', 'legRF', 'legLU', 'legLF'];
    function complete(p) { return keys.every(function (k) { return typeof p[k] === 'number'; }); }
    var g = d.quoteGlance(3), ho = d.quoteHold(3), sh = d.quoteShrugSeat(0.6);
    var rd = window.LeremyRig.ANIMATIONS.read.frame(3);
    return {
      complete: complete(g) && complete(ho) && complete(sh),
      // glance: head comes UP off the page relative to reading, book still up
      glanceLiftsHead: g.headTilt > rd.headTilt,
      glanceUncurls: g.hunch > rd.hunch,
      // hold: sat up further still, head up, hands lower than the reading curl
      holdUncurled: ho.hunch > g.hunch,
      holdHeadUp: ho.headTilt > 0,
      holdSeated: ho.legRU > 60 && ho.legLU > 60,
      shrugSeated: sh.legRU > 60 && sh.legLU > 60
    };
  });
  assert.ok(poses.complete, 'every pose must define all 12 joint angles');
  assert.ok(poses.glanceLiftsHead, 'hover must raise the head off the page');
  assert.ok(poses.glanceUncurls, 'hover should partly uncurl the spine');
  assert.ok(poses.holdUncurled, 'the hold pose must be more upright than the glance');
  assert.ok(poses.holdHeadUp, 'the hold pose must look up and out');
  assert.ok(poses.holdSeated, 'the hold pose must stay seated');
  assert.ok(poses.shrugSeated, 'the shrug must stay seated, not stand up');

  // force a reader to carry a quote, then drive the machine through a full cycle
  const cycle = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) {
      return x.spec.mode === 'seat' && x.spec.anim === 'read' && !x.spec.phone;
    })[0];
    if (!e) return { error: 'no seated reader in this cast' };
    e.spec.quote = window.EVQuotes.QUOTES[0];
    e.qs = 'read'; e.qsT = 0; e.qGlance = 0;
    var flipBefore = e.spec.x > 0.5;

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    e.qs = 'lookup'; e.qsT = 0;
    await wait(700);                       // longer than the 0.5s transition
    var afterLookup = e.qs;
    var bubbles = document.querySelectorAll('.ev-quote').length;
    var bubbleText = bubbles ? document.querySelector('.ev-quote q').textContent : null;

    // dismiss and let him settle back into reading
    if (e.qh) window.EVQuotes.close(e.qh);
    e.qh = null; e.qs = 'resume'; e.qsT = 0;
    await wait(700);

    return {
      afterLookup: afterLookup,
      bubbles: bubbles,
      bubbleText: bubbleText,
      expected: window.EVQuotes.QUOTES[0].text,
      afterResume: e.qs,
      flipUnchanged: (e.spec.x > 0.5) === flipBefore
    };
  });
  assert.ok(!cycle.error, cycle.error);
  assert.strictEqual(cycle.afterLookup, 'hold', 'lookup must settle into hold');
  assert.strictEqual(cycle.bubbles, 1, 'reaching hold must open exactly one bubble');
  assert.strictEqual(cycle.bubbleText, cycle.expected, 'bubble must carry his own dealt quote');
  assert.strictEqual(cycle.afterResume, 'read', 'resume must return him to reading');
  assert.ok(cycle.flipUnchanged, 'he must never be flipped — no turning in this feature');

  // the shrug self-terminates rather than sticking
  const shrugEnds = await page.evaluate(async function () {
    var d = window.__evFigDebug;
    var e = d.entries.filter(function (x) {
      return x.spec.mode === 'seat' && x.spec.anim === 'read' && !x.spec.phone;
    })[0];
    e.spec.quote = null; e.qs = 'shrug'; e.qsT = 0;
    await new Promise(function (r) { setTimeout(r, 3000); });
    return { state: e.qs, bubbles: document.querySelectorAll('.ev-quote').length };
  });
  assert.strictEqual(shrugEnds.state, 'read', 'the shrug must end and go back to reading');
  assert.strictEqual(shrugEnds.bubbles, 0, 'a shrug must never open a bubble');

  console.log('04-poses: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/04-poses.cjs
```

Expected: FAIL — `d.quoteGlance is not a function`.

- [ ] **Step 3: Add the poses and the state machine to `ev-figures.js`**

Insert immediately after `drawPhoneSeat` closes (after line 1274, before the `── BALANCER` comment block).

```js
    // ── SEATED READER. Owns every non-phone 'read' seat, whether or not the quote pool
    //    reached him.
    //    With a quote: hover → he lifts his head off the page but keeps hold of the book;
    //    click → he sits up, lowers the book into his lap and a speech bubble opens with his
    //    quote, the speaker's name linking to the source. He does NOT turn — `flip` stays as
    //    cast, so he is never spun round to face away from the note card he's sitting on.
    //    Without a quote: hover → the plain hello readers have always given; click → an
    //    apologetic seated shrug. (With 7 quotes and at most ~5 readers per load, nothing
    //    reaches that branch in production; it exists for a trimmed pool.) ──
    var QUOTE_TRANS = 0.5, QUOTE_SHRUG = 2.6, QUOTE_GLANCE = 0.35;

    // hover: same reading hold, head raised off the page
    function quoteGlance(t) {
      var p = A.read.frame(t);
      var br = Math.sin(t * 0.28 * Math.PI * 2);
      p.hunch = -(14 + br * 2);              // partly uncurled, still leaning in
      p.headTilt = 6 + Math.sin(t * 0.4 * Math.PI * 2) * 3;
      return p;
    }
    // settled: sat up, book down in the lap, looking up and out
    function quoteHold(t) {
      var p = Object.assign({}, R.REST);
      var br = Math.sin(t * 0.26 * Math.PI * 2);
      p.lean = 2;
      p.hunch = -(4 + br * 2);
      p.bob = br * 1.2;
      p.headTilt = 9 + Math.sin(t * 0.32 * Math.PI * 2) * 3;
      p.armRU = 70 + br;  p.armRF = 92 + br * 3;   // hands low and central: the book
      p.armLU = 52 - br;  p.armLF = 78 + br * 2;   // rides the hand midpoint into his lap
      p.legRU = 78; p.legRF = 11;
      p.legLU = 70; p.legLF = 5;
      return p;
    }
    // "sorry, nothing here" — shrug arms and head grafted onto the seated legs
    function quoteShrugSeat(t) {
      var p = Object.assign({}, R.REST);
      var c = ((t % 3.5) + 3.5) % 3.5;
      var sh = Math.min(1, Math.max(0, c / 0.5)) * Math.min(1, Math.max(0, (2.2 - c) / 0.6));
      p.lean = 2;
      p.bob = 1 - sh * 3;
      p.hunch = -6 - sh * 4;
      p.headTilt = 4 + Math.sin(t * 0.2 * Math.PI * 2) * 4 + sh * 12;
      p.armRU = 40 + sh * 34;  p.armRF = 36 + sh * 120;
      p.armLU = -18 - sh * 30; p.armLF = -14 - sh * 120;
      p.legRU = 78; p.legRF = 10;
      p.legLU = 70; p.legLF = 4;
      return p;
    }

    function drawReader(e, ctx, w, h, tt, col, dt, cr) {
      if (e.qs == null) { e.qs = 'read'; e.qsT = 0; e.qGlance = 0; e.qWave = 0; e.qh = null; }
      e.qsT += dt;
      var seatY = h - 42, flip = e.spec.x > 0.5;
      var pose, book = true, u;

      // same hover box the generic hover-greet uses, so the feel matches the rest of the cast
      var hovering = mx > -9000 && Math.abs(mx - (cr.left + w / 2)) < 36 &&
                     my > cr.top + h - 92 && my < cr.top + h + 6;

      if (e.qs === 'read') {
        if (e.spec.quote) {
          e.qWave = 0;
          e.qGlance += (hovering ? dt : -dt) / QUOTE_GLANCE;
          if (e.qGlance < 0) e.qGlance = 0;
          if (e.qGlance > 1) e.qGlance = 1;
          pose = e.qGlance > 0
            ? lerpPose(A.read.frame(tt), quoteGlance(tt), smooth01(e.qGlance))
            : A.read.frame(tt);
        } else if (hovering || e.qWave > 0) {
          // nothing to say: the plain seated hello, book down while he waves
          e.qWave += dt;
          if (!hovering && e.qWave > 2.2) e.qWave = 0;
          if (e.qWave > 0) { pose = A.greetseat.frame(e.qWave, e._wave); book = false; }
          else { pose = A.read.frame(tt); }
        } else {
          pose = A.read.frame(tt);
        }
      } else if (e.qs === 'lookup') {
        u = smooth01(Math.min(1, e.qsT / QUOTE_TRANS));
        pose = lerpPose(A.read.frame(tt), quoteHold(tt), u);
        if (e.qsT >= QUOTE_TRANS) {
          e.qs = 'hold'; e.qsT = 0;
          var sx = window.scrollX || window.pageXOffset || 0;
          var sy = window.scrollY || window.pageYOffset || 0;
          // head top in DOCUMENT coords: 128px of body plus the head radius, at scale S
          e.qh = window.EVQuotes.open({
            headX: cr.left + sx + w / 2,
            headY: cr.top + sy + (h - 42) - (128 + CFG.R) * S,
            tone: col,
            quote: e.spec.quote
          });
        }
      } else if (e.qs === 'hold') {
        pose = quoteHold(tt);
        if (e.qh) e.qh.setHeld(hovering);   // hovering HIM pauses his bubble's timer too
      } else if (e.qs === 'resume') {
        u = smooth01(Math.min(1, e.qsT / QUOTE_TRANS));
        pose = lerpPose(quoteHold(tt), A.read.frame(tt), u);
        if (e.qsT >= QUOTE_TRANS) { e.qs = 'read'; e.qsT = 0; e.qGlance = 0; }
      } else {                              // 'shrug'
        pose = quoteShrugSeat(e.qsT);
        book = false;
        if (e.qsT >= QUOTE_SHRUG) { e.qs = 'read'; e.qsT = 0; }
      }

      drawFig(ctx, w / 2, seatY, S, flip, pose, { color: col, book: book });
      e._qSX = cr.left + w / 2; e._qFY = cr.top + h;   // click hitbox anchor (screen coords)
    }
```

- [ ] **Step 4: Expose the poses on the debug hook**

Modify line 2047 so the test can reach the pose builders. Keep it gated on `#figdebug`.

```js
    if (location.hash === '#figdebug') window.__evFigDebug = {
      entries: entries, footWalk: footWalk, footStand: footStand,
      quoteGlance: quoteGlance, quoteHold: quoteHold, quoteShrugSeat: quoteShrugSeat
    };
```

- [ ] **Step 5: Dispatch to `drawReader` from the seat branch**

Modify the seat branch at line 1748-1755. Every non-phone `'read'` seat routes to `drawReader`; the remaining path serves `'sit'` seats only.

```js
        if (spec.mode === 'seat') {
          if (spec.phone) { drawPhoneSeat(e, ctx, w, h, tt, col, dt); return; }
          if (spec.anim === 'read') { drawReader(e, ctx, w, h, tt, col, dt, cr); return; }
          var animSe = e.greet ? A.greetseat : A[spec.anim];
          var ptSe = e.greet ? e.greet : tt;
          var seatY = h - 42;   // matches the seat line set in reposition(); leaves room for dangling legs
          drawFig(ctx, w / 2, seatY, S, spec.x > 0.5, animSe.frame(ptSe, e._wave), { color: col, book: (!e.greet && spec.anim === 'read') });
          return;
        }
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/04-poses.cjs
```

Expected: `04-poses: PASS`

- [ ] **Step 7: Commit**

```bash
git add ev-figures.js tests/quotes/04-poses.cjs
git commit -m "feat(quotes): quote-reader pose machine — glance, look up, hold, resume, shrug"
```

---

### Task 5: Wire it into the cast

**Files:**
- Modify: `ev-figures.js:246` (deal after `buildCast`, plus the zero-reader guarantee)
- Modify: `ev-figures.js:1595` (exclude quotable readers from the generic hover-wave)
- Modify: `ev-figures.js:41-98` (the click hit-test and click-off-to-dismiss)
- Modify: `ev-figures.js` (Esc handler; `EVQuotes.tick` in the frame loop)
- Test: `tests/quotes/05-integration.cjs`

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: the finished feature. No new exports.

**Two traps this task must avoid:**

1. **The existing click listener's `return` statements only exit the `forEach` callback, not the listener.** Clicking off to dismiss therefore cannot simply live inside the loop. Use a flag set inside the loop and act after it.
2. **The listener is registered `{ passive: true }`** (line 98). Do not call `preventDefault()` anywhere in it.

- [ ] **Step 1: Write the failing test**

Create `tests/quotes/05-integration.cjs`:

```js
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';

async function load(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });
  return page;
}

// click a reader through the real DOM, at his canvas centre, and wait for the bubble
async function clickReader(page) {
  const box = await page.evaluate(function () {
    var e = window.__evFigDebug.entries.filter(function (x) {
      return x.spec.mode === 'seat' && x.spec.quote;
    })[0];
    if (!e) return null;
    e.c.scrollIntoView({ block: 'center' });
    var r = e.c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height - 42 - 40, where: e.spec.quote.where };
  });
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
  const hoverOwnership = await page.evaluate(async function () {
    var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'seat' && x.spec.quote; })[0];
    e.c.scrollIntoView({ block: 'center' });
    var r = e.c.getBoundingClientRect();
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: r.left + r.width / 2, clientY: r.top + r.height - 82, bubbles: true
    }));
    await new Promise(function (res) { setTimeout(res, 300); });
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

  // hovering HIM pauses the timer (the change requested during design review)
  const pausedByFigure = await page.evaluate(async function () {
    var e = window.__evFigDebug.entries.filter(function (x) { return x.qh; })[0];
    var r = e.c.getBoundingClientRect();
    // put the shared pointer over him, then run the clock well past 12s
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: r.left + r.width / 2, clientY: r.top + r.height - 42 - 40, bubbles: true
    }));
    await new Promise(function (res) { setTimeout(res, 250); });   // let a frame set setHeld
    for (var i = 0; i < 20; i++) window.EVQuotes.tick(1);
    return window.EVQuotes.openCount();
  });
  assert.strictEqual(pausedByFigure, 1, 'hovering the Bobit must pause his bubble timer');

  // Esc closes and he goes back to reading
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(function () { return document.querySelectorAll('.ev-quote').length; }), 0,
    'Escape must close the bubble');
  await page.waitForTimeout(700);
  assert.strictEqual(await page.evaluate(function () {
    return window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'seat' && x.spec.quote; })[0].qs;
  }), 'read', 'after Escape he must settle back to reading');
  await page.close();

  // clicking him a second time closes it
  page = await load(browser);
  const c2 = await clickReader(page);
  await page.waitForSelector('.ev-quote');
  await page.mouse.click(c2.x, c2.y);
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(function () { return document.querySelectorAll('.ev-quote').length; }), 0,
    'a second click must dismiss');
  await page.close();

  // clicking somewhere else closes it
  page = await load(browser);
  await clickReader(page);
  await page.waitForSelector('.ev-quote');
  await page.mouse.click(5, 5);
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(function () { return document.querySelectorAll('.ev-quote').length; }), 0,
    'clicking off must dismiss');

  // clicking INSIDE the bubble must not dismiss it
  await clickReader(page);
  await page.waitForSelector('.ev-quote');
  const inside = await page.evaluate(function () {
    var r = document.querySelector('.ev-quote').getBoundingClientRect();
    return { x: r.left + 6, y: r.top + 6 };
  });
  await page.mouse.click(inside.x, inside.y);
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(function () { return document.querySelectorAll('.ev-quote').length; }), 1,
    'clicking inside the bubble must not dismiss it');

  // a quote-less reader shrugs and opens nothing
  const shrug = await page.evaluate(async function () {
    window.EVQuotes.closeAll();
    var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'seat' && x.spec.quote; })[0];
    e.spec.quote = null; e.qs = 'read'; e.qsT = 0; e.qh = null;
    var r = e.c.getBoundingClientRect();
    document.dispatchEvent(new MouseEvent('click', {
      clientX: r.left + r.width / 2, clientY: r.top + r.height - 42 - 40, bubbles: true
    }));
    await new Promise(function (res) { setTimeout(res, 300); });
    return { state: e.qs, bubbles: document.querySelectorAll('.ev-quote').length };
  });
  assert.strictEqual(shrug.state, 'shrug', 'a reader with no quote must shrug when clicked');
  assert.strictEqual(shrug.bubbles, 0);

  // the page must never scroll sideways because of a bubble
  const overflow = await page.evaluate(function () {
    return document.documentElement.scrollWidth <= window.innerWidth + 1;
  });
  assert.ok(overflow, 'a bubble caused horizontal page scroll');

  // and no errors along the way
  console.log('05-integration: PASS');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/05-integration.cjs
```

Expected: FAIL — `at least one reader must carry a quote` (nothing calls `deal` yet).

- [ ] **Step 3: Deal quotes and guarantee a reader**

Replace line 246 (`var SPECS = buildCast();`):

```js
    var SPECS = buildCast();

    // ── Hand out the presidential quotes. A cast can legitimately contain no readers
    //    (seats split between 'sit' and 'read', and ~40% of sitters get a phone), which
    //    would make the feature invisible on that load — so if the pool has something to
    //    say and nobody is reading, promote one sitter to a reader. This biases the cast
    //    very slightly toward readers, which is the intended trade. ──
    (function dealQuotes() {
      if (!window.EVQuotes) return;                 // module missing: readers just read
      function readers() {
        return SPECS.filter(function (s) {
          return s.mode === 'seat' && s.anim === 'read' && !s.phone;
        });
      }
      var rs = readers();
      if (!rs.length && window.EVQuotes.QUOTES.length) {
        var sitter = SPECS.filter(function (s) { return s.mode === 'seat' && !s.phone; })[0];
        if (sitter) { sitter.anim = 'read'; rs = readers(); }
      }
      if (rs.length) window.EVQuotes.deal(rs);
    })();
```

- [ ] **Step 4: Take readers out of the generic hover-wave**

Modify line 1595. `drawReader` now owns hover for every reader — the glance when he has a quote, the wave when he hasn't — so `e.greet` must never be set for a `'read'` seat. `'sit'` seats keep the generic behaviour unchanged.

```js
        var hoverable = (spec.mode === 'stand' && !spec.balance && !spec.peeker) || spec.mode === 'patrol' || (spec.mode === 'seat' && !spec.phone && spec.anim !== 'read');
```

- [ ] **Step 5: Add the click hit-test and click-off-to-dismiss**

Two edits to the listener that starts at line 41.

First, add the quote-reader test inside the `forEach`, immediately after the phone-sitter block (after line 88). It sets a shared flag because a `return` here only exits the callback:

```js
        // seated reader: click → he looks up and his bubble opens; click again → back to his
        // book. No quote reached him → an apologetic shrug instead.
        if (e.spec.mode === 'seat' && e.spec.anim === 'read' && !e.spec.phone && e._qSX != null) {
          if (Math.abs(ev.clientX - e._qSX) < 40 && ev.clientY > e._qFY - 104 && ev.clientY < e._qFY + 8) {
            hitQuote = true;
            if (e.qs === 'read') {
              if (e.spec.quote) { e.qs = 'lookup'; e.qsT = 0; }
              else { e.qs = 'shrug'; e.qsT = 0; }
            } else if (e.qs === 'hold') {
              if (e.qh) { window.EVQuotes.close(e.qh); e.qh = null; }
              e.qs = 'resume'; e.qsT = 0;
            }
            return;   // mid-transition clicks are ignored
          }
        }
```

Second, wrap the listener body so the flag can be declared and acted on. Change line 41 from `document.addEventListener('click', function (ev) {` to:

```js
    document.addEventListener('click', function (ev) {
      var hitQuote = false;
```

and change the closing of the `forEach` at line 97-98 from `});\n    }, { passive: true });` to:

```js
      });
      // clicking anywhere that isn't a reader (or a bubble, which stops propagation)
      // dismisses every open quote and sends those readers back to their books
      if (!hitQuote && window.EVQuotes && window.EVQuotes.openCount()) {
        window.EVQuotes.closeAll();
        entries.forEach(function (e) {
          if (e.qh) { e.qh = null; e.qs = 'resume'; e.qsT = 0; }
        });
      }
    }, { passive: true });
```

One hit-test covers both cases because `drawReader` sets `e._qSX`/`e._qFY` for every reader, quote or not. There is no second shrug code path to keep in step.

- [ ] **Step 6: Add the Esc handler**

Add after the click listener closes (after line 98):

```js
    // Esc dismisses every open quote bubble
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      if (!window.EVQuotes || !window.EVQuotes.openCount()) return;
      window.EVQuotes.closeAll();
      entries.forEach(function (e) {
        if (e.qh) { e.qh = null; e.qs = 'resume'; e.qsT = 0; }
      });
    });
```

- [ ] **Step 7: Advance the timers from the existing frame loop**

Add inside the frame function, immediately after the `entries.forEach(...)` draw loop closes at line 2044 (before the `requestAnimationFrame` call that continues the loop). Running one clock from the existing loop avoids a second `requestAnimationFrame` chain.

```js
      // expire any bubble whose 12s ran out, and send that reader back to his book
      if (window.EVQuotes) {
        var expired = window.EVQuotes.tick(dt);
        if (expired.length) {
          entries.forEach(function (e) {
            if (e.qh && expired.indexOf(e.qh) >= 0) { e.qh = null; e.qs = 'resume'; e.qsT = 0; }
          });
        }
      }
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/05-integration.cjs
```

Expected: `05-integration: PASS`

- [ ] **Step 9: Run the whole suite and check for console errors**

```bash
cd /c/ev-landing/ev-landing-main && for t in 01-deal 02-bubble 03-timer 04-poses 05-integration; do NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/$t.cjs || echo "FAILED: $t"; done
```

Expected: five `PASS` lines, no `FAILED`.

- [ ] **Step 10: Screenshot both themes for a visual check**

Create `tests/quotes/shots.cjs`:

```js
const { chromium } = require('playwright');

(async function () {
  const browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route('**/*', function (r) {
      return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
    });
    await page.addInitScript(function (t) { localStorage.setItem('ev:color-scheme', t); }, theme);
    await page.goto('file:///C:/ev-landing/ev-landing-main/index.html#figdebug');
    await page.waitForFunction(function () { return !!window.__evFigDebug; });
    const box = await page.evaluate(function () {
      var e = window.__evFigDebug.entries.filter(function (x) { return x.spec.mode === 'seat' && x.spec.quote; })[0];
      e.c.scrollIntoView({ block: 'center' });
      var r = e.c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height - 82 };
    });
    await page.mouse.click(box.x, box.y);
    await page.waitForSelector('.ev-quote');
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'screenshots/quote-bubble-' + theme + '.png' });
    console.log('wrote screenshots/quote-bubble-' + theme + '.png');
    await page.close();
  }
  await browser.close();
})();
```

Run it and open both files. Check: the border matches the Bobit's own colour, the tail meets his head, the quote and the linked name are legible against the card, and he is sitting up with the book in his lap rather than curled over it.

```bash
cd /c/ev-landing/ev-landing-main && NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" node tests/quotes/shots.cjs
```

- [ ] **Step 11: Commit**

```bash
git add ev-figures.js tests/quotes/05-integration.cjs tests/quotes/shots.cjs
git commit -m "feat(quotes): wire quote readers into the cast, clicks, Esc and the frame loop"
```

---

## Before this ships

- [x] **Kennedy link confirmed (2026-08-02).** Chris opened it; the text was then read from a Wayback
      capture (`https://web.archive.org/web/2024id_/<url>` gets past the Cloudflare challenge that
      blocks direct fetching). This corrected the dash to an en dash and confirmed the Box 899
      citation. All seven sources have now been read at source.
- [x] Merge `feat/bobit-quote-readers` into `main`. `main` auto-deploys to Render.
