# Bobit dialogue — design

**Date:** 2026-08-23
**Status:** approved, ready for implementation planning

## Summary

The greeter says one hardcoded sentence, forever, to first-time logged-out visitors only. This replaces
that with a small dialogue system: **what** a Bobit says lives in a data file, **which** line he picks is
decided by context (time of day, season, whether we know who you are), and **the words themselves** live
in a flat per-language catalog that carries no logic.

The greeter is the first speaker wired up. The same registry takes the rest of the cast later by adding
keys, and takes Spanish by adding a file.

Two things beyond plumbing change for the visitor:

- He speaks in **two beats** instead of one — a short welcome while he waves, then the button nudge when
  his arm lands on the buttons. Copy now tracks what his body is doing. Someone who already found the
  tools is not nudged at all, and someone who has scrolled the buttons off screen is not told to press
  something they cannot see.
- He greets **anyone, once per visit**, instead of first-timers-only-forever. That is what makes
  "Good morning" and "welcome back" reachable at all; today the people those lines are for are exactly
  the people the gate silences.

## Why the current shape can't grow

Everything about the greeting is one constant and one call site:

- `ev-figures.js:3150` — `GREET_SAY`, the whole script.
- `ev-figures.js:3232` — `quote: { text: GREET_SAY }`, handed to `EVQuotes.open()`.
- `ev-figures.js:3205` — `greetReady()`, whose last line is `!greetSeen() && !greetLoggedIn()`.

The bubble layer is already dialogue-agnostic and needs no changes: `ev-quotes.js` tells a quote from a
Bobit speaking for himself by whether the line has a `who`, and renders accordingly. The gap is entirely
upstream of the bubble.

`greetLoggedIn()` at `ev-figures.js:42` is worth naming separately. It answers "is this visitor signed
in?" by checking whether the logout item in the banner menu is visible — DOM-scraping another component's
render. It works as a boolean and cannot ever carry a name, so any personalized line is blocked on
replacing it.

## Architecture

Two new files, both plain IIFEs assigning a global with an idempotence guard, matching `ev-quotes.js` and
`leremy-rig.js`. The boundary that matters: **the engine holds no words, and the catalog holds no logic.**

### `ev-copy.en.js` (new)

A flat `id → string` map registered under a locale on `window.EVCopy`. No conditions, no nesting, no
code. This is the file a translator or a copy editor opens, and there is nothing in it they can break.

```js
EVCopy.register('en', {
  'greet.hello':     "Hi there. Welcome to Empowered Vote.",
  'greet.morning':   "Good morning. Welcome to Empowered Vote.",
  'greet.afternoon': "Good afternoon. Welcome to Empowered Vote.",
  'greet.evening':   "Good evening. Welcome to Empowered Vote.",
  'greet.halloween': "Happy Halloween. Welcome to Empowered Vote.",
  'greet.holidays':  "Happy holidays. Welcome to Empowered Vote.",
  'greet.back':      "Welcome back, {name}.",
  'greet.buttons':      "Press one of those buttons up there to start exploring.",
  'greet.buttons.gone': "The tools are back up the page whenever you want a look."
});
```

`{name}` is the one interpolation the catalog supports, filled from `ctx.name`. A line using it is only
ever selected behind the `named` tag, so it cannot render as "Welcome back, undefined." Keeping
substitution to a single named token means a translator can move it within the sentence — which Spanish
and German both need — without the engine having to parse anything.

A second language is `ev-copy.es.js` registering under `es`. Nothing else in the system changes.

These are `.js` and not `.json` on purpose: parts of the test harness load the page over `file://`, where
fetching a local JSON is blocked. A script tag assigning a global works in both places.

### `ev-lines.js` (new)

The engine, on `window.EVLines`. It owns exactly three jobs — build the **context**, evaluate
**predicates** into active tags, and **select** a line id for a speaker and beat. It knows nothing about
canvas, poses, or DOM.

The public interface is one registration call and three reads:

```js
EVLines.register('greeter', { beats: […] })   // a speaker's beats and conditions (see Selection)
EVLines.say('greeter', 'wave', facts)        // → "Hi there. Welcome to Empowered Vote." | null
EVLines.context()                             // → { hour, locale, loggedIn, name, returning, …, tags: [] }
EVLines.force(['halloween', 'evening'])       // author/test override: pin the active tags
```

`facts` is what only the *caller* can know — whether a tool has been highlighted, whether the button
column is still on screen. It is merged over the ambient context for that one call. This matters for the
boundary: without it, `EVLines` would have to reach into `ev-figures.js` for `featureEverOn`, which is
backwards for a module whose whole claim is that it knows nothing about canvas. The figures layer reports
what it sees; the engine decides what that means.

`EVCopy` mirrors that shape: `register(locale, map)` and `get(id)`, where `get()` resolves against the
active locale and falls back to `en`.

`say()` returning `null` means "nothing to say for this beat in this context." That is a legitimate
answer, not an error — the caller simply opens no bubble.

### `ev-figures.js` (modified)

`greetOpen()` asks `EVLines` for the beat's text instead of reading `GREET_SAY`; a second beat swaps in
later; the eligibility gate changes. Detailed below.

It keeps **one** hardcoded English fallback string, used only if `EVLines` or `EVCopy` failed to load.
A missing script then degrades to today's behavior rather than a mute greeter. This mirrors the existing
`if (!window.EVQuotes) return;` defensiveness at `ev-figures.js:3223`, with the difference that here the
bubble machinery still works, so there is something worth falling back to.

### `index.html` (modified)

Two script tags before `ev-figures.js` at `index.html:2318-2320`, and `window.EVSession` published out
of the banner-auth IIFE (below).

### `ev-quotes.js` — untouched

`EVLines.context()` is public specifically so that a future `deal(readers, ctx)` can prefer quotes
carrying a tag that matches the day — which is how "on MLK Day, more readers quote King" lands without
the quote pool growing its own notion of the calendar. **That is not built here.** The point of naming it
is that the context object is designed to be the thing it reaches for.

## `window.EVSession`

The banner-auth block at `index.html:1914-2035` already resolves a display name from the JWT
(`display_name` / `name` / `preferred_username` / `email`) and refines it from
`accounts-api.empowered.vote/api/account/me`. It keeps all of that to itself.

It gains a published object and an event:

```js
window.EVSession = { loggedIn: false, name: null };
// set inside showLoggedIn() / showLoggedOut(), then:
window.dispatchEvent(new CustomEvent('ev:session'));
```

Three properties of this matter:

- **`showLoggedIn()` and `showLoggedOut()` are the only writers.** They are already the single funnel
  for every path that resolves auth state — hash token, stored token, silent SSO, 401, logout — so
  publishing there covers all of them without touching the fetch logic.
- **Auth resolution is asynchronous**, and the silent-SSO path has a 3-second timeout. The greeter can
  therefore fire before the session is known. The `ev:session` event lets the context invalidate its
  memo so a later greeting sees the name; a greeting already on screen is left alone rather than
  rewritten mid-sentence.
- **`ev-figures.js:42`'s `greetLoggedIn()` DOM scrape is deleted**, replaced by reading `EVSession`.

The 'ev:session' event name follows the `ev:` prefix already used for storage keys (`ev:greeted`).

## Context and predicates

**Context** holds facts, not decisions. Computed on first use, memoized, invalidated on `ev:session`:

| Fact | Source |
|---|---|
| `now`, `hour` | the clock, unless `force()` overrode the derived tags |
| `locale` | `EVCopy` has a catalog for `navigator.language`'s base; else `en` |
| `loggedIn`, `name` | `window.EVSession` |
| `returning` | `localStorage ev:greeted` was already set on arrival |

Two more arrive per call, from the caller, because only it can see them:

| Fact | Reported by |
|---|---|
| `toolsFound` | the greeter's `featureEverOn` |
| `buttonsVisible` | `greetAim().vis >= GREET_BTN_MIN` |

**Predicates** are named boolean functions over the context, in one table:

```
morning / afternoon / evening      hour < 12 / 12–17 / ≥ 17
halloween / holidays / mlk-day     date windows over ctx.now
first-visit / returning            ctx.returning
logged-in / guest / named          ctx.loggedIn, ctx.name
tools-found                        ctx.toolsFound      (per call)
buttons-gone                       !ctx.buttonsVisible (per call)
```

The true ones become `ctx.tags`. "It's a leap year" or "they have three or more Compass sessions" is one
entry here plus one fact — selection logic does not change.

Date windows are computed in **local time**, deliberately: a visitor's Halloween is the one where they
are standing, not UTC's.

## Selection

Walk a beat's `lines` in file order. A line matches when *every* name in its `when` is in `ctx.tags`. A
line with no `when` is the fallback. First match wins.

**Order in the data file is priority.** No scoring, no weights, no specificity ranking. Put the seasonal
line above the time-of-day line and the season wins on Halloween morning; that is the entire rule, and it
means a copy author debugging an unexpected line reads down a list rather than reasoning about a
tiebreak.

```js
EVLines.register('greeter', {
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
    { at: 'point', lines: [
        { id: null,                 when: ['tools-found'] },   // they found them; say nothing
        { id: 'greet.buttons.gone', when: ['buttons-gone'] },
        { id: 'greet.buttons' }
    ]}
  ]
});
```

`id` may be an array, in which case one is chosen at random and held for the session, so he is not
reciting an identical greeting every visit:

```js
{ id: ['greet.hello.a', 'greet.hello.b', 'greet.hello.c'] }
```

`id: null` is a deliberate silence — a matched line that says nothing, which is how a beat is suppressed
by context rather than by a branch in `ev-figures.js`. It is distinct from *no line matching*, which also
yields no bubble but means the author left a gap. Both are silent to the visitor; only the second is a
smell, and keeping them separate is what lets the tests tell them apart.

An id with no catalog entry resolves to `null` and logs a `console.warn` naming the id. Silent muting
would make a typo very hard to find; throwing would take the canvas down over a copy error.

## Authoring and debugging

`?evlines=halloween,evening` pins the active tags for that page load, which does two jobs:

- You can look at a seasonal line in a real browser in August without changing your system clock.
- Date-dependent selection becomes deterministic in tests, with no clock mocking.

The existing `#greeter` force at `ev-figures.js:37` is unchanged and composes with it. The debug surface
at `ev-figures.js:4296` gains `lines` (the resolved beat text) and `tags` alongside the existing
constants; `SAY` is dropped, since there is no longer a single string to report.

## Beats

`ev-quotes.js` places a bubble once, in document coordinates, and exposes `open()` / `close()`. Beat 2 is
therefore: close beat 1's handle, open a new one at the head's current position. **One bubble live at a
time** — two stacked over one head is a mess, and the second would cover the first.

Timing falls out of gestures he already performs:

```
0.00   wave starts
0.55   beat 1 opens        ← GREET_SAY_AT, unchanged
1.20   wave ends, turn begins
1.55   arm lands on the buttons (hold)
2.35   beat 2 swaps in     ← GREET_SAY2_AT
```

`GREET_SAY2_AT = max(GREET_WAVE + GREET_TURN, GREET_SAY_AT + BEAT_MIN_DWELL)`, with
`BEAT_MIN_DWELL = 1.8`. Derived rather than written as `2.35` because it encodes two separate intents:
never say "those buttons up there" before the arm gets there, and never yank beat 1 away in under
1.8 seconds. With today's constants the dwell rule binds, so he holds the point for a beat before the
second line lands — he gestures, then explains.

**The swap is unconditional.** At `GREET_SAY2_AT`, beat 1 closes and beat 2 is asked for. Whether beat 2
has anything to say is a *selection* question, answered by the data file — not a branch in the drawing
code. That is the whole point of the split: "who deserves a nudge, and worded how" becomes a list a copy
author can read, instead of a condition buried at `ev-figures.js:3211`.

What the selector does with it:

| highlighted a tool | button column | beat 2 |
|---|---|---|
| no | on screen | `greet.buttons` — teaches where they are |
| no | scrolled off | `greet.buttons.gone` — does not say "press" an invisible button |
| yes | either | `id: null` — silence |

**Signed in and returning do not change the nudge.** A variant that encouraged a known visitor to explore
rather than telling them where to press was tried in an earlier draft of this design and cut: it read as
filler next to the plain instruction, and there is no evidence a returning visitor has actually seen the
tool buttons — only that they have been on the site. Beat 1 is where knowing who someone is pays off; the
nudge stays one sentence that is true for everyone who has not touched a tool.

`tools-found` sits at the top of the list, so highlighting a tool beats everything else. It is the only
*demonstrated* knowledge in the table, as against the assumed kind.

**`featureEverOn` moves out of the eligibility gate.** It currently silences the whole greeting
(`ev-figures.js:3211`). That is right for the nudge and wrong for "Good morning", so it becomes the
`tools-found` fact and only ever suppresses beat 2.

**Beat 2 does not require the column to be visible**, only that his head still is — a bubble opened at a
head above the viewport is invisible and yet live, so the next tap would dismiss something the visitor
never saw. The arm keeps its remembered document-space aim (`giAimDoc`) and stays on the buttons as they
scroll off, which is what he already does after speaking today; `greet.buttons.gone` is the wording that
makes that honest.

**Dismissal cancels the pending swap.** Today `greetDismiss()` closes the bubble and eases him to
standing. With two beats, a click at t=1.0s would otherwise get a bubble popping back at t=2.35s, just
after you dismissed one. This is the one genuinely new failure mode the beat split introduces, and it
gets its own test.

**When beat 2 is silent, beat 1 stays up** until dismissed, matching `EVQuotes.LIFE = 0` — bubbles on this
page wait for a tap rather than expiring. Nothing closes beat 1 just to leave an empty head.

Beat 1's abort path is unchanged: if the column leaves before he has spoken at all, he settles and says
nothing.

## Eligibility

| | today | after |
|---|---|---|
| repeat suppression | `localStorage ev:greeted` — once per browser, forever | `sessionStorage ev:greeted:session` — once per visit |
| `localStorage ev:greeted` | *is* the suppression gate | still written; now only feeds `returning` / `first-visit` |
| signed in | suppressed entirely (`ev-figures.js:42`) | greeted; becomes the `logged-in` / `named` tags |

`markGreetSeen()` writes **both** stores when the greeting fires: `sessionStorage` to suppress a repeat
this visit, `localStorage` so a later visit knows they are `returning`. `ctx.returning` is snapshotted
from `localStorage` when the context is first built — before any greeting can have written it — so a
first-time visitor is not told "welcome back" by their own arrival.

Every other clause of `greetReady()` stays exactly as it is: downward scroll, 60px of travel, head and
foot clearance, the button column still on screen, POOF idle.

The **downward-scroll requirement is deliberately kept**. He will not fire when he comes into view as you
scroll back *up* to the hero, per the reasoning at `ev-figures.js:43` — being flagged down on the way up
reads as nagging. Combined with the head/foot clearance already in the gate, "roughly half a second after
you first see him" is what a visitor experiences on the way down.

## Copy

Lines follow `docs/voice-and-tone.md`: plain language, short sentences, no hype, no guilt. "Hi there.
Welcome to Empowered Vote." over an exclamation-stacked version of the same thing; the current
`GREET_SAY` has two exclamation marks in one sentence and reads louder than the rest of the site.

`greet.buttons.gone` is the one nudge variant that earns its place, and the reason is honesty rather than
tone: "press one of those buttons up there" is a small lie once the column has scrolled off, and the guide
is explicit that we do not ask people to act on something we have not actually shown them. Every other
visitor gets the same single sentence.

Seasonal lines stay neutral about *whose* holiday it is — "Happy Halloween" is safe, and a December line
says "Happy holidays" rather than naming one. This is the same reason the tool copy avoids assuming a
party: the site is for people who disagree with each other.

## Testing

TDD, per the repo norm. `tests/greeter/01-fires.cjs:12` currently hardcodes a *copy* of the greeting
string, so a wording change breaks a test for no good reason. It changes to assert against
`EVCopy.get('greet.hello')`, which is what that assertion actually means.

New:

- **`tests/lines/01-select.cjs`** — selection only, driven against a minimal `tests/lines/fixture.html`
  that loads `ev-copy.en.js` and `ev-lines.js` and nothing else. `ev-lines.js` is a browser IIFE assigning
  a global, so it cannot be `require()`d; running it in Playwright against a fixture with no canvas keeps
  these assertions fast and honest at the same time. Covers first-match-wins, `when` as an AND, the
  no-`when` fallback, an unknown id resolving to `null` with a warning, array-of-ids picking within the
  set and holding for the session, `{name}` substitution, locale falling back to `en`, and `id: null`
  being distinguishable from no-line-matched.
- **`tests/lines/02-predicates.cjs`** — `?evlines=` tag forcing, and each hour and date window resolving
  correctly at its boundaries (23:59 on 31 October is still `halloween`; 12:00 is `afternoon`, not
  `morning`).
- **`tests/greeter/04-beats.cjs`** — beat 1 during the wave, beat 2 at 2.35s, never two bubbles live at
  once, a dismissal at t=1.0s leaving nothing behind at t=3.0s, and each row of the beat-2 table above:
  `featureEverOn` leaving beat 1 up with no beat 2, a visitor who scrolled the column off getting
  `greet.buttons.gone`, and a signed-in visitor getting the *same* `greet.buttons` as a stranger — that
  last one is a regression guard, since a personalized nudge is exactly the thing a later contributor
  would think to add back.
- **`tests/greeter/02-suppressed.cjs`** — updated: the same session stays quiet, a fresh session greets
  again, and a signed-in visitor now *does* get greeted.
- **`tests/greeter/05-session.cjs`** — `EVSession` published, `ev:session` invalidating the context memo,
  and a greeting already on screen not being rewritten when the name arrives late. Note the constraint
  the existing suite imposes: every test aborts all `http(s)` requests (`tests/greeter/01-fires.cjs:16`),
  so the silent-SSO and `/account/me` paths cannot be exercised. A signed-in visitor is simulated by
  seeding `localStorage ev_token` with a locally-built unsigned JWT carrying a `display_name`, which
  drives the synchronous `decodeName()` path; `refreshName()`'s fetch fails and is already designed to
  keep the JWT-derived name. The late-arriving-name case is driven by dispatching `ev:session` by hand.

The full suite runs detached before committing, per the usual ceiling.

Screenshots: `tests/greeter/shots.cjs` gains a beat-2 frame in both themes at both widths, since the
second bubble's placement over the head is new and is the kind of thing green tests can pass while
looking wrong.

## Out of scope

Each of these is reachable from this design without rework. None is built here.

- **Remote or fetched copy.** Data file only; changing a line is a deploy.
- **Quote-pool weighting** — the MLK-Day case. `EVLines.context()` is built to feed it; `deal()` is
  untouched.
- **Per-line frequency policy.** Once per session, uniformly. A line that should recur until acknowledged
  needs its own state and is a separate decision.
- **Account-history facts** — "your Symposium results are in", "we now serve N cities and counties".
  These need API fields that do not exist yet. The predicate table and the context are where they plug
  in; the interesting work there is the API, not the dialogue.
- **The rest of the cast.** Readers, crossers, and the beam crew get keys in the same registry later.
  Only the greeter is wired up here.
- **Spanish.** The seam is built and unused. `ev-copy.es.js` is a translation task, not an engineering one.
