# /briefing — State of the Platform

A volunteer-facing progress snapshot served at empowered.vote/briefing.

## What updates automatically vs by hand

`refresh.mjs` pulls live counts from the platform database and rewrites only the
elements marked with `data-auto="..."` in `index.html`, plus the US map tile
shading/tooltips, the legend tier counts, the 30-day commit total (from local
repos), and the as-of date.

Everything else is deliberately hand-curated: the narrative sections ("The
current push", feature journeys and next steps, "The Road Ahead"), the stance
coverage table (its area groupings are editorial), the volunteer roster, and
the ACFR states bullet.  Judgment stays human; only facts are automated.

## How to refresh

```bash
cd ev-landing-main
npm install                                # first time only (installs pg)
node --env-file="C:/EV-Accounts/backend/.env" briefing/refresh.mjs --dry   # preview
node --env-file="C:/EV-Accounts/backend/.env" briefing/refresh.mjs         # write
git add briefing/index.html && git commit -m "docs(briefing): refresh numbers" && git push
```

Render redeploys automatically on push.  The script needs `DATABASE_URL`
(read-only queries only); any env file containing it works.  Requires Node 20+.

## Notes

- Map tiers: Deep = 100+ researched state/local officials, Growing = 10 to 99,
  Seeded = 1 to 9.  DC stays special-cased until it has stance rows.
- If the database is unreachable the script exits without touching the page.
- Update narrative sections in a strategy session (or by hand) whenever the
  story changes, not just the numbers.
