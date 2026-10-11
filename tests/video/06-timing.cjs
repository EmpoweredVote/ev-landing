// The drift test. Independently rounding each scene to whole frames is the
// obvious implementation and it is wrong: the errors accumulate instead of
// cancelling. These durations are chosen to round the same way every time.
const assert = require('assert');

const ROOT = 'C:/ev-landing/ev-landing-main';

function fakeTimings(n, dur, gap) {
  const lines = [];
  let clock = 0;
  for (let i = 1; i <= n; i++) {
    const id = 'L' + String(i).padStart(3, '0');
    lines.push({ id, text: 'line ' + i, start: clock, dur });
    clock += dur + gap;
  }
  return { gap, lines, total: clock };
}

(async function () {
  const { planFrames } = await import('file:///' + ROOT + '/tools/video/engine/timing.mjs');

  // 60 scenes, each 1.0333333s of speech plus a 0.45s gap. That span is exactly
  // 44.5 frames — the worst case for rounding. These numbers are chosen, not
  // arbitrary: verified by hand, cumulative rounding lands dead on 2670 frames
  // (0ms out) while independent per-scene rounding gives 2640 (a full second
  // out). A span that rounds cleanly would let the wrong implementation pass.
  const N = 60, DUR = 1.0333333, GAP = 0.45, FPS = 30;
  const timings = fakeTimings(N, DUR, GAP);
  const episode = {
    id: 'drift', fps: FPS, width: 1920, height: 1080,
    scenes: timings.lines.map(l => ({ id: 's-' + l.id, type: 'stage', vo: l.id }))
  };

  const planned = planFrames(episode, timings);
  assert.strictEqual(planned.length, N);

  // 1. Scenes are contiguous: no gap, no overlap, measured in FRAMES.
  let frame = 0;
  for (const s of planned) {
    assert.strictEqual(s.startFrame, frame, s.id + ' must start where the last one ended');
    assert.ok(s.frames >= 1, s.id + ' must be at least one frame long');
    frame += s.frames;
  }

  // 2. No cumulative drift. The last scene must end within ONE frame of the
  //    real voice track length, not within sixty.
  const endSeconds = frame / FPS;
  assert.ok(Math.abs(endSeconds - timings.total) <= 1 / FPS + 1e-9,
    'cumulative drift: picture ends at ' + endSeconds.toFixed(3) +
    's, voice at ' + timings.total.toFixed(3) + 's');

  // 3. Each scene's reported duration is the frame-aligned one, so the timing
  //    sheet and the render cannot disagree.
  for (const s of planned) {
    assert.ok(Math.abs(s.dur - s.frames / FPS) < 1e-9, s.id + ': dur must be frames/fps');
    assert.ok(Math.abs(s.end - s.start - s.dur) < 1e-9, s.id + ': start/end must match dur');
  }

  // 4. A scene naming a vo id that does not exist must abort and name it.
  const broken = { ...episode, scenes: [...episode.scenes, { id: 's-bad', type: 'stage', vo: 'L999' }] };
  assert.throws(() => planFrames(broken, timings), /L999/,
    'a missing vo id must throw and name itself');

  // 5. A scene with an explicit hold still gets whole frames.
  const held = { ...episode, scenes: [{ id: 'hold', type: 'title', vo: 'L001', hold: 2.5 }] };
  const h = planFrames(held, timings);
  assert.strictEqual(h[0].frames, Math.round((DUR + GAP + 2.5) * FPS),
    'a scene spans its line, the gap after it, and any explicit hold');

  console.log('PASS 06-timing');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
