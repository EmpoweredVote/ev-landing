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
`tools-found`, `buttons-gone`. Add `#greeter` to the URL as well and he'll also ignore
having already greeted you this session, so you don't have to clear storage between
reloads while you're iterating on a line.

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

**Two storage keys track two different questions, and merging them would reintroduce a
bug this design removed.** `localStorage['ev:greeted']` means "this browser has been here
before" — it feeds the `returning`/`first-visit` predicates, and outlives the tab.
`sessionStorage['ev:greeted:session']` means "he has already greeted you this visit," and
is the *only stored signal* `greetReady()` checks to decide whether to stay quiet — of the
two keys, it is the sole suppression switch. (`greetReady()` itself has several other
early-outs beyond the two keys — scroll direction, scroll distance, head/foot clearance,
no visible aim, the POOF phase, already mid-greeting — but those are all about *where you
are right now*, not what is *remembered* between visits; the keys are the only part of the
gate with memory.) Hovering a tool writes only the first of the two. If it wrote the
second as well, finding the tools on your own — by hovering one on your way down the
page, before he ever gets a chance to speak — would silence the welcome along with the
nudge it's meant to make redundant: you'd never see him greet you at all, just because you
found the buttons yourself first. The two keys stay separate so "have we met before" and
"have I already said hello this visit" can keep answering different questions, and only
the second one ever stops him from talking.

## Deploy

Configured for Render as a static site via `render.yaml`. Connect the repo on Render and it will publish `./` (root) on every push to `main`.

## Stack

- Plain HTML + CSS + a tiny script for the footer year.
- Manrope from Google Fonts.
- Empowered Vote color palette: coral `#ff5740`, blue `#00657c`, light blue `#59b0c4`, yellow `#fed12e`.
