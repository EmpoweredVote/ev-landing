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

  This changes **nothing on UI surfaces**: `--teal` in the site pages, the dark
  teal in `ev-ui`'s `SiteFooter`, and the Treasury Tracker dark symbol below all
  keep `#1DA8C6`.

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
  in `icons/`. This one is the exception to the dark rule twice over: it uses
  the UI teal `#1DA8C6`, and it applies it **selectively, not to every teal in
  the file**. The second part is deliberate and matters if you regenerate it:

  | Element | Sits on | `#00657C` | `#1DA8C6` |
  | --- | --- | --- | --- |
  | 3 stacked rects (fill) | the page background | 2.66:1 ✗ | **6.31:1 ✓** |
  | magnifier hairline strokes | the page background | — | brightened to match |
  | `$` glyph (fill) | its own yellow circle | **4.66:1 ✓** | 1.97:1 ✗ |

  Contrast ratios vs `#111827` (Tailwind `gray-900`, the dark card ground this was
  derived for) and vs `#FFD426`. The margin only widens on a lighter dark ground —
  on `gray-800` `#1F2937` it is 2.20:1 vs 5.22:1, same conclusion. A
  blanket swap fixes the outer mark and **wrecks the `$` glyph** — bright teal on
  brand yellow is 1.97:1, which mushes at a 24px sidebar icon size. So the `$`
  path keeps `#00657C`; the file is 5 × `#1DA8C6` + 1 × `#00657C` by design, and
  that lone dark teal is not an oversight.

  The rule this generalises to: brighten the teal that meets the **page ground**,
  leave the teal that sits on **brand yellow** alone.

  ▶ Whether the five brightened paths should move from `#1DA8C6` to the brand
  `#59B0C4`, the way Compass just did, is **open**. The contrast argument above
  points that way — `#59B0C4` is 7.12:1 on `gray-900` and 5.89:1 on `gray-800` —
  and the `$` glyph would keep `#00657C` either way, since skyblue on brand
  yellow is 1.74:1, worse still. It is left alone here because this file is a
  deliberate, documented decision and changing it is a separate call.

  **No dark symbol PNGs were generated** — no rasteriser was available on the
  machine that made these. `Symbol/PNG/` is still light-only, so anything needing
  a dark raster mark has to render it from the SVG.
