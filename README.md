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

## Tests

Playwright drives every test against `file://` URLs. The library is a
devDependency; the browsers it needs are not, because npm installs the library
and Playwright downloads the browsers separately:

```bash
npm install
npx playwright install    # ~300MB, once per Playwright version
```

There is no runner. Each file is its own script, prints PASS, and throws on
failure:

```bash
node tests/layout/beam-play-pass.cjs
```

**The version is pinned exactly, not caret-ranged, and that is deliberate.**
Each Playwright release expects its own browser builds, and `npx playwright
install` prunes the builds it no longer wants. Under a floating range an
ordinary `npm install` can move the library ahead of the browsers on disk and
every test then dies at launch with "Executable doesn't exist" — which reads
like a broken test rather than a version skew. That happened here on
2026-10-22: a stray 1.62.1 in `node_modules` with no browsers shadowed a
global 1.61.1 that had them, and because a local `node_modules` always beats
`NODE_PATH`, the command printed in every test header stopped working. Pinning
and committing the lockfile is what keeps the library and the browsers in step.

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

**He is a switch, not a one-way door.** Clicking the Bobit who is talking to you says "got
it", and it has always closed the bubble. He now *remembers* the line, so clicking him again
puts it back: the last line he showed, word for word, with his arm returning to whatever it
was indicating. The text is stored rather than re-resolved on the way back, because the
context can move while the bubble is down — the column scrolls off, a tool gets highlighted —
and "what he just said" must not quietly become a different sentence.

Two consequences are worth knowing. A click on a greeter who has not spoken at all — you came
up to him from below, so `greetReady()` kept him quiet — starts the greeting instead, since
clicking a Bobit should never be inert. And the button nudge is the one line that does *not*
survive: hovering a tool clears it, because telling someone where the buttons are after they
have found them is the same staleness the data file already avoids. The re-opening itself is
done in the draw loop rather than the click handler, as only the draw loop knows where his
head is this frame, and that is where a bubble is anchored.

## Seasonal takeovers

Between **October 25 and the 31st** the page is overrun. A zombie Bobit shambles on from one
side with his arms out; any inhabitant he gets within a few steps of throws his hands up and
bolts for the nearest edge. The zombie turns and follows him off. Nobody who runs comes back
as himself — a while later he shambles on as another zombie — so a page left open slowly
turns, and the cast only ever converts.

**He walks on a full-bleed rule, and there are four of them.** The page's 1px rules between
sections are the only horizontal surfaces that exist for the whole width he crosses, and
`sectionBreakLines()` already finds them. `zombieLanes()` keeps every rule from the **bottom
of the hero** downward: that edge, then between Why and How, between How and Watch, and the
one under Watch. The banner rule under the header stays out — a zombie crossing the headline
is a different joke from one wandering in past the work, and it is the one rule with nobody
standing on it.

The hero's bottom edge is the **carry lane**, and it earns its own name. It is the line the
beam crew walk, which makes it the only line on the page where anybody is holding anything —
so it is the only one where the panic leaves something behind. `ZOM.CARRY_W` picks it 60% of
the time when it is on screen and there is a choice. The lanes originally started a section
lower, which meant the carriers could never be reached at all.

Anchoring him to a host figure's own floor instead is what left him treading air: a seated
reader's floor is the edge of a note card, 190px of surface under a 1432px walk, and measured
on the live page he came out **522px below the nearest real rule**, standing inside a card.

Two consequences fall out of tying him to section boundaries, and both are real:

- **Sections are taller than the viewport, so there are dead zones.** On a desktop that is
  roughly 500px of scroll in the middle of section 02 with no rule in view, and a spawn there
  simply fails. It retries after `ZOM.RETRY` seconds rather than forfeiting the full gap, and
  a *returning* zombie that cannot spawn goes back on the queue instead of being dropped —
  losing one would quietly break the rule the whole thing rests on.
- **On a phone the lanes are about 2000px apart** (4017, 6032, 7546 against a 780px viewport)
  where on a desktop they are about 1000. A lane is in view for roughly 670px of scrolling, so
  a phone visitor meets zombies in three bands with a long quiet stretch between them. That is
  the cost of the boundaries being the thing he walks on.

**The date is a dialogue tag, not a second calendar.** `ev-figures.js` asks `EVLines` whether
`halloween` is in today's tag set, which is the same predicate that picks the "Happy
Halloween" greeting. Three things follow from that and all three are the reason it is done
this way:

- **It switches itself off.** The window is `getMonth() === 9 && getDate() >= 25` in LOCAL
  time, so on November 1 the tag stops matching and the whole takeover disappears. There is
  nothing to remember to remove, and nothing to deploy on the day.
- **`?evlines=halloween` previews it in June**, figures and all — the same lever that already
  pinned a greeting line now pins the whole page's behaviour.
- **`?evlines=morning` is November**, reachable in October, because forcing tags replaces the
  derived set rather than adding to it. That is how the off path is tested on a day when the
  real clock says otherwise.

**He is faster than a walk and slower than a hurry.** `ZOM.SPEED` is 44px/s against the beam
crew's 30, stroll 32, march 34 and strut 40 — and against the button carry's 51 and scurry's
62. So he overhauls anybody strolling and never catches anybody running, which is the whole
rule the number encodes. He shipped at 17, slower than everything on the page bar trudge, and
at that speed he could only ever meet somebody **head-on**: the encounter always happened on
their turn, and a chase from behind was arithmetically impossible.

Speed cannot be raised on its own. A gait plants a foot every half cycle, so the ground
covered per step is `SPEED / (1.1 * CADENCE)` and the step the legs actually draw is
proportional to `STRIDE` — raise one and the other two have to follow or he skates. The
three move together: at 44px/s with `STRIDE` 1.73 and `CADENCE` 1.08 the planted foot drifts
5px while the body travels 37, which is the same 13% it was at 17px/s. Long dragging strides
at close to a trudge's cadence, which is also what a shamble should look like.

**How many are on screen is the crossing time over the spawn gap**, and the crossing time
is set by `SPEED`. That is not obvious and it bit immediately: raising him from 17 to 44px/s
cut the measured crowd from a mean of 4.3 on screen to 1.9, because each one now clears the
viewport in 37 seconds instead of 95. Faster alone made the takeover *weaker*. `ZOM.GAP`
came down from 13-24s to 5-10s in the same change, which puts it back to 4.1-4.3. Move one
of those two and measure the other.

**Almost nobody on this page stands on a rule, and that is what the scare test has to cope
with.** Measured across six deals: only the four full-width walkers — beam, patrol, dogfetch,
crosser — have their feet on a lane. Everyone else stands on the top edge of a card. The
note-card row is 533px from its nearest rule, the talk-card row 304, the readers 558, the
kite flyer 288. So a scare test of "is his floor my floor, to within a lane's width" answers
no for the entire standing cast, and a zombie walks the length of the page past people who
never look up — which is exactly what it did.

`laneOf()` replaces it: a figure belongs to the rule NEAREST his feet, and a zombie
frightens whoever belongs to the rule he is walking. There is no distance constant, because
the caller has already established that both of them are on screen — two figures you can see
at once are near enough to frighten each other, which is the whole standard a visual gag
needs, and it keeps working when the page's shelves move. The same rule decides which lanes
count as "peopled" at spawn time; using one rule in one place and another in the other is
what made three of the four lanes look empty.

**Three at most on any one rule** (`ZOM.PER_LANE`). The spawn only picks lanes that are ON
SCREEN, so parked at the top of the page every zombie for minutes on end is dealt the same
rule — they arrived in single file along the hero's bottom edge, five of them, which reads as
a train rather than a crowd. With the cap and `CARRY_W` down from 0.6 to 0.35, a measured
two minutes parked on the hero gives 9 arrivals on that lane, never more than 3 at once; two
minutes parked at the bottom gives 13 spread over the two rules down there.

**They come in from both ends and pass each other.** If somebody is already walking a rule,
the next one in comes from the other end. Without that the side is decided by where a host
happens to be standing, and he does not move between spawns, so every arrival takes the same
edge. Measured on the hero lane: 4 from the left, 5 from the right.

**He ambushes a carrier rather than chasing one.** When somebody on the lane is holding
something and walking, the zombie comes in from the edge that person is walking TOWARD, so
the meeting happens in front of them: they drop the beam where they stand, turn, and run
back down the line they just walked, past their own load. Coming in behind them gets the
same catch, but at the screen edge, where the drop lands outside the viewport and the whole
point of it is lost. `carrierHeading()` is the test — the beam crew are the only figures on
the page who both hold something and move, so it looks at one mode and ignores `dwell`, the
off-screen pause before they turn round.

**Click a zombie and he says the one thing he has to say.** Nine in ten say "…brains!" and
one in ten says "…Happy Halloween!". The line is fixed at SPAWN, not per click, because the
ask was that a tenth of the *zombies* are the easter egg — so the same one says the same
thing however many times you prod him. Clicking again puts it away, and it times out after
`ZOM.SAY` on its own.

His bubble is the only one on the page that MOVES. Every other speaker — the greeter, the
seated readers — stands still, so `EVQuotes.open()` places the box once and leaves it. A
zombie does not stop to talk, so `zombieSayMove()` re-pins it to his head every frame and
repeats `place()`'s clamp, which is private: without the clamp a zombie walking off the
right-hand edge drags his bubble past the document width and the page grows a horizontal
scrollbar.

**The chase is the half of the gag that nothing else tests.** A head-on meeting needs no
speed at all, so every other case in `halloween-zombies.cjs` passes just as happily with the
chase quietly gone. Case 5 walks the crew down from 240px back and refuses the result unless
*our* zombie was inside `ZOM.SCARE` when they bolted — "he caught somebody" is also what it
looks like when a different zombie wanders into the same crew, so the cap is pinned to one
and the lane cleared **before** the case works out which way they are walking. Doing that
after was a real flake: deciding the direction takes up to 24s and the scheduler puts a
zombie on the carry lane every 13 to 24.

**The panic is not new code.** `poofArmFlee` and `drawFlee` are the click-a-Bobit exodus's own
machinery and already know how to widen a canvas to the viewport, split a carrying pair into
separate runners, bring the dog along with his owner, and mark a figure gone at the screen
edge. The takeover adds a walker who triggers that by **proximity** instead of by a click,
and one argument to `poofArmFlee` — the direction to run — because "nearest edge" is
sometimes straight through the thing frightening you.

**The season is off under an automated browser** unless the harness names the tag with
`?evlines=`. That rule is not tidiness. Thirty-five files in `tests/` load this page with no
tags pinned and then assert on who is standing where, and a zombie walking through one makes
it date-dependent — green for fifty-one weeks and failing in the week that matters.
`tests/layout/cartwheel-clearance.cjs` failed exactly that way, three runs out of three: a
zombie frightened the cartwheel pair mid-routine, `poofArmFlee` took the entry over, and the
staged rescue stopped running, so the helper never left his corner. The **behaviour** was
right — a cartwheeler should bolt like anyone else — so the test was what needed isolating,
not the feature. The alternative was pinning tags in all thirty-five, which changes what the
greeter says in the several that read the derived set.

Because that guard could just as easily hide the takeover from every real visitor while the
suite stayed green, the test spoofs `navigator.webdriver` back to `false` and checks the page
agrees with the wall calendar. A guard meant for the harness must never decide what a visitor
sees.

Four traps paid for while building it, all four in `tests/layout/halloween-zombies.cjs`:

- **`POOF.phase` rests on the string `'idle'`, which is truthy.** A guard written as
  `if (POOF.phase) return` returns on every frame forever. No error, no warning, and the gate
  still reports itself correctly on — the zombies simply never arrive. Compare against
  `'idle'`, not against truthiness.
- **In this rig the sign of an arm angle is which SIDE it swings to, not which arm it is.**
  A mirrored pair at ±92 splays to opposite sides and the figure reads as a scarecrow. Both
  arms forward means both take the **same sign**. Mirrored pairs look right everywhere else in
  the file only because they are used near 0 or near 180, where both signs arrive at the same
  place. The two arms are then deliberately unequal, or they overlap into one thick limb.
- **`html { scroll-behavior: smooth }` makes every `scrollTo` in a test an ANIMATION.** A
  harness that scrolls and then looks is reading the page in transit: parking on a lane 3588px
  down landed at 2733, no rule was in view, the spawn refused — and because the phone case did
  not assert that a zombie existed, it went green while checking an empty page for a scrollbar
  it could not have had. Set `scrollBehavior = 'auto'` first, and assert the thing under test
  is actually present.
- **Five set pieces return from the draw loop before its last line.** `paddlepair`,
  `cartwheel`, `dogfetch`, `kite` and `yoyo` all `return` early, so a position published at
  the bottom of the loop never reaches them and the proximity scan fell back to the canvas
  CENTRE — which on a footer-wide canvas is nowhere near the figure. A zombie frightened the
  cartwheel pair from half a screen away. Every mode now publishes before the first return,
  and the ones that know better (`e.cwX`, `e.thrX`) overwrite it after their draw.

Zombies arrive for as long as the tab is open, unlike the cast, which is fixed at about
fourteen. So a retired one is spliced out of `entries` and has its canvas zeroed — these are
viewport-wide, and `removeChild` alone leaves the backing store alive at roughly 1.9 MB each.

**The place fills up, and what people were carrying stays on the floor.** Three at once is
right for the first minute and wrong for the tenth, so `zomCap()` climbs from `ZOM.MAX` 3 to
`ZOM.MAX_END` 8 at one more every `ZOM.GROW` seconds the page has been open. Anyone caught
mid-carry drops his load where he stood and it is **not** faded away afterwards, up to
`ZOM.LITTER` 24 pieces — oldest first when that fills, so the floor near the visitor stays
dressed. The litter is what makes it read as a takeover; without it the page just quietly
empties.

`dropProp(e, sx, sy, keep)` is the single-figure half of the click-exodus's `stunDropAll`,
with `keep` skipping the fade. **Call it before `poofArmFlee`, never after:** it finds the
figure's hands with `scanInk()`, and `poofArmFlee` resizes and clears that canvas, so
afterwards the scan finds no ink and the prop lands at the fallback instead of in his hands.

The knobs are the `ZOM` object at the top of the block: `SPEED`/`STRIDE`/`CADENCE` (which
move together), `GAP` (which moves with `SPEED`), `SCARE` (how close is "a handful of
steps"), `MAX` through `MAX_END` over `GROW`, `PER_LANE`, `LITTER`, `CARRY_W`, `SAY`,
`EGG`, and the other delays.

## The rope Bobit hangs off the END of the video row

He sits on a bar level with the "03 / Talks" section rule, and clicking him breaks it so he
dangles. The bar is anchored to **`.watch-grid`**, not to a card. A card index put him over
the middle of the row, and `:last-of-type` would have moved him to the second row the moment
the grid wraps, which it does below about 1150px; the grid's own right edge is the end of the
row at every width and through every wrap.

Two numbers make this tighter than it looks. There is **104px to the right of the grid at
1440 and 24px at 1280**, against a **145px** bar — so the whole structure cannot clear the
videos at any real width. What it does instead: the pivot sits 30px past the end of the row
and the bar is cantilevered back over the last card, which reads as a plank sticking out past
the end. He sits on the inner end and dangles off the tip, in the margin beside Talk 04
rather than over it.

**The pivot is at `w - 24`, not at a fixed 250.** It used to be 250 in a 350-wide canvas,
leaving 100px of empty canvas to the right of him — and because `fitLeft` keeps the whole
canvas inside the document, that empty strip shoved the pivot back inside the row every time.
Asked for 1366 at 1440, got 1336. Whenever a figure has to sit at the edge of the page, the
dead space in his canvas is part of the geometry.

Below 1280 the viewport clamp takes over and he lands at the row's end rather than past it,
because there is physically nowhere further to go.

## Deploy

Configured for Render as a static site via `render.yaml`. Connect the repo on Render and it will publish `./` (root) on every push to `main`.

## Stack

- Plain HTML + CSS + a tiny script for the footer year.
- Manrope from Google Fonts.
- Empowered Vote color palette: coral `#ff5740`, blue `#00657c`, light blue `#59b0c4`, yellow `#fed12e`.
