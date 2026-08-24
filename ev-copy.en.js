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

  // ── The greeter's tips ───────────────────────────────────────────────────────────────
  // Beat 2 says one of these instead of the button nudge, to anyone who does not need the
  // nudge. They are Chris's words; the edits here were typos and two merges, nothing else.
  //
  // A pool, not a list: one is drawn at random per page load, so a returning visitor gets a
  // different line rather than the same sentence again. That variety is the thing that makes
  // greeting a repeat visitor pleasant instead of nagging.
  //
  // Curly quotes inside the copy are deliberate — they are display text, and it keeps the JS
  // strings free of escapes.
  register('en', {
    // Two devices, one idea. A phone has no right mouse button, and telling someone to press
    // one is the kind of small wrongness that makes the rest sound careless.
    'tip.poof.desktop':      "If we Bobits are getting in the way, just hold down your right mouse button over one for 3 seconds. The rest of us will scatter.",
    'tip.poof.touch':        "If we Bobits are getting in the way, just press down on one for 3 seconds. The rest of us will scatter.",

    'tip.compass.calibrate': "Once you calibrate your compass, it is much easier to understand the folks in the Essentials at a glance.",
    'tip.compass.visual':    "Calibrate your compass once, and from then on you can see how you relate, visually, with candidates and incumbents.",
    'tip.compass.what':      "The compass allows you to pick the issues you care the most about, and find leaders who agree with you in nuance.",
    'tip.readrank':          "Read & Rank is like a blind taste test, but for politicians. You read their stances, say if you agree or not, rank the ones you like, and then find out who said what.",

    'tip.privacy':           "We will never sell your data. We will never sell services or advertisements. We do not support “Pay for Power”.",
    'tip.citizens-first':    "We support citizens before political parties.",
    'tip.values':            "We're a value-driven organization, and the value that guides us is the search for shared solutions. Right up there at the top!",
    'tip.equation':          "Shared Facts + Shared Values = Shared Solutions",

    'tip.oversight':         "If citizens are going to have oversight in a democracy, they have to pay attention to what's happening.",
    'tip.local':             "Just due to percentages, our vote has a lot more influence in Local elections than State. And more influence in State elections than Federal.",
    'tip.wealth':            "When our democracy requires wealth to get elected, our democracy will primarily serve the Wealthy.",

    'tip.feedback':          "You can reach us anytime up there in the menu at the top right corner under “Feedback”. Real people read it.",
    'tip.briefing':          "If you want the latest on our progress, there's a link to our briefing in our footer.",
    'tip.mindmap':           "If you want to explore what we're working on at a high level, there's a link to our Mind Map in the footer.",
    'tip.newsletter':        "Want to follow our progress from a casual distance? Sign up for our Newsletter!",

    'tip.readers':           "If you click on a Bobit that's reading a book, they'll give you a quote.",
    'tip.gig':               "Sometimes I get asked how I got this gig. It's like anything else: luck and hard work.",
    'tip.wip':               "We are a constant work in progress.",
    'tip.best':              "We're all trying our best."
  });
})();
