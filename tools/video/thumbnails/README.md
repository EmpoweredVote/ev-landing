# Video share cards

Twelve PNGs: six features at two sizes. They are generated, not drawn — run

```bash
NODE_PATH="C:/Users/Chris/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules" \
  node tools/video/make-thumbnails.mjs
```

and every file here is rewritten. Edit the generator, never the PNGs.

| Size | Where it is for |
| --- | --- |
| 1280×720 | YouTube video thumbnail |
| 1200×627 | LinkedIn share image |

Both are the same composition. Every length in the generator is scaled by
`height / 720`, so the card does not get redesigned for the second size.

## What is on the card

The dark ground is `#111113`, which is `--bg` in the site's dark theme. The
Empowered Vote mark sits alone in the top left, with no wordmark. The feature
lockup — mark and name together — sits in the middle. Nothing else is on the
card, so the file does not go stale when a figure or a date changes.

Lockups come from `brand/<product>/Logo/SVG/<name>-logo-dark.svg`, the
pristine source files, not from the seam-tuned copies in `icons/`. Those
copies are cut for the 64px row on the homepage and are the wrong input here.

The Empowered Vote mark has no file of its own anywhere in the repo. It is
the right-hand third of `icons/logo-dark.png`, cropped by measurement rather
than by eye: the wordmark and the mark are separated by a single run of 40
transparent columns, and the mark's ink box is x 425..687 of 688, full height.

## Why the lockups are sized by area

The six lockups do not share a shape. Essentials is more than four times as
wide as it is tall; Fallacy Finders is less than three times. Fitting them
all into one box makes the squarer ones read half again as large. Each one is
measured with `getBBox()`, its viewBox is replaced by its own ink box so that
padding in the source file cannot change the result, and it is then scaled so
every card covers the same ink area. The scale factors land between 1.18 and
1.57, and the cards read as one family.

## The one thing to decide

The Civic Trivia lockup reads **championship**, singular. The site, the film
and the file name here all say **championships**. The artwork was left alone.
