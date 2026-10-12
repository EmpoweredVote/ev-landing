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
  var FG = "#F2F2F2", MUTED = "#9A9AA0";
  var FONT = '"Figtree", "Segoe UI", system-ui, sans-serif';
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

    if (scene.type === "title") return drawTitle(scene, t);
    if (scene.type === "stage") return drawStageScene(scene, t);
    if (scene.type === "art") return drawArtScene(scene, t);
    throw new Error("unknown scene type: " + scene.type + " (scene " + scene.id + ")");
  }

  // Ease a value in over `dur` seconds starting at `t0`. Returns 0..1.
  function fade(t, t0, dur) {
    if (t <= t0) return 0;
    if (t >= t0 + dur) return 1;
    var x = (t - t0) / dur;
    return x * x * (3 - 2 * x);          // smoothstep
  }

  function drawTitle(scene, t) {
    var a = fade(t, 0.15, 0.5);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.fillStyle = scene.accent || FG;
    ctx.font = "700 " + Math.round(H * 0.11) + "px " + FONT;
    ctx.fillText(scene.headline || "", W / 2, H * 0.50);
    if (scene.sub) {
      ctx.fillStyle = MUTED;
      ctx.font = "500 " + Math.round(H * 0.045) + "px " + FONT;
      ctx.fillText(scene.sub, W / 2, H * 0.60);
    }
    ctx.restore();
  }

  // Shared by stage and art scenes: an art scene often needs a phrase on
  // screen too, and duplicating the draw is how the two drift apart.
  // `headlineAt` is the second the words that say it are spoken, read off the
  // recording. Type that appears before the voice reaches it is read ahead of
  // the voice, and from then on the viewer is reading rather than listening —
  // so a headline waits for its own sentence instead of arriving with the cut.
  function drawHeadline(scene, t) {
    if (!scene.headline) return;
    ctx.save();
    ctx.globalAlpha = fade(t, scene.headlineAt == null ? 0.1 : scene.headlineAt, 0.45);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = FG;
    ctx.font = "700 " + Math.round(H * (scene.type === "art" ? 0.052 : 0.072)) + "px " + FONT;
    ctx.fillText(scene.headline, W * 0.08, H * headY(scene));
    ctx.restore();
  }

  // How far down the headline sits, as a fraction of the height. A scene that
  // also puts the product's mark in the top-left corner needs its words lower,
  // or the two touch. The bullets hang off this same number, so moving a
  // headline takes its list with it instead of leaving it behind.
  function headY(scene) { return scene.headlineY == null ? 0.22 : scene.headlineY; }

  // Headline and bullets belong to the SCENE, not to one of the two kinds of
  // scene. They were drawn only for `stage` scenes, so an episode that wanted
  // a graphic AND a list had to choose, and a chapter that put a mark in the
  // corner lost it the moment a line needed bullets under it.
  function drawOverlay(scene, t) {
    drawHeadline(scene, t);
    (scene.bullets || []).forEach(function (b, i) {
      var a = fade(t, b.t, 0.4);          // each bullet's own second, likewise
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = scene.accent || FG;
      ctx.beginPath();
      ctx.arc(W * 0.09, H * (headY(scene) + 0.14 + i * 0.10) - H * 0.012, H * 0.011, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = FG;
      ctx.textAlign = "left";
      ctx.font = "500 " + Math.round(H * 0.048) + "px " + FONT;
      ctx.fillText(b.text, W * 0.13, H * (headY(scene) + 0.14 + i * 0.10));
      ctx.restore();
    });
  }

  function drawStageScene(scene, t) {
    drawOverlay(scene, t);
    window.EVCast.drawAll(ctx, scene, t, W, H);
  }

  function drawArtScene(scene, t) {
    var fn = window.EVArt && window.EVArt[scene.art];
    if (!fn) throw new Error("unknown art function: " + scene.art + " (scene " + scene.id + ")");
    fn(ctx, t, W, H, scene);
    drawOverlay(scene, t);
    window.EVCast.drawAll(ctx, scene, t, W, H);
  }

  window.EVStage = { init: init, renderFrame: renderFrame };
})();
