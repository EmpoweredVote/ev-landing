# ev-landing

Public alpha landing page for [Empowered Vote](https://empowered.vote).

A single static HTML page that:

- Briefly explains what Empowered Vote is.
- Links out to each Inform-pillar tool (Compass, Essentials, Read & Rank, Treasury Tracker, Empowered Badges, Civic Trivia Championships).
- Is honest about the alpha state — small part-time team, AI-assisted development with human review, things will break.
- Points to [financials.empowered.vote](https://financials.empowered.vote) for funding transparency.

## Develop

No build step. Open `index.html` in a browser, or:

```bash
python3 -m http.server 5173
# then visit http://localhost:5173
```

## Deploy

Configured for Render as a static site via `render.yaml`. Connect the repo on Render and it will publish `./` (root) on every push to `main`.

## Stack

- Plain HTML + CSS + a tiny script for the footer year.
- Manrope from Google Fonts.
- Empowered Vote color palette: coral `#ff5740`, blue `#00657c`, light blue `#59b0c4`, yellow `#fed12e`.
