# Zoom virtual backgrounds

Generates Empowered Vote Zoom virtual backgrounds (1920×1080 — Zoom's recommended size). The
rendered PNGs are committed in [`out/`](out) — grab them there, or regenerate.

## Run

```bash
cd ev-landing/tools/zoom-bg
npm install            # first time only (installs resvg)
node gen-zoom-bg.mjs   # writes 6 PNGs to ./out/
```

## The set

| File | Style | Logo |
| --- | --- | --- |
| `ev-zoom-dark.png` / `ev-zoom-light.png` | solid page background + faint ring | bottom-right |
| `ev-zoom-dark-top.png` / `ev-zoom-light-top.png` | solid page background + faint ring | top-right |
| `ev-zoom-dark-aurora.png` / `ev-zoom-light-aurora.png` | bottom "aurora" glow | top-right |

- **solid** uses the ev-landing page background (`#111113` dark, `#FFFFFF` light).
- **aurora** is a Webex-style glow rising from the bottom edge, built from the four core EV
  colours as overlapping radial blooms — warm (yellow `#FED12E`, coral `#FF5740`) on the left,
  cool (dark teal `#00657C`, bright teal `#59B0C4`) on the right.
- The logo is the master EV wordmark from `../../icons` — `logo-dark.png` on dark grounds,
  `logo-light.png` on light.

## Tweak

Everything is driven from the bottom of `gen-zoom-bg.mjs`:

- **Logo position** — `pos`: `'br' 'bl' 'tr' 'tl'` (corner) or `'top'` (top-centre).
- **Aurora colours / layout** — the `BLOOMS` array (colour, centre, radius per bloom).
- **Aurora intensity** — the `peak` opacity in `auroraSVG` (dark 0.9 / light 0.6).

## Notes

- **Zoom mirrors your self-view**, so the logo looks flipped **to you** — everyone else sees it
  correct. Add mirrored exports only if you want it to read right in your own preview.
- Add to Zoom via **Settings → Background & Effects → +**.
