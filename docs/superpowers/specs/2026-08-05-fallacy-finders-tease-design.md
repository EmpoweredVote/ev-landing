# Fallacy Finders tease — the crew carries a button that isn't there yet

**Date:** 2026-08-05
**Status:** implemented
**Plan:** [2026-08-05-fallacy-finders-tease.md](../plans/2026-08-05-fallacy-finders-tease.md)
**Revised:** 2026-08-05, after implementation. Six things the design got wrong are corrected in place and
called out under "Corrected during implementation" — the artwork could not be an `<img>`, the drop
cannot be a steep diagonal, the carriers stand outside the card rather than inside it, the hold height
is split by breakpoint, and two numbers were guessed from CSS instead of measured.

## Summary

Fallacy Finders is a new EV feature whose app is unfinished, so it gets **no button in the tool list**.
Instead the beam crew — the two Bobits who haul a load back and forth along the bottom of the hero —
gained a third load in their rotation: the **Fallacy Finders showcase button, carried upside down**.

The joke is scale. The other two loads are a 32px ball and a 72px line. This one is the real button at
full size, measured off the live DOM, so two 84px stick figures haul a 340×102 slab between them —
nearly five times the span of the yellow line they usually carry, and taller than either of them. It is a
strained hold, hustled along rather than crawled, and it reads as "the sign for the next thing is being
carried in, and nobody has worked out which way up it goes."

## What did not change

`index.html` is untouched — verified with `git diff --stat main -- index.html` at the end of the work. No
sixth `.logo-trigger`, no commented-out markup, no `--crew-clear` change, no CSS. The tool list keeps its
five buttons and its exact current layout.

The card is **not shrunk to fit** the crew strip. It is the same size as the buttons in the list, because
being that size next to an 84px figure *is* the gag; a card scaled down to clear the hero content would
be smaller than any real button and read as a different, lesser object. The consequence is that it covers
part of the meta-row — see "Passing over the meta-row" — and that is accepted.

## The button asset

Two new files, plus the tool that turns them into canvas path data:

- `icons/fallacy-finders-logo-lg-light.svg`
- `icons/fallacy-finders-logo-lg-dark.svg`
- `tools/gen-fallacy-card-art.mjs`

Derived from `brand/fallacy-finders/Logo/SVG/fallacy-finders-logo-{light,dark}.svg`
(453×169, teal `#00657C` wordmark + coral `#FF5740` + yellow `#FFD426` spark, broken-chain symbol on the
right). The `d` attributes are byte-identical to the brand source; only the `viewBox` differs.

**The raw brand art was out of family** with the other four lockups. Measured at `height: 64px` in the
340px column:

| lockup | rendered W | ink H | ink right edge x |
|---|---|---|---|
| essentials | 262 | 56 | 302 |
| readrank | 189 | 62 | 306 |
| treasury-tracker | 214 | 55 | 313 |
| ctc | 287 | 63 | 292 |
| **fallacy-finders, raw** | 172 | **64** | **330** |
| **fallacy-finders, padded** | 186 | **60** | **304** |

It ran flush to its box on all four sides, so its symbol sat ~27px further right than where the other
four align, and its ink filled the whole 64px where the others sit at 55–63 — reading a size larger.
Fixed with `viewBox="0 -7 530 183"`, a pure box change that moves no path. Family averages are ink H 59
and right edge 303.

## The load

`BEAM_LOADS` became `['circle', 'line', 'button']`. `beamPick` used a hardcoded two-element flip-flop:

```js
a = (e.lastLoad === 'circle') ? 'line' : 'circle';   // the other load (never repeats)
```

It now steps one place around `BEAM_LOADS`. Still a deterministic rotation, which is what the flip-flop
was too: rotation keeps the never-repeats guarantee for free, where a random pick over three loads would
both repeat and starve one. The carry↔special alternation (`carryRun`, `lastSpecial`, the light gag, the
letter carriers) is untouched — there are simply three carries in the pool instead of two.

## Drawing the card

A rounded rect matching the button's own styling, with the logo inside, and **the whole thing rotated
180°**. Every internal proportion is the real button's, scaled by `k = cardH / 102`:

| Part | Value |
|---|---|
| Fill | `--card` |
| Stroke | 1px `--border` |
| Corner radius | `16px × k` |
| Logo height | `64px × k`, the button's own logo box |
| Logo position | Hugging one end, inset by the button's `24px × k` padding |
| Theme | palette roles resolved from `data-theme`, same as the DOM button |

The logo **hugs one end rather than being centred**, faithful to the buttons, which right-align their
content so the five icons line up. Because the card is rotated, that end reads opposite in world space and
swaps sides as the crew reverses. Accepted, not a bug.

### Why it is Path2D and not an image

The design assumed a cached `Image` of the SVG. That cannot work: **drawing an SVG loaded by `src` onto a
canvas taints it**, and the whole test suite runs from `file://`. Measured:

| origin | `img.src` file ref | data URI |
|---|---|---|
| `file://` | draws, then `getImageData` throws `SecurityError` | draws, clean |
| `http://` | clean | clean |

A tainted beam canvas would make `tests/layout/beam-clears-metarow.cjs` throw **permanently**, since it
reads pixels off that exact canvas. Path data carries no origin and cannot taint. A data URI also avoids
it but costs ~31KB encoded for both variants; the two brand variants share one geometry and differ only in
the wordmark teal (`#00657C` light, `#59B0C4` dark), so one geometry plus two palettes is 11KB.

`tools/gen-fallacy-card-art.mjs` emits that as an `FF_ART` block — 21 paths at 1dp, colours as roles,
`evenodd` indices, and the `x0/y0` viewBox origin. It rounds to 1dp because the two variants disagree by up
to 0.005 units in places, which survives 2dp and would block sharing one geometry; 0.05 units of a
453-unit box is 0.02px at render size. `--check` re-verifies the variants still agree and throws if a
future brand update reshapes one of them.

Verified against the browser's own SVG rendering at device resolution: **0% colour mismatch**, max channel
delta 8, and 2.9% differing pixels confined to the antialiasing boundary.

## Sizing — measured live

Button dimensions shift with screen resolution, so the card measures the first
`.showcase-logos .logo-trigger` with `getBoundingClientRect()` — the same technique `runLightGag` already
uses to find the `.meta-row .swatch.s-yellow`, including caching the element on `e` and keeping a fallback.

| viewport | card | real button |
|---|---|---|
| 320px | 292×88 | 280×250 |
| 360px | 332×100 | 320×250 |
| 480px | 340×102 | 440×202 |
| 768px | 340×102 | 560×178 |
| 1024px | **390×90** | **390×90** |
| 1280 / 1600px | **340×102** | **340×102** |

At ≥901px the card *is* the button. **Below 901px the measurement is deliberately ignored** in favour of
the desktop `340:102` shape: there the button goes full width and renders its `.m-desc` description
inline, so it measures 178–250px tall, and that height is a paragraph of body text the carried prop does
not have. Copying it would give the crew a near-square empty slab taller than their whole 240px canvas.
`340:102` is also the fallback when nothing is measurable.

`102`, not the `96` CSS `min-height`: a 64px logo plus 18px padding either side plus the 1px border
measures 102, and the measured number is the one that matters.

The only scaling is a viewport-width guard, applied uniformly so the button's proportions survive. It is
not a fit-the-hero-content clamp — the card is meant to be too big for the strip it walks along. It engages
at 320 and 360, never at 384 or above.

On narrow screens this puts a carrier close to each screen edge at mid-pass, with their outer arms
clipping the canvas. Accepted — `endMargin` is large enough that the card still fully enters and exits, so
the whole sign is legible for most of the traverse.

## Passing over the meta-row

Measured on the live page rather than derived from the CSS:

| Quantity | Value |
|---|---|
| Crew feet → `.meta-row` last-line bottom | **93px, identical at every width** |
| Crew's own painted ink height | 81px (so only 12px of spare headroom) |

The crew canvases are `z-index: 60`, above `.hero .wrap` at `z-index: 1`, and the rig's hands do not reach
below ~32px above the feet. So the card covers part of that row on the way past. Final measured overlap,
reported by the guardrail test at every width:

| width | card | covers | the row itself |
|---|---|---|---|
| 320px | 292×88 | 15px | 88px, 3 lines |
| 360px | 332×100 | 27px | 87px, 3 lines |
| 480px | 340×102 | 29px | 55px, 2 lines |
| 768px | 340×102 | 29px | 25px, 1 line |
| 1280px | 340×102 | 41px | 25px, 1 line |

At desktop the row is **fully** covered where the card passes, not merely clipped — that was already true
at any workable hold height. Two facts make it tolerable:

- The canvases are `pointer-events: none`, so the **"see our books" link stays clickable** throughout. It
  is visually covered, never functionally blocked.
- The button is one of three carries, which alternate with the light gag and the letter carriers, so this
  is an occasional pass rather than a permanent state. At the pace below, a 340px card is over the 627px
  row for roughly **19 seconds** of a pass (~32s at the normal carry speed).

Chosen knowingly over shrinking the card, bumping `--crew-clear`, or drawing the card on a lower-z-index
canvas. If it grates in practice that last one is the cheapest remedy: it preserves full size and clears
the text entirely.

### The existing guardrail

`tests/layout/beam-clears-metarow.cjs` exists precisely to assert the `carry` scene never rises into this
row — written after the crew's heads landed on the "Open about money" link on a phone. It already carved
out `light` (146px) and `letters` (150px) as gags that reach up on purpose.

The button became a third such case, but **not** by blanket exemption, which would discard the coverage the
test exists for. The **figures** keep the original hard assertion, sampled with an ordinary load up, and
the **card** gets its own two bounds: it may never rise past the row into `.showcase`, and never exceed a
48px overlap budget. Both loads are now pinned rather than waited for — the rotation puts a load up about
one pass in three and passes are 30–50s, so an unpinned window sampled whichever load it caught, and the
first run against the button flagged only 2 of 5 widths by luck.

The budget is the design claim, not a tolerance to widen. Verified it bites by raising the hold height to
60, which fails with "the carried button eats 69px of the meta-row, budget is 48".

## The heavy hold

- **Gap.** `halfGap` is `24` for the ball and line. For the button it is `cardW/2 + 8` — just **outside**
  the card's edge. Standing inside its footprint put the card's edge through each carrier's torso, so they
  read as loitering in front of a billboard rather than carrying it.
- **Margin.** `loadMargin()` gives `cardW/2 + 110` instead of a bare `110`, and is shared between
  `beamPick` (which sets the spawn x) and the draw branch (which decides when to turn round). Both used to
  hardcode `110`, which for a 340px card would have spawned the crew with its far end already 60px
  on-screen — the card popping out of nothing at the edge.
- **Grip height.** Split by breakpoint, because the cost is lopsided. What makes it read as *carried*
  rather than walked-beside is the card's bottom edge at hand height, 32px above the feet — established by
  rendering five variants at 1:1. At **≥901px** the row is one 25px line that 20px of hold already covers
  completely, so the extra 12px reaches into empty hero space and the better grip is free. At **≤900px**
  the row wraps to three lines and 12px is 12px more real text hidden, so it stays at 20 and the grip
  gives.
- **Speed.** `speedB` is `51`, not `30` — **faster**, reversing the original design. The card covers part
  of the row on the way past and pace is the only lever on how long that lasts. The strain lives entirely
  in the pose, which reads truer anyway: someone hustling under a load too heavy for them, rather than
  crawling.
- **Pose.** A new `ANIMATIONS.hefty` gait: stride 11 vs 18, folded 26° vs 14°, arms hanging nearly
  straight so the hands sit as low as the rig reaches, and a sag onto the weight-bearing leg.

The sag is bounded, and the bound is measured. `makeGait` leaves the planted rear leg fully straight
(`legRF = legRU - max(0, sw) * knee` zeroes the knee bend on that side), so a pelvis drop has no slack and
drives the foot through the floor. Lowest ink below the floor line at the crew's `S = 0.32`, where every
shipped gait already sits at 2px from the round cap on the foot:

| sag | 0 | 4 | 8 | 11 | 16 | 24 |
|---|---|---|---|---|---|---|
| px below floor | 2 | 2 | **3** | 4 | 6 | 8 |

`8` is the most weight available for 1px past the house baseline.

## The drop gag

The line's behaviour, not the ball's — the card lowers and **nobody gets hurt**.

- Hover a carrier → he waves; his end goes down.
- Being rigid, it **pivots about the end still held** rather than sagging between them.
- Hover both → it lies flat on the floor.
- The partner holds his end with `A.holdannoyed`, turned toward his mate.
- Move away → the bend-and-heave pickup, 1.7s rather than the line's 1.2s for the weight.

**How far it can tilt: 5.4°, not a "steep diagonal".** An end can only fall by the hold height before its
bottom corner reaches the floor — 32px across 340px of width. The original design promised a steep
diagonal, which is not available to a long plank carried this low. What carries the read is displacement,
not angle: 32px is a third of the card's own height and is obvious on screen.

Two implementation notes worth keeping:

- `dropOK` had to be declared **above** the greet-release block. The design put it beside `kB`, ~20 lines
  after the code that needs it to arm the pickup, where it is an undefined `var` — falsy, so the lift
  would silently never have fired for *either* load, including the line that works today.
- The tilt must resolve the ends to **left and right** before taking the angle. Taking
  `atan2(endF - endB, dir * cardW)` puts dx negative on every leftward pass, so `atan2` returns ~174.6°,
  which on top of the card's own 180° comes to ~354.6° — the logo would have appeared **right side up**
  for every leftward pass with an end down, cancelling the entire joke. Caught by driving a `dir = -1`
  pass, not by reasoning about it.

The heave poses saturate at `t = 1.2` (their bend is `sin(min(1, t/1.2) * PI)`), so the longer 1.7s pickup
is fed a **scaled** clock rather than a longer one, or the extra 0.5s is dead time with both of them
already stood up straight. The card's rise is driven off that progress too, not off `e.dF`/`e.dB`, which
relax on a ~0.17s time constant and would have it level well before the figures finish straightening.

## Poof integration

`propOf` reported one `beamload` kind for the whole crew whatever it carried, and `drawGroundProp` paints
that as a 7px circle outline — so a dropped 340×102 button landed as a small ball. It now has its own kind,
ground form and weight. Measured ground ink, so the three read as different objects:

| kind | ink |
|---|---|
| card | 28×9 |
| beamload | 16×16 |
| book | 20×6 |

`HEAVY_PROP` gains `card`: it is the heaviest thing anybody on the page carries, so it lands on a foot
rather than clattering down beside one.

`tests/poof/12-drop-beat.cjs` kept its own copy of the heavy list in two places, and asserts
`hurts === HEAVY.includes(kind)`, so a card drop would have failed there with an unexplained mismatch.
Its in-page copy now reads the real table via the debug hook, and `check()` asserts the readable literal
matches it, so future divergence fails as itself.

## Verification

All 26 tests pass: `tests/layout` (5), `tests/poof` (15), `tests/quotes` (6). `index.html` confirmed
untouched against `main`.

New tests: `hefty-pose`, `button-card-size`, `beam-load-cycle`, `card-prop`. Each was watched fail before
being made to pass, and the three that encode a design claim were checked against a deliberately broken
implementation — the load cycle against the old flip-flop, the overlap budget against a raised hold
height, the heavy-list guard against a removed entry.

Pixels as well as assertions, because green tests do not prove a Bobit is visible:
`screenshots/New/fallacy-final-{1280,1280-dark,1024,375,1280-setdown}.png`, plus
`fallacy-drop-gag.png` (all seven drop states) and `fallacy-grip-variants.png` (the five hold candidates).

## Corrected during implementation

1. **The artwork cannot be an `<img>`** — it taints the canvas under `file://` and would permanently break
   the pixel test that reads the beam canvas. It is `Path2D` data.
2. **The lockup needed normalising** into the family; the raw brand art sat out of alignment and read a
   size large.
3. **The carriers stand outside the card**, not inside it. Inside, its edge cut through their torsos.
4. **The drop tilts 5.4°**, not a steep diagonal — geometrically unavailable at this hold height.
5. **The walk is faster, not 30% slower.** Pace is the only lever on the overlap duration.
6. **Two numbers were guessed and wrong.** Headroom is 93px at every width, not 86px derived from
   `--crew-clear`; and the button is 340×102, not the 340×96 its CSS `min-height` suggests. The overlap
   that follows is 15–41px depending on width, not the "~9px" a naive floor-level hold implied.

## Accepted trade-offs

1. **The card covers part of the meta-row** — 15–41px depending on width, fully covering the single-line
   row at desktop, for ~19s of a pass. The link underneath stays clickable. Remedy on file: draw the card
   on a canvas below `.hero .wrap`.
2. **Below 901px the card is not the mobile button**, it is the desktop lockup shape, because the mobile
   button's height comes from body text the prop does not have.
3. **On narrow screens the carriers ride near the screen edges** at mid-pass and clip slightly.
4. **The logo's end flips** as the crew reverses, a consequence of hugging one end of a rotated card.
5. **The hold height differs by breakpoint** (32px vs 20px), so the grip reads slightly better on desktop
   than on a phone. The alternative was hiding more wrapped text on the phone.
