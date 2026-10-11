// The shape every episode's art.js follows: a browser IIFE that registers
// named draw functions on window.EVArt. The renderer injects this file into
// the page, and a scene names the function it wants with `art: '<name>'`.
(function () {
  "use strict";
  window.EVArt = Object.assign(window.EVArt || {}, {
    growingBar: function (ctx, t, W, H, scene) {
      var u = Math.max(0, Math.min(1, t / (scene.dur || 1)));
      ctx.fillStyle = scene.accent || "#FFD426";
      ctx.fillRect(W * 0.1, H * 0.45, W * 0.8 * u, H * 0.08);
    }
  });
})();
