// Orchestrates an episode: measure the voice, plan the frames, render the
// scenes that changed, join them, mux the scratch track, and write the two
// things a human reads — the timing sheet and the contact sheet.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseScript } from './script.mjs';
import { speak, loadTimings } from './voice.mjs';
import { planFrames, timingSheet } from './timing.mjs';
import { openStage, renderScene } from './render.mjs';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', c => c === 0 ? resolve() : reject(new Error(cmd + ' exited ' + c + ': ' + err.slice(-2000))));
  });
}

function sceneHash(scene, episode) {
  return createHash('sha1')
    .update(JSON.stringify({ scene, w: episode.width, h: episode.height, fps: episode.fps }))
    .digest('hex').slice(0, 16);
}

export async function buildEpisode(episodeDirIn, opts = {}) {
  // Absolute, always. ffmpeg's concat demuxer resolves relative entries in the
  // list against the LIST FILE's own directory, not the process cwd, so a list
  // written from a relative path doubles the prefix and nothing opens. The
  // documented CLI invocation passes a relative directory.
  const episodeDir = path.resolve(episodeDirIn);
  const episodeFile = path.join(episodeDir, 'episode.mjs');
  // Cache-bust the module so a rebuild in one process sees an edited episode.
  const mod = await import(pathToFileURL(episodeFile).href + '?v=' + Date.now());
  const episode = mod.default;

  const outDir = path.resolve(opts.outDir || path.join(episodeDir, '..', '..', 'build', episode.id));
  const sceneDir = path.join(outDir, 'scenes');
  await mkdir(sceneDir, { recursive: true });

  if (opts.voice) {
    const lines = parseScript(await readFile(path.join(episodeDir, 'script.md'), 'utf8'));
    await speak(lines, outDir, opts);
  }
  const timings = await loadTimings(outDir);
  // A scene inherits the episode's accent unless it overrides it. Applied
  // BEFORE hashing, so changing the episode accent re-renders every scene that
  // relied on it. Without this every scene would have to repeat the pillar
  // colour, and the one that forgot would render in the default grey with
  // nothing in the output to say so.
  const planned = planFrames(episode, timings)
    .map(s => (s.accent ? s : { ...s, accent: episode.accent }));

  // Load order matters: screen.js defines the data URIs that art.js reads at
  // registration time, so it must come first. An explicit list beats globbing,
  // which would silently depend on alphabetical ordering.
  const artFiles = ['screen.js', 'art.js']
    .map(f => path.join(episodeDir, f))
    .filter(existsSync);

  // Which scenes need rendering: the ones whose hash has no file.
  const wanted = planned.filter(s => !opts.only || s.id === opts.only);
  const todo = [];
  for (const s of wanted) {
    const h = sceneHash(s, episode);
    const hashFile = path.join(sceneDir, s.id + '.hash');
    const mp4 = path.join(sceneDir, s.id + '.mp4');
    const have = existsSync(mp4) && existsSync(hashFile) &&
      (await readFile(hashFile, 'utf8')).trim() === h;
    if (!have) todo.push({ scene: s, hash: h, mp4, hashFile });
  }

  const rendered = [];
  if (todo.length) {
    const stage = await openStage(episode, artFiles);
    try {
      for (const job of todo) {
        await renderScene({ scene: job.scene, episode, outFile: job.mp4, stage, alpha: !!opts.alpha });
        await writeFile(job.hashFile, job.hash, 'utf8');
        rendered.push(job.scene.id);
        console.log('rendered', job.scene.id, job.scene.frames, 'frames');
      }
    } finally { await stage.close(); }
  }

  // Join.
  const listFile = path.join(outDir, '_scenes.txt');
  await writeFile(listFile,
    planned.map(s => "file '" + path.join(sceneDir, s.id + '.mp4').replace(/\\/g, '/') + "'").join('\n') + '\n',
    'utf8');
  const silent = path.join(outDir, episode.id + '-silent.mp4');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent]);

  // Re-assemble the voice against the PLANNED scene starts.
  //
  // speak() lays the lines out back to back with a fixed gap; it knows nothing
  // about a scene's `hold`. From the first hold onward the voice would run
  // ahead of the picture, and -shortest would then truncate the VIDEO to the
  // shorter audio, dropping the end of the episode without a word about it.
  // The picture plan is the master, so the audio is rebuilt against it.
  //
  // Each line's silence is computed from its ABSOLUTE start, not by adding up
  // pads, for the same reason the frame boundaries are: error that is summed
  // is error that accumulates.
  const voDir = path.join(outDir, 'vo');
  const byLine = new Map(timings.lines.map(l => [l.id, l]));
  const pictureSeconds = planned.reduce((n, s) => n + s.frames, 0) / (episode.fps || 30);
  let voTrack = path.join(outDir, 'vo.wav');

  if (planned.length && planned.every(s => existsSync(path.join(voDir, s.vo + '.wav')))) {
    const parts = [];
    let audioClock = 0, silenceN = 0;
    const silence = async (secs) => {
      const f = path.join(voDir, '_sil-' + (silenceN++) + '.wav');
      await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
        '-i', 'anullsrc=r=48000:cl=mono', '-t', secs.toFixed(4), f]);
      parts.push(f);
    };
    for (const s of planned) {
      const lead = s.start - audioClock;
      if (lead > 0.0005) { await silence(lead); audioClock += lead; }
      parts.push(path.join(voDir, s.vo + '.wav'));
      audioClock += byLine.get(s.vo).dur;
    }
    const tail = pictureSeconds - audioClock;
    if (tail > 0.0005) await silence(tail);

    const voList = path.join(outDir, '_vo.txt');
    await writeFile(voList,
      parts.map(f => "file '" + f.replace(/\\/g, '/') + "'").join('\n') + '\n', 'utf8');
    voTrack = path.join(outDir, 'vo-synced.wav');
    await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0',
      '-i', voList, '-c', 'copy', voTrack]);
  }

  // Mux the scratch voice, when there is one.
  let scratch = null;
  if (existsSync(voTrack)) {
    scratch = path.join(outDir, episode.id + '-scratch.mp4');
    await run('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', voTrack,
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', scratch]);
  }

  // The timing sheet.
  const sheet = path.join(outDir, episode.id + '-timing.md');
  await writeFile(sheet, timingSheet(episode, planned), 'utf8');

  // The contact sheet: one frame per scene, in a grid. This is the artifact a
  // human looks at. Green tests do not prove a Bobit is visible, on the ground
  // or clear of the text.
  const contact = path.join(outDir, episode.id + '-contact.png');
  const cols = Math.min(4, planned.length);
  const rows = Math.ceil(planned.length / cols);
  const stills = path.join(outDir, '_stills');
  await rm(stills, { recursive: true, force: true });
  await mkdir(stills, { recursive: true });
  for (let i = 0; i < planned.length; i++) {
    const s = planned[i];
    await run('ffmpeg', ['-y', '-v', 'error', '-i', path.join(sceneDir, s.id + '.mp4'),
      '-vf', 'select=eq(n\\,' + Math.floor(s.frames / 2) + ')', '-frames:v', '1',
      path.join(stills, String(i).padStart(3, '0') + '.png')]);
  }
  await readdir(stills);
  await run('ffmpeg', ['-y', '-v', 'error', '-start_number', '0',
    '-i', path.join(stills, '%03d.png'),
    '-vf', 'scale=' + episode.width + ':' + episode.height +
      ',tile=' + cols + 'x' + rows + ':padding=8:color=0x222228',
    '-frames:v', '1', contact]);

  return { silent, scratch, sheet, contact, rendered, planned };
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: build.mjs <episodeDir> [--voice] [--alpha] [--only <id>]'); process.exit(2); }
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
  buildEpisode(dir, {
    voice: process.argv.includes('--voice'),
    alpha: process.argv.includes('--alpha'),
    only
  }).then(r => {
    console.log('silent  ', r.silent);
    if (r.scratch) console.log('scratch ', r.scratch);
    console.log('timing  ', r.sheet);
    console.log('contact ', r.contact, '  <- LOOK AT THIS BEFORE CALLING IT DONE');
  }).catch(e => { console.error(e); process.exit(1); });
}
