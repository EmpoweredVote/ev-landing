// Narration lines -> one audio file per line, measured, then joined.
//
// Each line is synthesized ON ITS OWN and measured with ffprobe. That is where
// scene durations come from. Nothing in this pipeline estimates how long a
// sentence takes to say.
//
// The text is handed to the speech engine through a UTF-8 FILE, never through
// a shell argument. Quotes, em dashes and ampersands are ordinary in this copy
// and shell-quoting is exactly how they get mangled.

import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const VOICE = 'en-US-AndrewMultilingualNeural';
const GAP = 0.45;                       // seconds of silence between lines

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', code => code === 0
      ? resolve(out.trim())
      : reject(new Error(cmd + ' exited ' + code + ': ' + err.slice(-2000))));
  });
}

export async function probeDuration(file) {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file]);
  const n = Number(out);
  if (!Number.isFinite(n) || n <= 0) throw new Error('ffprobe gave no duration for ' + file);
  return n;
}

async function synth(line, dir, engine) {
  const txt = path.join(dir, line.id + '.txt');
  const mp3 = path.join(dir, line.id + '.mp3');
  const wav = path.join(dir, line.id + '.wav');
  await writeFile(txt, line.text, 'utf8');

  if (engine === 'sapi') {
    // Offline fallback. PowerShell reads the SAME file, so punctuation is
    // never handed to a command line here either.
    await run('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      'Add-Type -AssemblyName System.Speech; ' +
      '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ' +
      '$s.SetOutputToWaveFile("' + wav.replace(/\\/g, '\\\\') + '"); ' +
      '$s.Speak([IO.File]::ReadAllText("' + txt.replace(/\\/g, '\\\\') + '", [Text.Encoding]::UTF8)); ' +
      '$s.Dispose()']);
    // Normalise to the same format the concat step assumes.
    const raw = wav + '.raw.wav';
    await run('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-ar', '48000', '-ac', '1', raw]);
    await run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-c', 'copy', wav]);
  } else {
    await run('python', ['-m', 'edge_tts', '--voice', VOICE, '--file', txt, '--write-media', mp3]);
    await run('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-ar', '48000', '-ac', '1', wav]);
  }
  return wav;
}

export async function speak(lines, outDirIn, opts = {}) {
  const engine = opts.engine || 'edge';
  const gap = opts.gap == null ? GAP : opts.gap;
  // Absolute, always. ffmpeg's concat demuxer resolves relative entries in the
  // list against the LIST FILE's own directory, not the process cwd, so a list
  // written from a relative outDir doubles the prefix and nothing opens.
  const outDir = path.resolve(outDirIn);
  const dir = path.join(outDir, 'vo');
  await mkdir(dir, { recursive: true });

  const silence = path.join(dir, '_gap.wav');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
    '-i', 'anullsrc=r=48000:cl=mono', '-t', String(gap), silence]);

  const out = { gap, lines: [], total: 0 };
  const concat = [];
  let clock = 0;

  for (const line of lines) {
    const wav = await synth(line, dir, engine);
    const dur = await probeDuration(wav);
    out.lines.push({ id: line.id, text: line.text, direction: line.direction, start: clock, dur });
    concat.push(wav, silence);
    clock += dur + gap;
  }
  out.total = clock;

  const listFile = path.join(dir, '_concat.txt');
  await writeFile(listFile,
    concat.map(f => "file '" + f.replace(/\\/g, '/') + "'").join('\n') + '\n', 'utf8');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0',
    '-i', listFile, '-c', 'copy', path.join(outDir, 'vo.wav')]);

  await writeFile(path.join(outDir, 'timings.json'), JSON.stringify(out, null, 2), 'utf8');
  return out;
}

export async function loadTimings(outDir) {
  return JSON.parse(await readFile(path.join(outDir, 'timings.json'), 'utf8'));
}
