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

- **Compass dark variant** — the brand pack shipped no true dark logo (the dark
  files were copies of the light artwork). The dark SVGs and PNGs are now a
  recolor of the light artwork with the dark teal `#00657C` swapped for the
  bright teal `#1DA8C6` (the dark-mode `--teal`), so the wordmark/mark read on
  dark backgrounds. Coral/yellow are unchanged.

- **Treasury Tracker dark symbol** (added 2026-09-08, for the Civic Spaces
  sidebar) — `treasury-tracker-symbol-dark.svg` here and `treasury-symbol-dark.svg`
  in `icons/`. Same recolor rule as Compass, but applied **selectively, not to
  every teal in the file**, and the distinction matters if you regenerate it:

  | Element | Sits on | `#00657C` | `#1DA8C6` |
  | --- | --- | --- | --- |
  | 3 stacked rects (fill) | the page background | 2.20:1 ✗ | **5.22:1 ✓** |
  | magnifier hairline strokes | the page background | — | brightened to match |
  | `$` glyph (fill) | its own yellow circle | **4.66:1 ✓** | 1.97:1 ✗ |

  Contrast ratios vs `#1F2937` (the dark sidebar ground) and vs `#FFD426`. A
  blanket swap fixes the outer mark and **wrecks the `$` glyph** — bright teal on
  brand yellow is 1.97:1, which mushes at a 24px sidebar icon size. So the `$`
  path keeps `#00657C`; the file is 5 × `#1DA8C6` + 1 × `#00657C` by design, and
  that lone dark teal is not an oversight.

  The rule this generalises to: brighten the teal that meets the **page ground**,
  leave the teal that sits on **brand yellow** alone.

  **No dark symbol PNGs were generated** — no rasteriser was available on the
  machine that made these. `Symbol/PNG/` is still light-only, so anything needing
  a dark raster mark has to render it from the SVG.
