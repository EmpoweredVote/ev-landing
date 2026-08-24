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
  //
  // hasOwnProperty is required, not decoration: `packs[active][id] != null` alone also finds
  // Object.prototype's own members. An id authored as 'toString' (this file is explicitly the
  // one a non-engineer opens, so an accidental collision is plausible) would resolve to the
  // built-in Function, which is non-null, so it would sail past this function AND past the
  // warn in resolve()'s caller — and then fill()'s `text.replace(...)` throws, because a
  // Function has no .replace. That throw lands inside ev-lines.js's resolve(), inside
  // ev-figures.js's greetOpen(), inside the animation tick — stalling the whole canvas for
  // every figure on the page, not just the one that spoke. Unreachable with the dotted ids
  // this catalog actually uses ('greet.hello', etc.), but ids() two functions up already
  // guards this correctly; leaving get() inconsistent with it is the actual bug being closed.
  function get(id) {
    if (!id) return null;
    if (packs[active] && Object.prototype.hasOwnProperty.call(packs[active], id) && packs[active][id] != null) return packs[active][id];
    if (packs[BASE] && Object.prototype.hasOwnProperty.call(packs[BASE], id) && packs[BASE][id] != null) return packs[BASE][id];
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
