# Bobit quote readers — design

**Date:** 2026-08-02
**Status:** approved, ready for implementation planning
**Prototype:** https://claude.ai/code/artifact/d4d9665f-f47d-4903-b8f0-22ca278386ea

## Summary

Click a reading Bobit on the landing page. He sits up out of the reading curl, lowers his book to his
lap and raises his eyes off the page, and a speech bubble fades in carrying a quote from a president or
founder on the danger of party spirit. Clicking the speaker's name opens the primary source.

The point is not decoration. Every quote is a founder or president arguing the case Empowered Vote
exists to make, sourced to a document the reader can open and check — which is the same standard the
rest of the site holds itself to.

## Content

Quotes live in `presidential_quotes.md` (verified 2026-08-02); the shipped pool is a JS table derived
from it. Seven entries at launch:

| Speaker | Document | Link verified |
|---|---|---|
| Washington | to Gov. Arthur Fenner, 4 Jun 1790 | ✅ read at source (LoC, page-anchored) |
| Washington | Farewell Address, 19 Sep 1796 | ✅ read at source (govinfo, S.Doc. 105-22) |
| Adams | to Jonathan Jackson, 2 Oct 1780 | ✅ read at source (MassHist) |
| Jefferson | to Edward Carrington, 16 Jan 1787 | ✅ read at source (UChicago) |
| Jefferson | to George Wythe, 13 Aug 1786 | ✅ read at source (Monticello) |
| Jefferson | to William C. Jarvis, 28 Sep 1820 | ✅ read at source (Monticello) |
| Kennedy | Loyola College Alumni Banquet, 18 Feb 1958 | ✅ read at source (Wayback capture) |

**Launch blocker cleared (2026-08-02).** The Kennedy link was confirmed working, and its text was then
read from a Wayback Machine capture — `https://web.archive.org/web/2024id_/<url>` reaches pages whose
host blocks direct fetching, which jfklibrary.org does via Cloudflare. That reading corrected the
punctuation (an en dash, not the em dash carried from a reprint) and confirmed the Senate Files, Box 899
citation. **All seven sources have now been read directly.**

The Kennedy quote is deliberately limited to his own two sentences. The line before it ("Let us not
despair but act") and the poet's verse he closes on were both tried and cut: the verse is another
author's words, and a bubble attributes everything inside it to the named speaker.

Each entry carries `text`, `who`, `where` (the document and date), and `href`.

## Architecture

Three files. The boundary that matters: the bubble knows nothing about rigs, and the rig knows nothing
about HTML.

**`ev-quotes.js` (new, ~180 lines)** — owns the quote table and the bubble as DOM. Exposes
`window.EVQuotes`:

- `deal(readers)` — shuffles the pool and assigns one quote per reader, no repeats, at cast time.
  Returns nothing; sets `spec.quote` on each reader it can serve.
- `open(anchor)` — builds and positions a bubble. `anchor` is `{headX, headY, tone, quote}` in
  document coordinates. Returns a handle.
- `close(handle)` / `closeAll()`.
- `tick(dt)` — advances open bubbles' timers and closes any that expire, returning the handles it
  closed so the caller can start its figures resuming. Called from the existing figure frame loop
  rather than running a second one.

**Timer ownership, since the pause condition spans both modules.** `ev-quotes.js` owns the countdown
and knows about pointer-over-bubble and focus-inside-bubble on its own, via listeners on the element it
built. It cannot know whether the pointer is over a *figure* — that is a canvas hit-test only
`ev-figures.js` can do. So the handle exposes `setHeld(bool)`, which `drawQuoteSeat` sets every frame
from its own hover test, and `tick` pauses when `setHeld(true)` **or** its own pointer/focus state says
held. Neither module needs to know how the other decides.

**`ev-figures.js` (+~120 lines)** — gains `drawReader(e, ctx, w, h, tt, col, dt, cr)`, the pose state
machine, modelled directly on the existing `drawPhoneSeat`. It owns **every** non-phone seated reader,
quote or no quote, including the hover wave quote-less readers have always had — so readers come out of
the generic `hoverable` set and there is exactly one place that decides how a reader behaves. Adds the
reader hit-test to the existing document click listener and calls `EVQuotes.deal()` after `buildCast()`.

**`index.html`** — one `<script src="ev-quotes.js">` tag after `ev-figures.js`, and the `.ev-quote`
CSS in the existing `<style>` block. Bubble *theming* belongs in CSS with the rest of the tokens;
bubble *positioning* is set inline from JS, matching how the figure canvases already work.

## Dealing quotes

After `buildCast()`, collect the readers — specs with `mode:'seat'`, `anim:'read'`, no `phone` — and
deal to them in random order until the pool runs out (the pool is the full quote table, so
`poolSize` is 7 at launch — read it from the table's length, never hardcode it). Assignment happens
once, at cast time, so a figure keeps its quote across repeat clicks.

**Zero-reader guarantee.** A cast can legitimately produce no readers (~15–20% of loads: seats split
between `sit` and `read`, and 40% of sitters get phones). When that happens and the pool is non-empty,
promote one seated sitter to `anim:'read'`. This slightly biases the cast toward readers; that is the
intended trade for the feature never being invisible.

**Readers beyond the pool** get no quote and fall back: hover waves hello as today, click produces a
seated shrug. With 8 quotes and at most ~5 readers per load this branch is effectively unreachable in
production. It is kept anyway — it is about ten lines, and it is the correct behaviour the moment the
pool is trimmed or the reader count rises. It must not be mistaken for a live code path when reading
the file.

## Pose state machine

`e.q` holds the state. All transitions are eased pose lerps via the existing `lerpPose`/`easeInOut`
helpers; nothing snaps.

| State | Duration | Pose |
|---|---|---|
| `read` | resting | `A.read`, unchanged from today |
| `lookup` | 0.50s | single eased lerp `A.read` → `hold` |
| `hold` | until dismissed | sat up, book in lap, head up and out |
| `resume` | 0.50s | lerp back to `A.read` |
| `shrug` | 2.6s | seated shrug, quote-less readers only |

**Hover, in `read` only.** A quotable reader lifts his head off the page: `headTilt −12 → +6`,
`hunch −22 → −14`, book stays up. Implemented as a 0.35s eased blend toward a `glance` pose, driven by
a `0..1` value that rises while hovered and falls when not — so it reverses cleanly mid-transition
instead of latching. A reader without a quote keeps today's `A.greetseat` wave.

**He does not turn.** One eased 0.5s lerp from `A.read` into `hold`: the spine uncurls, the book comes
down to the lap, the head comes up. `flip` is never touched, so he keeps whichever way he was already
facing and is never spun away from the card he is sitting on. The bubble opens on arrival.

This was reconsidered mid-design. An earlier version turned him toward the side the click came from,
which needed a two-stage lerp through a deliberately mirror-symmetric midpoint to hide the boolean
`flip` swap. Looking up alone reads as "you got his attention" just as well, needs none of that
machinery, and never leaves a reader facing off the edge of his own card. There is no symmetric
midpoint pose and no `targetFlip` in the implementation — if either appears, it is left over from the
abandoned approach.

**The book needs no special handling.** `drawBook` renders at the midpoint of the two hands, so moving
his hands to his lap takes the book with them. Keep `book:true` throughout `read`/`turn`/`hold`; drop
it for the wave and the shrug, where the hands are doing something else.

**Resume is symmetrical:** the same 0.5s lerp back into `A.read`. Since nothing flipped, there is
nothing to restore.

## The bubble

One `<div class="ev-quote">` per open bubble, appended to `body`, positioned in **document**
coordinates — the same convention the figure canvases use, so it scrolls with the page for free and
needs no per-frame work. `z-index: 70`, above the `z-index: 60` canvases, `pointer-events: auto`.

**Appearance.** `2px solid` in that Bobit's own tone from `figColor(tone)`, `border-radius: 14px`
(`--radius-card`), fill `var(--card)`, `var(--shadow-md)`. The tail is stacked triangles — outer in the
tone, inner in `--card` inset 2px — so the outline reads continuous. Quote italic at ~0.9rem/1.55 in
`--heading`; attribution 0.8rem with the speaker's name as the link in the tone colour, underlined;
the document and date beneath it in `--muted` at 0.74rem.

**Content.** Quote text, then `— <a target="_blank" rel="noopener">Speaker</a>`, then the document
line. `role="note"`.

**Placement.** Centred on his head, 14px above it, `width: 300px` capped to `calc(100vw - 16px)`,
clamped to `[8px, viewportWidth − width − 8px]`. When clamping pushes the bubble sideways, the tail
slides along the bottom edge — clamped to `[18px, width − 18px]` so it stays clear of the rounded
corners — and keeps pointing at his head. The page must never scroll horizontally.

**Lifetime.** Fades in over 180ms with a 4px rise. Auto-fades after **12 seconds**, but the timer
**pauses while the pointer is over the bubble or over the Bobit himself, and while keyboard focus is
inside the bubble** — any of those means the reader is still reading, and a bare 12s countdown pulls
the source link away exactly as someone reaches for it. Dismissed early by clicking him again,
clicking anywhere off the bubble, or pressing Esc. Fade out 240ms, then remove, while the figure
lerps back to reading.

Multiple bubbles may be open at once, each with its own timer.

**Known small imprecision:** there is a ~14px gap between the figure's hitbox and the bubble's bottom
edge, so sweeping the pointer from him to the bubble lets the timer tick for a fraction of a second.
Not worth plugging. If it ever grates, the alternative rule is pause-and-stay-paused — once held, the
timer never resumes, so a bubble only expires if it was never touched.

**Reduced motion.** `prefers-reduced-motion: reduce` drops the bubble's fade and rise; it appears and
disappears instantly. The figures keep animating, consistent with every other Bobit on the page.

## Event wiring

The canvases are `pointer-events: none`, so this follows the established pattern exactly: a single
document `click` listener with sequential hit-tests, and shared `mx`/`my` from the document
`mousemove` for hover.

The reader hit-test goes into the existing listener **before** the click-off-to-dismiss branch, and
returns early when it matches. Otherwise a click on a reader would first be treated as an outside
click (closing his bubble) and then reopen it. Clicks inside a bubble call `stopPropagation`.

Hit-test box, in screen coordinates: `±34px` horizontally of the canvas centre, and vertically from
96px above the seat line to 26px below it.

## Accessibility

`role="note"` on the bubble; the link is reachable and focus-visible; Esc closes. Focus is
deliberately **not** moved into the bubble on open, which would yank the scroll position.

Discovery is mouse and touch only — the canvases are `pointer-events: none` and the figures are not
focusable, so a keyboard user cannot reach a reader. This is true of every existing Bobit interaction
(rope, kite, dog-fetch, yo-yo, paddleball), so it is consistent rather than a new regression, and the
quotes carry no information the page needs to convey. Recorded as a known limitation, not solved here.

## Testing

Playwright against the static site, per the project's verification setup, driving time with
`#figdebug`.

1. Exactly `min(poolSize, readerCount)` readers are dealt a quote, all distinct.
2. A cast with no readers promotes a sitter; a reader always exists when the pool is non-empty.
3. Hover a quotable reader → `headTilt` rises; mouse-out → it returns. Hover a quote-less reader →
   he waves.
4. Click → he lerps to the hold pose **without** `flip` changing, and the bubble's text and `href`
   match the dealt quote exactly, `æ` ligature intact.
5. The 12s timer expires and the bubble closes; hovering the bubble pauses it; hovering the **figure**
   pauses it.
6. Esc closes; outside-click closes; a second click closes and he returns to `A.read`.
7. Quote-less reader click → shrug, no bubble.
8. Both themes: bubble border, link and text contrast legibly, tone matches the figure.
9. At 360px viewport width no bubble causes horizontal scroll, and the tail still points at the head.

## Out of scope

- Keyboard-reachable Bobits (see Accessibility).
- Quotes on any figure other than seated readers.
- Sharing, permalinking or deep-linking an individual quote.
- Reading the pool from `presidential_quotes.md` at runtime — the shipped table is derived by hand,
  because the markdown carries verification notes and editorial commentary that must not reach the page.
