// ── Empowered Vote mascot animation extras ───────────────────────────
// Reusable concept poses layered on top of LeremyRig.  Load AFTER
// leremy-rig.js.  Each new animation is registered into
// LeremyRig.ANIMATIONS by name, so the mind map, the decks, and the
// landing page can all reuse it via ANIMATIONS[name].frame(t).
//
// Canonical home: keep this file beside leremy-rig.js.  When you invent a
// new explainer pose, add it here (not inline in a single map) so it stays
// leverageable everywhere.
(function () {
  "use strict";
  if (!window.LeremyRig) return;
  var A = window.LeremyRig.ANIMATIONS;
  var base = A.present;                       // calm standing base with breathing + gentle lean
  function osc(t, hz) { return Math.sin(t * hz * Math.PI * 2); }

  var EXTRAS = {
    // Both arms raised in celebration. Good for wins / horizon goals.
    cheer: { label: "Cheer", mood: "yes, we can do this", frame: function (t) {
      var p = Object.assign({}, base.frame(t));
      var s = osc(t, 1.05);
      p.armRU = 150 + s * 6;  p.armRF = 150 + s * 9;
      p.armLU = -150 - s * 6; p.armLF = -150 - s * 9;
      p.headTilt = -7;
      p.bob = (p.bob || 0) - 1.5 - Math.abs(s) * 2;
      return p;
    } },
    // Hand to chin, head tilted, slow sway. Good for "think about this".
    ponder: { label: "Ponder", mood: "hmm, let me think", frame: function (t) {
      var p = Object.assign({}, base.frame(t));
      var s = osc(t, 0.45);
      p.armRU = 34;  p.armRF = -162 + s * 3;      // upper arm lifts, forearm folds up to the chin
      p.headTilt = 11 + s * 2;
      p.hunch = (p.hunch || 0) - 2;
      return p;
    } },
    // One arm extended, presenting outward to the side. Good for "here is the idea".
    offer: { label: "Offer", mood: "here, take a look", frame: function (t) {
      var p = Object.assign({}, base.frame(t));
      var s = osc(t, 0.7);
      p.armRU = 78 + s * 3;  p.armRF = 92 + s * 3;  // right arm reaches out, palm up
      p.headTilt = -3;
      return p;
    } },
    // Thumbing a phone or tapping through a questionnaire. The off hand holds
    // the device (pair it with prop {phone:true}); the near hand taps.
    tap: { label: "Tap", mood: "answering, one at a time", frame: function (t) {
      var p = Object.assign({}, base.frame(t));
      var s = osc(t, 1.25);
      p.armLU = 46;  p.armLF = -118;                  // off hand holds the phone up
      p.armRU = 40 + s * 2;  p.armRF = -104 + s * 9;  // near hand taps at it
      p.headTilt = 16;
      p.hunch = (p.hunch || 0) + 3;
      return p;
    } },
    // Presenting a chart standing beside the figure: near arm swept out toward
    // it, head turned to what it is showing. Slower than `offer`.
    //
    // The near arm bends at the elbow instead of reaching out in one straight
    // line. The shoulder sits only about seven pixels below the neck, and the
    // head fills the space above it, so an arm held level with the shoulder
    // leaves the body in the one place where nothing of the body is visible
    // behind it: at the size a figure is drawn in a 1080p frame it reads as a
    // stick growing out of the jaw. Dropping the upper arm to the middle of
    // the torso puts the join where the viewer can see it, and the forearm
    // still finishes level, which is what makes the gesture read as showing.
    //
    // The off arm is swung clear of the torso for the same reason: hanging
    // straight down it disappears behind the torso bar and the figure looks
    // as though it has one arm.
    showTo: { label: "Show to", mood: "look at this with me", frame: function (t) {
      var p = Object.assign({}, base.frame(t));
      var s = osc(t, 0.38);
      p.armRU = 62 + s * 4;  p.armRF = 96 + s * 5;
      p.armLU = -13;  p.armLF = -20;
      p.headTilt = -13 + s * 2;
      p.lean = (p.lean || 0) + 2;
      return p;
    } },

    // ── The high five, which is TWO poses and has to be ───────────────────
    //
    // A high five needs a partner, and the partner cannot play the same pose:
    // two figures both reaching with the near hand reach past each other and
    // slap nothing. So there are two, named for the hand that goes up, and the
    // caller pairs them — LEFT PARTNER PLAYS `highfiveR`, because the one on
    // the left reaches to its right. That is the same rule CTC's own crowd
    // uses (`pairUp` in crowdReactions.ts returns each pair left-first), and
    // it is stated here because the two modules will never see each other.
    //
    // THE UPPER ARM CARRIES THE BEAT, NOT THE FOREARM, and that is measured
    // rather than chosen. Reading the rig's own hand joint back at sixteen
    // angle pairs: lifting the FOREARM from 125 to 155 raises the hand 26
    // units but also pulls it 15 units INBOARD, so a pair of partners drift
    // apart exactly as they reach the top and the five misses. Lifting the
    // UPPER arm from 88 to 112 raises the hand the same 17 units and moves
    // it sideways by 2. So the forearm is parked near 130, where the open
    // hand sits out at the side of the head, and the upper arm swings.
    //
    // WHICH MAKES THE PAIR'S SPACING PART OF THE POSE. The hand lands about
    // 83 rig units from the figure's own centre line, so two partners meet
    // when their centres are about 166 units apart at scale 1 — exported
    // below as `HIGHFIVE_GAP`. Closer than that and the forearms cross
    // through each other's heads, which is what the first cut of this did.
    //
    // The free arm is left close to the body. Swung clear it reads as a second
    // gesture, and two gestures at once is semaphore.
    //
    // 1.1 Hz, not faster. At two per second a pair reads as sparring.
    highfiveR: { label: "High five (right)", mood: "yes! up top", frame: function (t) {
      var p = Object.assign({}, base.frame(t));
      var swing = 0.5 + 0.5 * osc(t, 1.1);
      p.armRU = 80 + swing * 32;   p.armRF = 128 + swing * 8;
      p.armLU = -24;  p.armLF = -30;
      p.headTilt = -7 - swing * 4;
      p.lean = (p.lean || 0) + 2 + swing * 2;
      p.bob = (p.bob || 0) - swing * 2.5;
      return p;
    } },
    highfiveL: { label: "High five (left)", mood: "yes! up top", frame: function (t) {
      var p = Object.assign({}, base.frame(t));
      var swing = 0.5 + 0.5 * osc(t, 1.1);
      p.armLU = -80 - swing * 32;  p.armLF = -128 - swing * 8;
      p.armRU = 24;   p.armRF = 30;
      p.headTilt = 7 + swing * 4;
      p.lean = (p.lean || 0) - 2 - swing * 2;
      p.bob = (p.bob || 0) - swing * 2.5;
      return p;
    } }
  };

  // The spacing the two high-five poses were solved for, in rig units at
  // scale 1. Exported because the pose is useless without it: a caller
  // that places a pair by eye gets crossed arms.
  window.LeremyRig.HIGHFIVE_GAP = 166;

  Object.keys(EXTRAS).forEach(function (k) {
    A[k] = EXTRAS[k];
    if (window.LeremyRig.ORDER && window.LeremyRig.ORDER.indexOf(k) < 0) window.LeremyRig.ORDER.push(k);
  });
})();
