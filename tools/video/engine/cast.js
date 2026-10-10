// Figure placement for video scenes. Filled in by Task 3; until then drawAll
// is a no-op so stage.js can call it unconditionally.
(function () {
  "use strict";
  if (window.EVCast && window.EVCast.drawAll) return;
  window.EVCast = { drawAll: function () {} };
})();
