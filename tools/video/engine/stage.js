// Draws exactly one frame of one scene at exactly one time t.
//
// This file and cast.js are the ONLY code in the pipeline that draws. Keeping
// every other module away from the canvas is what makes the determinism test
// in tests/video/02-determinism.cjs meaningful: if the pixels depend only on
// (scene, t), then the same pair cannot ever produce two different frames.
(function () {
  "use strict";
  if (window.EVStage) return;

  var BG = "#111113";
  var canvas = null, ctx = null, W = 0, H = 0;

  function init(w, h) {
    canvas = document.getElementById("stage");
    canvas.width = w; canvas.height = h;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx = canvas.getContext("2d");
    W = w; H = h;
  }

  function renderFrame(scene, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (scene.alpha) ctx.clearRect(0, 0, W, H);
    else { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }
    // Scene types arrive in Task 2 (title, stage) and Task 4 (art).
  }

  window.EVStage = { init: init, renderFrame: renderFrame };
})();
