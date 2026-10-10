// One scene in, one MP4 out, with the frame count the plan asked for. And the
// failure that matters: if ffmpeg dies part-way, the build must fail. A
// truncated MP4 plays its first half perfectly and looks like a success.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/ev-landing/ev-landing-main';
const OUT = path.join(ROOT, 'tools/video/build/_test');

function probe(file, entries) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', entries, '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  return out.trim().split('\n');
}

(async function () {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const { renderScene } = await import('file:///' + ROOT + '/tools/video/engine/render.mjs');

  const episode = { id: 'test', title: 'Test', accent: '#FFD426', fps: 30, width: 640, height: 360 };
  const scene = {
    id: 'fx', type: 'stage', vo: 'L001', dur: 1, frames: 30, startFrame: 0,
    accent: '#FFD426', headline: 'Hello',
    cast: [{ at: [0.5, 0.85], anim: 'stroll', tone: 0, scale: 0.6, path: [[0.3, 0.85], [0.7, 0.85]] }]
  };

  const file = path.join(OUT, 'scene.mp4');
  const res = await renderScene({ scene, episode, outFile: file });

  assert.ok(fs.existsSync(file), 'the MP4 must exist');
  assert.strictEqual(res.frames, 30, 'the renderer must emit exactly the planned frame count');
  const [w, h, nb] = probe(file, 'stream=width,height,nb_frames');
  assert.strictEqual(Number(w), 640, 'width');
  assert.strictEqual(Number(h), 360, 'height');
  assert.strictEqual(Number(nb), 30, 'the file must hold 30 frames, got ' + nb);

  // No PNG may be left behind. Frames are piped, never written.
  const strays = fs.readdirSync(OUT).filter(f => /\.png$/i.test(f));
  assert.deepStrictEqual(strays, [], 'no PNG frames may be written to disk: ' + strays.join(', '));

  // An ffmpeg that cannot possibly succeed must surface as a rejection.
  let failed = false;
  try {
    await renderScene({ scene, episode, outFile: path.join(OUT, 'nope.mp4'),
      ffmpegArgs: ['-c:v', 'definitely-not-a-codec'] });
  } catch (e) { failed = true; }
  assert.ok(failed, 'a failing ffmpeg must reject, not resolve with a truncated file');

  console.log('PASS 07-render');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
