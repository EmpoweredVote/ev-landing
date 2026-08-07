// The burst takes the ONE Bobit who was grabbed. It does not take the people standing next to him.
//
// An entry is a canvas, and several entries draw more than one body on it — a patrol escorting a
// toddler, both paddle players, both letter carriers, the cartwheeler and his medic. The burst ended
// the whole ENTRY: `gone = true` and the canvas out of the DOM. So poofing the toddler deleted his
// parent in the same puff, with no smoke and no reason, and poofing one paddle player deleted his
// partner. The hold was already careful about this — 13-multibody and 16-body-identity cover it — and
// then the burst threw all of that away one frame later.
//
// What must happen instead: the victim goes, the survivors stay standing through the stun, and they
// run with everybody else when the room bolts. This asserts all three, in pixels.
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const RELOADS = 25;

function installProbe() {
  var PAL = document.documentElement.dataset.theme === 'dark'
    ? ['#1DA8C6', '#FF6B52', '#FFD740', '#43D07E', '#B49BFF', '#FF9A4D']
    : ['#007D99', '#FF5740', '#B8860B', '#2E9E5B', '#7A4FD0', '#E0641C'];
  var RGB = PAL.map(function (h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  });
  window.__band = function (e, x, halfW) {
    if (!e.c.parentNode) return { gone: true, tone: -1, px: 0, inkH: 0 };
    var sw = e.c.width, sh = e.c.height, rx = sw / e.w, ry = sh / e.h;
    var x0 = Math.max(0, Math.round((x - halfW) * rx));
    var w = Math.min(sw - x0, Math.round(halfW * 2 * rx));
    if (w <= 0) return { tone: -1, px: 0, inkH: 0 };
    var d;
    try { d = e.ctx.getImageData(x0, 0, w, sh).data; } catch (err) { return { err: String(err) }; }
    var counts = [0, 0, 0, 0, 0, 0], top = null, bot = null;
    for (var p = 0; p < d.length; p += 4) {
      if (d[p + 3] < 200) continue;
      var py = Math.floor((p / 4) / w);
      if (top == null) top = py;
      bot = py;
      var best = -1, bd = 1e9;
      for (var i = 0; i < 6; i++) {
        var dr = d[p] - RGB[i][0], dg = d[p + 1] - RGB[i][1], db = d[p + 2] - RGB[i][2];
        var dist = dr * dr + dg * dg + db * db;
        if (dist < bd) { bd = dist; best = i; }
      }
      if (bd < 3000) counts[best]++;
    }
    var tone = -1, tc = 0;
    for (var k = 0; k < 6; k++) if (counts[k] > tc) { tc = counts[k]; tone = k; }
    return { tone: tc > 20 ? tone : -1, px: tc, inkH: top == null ? 0 : (bot - top) / ry };
  };
}

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', r => /^https?:/.test(r.request().url()) ? r.abort() : r.continue());
  await page.goto(URL);
  await page.waitForFunction(() => !!window.__evFigDebug);
  await page.waitForTimeout(1150);
  await page.evaluate(installProbe);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  page.__errs = errs;
  return page;
}

// See 16-body-identity: a toddler is cast about one load in ten, and the draw reads the spec every
// frame, so hand one to whichever patrol the cast provided.
const adopt = page => page.evaluate(() => {
  let n = 0;
  for (const e of window.__evFigDebug.entries) {
    if (e.spec.mode !== 'patrol' || e.spec.toddler) continue;
    e.spec.toddler = true;
    e.spec.toddlerTone = ((e.spec.tone != null ? e.spec.tone : e.ci) + 3) % 6;
    e.spec.toddlerStyle = 'waddle';
    e._toff = null;
    n++;
  }
  return n;
});

// Poof body `which` of a multi-body entry for real — a right-button hold all the way through the
// 3s — and watch what is left of his entry at each phase after it.
async function run(browser, mode, which, needToddler) {
  const page = await open(browser);
  if (needToddler && !(await adopt(page))) { await page.close(); return null; }

  const i = await page.evaluate(([m, wantTot]) => {
    const d = window.__evFigDebug;
    for (let j = 0; j < d.entries.length; j++) {
      const e = d.entries[j];
      if (e.spec.mode !== m || e.gone || !e.w) continue;
      if (wantTot && !e.spec.toddler) continue;
      e.c.scrollIntoView({ block: 'center', behavior: 'instant' });
      return j;
    }
    return null;
  }, [mode, needToddler]);
  if (i == null) { await page.close(); return null; }
  await page.waitForTimeout(400);

  const before = await page.evaluate(([t, wh]) => {
    const e = window.__evFigDebug.entries[t];
    if (!e._bodies || e._bodies.length <= wh) return null;
    return {
      bodies: e._bodies.map(b => Object.assign(
        { x: b.x, small: !!b.small }, window.__band(e, b.x, b.small ? 12 : 15)))
    };
  }, [i, which]);
  if (!before) { await page.close(); return null; }
  const tones = before.bodies.map(b => b.tone);
  if (tones.some(t => t < 0) || new Set(tones).size < 2) { await page.close(); return null; }

  const pressed = await page.evaluate(([t, wh]) => {
    const d = window.__evFigDebug, e = d.entries[t];
    const r = e.c.getBoundingClientRect(), b = e._bodies[wh];
    for (let dy = 10; dy < 90; dy += 3) {
      if (d.bobitAt(r.left + b.x, r.top + b.floor - dy) === e) {
        document.dispatchEvent(new MouseEvent('mousedown', {
          button: 2, clientX: r.left + b.x, clientY: r.top + b.floor - dy, bubbles: true
        }));
        return true;
      }
    }
    return false;
  }, [i, which]);
  if (!pressed) { await page.close(); return null; }

  // The hold runs its full 3s; the victim's own x is read while he is still on the canvas.
  await page.waitForTimeout(1200);
  const held = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    return e.ab ? { victimX: e.abX, mates: (e.abMates || []).map(m => ({ x: m.x, small: !!m.small })) } : null;
  }, i);
  if (!held || !held.mates.length) { await page.close(); return null; }

  // ...through the burst and into the stun, where the whole room is frozen and easy to read.
  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'stunned', { timeout: 12000 });
  await page.waitForTimeout(150);

  const stunned = await page.evaluate(([t, v, ms]) => {
    const e = window.__evFigDebug.entries[t];
    return {
      gone: !!e.gone,
      inDom: !!e.c.parentNode,
      victim: window.__band(e, v, 16),
      mates: ms.map(m => window.__band(e, m.x, m.small ? 12 : 15))
    };
  }, [i, held.victimX, held.mates]);

  await page.waitForFunction(() => window.__evFigDebug.poof.phase === 'fleeing', { timeout: 12000 });
  await page.waitForTimeout(150);
  const fleeing = await page.evaluate(t => {
    const e = window.__evFigDebug.entries[t];
    if (e.gone) return { gone: true };
    const running = [];
    if (e.fl) running.push(Object.assign({ small: !!e.flSmall }, window.__band(e, e.flX, e.flSmall ? 12 : 16)));
    (e.flMates || []).forEach(m => running.push(Object.assign({ small: !!m.small }, window.__band(e, m.x, m.small ? 12 : 15))));
    return { gone: false, fl: e.fl || null, running };
  }, i);

  const cleared = await page.evaluate(() => new Promise(res => {
    const t0 = performance.now();
    (function step() {
      if (window.__evFigDebug.poof.phase === 'cleared') return res(true);
      if (performance.now() - t0 > 30000) return res(false);
      requestAnimationFrame(step);
    })();
  }));
  const errs = page.__errs.slice();
  await page.close();
  return { before, which, held, stunned, fleeing, cleared, errs };
}

function check(tag, r, victimIdx) {
  assert.deepStrictEqual(r.errs, [], tag + ': page errors');
  const victimTone = r.before.bodies[victimIdx].tone;
  const survivorTones = r.before.bodies.filter((b, k) => k !== victimIdx).map(b => b.tone).sort();

  assert.ok(!r.stunned.gone,
    tag + ': the entry was marked gone by the burst — it still has ' + survivorTones.length +
    ' body(s) on it who were not the ones taken');
  assert.ok(r.stunned.inDom,
    tag + ': the canvas was pulled out of the DOM by the burst, taking the survivors with it');
  assert.strictEqual(r.stunned.victim.px, 0,
    tag + ': the victim is still painted at x ' + r.held.victimX.toFixed(1) + ' after the burst');
  const stunTones = r.stunned.mates.map(m => m.tone).sort();
  assert.deepStrictEqual(stunTones, survivorTones,
    tag + ': through the stun the survivors should be standing in tones [' + survivorTones + '] ' +
    'but the canvas shows [' + stunTones + ']');
  assert.ok(stunTones.indexOf(victimTone) < 0,
    tag + ': the victim\'s tone ' + victimTone + ' is still on the canvas after he was taken');

  assert.ok(!r.fleeing.gone, tag + ': the entry was dropped before its survivors could flee');
  const fleeTones = r.fleeing.running.map(x => x.tone).sort();
  assert.deepStrictEqual(fleeTones, survivorTones,
    tag + ': the survivors should bolt in tones [' + survivorTones + '] but [' + fleeTones + '] ran');
  assert.ok(r.cleared, tag + ': the exodus never cleared — a survivor is holding the page open');
}

(async function () {
  const browser = await chromium.launch();

  // ── the reported case: poof the toddler, the parent must not go with him ────────────────────
  let tot = null;
  for (let n = 0; n < RELOADS && !tot; n++) tot = await run(browser, 'patrol', 1, true);
  assert.ok(tot, 'no cast in ' + RELOADS + ' loads offered a patrol to escort a toddler');
  check('toddler', tot, 1);

  // ── and the other way round: poof the parent, the toddler must not go with him ──────────────
  let par = null;
  for (let n = 0; n < RELOADS && !par; n++) par = await run(browser, 'patrol', 0, true);
  assert.ok(par, 'no cast in ' + RELOADS + ' loads offered a patrol to escort a toddler');
  check('parent', par, 0);

  // ── the same guarantee for a pair who are not a family ──────────────────────────────────────
  let pair = null;
  for (let n = 0; n < RELOADS && !pair; n++) {
    pair = await run(browser, 'paddlepair', 0, false) || await run(browser, 'cartwheel', 0, false);
  }
  assert.ok(pair, 'no cast in ' + RELOADS + ' loads put a paddle pair or a cartwheel pair on screen');
  check('pair', pair, 0);

  console.log('  toddler poofed: parent stood through the stun in tone ' + tot.stunned.mates[0].tone +
    ' and fled in tone ' + tot.fleeing.running[0].tone);
  console.log('  parent poofed:  toddler stood through the stun in tone ' + par.stunned.mates[0].tone +
    ' at ' + par.stunned.mates[0].inkH.toFixed(1) + 'px');
  console.log('  pair:           partner survived the burst in tone ' + pair.stunned.mates[0].tone);
  console.log('17-survivors: PASS');
  await browser.close();
})();
