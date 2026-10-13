// A re-split is never a no-op, and it must never be a silent one.
//
// Every in-scene second in episode.mjs and art.js is measured from its line's
// cut START. So a cut that moves invalidates every number written against that
// line — and episode 1 paid a session for exactly this: 27 seconds written
// against cuts that had moved, across two files, five of them found only in a
// final sweep after a build had already started.
//
// The danger is not that a re-split changes things. It is that nothing says so.
// Two ways it happens with no code change at all:
//
//  1. THE TRANSCRIPT IS NOT REPRODUCIBLE. Re-transcribing the Compass take with
//     the same model and the same file gave 1236 words where the committed cuts
//     came from 1220, with 246 words differing — and L020's cut ran 11.5s
//     longer. Nothing in the pipeline had changed.
//  2. A pipeline improvement lands. The repair pass recovers readings the
//     recogniser lost, which is the point of it, and a recovered reading can
//     legitimately move a cut.
//
// So the splitter compares what it is about to write with the _source.json
// already beside the build, and names every line that moved. This is the pure
// half of that; the file reading is in split.mjs.
const assert = require('assert');
const { pathToFileURL } = require('url');
const path = require('path');

const ROOT = 'C:/ev-landing/ev-landing-main';

(async function () {
  const { movedCuts } =
    await import(pathToFileURL(path.join(ROOT, 'tools/video/engine/repair.mjs')).href);

  // Nothing moved: the common case, and it must stay quiet.
  {
    const was = [{ id: 'L001', start: 1.0, end: 5.0 }, { id: 'L002', start: 6.0, end: 9.0 }];
    const now = [{ id: 'L001', start: 1.0, end: 5.0 }, { id: 'L002', start: 6.0, end: 9.0 }];
    assert.deepStrictEqual(movedCuts(was, now), []);
  }

  // A start that moved is reported with its delta, because the delta is what
  // tells you WHICH word to go and look for: subtract it from the old value to
  // find what that number used to mark.
  {
    const was = [{ id: 'L012', start: 190.55, end: 211.08 }];
    const now = [{ id: 'L012', start: 200.95, end: 211.08 }];
    const moved = movedCuts(was, now);
    assert.strictEqual(moved.length, 1);
    assert.strictEqual(moved[0].id, 'L012');
    assert.ok(Math.abs(moved[0].dStart - 10.40) < 0.01, 'got ' + moved[0].dStart);
    assert.strictEqual(moved[0].dEnd, 0);
  }

  // An end that moved counts too. Every second inside a scene is relative to
  // the START, but a line that got LONGER breaks any animation whose duration
  // was chosen against the old length — Compass L023's eighth spoke never
  // arrived because its line came out 0.46s shorter.
  {
    const was = [{ id: 'L020', start: 295.31, end: 305.82 }];
    const now = [{ id: 'L020', start: 295.31, end: 317.36 }];
    const moved = movedCuts(was, now);
    assert.strictEqual(moved.length, 1);
    assert.ok(Math.abs(moved[0].dEnd - 11.54) < 0.01, 'got ' + moved[0].dEnd);
  }

  // A move under one frame at 30fps is not a move. Rounding in and out of the
  // sheet produces these and reporting them teaches people to ignore the list.
  {
    const was = [{ id: 'L001', start: 1.000, end: 5.000 }];
    const now = [{ id: 'L001', start: 1.004, end: 4.998 }];
    assert.deepStrictEqual(movedCuts(was, now), []);
  }

  // A line that is new, or gone, is named rather than skipped. A line that
  // disappears is the silent desync the splitter exists to refuse.
  {
    const was = [{ id: 'L001', start: 1, end: 5 }, { id: 'L002', start: 6, end: 9 }];
    const now = [{ id: 'L001', start: 1, end: 5 }, { id: 'L003', start: 10, end: 12 }];
    const moved = movedCuts(was, now);
    const ids = moved.map(m => m.id + ':' + m.what).sort();
    assert.deepStrictEqual(ids, ['L002:gone', 'L003:new']);
  }

  // Nothing to compare against — a first split — is not a change.
  {
    assert.deepStrictEqual(movedCuts(null, [{ id: 'L001', start: 1, end: 5 }]), []);
    assert.deepStrictEqual(movedCuts([], [{ id: 'L001', start: 1, end: 5 }]), []);
  }

  // The biggest move is reported first: it is the one most likely to have
  // broken something, and whoever reads the list works down it.
  {
    const was = [{ id: 'L001', start: 1, end: 5 }, { id: 'L002', start: 6, end: 9 }];
    const now = [{ id: 'L001', start: 1.2, end: 5 }, { id: 'L002', start: 9, end: 12 }];
    const moved = movedCuts(was, now);
    assert.strictEqual(moved[0].id, 'L002', 'the 3s move must come before the 0.2s one');
  }

  console.log('PASS 17-resplit (movedCuts)');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
