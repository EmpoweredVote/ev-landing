# OG share-card generator

Generates the Open Graph share card (`og-image.png`, 1200×630) for Empowered Vote apps —
the thumbnail that shows when a link is posted to Slack, iMessage, X, Facebook, etc.

One house template, driven by a small per-product config: dark ground, a teal bar down the
left edge, the product wordmark top-left, a short two-line white headline, a teal rule + the
site URL, faint concentric rings on the right, and the yellow/teal/coral brand dots.

## Run

```bash
cd ev-landing/tools/og-card
npm install                       # first time only (installs resvg + Manrope TTFs)
node gen-og-card.mjs              # generate the real targets (civic-spaces, ev-landing)
node gen-og-card.mjs civic-spaces # generate one card by key
node gen-og-card.mjs --all        # every card, including the --validate proof cards
```

Each card is written straight to its app repo (e.g. `civic-spaces/public/og-image.png`,
`ev-landing/og-image.png`). Commit the PNG in that app's repo, not here.

## Add a card

Edit the `CARDS` object in `gen-og-card.mjs`:

```js
'my-app': {
  out: join(GH, 'my-app/public/og-image.png'),   // where the PNG lands (Vite: public/; static site: repo root)
  wordmark: { type: 'text', top: 'my', bottom: 'app' },   // two-tone stacked, the house style
  // — or, when the app has a brand logo —
  // wordmark: { type: 'image', src: join(EV_LANDING, 'brand/my-app/Logo/PNG/my-app-logo-dark-800w.png'), w: 300 },
  headline: ['One short line,', 'then a second.'],  // max two lines
  url: 'myapp.empowered.vote',                      // bare host, no scheme
},
```

Then add the matching `<head>` tags to that app's `index.html` — copy them from an app that
already has them (Compass, Read & Rank). The rule: `og:title` matches `<title>`,
`og:description` matches the meta description, and `og:image` points at
`https://<host>/og-image.png`.

## How it renders

- Pure Node. Builds one self-contained SVG and rasterizes it with **`@resvg/resvg-js`** — a
  prebuilt native module, so there is no headless-browser download. (The brand box has no
  rasteriser; see `../../brand/README.md`.)
- Text is set in **Manrope** (the brand font), loaded from `@expo-google-fonts/manrope` as TTF.
- `image` wordmarks embed a logo PNG as a data URI. `text` wordmarks are two-tone stacked
  Manrope ExtraBold — teal top word, coral bottom word — matching "empowered / compass".

## Brand tokens

Sampled from the live hand-made cards (`read-rank/public/og-image.png`). If a value ever drifts:

```bash
magick read-rank/public/og-image.png -format '%[pixel:p{8,315}]' info:   # -> the teal bar
```

| Token | Value |
| --- | --- |
| background | `#131416` |
| teal (bar, rule, url, dot) | `#59B0C4` |
| coral | `#FF5740` |
| yellow | `#FFD426` |

## Validation

`node gen-og-card.mjs read-rank` regenerates the existing Read & Rank card from its brand logo
into `/tmp/og-validate-readrank.png`. Compare it to `read-rank/public/og-image.png` to confirm
the template still matches the hand-made originals before you trust a new card.
