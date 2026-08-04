# Quote-bubble fit test

A dev page for answering one question: **does each quote actually fit in the speech bubble a visitor
sees?** Every reading Bobit in the pool sits on a shelf; click him and the homepage's *real*
`.ev-quote` opens above his head.

It exists because reading the quotes off a page tells you nothing about whether they fit. The quote
text is deliberately **not printed anywhere** on this page except inside a bubble, and `verify.cjs`
asserts that, so it cannot creep back in.

## Use it

```sh
node tools/bubble-rig/build.cjs                       # -> tools/bubble-rig/bubble-rig.html
NODE_PATH=<playwright> node tools/bubble-rig/verify.cjs
```

`build.cjs` inlines `leremy-rig.js` and `ev-quotes.js` into `template.html`. **Rebuild after touching
either of those** or you are looking at an old pool. The build prints the quote and speaker count so a
stale build is obvious.

The built file is body-content only, because it is published as a Claude artifact and the host supplies
the `<!doctype>`/`<head>`/`<body>` wrapper. `verify.cjs` adds an equivalent wrapper so it can be opened
directly. Both the built page and the wrapper are gitignored — build them, don't commit them.

## What is real here, and what isn't

Real, copied unmodified from the site so the test means something:

- `ev-quotes.js` — the actual bubble component: `open`/`close`/`tick`, the 12-second `LIFE` timer,
  the tail that slides to keep pointing at his head when the bubble is clamped sideways.
- The `.ev-quote` CSS block, lifted verbatim out of `index.html`, along with the exact tokens it
  depends on (`--card`, `--heading`, `--muted`, `--radius-card`, `--shadow-md`) in both themes.
  **If you change that CSS in `index.html`, change it here too** — a divergence makes this page lie.
- The `read` → `lookup` → `hold` → `resume` pose sequence and the `(128 + R) * S` head-top anchor in
  document coordinates, both matching `ev-figures.js`.

Deliberately different, to keep it readable:

- Opening one reader closes any other. The homepage allows several bubbles at once.
- Readers sit on a shelf rather than a note-card edge.
- Bubbles overlay whatever is above them. That *is* production behaviour, not a layout bug.

## Two traps worth knowing

**Quotes are keyed by a snippet of their own text, never by array index.** An earlier version used
indices; removing one quote from the pool silently shifted every theme and every correction note after
it onto the wrong reader. If a key ever matches zero or several quotes, or a quote in the pool is
claimed by no theme, the page renders a loud "this is a wiring bug" section naming it — and
`verify.cjs` fails if that section appears.

**The tallies are counted from the data, and counted from the right field.** Hand-typed, the speaker
count was wrong (8 for 9 speakers). Counted off the chips' CSS class, the correction count was wrong
too (9, because `fix` styling covers Corrected *and* Restored *and* the elision note). They now count
chip labels. Check any number here against the prose in `presidential_quotes.md`.

## Bubble geometry, measured

The bubble is a fixed `width: 300px` with `max-width: calc(100vw - 16px)`, so **the clamp does not
bite at real phone widths** — it only engages below a 316px viewport. At 390px you still get 300px.

"Measure every bubble" renders each quote through the real component off-screen and reports its true
height, sorted tallest first. As of the 18-quote pool: tallest 300×263 (Jefferson to Carrington, 296
chars), shortest 300×151 (Jefferson to Price, 84 chars). Nothing overflows.
