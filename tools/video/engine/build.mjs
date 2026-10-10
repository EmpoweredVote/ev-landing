// Orchestrates an episode: measure the voice, plan the frames, render the
// scenes that changed, join them, mux the scratch track, and write the two
// things a human reads — the timing sheet and the contact sheet.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

import { parseScript } from './script.mjs';
import { speak, loadTimings } from './voice.mjs';
import { planFrames, timingSheet, recordingScript } from './timing.mjs';
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

function sceneHash(scene, episode, codeKey, alpha) {
  // A scene's PICTURE depends on its content and its length, never on where it
  // sits in the timeline. Leaving the positional fields in meant that changing
  // one word near the top re-rendered every scene below it, to produce files
  // identical to the ones already on disk.
  //
  // `alpha` IS part of it: an opaque scene and a transparent one are different
  // pictures. Without it the alpha build reads the opaque cache, renders
  // nothing, prints success, and hands back H.264 with no alpha plane.
  const { start, end, startFrame, ...content } = scene;
  return createHash('sha1')
    .update(JSON.stringify({ content, w: episode.width, h: episode.height,
      fps: episode.fps, codeKey, alpha: !!alpha }))
    .digest('hex').slice(0, 16);
}

// What a file really holds, counted rather than declared.
function probe(file, entries, stream) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error'];
    if (stream) args.push('-select_streams', stream);
    args.push('-show_entries', entries, '-of', 'default=nw=1:nk=1', file);
    const p = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.on('error', reject);
    p.on('close', () => resolve(Number(out.trim())));
  });
}

// Everything that can change what a frame looks like without changing the
// scene OBJECT: the episode's own art, and the drawing layer underneath it.
// Hashing the object alone means an edit to art.js or to a pose serves a stale
// MP4 of the old drawing, and the only symptom is that your fix did not appear.
async function codeDigest(artFiles) {
  const engine = ['stage.html', 'stage.js', 'cast.js'].map(f => path.join(HERE, f));
  const rig = ['leremy-rig.js', 'ev-anim-extras.js']
    .map(f => path.join(HERE, '..', '..', '..', f));
  const h = createHash('sha1');
  for (const f of [...engine, ...rig, ...artFiles]) {
    if (existsSync(f)) h.update(await readFile(f));
  }
  return h.digest('hex').slice(0, 16);
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
  // Alpha clips are a different deliverable from the episode, so they get their
  // own directory and their own extension. Sharing one path with the opaque
  // build is how --alpha came to overwrite, or silently reuse, the wrong files.
  const alpha = !!opts.alpha;
  const sceneDir = path.join(outDir, alpha ? 'scenes-alpha' : 'scenes');
  const ext = alpha ? '.mov' : '.mp4';
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

  // One line is one scene. A line no scene claims still gets recorded and still
  // lands in the voice track, so the picture would run short from that point on
  // and everything after it would drift. Adding a line to script.md and
  // forgetting its scene is the obvious way to do this by accident.
  const claimed = new Set(planned.map(s => s.vo));
  const orphans = timings.lines.filter(l => !claimed.has(l.id)).map(l => l.id);
  if (orphans.length) {
    throw new Error('script line(s) with no scene in ' + episode.id + ': ' + orphans.join(', ') +
      '. Add a scene naming each, or remove the line from script.md and re-run with --voice.');
  }

  // ...and the other half of the same rule. Two scenes on one line give that
  // line two spans in the picture and speak it twice in the finished cut.
  const seen = new Map();
  const doubled = [];
  for (const s of planned) {
    if (seen.has(s.vo)) doubled.push(s.vo + ' (scenes ' + seen.get(s.vo) + ' and ' + s.id + ')');
    else seen.set(s.vo, s.id);
  }
  if (doubled.length) {
    throw new Error('line(s) claimed by more than one scene in ' + episode.id + ': ' +
      doubled.join('; ') + '. One line is one scene.');
  }

  // Load order matters: an episode's generated asset files (screen.js,
  // brand.js, ...) define the data URIs that art.js reads at registration
  // time, so every one of them loads first and art.js loads last. Sorting the
  // assets keeps the order stable, which matters because they feed the cache
  // key below.
  const assetFiles = (await readdir(episodeDir))
    .filter(f => f.endsWith('.js') && f !== 'art.js' && !f.endsWith('.mjs'))
    .sort();
  const artFiles = [...assetFiles, 'art.js']
    .map(f => path.join(episodeDir, f))
    .filter(existsSync);

  // Which scenes need rendering: the ones whose hash has no file.
  const codeKey = await codeDigest(artFiles);
  const wanted = planned.filter(s => !opts.only || s.id === opts.only);
  const todo = [];
  for (const s of wanted) {
    const h = sceneHash(s, episode, codeKey, alpha);
    const hashFile = path.join(sceneDir, s.id + '.hash');
    const file = path.join(sceneDir, s.id + ext);
    const have = existsSync(file) && existsSync(hashFile) &&
      (await readFile(hashFile, 'utf8')).trim() === h;
    if (!have) todo.push({ scene: s, hash: h, file, hashFile });
  }

  const rendered = [];
  if (todo.length) {
    const stage = await openStage(episode, artFiles);
    try {
      for (const job of todo) {
        // Clear the old hash FIRST. If the render then fails, nothing is left
        // claiming that this file is current content.
        await rm(job.hashFile, { force: true });
        await renderScene({ scene: job.scene, episode, outFile: job.file, stage, alpha });
        await writeFile(job.hashFile, job.hash, 'utf8');
        rendered.push(job.scene.id);
        console.log('rendered', job.scene.id, job.scene.frames, 'frames');
      }
    } finally { await stage.close(); }
  }

  const sceneFiles = planned.map(s => path.join(sceneDir, s.id + ext));

  // In alpha mode the deliverable IS the per-scene clips -- that is the whole
  // point of the fallback. Joining them, muxing a voice onto them or tiling a
  // contact sheet from them would all be answering a question nobody asked.
  if (alpha) {
    console.log('alpha clips in', sceneDir);
    return { alpha: true, sceneDir, sceneFiles, rendered, planned,
             silent: null, scratch: null, sheet: null, reading: null, contact: null };
  }

  // Join.
  const listFile = path.join(outDir, '_scenes.txt');
  await writeFile(listFile,
    sceneFiles.map(f => "file '" + f.replace(/\\/g, '/') + "'").join('\n') + '\n', 'utf8');
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

  // Either every line has audio or none do. A partial set used to fall through
  // to vo.wav -- the exact track whose drift this block exists to correct --
  // and -shortest then cut the end off the episode.
  const wavOf = s => path.join(voDir, s.vo + '.wav');
  const missing = planned.filter(s => !existsSync(wavOf(s))).map(s => s.vo);
  if (planned.length && missing.length && missing.length < planned.length) {
    throw new Error('missing per-line audio for ' + missing.join(', ') +
      ' in ' + voDir + '. Re-run with --voice, or remove the rest to build silent.');
  }

  if (planned.length && !missing.length) {
    const parts = [];
    let audioClock = 0, silenceN = 0;
    const silence = async (secs) => {
      const f = path.join(voDir, '_sil-' + (silenceN++) + '.wav');
      await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
        '-i', 'anullsrc=r=48000:cl=mono', '-t', secs.toFixed(4), f]);
      parts.push(f);
    };

    // Measure each file rather than trusting timings.json. The clock advances
    // by the DECLARED duration while the concat demuxer advances by the REAL
    // one, so a disagreement is never corrected and compounds line by line.
    // It also means the SCENE is the wrong length for its line, so this is a
    // stale timings.json rather than a rounding wobble: refuse it.
    const frame = 1 / (episode.fps || 30);
    for (const s of planned) {
      const real = await probe(wavOf(s), 'format=duration');
      const said = byLine.get(s.vo).dur;
      if (!Number.isFinite(real) || Math.abs(real - said) > frame) {
        throw new Error('line ' + s.vo + ': timings.json says ' + said.toFixed(3) +
          's but the audio is ' + (Number.isFinite(real) ? real.toFixed(3) + 's' : 'unreadable') +
          '. The scene is planned from the stale number; re-run with --voice.');
      }
      const lead = s.start - audioClock;
      if (lead > 0.0005) { await silence(lead); audioClock += lead; }
      parts.push(wavOf(s));
      audioClock += real;
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

  // The arithmetic Task 13 did by hand, done by the build every time. A
  // picture that does not hold the planned frames, or a scratch cut whose
  // audio has been trimmed to fit, is exactly what looks like success.
  const plannedFrames = planned.reduce((n, s) => n + s.frames, 0);
  const gotFrames = await probe(silent, 'stream=nb_read_packets', 'v:0')
    .catch(() => NaN);
  if (Number.isFinite(gotFrames) && gotFrames !== plannedFrames) {
    throw new Error('the joined picture holds ' + gotFrames + ' frames, the plan says ' +
      plannedFrames + '. A scene is short.');
  }
  if (scratch) {
    const v = await probe(silent, 'format=duration');
    const a = await probe(scratch, 'format=duration');
    if (Math.abs(v - a) > 1 / (episode.fps || 30) + 0.02) {
      throw new Error('picture is ' + v.toFixed(3) + 's and the scratch cut is ' +
        a.toFixed(3) + 's; the voice has been trimmed to fit or runs past the end.');
    }
  }

  // The timing sheet.
  const sheet = path.join(outDir, episode.id + '-timing.md');
  await writeFile(sheet, timingSheet(episode, planned), 'utf8');

  // The script as something to read into a microphone.
  const reading = path.join(outDir, episode.id + '-recording-script.md');
  await writeFile(reading, recordingScript(episode, planned, timings), 'utf8');

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
    await run('ffmpeg', ['-y', '-v', 'error', '-i', sceneFiles[i],
      '-vf', 'select=eq(n\\,' + Math.floor(s.frames / 2) + ')', '-frames:v', '1',
      path.join(stills, String(i).padStart(3, '0') + '.png')]);
  }
  // Tiles are scaled DOWN. At full resolution a 40-scene episode produces a
  // 7704x10872 sheet, which is not something a person opens to check a layout.
  // 480 wide is enough to see a Bobit's feet against the ground line, which is
  // what this sheet is for.
  const tileW = 480;
  await run('ffmpeg', ['-y', '-v', 'error', '-start_number', '0',
    '-i', path.join(stills, '%03d.png'),
    '-vf', 'scale=' + tileW + ':-2,tile=' + cols + 'x' + rows + ':padding=8:color=0x222228',
    '-frames:v', '1', contact]);

  return { silent, scratch, sheet, reading, contact, rendered, planned, sceneFiles, sceneDir };
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
    if (r.alpha) {
      console.log('alpha clips', r.sceneFiles.length, 'in', r.sceneDir);
      return;
    }
    console.log('silent  ', r.silent);
    if (r.scratch) console.log('scratch ', r.scratch);
    console.log('timing  ', r.sheet);
    console.log('to read ', r.reading);
    console.log('contact ', r.contact, '  <- LOOK AT THIS BEFORE CALLING IT DONE');
  }).catch(e => { console.error(e.message || e); process.exit(1); });
}
