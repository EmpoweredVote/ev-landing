# Election Day — design

**Date:** 2026-11-01
**Status:** draft, awaiting approval
**Ships before:** Tuesday 2026-11-03

## Summary

Two features that share one date and nothing else.

**The countdown.** For the month before a federal Election Day the greeter adds the number of
days to his welcome — "Election Day is 12 days away" — instead of the time of day. Halloween
outranks it, so the last week of October is zombies and the countdown comes back on November 1.
On the day itself he says so.

**The polling place.** On Election Day the hero's bottom rule stops being the carry lane and
becomes a polling place. A booth with a VOTE sign stands at the left end of it. Four to eight
Bobits in mixed colours wait in line to its right, shuffle forward as the line moves, go in one
at a time, and walk off the left edge afterwards. New people keep arriving. Everything the crew
normally does on that rule — the two-carries, the light-out gag, the letter carriers, the
play-button carrier — is off for the day and comes back on its own.

Both switch themselves on and off from the clock. Nothing is deployed on the day and nothing is
removed after.

## Why now

Election Day is Tuesday, November 3, 2026. Today is Sunday, November 1. The countdown has two
days of life this cycle; the polling place has to be in before Tuesday morning or it waits two
years.

## Goals

- A visitor in the last month before a federal election is told how long is left, in the
  greeter's own voice, without a banner or a countdown widget.
- On Election Day the page shows people voting. That is the whole statement.
- Both features come and go from the calendar alone. No deploy on the day, nothing to remember
  to remove, and no second calendar to keep in step with the first.

## Non-goals

- Not a reminder for state or local elections. Federal general elections only.
- Not a registration deadline, a polling-place lookup, or a link out to one. The page says what
  day it is; it does not try to be a voter service.
- No sound, no confetti, no results.

## Anti-goals — what would make this a failure even if it worked

- **A greeting that tells someone to go and vote.** We are antipartisan by design and the
  greeter's register is warm, not instructional. "Election Day is 12 days away" is a fact.
  "Don't forget to vote!" is a nag, and a nag from an organization in this space reads as a
  side being taken. Every line in the catalog stays on the fact side of that.
- **"1 days away."** This is the thing a reader notices and nothing else recovers from.
- **A line that is wrong at midnight.** Two visitors on the same calendar day must see the same
  number whatever the hour.
- **The polling place covering the hero's meta row.** The 501(c)(3) line is a legal claim and
  the crew already has only 93px of headroom above their floor. A booth that hides it is worse
  than no booth.
- **Breaking the test suite on the one day it matters.** Thirty-five files in `tests/` load this
  page with no tags pinned and assert on who is standing where. A scene that takes over the hero
  lane makes every one of them date-dependent — green for two years and failing on the Tuesday.

## Constraints

- No build step. Plain ES5-flavoured JavaScript in the existing files, same as everything else.
- The repo is CRLF on disk. See the line-endings note under *Implementation notes*.
- Figures are drawn at `S = 0.32`. A Bobit is about 71px tall and 15px wide at that scale.
- Measured geometry, taken from the live page at four widths:

| viewport | hero meta-row starts at x | clear floor left of it | headroom below it |
|---|---|---|---|
| 1440 | 407 | 407px | 93px |
| 1280 | 327 | 327px | 93px |
| 900 | 114 | 114px | 93px |
| 390 | 20 | 20px | 93px |

  The headroom is 93px at every width because `--crew-clear` is 92px and the row's bottom is
  6px above the crew's floor. The clear column to the left is what varies, and it is what
  decides how tall the booth may be.

---

# Part 1 — The countdown

## The date is computed, not listed

Federal Election Day is the first Tuesday after the first Monday in November of an
even-numbered year. That is a rule, so it is written as one:

```js
function federalElectionDay(year) {
  if (year % 2 !== 0) return null;            // no federal general election in an odd year
  var d = new Date(year, 10, 1);              // 1 November, local
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);   // the first Monday
  d.setDate(d.getDate() + 1);                 // the Tuesday after it
  return d;
}
```

Checked against four cycles: 2022 → Nov 8, 2024 → Nov 5, 2026 → **Nov 3**, 2028 → Nov 7. All
correct.

**A table of dates was the obvious alternative and it is the wrong one.** A table is a thing
someone has to remember to extend, and the failure when they don't is silent — the countdown
simply never appears again, on a page nobody is watching in an off year. The rule has been
stable since 1845 and costs six lines.

**In an odd year both tags are off** and the greeter behaves exactly as it does today. That is
the same self-switching property Halloween has, and it is why this is a predicate rather than a
feature flag.

## Counting the days

Floor both dates to local midnight, subtract, and **round** rather than floor:

```js
var a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
var days = Math.round((electionMidnight - a) / 86400000);
```

**Rounding rather than flooring, and the honest reason is narrower than it first looks.** Two
local midnights are not always 24 hours apart. The instinct is that US daylight saving ending
inside the window — the first Sunday in November, which in 2026 is November 1 — makes a naive
floor read low. It does not. Falling back makes a day *longer*: measured in `America/New_York`,
October 31 to November 3 is 73 hours, and floor and round both give 3. Floor and round agree on
every single day of this window.

The off-by-one is in the other direction, across a *short* day. Measured, again in New York:
March 5 to March 20 is 359 hours, which floors to 14 and rounds to the correct 15. A countdown
that ends in November never crosses spring forward, so flooring would in fact be safe here.

Rounding is used anyway because it is correct whichever way a transition falls, and the cost of
being right by rule instead of by coincidence is zero. **What does not follow is a test.** A case
driving October 31 and asserting 3 would pass identically against the floor it is meant to rule
out, which is worse than no test: it records a risk as covered when nothing checks it. There is
no DST case in the test list below for that reason.

The whole calculation is in calendar days, so a visitor at 23:50 and a visitor at 00:10 on the
same date see the same number. That is the "wrong at midnight" anti-goal, closed by construction.

## The count always has a number in it

`daysToElection` looks **forward to the next federal Election Day and is never null.** On
November 4, 2026 it rolls straight to November 7, 2028 and reads 734. In the middle of an odd
year it is still a real number — 511 on June 15, 2027. It is never negative and never absent.

This is a decision, and it closes two holes at once that the alternative leaves open. If the fact
could be null, `{days}` would have to render as something — and `fill()`'s existing habit with a
missing `{name}` is to substitute an empty string, which would produce "Election Day is  days
away" with two spaces in it. And if it could go negative, a forced preview in late November would
read "Election Day is -12 days away".

Neither is reachable now. The *tags* are what bound the number to 2–30, and the number is always
a number, so no combination of a forced tag and a real clock can put a broken sentence on the
page. Making the fact total is cheaper than defending every place that reads it.

## Three tags, because "1 days" is not acceptable

`ev-lines.js` gets three entries in `PREDICATES`, and one new fact in `context()` —
`c.daysToElection`, always a number, per the section above:

| tag | true when |
|---|---|
| `election-day` | `daysToElection === 0` |
| `election-tomorrow` | `daysToElection === 1` |
| `election-soon` | `daysToElection >= 2 && daysToElection <= 30` |

Thirty days is "about a month out" as asked. The split into three is not tidiness: `when` is an
AND with no arithmetic in it, so the only way the catalog can hold a singular sentence and a
plural one is for each to have its own tag. This is the same shape `needs-tools` already uses —
an inverse that needs its own name because the engine deliberately cannot express one.

## The `{days}` substitution

`fill()` in `ev-lines.js` currently substitutes `{name}` and nothing else. It gains `{days}`,
filled from `c.daysToElection`. Two tokens is still a substitution, not a template language, and
the catalog stays free of logic.

Only `greet.election.soon` carries the token. The day-of and tomorrow lines are fixed sentences,
so there is no path on which a number can render next to the wrong noun.

## Where the lines go in the list

File order is priority. The `wave` beat's list becomes:

```
greet.halloween            when: ['halloween']           ← unchanged, still first
greet.election.day         when: ['election-day']
greet.election.tomorrow    when: ['election-tomorrow']
greet.election.soon        when: ['election-soon']        ← carries {days}
greet.holidays             when: ['holidays']             ← unchanged
greet.back                 when: ['named','returning']    ← unchanged
...time of day, then greet.hello
```

Two things about that order are decisions rather than accidents.

**Halloween stays above the countdown**, which is what was asked: October 25–31 is the takeover's
greeting, and November 1 falls back to the countdown with nothing to switch over. The windows do
not actually overlap for `election-day` — Election Day is always November 2–8 — but writing it in
priority order means the list still reads correctly out loud, which is the property the whole
file is organised around.

**The countdown sits above `greet.back`.** This is the ordering question that matters. A
signed-in returning visitor matches `greet.back` ahead of everything below it, so a countdown
placed under it would be invisible to exactly the people who come back most often. Above it,
everyone hears it.

## Copy

Three new ids in `ev-copy.en.js`. Variants on the `soon` line for the same reason the time-of-day
openers have them: the countdown runs for a month and a daily visitor would otherwise read one
sentence thirty times.

```
greet.election.day        "Today is Election Day. Welcome to Empowered Vote."
greet.election.tomorrow   "Election Day is tomorrow. Welcome to Empowered Vote."
greet.election.soon       "Election Day is {days} days away. Welcome to Empowered Vote."
greet.election.soon.b     "{days} days until Election Day. Glad you stopped by."
greet.election.soon.c     "Election Day is {days} days out. Take your time and have a look around."
```

Exact wording is the author's to settle; what is fixed is that no line instructs anyone to vote,
no line carries a number next to a singular noun, and the day-of line is a statement of fact.

## Previewing it, and pinning it in tests

`?evlines=election-soon` forces the tag. It does **not** force the number, because the number is
a fact and `?evlines=` only replaces the tag set — so in June the preview would read "Election
Day is 155 days away" under a tag that says it is soon.

So the fact gets its own lever, in the same spirit: **`?evdays=7` overrides `daysToElection` for
one page load.** That makes the preview honest, gives the tests a way to pin the number without
mocking a clock, and is the only way to exercise the `1 day` wording on a day that is not the day
before an election.

**`?evdays=` sets the number and never the tags.** This is the part to get right, because
`context()` returns early for a forced tag set (`ev-lines.js:130`) and the two obvious placements
build different things. Putting `evdays` above that return would mean `?evdays=0` also turns on
`election-day` — and therefore switches on the entire polling place — which is a lever nobody
asked for and a surprise waiting for whoever next previews a greeting. Each lever does one job:
`?evlines=` decides which tags are true, `?evdays=` decides what number the sentence carries.
Previewing the day-of line is `?evlines=election-day`, exactly as previewing Halloween already is.

## Tests

- `tests/lines/02-predicates.cjs` gains cases for the three tags. The existing file already
  drives tags at a given wall-clock date, so this is the same shape as the Halloween cases:
  31 days out is none of them, 30 is `election-soon`, 2 is `election-soon`, 1 is
  `election-tomorrow`, 0 is `election-day`, 1 November 2027 is nothing at all.
- **The boundary case that is worth a test is the election rule itself**, not the arithmetic:
  assert the computed date for 2022, 2024, 2026 and 2028 against the four known calendar dates
  (Nov 8, Nov 5, Nov 3, Nov 7). That is the thing that would silently be wrong forever.
- `tests/lines/01-select.cjs` gains a case that `?evlines=election-soon` with `?evdays=` renders
  a number into the sentence, one that Halloween still wins when both tags are forced, and one
  that `?evdays=0` alone leaves every tag alone.

**The existing greeter suite is already safe.** Every case in `tests/greeter/` pins tags with
`?evlines=`, and the one deliberately unforced case in `04-beats.cjs` captures whatever beat 1
said rather than asserting its wording. Checked; no changes needed there.

---

# Part 2 — The polling place

## It is one scene on the crew's own entry

The hero's `beam` entry already owns a canvas the full width of the hero and 240px tall, with
its bottom edge 6px below the hero's bottom rule. The polling place is a new scene on that
entry — `e.scene = 'polls'` — drawn by one `runPolls()` function, in exactly the way `runLetters`
and `runLightGag` already draw several figures on that one canvas.

**This is the most important structural decision in the feature and it is made for one reason.**
The Halloween takeover's worst bug was that its figures had no anchor element: the click-exodus
arms every entry with `poofArmFlee`, which reads `e.el` for the perch the runner leaps off, and
an anchorless entry threw — inside `tick()`, which killed the animation loop for the whole page
for the rest of the session, with no error visible and nothing on the page looking wrong until
you noticed nobody was moving. Drawing the queue as separate entries would walk straight back
into that. Drawn on the crew's entry, the scene inherits `e.el = .hero`, and the exodus, the
reposition pass and everything else handle it without knowing it exists.

Two obligations follow from sharing one entry:

- **`_bodies` is published every frame**, listing every figure drawn — the waiters, the person
  walking in, the person walking out. The draw loop's rule is that `_bodies` is this frame's or
  it is nothing, and a scene that forgets to publish draws itself alone. The exodus needs the
  list to split the queue into separate runners.
- **The scene publishes `_figX` before any early return.** Five set pieces have been caught
  returning before the bottom of the draw loop, which left the proximity scan falling back to
  the canvas centre.

## Switching on

The scene runs when `election-day` is in today's tag set — the same predicate that picks the
day-of greeting, and the same arrangement the zombies have with `halloween`. One date rule, two
features, no second calendar.

**The tag is read once at page load, not every frame**, matching the `HALLOWEEN` IIFE at
`ev-figures.js:4323`. One consequence, accepted rather than overlooked: a tab left open across
midnight into November 4 keeps the polling place until it is reloaded. Halloween already behaves
exactly that way, and a page that agrees with itself all session is better than one that
rearranges the furniture while someone is reading it.

One guard goes with that. The beam branch initialises `e.scene = 'carry'` inside
`if (e.bx == null)` (`ev-figures.js:5860`), and that same init path is shared by the Halloween
work crews cast at runtime with `plain: true` (`ev-figures.js:4683`). A `plain` crew must never
pick up the polls scene. It cannot happen on the calendar — the two takeovers' windows do not
touch — but the path is shared, so it is guarded explicitly rather than left resting on the
calendar being kind.

**It is off under an automated browser unless the harness names the tag**, using the existing
`navigator.webdriver && !/[?&]evlines=/` guard. This is not tidiness. Without it, every test that
loads the page and asserts on the hero crew becomes date-dependent, and the failure arrives two
years later on the one morning nobody wants to be debugging. `tests/layout/beam-clears-metarow.cjs`
is the one that would go first: it samples painted ink at five widths with no tags pinned.

And because that guard could just as easily hide the scene from every real visitor while the
suite stayed green, the new test spoofs `navigator.webdriver` back to `false` and checks the
page agrees with the wall calendar. That check already exists for Halloween and is the reason
this one is specified: a guard meant for the harness must never decide what a visitor sees.

**`beamPick` is never called while the scene is on.** The carry rotation, the light gag, the
letter carriers and the play-button carrier are all off for the day, as asked. On November 4 the
tag stops matching, the entry falls back into its ordinary `carry` opening, and all four come
back. Nothing to deploy and nothing to revert.

## The booth

A booth at the **left** end of the rule, with a VOTE sign on it. Drawn, not posed — it is
architecture, so nothing in `leremy-rig.js` helps, and it follows the ghost's precedent: every
dimension is a ratio of two numbers (width and height) so that resizing it later is two numbers
and nothing else.

Roughly: a front panel about 96px wide with a dark doorway on its right-hand side, a curtain or
a lip at the top of the doorway, and a sign board — above the roofline where there is room for
one, and on the face of the panel where there is not (see the clamp below). The person at the
front of the line steps into the doorway and is hidden by the panel while they vote.

**Its height is a multiple of the figures, with the headroom only as a ceiling.** The first
draft of this said the booth "takes the canvas" wherever nothing is overhead, and that was wrong:
the canvas is 240px, so it would have produced a 240px booth at 1440 and a 93px booth at 390 —
a 2.5x jump between two widths of the same page, and a structure 3.4 times the height of the
people queuing at it. The booth is a booth, not a tower.

So the design height is **1.9x figure height, about 135px**, at every width. The clamp is a
ceiling on top of that, not the thing that decides the size:

- **If the booth's footprint overlaps the meta row horizontally, its total height is clamped to
  the 93px headroom.** Reading the table, that is a phone: the clear floor left of the row is
  407px at 1440 and 327 at 1280, both far wider than the booth, against 20px at 390.
- Otherwise it stands at its design height. The booth is then the same size on every desktop
  width rather than growing with the viewport.

**900px is the width to check, and the margin there is 2px.** The clear floor is 114px, and a
96px booth at a 16px inset ends at 112. That is not clearance anyone should rely on — it is the
measurement happening to work out. It is called out here rather than smoothed over because it
is exactly the kind of number that goes silently wrong when the hero's layout next moves, and
because the measured per-frame test is what keeps it honest when it does: at 901px the booth
simply clamps, which is correct rather than broken. Screenshot 900 and 901 side by side.

The rect is read each frame, the way `runLightGag` already measures the 501(c)(3) swatch against
the canvas top. A fixed breakpoint split is the cheaper alternative and is what `btnHold` does,
but the measured test is a few lines and does not go wrong when the hero's layout moves.

**At the clamp the sign moves onto the panel rather than above the roof.** A voter has to be
hidden while he votes, so the panel cannot be shorter than a figure — about 71px of the 93. That
leaves 22px above the roofline, which is not a sign, it is a smear. Below the clamp the VOTE
board is drawn on the face of the panel instead, above the doorway. The sign is always legible
or it is not a sign.

Colour follows the theme through `cssVar`, like everything else on the page. The sign's
lettering wants to stay legible at sign size, so it is canvas text in the page's own font stack
rather than drawn strokes.

## The queue

The line forms to the **right** of the door and runs right along the rule.

- **Slots.** Slot *i* sits at `doorX + GAP0 + i * GAP`. **`GAP` scales with the canvas**, so
  that eight waiters span a real stretch of the rule rather than bunching in the left corner —
  a fixed 30px would put the back of an eight-person line about 300px from the left edge of a
  1440px page, which is a huddle, not the queue in the sketch. Scale it off the width and clamp
  it to roughly 26–46px: tight enough on a phone that eight people still fit, open enough on a
  desktop that the line reads across the lane.
- **Population.** The scene holds a target of 4 to 8 waiting. Below target, a new arrival is
  scheduled; at or above it, nobody comes for a while. The target is re-drawn from time to time
  so the line visibly grows and shrinks rather than hovering at one length.
- **Arrival.** Walks in from the right edge at an ordinary gait, crosses to the first free slot
  at the back, and stops. **The approach walk is long on purpose.** At a stroll's 32px/s it is
  something like half a minute to cross a desktop viewport, which sounds wrong for one person
  and is right for the scene: it keeps somebody moving in the empty right half of the lane the
  whole time, so the page does not read as a static queue beside an empty floor. Tune the
  arrival interval so there is usually one person in transit and sometimes two, rather than
  tuning the walk faster.
- **Waiting.** Each waiter is given one of the existing idle animations at spawn, and one or two
  of them get the `phone` prop that sitters already use. A queue of identical statues is the
  failure mode here; a queue where somebody is checking a phone and somebody else is shifting
  their weight is the whole point.
- **Shuffling.** When the front of the line goes in, everyone steps up one slot — a short walk
  on their own feet, never a teleport.
- **Voting.** The person at the front walks into the doorway and is hidden behind the panel for
  a few seconds.
- **Leaving.** Comes out of the doorway and walks **left**, past the booth and off the left edge
  of the canvas, which is what the sketch shows. The booth sits **44px in from the left edge
  above 900px wide and 16px below it**, and that inset is his walk. He is drawn **after** the
  booth, so he passes in front of the panel rather than behind it — going in is the move that
  hides someone, and the exit has to read as the opposite of it.

**Colours come from `takeTone()`**, the shuffled bag the cast already uses, so the line is mixed
and neighbours rarely match. "Different color bobits waiting in line" was the ask and the bag is
already the mechanism for it.

## Clicking a waiter

Each waiter is dealt one line from a small pool **at spawn**, not per click, so the same person
says the same thing however many times you prod him. That is the rule the zombies' easter egg
established and the reason given for it there holds here.

The line is shown in the shrink-wrapped `ev-tight` bubble rather than the greeter's fixed 300px
box — a four-word line in a 300px bubble is mostly bubble, which is a lesson already paid for.

**A waiter's bubble closes when he steps forward.** The zombies needed a bubble that moves with
them, re-pinned every frame and re-clamped against the document width. A waiter stands still
except during a shuffle, so the cheap answer is right: close it on the step rather than carry
the moving-bubble machinery into a second place.

Tone: these are people in a queue, not a campaign. Ordinary, slightly wry, nothing about who to
vote for. Lines like "Been here twenty minutes" or "Worth the wait" are the register. The host
Bobit is the one who speaks for the organization; a person in a line speaks for himself.

## What is left to the builder

- The booth's proportions and the exact drawing, within the 1.9x design height. Two numbers and
  ratios off them, per the ghost.
- The timing constants — arrival interval, shuffle speed, how long a vote takes, how often the
  target re-draws, and the exact `GAP` scaling and its clamp. These want tuning against the live
  page, not deciding on paper. Group them in one named object at the top of the block, the way
  `ZOM` and `GHOST` already are, so there is one place to turn knobs.
- Whether the sign reads VOTE or something longer. VOTE is the recommendation: it is legible at
  sign size on a phone and nothing longer is.
- The exact copy for the waiters' pool and the three greeting lines.

## Two things checked and closed, so nobody re-opens them

- **A waiter can hold a phone.** `leremy-rig.js:133` reads `opts.phone` against any pose, and
  `ev-anim-extras.js:45` already has a standing variant, so the prop is not tied to sitters.
- **`_figX` is already published before every early return** in the beam branch
  (`ev-figures.js:5862`). Adding `polls` to that chain is mechanical, not a fix.

## Tests

The tests need a debug surface, because queue membership is internal state. There is precedent —
`__evFigDebug.crews()` at `ev-figures.js:6225` and the `__evFigDebug.halloween` hook the zombie
suite drives. Add **`__evFigDebug.polls()`**, returning the live figures as `{x, tone, state}`
with `state` one of `arriving` / `waiting` / `voting` / `leaving`, and **`__evFigDebug.electionDay`**
for the calendar check in case 6. Naming them here keeps the test and the hook from being
invented twice and differently.

A new `tests/layout/election-polls.cjs`, driven with `?evlines=election-day`:

1. **The booth clears the meta row.** At 1440 and at 390, read the row's rect and sample the
   canvas for painted ink inside it, the way `tests/layout/beam-clears-metarow.cjs` already
   does at five widths. This is the anti-goal with a number on it, and the 390 case is the one
   that can fail.
   **`polls` is deliberately not added to that test's scene-exemption list.** `light`, `letters`
   and the `button` load are exempt because they are *meant* to reach into the row. The booth is
   meant not to, and the 93px clamp exists precisely so it does not — so it should pass the
   existing assertion unmodified. An exemption would throw away the only automatic check on the
   clamp.
2. **A line forms and it is mixed.** Within some seconds there are at least four waiters, and
   they are not all one tone.
3. **The line moves.** Somebody goes in, somebody comes out, and the queue shuffles up — asserted
   as positions changing, not as a count holding steady, since a count is right in both the
   working and the frozen case.
4. **The exodus takes the queue cleanly.** This case was specified wrongly in the first draft and
   the correction is worth keeping. It said to hold a Bobit for three seconds and assert the
   figure layer is still animating afterwards — which **cannot pass even when the code is
   right.** The Halloween version works only because a zombie is anchorless and `armAll` skips
   it (`if (!e.el) return;`, `ev-figures.js:1692`). The polls scene deliberately has an anchor,
   so the whole queue is armed and flees, and once nothing is left `POOF.phase` goes to
   `'cleared'` (`ev-figures.js:1702`) and nothing moving is the *correct* outcome.
   The real distinction is between fleeing and throwing. So: assert **no `pageerror`**, and
   assert the queue actually **ran** — figures moved toward the edges across frames and ended
   `gone` — rather than freezing where they stood. A throw inside `tick()` leaves no error on
   the page, so the positive half is the half that catches it.
5. **The carry rotation is off.** No `beamPick`, no light gag, no letters, no play button.
6. **The guard is a harness guard, not a visitor guard.** Spoof `navigator.webdriver` to false,
   with no tags pinned, and assert the page agrees with the wall calendar.

And one check on the other side: the existing suite must be unaffected with no tags pinned.
That is **36 files** — the count of files under `tests/` that load `index.html` without
`?evlines=`, re-derived rather than carried over. (There are 70 test files in total; the figure
that matters is the unpinned ones, which is what the "thirty-five" in the Halloween comment at
`ev-figures.js:4311` was counting when it was written.)

One test named in the first draft is **not** at risk and should not be touched:
`tests/layout/beam-load-cycle.cjs` drives `beamPick` against a hand-built stub through the debug
hook and never looks at the real crew, so no scene change can reach it.

## Implementation notes

- **The repo is CRLF on disk and the Edit and Write tools silently rewrite a whole file as LF.**
  `git diff` hides it, because git normalises for the diff — so a three-line change looks like a
  three-line change while every line on disk has moved. `ev-figures.js`, `ev-lines.js` and
  `ev-copy.en.js` are all CRLF. Patch them with a script that reads bytes, normalises to LF,
  edits, and writes CRLF as its last step, and assert an expected hit count on every
  replacement so a missed pattern fails loudly instead of writing nothing.
- `ev-figures.js` is 6,236 lines. The new scene is a block in it, beside the Halloween block,
  not a new file — the draw loop, the rig, the palette and the exodus all live there.
- Verify by driving `file:///C:/ev-landing/ev-landing-main/index.html` with the repo's pinned
  Playwright, blocking `https:` so PostHog and the fonts do not hang. Set
  `scrollBehavior = 'auto'` before any scroll, or the harness reads the page in transit.
- **Look at the pixels.** Green tests do not prove a figure is visible. Screenshot the scene in
  both themes at 1440 and 390 before calling it done.
