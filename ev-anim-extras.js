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
    } }
  };

  Object.keys(EXTRAS).forEach(function (k) {
    A[k] = EXTRAS[k];
    if (window.LeremyRig.ORDER && window.LeremyRig.ORDER.indexOf(k) < 0) window.LeremyRig.ORDER.push(k);
  });
})();
