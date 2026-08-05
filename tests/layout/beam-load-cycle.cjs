// The beam crew's pass picker. Two invariants have to survive adding a third load:
//
//   1. Every load in BEAM_LOADS actually gets a turn. A cycle that silently never yields one of
//      them would leave that whole feature invisible while every other assertion stayed green.
//   2. No action ever repeats back to back — loads and specials alike. That is what the original
//      two-element flip-flop bought, and a naive `pick(BEAM_LOADS)` would throw it away.
//
// Deliberately parameterised on BEAM_LOADS rather than naming the loads, so this keeps covering the
// set as it changes instead of needing an edit each time one is added.
//
// Drives the REAL beamPick through the debug hook. Re-implementing or regex-extracting it would test
// a copy, which is exactly the thing that cannot regress.
//
// Needs Playwright, which is not a repo dependency:
//   NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
//     node tests/layout/beam-load-cycle.cjs
const { chromium } = require('playwright');
const assert = require('assert');

const URL = 'file:///C:/ev-landing/ev-landing-main/index.html#figdebug';
const PASSES = 400;
const SPECIALS = ['light', 'letters'];

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/*', function (r) {
    return /^https?:/.test(r.request().url()) ? r.abort() : r.continue();
  });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__evFigDebug; });

  const r = await page.evaluate(function (passes) {
    var d = window.__evFigDebug;
    if (typeof d.beamPick !== 'function') return { missing: 'beamPick' };
    if (!d.beamLoads) return { missing: 'beamLoads' };
    // A throwaway entry, so pinning it does not disturb the crew actually on the page. Seeded the
    // way the real one is at line "if (e.bx == null)".
    var e = {
      dir: 1, bx: 0, lastLoad: d.beamLoads[0], lastAction: d.beamLoads[0],
      lastSpecial: 'light', carryRun: 1, scene: 'carry', load: d.beamLoads[0]
    };
    var seq = [];
    for (var i = 0; i < passes; i++) { d.beamPick(e, 1280); seq.push(e.lastAction); }
    var real = d.beamLoads.slice();

    // Second phase: prove the rotation actually GENERALISES past the length BEAM_LOADS happens to
    // have today. beamLoads is exposed by reference, so appending a probe load exercises the real
    // picker at n+1 without waiting for a new load to be wired up. Without this, a picker that
    // still only ever alternated two loads would pass every assertion above.
    d.beamLoads.push('__probe__');
    var e2 = {
      dir: 1, bx: 0, lastLoad: real[0], lastAction: real[0],
      lastSpecial: 'light', carryRun: 1, scene: 'carry', load: real[0]
    };
    var seq2 = [];
    for (var j = 0; j < passes; j++) { d.beamPick(e2, 1280); seq2.push(e2.lastAction); }
    d.beamLoads.pop();

    return { loads: real, seq: seq, probeLoads: real.concat(['__probe__']), seq2: seq2 };
  }, PASSES);

  assert.ok(!r.missing, '__evFigDebug.' + r.missing + ' is not exposed');

  const counts = {};
  r.seq.forEach(function (a) { counts[a] = (counts[a] || 0) + 1; });

  const missed = r.loads.filter(function (l) { return !counts[l]; });
  assert.deepStrictEqual(missed, [],
    'these loads never came up in ' + PASSES + ' passes, so they would never be seen: ' +
    missed.join(', ') + ' (saw ' + JSON.stringify(counts) + ')');

  for (let i = 1; i < r.seq.length; i++) {
    assert.notStrictEqual(r.seq[i], r.seq[i - 1],
      'action "' + r.seq[i] + '" repeated back to back at pass ' + i +
      ' — the picker is meant to never repeat');
  }

  // the specials must still come around; the carry<->special alternation is the point of carryRun
  const missedSpecials = SPECIALS.filter(function (s) { return !counts[s]; });
  assert.deepStrictEqual(missedSpecials, [],
    'the specials stopped happening: ' + missedSpecials.join(', ') +
    ' (saw ' + JSON.stringify(counts) + ')');

  // and no load should be starved relative to its siblings — a cycle that heavily favours one
  // would technically pass the "gets a turn" check while barely ever showing the others
  const loadCounts = r.loads.map(function (l) { return counts[l]; });
  const lo = Math.min.apply(null, loadCounts), hi = Math.max.apply(null, loadCounts);
  assert.ok(hi / lo < 2.5,
    'loads are unevenly distributed (' + JSON.stringify(counts) + ') — one is being starved');

  // ── the generalisation phase: same invariants with one more load in the pool ──
  const counts2 = {};
  r.seq2.forEach(function (a) { counts2[a] = (counts2[a] || 0) + 1; });

  const missed2 = r.probeLoads.filter(function (l) { return !counts2[l]; });
  assert.deepStrictEqual(missed2, [],
    'with ' + r.probeLoads.length + ' loads in the pool these never came up: ' + missed2.join(', ') +
    ' — the picker is still hardwired to a fixed number of loads rather than rotating BEAM_LOADS ' +
    '(saw ' + JSON.stringify(counts2) + ')');

  for (let i = 1; i < r.seq2.length; i++) {
    assert.notStrictEqual(r.seq2[i], r.seq2[i - 1],
      'with ' + r.probeLoads.length + ' loads, action "' + r.seq2[i] +
      '" repeated back to back at pass ' + i);
  }

  console.log('beam-load-cycle: PASS (' + PASSES + ' passes over [' + r.loads.join(', ') + '], ' +
    Object.keys(counts).map(function (k) { return k + '=' + counts[k]; }).join(' ') + ')');
  console.log('                 generalises to ' + r.probeLoads.length + ' loads: ' +
    Object.keys(counts2).map(function (k) { return k + '=' + counts2[k]; }).join(' '));
  await browser.close();
})();
