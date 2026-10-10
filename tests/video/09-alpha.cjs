// The Resolve fallback: a single scene exported with a real alpha channel.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = 'C:/ev-landing/ev-landing-main';
const OUT = path.join(ROOT, 'tools/video/build/_alpha');

(async function () {
  fs.mkdirSync(OUT, { recursive: true });
  const { renderScene } = await import('file:///' + ROOT + '/tools/video/engine/render.mjs');

  const episode = { id: 'alpha', fps: 30, width: 320, height: 180 };
  const scene = {
    id: 'a', type: 'stage', vo: 'L001', dur: 0.5, frames: 15, accent: '#FFD426',
    cast: [{ at: [0.5, 0.9], anim: 'present', tone: 0, scale: 0.35 }]
  };

  const file = path.join(OUT, 'a.mov');
  await renderScene({ scene, episode, outFile: file, alpha: true });

  const pix = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=pix_fmt', '-of', 'default=nw=1:nk=1', file],
    { encoding: 'utf8' }).trim();
  // What matters is that the stream carries an alpha plane at all. The exact
  // depth is ffmpeg's to choose: ProRes 4444 is natively 12-bit, so asking for
  // yuva444p10le (as the plan did) silently gets you yuva444p12le.
  assert.ok(/^yuva/.test(pix), 'the export must carry an alpha channel, got ' + pix);

  // And the alpha must actually be transparent somewhere — a file can carry an
  // alpha plane that is opaque everywhere, which is useless in a Resolve cut
  // and passes every other check in this file.
  //
  // Read the alpha plane as raw gray8 bytes rather than asking ffmpeg's
  // signalstats: that filter reports in LIMITED range, where 4096 means fully
  // transparent and 60160 means fully opaque on a 16-bit plane, so a threshold
  // written against full range tests nothing you meant.
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1',
    '-vf', 'alphaextract,format=gray', '-f', 'rawvideo', '-'],
    { maxBuffer: 1 << 26 });
  assert.strictEqual(r.status, 0, 'alphaextract failed: ' + String(r.stderr).slice(-300));
  const a = r.stdout;
  assert.strictEqual(a.length, episode.width * episode.height,
    'one full alpha plane, got ' + a.length + ' bytes');
  let min = 255, max = 0;
  for (const v of a) { if (v < min) min = v; if (v > max) max = v; }
  assert.strictEqual(min, 0, 'the corners must be fully transparent, got min alpha ' + min);
  assert.ok(max > 200, 'the figure must be solid, got max alpha ' + max);

  console.log('PASS 09-alpha');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
