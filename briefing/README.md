# /briefing — State of the Platform

A volunteer-facing progress snapshot served at empowered.vote/briefing.

## What updates automatically vs by hand

`refresh.mjs` pulls live counts from the platform database and rewrites only the
elements marked with `data-auto="..."` in `index.html`, plus the US map tile
shading/tooltips, the legend tier counts, the 30-day commit total (from local
repos), and the as-of date.

Everything else is deliberately hand-curated: the narrative sections ("The
current push", feature journeys and next steps, "The Road Ahead"), the stance
coverage table (its area groupings are editorial), the volunteer roster, the
ACFR states bullet, and the **Reach & Engagement** figures (funnel + per-app
visitors).  Judgment stays human; only facts are automated.

The Reach & Engagement numbers are the one set that does NOT come from the
platform database — they are product-analytics figures from PostHog, and
`refresh.mjs` does not touch them.  When you refresh them, pull from the live
**Compass — Top of Funnel** dashboard so the page never drifts from the source:
<https://us.posthog.com/project/444996/dashboard/1840760> (funnel 30d/90d +
unique visitors by app).  Update the funnel steps, the visitor bars, and the
"90 days ending …" date in the section and the footer by hand.  Visitor bar
widths are a percentage of the largest 90-day count (empowered.vote), not of
100 visitors — recompute them when the top row moves.

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
- The script raises `statement_timeout` to 15 min on connect.  The server default
  is 30s and the campaign-finance aggregate needs about 4 minutes; without the
  bump it failed, got swallowed by its own try/catch, and the page kept
  publishing stale finance figures.  A failure there now prints a WARNING.
- The stance total can go **down** when a research audit retires unsupported
  rows.  That is working as intended — explain it in the narrative rather than
  hiding it.
- **Per-state counts must read ALL THREE jurisdiction links.**  ADR 0002 moved
  officeholder occupancy onto dated `essentials.office_terms`; the older
  `politicians.office_id` column is not backfilled for anyone seeded after that
  change.  `byState` therefore unions current terms (`term_end` null or future)
  with the legacy link.  Reading only `office_id` showed Wisconsin as 5
  researched officials when it has 208 — it sat in the palest map tier for a
  month — and filed those officials' stances under "2026 candidates (no office
  yet)".  Then a third link: **93% of offices (77,680 of 83,291) have
  `chamber_id` NULL** and keep their jurisdiction on the office row itself, in
  `representing_state` / `representing_city`.  Any query that walks
  office → chamber → government misses every one of them — that hid 29 more
  researched officials, 16 of them **DC**, which the tile writer was still
  captioning "stance research in progress" because its count came back zero.
  DC is now tallied like any other jurisdiction, which is why the legend says
  "jurisdictions" rather than "states": otherwise it claims four Growing while
  the map plainly shows five.  The hand-maintained coverage table uses the same
  resolution order (current term → `office_id` → `representing_state` → none);
  if you rebuild it, check that its rows sum to the headline totals, because
  that sum is what catches this class of error.  Note it catches only *missing*
  rows — a wrong number that still sums will pass, which is how the Wisconsin
  undercount survived a table that reconciled.
- **…and then exclude placeholder occupancy, or the fix above over-corrects.**
  Reading `representing_state` recovers real officials whose office has no
  chamber, but it also sweeps in **discovered candidates** — names seeded from
  campaign-finance filings onto placeholder offices, which migration 1459 turned
  into open-ended terms.  Of 83,291 rows in the current-holder view only ~5,476
  rest on more than a placeholder.  Test **structurally**, via migration 1702:

  ```sql
  AND NOT EXISTS (SELECT 1 FROM essentials.politician_occupancy_evidence e
                  WHERE e.politician_id = p.id AND e.is_placeholder_occupancy)
  ```

  🔴 Never test on provenance (`source = 'cal_access_discovery'`) — it caught
  California and missed Indiana, leaving 672 candidates counted as curated
  officials and Indiana's map tile reading 27 where it holds 20.  Never test on
  `has_candidate_committee` either: every incumbent seeking re-election has one.
  A real seat carries geography; a placeholder carries none.  The two rules pull
  in opposite directions and the map needs **both**, in this order — that is why
  they are written down together.
- Update narrative sections in a strategy session (or by hand) whenever the
  story changes, not just the numbers.
