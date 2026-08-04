# Bobit flee landing — fall to the section break

**Date:** 2026-08-04
**Status:** approved, ready for implementation
**Amends:** [2026-08-03-bobit-poof-exodus-design.md](2026-08-03-bobit-poof-exodus-design.md)

## Summary

A Bobit who runs out of ledge during the exodus falls to the **next full-bleed section-break line below
him** — one of the five 1px rules that span the page — and does his heap-and-limp there. He no longer
drops a flat 50px into whatever empty space happens to be under him.

The rope Bobit, who is hanging in mid-air with nothing under him at all, throws his hands up and then
**lets go**, falling to the line without ever running. Today he sprints the full 395px width of the
video thumbnail through empty air first, drops 50px, and pratfalls ~360px above the nearest real
surface.

## Why it was wrong

The exodus design assumed every Bobit stands on a perch and that running off its end means falling a
short, fixed distance to "the ground". Two things break that:

**There is no ground at 50px.** `FLEE_DROP = 50` was picked to look like a ledge drop for a figure
standing on a note card. It is not anchored to anything on the page, so the figure lands on an invisible
plane and crumples in mid-air. The page does have real horizontal surfaces — the section-break rules —
and they are the only lines a falling figure can land on and read as having landed.

**Some Bobits have no perch at all.** The rope Bobit sits on a frame bar he paints himself, then hangs
from a rope. Both are mid-air. The flee machine hands him his anchor element's rect as a ledge — the
video thumb, 395px wide and *below* his feet — so he runs its full width on nothing.

Note the detection trap here, which is why this is a per-mode predicate and not a measurement: every
Bobit is positioned with `edge: 'top'`, which puts his feet exactly on his anchor's top edge. So the
rope hanger's ink bottom and a thumbnail stander's ink bottom are *the same number*. Ink-vs-perch
geometry cannot tell them apart. (This is the fourth defect in this feature caused by inferring a
figure's footing from a dimension that only holds for some modes — see the header of
`tests/poof/08-flee-floor.cjs` for the first three.)

## The landing lines

Measured on the live page at 1280×900 (document y):

| y | line |
|------|------|
| 60 | `header.site-banner` bottom |
| 1137 | `header.hero` bottom (hero ↔ why) |
| 2210 | `section.how` top |
| 3515 | `section.watch` top |
| 4262 | `footer` top |

`sectionBreakLines()` reads these from an explicit selector list — `header.site-banner`, `header.hero`,
`section.why`, `section.how`, `section.watch`, `footer` — taking whichever edge of each actually carries
a border, deduped within 2px, sorted ascending, in **viewport** coordinates.

An explicit list rather than a computed-border sweep of the DOM: the note cards are 1232px wide of a
1280px viewport, so any "is it full-bleed?" width threshold loose enough to catch the real rules also
catches four card interiors, and a figure would land on the inside edge of a box rather than on a line
across the page.

The lines are measured **once when the cast is armed** and frozen. Fleeing canvases are `position:
fixed` and the exodus deliberately does not track scroll (see the `poofArmFlee` comment on why a
fleeing canvas must not be repositioned), so viewport coords captured at arm time stay valid for the
whole run.

## Behaviour

### Target selection — `poofArmFlee`

`e.flTarget` = the **nearest** break line more than `MIN_FALL` (24px) below his ink floor.

If no line qualifies, `e.flTarget` stays `null` and he keeps today's flat `FLEE_DROP` drop exactly.
That covers the footer cast and anyone already below the last rule. The 24px floor stops a figure who
is already standing on a line from picking it as a target and playing a 2px pratfall.

The flee canvas grows to `e.h + fallDist + HEAP_YOFF + 40` rather than a hardcoded `e.h + FLEE_DROP +
40`, so the fall is actually inside it. For the rope Bobit that is a 767px-tall canvas. It is
transparent, `pointer-events: none` and fixed, so it captures nothing and — being fixed — contributes
nothing to the document's scrollable area at any viewport width.

### Airborne figures skip the run

```js
// Ink-bottom vs perch-top cannot tell a hanger from a stander: edge:'top' puts every
// figure's feet exactly on his anchor's top edge, so both measure the same number.
function fleeAirborne(e) {
  return e.spec.mode === 'rope' || e.spec.mode === 'vclimb';
}
```

`raise` hands off straight to `drop` for these. The rope Bobit counts in **both** of his phases: sitting
on his own painted frame bar and hanging from the rope are equally mid-air, and one rule covering the
whole mode beats a phase check that has to stay in sync with `e.rphase`. `vclimb` is not in the current
cast but its draw branch is live, so it is covered rather than left as a trap.

Every other mode is untouched: run the perch, fall off its end.

### Gravity-scaled fall

`DROP_SECS` (a constant 0.45) becomes:

```js
function dropSecs(dist) { return Math.min(1.1, Math.sqrt(2 * dist / FALL_G)); }
```

`FALL_G = 1100` px/s² is tuned, not physical — these are 36px-tall figures, so real gravity reads as a
teleport. It gives 413px → 0.87s, 139px → 0.50s, and the legacy 50px → 0.30s. At 50fps the longest fall
peaks around 19px/frame, so the plunge has visible frames instead of jumping.

The 1.1s clamp bounds an unusually tall gap; past that he simply falls faster than `FALL_G`, which is
not visible. Rotation stays `flDir * 0.5 * k` on **normalised** progress, so however far he falls he
arrives at the same angle and hands off to the heap's 1.45 exactly as before.

`heap → getup → limp` then run unchanged, on the line.

### Shadow

During `drop` the shadow is drawn on the **target line** rather than under his feet, scaling from small
to full as he approaches it. At 50px a shadow glued to the feet was invisible; over 413px it reads as a
mid-air smudge following him down. Pinning it to the line is both physically right and telegraphs where
he is about to land.

### When the line is below the fold, he plummets out of the world

A section is often taller than the viewport — `.watch` is 747px — and the rope Bobit is near the **top**
of his, so the break line under him is usually past the bottom of the screen. Measured: 618px down at
1280×900, landing at viewport y 987; 1149px down at 360×900, landing at y 1518.

So a fleeing Bobit is also marked `gone` when his ground line passes `innerHeight +
GONE_BELOW_FOLD` (96px — his ink is ~84px tall, so that is where his head clears the fold). He falls off
the bottom of the screen and that is his exit.

This is required, not tidy-up. `poofTick` waits for every figure to be `gone` before the page is
`cleared`, and `gone` was only ever set on a *horizontal* exit, so without it he lands unseen and then
plays ~2.4s of invisible `heap → getup → limp` and a limp to the screen edge while the page sits there
looking finished.

Note this means **scrolling cannot follow him down**: fleeing canvases are `position: fixed` (see the
`poofArmFlee` comment on the phone landscape→portrait overflow bug that forced it), so they do not move
with the page. Accepted — the fall reads as an exit either way.

The rope Bobit's common case is the `sit` phase, not `hang`: he starts sitting on the frame bar he paints
himself and only hangs once someone clicks him, which puts his feet ~200px higher and makes the usual
fall 618px rather than the 413px a hanger would take.

## Out of scope

The rope and its frame vanish the instant he panics, because the flee branch replaces the rope mode's
whole draw. That is existing behaviour, not a regression. Leaving the rig painted would mean re-basing
its pivot onto the widened, re-positioned flee canvas — a separate job.

## Verification

`tests/poof/10-flee-landing.cjs`, in the house style of asserting **pixels as well as state** (every
earlier defect in this feature passed a state-only suite).

Both outcomes are forced by **scroll position** rather than left to the cast's luck: parking the rope
Bobit near the top of the viewport puts his break line on screen, and centring him puts it below the
fold. Two scenarios, same figure:

**A — lands on screen.** Scroll so his target line is above the fold. Then:

1. `e.flAir === true`, and he reaches `drop` having **never** entered `run`.
2. His computed landing y is within 2px of a break line the test measured independently from the DOM.
3. `e.flDropSecs` matches `sqrt(2·dist/1100)`, so the fall is timed off gravity and not a constant.
4. At `heap`, his lowest **painted** pixel sits on that line, and the widened canvas contains it.

**B — plummets.** Scroll so his target line is below the fold. Then:

5. He is marked `gone` while still falling, and **never reaches `heap`** — no invisible pratfall.
6. His last painted ground line is past the fold, i.e. he left downward rather than stalling.

And for both: the exodus reaches `cleared`, which is what actually catches the stall — a figure removed
on the wrong condition leaves the page waiting forever. Plus the `FLEE_DROP` fallback still applies to
anyone with no line below him.

`tests/poof/08-flee-floor.cjs` must stay green: it asserts first-frame ink against pre-flee ink for
figures in `raise`/`run` with `yOff === 0`, and the rope Bobit in `raise` still satisfies that.
