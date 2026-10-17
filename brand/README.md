# Brand Assets

Source-of-truth logo, symbol, and favicon files for the Empowered Vote product suite.
Served statically at `/brand/<product>/...` (see `render.yaml`).

## Layout

Each product follows the same structure:

```
brand/<product>/
├── Favicon/
│   ├── ICO/    favicon .ico files (light/dark where available)
│   └── PNG/    16–512px favicon PNGs
├── Logo/
│   ├── PNG/    400w / 800w / 1200w / 2400w wordmark PNGs
│   └── SVG/    scalable wordmark
└── Symbol/
    ├── PNG/    64–1024px icon-mark PNGs
    └── SVG/    scalable icon mark
```

## Products

| Folder             | Product          | Dark/Light |
| ------------------ | ---------------- | ---------- |
| `compass/`         | Compass          | both       |
| `essentials/`      | Essentials       | both       |
| `read-and-rank/`   | Read & Rank      | both       |
| `treasury-tracker/`| Treasury Tracker | logo both; symbol light + dark SVG (symbol PNGs & favicon still single-color) |

## Site usage

The landing page product **cards** (`index.html`) use hand-tuned symbol copies in
`icons/` — cropped so the marks align consistently in the card grid. Those are the
live glyphs; the files here are the untouched source of truth. Sync any card change
back to the tuned `icons/` versions rather than pointing cards at these directly.

## Notes

- **The dark rule** — a `-dark` file is its light file with the deep teal
  `#00657C` replaced by skyblue-500 `#59B0C4`, and nothing else changed. Coral
  `#FF5740`, the yellows and the grey grid stay put. The touchstone is
  `public/EVLogo-dark.svg`, which is `public/EVLogo.svg` with exactly that one
  substitution. Civic Trivia does the analogous lift on its second teal
  (`#6BA6B3` → `#AAE7F5`). When a dark variant looks wrong, diff its colour set
  against the light one and check it is that one substitution.

  The rule governs **type and line work**. A mark that is already drawn to sit on
  any ground is exempt: the Treasury money graphic is outlined in brand yellow at
  12.4:1, so its teal stays `#00657C` in both themes and the note below explains
  why. No brand file should hold `#1DA8C6`: that is the dark-mode **UI** teal, and
  it belongs in `--teal` on the site and in `ev-ui`'s `SiteFooter`, not in a mark.

- **Compass dark variant** — the brand pack shipped no true dark logo (the dark
  files were copies of the light artwork). The dark SVGs and PNGs are a recolor
  of the light artwork, and they follow the rule above.

  They used `#1DA8C6` until 2026-10-17. That is the landing page's dark-mode
  `--teal` — a **UI** colour, not a brand one — so Compass was the only mark in
  the pack that did not follow its own house rule, and the dark mark disagreed
  between repos because of it. `#59B0C4` also reads better on every dark ground
  in use: **7.12:1** on `gray-900` `#111827` against 6.31:1, **5.89:1** on
  `gray-800` `#1F2937` against 5.22:1, **7.57:1** on the `#111113` video stage
  against 6.71:1. CompassV2 had already moved its own rasters to `#59B0C4`, and
  the rebuilt dark favicons here are byte-identical to the five it ships.

  This changed **nothing on UI surfaces**: `--teal` in the site pages and the
  dark teal in `ev-ui`'s `SiteFooter` keep `#1DA8C6`.

  The Compass is not the Treasury case. Its hexagon and spokes **are** the teal —
  there is no yellow outline carrying the shape — so on a dark ground the colour
  is the only thing drawing the mark, and `#00657C` at 2.66:1 genuinely does not
  read. That is why Compass takes the dark rule and the money graphic does not.

- **Compass rasters are generated** (2026-10-15). Everything under
  `compass/Logo/PNG`, `compass/Symbol/PNG`, `compass/Favicon/PNG` and
  `compass/Favicon/ICO` is built from the two Compass SVGs by
  `tools/gen-compass-rasters.mjs`. Edit the SVG and re-run it; do not retouch
  a PNG.

  They had to be rebuilt because they did not match their own source. The red
  ring measured 5px across in `compass-symbol-light-512.png` where a faithful
  render of the SVG puts it at 18px — every stroke in the pack was about 3.5
  times too thin, which is what an export that does not scale stroke widths
  with the artboard looks like. At 64px the ring did not survive an alpha test
  at all, so the favicon showed a hexagon in an invisible circle.

  The same day the ring in the SVGs was thickened, 6 to 9.6, because it did
  not read at small sizes even when rendered correctly. It went to 12 first
  and came back to four fifths of that, which is where it sits. Both changes
  are in the rebuilt files, so the pack's ring is much heavier than the one it
  replaces.
  Framing is unchanged for the square files. The logo PNGs keep their named
  widths and their flush-left, 1%-padding convention, and their canvas height
  follows the artwork, so 800w went from 800×217 to 800×221.

- **Treasury Tracker dark symbol** (added 2026-09-08, for the Civic Spaces
  sidebar) — `treasury-tracker-symbol-dark.svg` here and `treasury-symbol-dark.svg`
  in `icons/`. ⚖ **DECIDED 2026-10-17: the money graphic is exempt from the dark
  rule. Its teal stays `#00657C` on every ground, and these two files are
  byte-identical to the light artwork.** Do not "fix" them.

  **Why the mark does not need a dark variant.** Each bill is a rect *outlined*
  in brand yellow at `stroke-width="2"`, and the magnifier is a yellow fill. On
  `#111827` that yellow is **12.4:1**. The shape is drawn by the outline, so the
  fill never has to carry legibility — a dark fill inside a bright outline is
  what a banknote looks like, and that read is the point of the mark.

  **What `#00657C` is doing is hue, not contrast.** All the candidates sit at the
  same hue, 191°; they differ in saturation and lightness. `#00657C` is 100%
  saturated at 24% lightness and reads as green. `#59B0C4` is 48% at 56% and
  reads as pale blue. Brightening the bills measured 2.66:1 → 7.12:1 on the
  *fill* and lost the thing the mark is for.

  🪦 **The history, so nobody re-derives the wrong answer.** From 2026-09-08 this
  file carried a selective recolor: five paths brightened to `#1DA8C6` "because
  `#00657C` is only 2.66:1 on the page ground", with the `$` glyph left deep
  because it sits on brand yellow. On 2026-10-17 those five moved to `#59B0C4`
  (#31) to get the UI teal out of the brand library, and were reverted the same
  day. **The 2.66:1 figure was measuring the wrong element** — see above. The `$`
  glyph reasoning was always sound and is now moot, since nothing is brightened.

  ✅ **The dark Logo lockup was right all along.** Its wordmark is `#59B0C4` and
  the symbol half embedded in it is 6 × `#00657C`, which is exactly this rule:
  **type follows the dark rule, the money graphic does not.** It was briefly
  logged here as a defect needing an eight-PNG rebuild; it is not, and its
  rasters are correct as shipped.

  **No dark symbol PNGs were generated** — no rasteriser was available on the
  machine that made these. `Symbol/PNG/` is still light-only, so anything needing
  a dark raster mark has to render it from the SVG.
