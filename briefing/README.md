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
platform database — they are product-analytics figures from PostHog (project
444996), and `refresh.mjs` does not touch them.  Update the bars, the counts,
and the "30 and 90 days ending …" date in the section and the footer by hand.
Visitor bar widths are a percentage of the largest 90-day count
(empowered.vote), not of 100 visitors — recompute them when the top row moves.

**The section is no longer Compass-shaped.**  It used to be the *Compass — Top
of Funnel* dashboard rendered as HTML.  As of 2026-08-15 it compares every app
on the same two questions — how many arrive, and how many do the one thing that
app exists for — so it is pulled with ad-hoc `query-trends` calls instead.  Run
every one with `filterTestAccounts: true`, `math: "dau"`, and
`trendsFilter.display: "ActionsBarValue"` so each series returns one unique-person
count for the whole window.  Arrivals are `$pageview` broken down by `$host`.
The per-app actions are:

| App | The action | Event |
| --- | --- | --- |
| Compass | completed a calibration | `compass_calibration_completed` |
| Read & Rank | revealed a ballot | `readrank_ballot_revealed` |
| Essentials | looked up an official | `essentials_politician_viewed` |
| Civic Trivia | finished a game | `ctc_game_completed` |
| Treasury | anything past the front page | OR of `treasury_line_item_viewed`, `treasury_category_drilled`, `treasury_entity_selected`, `treasury_search`, `treasury_year_changed`, `treasury_visualization_changed` |
| Main site | clicked through to an app | OR of `landing_tool_clicked`, `landing_app_link_clicked`, `landing_financials_clicked` |

Two traps in that table, both already paid for:

- **Treasury Tracker lives on two hostnames.**  `financials.empowered.vote` and
  `treasurytracker.empowered.vote` are the same app, and a `$host` breakdown
  splits it into two rows that each look like a minor app.  Briefings before
  2026-08-15 published it that way.  Union the hosts (`tt.empowered.vote` too)
  before comparing it to anything.
- **Comparing a per-event count to a per-app total is a rate, not a funnel.**
  Both sides are unique people over the same window, which makes the ratio fair,
  but a person can fire the action without a `$pageview` attributed to that
  host.  Say "of 152", never "converted".
- 🔴 **Treasury has no usable denominator, so do not publish a rate for it.**
  This one was published wrong on 2026-08-15 and withdrawn the next day.  The
  *events* are sound — `treasury_category_drilled` is driven off the chart's
  `navigationPath`, so the icicle (`BudgetIcicle.onPathClick`), the sunburst and
  the category list are all covered, and it fires only on a forward drill.  The
  problem is the other side of the ratio: Treasury calls `history.pushState`
  for in-app navigation but **never captures a `$pageview` for it**, so every
  visitor is recorded against the bare host and nothing else — confirmed by the
  distinct `$current_url` values, which for Treasury are only
  `https://treasurytracker.empowered.vote/` and `https://financials.empowered.vote/`
  while Essentials and Read & Rank show `/politician/…`, `/results?…`,
  `/race/…/read`.  On top of that the app opens on an *entity picker*
  (`selectedEntity` starts `null`), so an unknown share of its visitors never
  had a chart to drill.  Until Treasury sends a pageview on navigation, report
  it as **unmeasured, not low** — and check the raw event counts before calling
  anything quiet: in the 90 days to 2026-08-16 those few users produced 56
  drills, 29 line-item views, 41 entity selections and 13 year changes.

The general lesson, worth applying to any app added here later: **a low
unique-user count is a claim about instrumentation until you have checked the
code path.**  Read where the event fires and whether the app captures its own
navigation before writing a sentence about user behaviour.

The platform-wide framing numbers (visitors, sessions, average session
duration, bounce rate) come from `query-web-overview` with no host filter.

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
- **Rebuilding the coverage table: it is an EXCLUSIVE partition, and the map is
  not.**  Each politician with at least one answer lands in exactly one bucket,
  by the resolution order above — first match wins: placeholder occupancy →
  *no seat*; current term → its government's state (or *national* if that
  government is the federal one); else legacy `office_id`; else
  `representing_state`; else *no seat*.  The map's `byState` is a **union**, so a
  politician linked to two states shades both tiles and the two counts differ by
  design — on 2026-08-17 the table read California 373 where the tile read 374.
  Do not "fix" that by making them match; check the sum instead.  Rebuild every
  row from **one query run** and confirm the 14 rows sum to the two headline
  `data-auto` spans (3,894 politicians / 32,729 stances on 2026-08-17), then
  re-sort rows by stances descending — Washington passed Arizona that day.
- **The headshot backlog figure is hand-maintained and its definition is not
  settled.**  `backend/scripts/auditHeadshots.ts` (EV-Accounts) counts
  politicians with no `essentials.politician_images` row of `type='default'`,
  which is ~79,557 across the whole table and 2,564 among curated officials —
  neither is the published 1,118.  The closest reproduction is *seated on a
  current term, non-placeholder, no default image*: that reads 1,198 today, of
  which 1,182 are records that already existed on the 15th, so it is **not** the
  definition behind 1,118 either.  Until someone pins it down, date the figure
  ("to 1,118 by the 15th") rather than restating it as current, and report
  verified deltas beside it — the 16 Kitsap/Bainbridge seats are the only seats
  added since 08-16 with no portrait, and that is exact.
- Update narrative sections in a strategy session (or by hand) whenever the
  story changes, not just the numbers.
