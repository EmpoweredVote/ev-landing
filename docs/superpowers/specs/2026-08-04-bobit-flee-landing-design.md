# Bobit flee landing — fall to the section break

**Date:** 2026-08-04
**Status:** implemented
**Amends:** [2026-08-03-bobit-poof-exodus-design.md](2026-08-03-bobit-poof-exodus-design.md)
**Revised:** 2026-08-04, after the first implementation shipped. The original froze fleeing canvases to
the viewport and let a Bobit whose line was below the fold plummet off-screen; the fall was correct but
unwatchable. Fleeing canvases are document-positioned again so you can follow a faller down, and the
off-screen exit is now chosen by whether the fall *fits the viewport* rather than by where the fold
happens to be. See "Following him down" and "When the fall does not fit the screen".

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
a border, deduped within 2px, sorted ascending, in **document** coordinates.

An explicit list rather than a computed-border sweep of the DOM: the note cards are 1232px wide of a
1280px viewport, so any "is it full-bleed?" width threshold loose enough to catch the real rules also
catches four card interiors, and a figure would land on the inside edge of a box rather than on a line
across the page.

The lines are measured **once when the cast is armed**. Document rather than viewport coordinates, so one
reading holds for the whole run at any scroll position — the page does not reflow during an exodus, and
fleeing canvases stay in document space so you can follow a faller down (see "Following him down").

## Behaviour

### Target selection — `poofArmFlee`

`e.flTarget` = the **nearest** break line more than `MIN_FALL` (24px) below his ink floor.

If no line qualifies, `e.flTarget` stays `null` and he keeps today's flat `FLEE_DROP` drop exactly.
That covers the footer cast and anyone already below the last rule. The 24px floor stops a figure who
is already standing on a line from picking it as a target and playing a 2px pratfall.

The flee canvas grows to `Math.max(e.h, oldFloor + fallDist + HEAP_YOFF + 8)`, so the fall is inside it.
Measured from `oldFloor` rather than `e.h` because the flee only ever draws the figure and his shadow, all
of which lives within `oldFloor` of the canvas top — sizing off `e.h` instead appended a section's worth
of empty canvas below the page and grew the document's scroll height for nothing. It is transparent and
`pointer-events: none`, so the extra area captures nothing, and `10-flee-landing` asserts the canvas ends
inside the document rather than padding it with dead scroll space.

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

### Following him down

Fleeing canvases stay `position: absolute` in **document** coordinates, so scrolling carries the runners
and you can follow a faller to his line. Break lines are measured in document coords too, once when the
cast is armed, which makes the whole fall geometry scroll-independent.

They were briefly `position: fixed`. That was not arbitrary — `reposition()` skips fleeing entries,
because a full re-fit would yank the widened canvas out from under the run, so a viewport-wide *absolute*
canvas outlived a viewport shrink at its old width and handed the whole document a horizontal scrollbar
(a phone rotating landscape→portrait mid-exodus). Fixed made that impossible, but it also froze the
runners to the viewport, which is what made a fall to a line below the fold unwatchable.

`refitFlee()` replaces that trade. On resize it re-clamps width and left through the same `fitW`/`fitLeft`
every other mode uses, and rebases `flX`, both ledges and the dog by the same delta so nothing jumps.
Vertical state is untouched, so the fall survives a resize intact.

One consequence, found by `05-flee` rather than reasoned about: a shrink can leave a runner outside the
new, narrower canvas, and the ordinary horizontal exit then removes him. That is **correct** — measured, a
runner at screen x 718 in a 900px viewport is genuinely off-screen once the viewport is 500px wide. The
test asserts survival only for runners the shrink still contains.

### When the fall does not fit the screen

Landing is only worth animating if it can be seen. Measured fall-to-viewport ratios:

| viewport | fall | screen-heights |
|---|---|---|
| desktop 1280×900 | 618px | **0.69** |
| laptop 1440×780 | 618px | **0.79** |
| iPhone 14 390×844 | 1152px | **1.36** |
| small Android 360×640 | 1149px | **1.80** |

Desktop falls fit in one viewport. Phone falls cannot: `.watch` stacks to ~1,249px tall there and the rope
Bobit hangs near its top, so you would see about half a fall and then ~2s of unseen `heap → getup` plus a
~4s limp, with `poofTick` waiting on him the whole time (it waits for every figure to be `gone`, and
`gone` is only set on an exit).

So `e.flCanLand = fallDist <= FIT_SCREENS * innerHeight`, with `FIT_SCREENS = 0.85` — the gap between the
two clusters above. This is **geometry, not a device test**, and it sorts desktop from mobile on its own.

The flag governs *only* whether the below-the-fold exit applies:

```js
if (!e.flCanLand && e.flTopDoc != null) {
  var foldDocY = (window.scrollY || window.pageYOffset) + window.innerHeight;
  belowFold = e.flTopDoc + groundY > foldDocY + GONE_BELOW_FOLD;   // 96px: his ink is ~84px tall
}
```

Two deliberate details. It is tested against the **live** scroll position, so scrolling down with a
plunging Bobit keeps him on screen and he lands properly — following him is rewarded rather than
overridden. And it does **not** gate the drop: reaching his line always lands him, flag or no flag.
Gating the heap on `flCanLand` instead would leave a figure hovering at his line in exactly the case a
reader had earned.

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

It runs one desktop (1280×900) and one phone (390×844) viewport, and the fit rule is expected to sort
them into different endings on its own. Common to both:

1. `e.flAir === true`, and he reaches `drop` having **never** entered `run`.
2. His landing y is within 2px of a break line the test measures independently from the DOM.
3. `e.flDropSecs` matches `sqrt(2·dist/FALL_G)`, so the fall is timed off gravity and not a constant.
4. `e.flCanLand` equals the ratio test computed from the constants the module exposes — so a changed
   `FIT_SCREENS` cannot silently drift from the behaviour.
5. The canvas is `position: absolute`, **and** scrolling the page moves it on screen by the same number of
   pixels. This is the one that catches a regression to `fixed`: every other assertion here stays green
   under `fixed` while the fall becomes unwatchable. (The probe has to force `scroll-behavior: auto` —
   the page sets `smooth`, so `scrollY` does not update synchronously and the first version of this check
   silently proved nothing.)
6. The exodus reaches `cleared` — the real test for a stall — with no page h-scroll, and the canvas ends
   inside the document rather than padding it with dead scroll space.

**Desktop, fall fits (0.69 screens):** he must reach `heap`, and his lowest **painted** pixel must sit on
the line. Measured 2.0px off.

**Phone, fall does not fit (1.36 screens):** he must be `gone` while still falling and **never reach
`heap`** — no ~6s of unseen animation — with his last ground line past the fold.

The run fails if either ending goes unexercised, because an earlier version of this file passed while only
ever measuring one of them.

Also updated: `tests/poof/05-flee.cjs`. Its resize block asserted the flee canvas width was **unchanged**
across a mid-flee shrink, which was how `fixed` achieved the no-h-scroll guarantee. The width is now
expected to change; what must hold is no h-scroll, `position: absolute`, an unchanged sub-phase, and no
jump in screen x. It resizes twice — a gentle shrink that still contains every runner, where survival and
the no-jump rebase are asserted, then a hard 360px rotation, where cropped-out runners may legitimately be
removed and only the overflow guarantee and the finish are checked.

`tests/poof/08-flee-floor.cjs` must stay green: it asserts first-frame ink against pre-flee ink for
figures in `raise`/`run` with `yOff === 0`, and the rope Bobit in `raise` still satisfies that.
