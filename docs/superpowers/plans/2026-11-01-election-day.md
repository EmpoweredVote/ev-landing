# Election Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a countdown to the greeter's welcome for the month before a federal election, and a polling-place scene that takes over the hero's bottom rule on Election Day itself.

**Architecture:** Three tags and one fact in the existing dialogue engine (`ev-lines.js`) drive both halves, so there is one definition of "it is Election Day" on the page. The scene is a new `'polls'` branch on the hero's existing `beam` entry — not new entries — so it inherits that entry's anchor and the click-exodus handles it without changes. Both switch themselves off from the clock.

**Tech Stack:** Plain ES5-flavoured JavaScript, no build step. Playwright 1.62.1 (pinned, repo devDependency) driving `file://` URLs. Canvas 2D.

**Spec:** `docs/superpowers/specs/2026-11-01-election-day-design.md`

## Global Constraints

- **Ships before Tuesday 2026-11-03.** Tasks 1–3 alone are shippable and give the countdown; Tasks 4–8 are the scene.
- **The repo is CRLF on disk, and the Edit/Write tools silently rewrite a whole file as LF.** `git diff` hides this because git normalises for the diff. `ev-figures.js`, `ev-lines.js`, `ev-copy.en.js` and all of `tests/` are CRLF. Patch with a script that reads bytes, normalises to LF, edits, writes CRLF last, and asserts a hit count on every replacement. After any Edit/Write to a CRLF file, convert it back.
- **No build step, no new dependencies, no new files outside `tests/`.** The scene is a block inside `ev-figures.js` beside the Halloween block.
- **Figure scale is `S = 0.32`;** a Bobit is 71px tall and about 15px wide.
- **Headroom under `.meta-row` is 93px at every width.** Clear floor to its left: 407px at 1440, 327 at 1280, 114 at 900, 20 at 390.
- **No line of copy may instruct anyone to vote.** Statements of fact only. This is an antipartisan-by-design constraint, not a style preference.
- **No line may render a number next to a singular noun** ("1 days away").
- Run a single test as its own script: `node tests/<dir>/<file>.cjs`. It prints PASS and throws on failure. The per-task commands below are the fast inner loop, not the gate.
- **Testing cadence, agreed with Chris 2026-11-01.** The standing rule in this repo is the whole suite before every commit; for this plan it is relaxed, deliberately and once, because eight full runs is about three and a half hours against a Tuesday deadline:
  - **Tasks 1–3** (`ev-lines.js`, `ev-copy.en.js`): the fast inner loop plus all three `tests/lines/` files and all seven `tests/greeter/` files. These tasks cannot reach the figure layer, so the rest of the suite cannot see them.
  - **Tasks 4, 5, 6, 7** (`ev-figures.js`): the **whole suite, detached**, before each commit.
  - **Task 8**: the whole suite, detached, once more over the finished branch.
- Running the whole suite is `node run-tests.mjs` with `run_in_background: true`. It does not fit in a foreground call: ~70 files, each launching its own Chromium and driving real animation frames, measured at 20–35 minutes wall-clock, and many individually exceed the Bash tool's 10-minute ceiling. Wait for the completion notification and commit only once it is green. Do not commit optimistically and verify afterwards.
- **`tests/quotes/04-poses.cjs` flakes under load** on "lookup must settle into hold". That is timing, not a regression — re-run it alone before treating it as a failure.
- Running the suite rewrites files in `screenshots/`. That churn is a side effect, not work; leave it out of commits unless a shot genuinely changed.
- Commit messages follow the repo's conventional-commit style with a scope (`feat(lines):`, `fix(figures):`), and end with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Review Focus

Five things the spec implies that no task's own happy-path test would catch. Each has a test added to the task that owns the code.

1. **`?evdays=` given something that is not a number** (`?evdays=abc`, `?evdays=`, `?evdays=-5`). A `NaN` reaches `{days}` and the greeter says "Election Day is NaN days away". Expected: a value that is not a non-negative integer is ignored entirely, and the real computed count is used. — Task 1.
2. **An odd year, or a date more than 30 days out.** No election tag fires, and the greeter must fall through to the ordinary time-of-day opener rather than going silent. A beat that matches nothing is an authoring gap, not a quiet day. — Task 3.
3. **A theme flip while the scene is running.** Halloween's zombie colour had to be its own pair because the cast palette read wrong against one theme. The booth takes `cssVar` each frame; a value captured once at spawn would be the wrong ink after a flip. — Task 5.
4. **320px, the narrowest real viewport.** Booth 96 + inset 16 + eight waiters at the 26px minimum gap is 294px of a 320px canvas. Narrower than that and the back of the queue walks off the right edge of its own canvas. Expected: the queue still fits, or the target shrinks rather than overflowing. — Task 6.
5. **A resize or rotate while the scene is running.** `reposition()` re-fits the canvas, and both the booth clamp and `GAP` are functions of width, so every queue slot moves. Expected: waiters re-seat against the new slots instead of keeping stale absolute positions. — Task 6.

---

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `ev-lines.js` | The date rule, the `daysToElection` fact, the `?evdays=` lever, three predicates, `{days}` in `fill()`, the `wave` beat ordering | 1, 2, 3 |
| `ev-copy.en.js` | Five new greeting ids | 3 |
| `ev-figures.js` | The `ELECTION` gate, the `POLL` constants, `runPolls()`, the booth, the queue, click-to-talk, debug hooks | 4, 5, 6, 7 |
| `tests/lines/02-predicates.cjs` | Date rule, the fact, tag boundaries | 1, 2 |
| `tests/lines/01-select.cjs` | Which line is chosen, `{days}` rendering, Halloween priority | 3 |
| `tests/layout/election-polls.cjs` | The scene: booth clearance, queue, movement, exodus, the harness guard | 5, 6, 8 |
| `README.md` | The feature's own section, beside "Seasonal takeovers" | 8 |

---

### Task 1: The date rule and the `daysToElection` fact

**Files:**
- Modify: `ev-lines.js` — add above the `PREDICATES` map (which starts at line 45)
- Test: `tests/lines/02-predicates.cjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `window.EVLines.context(facts).daysToElection` — a non-negative integer, never null. `EVLines.federalElectionDay(year)` exported on the debug surface beside `PREDICATES`, returning a `Date` or `null` for an odd year.

- [ ] **Step 1: Write the failing tests**

Add to `tests/lines/02-predicates.cjs`, after the existing MLK Day cases. A helper beside `tagsAt`:

```js
function daysAt(page, y, m, d) {
  return page.evaluate(function (a) {
    return window.EVLines.context({ now: new Date(a[0], a[1], a[2], 12, 0, 0) }).daysToElection;
  }, [y, m, d]);
}
function electionFor(page, y) {
  return page.evaluate(function (yy) {
    var e = window.EVLines.federalElectionDay(yy);
    return e ? [e.getFullYear(), e.getMonth(), e.getDate()] : null;
  }, y);
}
```

Assertions — the rule against four known cycles, then the fact:

```js
assert.deepStrictEqual(await electionFor(page, 2022), [2022, 10, 8], '2022 election is 8 Nov');
assert.deepStrictEqual(await electionFor(page, 2024), [2024, 10, 5], '2024 election is 5 Nov');
assert.deepStrictEqual(await electionFor(page, 2026), [2026, 10, 3], '2026 election is 3 Nov');
assert.deepStrictEqual(await electionFor(page, 2028), [2028, 10, 7], '2028 election is 7 Nov');
assert.strictEqual(await electionFor(page, 2027), null, 'no federal election in an odd year');

assert.strictEqual(await daysAt(page, 2026, 10, 3), 0, 'election day is 0');
assert.strictEqual(await daysAt(page, 2026, 10, 2), 1, 'the day before is 1');
assert.strictEqual(await daysAt(page, 2026, 9, 4), 30, '4 Oct is 30 days out');
assert.strictEqual(await daysAt(page, 2026, 10, 4), 734, 'the day after rolls to the 2028 election');
assert.strictEqual(await daysAt(page, 2027, 5, 15), 511, 'mid odd-year still counts forward');
```

Then the Review Focus case — a junk `?evdays=` must be ignored, not rendered:

```js
for (const bad of ['abc', '', '-5', '1.5', '1e3']) {
  const p = await makePage(browser, '?evdays=' + encodeURIComponent(bad));
  const d = await daysAt(p, 2026, 10, 1);
  assert.strictEqual(d, 2, '?evdays=' + bad + ' must be ignored, not override the real count');
  await p.close();
}
const good = await makePage(browser, '?evdays=7');
assert.strictEqual(await daysAt(good, 2026, 5, 10), 7, '?evdays=7 overrides the count');
await good.close();
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/lines/02-predicates.cjs`
Expected: FAIL — `federalElectionDay is not a function`.

- [ ] **Step 3: Implement the rule and the fact in `ev-lines.js`**

Three functions above `PREDICATES`, and one read of the query string beside the existing `forced` block:

- `federalElectionDay(year)` → `Date | null`. Exactly as the spec gives it: `null` for an odd year, else 1 November, advance to the first Monday, then one more day.
- `nextElectionDay(now)` → `Date`. Walks `now.getFullYear()` forward up to four years and returns the first election date that is not before `now`'s local midnight. Looking forward is what makes the fact never null and never negative.
- `daysToElection(now)` → integer. `Math.round` of the millisecond gap between the two local midnights divided by `86400000`. **`Math.round`, not `Math.floor`** — correct whichever way a DST transition falls; see the spec for why the November window makes them agree anyway.

`forcedDays` is read from `/[?&]evdays=([^&#]*)/` and kept only when it matches `/^\d+$/` and parses to a finite integer. Anything else is discarded, which is what makes the Review Focus case pass. Set `c.daysToElection` in `context()` to `forcedDays` when present, else `daysToElection(c.now)`.

**Set it before the `if (forced)` early return at line 130**, so a forced tag set still carries a real number — but `forcedDays` must not add or remove any tag. Task 2's test pins that.

Export `federalElectionDay` on the `window.EVLines` object beside `PREDICATES`, for the same stated reason `PREDICATES` is public: it is the handle a person opens in devtools.

- [ ] **Step 4: Run it to verify it passes**

Run: `node tests/lines/02-predicates.cjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ev-lines.js tests/lines/02-predicates.cjs
git commit -m "feat(lines): the election date is a rule, not a table"
```

---

### Task 2: The three election tags

**Files:**
- Modify: `ev-lines.js` — three entries in `PREDICATES` (line 45)
- Test: `tests/lines/02-predicates.cjs`

**Interfaces:**
- Consumes: `c.daysToElection` from Task 1.
- Produces: tags `election-day`, `election-tomorrow`, `election-soon` in `context().tags`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/lines/02-predicates.cjs`, beside the Halloween window cases. Boundaries on both sides of each tag:

```js
const at = (y, m, d) => tagsAt(page, y, m, d, 12);
assert.ok((await at(2026, 10, 3)).includes('election-day'), '3 Nov is election-day');
assert.ok((await at(2026, 10, 2)).includes('election-tomorrow'), '2 Nov is election-tomorrow');
assert.ok((await at(2026, 10, 1)).includes('election-soon'), '1 Nov is election-soon');
assert.ok((await at(2026, 9, 4)).includes('election-soon'), '4 Oct (30 days) is election-soon');
assert.ok(!(await at(2026, 9, 3)).some(t => t.startsWith('election-')), '3 Oct (31 days) has no election tag');
assert.ok(!(await at(2026, 10, 4)).some(t => t.startsWith('election-')), '4 Nov has no election tag');
assert.ok(!(await at(2027, 10, 2)).some(t => t.startsWith('election-')), 'an odd year has no election tag');
```

Exactly one election tag at a time, for the same reason the suite already asserts exactly one time-of-day tag:

```js
for (const d of [1, 2, 3, 4]) {
  const t = (await at(2026, 10, d)).filter(x => x.startsWith('election-'));
  assert.ok(t.length <= 1, 'Nov ' + d + ' produced ' + t.length + ' election tags: ' + t);
}
```

And that `?evdays=` moves the number without touching the tags:

```js
const p = await makePage(browser, '?evdays=0');
const t0 = await p.evaluate(() => window.EVLines.context({ now: new Date(2026, 5, 10, 12) }).tags);
assert.ok(!t0.some(x => x.startsWith('election-')), '?evdays=0 must not switch election-day on');
await p.close();
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/lines/02-predicates.cjs`
Expected: FAIL — `3 Nov is election-day`.

- [ ] **Step 3: Implement the three predicates in `ev-lines.js`**

Three entries in `PREDICATES`, placed after `'mlk-day'` and before `'first-visit'`, so the map still reads calendar-then-visitor:

| tag | condition |
|---|---|
| `election-day` | `c.daysToElection === 0` |
| `election-tomorrow` | `c.daysToElection === 1` |
| `election-soon` | `c.daysToElection >= 2 && c.daysToElection <= 30` |

Three rather than one because `when` is an AND with no arithmetic in it, so a singular sentence and a plural one each need their own tag. Thirty days is the spec's "about a month out".

The `?evdays=0` case passes without new code **only if** Task 1 put `forcedDays` on the fact and nowhere near the tag set. If it fails, the bug is in Task 1's placement, not here.

- [ ] **Step 4: Run it to verify it passes**

Run: `node tests/lines/02-predicates.cjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ev-lines.js tests/lines/02-predicates.cjs
git commit -m "feat(lines): three election tags, so no line says '1 days'"
```

---

### Task 3: The countdown greeting

**Files:**
- Modify: `ev-copy.en.js` — five ids in the first `register('en', {...})` block, beside `greet.halloween`
- Modify: `ev-lines.js` — `fill()` (around line 160) and the `wave` beat's line list
- Test: `tests/lines/01-select.cjs`

**Interfaces:**
- Consumes: the three tags from Task 2; `c.daysToElection` from Task 1.
- Produces: `EVLines.resolve('greeter', 'wave', facts).text` carrying a rendered day count.

- [ ] **Step 1: Write the failing tests**

Add to `tests/lines/01-select.cjs`, following the existing `say([tags], 'wave')` helper shape used by the `spooky` case at line 149:

```js
// The number reaches the sentence, and no sentence says "1 days".
const soon = say(['election-soon'], 'wave', { daysToElection: 12 });
assert.ok(/\b12 days\b/.test(soon), 'the count renders into the line: ' + soon);
assert.ok(!/\{days\}/.test(soon), 'no unsubstituted token survives');

const tom = say(['election-tomorrow'], 'wave');
assert.ok(/tomorrow/i.test(tom), 'the day before says tomorrow, not a number');
assert.ok(!/\b1 days\b/.test(tom), 'nothing may say "1 days"');

const day = say(['election-day'], 'wave');
assert.ok(/Election Day/i.test(day), 'the day itself says so');

// Halloween outranks the countdown — the ask, and the reason file order is priority.
const both = say(['halloween', 'election-soon'], 'wave', { daysToElection: 6 });
assert.ok(/Halloween/i.test(both), 'Halloween wins when both are true: ' + both);

// The countdown outranks the welcome-back, or the people who return most never hear it.
const back = say(['named', 'returning', 'election-soon'], 'wave', { daysToElection: 6, name: 'Chris' });
assert.ok(/\b6 days\b/.test(back), 'a signed-in returning visitor still gets the countdown: ' + back);

// No line instructs anyone to vote.
for (const t of [['election-day'], ['election-tomorrow'], ['election-soon']]) {
  const s = say(t, 'wave', { daysToElection: 9 });
  assert.ok(!/\bvote\b/i.test(s.replace(/Empowered Vote/g, '')), t[0] + ' must not tell anyone to vote: ' + s);
}
```

Review Focus case 2 — far out, the greeter still speaks:

```js
const plain = say(['morning'], 'wave');
assert.ok(plain && plain.length, 'with no election tag he still gives the ordinary opener');
assert.ok(!/Election Day/i.test(plain), 'and does not mention the election');
```

If `say()` does not already take a third facts argument, extend it; `resolve()` already accepts `facts`.

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/lines/01-select.cjs`
Expected: FAIL — the line resolves to the fallback, with no day count in it.

- [ ] **Step 3: Add `{days}` to `fill()` in `ev-lines.js`**

One more `replace` beside the existing `{name}` one, from `c.daysToElection`. Two tokens is still a substitution, not a template language. Task 1 guarantees the value is always a number, so there is no empty-string path to defend.

- [ ] **Step 4: Add the five ids to `ev-copy.en.js`**

Exact copy, placed beside `greet.halloween`:

```js
'greet.election.day':        "Today is Election Day. Welcome to Empowered Vote.",
'greet.election.tomorrow':   "Election Day is tomorrow. Welcome to Empowered Vote.",
'greet.election.soon':       "Election Day is {days} days away. Welcome to Empowered Vote.",
'greet.election.soon.b':     "{days} days until Election Day. Glad you stopped by.",
'greet.election.soon.c':     "Election Day is {days} days out. Take your time and have a look around.",
```

- [ ] **Step 5: Place the lines in the `wave` beat in `ev-lines.js`**

Insert after `greet.halloween` and before `greet.holidays`:

```js
{ id: 'greet.election.day',      when: ['election-day'] },
{ id: 'greet.election.tomorrow', when: ['election-tomorrow'] },
{ id: ['greet.election.soon', 'greet.election.soon.b', 'greet.election.soon.c'], when: ['election-soon'] },
```

Two things about that position are the decisions, not accidents: Halloween stays above, which is the ask; and all three sit above `greet.back`, or a signed-in returning visitor — the person who comes back most — never hears the countdown.

- [ ] **Step 6: Run the dialogue suite to verify it passes**

Run: `node tests/lines/01-select.cjs && node tests/lines/02-predicates.cjs && node tests/lines/03-tips.cjs`
Expected: PASS, three times.

- [ ] **Step 7: Run the greeter suite, which must be untouched**

Run: `for f in tests/greeter/0*.cjs; do node "$f"; done`
Expected: PASS for all seven. Every case pins tags with `?evlines=`, and the one unforced case in `04-beats.cjs` captures beat 1's wording rather than asserting it, so none of them should move. **If one fails, that is a real regression in line ordering, not a test to update.**

- [ ] **Step 8: Commit**

```bash
git add ev-lines.js ev-copy.en.js tests/lines/01-select.cjs
git commit -m "feat(copy): the greeter counts down to Election Day"
```

---

### Task 4: The scene gate and the switch

**Files:**
- Modify: `ev-figures.js` — a new block beside the Halloween block (`HALLOWEEN` is at line 4323); the `beam` branch's init at line 5860; `beamPick` at line 4216; the debug surface at line 6225
- Test: `tests/layout/election-polls.cjs` (create)

**Interfaces:**
- Consumes: the `election-day` tag from Task 2.
- Produces: `ELECTION` (boolean, module scope); `POLL` (the constants object); `__evFigDebug.electionDay` (boolean); `__evFigDebug.polls()` returning `[]` for now. The hero `beam` entry has `e.scene === 'polls'`.

- [ ] **Step 1: Write the failing test**

Create `tests/layout/election-polls.cjs`, following the harness shape of `tests/layout/halloween-zombies.cjs`: block `https:`, set `document.documentElement.style.scrollBehavior = 'auto'` before any scroll, and load with `?evlines=election-day#figdebug`.

```js
// Case 1 — the gate is on, and the carry rotation is off.
assert.strictEqual(await page.evaluate(() => window.__evFigDebug.electionDay), true,
  'the scene must be armed under ?evlines=election-day');
const scene = await page.evaluate(() =>
  window.__evFigDebug.entries.filter(e => e.spec.mode === 'beam' && !e.spec.plain).map(e => e.scene));
assert.deepStrictEqual(scene, ['polls'], 'the hero crew runs polls and nothing else');

// Case 2 — with no tags pinned under the harness, the scene is OFF.
const off = await makePage(browser, '');          // no ?evlines=
assert.strictEqual(await off.evaluate(() => window.__evFigDebug.electionDay), false,
  'an automated browser with no tag pinned must not get the takeover');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/layout/election-polls.cjs`
Expected: FAIL — `electionDay` is undefined.

- [ ] **Step 3: Add the `ELECTION` gate to `ev-figures.js`**

An IIFE in the same shape as `HALLOWEEN` at line 4323, evaluated **once at module load**:

- `false` unless `EVLines.context({}).tags` contains `election-day`;
- `false` under `navigator.webdriver` unless the URL carries `?evlines=`;
- wrapped in try/catch returning `false`.

Reading it once is the decision: a tab left open across midnight into 4 November keeps the polling place until reload, exactly as Halloween already behaves.

- [ ] **Step 4: Add the `POLL` constants object**

One named object at the top of the new block, the way `ZOM` and `GHOST` are, holding every knob so there is one place to tune:

| key | value | what it is |
|---|---|---|
| `BOOTH_W` | 96 | panel width, px |
| `BOOTH_H` | 135 | design height — 1.9× a 71px figure |
| `CLAMP_H` | 93 | the meta-row headroom ceiling |
| `INSET_WIDE` | 44 | booth's left inset above 900px |
| `INSET_NARROW` | 16 | …and at 900px or below |
| `GAP_MIN` / `GAP_MAX` | 26 / 46 | queue spacing clamp |
| `GAP0` | 34 | door to the first waiting slot |
| `TARGET_MIN` / `TARGET_MAX` | 4 / 8 | how many wait |
| `VOTE_SECS` | 4 | time hidden in the booth |
| `ARRIVE_GAP` | 3.5 | seconds between arrivals when under target |
| `SHUFFLE_SPEED` | 26 | px/s stepping up one slot |
| `SAY` | 6 | seconds a waiter's bubble stays up |

- [ ] **Step 5: Switch the hero entry into the scene, and guard the Halloween crews**

Two edits in the `beam` branch:

- At the init inside `if (e.bx == null)` (line 5860): when `ELECTION` **and not `e.spec.plain`**, set `e.scene = 'polls'` instead of `'carry'`. The `plain` exclusion matters because that same init path is shared by the Halloween work crews cast at runtime (line 4683); the calendars cannot overlap, but the path is shared, so it is guarded rather than left resting on the calendar being kind.
- In `beamPick` (line 4216): return immediately when `e.scene === 'polls'`. The carry rotation, the light gag, the letter carriers and the play-button carrier are all off for the day.

Dispatch `runPolls(e, ctx, w, h, feetY, tt, shadow, dt, cr)` from the scene chain at line 5862, beside the `light` / `letters` / `play` branches, **and publish `e._figX` before it returns** — the chain already does this at line 5862; keep `polls` inside it. For now `runPolls` is a stub that returns without drawing.

- [ ] **Step 6: Add the debug hooks**

On the object at line 6225, beside `halloween` and `crews`:

```js
election: ELECTION, poll: POLL,
polls: function () { return POLLS.slice(); },
```

`POLLS` is the queue array Task 6 fills; an empty array now.

- [ ] **Step 7: Run the test to verify it passes**

Run: `node tests/layout/election-polls.cjs`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add ev-figures.js tests/layout/election-polls.cjs
git commit -m "feat(figures): the hero lane becomes a polling place on Election Day"
```

---

### Task 5: The booth

**Files:**
- Modify: `ev-figures.js` — `drawBooth()` and `boothRect()` in the new block
- Test: `tests/layout/election-polls.cjs`

**Interfaces:**
- Consumes: `POLL`, `ELECTION` from Task 4.
- Produces: `boothRect(e, w)` → `{x, y, w, h, doorX, signOnPanel}` in canvas coordinates, where `doorX` is where a voter enters and `signOnPanel` says which way the sign is drawn. Task 6 positions the queue from `doorX`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/layout/election-polls.cjs`. The clearance case samples painted ink inside the meta row's rect, the way `tests/layout/beam-clears-metarow.cjs` already does:

```js
// Case 3 — the booth clears the meta row at both ends of the range.
for (const width of [1440, 390]) {
  const p = await makePage(browser, '?evlines=election-day#figdebug', { width, height: 900 });
  await settle(p);
  const ink = await p.evaluate(() => {
    const e = window.__evFigDebug.entries.find(x => x.spec.mode === 'beam' && !x.spec.plain);
    const row = document.querySelector('.hero .meta-row').getBoundingClientRect();
    const cr = e.c.getBoundingClientRect();
    const d = e.ctx.getImageData(0, 0, e.c.width, e.c.height).data;
    let hits = 0;
    for (let y = 0; y < e.c.height; y++) {
      const docY = cr.top + y;
      if (docY < row.top || docY > row.bottom) continue;
      for (let x = 0; x < e.c.width; x++) if (d[(y * e.c.width + x) * 4 + 3] > 8) hits++;
    }
    return hits;
  });
  assert.strictEqual(ink, 0, width + 'px: the booth must not paint inside .meta-row');
  await p.close();
}

// Case 4 — the clamp fires on a phone and not on a desktop.
const wide = await boothAt(browser, 1440), narrow = await boothAt(browser, 390);
assert.strictEqual(wide.h, 135, '1440: booth stands at its design height');
assert.strictEqual(narrow.h, 93, '390: booth is clamped to the headroom');
assert.strictEqual(narrow.signOnPanel, true, '390: the sign moves onto the panel');
assert.strictEqual(wide.signOnPanel, false, '1440: the sign sits above the roofline');
```

Review Focus case 3 — the booth is themed, not frozen:

```js
// Case 5 — the booth re-inks on a theme flip rather than keeping its spawn colour.
const p = await makePage(browser, '?evlines=election-day#figdebug');
await settle(p);
const light = await boothInk(p);
await p.evaluate(() => { localStorage.setItem('ev:color-scheme', 'dark'); document.documentElement.setAttribute('data-theme', 'dark'); });
await p.waitForTimeout(400);
const dark = await boothInk(p);
assert.notDeepStrictEqual(light, dark, 'the booth must take its colour from the live theme each frame');
```

`boothAt` reads `__evFigDebug.boothRect()`; `boothInk` samples one pixel of the panel's stroke. Add `boothRect` to the debug surface.

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/layout/election-polls.cjs`
Expected: FAIL — `boothRect` is not a function.

- [ ] **Step 3: Implement `boothRect(e, w)` in `ev-figures.js`**

- `x` = `POLL.INSET_WIDE` when `window.innerWidth > 900`, else `POLL.INSET_NARROW`.
- `w` = `POLL.BOOTH_W`.
- `h` = `POLL.BOOTH_H`, clamped to `POLL.CLAMP_H` **when the booth's horizontal footprint overlaps `.meta-row`'s rect**. Read that rect each frame, the way `runLightGag` already measures the 501(c)(3) swatch — not a fixed breakpoint, so it does not go wrong when the hero's layout moves.
- `signOnPanel` is true exactly when the clamp fired. A voter has to be hidden while he votes, so the panel cannot be shorter than a 71px figure; of a 93px total that leaves 22px above the roofline, which is not a sign. Below the clamp the VOTE board goes on the panel's face instead.
- `doorX` is the right-hand side of the panel, so the door faces the queue.

**900px is the width to watch and the margin there is 2px**: clear floor 114, booth ends at 16 + 96 = 112. At 901 it clamps instead, which is correct rather than broken. Screenshot 900 and 901 side by side.

- [ ] **Step 4: Implement `drawBooth(ctx, r, cr)` in `ev-figures.js`**

A front panel, a dark doorway on its right-hand side with a lip over it, and the VOTE board — above the roofline, or on the panel face when `r.signOnPanel`. Every ink dimension a **ratio of `r.w` and `r.h`**, per the ghost's precedent, so re-sizing is two numbers and nothing else.

Colours through `cssVar` **on each call**, never captured once — that is Review Focus case 3. The sign's lettering is canvas text in the page's own font stack, because it has to stay legible at sign size.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/layout/election-polls.cjs`
Expected: PASS

- [ ] **Step 6: Look at it**

Screenshot the hero at 1440 and 390, in both themes, and at 900 and 901 side by side. Green tests do not prove a figure is visible.

- [ ] **Step 7: Commit**

```bash
git add ev-figures.js tests/layout/election-polls.cjs
git commit -m "feat(figures): the booth, clamped so it never covers the 501(c)(3) line"
```

---

### Task 6: The queue

**Files:**
- Modify: `ev-figures.js` — `runPolls()` and its helpers in the new block
- Test: `tests/layout/election-polls.cjs`

**Interfaces:**
- Consumes: `boothRect()` from Task 5; `takeTone()` (line 1791); `A.*` pose frames; `IDLES` (line 1776); `GSPEED` (line 1775).
- Produces: `POLLS`, an array of `{x, tone, state, slot, say}` with `state` one of `'arriving' | 'waiting' | 'voting' | 'leaving'`. `__evFigDebug.polls()` returns it. `e._bodies` is published every frame.

- [ ] **Step 1: Write the failing tests**

```js
// Case 6 — a line forms, and it is mixed.
await settle(p, 12000);
const q = await p.evaluate(() => window.__evFigDebug.polls().filter(f => f.state === 'waiting'));
assert.ok(q.length >= 4, 'at least four people should be waiting, got ' + q.length);
assert.ok(new Set(q.map(f => f.tone)).size > 1, 'the line must not be all one colour');

// Case 7 — the line MOVES. Positions changing, not a count holding steady: a count
// is right in both the working case and the frozen one.
const before = await p.evaluate(() => window.__evFigDebug.polls().map(f => [f.state, Math.round(f.x)]));
await p.waitForTimeout(9000);
const after = await p.evaluate(() => window.__evFigDebug.polls().map(f => [f.state, Math.round(f.x)]));
assert.notDeepStrictEqual(before, after, 'the queue must advance, not freeze');
const seen = await p.evaluate(() => window.__evFigDebug.pollStates());   // states observed since load
for (const s of ['arriving', 'waiting', 'voting', 'leaving']) {
  assert.ok(seen.includes(s), 'nobody was ever ' + s);
}
```

Review Focus case 4 — the narrowest real viewport:

```js
// Case 8 — at 320px the queue fits inside its own canvas.
const tiny = await makePage(browser, '?evlines=election-day#figdebug', { width: 320, height: 700 });
await settle(tiny, 12000);
const over = await tiny.evaluate(() => {
  const e = window.__evFigDebug.entries.find(x => x.spec.mode === 'beam' && !x.spec.plain);
  return window.__evFigDebug.polls().filter(f => f.state === 'waiting' && f.x > e.c.width - 8).length;
});
assert.strictEqual(over, 0, '320px: no waiter may stand off the right edge of the canvas');
assert.strictEqual(await tiny.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false,
  '320px: the page must not grow a horizontal scrollbar');
```

Review Focus case 5 — a resize re-seats the line:

```js
// Case 9 — waiters re-seat against the new slots after a resize, not stale positions.
await p.setViewportSize({ width: 760, height: 900 });
await p.waitForTimeout(1500);
const slots = await p.evaluate(() => window.__evFigDebug.pollSlots());
const seated = await p.evaluate(() => window.__evFigDebug.polls().filter(f => f.state === 'waiting'));
for (const f of seated) {
  assert.ok(Math.abs(f.x - slots[f.slot]) < 24, 'after a resize, waiter ' + f.slot + ' is at a stale x');
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/layout/election-polls.cjs`
Expected: FAIL — `polls()` returns an empty array.

- [ ] **Step 3: Implement the slot geometry in `ev-figures.js`**

`slotX(i, w, r)` = `r.doorX + POLL.GAP0 + i * gap(w)`, where `gap(w)` scales with the canvas and clamps to `POLL.GAP_MIN`–`POLL.GAP_MAX`. A fixed 30px would put the back of an eight-person line about 300px from the left edge of a 1440px page, which is a huddle, not a queue.

Expose `__evFigDebug.pollSlots()` returning the current slot positions, for the resize case.

**Cap the target by what fits**: the number of slots that land inside `w - 8`. That is what makes the 320px case pass by shrinking the line rather than overflowing it.

- [ ] **Step 4: Implement the state machine in `runPolls()`**

Four states, each advancing on `dt`:

- `arriving` — walks in from `w + 20` at `GSPEED.stroll` to the first free slot, then becomes `waiting`. **The long approach walk is deliberate**: it keeps somebody moving in the empty right half of the lane. Tune `ARRIVE_GAP`, not the walk speed, so there is usually one person in transit and sometimes two.
- `waiting` — stands on its slot with one of `IDLES` chosen at spawn; one or two of the line carry the `phone` prop that sitters already use (`leremy-rig.js:133` reads `opts.phone` against any pose). A queue of identical statues is the failure mode here.
- `voting` — the slot-0 waiter walks to `r.doorX` and is hidden behind the panel for `POLL.VOTE_SECS`. Everyone behind steps up one slot at `SHUFFLE_SPEED` — a short walk on their own feet, never a teleport.
- `leaving` — emerges and walks left past the booth to `-20`, then is spliced out. **Drawn after the booth**, so he passes in front of the panel: going in is the move that hides someone, and the exit has to read as the opposite.

Population: hold a target re-drawn from `TARGET_MIN`–`TARGET_MAX` from time to time, so the line visibly grows and shrinks. Below target, schedule an arrival every `ARRIVE_GAP`.

Colours from `takeTone()` — the shuffled bag the cast already uses, so the line is mixed and neighbours rarely match.

**Recompute every slot from `slotX()` each frame** rather than storing an absolute x on a waiter. That is what makes the resize case pass: `reposition()` re-fits the canvas and both the clamp and `gap(w)` are functions of width, so a stored position is stale the moment the viewport moves.

- [ ] **Step 5: Publish `_bodies` and `_figX` every frame**

`e._bodies` is the list of every figure drawn this frame, as `{x, floor, col}` — waiters, the arriver, the leaver. The draw loop's rule is that `_bodies` is this frame's or it is nothing, and a scene that forgets to publish draws itself alone; the exodus needs the list to split the queue into separate runners. Task 8 is what proves this.

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tests/layout/election-polls.cjs`
Expected: PASS

- [ ] **Step 7: Look at it**

Watch a full cycle at 1440 and at 390 — somebody arriving, the line shuffling, somebody voting and leaving. Check the line reads as a queue rather than a huddle or a train.

- [ ] **Step 8: Commit**

```bash
git add ev-figures.js tests/layout/election-polls.cjs
git commit -m "feat(figures): a line that forms, shuffles, votes and leaves"
```

---

### Task 7: Clicking a waiter

**Files:**
- Modify: `ev-figures.js` — a branch in the click dispatcher (line 108, beside the zombie branch at line 128); `pollSay()` in the new block; `POLL_LINES` beside it
- Test: `tests/layout/election-polls.cjs`

**Interfaces:**
- Consumes: `POLLS` from Task 6; `EVQuotes.open({headX, headY, tone, tight, quote:{text}})` and `EVQuotes.close(handle)`.
- Produces: `f.say` fixed at spawn; `f.qh` the open bubble handle.

- [ ] **Step 1: Write the failing test**

```js
// Case 10 — click a waiter and he says his line; click again and it goes away.
const hit = await p.evaluate(() => {
  const f = window.__evFigDebug.polls().find(x => x.state === 'waiting');
  return f ? { x: f.sx, y: f.fy } : null;
});
assert.ok(hit, 'needed a waiter to click');
await p.mouse.click(hit.x, hit.y - 30);
await p.waitForTimeout(300);
assert.strictEqual(await p.evaluate(() => window.EVQuotes.openCount()), 1, 'a click opens one bubble');
await p.mouse.click(hit.x, hit.y - 30);
await p.waitForTimeout(300);
assert.strictEqual(await p.evaluate(() => window.EVQuotes.openCount()), 0, 'a second click puts it away');

// Case 11 — the same person says the same thing, however many times you prod him.
const first = await p.evaluate(() => window.__evFigDebug.polls().find(x => x.state === 'waiting').say);
await p.mouse.click(hit.x, hit.y - 30); await p.waitForTimeout(200);
await p.mouse.click(hit.x, hit.y - 30); await p.waitForTimeout(200);
const again = await p.evaluate(() => window.__evFigDebug.polls().find(x => x.state === 'waiting').say);
assert.strictEqual(first, again, 'the line is fixed at spawn, not drawn per click');

// Case 12 — his bubble closes when he steps forward.
await p.mouse.click(hit.x, hit.y - 30); await p.waitForTimeout(200);
await p.evaluate(() => window.__evFigDebug.pollAdvance());   // force a shuffle
await p.waitForTimeout(600);
assert.strictEqual(await p.evaluate(() => window.EVQuotes.openCount()), 0, 'stepping forward closes the bubble');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/layout/election-polls.cjs`
Expected: FAIL — the click opens nothing.

- [ ] **Step 3: Add `POLL_LINES` and `pollSay()` to `ev-figures.js`**

A small pool, drawn **at spawn** and stored on the figure, so the same person says the same thing however many times you prod him — the rule the zombies' easter egg established. Tone: people in a queue, not a campaign. Ordinary, slightly wry, nothing about who to vote for. The host speaks for the organization; a person in a line speaks for himself. Starting pool, to be reviewed:

```js
var POLL_LINES = [
  "Been here twenty minutes.",
  "Worth the wait.",
  "Shorter than last time.",
  "I brought a book.",
  "Line's moving."
];
```

`pollSay(f)` opens with `tight: true` — a four-word line in the greeter's fixed 300px box is mostly bubble, a lesson already paid for — and no `who`, since he is speaking for himself.

- [ ] **Step 4: Add the click branch**

In the dispatcher at line 108, beside the zombie branch, matching its shape: a box test against the figure's published screen coords, `hitBubble = true`, then close the open handle if there is one, else `pollSay(f)`. Each waiter must publish `f.sx` / `f.fy` (screen x, floor y) from the draw loop for the dispatcher to aim at, the way every other clickable mode does.

- [ ] **Step 5: Close the bubble on a step**

When a waiter's state or slot changes, close `f.qh` if it is open. **The zombies' moving bubble is deliberately not reused here**: a waiter stands still except during a shuffle, so closing on the step is the cheap right answer rather than carrying the re-pin-every-frame machinery into a second place. Expose `__evFigDebug.pollAdvance()` to force a shuffle for the test.

Also time the bubble out after `POLL.SAY`, as the zombies do.

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tests/layout/election-polls.cjs`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add ev-figures.js tests/layout/election-polls.cjs
git commit -m "feat(figures): prod somebody in the line and he answers"
```

---

### Task 8: The exodus, the harness guard, and the suite

**Files:**
- Test: `tests/layout/election-polls.cjs`
- Modify: `README.md` — a new section after "Seasonal takeovers"

**Interfaces:**
- Consumes: everything above.
- Produces: nothing new. This task proves the feature is safe and documents it.

- [ ] **Step 1: Write the exodus test**

This is the case the first draft of the spec got wrong, and the correction is the point. It cannot be "the page is still animating": the polls entry **has** an anchor, so `armAll` (`ev-figures.js:1692`, `if (!e.el) return;`) arms it, the whole queue correctly flees, and once nothing is left `POOF.phase` goes to `'cleared'` (line 1702) — nothing moving is the **right** outcome. Halloween's version only works because a zombie is anchorless and gets skipped.

The real distinction is fleeing versus throwing:

```js
// Case 13 — a poof takes the queue cleanly: nothing throws, and they actually run.
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await settle(p, 10000);
const start = await p.evaluate(() => window.__evFigDebug.polls().map(f => Math.round(f.x)));
await longPressABobit(p);                     // the 3s right-button hold, as tests/poof/ does
await p.waitForTimeout(4000);
assert.deepStrictEqual(errs, [], 'a poof must not throw: ' + errs.join(' | '));
const mid = await p.evaluate(() => window.__evFigDebug.polls().map(f => Math.round(f.x)));
assert.notDeepStrictEqual(start, mid, 'the queue must RUN, not freeze where it stood');
await p.waitForTimeout(6000);
assert.strictEqual(await p.evaluate(() => window.__evFigDebug.polls().length), 0, 'everyone leaves');
```

The positive half is the half that catches it: a throw inside `tick()` leaves no error on the page and nothing else looks wrong until you notice nobody moves.

- [ ] **Step 2: Write the visitor-guard test**

The `navigator.webdriver` gate could just as easily hide the scene from every real visitor while the suite stayed green. So, as the Halloween suite already does, spoof it back and check the page agrees with the wall calendar:

```js
// Case 14 — the guard is a HARNESS guard, never a visitor guard.
const real = await browser.newPage();
await real.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
await real.goto(BASE + '#figdebug');          // no ?evlines= at all
await settle(real);
const isDay = await real.evaluate(() => window.EVLines.context({}).tags.includes('election-day'));
assert.strictEqual(await real.evaluate(() => window.__evFigDebug.election), isDay,
  'a real visitor must see the scene exactly when the calendar says Election Day');
```

- [ ] **Step 3: Run the new suite**

Run: `node tests/layout/election-polls.cjs`
Expected: PASS, all fourteen cases.

- [ ] **Step 4: Run the whole suite, detached, one last time**

Run: `node run-tests.mjs`, `run_in_background: true`. Wait for the completion notification.
Expected: every file PASSes. **The 36 files that load `index.html` with no `?evlines=` are the ones that matter here** — they must be completely unaffected, because the gate keeps the scene off under the harness. A failure in one of those is a real regression, not a test to update.

This is the same gate every earlier task already passed before its own commit; here it is the final one over the whole branch.

- [ ] **Step 5: Write the README section**

A new section after "Seasonal takeovers", in that section's voice — what it does, and the decisions a future reader would otherwise have to rediscover. Cover at least:

- The date is a dialogue tag, not a second calendar, and it switches itself off on 4 November.
- `?evlines=election-day` previews the scene; `?evdays=7` previews the countdown's number, and deliberately does not touch the tags.
- Why the scene lives on the crew's own entry: an anchorless entry threw inside `tick()` and took the whole figure layer down for a session, which is the Halloween bug this avoids by construction.
- Why the booth's height is clamped, and that **900px has 2px of margin**.
- Why the DST argument that looks obvious is backwards, and why there is no test for it.
- That `Math.round` is used by rule rather than by the November coincidence.

- [ ] **Step 6: Commit**

```bash
git add tests/layout/election-polls.cjs README.md
git commit -m "test(figures): a poof takes the queue cleanly, and the guard is a harness guard"
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task: the date rule and day counting → 1; the never-null fact → 1; three tags → 2; `{days}`, copy and ordering → 3; preview levers → 1 and 2; the one-entry decision, the gate, the `plain` guard and `beamPick` → 4; the booth and its clamp → 5; the queue, `_bodies` and colours → 6; clicking a waiter → 7; the six scene tests, the exodus correction, the 36-file regression and the README → 8.

**Carried from the spec and not re-derived:** 30-day window; 93px clamp; 135px booth; 96px panel; 44/16px insets; 26–46px gap; 4–8 target; `Math.round`; `?evdays=`; the three tag names; the five copy ids; `__evFigDebug.polls()` and `.electionDay`.

**Type consistency.** `boothRect()` produces `{x, y, w, h, doorX, signOnPanel}` in Task 5 and is consumed under those names in Task 6. `POLLS` entries are `{x, tone, state, slot, say}` in Task 6, extended with `sx`/`fy`/`qh` in Task 7, and read under those names in Tasks 7 and 8. `POLL` is the constants object in every task that reads it.

**Review Focus coverage.** All five have a test in the task that owns the code: junk `?evdays=` → Task 1 Step 1; no-tag fallback → Task 3 Step 1; theme flip → Task 5 Step 1 case 5; 320px → Task 6 Step 1 case 8; resize → Task 6 Step 1 case 9.

**Proportion.** The plan is shorter than the spec it implements. Code blocks are test assertions and exact copy — the two things the implementer cannot invent — not function bodies.
