# Fallacy Finders tease — the crew carries a button that isn't there yet

**Date:** 2026-08-05
**Status:** designed

## Summary

Fallacy Finders is a new EV feature whose app is unfinished, so it gets **no button in the tool list**.
Instead the beam crew — the two Bobits who haul a load back and forth along the bottom of the hero —
gain a third load in their rotation: the **Fallacy Finders showcase button, carried upside down**.

The joke is scale. The other two loads are a 32px ball and a 72px line. This one is the real button at
full size, measured off the live DOM, so two 84px stick figures are hauling a 340×102 slab between them —
nearly five times the span of the yellow line they usually carry, and taller than either of them. It is a
strained hold, hustled along rather than crawled, and it reads as "the sign for the next thing is being
carried in, and nobody has worked out which way up it goes."

Two artifacts ship: the tuned homepage lockups (needed to draw the card, and reusable verbatim when the
button really lands) and the new scene in `ev-figures.js`.

## What does not change

`index.html` is untouched. No sixth `.logo-trigger`, no commented-out markup, no `--crew-clear` change,
no CSS. The tool list keeps its five buttons and its exact current layout. This is purely a new scene in
an existing rotation.

The card is **not shrunk to fit** the crew strip. It is the same size as the buttons in the list, because
being that size next to an 84px figure *is* the gag; a card scaled down to clear the hero content would
be smaller than any real button and would read as a different, lesser object. The consequence is that it
paints over the meta-row — see "Passing over the meta-row" — and that is accepted.

## The button asset

Two new files:

- `icons/fallacy-finders-logo-lg-light.svg`
- `icons/fallacy-finders-logo-lg-dark.svg`

Derived from `brand/fallacy-finders/Fallacy Finders/Logo/SVG/fallacy-finders-logo-{light,dark}.svg`
(453×169, teal `#00657C` wordmark + coral `#FF5740` + yellow spark, broken-chain symbol on the right),
normalised to the same cap-height and baseline seam as the existing five `*-lg-*.svg` lockups so it lines
up in the column the day it joins it.

These are the files the canvas loads, so the carried card and the eventual real button are guaranteed to
be the same artwork.

## The load

`BEAM_LOADS` becomes `['circle', 'line', 'button']`.

`beamPick` currently picks the next load with a two-element flip-flop:

```js
a = (e.lastLoad === 'circle') ? 'line' : 'circle';   // the other load (never repeats)
```

That becomes a 3-cycle over `BEAM_LOADS` that advances past `e.lastLoad`, preserving the existing
guarantee that no load repeats back to back. The surrounding carry↔special alternation (`carryRun`,
`lastSpecial`, the light gag, the letter carriers) is untouched — the crew still alternates carries with
specials, there are simply three carries in the pool instead of two.

## Drawing the card

A rounded rect matching the button's own styling, with the logo inside, and **the whole thing rotated
180°**:

| Part | Value |
|---|---|
| Fill | `--card` |
| Stroke | 1px `--border` |
| Corner radius | `16px` |
| Logo height | `64/102` of card height, i.e. the button's own logo-to-height ratio |
| Logo position | Hugging one end, inset by the button's `24px` padding |
| Theme | `-light.svg` / `-dark.svg` chosen from the active theme, same as the DOM button |

The logo **hugs one end of the card rather than being centred**, faithful to the real buttons, which
right-align their content so the five icons line up. Because the card is rotated 180°, the logo reads at
the opposite end in world space, and it sits at the leading or trailing end depending on which direction
the crew is walking. That is accepted, not a bug.

The SVGs load through a cached `Image` per theme variant. Until a variant has loaded, the card draws as
an empty rounded rect — the crew is still visibly carrying a big rectangle, so a slow first paint
degrades to "blank sign", not "no load".

## Sizing — measured live

Button dimensions shift with screen resolution; the card must follow. Three regimes exist:

| Viewport | Real button | Source |
|---|---|---|
| ≥1025px | 340 × 102, logo 64px | `.showcase` track `minmax(0, 340px)` |
| 901–1024px | 390 × 90 measured at 1024px, logo 52px | `@media (max-width: 1024px)` |
| ≤900px | up to 560 × **~195**, logo 48px, **plus inline `.m-desc` body text** | `@media (max-width: 900px)` |

Dimensions come from measuring the first `.showcase-logos .logo-trigger` with `getBoundingClientRect()`
at layout time — the same technique `runLightGag` already uses to find the `.meta-row .swatch.s-yellow`,
including caching the element on `e` and keeping a fallback for when it cannot be measured.

**Below 901px the measurement is deliberately ignored** in favour of the desktop `340:102` shape. The
mobile button is ~195px tall *only because it contains a paragraph of description text*, which the
carried prop does not. Copying that height would produce a near-square empty slab, taller than the whole
240px crew canvas. Fallback when nothing is measurable is also `340:102`.

The card is drawn at that size directly: **no height clamp, and no scaling to make it clear the hero
content.** The single guard is that it may never be wider than the viewport — if the target width exceeds
`canvasW - 20` the card scales uniformly down to that width. A 340px card clears this untouched at 375px;
the guard only engages below ~360px.

On narrow screens this puts a carrier close to each screen edge through the middle of a pass, with their
outer arms clipping the canvas edge. That is fine — `endMargin` (below) is large enough that the card
still fully enters and fully exits, so the whole sign is legible for most of the traverse.

## Passing over the meta-row

Measured on the live page at 320/360/480/768/1024/1280/1600px, rather than derived from the CSS:

| Quantity | Value |
|---|---|
| Crew feet → `.meta-row` last-line bottom | **93px, identical at every width** |
| Crew's own painted ink height | 81px (so only 12px of spare headroom today) |
| Real button, ≥1025px | **340 × 102** |
| Real button, 1024px | **390 × 90** |
| Real button, 768 / 480 / 360 / 320px | 560×178 / 440×202 / 320×250 / 280×250 |

The crew canvases are `z-index: 60`, above `.hero .wrap` at `z-index: 1`. The rig's hands do not reach
below ~22px above the feet even folded, so a 90–102px card tops out 112–133px up against 93px of
headroom. The card therefore **paints over** the
`501(c)(3) nonprofit / Antipartisan by design / Open about money — see our books` row by roughly
**19–40px** — about the full height of the 25px desktop text line.

Carrying it as low as the rig allows recovers ~10px of that; it cannot clear the row, and no amount of
"hold it lower" can, because the card is taller than the headroom. Being explicit about this because an
earlier draft of this spec guessed ~9px from CSS arithmetic and was wrong by a factor of three.

This was chosen knowingly over the alternatives (shrinking the card, bumping `--crew-clear`, or rendering
the card on a lower-z-index canvas so it slid behind the text). Two facts make it tolerable:

- The canvases are `pointer-events: none`, so the **"see our books" link stays clickable** the whole time.
  It is visually covered, never functionally blocked.
- The button load is one of three carries, which themselves alternate with the light gag and the letter
  carriers, so this is an occasional pass rather than a permanent state.

Worth being honest about the duration: the row is 627px wide at ≥768px, so at the faster pace below a
340px card is over it for about **19 seconds** of a pass (it would be ~32s at the normal carry speed).
That is a mitigation, not a fix. If it grates in practice the cheapest remedy is a lower-z-index canvas
for the card alone, which preserves the full size and clears the text entirely.

### The existing guardrail

`tests/layout/beam-clears-metarow.cjs` exists precisely to assert that the `carry` scene never rises into
this row — it was written after the crew's heads landed on the "Open about money" link on a phone. It
already carves out `light` (146px) and `letters` (150px) as gags that reach up on purpose.

The button load becomes a third such carve-out, but not a blanket one, because that would discard the
coverage the test exists for. Instead the **figures** keep the original hard assertion (their heads must
still clear the row) and the **card** gets its own two bounds: it may never climb past the meta-row into
the `.showcase` block above, and it may never eat more than a 48px budget of the row. Those bounds are the
design claim, so a failure means the hold is wrong, not that the budget needs raising.

## The heavy hold

The oversized load is the reason the hold has to change:

- **Gap.** `halfGap` is `24` for the ball and line. For the button it becomes `cardW/2 - 8`, putting a
  carrier at each end of the card with his hands just inside the corners.
- **Margins.** `endMargin` grows from `110` to `cardW/2 + 110` so the whole card clears the screen edge
  before the crew turns around, instead of the far end popping out of nothing.
- **Grip.** Held **low** — arms straight down at the card's bottom edge, not up at chest height. A deep
  hunch, head tipped back, and a pronounced downward lurch on each planted foot.
- **Speed.** **Faster**, not slower: `speedB` goes from `30` to about `51`. This reverses the original
  design. The card overlaps the meta-row on the way past, and pace is the only lever that keeps the
  overlap brief — at `30` a pass takes ~32s to clear that row, at `51` about 19s. The strain lives
  entirely in the pose, which is the truer read anyway: someone hustling under a load too heavy for
  them, rather than someone crawling.

Because `beamPick` places the crew off-screen at the start of every pass, the gap and margin changes
happen out of sight. Nothing pops.

## The drop gag

The line's behaviour, not the ball's — the card lowers, and **nobody gets hurt**.

- Hover a carrier → he waves; his end sinks toward the floor.
- The card is **rigid**, so unlike the line it does not sag. It **pivots about the end still held**,
  swinging into a steep diagonal with one corner on the ground.
- Hover both carriers → both ends go down and it lies flat on the floor.
- The partner holds his end with the existing `A.holdannoyed`, turned toward his mate.
- Move the pointer away → the existing `e._pickup` bend-and-heave (`A.heave` / `A.heave2`, front lifting
  first and the back hitching a beat behind), stretched somewhat longer than the line's `1.2s` for the
  weight.

`dropOK`, currently `e.load === 'line'`, extends to the button. The existing `e.dF` / `e.dB` per-end drop
amounts are reused; for a rigid card they drive a rotation about the still-held end rather than two
independent endpoint heights.

## Poof integration

The "room drops what it is holding" exodus asks each figure what it is holding via `propOf`, which
returns a single `beamload` kind for the whole beam crew regardless of load, and `drawGroundProp` draws
that as a small 7px circle outline. A dropped 340px button should not become a small circle.

- `propOf` returns kind `card` when `e.load === 'button'`, keeping `beamload` for the ball and line.
- `drawGroundProp` gains a `card` case: a small rounded rect lying on the floor, in the same deliberately
  simple 8–16px idiom as the other ground props.
- `HEAVY_PROP` gains `card: 1`. It is the heaviest thing anyone on the page is carrying; it should hurt
  when it lands.

## Verification

Green tests do not prove a Bobit is visible, so this needs pixels as well as assertions.

- **Tests** (`tests/`, house `.cjs` style): the 3-cycle never repeats a load; the card matches the measured
  button at ≥901px and the `340:102` shape below it; the viewport-width guard only engages below ~360px;
  `halfGap`/`endMargin` derive from `cardW`; `dropOK` includes the button; `propOf` returns `card` for the
  button load and `beamload` otherwise.
- **Pixels:** screenshot the hero mid-pass at desktop, the 1024 band, and a phone width, over **http**
  rather than `file://` — SVG-into-canvas `drawImage` is exactly the sort of thing the `file://` canvas
  restrictions break, and a silently blank card would otherwise look like a design choice.
- **Confirm at a glance** that the card reads as the same object as the buttons in the list, and that the
  upside-down logo is legible at carried size.

## Accepted trade-offs

1. **The card paints over the meta-row** by ~19–40px for ~19 seconds of a pass. Full size was chosen over
   clearing the hero content; the link underneath stays clickable. Remedy on file if it grates: draw the
   card on a canvas below `.hero .wrap`.
2. **Below 901px the card is not the mobile button**, it is the desktop lockup shape at full size, because
   the mobile button's height comes from body text the prop does not have.
3. **On narrow screens the carriers ride near the screen edges** mid-pass and clip slightly.
4. **The logo's end flips** as the crew reverses direction, a consequence of hugging one end of a card
   that is rotated 180°.
