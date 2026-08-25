# ev-landing

Public alpha landing page for [Empowered Vote](https://empowered.vote).

A single static HTML page that:

- Briefly explains what Empowered Vote is.
- Links out to each Inform-pillar tool (Compass, Essentials, Read & Rank, Treasury Tracker, Empowered Badges, Civic Trivia Championships).
- Is honest about the alpha state — small part-time team, AI-assisted development with human review, things will break.
- Points to [financials.empowered.vote](https://financials.empowered.vote) for funding transparency.

## Develop

No build step. Open `index.html` in a browser, or:

```bash
python3 -m http.server 5173
# then visit http://localhost:5173
```

## Analytics

We use PostHog to see how many people visit each page and how long they stay.

**Adding a new page? Put this line near the top of its `<head>`:**

```html
<script src="analytics.js"></script>          <!-- a page at the repo root -->
<script src="/analytics.js"></script>         <!-- a page in a subdirectory -->
```

The two forms are not interchangeable, and the check below enforces which one you
need. A subdirectory page (`briefing/`, `maps/`) must use the leading slash, or the
path resolves against its own folder and 404s. A root page must leave it off, or the
page cannot be opened from `file://` for local testing — a root-absolute path there
resolves to `C:/analytics.js`, and every click handler that calls PostHog throws.

That's the whole setup. Everything about how this site measures traffic lives in
`analytics.js`, so if it ever needs changing, change it there — not in a page.

There's an automatic check that warns when a page is missing that line. It
exists because four pages (the three maps and the briefing) were quietly
measuring nothing at all until 2026-08-17.

**That check warns, but does not block merges** (Chris Andrews, 2026-08-17).
Our analytics setup is currently understood by only a small number of people, so
we don't want to block someone because they can't fix a warning on their own.
That's intentional — for now. Please ask before changing it.

### Three easy ways to misread the numbers

- **PostHog's "avg time on page" isn't really an average.** It leans toward the
  longest visits, and a browser tab left open counts the whole time — one visit
  measured 63 days. Use the
  [Time on page — median](https://us.posthog.com/project/444996/insights/aYA2KCir)
  report instead; it shows the typical visit.
- **Pages that instantly forward you elsewhere still get counted**, and show up
  as visits lasting a fraction of a second. That's real, not a mistake.
- **An app that doesn't announce its own navigation looks like nobody gets past
  the front page.** Treasury Tracker changed the address bar as you moved through
  a budget but never told PostHog, so every one of its visitors was recorded
  against the bare domain and nothing else. On 2026-08-15 the briefing published
  "seven people in a quarter opened any of Treasury Tracker" off that data. The
  events were fine; the denominator was not, and the figure was withdrawn the next
  day. Treasury was fixed on 2026-08-16 and now sends a pageview when its URL
  changes. The rule it left behind, which applies to every app we measure:
  **a low count is a claim about the instrument until you have read the code path.**

### Checking that a page really measures

- **You cannot smoke-test our analytics with Playwright, or any other browser
  automation.** Two separate walls, both hit on 2026-08-16. Locally, `analytics.js`
  marks localhost traffic as internal and test. On production, posthog-js loads its
  assets and then transmits nothing at all under an automated browser — including
  for events that are known to work, and spoofing the user agent doesn't help. That
  silence is not evidence of a broken instrument.
- **To confirm new capture code actually shipped, read the deployed bundle.** Fetch
  the site, pull its `/assets/index-*.js` chunk, and grep around the call you added.
  That is what settled the Treasury fix, after the browser tests proved nothing
  either way.
- **At our traffic levels, check where the "visitors" are before believing them.**
  A `$geoip_city_name` breakdown is the cheap discriminator — Boardman, Burleson and
  Dulles are datacenter ranges, not people. Four of Treasury's first six post-fix
  visitors were bots or us.
- **PostHog's relative date ranges snap to midnight.** `-2d` with a daily interval
  silently excludes today, which reads as a confident zero. Use `-24h` or `-12h`
  with an hourly interval when you're checking whether something that shipped this
  morning is capturing.

## Dialogue

The hero's greeter — and any future talking Bobit — draws on two files that split
cleanly along one line: what he says, and which of those things he says right now.

**`ev-copy.en.js` is the words, and holds no logic at all.** It is a flat id-to-string
catalog — `'greet.halloween': "Happy Halloween. Welcome to Empowered Vote."` — with no
conditions, no nesting, nothing to execute. That is deliberate: changing what a Bobit
says should never mean reading a condition, just editing a string next to the id whose
wording you want to fix. The one piece of logic the catalog format supports is `{name}`
substitution, filled in from the visitor's session.

**`ev-lines.js` is the choosing, and the one rule worth carrying around is FILE ORDER IS
PRIORITY.** Each beat (`wave`, `point`, …) is a list of candidate lines, walked top to
bottom; the first line whose `when` tags are all currently active wins, and a line with
no `when` is the fallback that catches everyone else. `when` is always an AND — there is
no OR, no weighting, no score. That absence is the point: if a Bobit says something
unexpected, you debug it by reading down the list until you find the line that matched,
not by reasoning about which of several candidates would have scored highest. Order the
list the way you'd want the priority explained out loud, and the code and the explanation
stay the same document.

**To look at a line that isn't true right now, pin it with `?evlines=`.** Appending
`?evlines=halloween,evening` to a page URL forces exactly those tags active for that one
load, bypassing the clock and the visitor's real state entirely — which is the thing you
need on the day you're writing the December greeting in August. The full set of tag names
selection currently knows about: `morning`, `afternoon`, `evening`, `halloween`,
`holidays`, `mlk-day`, `first-visit`, `returning`, `logged-in`, `guest`, `named`,
`tools-found`, `needs-tools`, `buttons-gone`, `desktop`, `touch`.

One trap worth knowing: forcing tags **replaces** the derived set rather than adding to it.
So `?evlines=morning` means morning is the *only* active tag — you will not also get
`guest` or `first-visit` unless you name them. That is what makes these previews
deterministic, and it also means a forced page can never exercise a tag that only real
state produces, such as `tools-found` from an actual hover.

`#greeter` is the other lever. Its job now is narrow but real: it skips the
"where you are right now" checks, which matters on a reload, because the browser restores
your scroll position without firing a scroll event.

**Adding a new condition is two small edits, not a refactor.** Give it one entry in the
`PREDICATES` map (a name and a function from context to true/false) and one fact in
`context()` for that predicate to read. Most facts are ambient — the time, the session —
but some are things only the *caller* can see, and those arrive as per-call facts instead
of being computed inside `ev-lines.js`. `toolsFound` and `buttonsVisible` are the existing
example to copy: only `ev-figures.js` knows whether a tool has been highlighted or whether
the button column is still on screen, so it reports those two facts on every call rather
than `ev-lines.js` reaching into the canvas to check for itself. Keeping that boundary is
what lets the dialogue engine claim, truthfully, to know nothing about drawing.

**A second language is one new file and one script tag — nothing else changes.** Add
`ev-copy.es.js` calling `EVCopy.register('es', { 'greet.hello': "...", ... })` for every id
you want translated, then add its `<script>` tag next to the English one. The locale is
picked up automatically from `navigator.language` when a catalog for it has been
registered; if a given id is missing from that catalog — a translation not written yet —
it falls back to English for that id alone rather than breaking the sentence around it.
Selection in `ev-lines.js` never needs to know a second language exists.

**Landmine: guard your new file on its OWN pack, not on `EVCopy` existing.**
`ev-copy.en.js` conflates the two — its top-of-file guard is `if (window.EVCopy) return;`,
which is really "define `EVCopy` and register `en`" collapsed into one check. The natural
way to write `ev-copy.es.js` is to copy that file, which copies the guard too — and then
your new file is a silent no-op forever, because `window.EVCopy` is already truthy by the
time it runs. Worse, if `ev-copy.es.js`'s script tag happens to land BEFORE `ev-copy.en.js`'s
in the page, the *English* file is the one that bails out on that same guard, so `EVCopy`
exists with no packs registered at all and every `get(id)` returns null — muting the
greeter site-wide, not just in Spanish. Guard a new language file on whether its own pack
is already registered instead: `if (!window.EVCopy || window.EVCopy.has('es')) return;`.

**He greets once per page load, and nothing stored ever stops him.** That rule has moved
twice. It began as once per browser, forever — which silenced every returning and
signed-in visitor, precisely the people a contextual line is written for. It then became
once per visit, held in `sessionStorage`, which still meant a reload said nothing and a
private window was the only way to see the greeting again. Both gates are gone.

What made removing them safe was not a change of mind about nagging; it was having enough
to say. Every line he can repeat is drawn from a pool — three openers per time of day,
three welcome-backs, twenty-odd tips — so arriving twice gets you two different sentences.
**Variety is what does the work the gate used to do.** If those pools are ever cut back to
one line each, revisit this, because then a reload really would just repeat itself.

**One key survives, and it is a fact rather than a gate.** `localStorage['ev:greeted']`
means "this browser has been here before". Nothing consults it to decide whether to speak;
it feeds the `returning` and `first-visit` predicates, which is what decides whether beat 2
is the button nudge or a tip. It is written both when he greets and when you hover a tool,
because finding the tools yourself also means you have been here. It is read *eagerly at
page load*, before anything can write it, so hovering a tool halfway down the page cannot
retroactively turn your first visit into a returning one.

`greetReady()` still has several early-outs, but they are all about where you are right
now: which way you are scrolling, how far down the page, whether all of him and the button
column are on screen, whether the page is mid-POOF, whether he is already talking. One of
them is worth knowing about. He will not greet you while you scroll *up* into the hero —
being flagged down on the way up reads as nagging — and `#greeter` deliberately cannot
override that, though it does override the rest.

**Beat 2 is the nudge or a tip, and a pool is the second selection shape.** He speaks
twice: a welcome while he waves, then something useful once his arm lands. That second
thing is the button nudge only for a first-time visitor who has not touched a tool —
the one person it helps. Everyone else gets one of the `tip.*` lines, which are the
organization's values, the things the site can do, and a few asides in his own voice.

Tips live in a `pool`, and a pool is the *only* place selection stops being
first-match-wins: its entries are unordered, and one of the ones that fit is drawn at
random per page load. That is the point — a returning visitor should get a different
line, not the same sentence again. Members can still carry a `when`, so the poof tip has
a desktop wording and a touch wording and a phone is never told to press a right mouse
button. Within one page load the draw is held, so the bubble and his arm can both ask
what he is saying and get the same answer.

**A line can name what he points at.** Add `aim: '#profile-btn'` to a line and his arm
goes there instead of to the tool buttons, which is how the tip about the Feedback menu
can say "up there in the top right corner" and actually indicate it. The selector is
looked up every frame, so a sticky target stays tracked as the page scrolls, and one
that matches nothing falls back to the buttons rather than leaving him pointing at
nowhere. One caution learned the hard way: a target only needs to be *visible* to be
worth pointing at, not 40px tall like the button column. Pointing at the 36px account
menu silently failed that older threshold and left him standing with his arms down while
the bubble promised otherwise — which no assertion caught, and a screenshot did.

## Deploy

Configured for Render as a static site via `render.yaml`. Connect the repo on Render and it will publish `./` (root) on every push to `main`.

## Stack

- Plain HTML + CSS + a tiny script for the footer year.
- Manrope from Google Fonts.
- Empowered Vote color palette: coral `#ff5740`, blue `#00657c`, light blue `#59b0c4`, yellow `#fed12e`.
