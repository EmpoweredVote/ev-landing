# Bobit poof & exodus — design

**Date:** 2026-08-03
**Status:** approved, ready for implementation planning

## Summary

Press and hold the right mouse button on any Bobit. Smoke gathers around him over three seconds and
then he vanishes in a puff. Everyone else freezes for a beat, then bolts for the nearest screen edge
with their arms flailing over their heads. Anyone whose perch is too short to reach an edge runs out of
ledge, drops off it, lands in a crumpled heap, picks himself up slowly and limps the rest of the way.

The page is left empty until reload.

## Why it works this way

Two decisions carry most of the design:

**The hit-test reads the canvas's alpha channel.** Only 2 of the 14 cast figures expose a hit
coordinate today (`seat` via `_qSX`, `rope` via `_ropeSX`); hover for the rest is done with live
`mx`/`my` proximity inside the draw loop, with nothing stored. Rather than add a hitbox to all fourteen
modes — the same copy-into-every-mode pattern that caused the phone overflow bug — a press samples
`getImageData` alpha at the pointer's canvas-local position. Non-zero alpha means the pointer is on
painted ink, i.e. an actual Bobit rather than the empty space around him. This needs no per-mode code
and every future mode inherits it. These canvases draw pure vectors, so they are never tainted;
`getImageData` on them already works under `file://` (it was used to measure the beam crew's height).

**Whether a Bobit can reach the edge is geometry, not chance.** Every Bobit stands on the top or bottom
edge of a real element — a note card, a video thumb, a button, the footer. That perch is usually
narrower than the viewport. So the ones who run out of ledge and have to drop are decided by where they
happen to be standing, which reads as physical rather than arbitrary, and gives free variety: a figure
on the footer just runs off, a figure on a small card does the whole pratfall.

## Input

- **Desktop:** hold the right mouse button for 3s on a Bobit.
- **Touch:** hold one finger for 3s on a Bobit.
- **`contextmenu` is suppressed only when the press began on painted Bobit pixels.** Everywhere else on
  the page, right-click behaves normally. This is required, not a preference: Firefox fires
  `contextmenu` on mousedown, so without it the menu opens instantly and cancels the hold. Chrome fires
  it on mouseup, which would fire the menu the moment the gag completes.
- On touch, the long-press callout is suppressed over a Bobit the same way.

**The hold is cancelled** — smoke dissipating over 0.4s, no poof — by any of: releasing the button,
moving off the figure, the pointer leaving the window, `blur`, pressing Escape, or (touch) moving the
finger more than 10px. The touch-move rule matters: a scroll that happens to start on a Bobit must
still scroll the page.

Only one hold can be in flight at a time, and the gag can only run once — a second long-press after the
page has cleared does nothing.

## Timeline

| t | phase | what happens |
|---|---|---|
| 0 → 3.0s | `holding` | smoke wisps gather at his feet and thicken until they nearly hide him. **He carries on doing whatever he was doing** — no pose change. |
| 3.0s | `poof` | the cloud bursts outward and fades over 0.6s. He is gone; his canvas is removed once the cloud clears. Any open quote bubble is closed. |
| 3.0 → 4.0s | `stunned` | every other Bobit freezes mid-pose, with one small startle jolt so it reads as shock rather than a paused animation. |
| 4.0s → | `fleeing` | each remaining Bobit runs for whichever screen edge is nearer, arms flailing overhead. Removed as he leaves the viewport. |
| ~6s | `cleared` | nothing left painting; `reposition()` and the per-figure draw work stop. |

## Fleeing

**Reaching the screen edge needs the canvas widened.** Each Bobit lives in his own ~190px canvas, so
left alone he would vanish at an invisible box edge in the middle of the screen. On entering `fleeing`,
each participant's canvas is resized to viewport width (and taller, to allow for the drop below) with
its floor line preserved. The canvas is transparent and `pointer-events:none`, so this costs nothing
visually and cannot capture clicks. Width goes through the existing `fitW`/`fitLeft` helpers so the
widened canvas cannot reintroduce horizontal page scroll.

**The flail** is `A.scurry`'s legs with a custom arms-overhead pose. Each figure gets its own phase
offset and two non-harmonic sine frequencies on the arm angles, so the group never flails in unison.

**Figures already scrolled off-screen are removed outright, not animated.** The draw loop returns early
for any canvas outside the viewport (`cr.bottom < -40 || cr.top > innerHeight + 40`), so an off-screen
participant would never tick, never finish fleeing, and would leave the page permanently un-cleared.
On entering `fleeing`, any participant whose canvas is currently culled is simply removed. Nobody is
watching them, and it keeps the "page ends empty" guarantee true regardless of scroll position.

A figure counts as gone, and his canvas is removed, once his x is past the viewport edge by more than
his own width.

**Ledge check.** A figure's perch is his anchor element's rect. Flee direction is toward the nearer
viewport edge. If the perch extends past the viewport edge in that direction, he simply runs off. If it
ends first, he runs to the end of the ledge and then:

| sub-phase | duration | what it looks like | reuse |
|---|---|---|---|
| `drop` | ~0.45s | steps off the end, short falling arc down ~50px | `A.jump` into `A.fall` |
| `heap` | 1.0s | crumpled on the ground, small wriggle, tipped over | `cwHeap(t)` + the cartwheel's `cwRot`/`cwYoff` lying transform |
| `getup` | ~0.9s | rotates upright and unfolds, deliberately slow | the cartwheel `getup` lerp: `lerpPose(cwHeap(0), A.standstill.frame(0), smooth01(t / 1.2))` |
| `limp` | until off-screen | walks off favouring one leg, at about half flee speed | the beam ball-gag's limp: stiff knee via `legRF += 42`, shortened step, weight-bearing `bob` hitch |

**The arms come down during `getup`.** He stops flailing and limps off with a lower, one-arm posture:
the panic has drained into pain. This is a judgement call rather than something specified — flagged
here so it can be reversed easily if it reads wrong.

The drop is a fixed ~50px rather than an attempt to find a real surface below. Canvases sit at
`z-index: 60`, above the cards, so he lands in front of whatever is beneath his perch, which reads as
landing on the ground in front of it.

## Who takes part

Everything in the cast **except the three `why` figures** (`.why-grid .why-item .why-icon`, animations
`spent` / `notlistening` / `witsend`). Those are content, not inhabitants: the code hides an `<img>` and
draws them in its place, so if they fled the section would be left with three empty holes. They are
excluded completely — they do not flee, and right-clicking one does nothing at all.

**Each entry sends one runner.** A two-figure scene — the beam pair, the paddleball pair, the
cartwheeler and his helper — leaves as a single fleeing figure rather than scattering separately. An
entry is one canvas with one state bag, and locating the *second* figure means per-mode knowledge
(`e.gA`/`e.gB`, `e._ppSXL`/`e._ppSXR`, `e.hp`) — the same reach-into-every-mode coupling this design
avoids in the hit-test. The generic alternative of clustering the canvas's ink breaks on props: the kite
would become a "runner" and sprint off on human legs. If pairs leaving as one reads badly, per-mode
runner seeding is a contained follow-up, to be judged against the real thing.

**The dog is the exception and does get his own escape**, because he already has a `run` pose in
`drawDog` and can leave as himself rather than as a stick figure. He runs slightly faster than his owner.

Scene props (the beam's carried line, the kite, the yo-yo, the ball) simply stop being drawn when their
owner leaves; nothing is animated for them.

`banner` and `crosser` modes exist in the code but are never cast, so they need no handling.

## Where the code lives

**`leremy-rig.js`** gains `drawSmoke(ctx, x, y, spread, alpha, seed, t)` — a drawing primitive with no
knowledge of the gag, alongside the other props (`drawBook`, `drawCane`, `drawPaddleball`, `drawDog`).
Puffs are soft grey circles at pseudo-random offsets, growing and fading; the same function serves both
the slow build-up and the burst, differing only in `spread` and `alpha`.

**`ev-figures.js`** gains a fenced `POOF` section: the press detection, the alpha hit-test, the global
phase machine and the per-figure flee state.

This deliberately does **not** become a fourth file. `ev-quotes.js` was split out because it owns DOM
and content that the rig genuinely should not know about; this gag is pure rig state — it reaches into
`entries` every frame to freeze clocks, override poses and resize canvases. Every comparable gag
(light-out, dog-fetch, cartwheel) lives in `ev-figures.js` for the same reason, and a separate module
would need an interface so wide into the cast that the boundary would be fiction.

State is global rather than per-entry, since the gag is a property of the page:
`POOF = { phase, t, victim, holdT, hitX, hitY }`. Per-figure flee state (`e.fl`, `e.flT`, `e.flDir`)
hangs off each entry the way `e.cw`, `e.df` and `e.qs` already do.

**Freezing must pass `dt = 0`, not reuse the animation-clock gate.** The obvious move is to extend the
existing `e.lt += dt * ((e.greet || e._fall > 0) ? 0 : 1)` gate, but that only freezes `tt`, the gait
clock. The scene machines advance their own timers straight off `dt` — `e.dfT += dt`, `e.cwT += dt`,
`e.ktT += dt`, `e.qsT += dt` — so a frozen `tt` would leave the dog still fetching and the cartwheeler
still spinning while everyone else stood still. During `stunned` the mode draw functions are therefore
called with `dt = 0` **and** a held `tt`, which freezes both layers at once without touching any
individual machine.

## Testing

Playwright, driving `index.html` with `#figdebug`, per the project's verification setup.

1. A 3s right-press on a Bobit fires the gag; a 2.5s press does not.
2. Smoke ink in the victim's canvas grows over the hold (measured by alpha coverage).
3. After the poof, the victim's canvas stops painting and is removed.
4. During `stunned`, **both** layers are frozen: sample a pose twice and assert it is unchanged, and
   assert a scene timer (`e.dfT` / `e.cwT` / `e.qsT`, whichever is in the cast) has not advanced —
   a `tt`-only freeze would pass the first check and fail the second.
5. A participant that is scrolled off-screen when the gag fires is removed rather than left behind, so
   the page still ends empty when the gag is triggered from the top of a long page.
6. During `fleeing`, participants move horizontally toward a viewport edge.
7. A figure on a narrow perch goes through `drop → heap → getup → limp`, and one on a wide perch does
   not — asserted from the per-figure state, not from pixels.
8. The page ends with **zero** painting canvases except the three `why` ones, which are still painting.
9. `contextmenu` is prevented when the press starts on a Bobit, and **not** prevented elsewhere.
10. Releasing early, moving away, Escape and a >10px touch move each cancel with no poof.
11. An open quote bubble is closed by the poof.
12. No horizontal page scroll at 360px at any point during the exodus (the widened canvases must not
    reintroduce the bug fixed on 2026-08-02).

## Out of scope

- Any way to bring them back without reloading.
- Persisting the cleared state across navigations.
- Left-click, double-click or keyboard triggers.
- Animating the abandoned props (they simply stop being drawn).
- A return animation — there is no coming back.
