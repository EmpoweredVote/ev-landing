// ───────────────────────────────────────────────────────────
// EV Landing — stick-figure inhabitants
// Overlays 14 tiny leremy-rig figures on the page: patrolling
// borders, sitting on cards, climbing edges, hanging off ropes.
// Requires leremy-rig.js (window.LeremyRig) loaded first.
// ───────────────────────────────────────────────────────────
(function () {
  if (window.__evFigures) return; window.__evFigures = true;

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function () {
    var R = window.LeremyRig;
    if (!R) return;
    var CFG = R.CFG, A = R.ANIMATIONS;
    var DPR = Math.min(1.5, window.devicePixelRatio || 1);
    var S = 0.32;                       // tiny-figure scale
    var FIG_H = 150;                    // canvas height for edge-standing figures

    // pointer tracking for hover reactions
    var mx = -1e4, my = -1e4;
    document.addEventListener('mousemove', function (ev) { mx = ev.clientX; my = ev.clientY; }, { passive: true });

    // when a hero tool is highlighted, the presenter Bobit points straight at THAT tool
    var featureOn = false, featureCX = 0, featureCY = 0;
    var logosWrap = document.querySelector('.showcase-logos');
    if (logosWrap) {
      var aimAt = function (el) { var r = el.getBoundingClientRect(); featureOn = true; featureCX = r.left + r.width / 2; featureCY = r.top + r.height / 2; };
      logosWrap.addEventListener('mouseleave', function () { featureOn = false; });
      logosWrap.addEventListener('focusout', function () { featureOn = false; });
      logosWrap.querySelectorAll('.logo-trigger').forEach(function (tr) {
        tr.addEventListener('mouseenter', function () { aimAt(tr); });
        tr.addEventListener('focus', function () { aimAt(tr); });
      });
    }

    // click to shove a rope Bobit / tip over a toddler
    document.addEventListener('click', function (ev) {
      entries.forEach(function (e) {
        // toddler: click him and he falls; the adult turns and throws up an arm
        if (e.spec.mode === 'patrol' && e.spec.toddler && e._toddSX != null && !e._fall && !e.greet) {
          if (Math.abs(ev.clientX - e._toddSX) < 42 && Math.abs(ev.clientY - e._toddSY) < 72) { e._fall = 4.5; return; }
        }
        // light-gag Bobit: click him and he waves briefly, then gets right back to work
        if (e.spec.mode === 'beam' && e.scene === 'light' && e._lgSX != null && !(e.lightWave > 0)) {
          if (Math.abs(ev.clientX - e._lgSX) < 42 && Math.abs(ev.clientY - e._lgSY) < 72) { e.lightWave = 1.4; return; }
        }
        // cartwheeler: click him → flag him; at the END of his next cartwheel he falls into a heap
        if (e.spec.mode === 'cartwheel' && e._cwSX != null && !e.cwHurt && (e.cw === 'walk' || e.cw === 'cwheel' || e.cw === 'stand' || e.cw === 'headshake')) {
          if (Math.abs(ev.clientX - e._cwSX) < 40 && Math.abs(ev.clientY - e._cwSY) < 84) { e.cwHurt = true; return; }
        }
        // dog-fetch: click the dog → he drops the ball & rolls over; click the owner → the mega throw
        if (e.spec.mode === 'dogfetch' && e._dogSX != null && !e.mega && !e.megaPending && !(e.dogRoll > 0)) {
          if (Math.abs(ev.clientX - e._dogSX) < 24 && Math.abs(ev.clientY - e._dogSY) < 34) {
            e.dogRoll = DOG_ROLL_SECS;
            if (e.bHeld === 'dog') { e.bHeld = 'ground'; e.bX = e.dogX; e.bY = e.h - 6 - 7; }   // drop what he was carrying
            return;
          }
          if (Math.abs(ev.clientX - e._thSX) < 34 && Math.abs(ev.clientY - e._thSY) < 72) {
            e.megaPending = true;   // he waits for the dog to bring the ball back, THEN hurls it off-screen
            return;
          }
        }
        // yo-yo: click the player → "walk the dog" (lets it to the floor, it rolls, then snaps back up)
        if (e.spec.mode === 'yoyo' && e._yoSX != null && e.yo === 'throw') {
          if (Math.abs(ev.clientX - e._yoSX) < 28 && Math.abs(ev.clientY - e._yoSY) < 60) { e.yo = 'wd_down'; e.yoT = 0; return; }
        }
        // kite: click the kite → a loop; click the flyer → the kite spins & falls, then he relaunches it
        if (e.spec.mode === 'kite' && e._kiteSX != null) {
          if (e.kt === 'fly' && Math.abs(ev.clientX - e._kiteSX) < 26 && Math.abs(ev.clientY - e._kiteSY) < 26) { e.kt = 'loop'; e.ktT = 0; return; }
          if ((e.kt === 'fly' || e.kt === 'loop') && Math.abs(ev.clientX - e._kgSX) < 28 && Math.abs(ev.clientY - e._kgSY) < 56) { e.kt = 'spin'; e.ktT = 0; return; }
        }
        // letter carriers (a beam-crew pass): click the v-carrier → v drops over his eyes; click the e-carrier → sets it down, waves, rolls it off
        if (e.spec.mode === 'beam' && e.scene === 'letters' && e._lFY != null) {
          if (e.vSt === 'walk' && Math.abs(ev.clientX - e._vSX) < 36 && ev.clientY > e._lFY - 104 && ev.clientY < e._lFY + 8) { e.vSt = 'fall'; e.vT = 0; return; }
          if (e.eSt === 'walk' && Math.abs(ev.clientX - e._eSX) < 36 && ev.clientY > e._lFY - 84 && ev.clientY < e._lFY + 8) { e.eSt = 'drop'; e.eT = 0; return; }
        }
        // phone-sitter: click him → pocket the phone (hang out); click again → take it back out
        if (e.spec.mode === 'seat' && e.spec.phone && e._phSX != null) {
          if (Math.abs(ev.clientX - e._phSX) < 40 && ev.clientY > e._phFY - 104 && ev.clientY < e._phFY + 8) {
            if (e.ph === 'absorbed') { e.ph = 'pocket'; e.phT = 0; }
            else if (e.ph === 'hangout') { e.ph = 'draw'; e.phT = 0; }
            return;   // ignore clicks landing mid-transition
          }
        }
        if (e.spec.mode !== 'rope' || !e.w || e._ropeSX == null) return;
        if (Math.abs(ev.clientX - e._ropeSX) > 55 || Math.abs(ev.clientY - e._ropeSY) > 82) return;
        if (e.rphase === 'sit') { e.rphase = 'break'; e.breakT = 0; return; }   // frame breaks out from under him
        if (e.rphase === 'hang') {
          var dir = ev.clientX > e._ropeSX ? 1 : -1;      // push away from the click
          e.vel = Math.max(-1.9, Math.min(1.9, (e.vel || 0) + dir * 1.6));   // capped so the swing stays in frame
          e.scramble = 1;                                 // startled — scrambles like he might fall
        }
      });
    }, { passive: true });

    function cssVar(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    // Brand-derived figure palettes — no hard red/blue.
    // Light mode: brighter, vivid set. Dark mode: the dark-theme brand variants.
    // 0 teal · 1 coral · 2 gold · 3 green · 4 purple · 5 orange — tuned per theme for legibility.
    // Light values are deep enough to read on the near-white bg (esp. the gold, ~3:1);
    // dark values are bright.
    var FIG_COLORS = {
      light: ['#007D99', '#FF5740', '#B8860B', '#2E9E5B', '#7A4FD0', '#E0641C'],
      dark:  ['#1DA8C6', '#FF6B52', '#FFD740', '#43D07E', '#B49BFF', '#FF9A4D']
    };
    function figColor(i) {
      var th = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      var pal = FIG_COLORS[th];
      return pal[i % pal.length];
    }

    // ---- broken-image fallbacks (brand assets not present in this preview copy) ----
    function imgFallback(img) {
      img.style.display = 'none';
      var banner = img.closest('.banner-logo, .ev-logo');
      if (banner && !banner.__fb) {
        banner.__fb = true;
        var sp = document.createElement('span');
        sp.textContent = 'EMPOWERED VOTE';
        sp.style.cssText = 'font-weight:800;letter-spacing:.14em;font-size:.95rem;color:var(--heading);white-space:nowrap;';
        banner.appendChild(sp);
      }
      var lt = img.closest('.logo-trigger');
      if (lt && !lt.querySelector('.wordmark') && !lt.__fb) {
        lt.__fb = true;
        var w = document.createElement('span');
        w.className = 'wordmark';
        w.textContent = img.alt || '';
        lt.appendChild(w);
      }
    }
    document.querySelectorAll('img').forEach(function (img) {
      if (img.complete && img.naturalWidth === 0 && img.src) imgFallback(img);
      else img.addEventListener('error', function () { imgFallback(img); });
    });

    // ---- figure specs ----
    // ── Randomized casting: each page load staffs every section from a pool,
    //    so you get a different batch of Bobits every visit. ──
    // tone: 0 = teal/blue · 1 = coral/red · 2 = marigold/yellow
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function chance(p) { return Math.random() < p; }
    var GAITS = ['stroll', 'strut', 'sneak', 'trudge', 'shuffle'];   // no stiff march / frantic scurry in the rotation
    var GSPEED = { stroll: 32, strut: 40, scurry: 62, march: 34, sneak: 22, trudge: 16, shuffle: 20 };
    var IDLES = ['bored', 'standstill', 'present', 'paddleball'];
    var SEATS = ['sit', 'read'];
    var TONES = [0, 1, 2, 3, 4, 5];   // full palette (teal/coral/gold/green/purple/orange)
    // ── colour-diversity safeguard: hand out tones from a shuffled bag rather than i.i.d. random,
    //    so we never get a page of four coral clones. Every 6 draws touches all 6 colours once;
    //    on refill we avoid repeating the last tone across the seam. ──
    var _toneBag = [], _lastTone = null;
    var _pairCast = false;   // at most one paddleball couple per page
    var _yoyoCast = false;   // at most one yo-yo player per page
    // pick a tone that's distinctly different in hue from `base` (for props that must read as a separate colour)
    var _nearHue = { 0: [0, 3], 1: [1, 5], 2: [2, 5], 3: [3, 0], 4: [4], 5: [5, 1, 2] };
    function contrastTone(base) {
      var pool = TONES.filter(function (x) { return (_nearHue[base] || [base]).indexOf(x) < 0; });
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function takeTone() {
      if (!_toneBag.length) {
        var t = TONES.slice();
        for (var i = t.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = t[i]; t[i] = t[j]; t[j] = tmp; }
        if (t[0] === _lastTone && t.length > 1) t.push(t.shift());
        _toneBag = t;
      }
      _lastTone = _toneBag.shift();
      return _lastTone;
    }

    function walker(anchor, opt) {
      opt = opt || {};
      var withTot = opt.allowToddler && chance(0.5);
      var g = withTot ? pick(['stroll', 'shuffle']) : pick(GAITS);   // gentle gait when escorting a toddler
      var s = { mode: 'patrol', anchor: anchor, edge: 'top', anim: g, speed: withTot ? 12 : GSPEED[g], tone: (opt.tone != null ? opt.tone : takeTone()) };
      if (withTot) { s.toddler = true; s.toddlerTone = takeTone(); s.toddlerStyle = pick(['waddle', 'march']); }
      return s;
    }
    // one figure (or none) for a note-card top edge — biased toward readers/sitters for a calmer, more varied cast
    function noteSlot(anchor, opt) {
      opt = opt || {};
      var seat = function () {
        var s = { mode: 'seat', anchor: anchor, edge: 'top', x: pick([0.14, 0.5, 0.82]), anim: pick(SEATS), tone: (opt.seatTone != null ? opt.seatTone : takeTone()) };
        if (chance(0.4)) { s.phone = true; s.anim = 'sit'; }   // ~some sitters are glued to a phone (click to pocket / re-absorb)
        return s;
      };
      var r = Math.random();
      if (r < 0.12 && !_pairCast) { _pairCast = true; return { mode: 'paddlepair', anchor: anchor, edge: 'top', x: pick([0.32, 0.5, 0.68]), tone: takeTone(), tone2: takeTone() }; }  // one couple per page, max
      if (r < 0.20 && !_yoyoCast) { _yoyoCast = true; var yb = takeTone(); return { mode: 'yoyo', anchor: anchor, edge: 'top', x: pick([0.24, 0.5, 0.76]), tone: yb, tone2: contrastTone(yb) }; }  // one yo-yo player per page, max
      if (r < 0.54) return seat();                       // most common: a reader or sitter
      if (r < 0.82) return walker(anchor, opt);
      if (r < 0.92) return { mode: 'stand', anchor: anchor, edge: 'top', x: pick([0.2, 0.5, 0.8]), anim: pick(IDLES), tone: takeTone() };
      return opt.always ? seat() : null;                 // 'always' anchors fall back to a reader, not empty
    }

    function buildCast() {
      var out = [];
      _pairCast = false; _yoyoCast = false;
      var add = function (s) { if (s) out.push(s); };
      add({ mode: 'beam', anchor: '.hero', edge: 'bottom', tone: 0 });                                    // hero crew — always
      add({ mode: 'stand', anchor: '.hero .meta-row', edge: 'top', x: 0.9, anim: 'present', tone: 4, presenter: true });  // proud host under the logo — purple, so he's distinct from the blue beam crew
      add({ mode: 'why', anchor: '.why-grid .why-item:nth-of-type(1) .why-icon', anim: 'spent', color: '--yellow' });       // fixed (content)
      add({ mode: 'why', anchor: '.why-grid .why-item:nth-of-type(2) .why-icon', anim: 'notlistening', color: '--teal' });
      add({ mode: 'why', anchor: '.why-grid .why-item:nth-of-type(3) .why-icon', anim: 'witsend', color: '--coral' });
      // Note 1 always hosts a Bobit; occasionally the right spot is a kite-flyer instead
      if (chance(0.25)) {
        var kg = takeTone();                                                          // flyer's colour
        var kk = contrastTone(kg);                                                     // kite: a distinctly different colour
        add({ mode: 'kite', anchor: '.note.n-alpha', edge: 'top', x: 0.72, tone: kg, tone2: kk });
      } else add(noteSlot('.note.n-alpha', { allowToddler: true, always: true }));
      add(noteSlot('.note.n-ai', {}));
      // Note 2 (n-team): the one-foot balancer — hover him for the wave → windmill → collapse routine
      add({ mode: 'stand', anchor: '.note.n-team', edge: 'top', x: 0.5, balance: true, tone: takeTone() });
      add(noteSlot('.note.n-money', {}));
      // watch top (the 02/How-we-work ↔ 03/Talks split) — was getting crowded with samey walkers;
      // keep only the distinctive elder here, and often leave the split clear
      if (chance(0.4)) add({ mode: 'patrol', anchor: 'section.watch', edge: 'top', anim: 'elder', speed: 15, tone: takeTone(), hoverAnim: 'elderangry' });
      // watch thumbnail corner — peeker, idler, or hover-jumper
      var pr = Math.random(), pk = { mode: 'stand', anchor: '.watch-grid .watch-card:nth-of-type(2) .watch-thumb', edge: 'top', x: 0.96, tone: takeTone() };
      if (pr < 0.6) { pk.peeker = true; pk.anim = 'standstill'; }  // stands straight; looks over the edge only when something passes/collapses below
      else { pk.anim = pick(IDLES); }                             // idle (hover: wave). Only the footer stander jumps.
      add(pk);
      if (chance(0.85)) add({ mode: 'rope', anchor: '.watch-grid .watch-card:nth-of-type(3) .watch-thumb', tone: takeTone() });
      // footer — usually the meet-and-greet pair; occasionally a cartwheel practicer + a
      // corner Bobit medic, or a Bobit playing fetch with his dog (each a wide combined canvas)
      var fr = Math.random();
      if (fr < 0.26) {
        add({ mode: 'cartwheel', anchor: 'footer', edge: 'top', tone: 0, tone2: 1 });
      } else if (fr < 0.50) {
        add({ mode: 'dogfetch', anchor: 'footer', edge: 'top', tone: 0, tone2: 5 });   // teal owner, orange pup
      } else {
        add(walker('footer', { tone: 0 }));
        add({ mode: 'stand', anchor: 'footer', edge: 'top', x: 0.06, anim: pick(['standstill', 'bored']), hover: 'jump', tone: 1 });
      }
      return out;
    }

    var SPECS = buildCast();

    var entries = [];
    var ci = 0;
    SPECS.forEach(function (spec, i) {
      var el = document.querySelector(spec.anchor);
      if (!el) return;
      var c = document.createElement('canvas');
      c.style.cssText = 'position:absolute;pointer-events:none;z-index:60;';
      if (spec.mode === 'why') {
        c.style.position = 'static';
        var img = el.querySelector('img'); if (img) img.style.display = 'none';
        el.style.height = 'auto';
        el.appendChild(c);
      } else if (spec.mode === 'banner') {
        c.style.cssText = 'position:absolute;left:26%;margin-left:-60px;bottom:-30px;pointer-events:none;z-index:5;';
        el.appendChild(c);
      } else {
        document.body.appendChild(c);
      }
      // per-figure wave variation: alternating hand + a spread of speeds (so waves aren't uniform)
      var wv = { hand: (i % 2 === 0 ? 'R' : 'L'), hz: 1.25 + (i % 4) * 0.28 };
      entries.push({ spec: spec, el: el, c: c, ctx: c.getContext('2d'), phase: i * 2.13, w: 0, h: 0, ci: (spec.mode === 'why' ? 0 : ci++), lt: 0, greet: 0, linger: 0, _wave: wv });
    });

    // footer pair: the strolling Bobit greets the standing one when he walks up
    var footWalk = null, footStand = null;
    entries.forEach(function (e) {
      if (e.spec.anchor === 'footer' && e.spec.mode === 'patrol') footWalk = e;
      if (e.spec.anchor === 'footer' && e.spec.mode === 'stand') footStand = e;
    });

    function smooth01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
    // blend two rig poses field-by-field (both come from clone(REST) so they share keys) — for organic pose transitions
    function lerpPose(a, b, k) {
      var out = {};
      for (var key in a) out[key] = (typeof a[key] === 'number' && typeof b[key] === 'number') ? a[key] + (b[key] - a[key]) * k : a[key];
      for (var kb in b) if (!(kb in out)) out[kb] = b[kb];
      return out;
    }
    var BEAM_LOADS = ['circle', 'line'];   // the ball and the yellow line (no notched triangle); beamPick avoids repeats

    function sizeCanvas(e, w, h) {
      if (e.w !== w || e.h !== h) {
        e.w = w; e.h = h;
        e.c.width = Math.round(w * DPR); e.c.height = Math.round(h * DPR);
        e.c.style.width = w + 'px'; e.c.style.height = h + 'px';
      }
      e.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function reposition() {
      var sy = window.scrollY || window.pageYOffset;
      var sx = window.scrollX || window.pageXOffset;
      entries.forEach(function (e) {
        var spec = e.spec;
        if (spec.mode === 'why') { sizeCanvas(e, 190, 215); return; }
        if (spec.mode === 'banner') { sizeCanvas(e, 120, 96); return; }
        if (spec.mode === 'crosser') { sizeCanvas(e, window.innerWidth, 110); return; }
        var r = e.el.getBoundingClientRect();
        if (spec.mode === 'vclimb') {
          var h = Math.min(300, Math.max(200, r.height));
          var wV = 150;
          sizeCanvas(e, wV, h);
          var leftV = r.right + sx - wV / 2;                                  // centered on the note's right edge
          var maxLeftV = sx + document.documentElement.clientWidth - wV - 4;  // but never past the viewport (no h-scroll)
          if (leftV > maxLeftV) leftV = maxLeftV;
          e.c.style.left = leftV + 'px';
          e.c.style.top = (r.top + sy + (r.height - h) / 2) + 'px';
          return;
        }
        if (spec.mode === 'rope') {
          var wR = 350;                                                       // room for the frame bar + long swing
          sizeCanvas(e, wR, 300);
          var leftR = r.right + sx - 220;                                     // pivot (x=250) ~30px right of the video edge (over the chasm)
          var maxLeftR = sx + document.documentElement.clientWidth - wR - 4;  // never past the viewport (no h-scroll)
          if (leftR > maxLeftR) leftR = maxLeftR;
          if (leftR < sx + 4) leftR = sx + 4;
          e.c.style.left = leftR + 'px';
          // the frame bar (canvas y=46) should hang level with the short "03 / Talks" section bar, not on the video
          if (!e._barEl) e._barEl = document.querySelector('.watch .section-num .bar');
          var barTopY = e._barEl ? (e._barEl.getBoundingClientRect().top + sy) : (r.top + sy - 44);
          e.c.style.top = (barTopY - 46 + 1) + 'px';                          // +1 centers the 2px section bar
          return;
        }
        if (spec.mode === 'paddlepair') {
          var wPP = 250; sizeCanvas(e, wPP, FIG_H);   // wide enough for two players + a lob between them
          var edgeYPP = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          e.c.style.left = (r.left + sx + r.width * spec.x - wPP / 2) + 'px';
          e.c.style.top = (edgeYPP - (FIG_H - 6)) + 'px';
          return;
        }
        if (spec.mode === 'cartwheel') {
          var hCW = 180, wCW = Math.max(360, r.width); sizeCanvas(e, wCW, hCW);   // full-width + headroom for the spin
          var edgeYCW = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          e.c.style.left = (r.left + sx) + 'px';
          e.c.style.top = (edgeYCW - (hCW - 6)) + 'px';
          return;
        }
        if (spec.mode === 'dogfetch') {
          var hDF = 180, wDF = Math.max(360, r.width); sizeCanvas(e, wDF, hDF);   // full-width so the throw can clear the edge
          var edgeYDF = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          e.c.style.left = (r.left + sx) + 'px';
          e.c.style.top = (edgeYDF - (hDF - 6)) + 'px';
          return;
        }
        if (spec.mode === 'kite') {
          var wKt = 340, hKt = 350; sizeCanvas(e, wKt, hKt);   // tall + wide so the kite has plenty of sky up-and-downwind
          var edgeYKt = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          var leftKt = r.left + sx + r.width * spec.x - 70;                    // flyer (gx0=70) sits at spec.x; kite reaches up-right
          var maxLeftKt = sx + document.documentElement.clientWidth - wKt - 4; // never past the viewport (no h-scroll)
          if (leftKt > maxLeftKt) leftKt = maxLeftKt;
          if (leftKt < sx + 4) leftKt = sx + 4;
          e.c.style.left = leftKt + 'px';
          e.c.style.top = (edgeYKt - (hKt - 6)) + 'px';
          return;
        }
        if (spec.mode === 'yoyo') {
          var wYo = 210; sizeCanvas(e, wYo, FIG_H);                            // extra width so the "walk the dog" roll has floor to travel
          var edgeYYo = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          var leftYo = r.left + sx + r.width * spec.x - 70;                    // player (gx0=70) sits at spec.x; yo-yo rolls to his right
          var maxLeftYo = sx + document.documentElement.clientWidth - wYo - 4; // never past the viewport (no h-scroll)
          if (leftYo > maxLeftYo) leftYo = maxLeftYo;
          if (leftYo < sx + 4) leftYo = sx + 4;
          e.c.style.left = leftYo + 'px';
          e.c.style.top = (edgeYYo - (FIG_H - 6)) + 'px';
          return;
        }
        if (spec.mode === 'seat') {
          // taller canvas + seat line 42px above the bottom so dangling shins clear the edge
          var hSe = 180;
          sizeCanvas(e, 190, hSe);
          var edgeYSe = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
          e.c.style.left = (r.left + sx + r.width * spec.x - 95) + 'px';
          e.c.style.top = (edgeYSe - (hSe - 42)) + 'px';
          return;
        }
        var full = (spec.mode === 'beam' || spec.mode === 'patrol');
        var w = full ? Math.max(300, r.width) : 190;
        sizeCanvas(e, w, FIG_H);
        var edgeY = (spec.edge === 'bottom' ? r.bottom : r.top) + sy;
        var left = full ? (r.left + sx) : (r.left + sx + r.width * spec.x - w / 2);
        e.c.style.left = left + 'px';
        e.c.style.top = (edgeY - (FIG_H - 6)) + 'px';
      });
    }

    function drawFig(ctx, x, y, s, flip, pose, opts) {
      ctx.save();
      ctx.translate(x, y);
      if (opts && opts.rot) ctx.rotate(opts.rot);   // whole-figure spin (cartwheels) / tip-over (heap)
      ctx.scale(flip ? -s : s, s);
      var j = R.computePose(pose, CFG, { x: 0, y: 0 });
      R.draw(ctx, j, CFG, opts);
      ctx.restore();
    }

    // ── "the light went out" gag (runs in the beam rotation instead of a two-carry pass):
    //    the 501(c)(3) yellow swatch flickers and dies → a lone Bobit walks in, notices it,
    //    runs off, runs back with a fresh yellow box, screws it back in (light on), looks
    //    around, and keeps walking off. Click him → a quick wave, then back to work. ──
    function startLight(e, w) {
      e.scene = 'light';
      e.lp = 'out'; e.lt2 = 0; e.lgLit = false; e.lightWave = 0;
      e.lgDir = 1;                                  // enters from the left (nearest the left-side 501(c)(3) swatch)
      e.lgX = -46;                                 // starts off-screen
      e.lgFace = e.lgDir;
    }
    function runLightGag(e, ctx, w, h, feetY, tt, col, shadow, cr, dt) {
      if (!('_swatchEl' in e)) e._swatchEl = document.querySelector('.hero .meta-row .swatch.s-yellow');
      var sw = e._swatchEl;
      var swX = w * 0.28, swY = 63;                                     // fallback if the swatch can't be measured
      if (sw) { var rr = sw.getBoundingClientRect(); swX = rr.left + rr.width / 2 - cr.left; swY = rr.top + rr.height / 2 - cr.top; }
      var YEL = cssVar('--yellow', '#FED12E'), OFF = '#6E7681';         // lit vs dead-bulb grey
      var speedWalk = 104, speedRun = 150, stopX = swX;   // slower run so the feet don't slide during the box swap
      var pose = null, carryBox = false, boxRise = 0, swOn = e.lgLit, flip = e.lgFace < 0;

      if (e.lightWave > 0 && e.lp !== 'out') {
        e.lightWave -= dt;                                             // clicked: brief wave, position & phase frozen
        pose = A.greet.frame(1.4 - e.lightWave, e._wave); flip = false;
        carryBox = (e.lp === 'runback' || e.lp === 'install');
      } else {
        switch (e.lp) {
          case 'out': {
            e.lt2 += dt; var ft = e.lt2, on = true, flk = [0.12, 0.20, 0.26, 0.42, 0.48, 0.70];
            for (var i = 0; i < flk.length; i++) if (ft > flk[i]) on = !on;      // dying-bulb flicker,
            swOn = ft > 0.72 ? false : on;                                        // then goes dark
            if (ft > 1.5) { e.lp = 'walkin'; e.lt2 = 0; }
            break;
          }
          case 'walkin':
            e.lgX += e.lgDir * speedWalk * dt; e.lgFace = e.lgDir; flip = e.lgDir < 0; pose = A.stroll.frame(tt);
            if ((e.lgDir > 0 && e.lgX >= stopX) || (e.lgDir < 0 && e.lgX <= stopX)) { e.lgX = stopX; e.lp = 'notice'; e.lt2 = 0; }
            break;
          case 'notice': {
            e.lt2 += dt; flip = e.lgFace < 0; var nt = e.lt2;
            if (nt < 0.9) {                                                        // stops and notices the dead light
              pose = A.presentup.frame(nt);
            } else if (nt < 1.7) {                                                 // leans in to inspect it
              var li = smooth01((nt - 0.9) / 0.55);
              pose = Object.assign({}, R.REST);
              pose.lean = -12 * li; pose.hunch = -16 * li; pose.headTilt = -20 * li;
              pose.armRU = 28 + 16 * li; pose.armRF = 18; pose.armLU = -18; pose.armLF = -10;
            } else if (nt < 2.7) {                                                 // shakes his head — no good
              var st = nt - 1.7;
              pose = Object.assign({}, R.REST);
              pose.lean = -4; pose.hunch = -6;
              pose.headTilt = Math.sin(st * 2 * Math.PI * (2 / 1.0)) * 18;         // ~2 slow shakes
              pose.armRU = 16; pose.armRF = 8; pose.armLU = -16; pose.armLF = -8;
            } else { e.lp = 'runoff'; e.lt2 = 0; }
            break;
          }
          case 'runoff': {
            e.lgX -= e.lgDir * speedRun * dt; e.lgFace = -e.lgDir; flip = -e.lgDir < 0; pose = A.scurry.frame(tt);
            var off = e.lgDir > 0 ? (e.lgX < -46) : (e.lgX > w + 46);
            if (off) { e.lp = 'runback'; e.lt2 = 0; }
            break;
          }
          case 'runback':
            e.lgX += e.lgDir * speedRun * dt; e.lgFace = e.lgDir; flip = e.lgDir < 0; pose = A.scurry.frame(tt); carryBox = true;
            if ((e.lgDir > 0 && e.lgX >= stopX) || (e.lgDir < 0 && e.lgX <= stopX)) { e.lgX = stopX; e.lp = 'install'; e.lt2 = 0; }
            break;
          case 'install': {
            e.lt2 += dt; pose = A.presentup.frame(e.lt2); flip = e.lgFace < 0;
            var p = smooth01(e.lt2 / 0.9); carryBox = true; boxRise = p;          // box rises from his hands to the swatch
            if (e.lt2 > 0.9) { var since = e.lt2 - 0.9; if (since > 0.22) e.lgLit = true; swOn = e.lgLit || (Math.floor(since * 22) % 2 === 0); }
            else swOn = false;
            if (e.lt2 > 1.6) { e.lp = 'lookaround'; e.lt2 = 0; }
            break;
          }
          case 'lookaround':
            e.lt2 += dt; pose = A.confused.frame(e.lt2); flip = e.lgFace < 0; swOn = true;   // stops, looks around
            if (e.lt2 > 1.3) { e.lp = 'walkoff'; e.lt2 = 0; }
            break;
          case 'walkoff': {
            e.lgX += e.lgDir * speedWalk * dt; e.lgFace = e.lgDir; flip = e.lgDir < 0; pose = A.stroll.frame(tt); swOn = true;
            var gone = e.lgDir > 0 ? (e.lgX > w + 46) : (e.lgX < -46);
            if (gone) {                                                           // done — hand back; next pass is anything but the light again
              if (sw) sw.style.background = YEL;
              e.dir = e.lgDir; beamPick(e, w);
              return;
            }
            break;
          }
        }
      }

      if (sw) sw.style.background = swOn ? YEL : OFF;

      if (pose) {
        R.drawShadow(ctx, e.lgX, feetY, 15, shadow);
        drawFig(ctx, e.lgX, feetY - 112 * S, S, flip, pose, { color: col });
        if (carryBox) {
          var bx0 = e.lgX + e.lgFace * 12, by0 = feetY - 44;                      // box in his hands, then lofted to the swatch
          var bxX = bx0 + (swX - bx0) * boxRise, bxY = by0 + (swY - by0) * boxRise, bs = 12;
          ctx.fillStyle = YEL; ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(bxX - bs / 2, bxY - bs / 2, bs, bs, 2); else ctx.rect(bxX - bs / 2, bxY - bs / 2, bs, bs);
          ctx.fill();
        }
        e._lgSX = cr.left + e.lgX; e._lgSY = cr.top + feetY - 20;
      } else {
        e._lgSX = null;
      }
    }

    // ── paddleball RALLY: two Bobits face each other and volley one ball back and forth —
    //    a few bounces on a paddle, then a lob across to the partner, who catches and returns.
    //    Click a player → he stops, waves at you, misses; the ball drops & bounces on the ground;
    //    he then walks over, picks it up, walks back, and the rally resumes. ──
    function drawPaddlePair(e, ctx, w, h, feetY, tt, colA, colB, shadow, dt, cr) {
      var cxc = w / 2, gap = 108;
      var xL = cxc - gap / 2, xR = cxc + gap / 2;
      var baseY = feetY - 112 * S, groundBallY = feetY - 6;
      var bounceDur = 0.4, bouncesPerTurn = 2, tossDur = 0.55, bounceA = 20, arcH = 46;
      if (!e.rl) { e.rl = 'bounceL'; e.rlT = 0; }
      // expose figure positions for click hit-testing (home spots)
      e._ppSXL = cr.left + xL; e._ppSXR = cr.left + xR; e._ppSY = cr.top + feetY - 22;
      // the paddle is at the actual hand joint (computed from the pose), not a fixed offset
      var handAt = function (pose, fx, flip) { var j = R.computePose(pose, CFG, { x: 0, y: 0 }); return { x: fx + (flip ? -S : S) * j.hR.x, y: baseY + S * j.hR.y }; };
      var drawPaddle = function (hx, hy, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(hx, hy, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); };
      var drawBall = function (x, y) { ctx.fillStyle = figColor(2); ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); };

      // hover (canvas is pointer-events:none, so use the shared pointer position, like other reactions)
      var overL = mx > cr.left + xL - 30 && mx < cr.left + xL + 30 && my > cr.top + feetY - 84 && my < cr.top + feetY + 8;
      var overR = mx > cr.left + xR - 30 && mx < cr.left + xR + 30 && my > cr.top + feetY - 84 && my < cr.top + feetY + 8;
      e.hoverSide = overL ? 'L' : (overR ? 'R' : null);
      // a hovered player lowers his paddle to wave — so if the ball reaches HIS side, it drops
      if (e.rl !== 'miss' && e.rl !== 'retrieve' && ((e.rl === 'bounceL' && e.hoverSide === 'L') || (e.rl === 'bounceR' && e.hoverSide === 'R'))) {
        e.missSide = e.hoverSide; e.rl = 'miss'; e.missT = 0; e.mvy = 0;
        e.mballX = (e._ballX != null ? e._ballX : (e.hoverSide === 'L' ? xL : xR)); e.mballY = (e._ballY != null ? e._ballY : feetY - 60);
      }

      // ── the waving player let it drop → it bounces, then he fetches it and resumes ──
      if (e.rl === 'miss' || e.rl === 'retrieve') {
        var isL = e.missSide === 'L';
        var homeX = isL ? xL : xR, otherX = isL ? xR : xL;
        var missCol = isL ? colA : colB, otherCol = isL ? colB : colA, otherFlip = isL;
        // the OTHER player reacts to the drop: lowers his paddle and throws his far hand out to
        // the side ("what's up?"), then eases back to a ready paddle as his partner fetches it
        var wu = Object.assign({}, R.REST); wu.armRU = 40; wu.armRF = 26; wu.armLU = -56; wu.armLF = -50; wu.hunch = -6; wu.headTilt = -12 + Math.sin(e.missT * 3) * 2; wu.lean = -2; wu.bob = 1;
        var otherPose;
        if (e.rl === 'miss') { e.owT = 0; otherPose = wu; }
        else { e.owT = (e.owT || 0) + dt; otherPose = lerpPose(wu, A.paddleball.frame(0.34), Math.min(1, e.owT / 0.4)); }
        var oHand = handAt(otherPose, otherX, otherFlip);
        var drawOther = function () { R.drawShadow(ctx, otherX, feetY, 14, shadow); drawFig(ctx, otherX, baseY, S, otherFlip, otherPose, { color: otherCol }); drawPaddle(oHand.x, oHand.y, otherCol); };

        if (e.rl === 'miss') {
          e.missT += dt;
          e.mvy = (e.mvy || 0) + 1200 * dt; e.mballY += e.mvy * dt;                 // gravity
          if (e.mballY > groundBallY) { e.mballY = groundBallY; e.mvy = -e.mvy * 0.5; }   // bounce, damped
          R.drawShadow(ctx, homeX, feetY, 14, shadow);
          drawFig(ctx, homeX, baseY, S, false, A.greet.frame(e.missT, e._wave), { color: missCol });   // happily waving at us
          drawOther();
          drawBall(e.mballX, e.mballY);
          if (e.missT > 1.9 && Math.abs(e.mvy) < 45 && e.mballY >= groundBallY - 1) { e.rl = 'retrieve'; e.retStep = 'togo'; e.retX = homeX; e.retT = 0; }
          return;
        }
        // retrieve: walk to the ball, pick it up, walk home, resume
        var retSpeed = 120;
        if (e.retStep === 'togo') {
          var d1 = e.mballX > e.retX ? 1 : -1; e.retX += d1 * retSpeed * dt;
          if ((d1 > 0 && e.retX >= e.mballX) || (d1 < 0 && e.retX <= e.mballX)) { e.retX = e.mballX; e.retStep = 'pick'; e.retT = 0; }
          R.drawShadow(ctx, e.retX, feetY, 14, shadow); drawFig(ctx, e.retX, baseY, S, d1 < 0, A.stroll.frame(tt), { color: missCol });
          drawOther(); drawBall(e.mballX, groundBallY);
        } else if (e.retStep === 'pick') {
          e.retT += dt;
          R.drawShadow(ctx, e.retX, feetY, 14, shadow); drawFig(ctx, e.retX, baseY, S, false, A.heave.frame(e.retT), { color: missCol });
          drawOther(); drawBall(e.mballX, groundBallY);                              // ball on the ground until grabbed
          if (e.retT > 1.15) { e.retStep = 'back'; }
        } else {   // back — carry the ball home in hand
          var d2 = homeX > e.retX ? 1 : -1; e.retX += d2 * retSpeed * dt;
          var wpb = A.stroll.frame(tt); R.drawShadow(ctx, e.retX, feetY, 14, shadow); drawFig(ctx, e.retX, baseY, S, d2 < 0, wpb, { color: missCol });
          drawOther();
          var chand = handAt(wpb, e.retX, d2 < 0); drawBall(chand.x, chand.y);
          if ((d2 > 0 && e.retX >= homeX) || (d2 < 0 && e.retX <= homeX)) { e.rl = isL ? 'bounceL' : 'bounceR'; e.rlT = 0; e.missT = 0; e.mvy = 0; }
        }
        return;
      }

      // ── normal rally (a hovered player lowers his paddle to wave; the other keeps playing) ──
      e.rlT += dt;
      var activeL = e.rl === 'bounceL', activeR = e.rl === 'bounceR';
      var padL = A.paddleball.frame(activeL ? tt : 0.34), padR = A.paddleball.frame(activeR ? tt : 0.34);
      var handL = handAt(padL, xL, false), handR = handAt(padR, xR, true);
      var ballX, ballY;
      switch (e.rl) {
        case 'bounceL':
          ballX = handL.x; ballY = handL.y - 8 - bounceA * Math.abs(Math.sin(Math.PI * e.rlT / bounceDur));
          if (e.rlT >= bouncesPerTurn * bounceDur) { e.rl = 'tossLR'; e.rlT = 0; }
          break;
        case 'tossLR': {
          var p = Math.min(1, e.rlT / tossDur);
          ballX = handL.x + (handR.x - handL.x) * p; ballY = (handL.y - 8) + (handR.y - handL.y) * p - arcH * Math.sin(Math.PI * p);
          if (e.rlT >= tossDur) { e.rl = 'bounceR'; e.rlT = 0; }
          break;
        }
        case 'bounceR':
          ballX = handR.x; ballY = handR.y - 8 - bounceA * Math.abs(Math.sin(Math.PI * e.rlT / bounceDur));
          if (e.rlT >= bouncesPerTurn * bounceDur) { e.rl = 'tossRL'; e.rlT = 0; }
          break;
        case 'tossRL': {
          var pr = Math.min(1, e.rlT / tossDur);
          ballX = handR.x + (handL.x - handR.x) * pr; ballY = (handR.y - 8) + (handL.y - handR.y) * pr - arcH * Math.sin(Math.PI * pr);
          if (e.rlT >= tossDur) { e.rl = 'bounceL'; e.rlT = 0; }
          break;
        }
      }
      R.drawShadow(ctx, xL, feetY, 14, shadow); R.drawShadow(ctx, xR, feetY, 14, shadow);
      var figL = e.hoverSide === 'L' ? A.greet.frame(tt, e._wave) : padL;   // hovered → wave (faces viewer)
      var figR = e.hoverSide === 'R' ? A.greet.frame(tt, e._wave) : padR;
      drawFig(ctx, xL, baseY, S, false, figL, { color: colA });
      drawFig(ctx, xR, baseY, S, e.hoverSide === 'R' ? false : true, figR, { color: colB });
      if (e.hoverSide !== 'L') drawPaddle(handL.x, handL.y, colA);
      if (e.hoverSide !== 'R') drawPaddle(handR.x, handR.y, colB);
      drawBall(ballX, ballY);
      e._ballX = ballX; e._ballY = ballY;   // remembered so a hover-drop starts from here
    }

    // ── CARTWHEEL scene (occasionally replaces the footer meet pair): one Bobit walks around
    //    and throws in the odd cartwheel; click him → he's flagged, and at the END of his next
    //    cartwheel he collapses into a heap (~10s wriggle), then gets up and shakes it off. On
    //    the spill the corner Bobit runs over and kneels by him; rises when he rises; and when
    //    he starts wheeling again, throws up his hands and trudges back to his corner. ──
    var HEAP_SECS = 10;
    function cwStar() { var p = A.standstill.frame(0); p.hunch = 0; p.bob = 0; p.headTilt = 0; p.armRU = 142; p.armRF = 150; p.armLU = -142; p.armLF = -150; p.legRU = 30; p.legRF = 26; p.legLU = -30; p.legLF = -26; return p; }
    function cwHeap(t) { var p = A.standstill.frame(0); var wr = Math.sin(t * 7) * 4, wr2 = Math.sin(t * 5.3 + 1) * 5; p.hunch = -46 + wr; p.bob = 10; p.lean = 6 + wr2; p.headTilt = -22 + wr; p.legRU = 66 + Math.sin(t * 6) * 12; p.legRF = -38; p.legLU = 58 + wr2; p.legLF = -32; p.armRU = 52 + Math.sin(t * 8) * 14; p.armRF = 40; p.armLU = -56; p.armLF = -38 + wr; return p; }
    // crouched over the fallen one — knelt low, one arm reaching in. Drawn with a y-offset so it sits on the ground.
    var KNEEL_YOFF = 18;
    function cwKneel(t) { var p = A.standstill.frame(0); p.bob = 6 + Math.sin(t * 2) * 1.2; p.hunch = -34; p.lean = 8; p.headTilt = -10; p.legRU = 84; p.legRF = -78; p.legLU = -70; p.legLF = 66; p.armRU = 56; p.armRF = 66; p.armLU = -34; p.armLF = -26; return p; }
    function cwFrust(t) { var p = A.standstill.frame(0); p.armRU = 166; p.armRF = 172; p.armLU = -166; p.armLF = -172; p.headTilt = Math.sin(t * 9) * 7; p.lean = -3; p.bob = Math.sin(t * 4) * 2; return p; }
    function drawCartwheel(e, ctx, w, h, feetY, tt, colA, colB, shadow, dt, cr) {
      var baseY = feetY - 112 * S, cornerX = 46, roamL = 128, roamR = w - 74;
      var lieRot = 80 * Math.PI / 180, lieY = (feetY - 14) - baseY;
      if (e.cw == null) { e.cw = 'stand'; e.cwT = 0; e.cwX = w * 0.5; e.cwDir = -1; e.cwX0 = e.cwX; e.hp = 'corner'; e.hpX = cornerX; e.hpT = 0; }
      e._cwSX = cr.left + e.cwX; e._cwSY = cr.top + feetY - 24;

      // ---- cartwheeler ----
      var cwPose, cwRot = 0, cwYoff = 0, cwFlip = e.cwDir < 0;
      switch (e.cw) {
        case 'stand':
          e.cwT += dt; cwPose = A.standstill.frame(tt);
          if (e.cwT > 0.5) {   // brief pause, then head off at a brisk walk
            if (e.cwX <= roamL) e.cwDir = 1; else if (e.cwX >= roamR) e.cwDir = -1; else if (Math.sin(e.cwX * 12.9) > 0.6) e.cwDir = -e.cwDir;
            e.cw = 'walk'; e.cwT = 0; e.cwWalk = 1.6 + (Math.sin(e.cwX * 3.1) + 1) * 1.1;   // walk 1.6–3.8s before the next move
          }
          break;
        case 'walk':
          e.cwT += dt; e.cwX += e.cwDir * 50 * dt; cwFlip = e.cwDir < 0; cwPose = A.strut.frame(tt);
          if (e.cwX <= roamL) { e.cwX = roamL; e.cwDir = 1; } else if (e.cwX >= roamR) { e.cwX = roamR; e.cwDir = -1; }
          if (e.cwT > e.cwWalk) {
            if (e.cwHurt || Math.sin(e.cwX * 7.7) > -0.3) {   // usually punctuate the walk with a cartwheel (always, if flagged, so he can fall out of it)
              if (e.cwX + e.cwDir * 96 > roamR) e.cwDir = -1; else if (e.cwX + e.cwDir * 96 < roamL) e.cwDir = 1;   // keep the wheel in-bounds
              e.cw = 'cwheel'; e.cwT = 0; e.cwX0 = e.cwX;
            } else { e.cw = 'stand'; e.cwT = 0; }   // …otherwise just pause and turn
          }
          break;
        case 'cwheel': {
          e.cwT += dt; var pc = Math.min(1, e.cwT / 0.95);
          e.cwX = e.cwX0 + e.cwDir * 96 * pc; cwRot = e.cwDir * 2 * Math.PI * pc; cwPose = cwStar();   // L→R clockwise, R→L counter-clockwise
          if (pc >= 1) {
            if (e.cwHurt) { e.cwHurt = false; e.cw = 'heap'; e.cwT = 0; }   // flagged → he crumples at the END of the wheel; helper comes running
            else { e.cw = 'walk'; e.cwT = 0; e.cwWalk = 1.6 + (Math.sin(e.cwX * 5.3) + 1) * 1.1; }   // otherwise resume walking
          }
          break;
        }
        case 'heap':
          e.cwT += dt; cwPose = cwHeap(e.cwT); cwRot = lieRot + Math.sin(e.cwT * 6) * 0.12; cwYoff = lieY;
          pushBeacon(cr.left + e.cwX, cr.top + feetY, 'collapse');   // someone crashed down below
          if (e.cwT > HEAP_SECS) { e.cw = 'getup'; e.cwT = 0; }
          break;
        case 'getup': {
          e.cwT += dt; var gp = smooth01(e.cwT / 1.2); cwRot = lieRot * (1 - gp); cwYoff = lieY * (1 - gp); cwPose = lerpPose(cwHeap(0), A.standstill.frame(0), gp);
          if (gp >= 1) { e.cw = 'headshake'; e.cwT = 0; }
          break;
        }
        case 'headshake':
          e.cwT += dt; cwPose = A.standstill.frame(tt); cwPose.headTilt = Math.sin(e.cwT * 11) * 20;
          if (e.cwT > 1.3) { e.cw = 'stand'; e.cwT = 0; }
          break;
      }
      R.drawShadow(ctx, e.cwX, feetY, 15, shadow);
      drawFig(ctx, e.cwX, baseY + cwYoff, S, cwFlip, cwPose, { color: colA, rot: cwRot });

      // ---- helper (corner Bobit) ----
      var hpPose, hpFlip = false, hpRot = 0, hpYoff = 0;
      switch (e.hp) {
        case 'corner':
          hpPose = A.standstill.frame(tt + 1.1); e.hpX = cornerX;
          if (e.cw === 'heap') { e.hp = 'runto'; }
          break;
        case 'runto': {
          var tgt = e.cwX - 30, d = tgt > e.hpX ? 1 : -1; e.hpX += d * 196 * dt; hpFlip = d < 0; hpPose = A.scurry.frame(tt);
          if ((d > 0 && e.hpX >= tgt) || (d < 0 && e.hpX <= tgt)) { e.hpX = tgt; e.hp = 'kneel'; e.hpT = 0; }
          break;
        }
        case 'kneel':
          e.hpT += dt; hpPose = cwKneel(e.hpT); hpFlip = e.cwX < e.hpX; hpYoff = KNEEL_YOFF;
          if (e.cw === 'getup' || e.cw === 'headshake' || e.cw === 'stand') { e.hp = 'helperup'; e.hpT = 0; }
          break;
        case 'helperup': {
          e.hpT += dt; var up = smooth01(e.hpT / 1.0); hpPose = lerpPose(cwKneel(0), A.standstill.frame(0), up); hpFlip = e.cwX < e.hpX; hpYoff = KNEEL_YOFF * (1 - up);
          if (up >= 1) { e.hp = 'watch'; }
          break;
        }
        case 'watch':
          hpPose = A.standstill.frame(tt); hpFlip = e.cwX < e.hpX;
          if (e.cw === 'cwheel') { e.hp = 'frustrated'; e.hpT = 0; }
          break;
        case 'frustrated':
          e.hpT += dt; hpPose = cwFrust(e.hpT); hpFlip = e.cwX < e.hpX;
          if (e.hpT > 1.2) { e.hp = 'runback'; }
          break;
        case 'runback': {
          var db = cornerX < e.hpX ? -1 : 1; e.hpX += db * 130 * dt; hpFlip = db < 0; hpPose = A.trudge.frame(tt);
          if (Math.abs(e.hpX - cornerX) < 6) { e.hpX = cornerX; e.hp = 'corner'; }
          break;
        }
      }
      R.drawShadow(ctx, e.hpX, feetY, 14, shadow);
      drawFig(ctx, e.hpX, baseY + hpYoff, S, hpFlip, hpPose, { color: colB, rot: hpRot });
    }

    // ── procedural DOG for the fetch scene ──────────────────────────────────
    //    Side-view pup drawn with the same thick round-capped capsules as the
    //    leremy figures. `st` selects the pose; `tt` drives gait + tail wag.
    //    Faces right by default; `face < 0` flips him. Body ~22px at the shoulder
    //    so he reads a touch shorter than the ~36px Bobits beside him.
    var DOG_SH = 22, DOG_BL = 32, DOG_SCALE = 0.67;   // ~2/3 size so he reads smaller beside the Bobits
    function drawDog(ctx, x, groundY, face, color, st, tt, opts) {
      opts = opts || {};
      ctx.save();
      ctx.translate(x, groundY);
      ctx.scale((face < 0 ? -1 : 1) * DOG_SCALE, DOG_SCALE);
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var TONGUE = '#E8607A';
      function seg(ax, ay, bx, by, wd) { ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
      // two-segment leg with a knee kicked out perpendicular to the bone (bend sign = knee dir)
      function leg(ax, ay, fx, fy, bend, wd) {
        var mx = (ax + fx) / 2, my = (ay + fy) / 2, dx = fx - ax, dy = fy - ay, l = Math.hypot(dx, dy) || 1;
        var kx = mx + (-dy / l) * bend, ky = my + (dx / l) * bend;
        seg(ax, ay, kx, ky, wd); seg(kx, ky, fx, fy, wd);
      }
      // head + snout + floppy ear; returns the muzzle tip (where a carried ball sits)
      function head(hx, hy, earWag, tongue) {
        ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
        var snX = hx + 11, snY = hy + 3;
        seg(hx + 2, hy + 1, snX, snY, 6);                 // muzzle
        seg(hx - 4, hy - 5, hx - 7, hy + 6 + earWag, 5);  // floppy ear
        if (tongue) { ctx.strokeStyle = TONGUE; seg(snX - 1, snY + 1, snX - 1, snY + 8, 3); ctx.strokeStyle = color; ctx.fillStyle = color; }
        return { x: snX, y: snY };
      }
      // upright body (stand / run / carry / pickup / drag / sit share this)
      function upright(c) {
        var cx = 0, cy = -DOG_SH - (c.lift || 0), tilt = c.tilt || 0;
        var ca = Math.cos(tilt), sa = Math.sin(tilt), half = DOG_BL / 2;
        var shX = cx + ca * half, shY = cy - sa * half, hpX = cx - ca * half, hpY = cy + sa * half;
        var ph = tt * (c.speed || 0) * Math.PI * 2 + (c.ph || 0);
        var fs = Math.sin(ph), bs = Math.sin(ph + Math.PI);
        var sw = c.swing || 0, ll = c.legLift || 0;
        var ffX = shX + fs * sw, ffY = -Math.max(0, fs) * ll;
        var bfX = hpX + bs * sw, bfY = -Math.max(0, bs) * ll;
        leg(shX + 3, shY, ffX + 3, ffY, 6, 4);            // far front leg (behind the body)
        leg(hpX - 3, hpY, bfX - 3, bfY, -6, 4);           // far back leg
        seg(hpX, hpY, shX, shY, 11);                      // body
        leg(shX, shY, ffX, ffY, 6, 5);                    // near front (elbow back)
        leg(hpX, hpY, bfX, bfY, -6, 5);                   // near back (stifle forward)
        var hx = shX + (c.hdx != null ? c.hdx : 12), hy = shY + (c.hdy != null ? c.hdy : -12);
        seg(shX, shY, hx, hy, 7);                         // neck
        var mouth = head(hx, hy, Math.sin(tt * (c.speed ? 9 : 2)) * 2, c.tongue);
        var wag = (opts.wag != null) ? opts.wag : Math.sin(tt * (c.tailSpd || 5)) * (c.tailAmp || 6);
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hpX, hpY);
        ctx.quadraticCurveTo(hpX - 10, hpY - 9, hpX - 16, hpY - 14 + wag); ctx.stroke();
        return mouth;
      }

      var mouth = null;
      if (st === 'roll') {
        // flopped on his back, belly up: spine on the ground, four paws waving in the air,
        // head lolled back with tongue out, tail thumping the floor
        var by = -9;
        var a = Math.sin(tt * 8) * 4, b = Math.sin(tt * 8 + 1.7) * 4;
        function upleg(bx, kx, px) { seg(bx, by, kx, by - 13, 5); seg(kx, by - 13, px, by - 25, 5); }  // bent leg reaching up
        upleg(10, 13, 13 + a); upleg(5, 3, 3 + b);        // front paws up (near, far)
        upleg(-9, -7, -7 + b); upleg(-14, -16, -16 + a);  // back paws up (near, far)
        seg(-15, by, 15, by, 12);                         // rounded back resting on the ground
        var hx = 20, hy = -6;
        ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
        seg(hx + 1, hy - 2, hx + 8, hy - 5, 6);           // muzzle tipped up (he's upside-down & delighted)
        ctx.strokeStyle = TONGUE; seg(hx + 7, hy - 4, hx + 12, hy - 1, 3); ctx.strokeStyle = color; ctx.fillStyle = color;
        seg(hx - 3, hy + 3, hx - 9, hy + 6, 5);           // ear flopped on the floor
        var tw = Math.sin(tt * 12) * 9;
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-15, by); ctx.quadraticCurveTo(-23, by + 1, -28, by - 6 + tw); ctx.stroke();
      } else if (st === 'sit') {
        mouth = upright({ tilt: 0.55, speed: 0, hdx: 12, hdy: -15, tailAmp: 6, tailSpd: 5, lift: Math.sin(tt * 2) * 0.4 });
      } else if (st === 'run') {
        mouth = upright({ tilt: -0.08, speed: 3.2, swing: 9, legLift: 7, lift: Math.abs(Math.sin(tt * 3.2 * Math.PI)) * 3, hdx: 14, hdy: -10, tailAmp: 5, tailSpd: 9, tongue: true });
      } else if (st === 'carry') {
        mouth = upright({ tilt: -0.03, speed: 2.6, swing: 7, legLift: 5, lift: Math.abs(Math.sin(tt * 2.6 * Math.PI)) * 2.4, hdx: 13, hdy: -13, tailAmp: 6, tailSpd: 8 });
      } else if (st === 'pickup') {
        mouth = upright({ tilt: 0.04, speed: 0, hdx: 12, hdy: 8, tailAmp: 8, tailSpd: 6 });   // nose dips down to the ball
      } else if (st === 'drag') {
        // faces the ball and hauls it BACKWARD: braced back, nose reaching toward the ball
        mouth = upright({ tilt: -0.10, speed: 1.3, swing: -3, legLift: 1, hdx: 16, hdy: -4, tongue: true, tailAmp: 2, tailSpd: 3 });
      } else {   // stand
        mouth = upright({ lift: Math.sin(tt * 2) * 0.6, speed: 0, hdx: 12, hdy: -12, tailAmp: 5, tailSpd: 3 });
      }

      if (mouth && opts.ball) {   // ball carried in the muzzle (radius undone so it matches the loose ball)
        ctx.fillStyle = opts.ballColor || figColor(2);
        ctx.beginPath(); ctx.arc(mouth.x, mouth.y, (opts.ballR || 6) / DOG_SCALE, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // ── DOG-FETCH scene (occasionally replaces the footer meet pair): a Bobit plays
    //    fetch with his dog, throwing the ball to alternating sides of the map.
    //    · hover the dog → he stops and sits
    //    · click the dog → he drops the ball and rolls on his back, paws up, tail wagging
    //    · click the thrower → he winds up and hurls it clean off the edge; the dog tears
    //      after it and drags back the big red dot from the middle of the EV logo (way too
    //      heavy), the thrower shoves it off the far side, points after it, and the dog
    //      trots off to bring back the little yellow ball so the game can carry on. ──
    var DOG_ROLL_SECS = 1.4;   // short base roll; a hover holds him down, and he pops up fast once you move on
    function throwWind() { var p = Object.assign({}, R.REST); p.lean = -8; p.headTilt = -6; p.armRU = -52; p.armRF = -58; p.armLU = -22; p.armLF = -15; p.legRU = 12; p.legLU = -16; p.legLF = -9; return p; }
    function throwRel(k) { var p = Object.assign({}, R.REST); p.lean = 6 - k * 3; p.headTilt = -10; var a = -52 + k * 150; p.armRU = a; p.armRF = a + 8; p.armLU = -20; p.armLF = -14; return p; }
    function pushPose(t) { var p = A.stroll.frame(t); p.lean = -10; p.hunch = -14; p.armRU = 86; p.armRF = 70; p.armLU = -80; p.armLF = -64; p.headTilt = -8; return p; }
    // thrower's reaction when the dog hauls in the big red ball: hands thrown up briefly, then a double head-shake
    function megaReact(t) {
      var p = Object.assign({}, R.REST);
      if (t < 0.7) {                                         // hands thrown up in the air
        var u = Math.min(1, t / 0.22);
        p.armRU = 40 + 132 * u; p.armRF = 30 + 148 * u; p.armLU = -40 - 132 * u; p.armLF = -30 - 148 * u;
        p.lean = -4; p.headTilt = -16; p.bob = 1 + Math.sin(t * 12) * 1.2;
      } else {                                               // hands to hips, shaking his head twice
        var ht = t - 0.7;
        p.armRU = 52; p.armRF = -128; p.armLU = -52; p.armLF = 128;
        p.headTilt = Math.sin(ht * (2 * Math.PI) * (2 / 1.2)) * 20; p.lean = -2; p.bob = 1;
      }
      return p;
    }
    function drawDogFetch(e, ctx, w, h, feetY, tt, colThrower, colDog, shadow, dt, cr) {
      var throwerX = w * 0.5, homeX = throwerX - 52, groundBallY = feetY - 7;
      var throwerBaseY = feetY - 112 * S, smallR = 6, bigR = 20;
      if (e.df == null) { e.df = 'ready'; e.dfT = 0; e.side = (Math.sin(w * 7.3) > 0 ? 1 : -1); e.dogX = homeX; e.dogFace = 1; e.thrX = throwerX; e.bHeld = 'thrower'; e.bX = homeX; e.bY = groundBallY; e.dogRoll = 0; e.mega = false; }

      // hit-test coords (canvas is pointer-events:none → use shared pointer for hover)
      e._dogSX = cr.left + e.dogX; e._dogSY = cr.top + feetY - 12;
      e._thSX = cr.left + e.thrX; e._thSY = cr.top + feetY - 34;
      var overDog = Math.abs(mx - (cr.left + e.dogX)) < 20 && my > cr.top + feetY - 28 && my < cr.top + feetY + 8;

      var rolling = e.dogRoll > 0;
      var sitting = !e.mega && !rolling && overDog;
      var dogFrozen = rolling || sitting;   // his own motion stops, but the thrown ball & the owner keep going
      if (rolling) {
        if (overDog) e.dogRoll = Math.max(e.dogRoll, 0.7);   // keeps enjoying the belly rub while you hover
        pushBeacon(cr.left + e.dogX, cr.top + feetY, 'collapse');   // dog flops down below
        e.dogRoll -= dt;
        if (e.dogRoll <= 0 && e.bHeld === 'ground') { e.df = 'chase'; e.dfT = 0; }   // gets up & fetches the ball he dropped
      }

      // helpers -----------------------------------------------------------------
      function dogTo(target, sp) { if (dogFrozen) return; var d = target > e.dogX ? 1 : -1; e.dogX += d * sp * dt; if ((d > 0 && e.dogX > target) || (d < 0 && e.dogX < target)) e.dogX = target; e.dogFace = d; }
      function thHand(pose, flip) { var j = R.computePose(pose, CFG, { x: 0, y: 0 }); return { x: e.thrX + (flip ? -S : S) * j.hR.x, y: throwerBaseY + S * j.hR.y }; }
      var DOG_RUN = 210, DOG_TROT = 150, DOG_DRAG = 88, DOG_MZ = 24;   // DOG_MZ = muzzle reach, so his nose (not chest) meets the ball

      // ── state machine: always runs so a thrown ball keeps flying/rolling even while you pet
      //    the dog; only the dog's own movement freezes (dogTo() no-ops while frozen) ──
      {
        switch (e.df) {
          case 'ready':
            e.dfT += dt;
            if (e.dfT > 0.8) { e.dfT = 0; if (e.megaPending) { e.megaPending = false; e.mega = true; e.df = 'megawind'; } else e.df = 'windup'; }   // clicked owner waits for the ball, THEN mega-throws
            break;
          case 'windup':
            e.dfT += dt;
            if (e.dfT > 0.45) { e.df = 'throw'; e.dfT = 0; e.tX = e.side > 0 ? w * 0.86 : w * 0.14; e.launch = thHand(throwRel(0.5), e.side < 0); e.bHeld = 'air'; }
            break;
          case 'throw': {
            e.dfT += dt; var p = Math.min(1, e.dfT / 0.7);
            e.bX = e.launch.x + (e.tX - e.launch.x) * p; e.bY = e.launch.y + (groundBallY - e.launch.y) * p - 70 * Math.sin(Math.PI * p);
            dogTo(e.tX, DOG_RUN);
            if (p >= 1) { e.bX = e.tX; e.bY = groundBallY; e.bHeld = 'ground'; e.bVX = e.side * 95; e.df = 'chase'; e.dfT = 0; }   // lands & keeps rolling gently
            break;
          }
          case 'chase': {
            if (e.bVX) { e.bX += e.bVX * dt; var dec = e.side * 150 * dt; if (Math.abs(dec) >= Math.abs(e.bVX)) e.bVX = 0; else e.bVX -= dec; e.bX = Math.max(18, Math.min(w - 18, e.bX)); }
            var pdir = e.bX >= e.dogX ? 1 : -1, pickupX = e.bX - pdir * DOG_MZ;   // stop where his muzzle (not chest) reaches the ball
            dogTo(pickupX, DOG_RUN);
            if (Math.abs(e.dogX - pickupX) < 6) { e.df = 'pickup'; e.dfT = 0; e.bVX = 0; }
            break;
          }
          case 'pickup':
            e.dfT += dt; if (e.dfT > 0.4) { e.bHeld = 'dog'; e.df = 'carryback'; e.dfT = 0; }
            break;
          case 'carryback':
            dogTo(homeX, DOG_TROT);
            if (Math.abs(e.dogX - homeX) < 8) { e.df = 'deliver'; e.dfT = 0; e.dogDropped = false; }   // arrives still holding it
            break;
          case 'deliver':
            e.dfT += dt;
            e.dogFace = throwerX > e.dogX ? 1 : -1;                 // turn to FACE the thrower before dropping
            if (!e.dogDropped && e.dfT > 0.25) {                    // then set it down in front of him; tail wiggles
              e.dogDropped = true; e.bHeld = 'ground'; e.bX = e.dogX + e.dogFace * 18; e.bY = groundBallY; e.dogWagT = 0.0001;
            }
            if (e.dfT > 0.85) { e.bHeld = 'thrower'; e.side = -e.side; e.df = 'ready'; e.dfT = 0; }
            break;
          // ── mega gag ──
          case 'megawind':
            e.dfT += dt;
            if (e.dfT > 0.6) { e.df = 'megathrow'; e.dfT = 0; e.megaSide = e.side; e.bHeld = 'air'; e.launch = thHand(throwRel(0.5), e.megaSide < 0); e.tX = e.megaSide > 0 ? w + 70 : -70; }
            break;
          case 'megathrow': {
            e.dfT += dt; var mp = Math.min(1, e.dfT / 0.85);
            e.bX = e.launch.x + (e.tX - e.launch.x) * mp; e.bY = e.launch.y + (groundBallY - e.launch.y) * mp - 120 * Math.sin(Math.PI * Math.min(1, mp * 0.9));
            dogTo(e.megaSide > 0 ? w + 50 : -50, DOG_RUN);
            if (mp >= 1 && (e.dogX > w + 40 || e.dogX < -40)) { e.df = 'megaoff'; e.dfT = 0; }
            break;
          }
          case 'megaoff':
            e.dfT += dt;
            if (e.dfT > 0.7) { e.df = 'megadrag'; e.dfT = 0; e.reactT = 0; e.dogX = e.megaSide > 0 ? w + 40 : -40; e.bigX = e.megaSide > 0 ? w + 62 : -62; }
            break;
          case 'megadrag': {
            e.reactT += dt;                                                             // thrower's see-the-big-ball reaction runs alongside the haul
            var dd = homeX > e.dogX ? 1 : -1; e.dogX += dd * DOG_DRAG * dt;             // shuffles BACKWARD toward home
            if ((dd > 0 && e.dogX > homeX) || (dd < 0 && e.dogX < homeX)) e.dogX = homeX;
            e.dogFace = e.megaSide > 0 ? 1 : -1;                                         // faces the ball, so he's walking backward
            e.bigX = e.dogX + e.megaSide * (bigR + 6);                                   // ball right at his nose, on the edge side
            if (Math.abs(e.dogX - homeX) < 10) { e.df = 'megacatch'; e.dfT = 0; }
            break;
          }
          case 'megacatch':
            e.dfT += dt; if (e.dfT > 0.9) { e.df = 'megapush'; e.dfT = 0; }
            break;
          case 'megapush': {
            var pd = -e.megaSide; e.bigX += pd * 104 * dt;
            if (pd > 0 ? e.bigX > w + 62 : e.bigX < -62) { e.df = 'megapoint'; e.dfT = 0; }
            break;
          }
          case 'megapoint':
            e.dfT += dt; if (e.dfT > 1.4) { e.df = 'megareturn'; e.dfT = 0; }
            break;
          case 'megareturn':
            dogTo(e.megaSide > 0 ? w + 40 : -40, DOG_RUN);
            if (e.dogX > w + 30 || e.dogX < -30) { e.df = 'megaback'; e.dfT = 0; }
            break;
          case 'megaback':
            e.dfT += dt; if (e.dfT > 0.8) { e.df = 'megacarry'; e.dfT = 0; e.dogX = e.megaSide > 0 ? w + 30 : -30; e.bHeld = 'dog'; }
            break;
          case 'megacarry':
            dogTo(homeX, DOG_TROT);
            if (Math.abs(e.dogX - homeX) < 8) { e.df = 'megadeliver'; e.dfT = 0; e.dogDropped = false; }
            break;
          case 'megadeliver':
            e.dfT += dt;
            e.dogFace = throwerX > e.dogX ? 1 : -1;                 // faces the owner before setting it down
            if (!e.dogDropped && e.dfT > 0.25) { e.dogDropped = true; e.bHeld = 'ground'; e.bX = e.dogX + e.dogFace * 18; e.bY = groundBallY; e.dogWagT = 0.0001; }
            // ball waits on the GROUND until the owner has strolled home, then he bends to pick it up (no teleport)
            if (e.dogDropped && Math.abs(e.thrX - throwerX) < 3) { e.mega = false; e.df = 'deliver'; e.dfT = 0; }   // deliver does the heave-pickup + side flip
            break;
        }
      }

      // thrower position: steps in to catch, follows the shove (but stays on-screen), holds
      // while pointing, and otherwise STROLLS back to his spot at a normal pace (no sprint)
      e.thrWalk = false;
      if (e.df === 'megacatch') { e.thrX += (e.bigX - e.megaSide * 30 - e.thrX) * Math.min(1, dt * 4); }
      else if (e.df === 'megapush') { var tgt = Math.max(44, Math.min(w - 44, e.bigX + e.megaSide * 24)); e.thrX += (tgt - e.thrX) * Math.min(1, dt * 4); }
      else if (e.df === 'megapoint') { /* holds his ground, pointing after it */ }
      else { var dth = throwerX - e.thrX; if (Math.abs(dth) > 1.5) { e.thrX += (dth > 0 ? 1 : -1) * Math.min(Math.abs(dth), 64 * dt); e.thrWalk = true; } else e.thrX = throwerX; }

      // when he throws his hands up at the incoming mega-ball, it's a commotion the ledge-peeker can hear
      if (e.df === 'megadrag' && e.reactT < 2.0) pushBeacon(cr.left + e.thrX, cr.top + feetY, 'commotion');

      // ── choose poses ──
      var faceDogFlip = e.dogX < e.thrX;
      var thP, thFlip;
      switch (e.df) {
        case 'ready': thP = A.standstill.frame(tt); thFlip = e.side < 0; break;
        case 'windup': thP = throwWind(); thFlip = e.side < 0; break;
        case 'megawind': thP = throwWind(); thFlip = e.side < 0; break;
        case 'throw': thP = throwRel(Math.min(1, e.dfT / 0.3)); thFlip = e.side < 0; break;
        case 'megathrow': thP = throwRel(Math.min(1, e.dfT / 0.3)); thFlip = e.megaSide < 0; break;
        case 'megaoff': thP = A.standstill.frame(tt); thFlip = e.megaSide < 0; break;
        case 'megadrag': thP = (e.reactT < 1.9) ? megaReact(e.reactT) : A.standstill.frame(tt); thFlip = e.megaSide < 0; break;   // hands up + head-shake, then waits for the dog
        case 'megacatch': thP = A.heave.frame(Math.min(1.15, e.dfT)); thFlip = e.megaSide > 0; break;
        case 'megapush': thP = pushPose(tt); thFlip = (-e.megaSide) < 0; break;
        case 'megapoint': thP = A.present.frame(tt); thFlip = (-e.megaSide) < 0; break;
        case 'deliver': thP = A.heave.frame(Math.min(1.15, e.dfT)); thFlip = faceDogFlip; break;
        default: thP = A.standstill.frame(tt); thFlip = faceDogFlip;   // watching the dog work
      }
      if (e.thrWalk) { thP = A.stroll.frame(tt); thFlip = throwerX < e.thrX; }   // strolling back to his throwing spot

      var dogBall = e.bHeld === 'dog';   // ball shows in his muzzle whenever he holds it (incl. while sitting)
      var dogSt;
      if (rolling) dogSt = 'roll';
      else if (sitting) dogSt = 'sit';
      else switch (e.df) {
        case 'throw': case 'chase': case 'megathrow': case 'megareturn': dogSt = 'run'; break;
        case 'pickup': dogSt = 'pickup'; break;
        case 'carryback': case 'megacarry': dogSt = 'carry'; break;
        case 'megadrag': dogSt = 'drag'; break;
        default: dogSt = 'stand';
      }
      if (sitting) e.dogFace = e.thrX > e.dogX ? 1 : -1;
      if (e.dogWagT > 0) { e.dogWagT += dt; if (e.dogWagT > 0.55) e.dogWagT = 0; }   // fast double tail-wiggle right after he drops the ball
      var wagBurst = (e.dogWagT > 0) ? Math.sin(e.dogWagT * 2 * Math.PI * 3.6) * 12 : null;

      // ── draw ──
      // big red logo-dot behind the actors during the mega haul
      if (e.df === 'megadrag' || e.df === 'megacatch' || e.df === 'megapush') {
        R.drawShadow(ctx, e.bigX, feetY, 24, shadow);
        ctx.fillStyle = cssVar('--coral', '#FF5740');
        ctx.beginPath(); ctx.arc(e.bigX, feetY - bigR, bigR, 0, Math.PI * 2); ctx.fill();
      }
      // thrower
      R.drawShadow(ctx, e.thrX, feetY, 16, shadow);
      drawFig(ctx, e.thrX, throwerBaseY, S, thFlip, thP, { color: colThrower });
      // small yellow ball when it's loose or in the thrower's hand (the dog draws it when carried)
      if (e.bHeld === 'thrower') { var hp = thHand(thP, thFlip); ctx.fillStyle = figColor(2); ctx.beginPath(); ctx.arc(hp.x, hp.y, smallR, 0, Math.PI * 2); ctx.fill(); }
      else if (e.bHeld === 'air' || e.bHeld === 'ground') { ctx.fillStyle = figColor(2); ctx.beginPath(); ctx.arc(e.bX, e.bY, smallR, 0, Math.PI * 2); ctx.fill(); }
      // dog
      R.drawShadow(ctx, e.dogX, feetY, rolling ? 15 : 11, shadow);
      drawDog(ctx, e.dogX, feetY, e.dogFace, colDog, dogSt, tt, { ball: dogBall, ballColor: figColor(2), ballR: smallR, wag: wagBurst });
    }

    // ── KITE scene (occasionally on the right of Note 01's top edge): a Bobit flies a kite in a
    //    left→right wind — the kite floats up-and-downwind on a string, with a little fluttering
    //    tail. Click the KITE → it does a loop (tail trailing). Hover the GUY → he waves with his
    //    free hand. Click the GUY → the kite spins, falls, and he trots over, picks it up, and
    //    tosses it back up as he runs home. ──
    function kiteHold(t) { var p = Object.assign({}, R.REST); p.lean = -3; p.headTilt = -20; p.armRU = 150; p.armRF = 150; p.armLU = -16; p.armLF = -12; p.bob = Math.sin(t * 0.7) * 1.4; p.legRU = 8; p.legLU = -10; return p; }
    function kiteWave(t) { var p = kiteHold(t); var wv = Math.min(1, t / 0.3); p.armLU = -15 - 140 * wv; p.armLF = -11 - 150 * wv + Math.sin(t * 11) * 22; p.headTilt = -14; return p; }
    function drawKite(e, ctx, w, h, feetY, tt, colGuy, colKite, shadow, dt, cr) {
      var gx0 = 70, guyBaseY = feetY - 112 * S, khX = 262, khY = 86, groundKiteY = feetY - 12;   // kite rides well downwind (long string), hovering a touch lower
      if (e.kt == null) { e.kt = 'fly'; e.ktT = 0; e.gxCur = gx0; e.kwave = 0; e.kx = khX; e.ky = khY; e.kang = 0.28; }
      e.ktT += dt;

      function guyHandOf(pose, flip) { var j = R.computePose(pose, CFG, { x: 0, y: 0 }); return { x: e.gxCur + (flip ? -S : S) * j.hR.x, y: guyBaseY + S * j.hR.y }; }
      function bottomPt(kx, ky, ang) { return { x: kx + Math.sin(ang) * 17, y: ky + Math.cos(ang) * 17 }; }
      function kiteDiamond(kx, ky, ang) {
        ctx.save(); ctx.translate(kx, ky); ctx.rotate(ang);
        ctx.fillStyle = colKite; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(11, 0); ctx.lineTo(0, 17); ctx.lineTo(-11, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = colGuy; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 17); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke();
        ctx.restore();
      }
      function kiteTail(kx, ky, ang, ph) {
        var bp = bottomPt(kx, ky, ang);
        ctx.strokeStyle = colKite; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(bp.x, bp.y);
        var px, py;
        for (var i = 1; i <= 11; i++) { var f = Math.sin(ph * 5 + i * 0.8) * 5; px = bp.x + i * 3 + f; py = bp.y + i * 7; ctx.lineTo(px, py); }
        ctx.stroke();
        ctx.fillStyle = colGuy;
        for (var b = 2; b <= 10; b += 2) { var fb = Math.sin(ph * 5 + b * 0.8) * 5; ctx.beginPath(); ctx.arc(bp.x + b * 3 + fb, bp.y + b * 7, 2.3, 0, Math.PI * 2); ctx.fill(); }
      }
      function kiteString(hand, kx, ky, ang, slack) {
        var bp = bottomPt(kx, ky, ang);
        ctx.strokeStyle = cssVar('--border', '#B0AEA6'); ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.quadraticCurveTo((hand.x + bp.x) / 2, (hand.y + bp.y) / 2 + (slack || 6), bp.x, bp.y); ctx.stroke();
      }

      // hover the guy → wave with his free hand (while the kite is up)
      var overGuy = Math.abs(mx - (cr.left + e.gxCur)) < 22 && my > cr.top + feetY - 92 && my < cr.top + feetY + 6;
      var flying = (e.kt === 'fly' || e.kt === 'loop');
      if (flying && overGuy) { if (!e.kwave) e.kwave = 0.0001; e.kwLinger = 1.3; }
      else if (e.kwave) { e.kwLinger -= dt; if (e.kwLinger <= 0) e.kwave = 0; }
      if (e.kwave) e.kwave += dt;

      e._kiteSX = cr.left + e.kx; e._kiteSY = cr.top + e.ky;
      e._kgSX = cr.left + e.gxCur; e._kgSY = cr.top + feetY - 40;

      var guyPose, guyFlip = false, kx = e.kx, ky = e.ky, ang = e.kang, slack = 6, kiteInHand = false, kiteGround = false;
      switch (e.kt) {
        case 'fly': {
          var sway = Math.sin(e.ktT * 1.1), bobK = Math.sin(e.ktT * 1.6);
          kx = khX + sway * 12; ky = khY + bobK * 9; ang = 0.28 + sway * 0.14;
          guyPose = kiteHold(e.ktT);
          break;
        }
        case 'loop': {
          var lp = Math.min(1, e.ktT / 1.2), a2 = -Math.PI / 2 + lp * 2 * Math.PI;
          kx = khX + Math.cos(a2) * 26; ky = (khY - 22) + Math.sin(a2) * 26; ang = 0.28 + lp * 2 * Math.PI;
          guyPose = kiteHold(e.ktT);
          if (lp >= 1) { e.kt = 'fly'; e.ktT = 0; }
          break;
        }
        case 'spin': {
          kx = khX; ky = khY; ang = 0.28 + e.ktT * 22; slack = 6 + e.ktT * 26;   // spins in place, string goes slack
          guyPose = kiteHold(e.ktT);
          if (e.ktT > 0.6) { e.kt = 'fall'; e.ktT = 0; e.kvy = -20; }
          break;
        }
        case 'fall': {
          e.kvy = (e.kvy || 0) + 470 * dt; e.ky += e.kvy * dt; e.kx += 26 * dt;    // gravity + downwind drift
          kx = e.kx; ky = e.ky; ang = 0.28 + Math.sin(e.ktT * 9) * 0.7;
          guyPose = A.standstill.frame(tt); guyPose.headTilt = 16;                 // watches it come down
          if (e.ky >= groundKiteY) { e.ky = groundKiteY; e.kt = 'fetch'; e.ktT = 0; }
          break;
        }
        case 'fetch': {
          var tgt = e.kx - 16, d = tgt > e.gxCur ? 1 : -1; e.gxCur += d * 74 * dt; guyFlip = d < 0;
          kx = e.kx; ky = groundKiteY; ang = 1.5; kiteGround = true;
          guyPose = A.stroll.frame(tt);
          if (Math.abs(e.gxCur - tgt) < 3) { e.gxCur = tgt; e.kt = 'pickup'; e.ktT = 0; }
          break;
        }
        case 'pickup': {
          guyPose = A.heave.frame(Math.min(1.15, e.ktT));
          if (e.ktT < 0.8) { kx = e.kx; ky = groundKiteY; ang = 1.5; kiteGround = true; } else { kiteInHand = true; }
          if (e.ktT > 1.05) { e.kt = 'relaunch'; e.ktT = 0; }
          break;
        }
        case 'relaunch': {
          var dd = gx0 > e.gxCur ? 1 : -1; e.gxCur += dd * 96 * dt; guyFlip = dd < 0;
          var dist = Math.abs(e.gxCur - gx0);
          guyPose = A.scurry.frame(tt);
          if (dist > 54) { kiteInHand = true; }                                    // carries it low as he runs
          else { var lf = 1 - dist / 54, hand = guyHandOf(guyPose, guyFlip); kx = hand.x + (khX - hand.x) * lf; ky = hand.y + (khY - hand.y) * lf; ang = 0.9 - 0.62 * lf; }   // tosses it up as he arrives
          if (dist < 3) { e.gxCur = gx0; e.kt = 'fly'; e.ktT = 0; }
          break;
        }
      }
      if (e.kwave && flying) guyPose = kiteWave(e.kwave);
      e.kx = kx; e.ky = ky; e.kang = ang;

      // ── draw ──
      R.drawShadow(ctx, e.gxCur, feetY, 15, shadow);
      if (kiteGround) R.drawShadow(ctx, kx, feetY, 11, shadow);
      drawFig(ctx, e.gxCur, guyBaseY, S, guyFlip, guyPose, { color: colGuy });
      if (kiteInHand) { var hnd = guyHandOf(guyPose, guyFlip); kx = hnd.x; ky = hnd.y - 6; ang = guyFlip ? -0.7 : 0.7; e.kx = kx; e.ky = ky; e.kang = ang; }
      if (e.kt === 'fly' || e.kt === 'loop' || e.kt === 'spin') kiteString(guyHandOf(kiteHold(e.ktT), false), kx, ky, ang, slack);
      kiteTail(kx, ky, ang, e.ktT);
      kiteDiamond(kx, ky, ang);
    }

    // ── YO-YO player: throws it down, it bounces back up, the hand pops up slightly at the catch,
    //    repeat. The yo-yo is always a contrasting hue to the player (cast via contrastTone).
    //    Click him → "walk the dog": he lets it all the way to the floor, it rolls along the ground,
    //    then snaps back up the string into his hand. ──
    function yoyoHold(t) {
      var p = Object.assign({}, R.REST);
      p.lean = 2;
      p.bob = Math.sin(t * 0.7) * 1.2;
      p.headTilt = -6;                    // glancing down at the toy
      p.armRU = 44; p.armRF = 16;         // throwing hand held out in front, about waist height
      p.armLU = -14; p.armLF = -12;       // off hand relaxed at his side
      p.legRU = 6; p.legLU = -8;
      return p;
    }
    function drawYoyo(e, ctx, w, h, feetY, tt, colGuy, colYoyo, shadow, dt, cr) {
      var gx0 = 70, guyBaseY = feetY - 112 * S, rY = 6.5;
      var normalBotY = feetY - 16, groundBotY = feetY - rY - 1;   // spins just above the floor vs. sits ON it (walk-the-dog)
      if (e.yo == null) { e.yo = 'throw'; e.yoT = 0; e.yoSpin = 0; }
      e.yoT += dt;

      function handOf(pose) { var j = R.computePose(pose, CFG, { x: 0, y: 0 }); return { x: gx0 + S * j.hR.x, y: guyBaseY + S * j.hR.y }; }

      var pose = yoyoHold(tt);
      var dropFrac = 0, pop = 0, rollX = 0, botY = normalBotY, spinRate = 3;
      var rollDist = Math.min(96, w - gx0 - 34);

      if (e.yo === 'throw') {
        var P = 1.25, thr = 0.62;                     // one throw-and-catch, then a short beat resting in the hand
        var u = (e.yoT % P) / P;
        if (u < thr) {
          var s = u / thr;
          dropFrac = Math.sin(Math.PI * s);           // down to the bottom (s=0.5) and back up into the hand
          pop = -Math.sin(2 * Math.PI * s);           // hand dips on the downstroke, pops UP as it climbs back to the catch
          spinRate = 6 + dropFrac * 12;
          pose.headTilt = -6 - dropFrac * 10;          // follows it down
        } else { spinRate = 2; }
      } else if (e.yo === 'wd_down') {                 // walk the dog: let it all the way to the floor
        var d = Math.min(1, e.yoT / 0.4);
        dropFrac = d; botY = groundBotY; spinRate = 6 + d * 12;
        pose.lean = 2 + d * 7; pose.hunch = -6 * d; pose.headTilt = -6 - 16 * d;
        pose.armRU = 44 + d * 12; pose.armRF = 16 + d * 8;
        if (e.yoT >= 0.4) { e.yo = 'wd_roll'; e.yoT = 0; }
      } else if (e.yo === 'wd_roll') {                 // it rolls along the ground while he leans and watches it go
        var rr = Math.min(1, e.yoT / 1.5);
        dropFrac = 1; botY = groundBotY; rollX = rollDist * easeInOut(rr); spinRate = 18;
        pose.lean = 9; pose.hunch = -6; pose.headTilt = -22;
        pose.armRU = 58 + rr * 10; pose.armRF = 26;   // arm reaches out after it
        if (e.yoT >= 1.5) { e.yo = 'wd_back'; e.yoT = 0; }
      } else {                                         // wd_back: rolls home, then snaps up the string into his hand
        var bk = Math.min(1, e.yoT / 0.55);
        rollX = rollDist * (1 - easeInOut(Math.min(1, bk * 1.5)));
        dropFrac = 1 - easeInOut(Math.max(0, (bk - 0.55) / 0.45));
        botY = groundBotY; spinRate = 16;
        pose.lean = 8 - bk * 6; pose.hunch = -4 * (1 - bk); pose.headTilt = -18 + bk * 12;
        pop = dropFrac < 0.5 ? (1 - dropFrac * 2) : 0;  // hand pops up as it lands home
        if (e.yoT >= 0.55) { e.yo = 'throw'; e.yoT = 0.62 * 1.25; }   // resume mid-rest so it doesn't instantly re-throw
      }

      // hand pop at the catch
      pose.armRU += pop * 11; pose.armRF -= pop * 4; pose.bob += pop * 2;

      e.yoSpin += dt * spinRate;
      var hand = handOf(pose);
      var yoX = hand.x + rollX, yoY = hand.y + (botY - hand.y) * dropFrac;

      e._yoSX = cr.left + gx0; e._yoSY = cr.top + feetY - 40;

      // ── draw ──
      R.drawShadow(ctx, gx0, feetY, 15, shadow);
      if (dropFrac > 0.92 && botY >= groundBotY - 0.5) R.drawShadow(ctx, yoX, feetY, 8, shadow);   // the yo-yo's own shadow when it's on the floor
      drawFig(ctx, gx0, guyBaseY, S, false, pose, { color: colGuy });
      // string from the hand down to the yo-yo
      ctx.strokeStyle = cssVar('--border', '#B0AEA6'); ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(yoX, yoY); ctx.stroke();
      // the yo-yo — a spinning disc; a streak + hub sell the spin
      ctx.save(); ctx.translate(yoX, yoY); ctx.rotate(e.yoSpin);
      ctx.fillStyle = colYoyo; ctx.beginPath(); ctx.arc(0, 0, rY, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = colGuy; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-rY + 1.6, 0); ctx.lineTo(rY - 1.6, 0); ctx.stroke();
      ctx.fillStyle = cssVar('--bg', '#fff'); ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ── PHONE-SITTER (a seated Bobit glued to a phone): click him → he pockets the phone and just
    //    hangs out; click again → he fishes it back out, bends over, and gets re-absorbed. ──
    var POSE_KEYS = ['lean', 'headTilt', 'bob', 'hunch', 'armRU', 'armRF', 'armLU', 'armLF', 'legRU', 'legRF', 'legLU', 'legLF'];
    function lerpPose(a, b, u) {
      var p = {};
      for (var i = 0; i < POSE_KEYS.length; i++) { var k = POSE_KEYS[i]; var av = a[k] || 0, bv = b[k] || 0; p[k] = av + (bv - av) * u; }
      return p;
    }
    function easeInOut(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
    function phoneAbsorbed(t) {
      var p = Object.assign({}, R.REST);
      var br = Math.sin(t * 0.28 * Math.PI * 2);   // slow breathing
      var thumb = Math.sin(t * 6) * 3;             // thumb-typing twitch
      p.lean = 6;
      p.hunch = -(30 + br * 2);                     // curled hard over the screen
      p.bob = br * 1.2;
      p.headTilt = -(24 + br * 2);                  // face buried in the phone
      p.armRU = 54 + br;  p.armRF = 126 + thumb;    // both hands cupped low and central
      p.armLU = 42 - br;  p.armLF = 116 - thumb;
      p.legRU = 80; p.legRF = 10;                   // seated, shins dangling
      p.legLU = 72; p.legLF = 4;
      return p;
    }
    function drawPhoneSeat(e, ctx, w, h, tt, col, dt) {
      if (e.ph == null) { e.ph = 'absorbed'; e.phT = 0; }   // start doomscrolling
      e.phT += dt;
      var seatY = h - 42, TRANS = 0.6;
      var absorbed = phoneAbsorbed(tt), hangout = A.sit.frame(tt);
      var pose, showPhone = true, phoneRot = -0.08, u;   // held nearly upright (portrait)
      if (e.ph === 'absorbed') { pose = absorbed; }
      else if (e.ph === 'hangout') { pose = hangout; showPhone = false; }
      else if (e.ph === 'pocket') {                          // absorbed → hangout
        u = easeInOut(Math.min(1, e.phT / TRANS));
        pose = lerpPose(absorbed, hangout, u);
        showPhone = e.phT < TRANS * 0.55;                    // slides down to the lap, then it's pocketed
        phoneRot = -0.08 + u * 0.5;
        if (e.phT >= TRANS) { e.ph = 'hangout'; e.phT = 0; }
      } else {                                               // 'draw': hangout → absorbed
        u = easeInOut(Math.min(1, e.phT / TRANS));
        pose = lerpPose(hangout, absorbed, u);
        showPhone = e.phT > TRANS * 0.4;                     // fishes it back out, then bends over it
        phoneRot = 0.42 - u * 0.5;
        if (e.phT >= TRANS) { e.ph = 'absorbed'; e.phT = 0; }
      }
      drawFig(ctx, w / 2, seatY, S, e.spec.x > 0.5, pose, { color: col, phone: showPhone, phoneRot: phoneRot });
      var cr = e.c.getBoundingClientRect();
      e._phSX = cr.left + w / 2; e._phFY = cr.top + h;       // click hitbox anchor (screen coords)
    }

    // ── BALANCER (a stand Bobit balancing on one foot): teeters on his right foot, flinging an arm
    //    up to steady himself. Hover him → he waves back one-handed (still on one foot), windmills
    //    both arms once, loses it and collapses, then climbs back up and rebalances. Every pose is
    //    reached by easing the displayed pose toward the target, so nothing snaps or teleports. ──
    function balanceIdle(t) {
      var p = Object.assign({}, R.REST);
      var teeter = Math.sin(t * 1.05);
      p.lean = 2 + teeter * 5;                                  // sways side to side
      p.bob = Math.sin(t * 0.5) * 1.5;
      p.headTilt = -teeter * 4;
      p.armRU = 30 + Math.max(0, teeter) * 80;                  // fling the arm up on whichever side he tips toward
      p.armRF = 18 + Math.max(0, teeter) * 30;
      p.armLU = -30 - Math.max(0, -teeter) * 80;
      p.armLF = -18 - Math.max(0, -teeter) * 30;
      p.legRU = 6; p.legRF = 2;                                 // right leg planted straight down
      p.legLU = 40 + Math.sin(t * 0.9) * 4; p.legLF = -66;      // left leg lifted, shin tucked
      return p;
    }
    function balanceWave(t) {
      var p = balanceIdle(t);
      p.armRU = 150; p.armRF = 150 + Math.sin(t * 10) * 24;     // right hand waving hello
      p.armLU = -78; p.armLF = -42;                             // left arm flung wide to stay up
      p.headTilt = -14;
      p.lean = 5 + Math.sin(t * 1.4) * 4;                       // wobblier — waving on one foot is hard
      return p;
    }
    function balanceWindmill(t, u) {
      var p = balanceIdle(t);
      var ang = u * 360;                                        // exactly one revolution, continuing from the wave
      p.armRU = 150 + ang; p.armRF = 8;                         // straight arms sweeping all the way around
      p.armLU = -78 - ang; p.armLF = -8;
      p.lean = Math.sin(u * Math.PI * 2) * 9;                   // reeling
      p.headTilt = -6;
      p.legLU = 42; p.legLF = -62;
      return p;
    }
    function balanceCollapse(t) {
      var p = Object.assign({}, R.REST);
      var br = Math.sin(t * 2) * 1.2;
      p.lean = 10; p.hunch = -42; p.headTilt = -20 + br;        // crumpled forward heap
      p.bob = 6;
      p.armRU = 44; p.armRF = 24; p.armLU = -44; p.armLF = -24; // arms sprawled
      p.legRU = 96; p.legRF = -92; p.legLU = 80; p.legLF = -84; // both knees folded under him
      return p;
    }
    function drawBalancer(e, ctx, w, h, feetY, tt, col, shadow, dt) {
      var oyS = feetY - 112 * S, groundY = feetY - 14;          // pelvis: standing height vs. crumpled on the ground
      var cr = e.c.getBoundingClientRect();
      var hovering = Math.abs(mx - (cr.left + w / 2)) < 40 && my > cr.top + h - 96 && my < cr.top + h + 6;
      if (e.balPh == null) { e.balPh = 'idle'; e.balT = 0; e.balPose = balanceIdle(tt); e.balY = oyS; }
      // edge-triggered: only kick off the routine from a settled idle, once per hover-in
      if (hovering && !e._balHov && e.balPh === 'idle') { e.balPh = 'wave'; e.balT = 0; }
      e._balHov = hovering;
      e.balT += dt;
      var target, targetY = oyS, D;
      switch (e.balPh) {
        case 'wave':     D = 1.5; target = balanceWave(tt); if (e.balT >= D) { e.balPh = 'windmill'; e.balT = 0; } break;
        case 'windmill': D = 1.0; target = balanceWindmill(tt, Math.min(1, e.balT / D)); if (e.balT >= D) { e.balPh = 'collapse'; e.balT = 0; } break;
        case 'collapse': D = 0.55; target = balanceCollapse(tt); targetY = groundY; if (e.balT >= D) { e.balPh = 'down'; e.balT = 0; } break;
        case 'down':     D = 0.5; target = balanceCollapse(tt); targetY = groundY; if (e.balT >= D) { e.balPh = 'standup'; e.balT = 0; } break;
        case 'standup':  D = 0.75; target = balanceIdle(tt); if (e.balT >= D) { e.balPh = 'idle'; e.balT = 0; } break;
        default:         target = balanceIdle(tt);
      }
      // ease the DISPLAYED pose toward the target every frame → seamless flow between every phase
      var k = Math.min(1, dt * 13);
      for (var i = 0; i < POSE_KEYS.length; i++) { var key = POSE_KEYS[i]; var cur = e.balPose[key] || 0; e.balPose[key] = cur + ((target[key] || 0) - cur) * k; }
      e.balY += (targetY - e.balY) * Math.min(1, dt * 10);
      R.drawShadow(ctx, w / 2, feetY, 16, shadow);
      drawFig(ctx, w / 2, e.balY, S, false, e.balPose, { color: col });
    }

    // ── LETTER CARRIERS: two Bobits haul pieces of the logo across a strip. One struggles with the
    //    upside-down teal 'e' (from "empowered"); the other holds the upside-down coral 'v' (from
    //    ".vote") over his head. Click the v-carrier → the v drops down over his eyes and he wanders
    //    blindly, hands out, until he lifts it back up and walks on. Click the e-carrier → he sets the
    //    e down in front of you, waves once, then rolls it off (it bumps along, not being round). ──
    function drawLetterE(ctx, cx, cy, R, color, rot) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot || 0);
      ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.arc(0, 0, R, 0.30 * Math.PI, 2 * Math.PI, false); ctx.stroke();  // bowl with a mouth gap at lower-right
      ctx.beginPath(); ctx.moveTo(-R + 1, 0); ctx.lineTo(R - 3, 0); ctx.stroke();           // crossbar
      ctx.restore();
    }
    // the exact lowercase 'v' from the empowered.vote wordmark (coral glyph path from EVLogo.svg),
    // so the carried letter reads as the real logo 'v'. Native bbox ~x[242.3,281.9] y[75.2,110.0].
    var V_PATH = new Path2D('M262.892 98.8742H262.764L253.945 75.2178H242.326L256.745 110.043H268.139L281.882 75.2178H271.067L262.892 98.8742Z');
    var V_CX = 262.104, V_CY = 92.63, V_W = 39.556, V_H = 34.825;
    function drawLetterV(ctx, cx, cy, halfW, height, color, rot) {
      var s = Math.min((halfW * 2) / V_W, height / V_H);   // fit the box, keep the glyph's real proportions
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rot || 0) + Math.PI);                    // turned upside-down (logo 'v' → apex up)
      ctx.scale(s, s);
      ctx.translate(-V_CX, -V_CY);
      ctx.fillStyle = color;
      ctx.fill(V_PATH);
      ctx.restore();
    }
    function letterCarryE(t) {                          // struggling: hunched, both hands gripping the e in front
      var p = A.stroll.frame(t);
      p.hunch = -16; p.lean = -3; p.headTilt = 3;
      p.bob = (p.bob || 0) + Math.sin(t * 3) * 1;       // labored little stagger
      p.armRU = 58; p.armRF = 60; p.armLU = -58; p.armLF = -60;
      return p;
    }
    function letterSetDownE(t, u) {                     // crouch to set the e on the ground
      var p = A.stroll.frame(0);
      p.hunch = -20 * u; p.bob = 14 * u; p.headTilt = -14 * u;
      p.armRU = 58 + 34 * u; p.armRF = 60 + 22 * u; p.armLU = -58 - 34 * u; p.armLF = -60 - 22 * u;
      p.legRF = 4 - 12 * u; p.legLF = -4 - 12 * u;
      return p;
    }
    function letterOverheadV(t) {                       // both arms straight up, holding the v aloft
      var p = A.stroll.frame(t);
      p.hunch = 0; p.lean = 0; p.headTilt = 0;
      p.armRU = 148; p.armRF = 150; p.armLU = -148; p.armLF = -150;
      return p;
    }
    function letterBlindV(t) {                          // can't see: arms groping out front, uncertain steps
      var p = A.shuffle.frame(t);
      p.armRU = 86; p.armRF = 80; p.armLU = -86; p.armLF = -80;
      p.headTilt = 8; p.hunch = -4;
      return p;
    }
    function letterKickE(t) {                            // boots the stalled 'e' onward
      var p = A.stroll.frame(t);
      p.legRU = 52; p.legRF = 6;                         // front leg swings out into the kick
      p.legLU = -8; p.legLF = -4;
      p.lean = -7; p.hunch = -6;
      p.armRU = 44; p.armLU = -34;
      return p;
    }
    // one letter-carrying pass in the beam crew's rotation: set up two solo carriers entering from `dir`
    function startLetters(e, w, dir) {
      e.scene = 'letters'; e.dir = dir;
      var sX = dir > 0 ? -80 : w + 80;
      e.vX = sX + dir * 130; e.eX = sX;                 // v-carrier leads, e-carrier trails
      e.vSt = 'walk'; e.vT = 0; e.vDrop = 0; e.vAnchor = 0;
      e.eSt = 'walk'; e.eT = 0; e.eRoll = 0; e.eLX = 0;
    }
    function runLetters(e, ctx, w, h, feetY, tt, shadow, dt, cr) {
      var SP = 34, letterR = 15, groundLY = feetY - 13, oy = feetY - 112 * S;
      var colE = figColor(0), colV = figColor(1);       // teal 'e', coral 'v' — both theme-adaptive
      var flip = e.dir < 0;
      var off = function (x) { return e.dir > 0 ? x > w + 90 : x < -90; };

      // ── V-carrier ──
      switch (e.vSt) {
        case 'walk': e.vX += e.dir * SP * dt; break;
        case 'fall': e.vT += dt; e.vDrop = Math.min(1, e.vT / 0.5); if (e.vT >= 0.6) { e.vSt = 'blind'; e.vT = 0; e.vAnchor = e.vX; } break;
        case 'blind': e.vT += dt; e.vX = e.vAnchor + Math.sin(e.vT * 1.5) * 26; if (e.vT >= 3.6) { e.vSt = 'lift'; e.vT = 0; } break;
        case 'lift': e.vT += dt; e.vDrop = Math.max(0, 1 - e.vT / 0.6); if (e.vT >= 0.7) { e.vSt = 'walk'; e.vT = 0; e.vDrop = 0; } break;
      }
      var vPose = (e.vSt === 'blind') ? letterBlindV(tt) : letterOverheadV(tt);
      var vj = R.computePose(vPose, CFG, { x: 0, y: 0 });
      var sgn = flip ? -1 : 1;
      var vHandX = e.vX + ((vj.hR.x + vj.hL.x) / 2) * S * sgn, vHandY = oy + ((vj.hR.y + vj.hL.y) / 2) * S;
      var vHeadX = e.vX + vj.H.x * S * sgn, vHeadY = oy + vj.H.y * S;
      var vLX = vHandX + (vHeadX - vHandX) * e.vDrop;
      var vLY = (vHandY - 6) + ((vHeadY + 2) - (vHandY - 6)) * e.vDrop;   // slides from aloft down over the eyes
      R.drawShadow(ctx, e.vX, feetY, 14, shadow);
      drawFig(ctx, e.vX, oy, S, flip, vPose, { color: figColor(4) });     // purple guy, distinct from the coral v
      drawLetterV(ctx, vLX, vLY, 16, 30, colV, 0);

      // ── E-carrier ──
      switch (e.eSt) {
        case 'walk': e.eX += e.dir * SP * dt; break;
        case 'drop': e.eT += dt; if (e.eT >= 0.55) { e.eSt = 'wave'; e.eT = 0; } break;
        case 'wave': e.eT += dt; if (e.eT >= 1.3) { e.eSt = 'roll'; e.eT = 0; e.eRoll = 0; e.eLX = e.eX + e.dir * 28; e.eLV = 135; e.eKickHitch = 0; } break;   // give it a first shove
        case 'roll': {
          e.eT += dt;
          var FR = 95;                                   // friction: the 'e' coasts a cycle or two, then stalls
          e.eLV = Math.max(0, (e.eLV || 0) - FR * dt);
          e.eLX += e.dir * e.eLV * dt;
          e.eRoll += e.dir * (e.eLV / letterR) * dt;     // spin tracks roll → it stops turning when it stops
          if (e.eKickHitch > 0) { e.eKickHitch -= dt; }  // brief pause on the kick itself
          else { e.eX += e.dir * 52 * dt; }              // otherwise he keeps walking after it
          var behind = e.dir > 0 ? (e.eLX - e.eX) : (e.eX - e.eLX);
          if (behind < 22) e.eX = e.eLX - e.dir * 22;    // don't overtake the 'e'
          if (behind < 26 && e.eLV < 24) { e.eLV = 145; e.eKickHitch = 0.2; }   // caught the stalled 'e' → boot it on
          break;
        }
      }
      var ePose, eFlip = flip;
      if (e.eSt === 'walk') ePose = letterCarryE(tt);
      else if (e.eSt === 'drop') { ePose = letterSetDownE(tt, Math.min(1, e.eT / 0.55)); eFlip = false; }
      else if (e.eSt === 'wave') { ePose = A.greet.frame(e.eT, { hand: 'R', hz: 1.6 }); eFlip = false; }
      else ePose = (e.eKickHitch > 0) ? letterKickE(tt) : A.stroll.frame(tt);   // roll: kick hitch, else walking
      var ej = R.computePose(ePose, CFG, { x: 0, y: 0 });
      var esgn = eFlip ? -1 : 1;
      var eHandX = e.eX + ((ej.hR.x + ej.hL.x) / 2) * S * esgn, eHandY = oy + ((ej.hR.y + ej.hL.y) / 2) * S;
      var eLX, eLY, eRot = Math.PI;                       // carried & rolled upside-down
      if (e.eSt === 'walk') { eLX = eHandX; eLY = eHandY; }
      else if (e.eSt === 'drop') { var u = Math.min(1, e.eT / 0.55); eLX = e.eX + e.dir * 26; eLY = eHandY + (groundLY - eHandY) * u; }
      else if (e.eSt === 'wave') { eLX = e.eX + e.dir * 26; eLY = groundLY; }
      else { eLX = e.eLX; eLY = groundLY - Math.abs(Math.sin(e.eRoll * 1.5)) * 3 * Math.min(1, (e.eLV || 0) / 40); eRot = Math.PI + e.eRoll; }  // non-round → little bump while moving, flat when stopped
      R.drawShadow(ctx, e.eX, feetY, 14, shadow);
      if (e.eSt !== 'walk') R.drawShadow(ctx, eLX, feetY, 12, shadow);
      drawFig(ctx, e.eX, oy, S, eFlip, ePose, { color: figColor(3) });    // green guy, distinct from the teal e
      drawLetterE(ctx, eLX, eLY, letterR, colE, eRot);

      // click hitboxes (screen coords)
      e._vSX = cr.left + e.vX; e._eSX = cr.left + e.eX; e._lFY = cr.top + feetY;

      // once BOTH have finished their business and walked off, hand back to the two-carry rotation
      var vGone = e.vSt === 'walk' && off(e.vX);
      var eGone = (e.eSt === 'walk' && off(e.eX)) || (e.eSt === 'roll' && off(e.eX) && off(e.eLX));
      if (vGone && eGone) beamPick(e, w);                // hand back; next pass is anything but the letters again
    }
    // at each off-screen turn the crew picks its next pass: the light gag, a letter-carry, or another load
    // pick the crew's next pass. ALTERNATE carry <-> special every pass so the light gag and the
    // letter carriers show up regularly (turns are ~30-50s apart, so a random pick made specials feel
    // like they never happened). Loads (circle/line) and specials (light/letters) each alternate too,
    // so no action ever repeats back-to-back.
    function beamPick(e, w) {
      var lastWasSpecial = (e.lastAction === 'light' || e.lastAction === 'letters');
      // after a special always carry; after a carry usually go special, but ~30% of the time run ONE
      // more carry (the other load) — capped at 2 carries in a row so specials still come around often.
      var goCarry = lastWasSpecial || ((e.carryRun || 0) < 2 && chance(0.3));
      var a;
      if (goCarry) {
        a = (e.lastLoad === 'circle') ? 'line' : 'circle';       // the other load (never repeats)
        e.lastLoad = a; e.carryRun = lastWasSpecial ? 1 : (e.carryRun || 0) + 1;
        e.scene = 'carry'; e.load = a; e.dwell = 1.1; e.bx = e.dir > 0 ? -110 : w + 110;
      } else {
        a = (e.lastSpecial === 'light') ? 'letters' : 'light';   // the other special
        e.lastSpecial = a; e.carryRun = 0;
        if (a === 'light') startLight(e, w); else startLetters(e, w, e.dir);
      }
      e.lastAction = a;
    }

    // ── LEDGE PEEKER: stands straight on the card edge; when something passes (or crashes) below him
    //    he leans out, watches curiously for a beat, shrugs, and stands back up. All eased, no snap. ──
    function peekLook(t) {
      var p = Object.assign({}, R.REST);
      p.hunch = -32;                             // cranes forward over the edge
      p.headTilt = -22 + Math.sin(t * 3) * 4;    // peering down, curious little wobble
      p.bob = 1 + Math.sin(t * 2) * 1;
      p.armRU = -26; p.armRF = -20;              // arms trail back to counterbalance the lean
      p.armLU = -34; p.armLF = -26;
      p.legRU = 12; p.legRF = 6; p.legLU = -14; p.legLF = -6;   // front foot toes the edge
      return p;
    }
    function drawPeeker(e, ctx, w, h, feetY, tt, col, shadow, dt, cr) {
      var oy = feetY - 112 * S, flip = e.spec.x > 0.5;
      var pkX = cr.left + w / 2, pkFeetY = cr.top + feetY;
      if (e.pkSt == null) { e.pkSt = 'stand'; e.pkT = 0; e.pkCool = 0; e.pkPose = A.standstill.frame(tt); }
      e.pkT += dt; if (e.pkCool > 0) e.pkCool -= dt;
      // activity below & near: a fresh beacon under his ledge, or the cursor passing in the band below him
      var trig = false;
      for (var i = 0; i < lookBeacons.length; i++) {
        var b = lookBeacons[i];
        var below = b.y > pkFeetY + 4;
        if (b.kind === 'commotion' || b.kind === 'collapse') { if (below) trig = true; }   // a crash/commotion below — he always hears it and looks
        else if (below && Math.abs(b.x - pkX) < 140) trig = true;                          // a walker passing under his ledge (any depth below)
      }
      if (!trig && mx > -9000 && Math.abs(mx - pkX) < 120 && my > pkFeetY + 4 && my < pkFeetY + 320) trig = true;
      if (e.pkSt === 'stand' && e.pkCool <= 0 && trig) { e.pkSt = 'look'; e.pkT = 0; }
      var target;
      if (e.pkSt === 'look') { target = peekLook(tt); if (e.pkT > (trig ? 3.0 : 1.5)) { e.pkSt = 'shrug'; e.pkT = 0; } }   // keep watching while it lasts, else hold a beat
      else if (e.pkSt === 'shrug') { target = A.shrug.frame(e.pkT); if (e.pkT > 1.5) { e.pkSt = 'stand'; e.pkT = 0; e.pkCool = 1.5; } }
      else target = A.standstill.frame(tt);
      var k = Math.min(1, dt * 12);              // ease displayed pose toward target → smooth look-down & return
      for (var j = 0; j < POSE_KEYS.length; j++) { var key = POSE_KEYS[j]; var cur = e.pkPose[key] || 0; e.pkPose[key] = cur + ((target[key] || 0) - cur) * k; }
      R.drawShadow(ctx, w / 2, feetY, 16, shadow);
      drawFig(ctx, w / 2, oy, S, flip, e.pkPose, { color: col });
    }

    // ── "activity below" beacons: movers/collapsers publish their screen-space foot position so the
    //    ledge-peeker can notice someone passing under him (or crashing down below) and look over. ──
    var lookBeacons = [];
    function pushBeacon(x, y, kind) { lookBeacons.push({ x: x, y: y, t: t, kind: kind }); }

    var t = 0, last = performance.now();
    var inkCache = '#1C1C1C', inkTick = 1;

    function tick() {
      var now = performance.now();
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      t += dt;
      if ((inkTick += dt) > 0.5) { inkTick = 0; inkCache = cssVar('--heading', '#1C1C1C'); }
      var ink = inkCache;
      var shadow = 'rgba(127,127,127,0.18)';
      lookBeacons = lookBeacons.filter(function (b) { return t - b.t < 0.5; });   // keep only fresh activity

      // ── footer meet-and-greet: a call-and-response, not a synchronized wave ──
      // Stage 1: the stander spots the walker coming and waves FIRST (walker still moving).
      // Stage 2: the walker arrives, stops, and returns the wave ~0.9s later (overlaps, not in sync).
      if (footWalk && footWalk.w && footStand && footStand.w) {
        footWalk._cool = Math.max(0, (footWalk._cool || 0) - dt);
        var fwr = footWalk.c.getBoundingClientRect();
        if (fwr.top < window.innerHeight && fwr.bottom > 0) {          // only when the footer is on screen
          var padF = 70, spanF = footWalk.w - padF * 2;
          var ttF = footWalk.lt + footWalk.phase;
          var uF = (ttF * footWalk.spec.speed / spanF) % 2; if (uF < 0) uF += 2;
          var walkerX = fwr.left + padF + (uF < 1 ? uF : 2 - uF) * spanF;
          var standX = footStand.c.getBoundingClientRect().left + footStand.w / 2;
          var distF = Math.abs(walkerX - standX);
          var towardStander = uF > 1;                                   // moving left, toward the far-left stander
          if (towardStander && footWalk._cool <= 0 && !footWalk.greet) {
            if (distF < 104 && !footStand.wave) footStand.wave = 0.001; // red waves first, from a step away
            if (distF < 58) {                                           // blue reaches him, stops, returns the wave
              footWalk.greet = 0.001; footWalk.linger = 1.6; footWalk._meet = true;
              footWalk._cool = 6;                                       // don't repeat until he's looped back
            }
          }
        }
      }

      entries.forEach(function (e) {
        var spec = e.spec, ctx = e.ctx, w = e.w, h = e.h;
        if (!w) return;
        // skip offscreen canvases
        var cr = e.c.getBoundingClientRect();
        if (cr.bottom < -40 || cr.top > window.innerHeight + 40) return;
        ctx.clearRect(0, 0, w, h);
        var feetY = h - 6;
        var col = figColor(spec.tone != null ? spec.tone : e.ci);
        var hoverable = (spec.mode === 'stand' && !spec.balance && !spec.peeker) || spec.mode === 'patrol' || (spec.mode === 'seat' && !spec.phone);
        // per-entry clock freezes while greeting, so patrols resume where they stopped
        if (e.greet) e.greet += dt;
        if (e._fall > 0) e._fall = Math.max(0, e._fall - dt);
        e.lt += dt * ((e.greet || e._fall > 0) ? 0 : 1);
        var tt = e.lt + e.phase;
        // current figure x within the canvas
        var figX = w / 2;
        if (spec.mode === 'paddlepair') {
          drawPaddlePair(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : spec.tone), shadow, dt, cr);
          return;
        }
        if (spec.mode === 'cartwheel') {
          drawCartwheel(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : spec.tone), shadow, dt, cr);
          return;
        }
        if (spec.mode === 'dogfetch') {
          drawDogFetch(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : 5), shadow, dt, cr);
          return;
        }
        if (spec.mode === 'kite') {
          drawKite(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : (spec.tone + 2) % 6), shadow, dt, cr);
          return;
        }
        if (spec.mode === 'yoyo') {
          drawYoyo(e, ctx, w, h, feetY, tt, figColor(spec.tone), figColor(spec.tone2 != null ? spec.tone2 : (spec.tone + 2) % 6), shadow, dt, cr);
          return;
        }
        if (spec.mode === 'patrol') {
          var pad = 70, span = w - pad * 2;
          var u = (tt * spec.speed / span) % 2; if (u < 0) u += 2;
          e._tri = u < 1 ? u : 2 - u;
          e._dirR = u < 1;
          figX = pad + e._tri * span;
        }
        // hover: stop, look at you curiously, wave — then go about the day
        if (hoverable) {
          if (Math.abs(mx - (cr.left + figX)) < 36 && my > cr.top + h - 92 && my < cr.top + h + 6) {
            if (!e.greet) e.greet = 0.001;
            e.linger = 1.6;
          } else if (e.greet) {
            e.linger -= dt;
            if (e.linger <= 0) { e.greet = 0; e._meet = false; }
          }
        }

        if (spec.mode === 'why') {
          var color = spec.color === '--yellow' ? figColor(2) : cssVar(spec.color, ink);   // legible gold instead of faint --yellow
          var anim = A[spec.anim];
          var ws = 0.62;
          // ground line shared with the standing why-figures (their feet land at ~h-8);
          // seat the chair Bobit so its castor base (~68px below pelvis, local) rests on it
          var py0 = anim.chair ? (h - 8 - 68 * ws) : anim.seated ? (h - 10 - 8 * ws) : (h - 8 - 112 * ws);
          // desk extends to the right of the figure, so nudge the origin left to center the scene
          var ox = anim.chair ? (w / 2 - 18) : w / 2;
          if (anim.seated && !anim.chair) {
            // simple bench under the seated figure
            ctx.fillStyle = cssVar('--border', '#E5E7EB');
            ctx.fillRect(w / 2 - 16, h - 10, 32, 8);
          }
          // furniture (desk/chair) drawn in a muted neutral; screen picks up --bg
          var furn = cssVar('--border', '#B4B0A6');
          drawFig(ctx, ox, py0, ws, false, anim.frame(tt),
            { color: color, swirl: anim.swirl, laptop: anim.laptop, book: anim.book, time: tt,
              chair: anim.chair, desk: anim.desk, chairColor: furn, deskColor: furn,
              screenColor: cssVar('--bg', '#FFFFFF') });
          return;
        }
        if (spec.mode === 'banner') {
          // sits on the banner's bottom edge, legs dangling over the page,
          // head tracking your cursor
          var sB = 0.24;
          var edgeYB = h - 30;                       // banner bottom edge in canvas coords
          var poseBn = A.sit.frame(tt);
          if (mx > -9000) {
            var dxB = mx - (cr.left + w / 2);
            poseBn.headTilt = Math.max(-38, Math.min(38, -dxB * 0.12));
          }
          drawFig(ctx, w / 2, edgeYB - 8 * sB, sB, false, poseBn, { color: col });
          return;
        }
        if (spec.mode === 'crosser') {
          if (!e.active) {
            e.wait -= dt;
            if (e.wait <= 0) {
              var gaits = ['stroll', 'shuffle', 'strut', 'scurry', 'trudge', 'sneak', 'march'];
              var dirC = Math.random() < 0.5 ? 1 : -1;
              var g = gaits[Math.floor(Math.random() * gaits.length)];
              e.active = {
                dir: dirC,
                x: dirC > 0 ? -50 : w + 50,
                gait: g,
                speed: g === 'scurry' ? 120 : (g === 'trudge' || g === 'shuffle' || g === 'sneak' ? 34 : 55),
                ciX: Math.floor(Math.random() * 3)
              };
            }
            return;
          }
          var av = e.active;
          // hover: stop and greet, then carry on
          if (Math.abs(mx - av.x) < 36 && my > cr.top + h - 92 && my < cr.top + h + 6) {
            if (!e.greet) e.greet = 0.001;
            e.linger = 1.6;
          } else if (e.greet) {
            e.linger -= dt;
            if (e.linger <= 0) e.greet = 0;
          }
          if (!e.greet) av.x += av.dir * av.speed * dt;
          if (av.x < -60 || av.x > w + 60) {
            e.active = null;
            e.greet = 0;
            e.wait = 14 + Math.random() * 22;   // next wanderer in a while
            return;
          }
          var colC = figColor(av.ciX);
          R.drawShadow(ctx, av.x, feetY, 16, shadow);
          var animC = e.greet ? A.greet : A[av.gait];
          drawFig(ctx, av.x, feetY - 112 * S, S, e.greet ? false : av.dir < 0, animC.frame(e.greet ? e.greet : tt), { color: colC });
          return;
        }
        if (spec.mode === 'stand') {
          if (spec.balance) { drawBalancer(e, ctx, w, h, feetY, tt, col, shadow, dt); return; }
          if (spec.peeker) { drawPeeker(e, ctx, w, h, feetY, tt, col, shadow, dt, cr); return; }
          var oyS = feetY - 112 * S;
          if (spec.presenter) {
            R.drawShadow(ctx, w / 2, feetY, 16, shadow);
            if (e.greet) {
              drawFig(ctx, w / 2, oyS, S, true, A[spec.hoverAnim || 'greet'].frame(e.greet, e._wave), { color: col });
            } else if (featureOn) {
              // aim a straight arm directly at the highlighted tool's on-screen position
              var ox = cr.left + w / 2, oy = cr.top + oyS - 26;   // ~shoulder
              var Adeg = Math.atan2(-(featureCX - ox), (featureCY - oy)) * 180 / Math.PI;
              var pp = Object.assign({}, R.REST);
              pp.lean = -3; pp.headTilt = -8; pp.bob = 1 + Math.sin(tt * 2) * 1.2;
              pp.armRU = Adeg - pp.lean; pp.armRF = Adeg - pp.lean + Math.sin(tt * 3) * 2;
              pp.armLU = -12; pp.armLF = -7;              // other arm at his side
              drawFig(ctx, w / 2, oyS, S, true, pp, { color: col });
            } else {
              drawFig(ctx, w / 2, oyS, S, true, A.standstill.frame(tt), { color: col });   // arms at side while the EV logo is up
            }
            return;
          }
          var animSt, ptSt, flipSt = false;
          if (spec.hover === 'jump') {
            if (e.greet) { animSt = A.jump; ptSt = e.greet; }
            else if (e.wave > 0) { e.wave += dt; if (e.wave > 2.2) e.wave = 0; animSt = A.greet; ptSt = e.wave; }  // greets the walker (starts before he stops)
            else { animSt = A.standstill; ptSt = tt; }
          }
          else { animSt = e.greet ? A[spec.hoverAnim || 'greet'] : A[spec.anim]; ptSt = e.greet ? e.greet : tt; }
          R.drawShadow(ctx, w / 2, feetY, 16, shadow);
          drawFig(ctx, w / 2, oyS, S, flipSt, animSt.frame(ptSt, e._wave), { color: col, paddle: animSt.paddle, time: tt });
          return;
        }
        if (spec.mode === 'seat') {
          if (spec.phone) { drawPhoneSeat(e, ctx, w, h, tt, col, dt); return; }
          var animSe = e.greet ? A.greetseat : A[spec.anim];
          var ptSe = e.greet ? e.greet : tt;
          var seatY = h - 42;   // matches the seat line set in reposition(); leaves room for dangling legs
          drawFig(ctx, w / 2, seatY, S, spec.x > 0.5, animSe.frame(ptSe, e._wave), { color: col, book: (!e.greet && spec.anim === 'read') });
          return;
        }
        if (spec.mode === 'patrol') {
          var SEQ = 4.5;   // toddler fall-and-recover length (matches SEQ_FALL in the rig)
          // toddler in front (adult trails); click him -> he falls, the parent scoops him back up
          if (spec.toddler) {
            var TS = S * 0.62;
            var tTgt = (e._dirR ? 1 : -1) * 48;                       // leads farther ahead, so the adult is clearly behind
            e._toff = (e._toff == null) ? tTgt : e._toff + (tTgt - e._toff) * Math.min(1, dt * 5);
            var toddX = figX + e._toff;
            e._toddSX = cr.left + toddX; e._toddSY = cr.top + feetY - 26;   // for click hit-testing
            pushBeacon(cr.left + toddX, cr.top + feetY, e._fall > 0 ? 'collapse' : 'walk');   // toddler toddling/tumbling below
            var totCol = figColor(spec.toddlerTone != null ? spec.toddlerTone : 1);
            var standYtot = feetY - 112 * TS, groundYtot = feetY - 8 * TS;
            R.drawShadow(ctx, toddX, feetY, 10, shadow);
            if (e._fall > 0) {
              var ft = SEQ - e._fall;                                 // elapsed
              var ky;                                                 // 0 standing .. 1 on the ground
              if (ft < 0.7) ky = smooth01(ft / 0.7);                  // topple down (slow)
              else if (ft < SEQ - 0.9) ky = 1;                        // sit
              else ky = 1 - smooth01((ft - (SEQ - 0.9)) / 0.9);       // lifted back to standing
              drawFig(ctx, toddX, standYtot + (groundYtot - standYtot) * ky, TS, !e._dirR, A.fall.frame(ft), { color: totCol });
            } else {
              var totAnim = spec.toddlerStyle === 'march' ? A.toddlemarch : A.toddle;
              drawFig(ctx, toddX, standYtot, TS, !e._dirR, totAnim.frame(tt * 1.1 + 1.7), { color: totCol });
            }
          }
          R.drawShadow(ctx, figX, feetY, 16, shadow);
          var animP, ptP, flipP, parentX = figX;
          if (spec.toddler && e._fall > 0) {
            var ft2 = SEQ - e._fall;
            animP = A.scold; ptP = ft2;
            flipP = e._dirR ? false : true;                           // face the fallen kid (ahead in travel dir)
            var reach = ft2 < 1.8 ? 0 : smooth01((ft2 - 1.8) / 1.2);  // step toward the kid to reach him
            parentX = figX + e._toff * 0.5 * reach;
          } else {
            animP = e.greet ? A[spec.hoverAnim || 'greet'] : A[spec.anim];
            ptP = e.greet ? e.greet : tt;
            // when greeting, face the viewer — unless it's the footer meet, then turn to face the stander (left)
            flipP = e.greet ? (e._meet ? true : false) : !e._dirR;
          }
          var pPose = animP.frame(ptP, e._wave);
          if (spec.toddler && spec.toddlerStyle === 'march' && !e.greet && !e._fall) {
            pPose.armRU = Math.max(pPose.armRU, 44); pPose.armLU = Math.min(pPose.armLU, -44);   // catch-ready
          }
          drawFig(ctx, parentX, feetY - 112 * S, S, flipP, pPose, { color: col, cane: animP.cane });
          pushBeacon(cr.left + parentX, cr.top + feetY, 'walk');   // a walker passing below the peeker
          return;
        }
        if (spec.mode === 'beam') {
          // The crew hauls a load ALL the way off one edge, dwells off-screen,
          // then walks back carrying the other load (red ball ↔ yellow line).
          // Start load is randomized so the line shows up right away ~half the time
          // (otherwise you'd wait a full ~28s off-screen traverse to see it swap).
          var speedB = 30, halfGap = 24, endMargin = 110;
          if (e.bx == null) { e.bx = w * 0.5; e.dir = 1; e.load = pick(BEAM_LOADS); e.lastLoad = e.load; e.lastAction = e.load; e.lastSpecial = pick(['light', 'letters']); e.carryRun = 1; e.dwell = 0; e.scene = 'carry'; }   // open mid-screen with a carry; a special follows soon
          // some passes run a solo gag instead of the two-carry: the "light went out" fix, or the letter carriers
          if (e.scene === 'light') { runLightGag(e, ctx, w, h, feetY, tt, col, shadow, cr, dt); return; }
          if (e.scene === 'letters') { runLetters(e, ctx, w, h, feetY, tt, shadow, dt, cr); return; }
          var fx = e.bx + e.dir * halfGap;      // front (leading) carrier
          var bx2 = e.bx - e.dir * halfGap;     // back carrier
          // hover: a carrier drops his end (line only) and waves; partner holds, annoyed
          var nearF = Math.abs(mx - (cr.left + fx)) < 36;
          var nearB = Math.abs(mx - (cr.left + bx2)) < 36;
          var inY = my > cr.top + h - 92 && my < cr.top + h + 6;
          // ── ball gag: hovering while carrying the CIRCLE drops it on the front guy's foot ──
          if (e.load === 'circle' && (nearF || nearB) && inY && !e.gagOn) { e.gagOn = true; e.gagT = 0; e.gF = fx; e.gB = bx2; e.gdir = e.dir; e.gBackChase = -1; }
          if (e.gagOn) {
            e.gagT += dt; var gt = e.gagT, gdir = e.gdir, ballR = 16;
            var carryYg = feetY - 97 * S, footYg = feetY - 6;
            var LAND = 0.5, CHASE_F = 3.4;
            var edgeX = gdir > 0 ? -70 : w + 70;   // trailing edge the ball rolls toward
            var ballX, ballY;
            if (gt < LAND) { ballX = e.gF; ballY = carryYg + (footYg - ballR - carryYg) * smooth01(gt / LAND); }   // drops onto his foot
            else { var rt = gt - LAND; ballX = e.gF - gdir * (130 * rt + 24 * rt * rt); ballY = footYg - ballR; }   // then rolls FAST — off the edge before anyone gives chase
            // the unhurt (back) guy holds off until the ball is ~halfway between him and the edge, so it can roll longer
            var halfway = (e.gB + edgeX) / 2;
            if (e.gBackChase < 0 && ((gdir > 0 && ballX <= halfway) || (gdir < 0 && ballX >= halfway))) e.gBackChase = gt;
            // front guy: carries as it falls → hops clutching his foot → head comes UP to watch it
            // get away → turns and eases into the chase (pose blended, no hard pop)
            var frontX = e.gF, frontPose, frontFlip = gdir < 0;
            if (gt < LAND) frontPose = A.carry.frame(tt);
            else {
              var pain = A.painhop.frame(gt - LAND);
              var lookUp = smooth01((gt - 1.7) / 0.9);              // gaze lifts from the foot (1.7s) to fully up (2.6s)
              pain.headTilt = -22 + lookUp * 40;                    // -22 (down at the foot) → +18 (up, after the ball)
              frontFlip = lookUp < 0.5 ? (gdir < 0) : (gdir > 0);   // turns around to face it as he looks up
              if (gt < CHASE_F) {
                frontPose = pain;
              } else {
                var ct = gt - CHASE_F;
                var k = smooth01(ct / 0.6);                         // ease the pain stance into the run over 0.6s
                frontX = e.gF - gdir * (52 * ct + 24 * ct * ct) * smooth01(ct / 0.5);   // ramp speed up from a standstill
                frontPose = lerpPose(pain, A.scurry.frame(gt), k);
                frontFlip = gdir > 0;
                // limp for the first several steps: heavily favor the yanked (right) foot — a stiff
                // knee, a short hobbling step, and a big downward lurch each time it bears weight
                var limp = Math.max(0, 1 - ct / 2.4);
                if (limp > 0) {
                  var plant = Math.max(0, -Math.sin(gt * 4.6 * Math.PI));   // injured (right) foot bearing weight
                  frontPose.legRF += limp * 42;                            // very stiff injured knee (barely bends)
                  frontPose.legRU -= limp * 12;                            // short, hobbling step
                  frontPose.bob += limp * plant * 12;                      // big downward lurch onto it
                  frontPose.lean += limp * plant * 6;                      // pitches forward as he favors it
                  frontPose.headTilt += limp * (5 + plant * 9);            // head dips with each hobble
                }
              }
            }
            // back guy: keeps carrying, then TORN (looks friend<->ball), then chases once the ball is halfway to the edge
            var backX = e.gB, backPose, backFlip = gdir < 0;
            if (gt < LAND) backPose = A.carry.frame(tt + 0.16);
            else if (e.gBackChase < 0) backPose = A.holdannoyed.frame(gt - LAND);
            else { var bt = gt - e.gBackChase; backX = e.gB - gdir * (64 * bt + 28 * bt * bt); backPose = A.scurry.frame(gt); backFlip = gdir > 0; }
            ctx.fillStyle = cssVar('--coral', '#FF5740');
            ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2); ctx.fill();
            R.drawShadow(ctx, frontX, feetY, 15, shadow); R.drawShadow(ctx, backX, feetY, 15, shadow);
            drawFig(ctx, frontX, feetY - 112 * S, S, frontFlip, frontPose, { color: col });
            drawFig(ctx, backX, feetY - 112 * S, S, backFlip, backPose, { color: col });
            // respawn only once BOTH carriers have run the whole way off the trailing edge (not when the ball leaves)
            var gone = function (x) { return gdir > 0 ? (x < -70) : (x > w + 70); };
            if ((gone(frontX) && gone(backX)) || gt > 16) {
              e.gagOn = false; e.greet = 0; e.wF = e.wB = false;
              e.dir = gdir; e.bx = gdir > 0 ? -endMargin : w + endMargin; e.dwell = 0.8;
            }
            return;
          }
          if ((nearF || nearB) && inY) {
            if (!e.greet) e.greet = 0.001;
            if (nearF) e.wF = true;
            if (nearB) e.wB = true;
            e.linger = 2.0;
          } else if (e.greet) {
            e.linger -= dt;
            if (e.linger <= 0) {
              if (e.load === 'line' && (e.dF > 0.25 || e.dB > 0.25)) e._pickup = 1.2;   // bend down & lift, don't snap
              e.greet = 0; e.wF = e.wB = false;
            }
          }
          if (e._pickup > 0) e._pickup = Math.max(0, e._pickup - dt);
          // advance (frozen while greeting, picking up, or dwelling off-screen); swap load at each off-screen turn
          if (!e.greet && !(e._pickup > 0)) {
            if (e.dwell > 0) e.dwell -= dt;
            else {
              e.bx += e.dir * speedB * dt;
              if (e.bx > w + endMargin) { e.dir = -1; beamPick(e, w); }
              else if (e.bx < -endMargin) { e.dir = 1; beamPick(e, w); }
            }
            fx = e.bx + e.dir * halfGap; bx2 = e.bx - e.dir * halfGap;
          }
          var goingR = e.dir > 0;
          // drop/raise each end (line load only — a rigid triangle isn't dropped)
          e.dF = e.dF || 0; e.dB = e.dB || 0;
          var kB = Math.min(1, dt * 6), dropOK = e.load === 'line';
          e.dF += (((e.greet && e.wF && dropOK) ? 1 : 0) - e.dF) * kB;
          e.dB += (((e.greet && e.wB && dropOK) ? 1 : 0) - e.dB) * kB;
          var carryY = feetY - 97 * S, groundY = feetY - 3;
          if (e.load === 'triangle') {
            // logo-style red triangle: tip forward, a MEDIUM notch bitten out of the mid back edge
            var baseX = bx2, tipX = fx + e.dir * 4, cyT = carryY, halfT = 18, notch = 11;
            ctx.fillStyle = cssVar('--coral', '#FF5740');
            ctx.beginPath();
            ctx.moveTo(baseX, cyT - halfT);            // top back corner
            ctx.lineTo(tipX, cyT);                     // tip
            ctx.lineTo(baseX, cyT + halfT);            // bottom back corner
            ctx.lineTo(baseX, cyT + notch);            // up the flat base to the notch
            ctx.arc(baseX, cyT, notch, Math.PI / 2, -Math.PI / 2, true);  // medium semicircle bite
            ctx.lineTo(baseX, cyT - halfT);            // remaining flat base up to the top corner
            ctx.closePath(); ctx.fill();
          } else if (e.load === 'circle') {
            // the logo's red circle
            ctx.fillStyle = cssVar('--coral', '#FF5740');
            ctx.beginPath(); ctx.arc((fx + bx2) / 2, carryY, 16, 0, Math.PI * 2); ctx.fill();
          } else {   // line load
            ctx.strokeStyle = figColor(2);   // legible gold on light, bright yellow on dark
            ctx.lineWidth = 5; ctx.lineCap = 'round';
            if (e._pickup > 0) {
              // being picked up: front lifts first, back hitches a beat behind → the line tilts as it rises
              var peF = 1.2 - e._pickup, liftF = peF < 0.6 ? 0 : (peF - 0.6) / 0.6;
              var peB2 = Math.max(0, peF - 0.2), liftB = peB2 < 0.6 ? 0 : (peB2 - 0.6) / 0.6;
              var yLF = groundY + (carryY - groundY) * smooth01(liftF);
              var yLB = groundY + (carryY - groundY) * smooth01(liftB);
              ctx.beginPath(); ctx.moveTo(fx + e.dir * 12, yLF); ctx.lineTo(bx2 - e.dir * 12, yLB); ctx.stroke();
            } else {
              var yF = carryY + (groundY - carryY) * e.dF;
              var yB = carryY + (groundY - carryY) * e.dB;
              ctx.beginPath(); ctx.moveTo(fx + e.dir * 12, yF); ctx.lineTo(bx2 - e.dir * 12, yB); ctx.stroke();
            }
          }
          R.drawShadow(ctx, fx, feetY, 15, shadow);
          R.drawShadow(ctx, bx2, feetY, 15, shadow);
          var poseF, poseB, flipF = !goingR, flipB = !goingR;
          if (e._pickup > 0) {
            // they crouch differently and lift out of sync: front hinges & lifts, back squats a hitch behind
            var peP = 1.2 - e._pickup;
            poseF = A.heave.frame(peP); poseB = A.heave2.frame(Math.max(0, peP - 0.2));
          } else if (e.greet) {
            var holdPose = A.holdannoyed.frame(e.greet);
            poseF = e.wF ? A.greet.frame(e.greet, { hand: 'R', hz: 1.5 }) : holdPose;
            poseB = e.wB ? A.greet.frame(e.greet, { hand: 'L', hz: 1.95 }) : holdPose;
            flipF = e.wF ? false : (bx2 < fx);   // holder turns toward his partner
            flipB = e.wB ? false : (fx < bx2);
          } else {
            poseF = A.carry.frame(tt);
            poseB = A.carry.frame(tt + 0.16);
          }
          drawFig(ctx, fx, feetY - 112 * S, S, flipF, poseF, { color: col });
          drawFig(ctx, bx2, feetY - 112 * S, S, flipB, poseB, { color: col });
          return;
        }
        if (spec.mode === 'vclimb') {
          // Climb UP (limbs synced to the rise, so each pull ratchets him up a notch),
          // pause at the top, then RAPPEL down in kick-off bounces (limb cycle reversed).
          var topY = 48, botY = h - 46, travel = botY - topY;
          var STEPS = 5;
          var upDur = STEPS * 1.7, topPause = 0.6, downDur = 1.9;
          var Tc = upDur + topPause + downDur;
          var phc = ((tt % Tc) + Tc) % Tc;
          var y3, poseC;
          if (phc < upDur) {
            var pu = phc / upDur;
            poseC = A.climb.frame(phc);                         // limbs cycle in real time
            var sp = pu * STEPS;                                // ratchet: body bumps up once per limb cycle
            y3 = botY - ((Math.floor(sp) + smooth01(sp - Math.floor(sp))) / STEPS) * travel;
          } else if (phc < upDur + topPause) {
            y3 = topY; poseC = A.climb.frame(upDur);            // reached the top, brief settle
          } else {
            var pd = (phc - upDur - topPause) / downDur;        // 0..1 descent
            poseC = A.climb.frame(upDur - pd * downDur * 2.2);  // reverse the limb cycle → reaching downward
            var seg = pd * 2, si = Math.floor(seg), sf = seg - si;
            y3 = topY + ((si + (1 - (1 - sf) * (1 - sf))) / 2) * travel;   // two kick-off drops
          }
          drawFig(ctx, w / 2, y3, S, false, poseC, { color: col });
          return;
        }
        if (spec.mode === 'rope') {
          // Two-step: he sits on a horizontal frame bar; click BREAKS it and he grabs
          // the rope and dangles; then clicking/pushing him swings him (pendulum).
          var pivotX = 250, barY = 46, barLen = 145;   // pivot far right (over the chasm); frame extends LEFT
          var grey = cssVar('--border', '#C9C6BE');
          ctx.strokeStyle = grey; ctx.lineCap = 'round';
          e.rphase = e.rphase || 'sit';
          var handAbove = 148 * S;                        // hands sit this far above the pelvis in the rope pose

          if (e.rphase === 'sit') {
            ctx.lineWidth = 4;
            // starter reads as one flat bar (level with the "03 / Talks" bar) — no vertical riser on the right
            ctx.beginPath(); ctx.moveTo(pivotX, barY); ctx.lineTo(pivotX - barLen, barY); ctx.stroke();   // frame extends LEFT, flat
            var sitX = pivotX - barLen + 16;              // he sits on the LEFT end
            e._ropeSX = cr.left + sitX; e._ropeSY = cr.top + barY + 18;
            drawFig(ctx, sitX, barY, S, false, A.sit.frame(tt, e._wave), { color: col });
            return;
          }

          // swingAng = rope's angle LEFT of straight-down. break: 90deg->0 (swings down & right); hang: pendulum
          var swingAng, bow = 0;
          if (e.rphase === 'break') {
            e.breakT = (e.breakT || 0) + dt;
            var bk = Math.min(1, e.breakT / 0.85);
            swingAng = (Math.PI / 2) * (1 - smooth01(bk));
            if (bk >= 1) { e.rphase = 'hang'; e.ang = 0; e.vel = 0; e.scramble = 1; }   // grabs on, startled
          } else {
            e.ang = e.ang || 0; e.vel = e.vel || 0;
            e.vel += (-9 * e.ang - 0.9 * e.vel) * dt;
            e.ang += e.vel * dt;
            if (e.scramble > 0) e.scramble = Math.max(0, e.scramble - dt / 1.1);
            swingAng = e.ang;
            bow = Math.max(-22, Math.min(22, e.vel * 9));
          }
          var handX = pivotX - Math.sin(swingAng) * barLen;
          var handY = barY + Math.cos(swingAng) * barLen;
          ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(pivotX, 0); ctx.lineTo(pivotX, barY); ctx.stroke();                 // suspender stays
          ctx.beginPath(); ctx.moveTo(pivotX, barY);
          ctx.quadraticCurveTo((pivotX + handX) / 2 + bow, (barY + handY) / 2, handX, handY); ctx.stroke();
          var poseR = A.rope.frame(tt);
          if (e.scramble > 0) {
            var scr = e.scramble, fl = Math.sin(tt * 34);
            poseR.legRF += fl * 28 * scr; poseR.legLF += -fl * 28 * scr;
            poseR.headTilt += Math.sin(tt * 27) * 12 * scr; poseR.bob += Math.sin(tt * 31) * 3 * scr;
          }
          e._ropeSX = cr.left + handX; e._ropeSY = cr.top + handY + 40;   // hit test tracks the swing
          drawFig(ctx, handX, handY + handAbove, S, false, poseR, { color: col });   // hangs UPRIGHT below his hands
          return;
        }
      });
    }

    reposition();
    setInterval(tick, 1000 / 50);
    setInterval(reposition, 700);
    window.addEventListener('resize', reposition);

    // opt-in debug handle (no effect unless the page is loaded with #figdebug)
    if (location.hash === '#figdebug') window.__evFigDebug = { entries: entries, footWalk: footWalk, footStand: footStand };
  });
})();
