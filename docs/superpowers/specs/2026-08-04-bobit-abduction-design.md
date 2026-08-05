# Bobit abduction — he drops it, floats, shimmies, vanishes

**Date:** 2026-08-04
**Status:** implemented

## Deviations found while building

Three numbers in this spec were wrong, all caught by measurement rather than review.

**`AB_GROW` is 64, not `FLOAT_H + 12` = 46.** The headroom survey below measures each mode's *resting*
ink, and rope's resting ink is a SEATED figure only 68px tall — but the abduction draws him STANDING in
the spread eagle at 84px. He needs room for the pose change as well as the float. At 46 he was still
clipped at y=0 on the first frame. It is now `Math.max(AB_GROW, STAND_INK_H + FLOAT_H + 8 - ink.floor)`,
which resolves to 64 for every mode in the cast today — one path, always exercised — while a future mode
drawn lower in its canvas gets what it needs instead of being quietly decapitated.

**The spread eagle is 120/120/30/30, not 132/150/26/20.** `armRF` and `legRF` are ABSOLUTE directions in
this rig, not angles relative to the limb above them, so the original numbers folded each forearm back
toward vertical. Measured silhouette: 39px against 49px for straight limbs, and — worse — it got
*narrower* through the second half of the rise, so the spread read as the figure shrinking. Chosen off
measurements: 100/100 is wider still at 56px but drops the arms to 10 degrees above horizontal and reads
as a T-pose.

**The smoke anchor and radius both had to change.** Anchoring off `POOF.fx/fy` does not survive the
canvas growth — those are fractions of the canvas rect, and growing it moves the top and changes the
height, so the cloud drifted `grow * fy` low, measured ~52px, putting it round his ankles. `drawAbduct`
now publishes his actual body position each frame. The radius then had the opposite problem: the
original `12 + k*k*46` grows to 58px against an 84px figure and buried the spread eagle and the shimmy
behind it. It is now capped at 34 and draws back to ~22 through the shimmy, anchored at his hips rather
than his centre so his upper half stays clear.

None of these were visible to a state-only test. The first was caught by the new test, the other two only
by looking at screenshots.
**Amends:** [2026-08-03-bobit-poof-exodus-design.md](2026-08-03-bobit-poof-exodus-design.md)
**Pass 1 of 2.** This covers the victim. The page-wide "everyone drops what they are holding during the
stunned beat" is pass 2 — see "What pass 2 inherits".

## Summary

Today the three-second hold is three seconds of smoke gathering around a Bobit who carries on as if
nothing is happening, and then he is gone. The gag has no build.

Now he reacts. He drops whatever he was holding, floats a little off the ground with his arms and legs
spread, and in the last second before he goes he judders like he is being electrocuted. Let go early and
the smoke thins, he comes back down — hard if he was high, gently if he had barely left the floor —
picks himself and his prop up, and carries on.

## The timeline

`POOF_HOLD` stays 3.0s. What changes is what the victim does inside it, tracked on a new `e.ab` state
machine that is separate from `POOF.phase`.

| sub-phase | window | what happens |
|---|---|---|
| `letgo` | 0 → 0.35s | His prop hits the floor. Pose eases out of whatever he was doing toward neutral. Feet still on the ground. |
| `rise` | 0.35 → 2.0s | Floats up to `FLOAT_H`, eased out so he leaves the ground slowly and settles into the hover. Pose lerps to spread-eagle across the same window. |
| `shimmy` | 2.0 → 3.0s | Holds at height and vibrates. |
| burst | 3.0s | The existing poof. Unchanged. |

### Float height

`FLOAT_H = 34px` — 0.4 of a figure's measured 84px ink height, so it is written as a fraction of the
figure rather than as a magic pixel count. Low deliberately: he hovers just off the floor rather than
hanging in space, which is both what was asked for and a better read for the shimmy, since a figure
vibrating a few px above the ground looks held by something.

### The shimmy

The pose stays **locked** in the spread eagle and the whole figure judders as one rigid body: an x offset
and a small rotation at ~50Hz, amplitude ramping 0 → 2.5px across the second. Rigid is what makes it read
as electrocution rather than as a wave — and at S=0.32 the limbs are about 3px wide, so per-limb jitter
would read as noise rather than motion.

## Canvas headroom

Floating needs empty canvas above his head. Measured ink-top for every mode, across two viewports:

| mode | headroom |
|---|---|
| **rope** | **0px** |
| yoyo | 61px |
| stand, patrol, paddlepair | 62–71px |
| kite | 77px |
| seat, dogfetch, cartwheel | 92px |
| beam | 153px |

Nineteen of the twenty mode/animation combinations measured have room for a 34px rise several times over.
`rope` has none: he is drawn at the
very top of his canvas, because `drawFig` receives `barY = 46` as his **pelvis** and his head sits ~48px
above that, putting it at y ≈ 0. He would lose his head on the first frame of the rise.

**So the victim's canvas always grows upward by `FLOAT_H + 12` = 46px**, not only when it is tight.
A branch that fires for one mode in twenty is a branch that is never exercised and rots — this file has
three logged defects from exactly that shape (see the header of `tests/poof/08-flee-floor.cjs`). One path,
always taken, always covered by the test. Only one figure is ever abducting, and the canvas is restored on
recovery or discarded on the burst.

Growing **upward** means the top edge moves up by 46 and the height grows by 46, so the canvas bottom does
not move and every mode's `h - 6`-style bottom-relative drawing still lands where it did. Local y for a
fixed screen point shifts by +46, so his floor is captured once at grab time (`e.abFloor`, measured from
the ink the same way `poofArmFlee` does) and everything in the abduction draw is positioned from it.
`reposition()` skips the abducting victim, the same way it skips fleeing entries.

## Spread-eagle pose

Symmetric: arms out and up at ~135° (0° is straight down in this rig, 90° horizontal), legs apart at
~±28°, a slight backward lean, head tilted up.

Deliberately symmetric, unlike `raisePose()`, which had to have asymmetry baked in because a symmetric
arms-overhead pose merges into the head-and-torso line and reads as one vertical stick at this scale. A
spread eagle is wide rather than vertical, so it should not hit that failure — but it is the same class of
risk, so it gets confirmed on the pixels before this is called done, not reasoned about.

## Early release

Recovery belongs to the **entry** (`e.ab`), not to `POOF.phase`. The smoke fizzles on its existing 0.4s
clock while he collapses underneath it, which is the order described: the smoke goes away, *then* he
collapses and gets up. `POOF` returns to `idle` on its own schedule; `poofStart` refuses a figure whose
`e.ab` is still running, so he cannot be re-grabbed mid-recovery.

Scaled to how far he actually got:

- **Lift < 12px** → `settle`: eases back onto his feet over 0.35s and resumes. A 0.2s grab must not
  produce a pratfall.
- **Otherwise** → `collapse`: falls under the same `FALL_G` gravity as the flee, then `heap` → `getup` →
  resume, reusing `cwHeap()` and the getup lerp already in `drawFlee`.

On resume he picks his prop back up and his mode takes the draw back over.

## The prop registry

Because the abduction draw **replaces the victim's mode draw entirely**, no mode needs to learn to omit
its own prop in this pass. Two functions:

- `propOf(e)` → `{ kind, x, y }` — what he is holding and where, in canvas-local coords, captured at the
  grab.
- `drawGroundProp(ctx, kind, x, y, col)` — draws that thing lying on the floor.

Kinds: `ball`, `beamload`, `letter-v`, `letter-e`, `light`, `kite`, `yoyo`, `book`, `phone`, `paddle`.
`null` for a figure holding nothing, which is most of them. The rig already draws the book as a
`drawFig({ book: true })` option, so the grounded versions are mostly small shape draws next to the ones
that already exist.

The prop is dropped in `letgo` under the same `FALL_G` as everything else that falls in this feature, and
it stays on the floor after he vanishes — physical evidence that someone was taken.

## Pass 2 — built

Shipped, with three changes to what was sketched below.

**Which props hurt.** Only ball, the beam crew's load, and a `.vote` logo piece land on a foot. A light,
book, phone, yo-yo or paddle falls and clatters beside him. A **kite does not fall at all** — let go of
it and the wind lifts it off the side of the page. A ball already in flight carries on the way it was
travelling as it drops, so it bumps down near whoever it was heading for, rather than stopping dead in
the air.

**The hurt Bobit still raises.** He throws his hands up with everybody else — the whole room reacting on
one beat is the joke — and only discovers the foot when he tries to move. Then `hlimp`, a new sub-phase
between `raise` and the ledge test, at half speed.

**`hystericalLimp` is a new pose.** The existing `limpPose` deliberately has the arms DOWN: it is the
moment "the panic became pain". This is the other order — something heavy landed on him while he was
already terrified — so it keeps the flee's overhead flailing on top of the limping legs.

Props live in `DROPS` on the smoke overlay in DOCUMENT coordinates, not on their owners' canvases. Two
reasons that has to be so: most mode branches return early, so there is no clean post-figure hook (the
same reason the smoke lives there), and a fleeing canvas is cleared, resized and repositioned out from
under anything drawn on it. Once it is on the floor a prop is page furniture.

Three things this pass had to fix in pass 1:

- `abductStart` now also fires from `poofTick` when the phase is `holding`, not only from `poofStart`.
  Being held IS being abducted, so the phase owns it; anything driving `POOF` directly otherwise skipped
  the whole sequence and never dropped the victim's prop.
- The victim's prop is handed to `DROPS` at the burst. It was drawn on his canvas, so it had been
  vanishing in the same puff — contradicting this spec's own claim that it stays as evidence.
- `HEAVY_PROP` was keyed `letter-v`/`letter-e` while `propOf` returns `letter`, so a dropped logo piece
  would never have hurt anyone.

## What pass 2 inherits

Pass 2 ("everyone drops what they are holding during the stunned beat") needs exactly one thing this pass
does not build: `suppressProp(e)`, so a **non-victim** mode stops drawing a prop that is now lying on the
floor. `propOf` and `drawGroundProp` are already the hard half and are reused as-is.

Note for pass 2: the stun currently pins `dt` to 0 for every entry, so nothing moves. Dropped props will
have to advance on real time while the figures stay frozen — the whole room still, and the sound of things
hitting the floor. A ~40px drop takes ~0.27s at `FALL_G`, so the existing 1.0s `POOF_STUN` has room and
does not need extending.

## One behaviour change this forces

`mousemove` currently cancels the hold when the pointer leaves the victim. The moment he floats he slides
out from under the cursor, so the hold would cancel itself. Only releasing the button was ever described
as the cancel, so **the move-off cancel is disabled once `rise` begins**. During `letgo` he has not moved
yet, so it still applies there — dragging off him in the first third of a second is still a cancel.

## Out of scope

- Pass 2, as above.
- The rope Bobit's rope and frame vanish the instant the abduction draw takes over, as they already do
  when he flees. Existing behaviour, not a regression.

## Verification

`tests/poof/11-abduct.cjs`, asserting **pixels as well as state** — every earlier defect in this feature
passed a state-only suite.

1. **He rises.** Ink bottom decreases monotonically through `rise` and ends `FLOAT_H` ± 3px above where it
   started. Measured from the ink, not from `e.ab` state, so a figure who is "floating" in state but not
   on screen fails.
2. **Nothing is clipped.** His ink top stays > 0 for the whole rise, on `rope` specifically — the mode
   that forced the canvas growth. A `rope` victim is required, not hoped for.
3. **He spreads.** Silhouette width grows from the pre-grab idle to the top of the rise, using the
   measurement `09-raise` uses for the hands-up.
4. **He shimmies.** Across `shimmy`, the variance of his ink centroid x is above a floor **and** his mean
   position does not drift — a judder, not a slide.
5. **The prop is on the floor.** For a mode with a prop, ink is painted at the pre-grab floor line after
   `letgo`, and it is still there after he vanishes.
6. **Early release, both branches.** Released at 0.2s: no `heap` state is ever entered, he ends alive with
   `e.ab` cleared and his mode drawing again. Released at 2.5s: `collapse → heap → getup` all occur, and
   he still ends alive with his mode drawing again. Both assert he is *not* `gone`.
7. **The move-off cancel.** Moving the pointer off him during `rise` does not cancel; during `letgo` it
   does.
8. The full hold still ends in the burst, the stun, and a completed exodus — `POOF.phase` reaches
   `cleared`, so the abduction cannot strand the machine.

`tests/poof/02-press.cjs` and `04-stun.cjs` must stay green; they drive the hold and cancel paths.

## Drive-by

`poofTick`'s comment on arming the flee still claims "every runner's canvas goes position:fixed in this
same frame". That stopped being true in `ed8ae03`, when fleeing canvases went back to document coords.
Fix the comment.
