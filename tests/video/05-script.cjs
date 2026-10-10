// Parsing is pure and is tested without the network. The speech step itself is
// verified by running it, not by mocking a vendor. What IS tested here is the
// thing that breaks quietly: punctuation surviving the trip to the engine.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/ev-landing/ev-landing-main';

(async function () {
  const { parseScript } = await import('file:///' + ROOT + '/tools/video/engine/script.mjs');
  const text = fs.readFileSync(path.join(ROOT, 'tests/video/fixtures/script-fixture.md'), 'utf8');
  const lines = parseScript(text);

  assert.strictEqual(lines.length, 3, 'three lines, got ' + lines.length);
  assert.deepStrictEqual(lines.map(l => l.id), ['L001', 'L002', 'L003']);
  assert.strictEqual(lines[0].text, 'Who are these people?');
  assert.ok(/voting booth/.test(lines[0].direction), 'the direction note must be captured');
  assert.ok(!/Direction/.test(lines[0].text), 'the direction note must NOT leak into the narration');

  // The punctuation case. These characters are exactly what shell-quoting eats.
  assert.ok(lines[1].text.includes('"fair"'), 'double quotes must survive: ' + lines[1].text);
  assert.ok(lines[1].text.includes('—'), 'em dash must survive: ' + lines[1].text);
  assert.ok(lines[1].text.includes('&'), 'ampersand must survive: ' + lines[1].text);
  assert.ok(lines[1].text.includes('Ampersands & em dashes'), 'a wrapped line must join with a space');
  assert.ok(!/\n/.test(lines[1].text), 'a multi-line body must be joined into one string');

  // A heading that is not a line id is a hard error, not a silently skipped line.
  assert.throws(() => parseScript('## notanid\nhello\n'), /notanid/,
    'an unparsable line heading must throw and name itself');

  // Duplicate ids would silently overwrite a scene's timing.
  assert.throws(() => parseScript('## L001\na\n\n## L001\nb\n'), /L001/,
    'a duplicate line id must throw and name itself');

  // The speech cache, tested without a network. A stale cache would re-use
  // yesterday's words for today's line, and the only symptom is that the
  // narration does not match the script you just edited.
  const { isCached } = await import('file:///' + ROOT + '/tools/video/engine/voice.mjs');
  const dir = path.join(ROOT, 'tools/video/build/_cachetest');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const line = { id: 'L001', text: 'Who are these people?' };

  assert.strictEqual(await isCached(dir, line), false, 'nothing cached yet');
  fs.writeFileSync(path.join(dir, 'L001.txt'), line.text, 'utf8');
  assert.strictEqual(await isCached(dir, line), false, 'text alone is not a cache hit; the audio must exist');
  fs.writeFileSync(path.join(dir, 'L001.wav'), 'not really audio', 'utf8');
  assert.strictEqual(await isCached(dir, line), true, 'same words plus audio is a hit');
  assert.strictEqual(await isCached(dir, { id: 'L001', text: 'Who are these folks?' }), false,
    'changed words must miss the cache');

  console.log('PASS 05-script');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
