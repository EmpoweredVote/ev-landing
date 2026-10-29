# /briefing — State of the Platform

A volunteer-facing progress snapshot served at empowered.vote/briefing.

## Each edition is a dated snapshot, and it is written fresh

Since 2026-09-22 this is not one page that gets patched.  It is a series.

- **`briefing/index.html` is always the current edition**, and `/briefing` serves it.
  That URL never moves, so every link to it anywhere on the site stays correct.
- **Every edition also has a permanent dated address**, `/briefing/YYYY-MM-DD`, which is a
  real directory holding a frozen copy of that edition.  The dated address for the *current*
  edition is live too — it holds a small forwarder to `/briefing` until the day it is
  superseded, at which point the forwarder is replaced by the frozen page.  A dated link has
  to work while people are reading that edition, not only afterwards.
- **A published edition is never edited.**  Not for a typo, not for a number that turned out
  wrong.  If an edition got something wrong, the *next* one says so and says what it
  corrects.  That is the whole point of keeping them: a reader can check what we claimed in
  August against what we claim today, and the archive is worthless if we can reach back into it.
- **The one exception is presentation, and only presentation.**  What the edition *claims* is
  frozen — every word, number, date and link.  How it *renders* may be repaired, because an
  archived page that cannot be read is not serving the purpose it was kept for.  On 2026-09-23
  the feature tables were rebuilt as stacked cards below 860px; they had needed 2.1 screens of
  sideways scrolling on a phone, with the two columns carrying the actual writing off-screen.
  That fix was applied to the archived 2026-09-11 edition as well as the current one.  The test
  for whether a change is allowed here is simple: **would a reader who quoted this page last
  month now be wrong?**  A stylesheet cannot make them wrong.  A sentence can.
  Because each edition is a self-contained file with its own copy of the stylesheet, a fix like
  this has to be applied to every edition by hand.  That is the cost of self-containment, and it
  is the right trade: a shared stylesheet would silently restyle the archive every time the
  current edition was designed.
- **Each new edition is a fresh re-write, not a diff against the last one.**  Open the
  previous edition for facts and for the corrections it owes you; do not open it to edit.
  Work that spans several cycles — a statewide rollout, an audit, a pillar coming back — can
  and should stay the headline for as long as it is the truth.  The sentences around it get
  written again each time, because a page that is only ever patched accretes clauses until
  nobody can read it, and stops describing anything.

The archive begins at 2026-09-11.  Editions before that were published by overwriting this
page and were not kept.

### Publishing a new edition

Say the current edition is dated `2026-09-22` and you are publishing `2026-10-06`.

```bash
cd ev-landing-main

# 1. Freeze the outgoing edition.  Its dated folder currently holds a forwarder; this
#    replaces it with the page itself, exactly as it stood.
cp briefing/index.html briefing/2026-09-22/index.html
```

Then, by hand, in `briefing/2026-09-22/index.html`:

- retitle it `… — September 22, 2026`,
- point `<link rel="canonical">` at `/briefing/2026-09-22` and add `<meta name="robots" content="noindex">`,
- insert the `.archived` banner and its CSS immediately after `<div class="wrap">`.

Copy all three from `briefing/2026-09-11/index.html`; it is the worked example.

```bash
# 2. Write the new edition into briefing/index.html.  Fresh prose.  Keep the stylesheet,
#    the data-auto spans, the map block and the page chrome — rewrite everything else.
# 3. Give the new edition its dated address, with a forwarder to /briefing.
mkdir -p briefing/2026-10-06
cp briefing/2026-09-22/index.html briefing/2026-10-06/index.html   # BEFORE step 1 overwrote it
```

(Easier in practice: keep a copy of the forwarder, it is 30 lines and changes only its date.)

- **4. Add the new edition to the "Previous Briefings" picker** in the header, as the first
  entry, carrying the `current` tag; the outgoing edition loses that tag but keeps its row.
  The list only ever grows; nothing is removed from it.  The picker is the
  `<details class="prevdrop">` block at the top of `<header>`, it is written into each edition
  by hand, and it is frozen with that edition exactly like every other sentence on the page.
  An archived edition therefore shows the archive as it stood on its own publication day and
  will never list anything later.  That is the intended behaviour, not a bug to fix: a shared
  list would silently rewrite the archive.

  Until 2026-10-21 there were **two** copies of this list — the picker, and a `<ul class="archive">`
  under the "Past Briefings" heading — which had to be written in the same pass and agree.  The
  duplicate is gone from the current page.  Editions frozen before that date still carry both,
  and are left alone.
- **5. Update the dated permalink named in the footer** to the new date.
- **6. Refresh the numbers** — see below — then commit and push.

The one thing that must not be skipped is step 1.  Publishing a new `index.html` over an
unfrozen predecessor destroys that edition, and there is no copy anywhere else.

- **7. Add the newly frozen edition to `tests/layout/briefing-tables-mobile.cjs`.**  Its `PAGES`
  list is the only thing that notices when a presentation fix reaches the current page and misses
  the archive — each edition carries its own copy of the stylesheet, so nothing else would.  The
  summary line counts `PAGES.length`; do not hard-code it again.

## How to write it

Every rule here is a count taken off the 2026-10-23 edition, which read as
corporate and was hard to follow.  Nothing in it was untrue.  The sentences were
the problem, and until this section existed nothing anywhere told the writer —
human or scheduled — how the page should sound.

- **Write as "we", not as "this page".**  That edition said "this page" 28 times
  and "we" four.  It had the page remembering, asking, describing and being
  uncomfortable: *"this page has said"*, *"the one this page kept asking for"*,
  *"this page has never said so"*.  Volunteers want to hear from the people doing
  the work.  We got it wrong.  We measured it.  We have not read it yet.  Keep
  "this page" for genuine navigation — "this page always lives at
  empowered.vote/briefing" is fine.
- **One idea per sentence.**  24 sentences in that edition ran 38 words or more;
  the longest was 73.  The mean was 22.5.  Aim for a mean near 15 and let nothing
  past 35 without a reason.
- **Break the semicolon chains.**  31 semicolons, most of them stacking three or
  four unrelated findings into one sentence: *"Puerto Rico still has 78 alcaldes
  with 70 of them lacking a portrait; the trivia bank still reads 3,323 live
  questions across 43 active collections, split A 25.0%, B 25.9%…"*.  That is a
  list.  Write it as one.
- **Two em dashes in a paragraph, not two in a sentence.**  There were 51 across
  221 sentences.  An aside inside an aside is where a reader stops.
- **Say who did it.**  54 passive constructions.  *"It was measured this week"*
  hides whether that was a person, a cron job, or a query written for this
  edition.  *"We timed it this week"* does not.
- **One general lesson an edition, not one a paragraph.**  Closing every
  paragraph on a maxim — *"a count taken while a load is running measures the
  load, not the work"*, *"the lesson generalises past this page"* — is the single
  habit that makes the writing sound generated.  The lessons are real and they
  belong in this README, where the next writer reads them.  On the page, keep the
  best one and cut the rest.
- **Lead with the answer.**  Open each section with what happened, then the
  numbers that prove it.  Not the history, then the reasoning, then the finding.
- **A headline is a sentence, not a stack of clauses.**  The archive summary for
  2026-10-23 read: *"A debt five editions old is paid and a promise three days old
  is not; the audit takes back 230 positions; nine tenths of what a voter reads
  comes from a season that is closed."*  Three compressed claims and nothing to
  picture.  One clear claim beats them.
- **About 4,000 words of narrative.**  That edition ran 4,979.  Length is not
  thoroughness.  What is cut but worth keeping goes in this README.

None of this loosens the rules above it.  Plain is not vague: every number still
has to be checkable, every figure still has to be reproducible, and **"we do not
know yet" is a sentence this page is allowed to print.**

`briefing/voice-check.mjs` counts all of it, so nobody has to do it by eye:

```bash
node briefing/voice-check.mjs                            # the current edition
node briefing/voice-check.mjs briefing/2026-10-23/index.html
```

Every threshold in it is set from the 2026-10-23 edition and all seven fire on
it.  It is a **prose** check and it fails differently from a fact check: a wrong
number must never be published, but a clumsy sentence must never stop an edition
going out.  A stale current edition is worse than an awkward new one.  When it
exits 1, rewrite and run it again — never publish nothing over it.

Run it on the archive and the habit turns out to be older than this section.
The 2026-09-11 edition fails five of the seven, with a 96-word sentence in it.
What is new is the self-reference: four "this page" in September, 27 in October.

## What updates automatically vs by hand

`refresh.mjs` pulls live counts from the platform database and rewrites only the
elements marked with `data-auto="..."` in `index.html`, plus the tile
shading/tooltips and legend tier counts on **all three** US maps, the 30-day
commit total (from local repos), and the as-of date.

Everything else is deliberately hand-curated: the narrative sections ("The
current push", feature journeys and next steps, "The Road Ahead"), the stance
coverage table (its area groupings are editorial), the volunteer roster, the
ACFR states bullet, and the **Reach & Engagement** figures (funnel + per-app
visitors).  Judgment stays human; only facts are automated.

**`refresh.mjs` refuses to write while the page carries an "Added after
publication, and dated separately" note.**  That note names figures queried on a
date of their own — the two new coverage maps, added 2026-10-29 to an edition
published on the 27th — and a refresh rewrites them and leaves the note making a
false claim about a page whose whole offer is that its numbers can be checked.
`--dry` still reports, because reading a page is always safe.  Rewrite or remove
the note and run it again; publishing the next edition removes it anyway, since
that edition is written fresh and every figure in it shares one as-of date.

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

🔴 **`read-data-schema` lists the last 30 days, so a real event with older data is simply
absent from it — and that absence reads exactly like "this event does not exist."**  Paid for on
2026-10-29.  `treasury_search` is in the list above, did not appear in the taxonomy, and was
written off as a stale reference in the recipe.  It is real: `BudgetSearch.tsx:69` fires it, and
PostHog holds **19** of them, the last on **2026-09-22** — more than 30 days before the snapshot
and well inside the 90-day window being published.  The 2026-10-29 edition therefore omitted
18 searches from its Treasury event list.

**The check takes one query and settles it:**

```sql
SELECT event, count() AS n, min(timestamp), max(timestamp)
FROM events WHERE event LIKE 'treasury_%' GROUP BY event ORDER BY n DESC
```

Run that, not the taxonomy, before concluding an event in this recipe is dead.  The same query
turned up `treasury_donate_clicked` (3 events), which is in neither this table nor the page.

**What saved the headline figure was that the OR is a per-person union.**  Dropping
`treasury_search` from the six left the 90-day count at **31 either way**, because everyone who
searched also did one of the other five.  That is luck, not design: a reader who only searched
would have been dropped silently, and nothing in the funnel would have looked wrong.

Two traps in that table, both already paid for:

- **EVERY app has more than one hostname.  Union them, or an app reads as two small ones.**
  This was written down for Treasury Tracker after 2026-08-15 published it split; on
  2026-08-19 the main site turned out to have the same problem — `alpha.empowered.vote`
  serves the identical landing page (checked: same `<title>`, and only `/` and `/feedback`
  are ever requested on it) and had been silently dropped, which is 25 people over a
  quarter, plus 8 more on the Render default host.  A `$host` breakdown is a **discovery**
  tool, never the published figure: run it first, decide which hosts are the same app, then
  re-query one `dau` series per app with an `exact` host filter so people are deduped rather
  than summed (summing Treasury's three hosts gives 180 where the union is 159).  The map as
  of 2026-08-19:

  | Row | Hostnames |
  | --- | --- |
  | main site | `empowered.vote`, `alpha.empowered.vote`, `www.empowered.vote`, `ev-landing.onrender.com` |
  | treasury | `financials.empowered.vote`, `treasurytracker.empowered.vote`, `tt.empowered.vote`, `treasury-tracker-frontend.onrender.com` |
  | essentials | `essentials.empowered.vote`, `essentials-b1e0.onrender.com` |
  | compass | `compass.empowered.vote`, `compass-frontend-mtj4.onrender.com` |
  | civic trivia | `ctc.empowered.vote`, `civic-trivia-frontend.onrender.com` |
  | readrank | `readrank.empowered.vote`, `read-rank-frontend.onrender.com` |

  Re-run the `$host` breakdown every cycle and reconcile it against this table — a new
  hostname is how the next undercount arrives.  When the basis changes, say so on the page:
  the arrival numbers are not comparable row-for-row across the change (main site 299 unioned
  vs 274 on `empowered.vote` alone).  Reconciled again on 2026-09-11: no new hostname, and two
  known ones (`www.empowered.vote`, `treasury-tracker-frontend.onrender.com`) served nobody in
  the window.  Keep them in the filter anyway — a host with no traffic costs nothing, and
  dropping it is how it comes back unnoticed.
- Start events, for the start-vs-finish caption: `compass_quiz_started`,
  `readrank_race_started`, `ctc_game_started`.
- **Comparing a per-event count to a per-app total is a rate, not a funnel.**
  Both sides are unique people over the same window, which makes the ratio fair,
  but a person can fire the action without a `$pageview` attributed to that
  host.  Say "of 152", never "converted".
- 🔴 **Treasury still has no publishable denominator, though it now has a measurable one.**
  The navigation fix shipped 2026-08-16 and is capturing: budget views arrive as their own URLs
  (`?entity=austin-tx&year=2025&dataset=operating`), and in the five days to 2026-08-21, 10 of the
  13 people on the Treasury hosts reached one.  **Do not publish that as a rate** — the entities in
  that sample are Austin, Travis County, Los Angeles and Colorado Springs, i.e. our own onboarding
  checks.  `$pathname` is useless here (it is `/` for every one of them); break down by
  `$current_url` and filter on `?entity=` instead.  The history below is why the rate was withdrawn
  and why it stays withdrawn until traffic that is not ours accumulates.
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
  had a chart to drill.  Report it as **unmeasured, not low** — and check the raw event counts before calling
  anything quiet: in the 90 days to 2026-08-16 those few users produced 56
  drills, 29 line-item views, 41 entity selections and 13 year changes.

  🔑 **Four weeks on, the two bases disagree by 5x, and the split says why.**  In the 90 days to
  2026-09-11, **52** people reached an `?entity=` URL while only **10** fired any
  past-the-front-page *event*.  Break the 52 apart before reading anything into it: **38 of them
  landed on `?entity=empowered-vote-ca`**, which is our own organization's budget, linked from the
  donate flow — arriving there is one click from a fundraising page, not an act of budget
  exploration, and it fires no `treasury_entity_selected` because nobody selected anything.  That
  leaves **16** people on some other government's budget.  Publish neither as a rate; report the
  split, because "52 reached a budget" and "10 used the tool" are both true and mean different
  things.  Re-run both every cycle: the day the non-EV half outgrows the donate traffic is the day
  this section gets a real denominator.

The general lesson, worth applying to any app added here later: **a low
unique-user count is a claim about instrumentation until you have checked the
code path.**  Read where the event fires and whether the app captures its own
navigation before writing a sentence about user behaviour.

The platform-wide framing numbers (visitors, sessions, average session
duration, bounce rate) come from `query-web-overview` with no host filter.

## The schedule

A new edition is published automatically **every Monday and Thursday night at 02:07**, which is
the small hours of Tuesday and Friday.  The Windows scheduled task `EV Briefing` runs
`briefing/publish-edition.cmd`, which starts Claude Code headless with
`briefing/SCHEDULED-EDITION.md` as its prompt and lets it do the whole job: freeze the outgoing
edition, pull every number, write fresh prose, run the tests, commit and push.  Render deploys
on the push.

- The task runs **only while this PC is awake and Chris is logged on** — it uses an interactive
  token rather than a stored password, which is the trade that keeps the password out of the task.
  It is set to start as soon as possible after a missed start, so a machine that was asleep
  overnight publishes when it comes back.
- It needs the same things a human run needs: `C:/EV-Accounts/backend/.env` for `DATABASE_URL`
  and `POSTHOG_API_KEY`, the sibling repos on disk, and a git credential that can push.
- The log of each run is `%TEMP%\ev-briefing-edition.log`.  Read it before trusting a quiet night.
- **An edition published this way may be corrected on the day it was published, and the page has
  to say so.**  Once it is frozen by the next edition it is never touched again.  That rule is
  older than the schedule and the schedule does not change it.
- To stop it: `schtasks /Change /TN "EV Briefing" /DISABLE`.  To run it now:
  `schtasks /Run /TN "EV Briefing"`.

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

- 🔴 **`count(*)` ON AN ANSWER TABLE IS A ROW COUNT, AND THIS PAGE PUBLISHED IT AS A POSITION
  COUNT FOR MONTHS.**  Two things pulled the two apart.  First, Seasons: one person can hold a
  Season 1 AND a Season 2 answer on the same topic, and both rows were counted — on 2026-10-10,
  38,311 rows resolved to 33,629 distinct (politician, topic) pairs.  Second, and worse, the
  stance audit withdraws an unsupported position by writing a Season 2 answer of **0** over it.
  `compassService` does `NULLIF(pa.value, 0) AS stance_value` with the guard deliberately
  OUTSIDE the season collapse, so a 0 in the newest season **suppresses** the pair rather than
  falling through to Season 1.  A withdrawal is therefore an **INSERT**: the stored total goes
  **up** while the positions a voter can read go **down**.  On 2026-10-10 the stored total rose
  36,438 → 38,311 in the same five days that 1,629 positions were withdrawn, and nothing on the
  page could tell the two apart.
  `refresh.mjs` now carries `stances_served` (the newest season's answer per pair, where it is
  not a blank), `stances_blanked`, `stance_pairs`, `pols_served` and `avg_served` beside the old
  `stances`, and **WARNs when stored and served move in opposite directions**.  Publish the
  served figure as the headline and say the basis changed, the way `topics_open` was added
  beside `topics` on 2026-09-11.
  ⚠ **Keep `stances` as the figure `coverage-table.sql` reconciles against.**  That table is a
  partition of STORED ROWS; pointing its check at the served figure would break the one test
  that catches a missing bucket.  Say on the page which number the table sums to.
  Generalise it: **when a total rises during a campaign whose whole purpose is to remove things,
  the total is not measuring the campaign.**

- 🔴 **`git log --since=2026-09-29` does NOT mean midnight.**  Git's approxidate fills the unstated
  time of day from *now*, so a bare date silently starts the window at this afternoon's clock time
  and drops everything earlier that day.  On 2026-10-05 the same query read **11** commits as a bare
  date and **39** as `--since=2026-09-29T00:00:00`, for one repo.  Always pass the time.
- 🔴 **Resolve the default branch; do not assume the one that is checked out.**  `git -C <repo>
  symbolic-ref --short refs/remotes/origin/HEAD`.  EV-Accounts defaults to `master` and sits on a
  feature branch locally; counting against `origin/main` returned nothing at all, which reads
  exactly like a quiet week.  Pair this with the working-tree rule below — one gives you the right
  ref, the other stops you reading a stale one.
- 🔴 **A research programme can produce thousands of rows and move no published figure, and the
  commit log cannot tell you which.**  On 2026-10-05 three city slices landed 1,645 researched rows
  across ~150 commits while `inform.politician_answers` had not gained a row since 2026-09-27.  The
  output lives in `backend/data/stance-research/<batch>/`: `research.csv` / `stances.csv` are the
  rows, and **`publish-report.json` is the only honest count of what was scored** — each entry
  carries an `action`, and `review` means a human has not seen it yet.  `gate-findings.json` says
  why.  Check `max(created_at)` on `politician_answers` before writing any sentence about research
  reaching voters, and say plainly when the answer is "it has not".
  ⚠ `inform.stance_research_review` is **not** that queue — it held only 51 rows from June and none
  of the new work.  Do not read it as the admin queue without checking its `batch_id`s first.
- **`inform.reliability_certifications` is publishable and nothing else reproduces it.**  One row
  per certified stratum: `level`, `evidence_class`, `n`, the agreement statistics `m1_alpha` /
  `m2_alpha` / `m3_wilson_low`, the severe-disagreement count `m4_severe`, `certified`, and a
  `reason` array that carries the leakage control, the pre-ruling comparison and who approved it.
  Read `unnest(reason)` — the controls are the part worth printing, and they are only in there.
- **`essentials.districts` has no `created_at`**, so "districts added this cycle" has to come from
  the difference between two refreshes, not from a query.
- 🔴 **A sibling repo's working tree is NOT its state. Read `git show origin/<default>:<path>`.**
  On 2026-09-29 this page published "37 of 43 trivia collections audited" and "six collections
  nobody has read yet" when the true figures were 42 of 43 and none. The numbers came from
  `docs/superpowers/HANDOFF-collection-quality-audit.md` read off disk in `C:/Project Test`, a
  repo that sits on a feature branch whose local `master` was **32 commits behind** `origin/master`.
  A `git fetch` HAD been run; the comparison was made against the stale local ref anyway, so the
  file read was four sessions old and every one of those six collections had since been closed.
  **Three habits, all cheap:** fetch, then `git rev-list --count master..origin/master` and say the
  number out loud; read living documents with `git show origin/master:<path>` rather than `cat`;
  and re-derive any figure the document itself tells you to re-derive -- this one says so in its
  own first paragraph, and following that instruction would have caught it without any git at all.
  The trivia bank totals on the page were right precisely because they came from SQL.
  Generalise it: **for every repo this page reports on but does not work in, the remote ref is the
  source of truth and the database beats both.**


- 🔴 **A test can stop discriminating because the thing it detected was REMOVED, and that failure
  reads as a clean bill of health.**  The curated-versus-pool split was computed from migration
  1702's `is_placeholder_occupancy` — does this person hold an office with no geography.  On
  2026-09-24, migration CA_0206 retired all 76,330 of those placeholder offices (`essentials.offices`
  85,134 → 8,804), so the column now reads false for every row in the table and the query answered
  **89,903 curated, 0 in the pool**.  Nothing in the data was wrong; the test had simply lost its
  subject.  `refresh.mjs` now asks what a record RESTS ON instead — a current term, the legacy office
  link, a candidacy, or researched stances — and carries two tripwires: it compares that answer
  against the independent `is_active` flag (they agreed on 99.5% of records on 2026-09-29) and
  WARNs if any record ever holds a placeholder office again.  **Generalise it: when a figure
  suddenly reads perfect, suspect the measurement before celebrating the result.**  The old test is
  kept as a probe rather than deleted, which is what makes the tripwire possible.
- **The `named` CTE in `coverage-table.sql` gained Tennessee on 2026-09-29**, honouring the promise
  the 2026-09-22 edition made.  Adding a named row shrinks the remainder row and nothing else;
  check that the partition still sums before publishing, because that is the only thing that
  proves the new row was carved out rather than double-counted.
- **The Civic Trivia bank count is automated now** (`trivia_active`).  It must count questions with
  `status='active'` that are linked to an **active collection**: a bare count of `trivia.questions`
  reads about 9,000, because the table also holds 4,021 archived and 1,974 expired rows.
- 🔴 **PostHog can be queried from here without a browser or an MCP server, and the credential is
  in the env file this page already uses.**  `C:/EV-Accounts/backend/.env` carries `POSTHOG_API_KEY`
  (a `phx_` **personal** key, which can read) and `POSTHOG_PROJECT_ID=444996`.  POST to
  `https://us.posthog.com/api/projects/444996/query/` with `Authorization: Bearer $POSTHOG_API_KEY`
  and a body of `{"query": {...}}` — `TrendsQuery` for the dau rows, `WebOverviewQuery` for the
  platform-wide framing figures, `HogQLQuery` for anything those cannot express.  Written down
  because on 2026-09-29 the section was nearly published as a carried-forward week-old pull on the
  belief that PostHog was unreachable; nobody had looked in the env file.  **Check for the
  credential before declaring a source unavailable.**
- **The two OR'd rows need HogQL, and HogQL does not get `filterTestAccounts` for free.**  A
  multi-series `TrendsQuery` returns one count per series, so summing Treasury's six events
  double-counts anyone who fired two; the union has to be `count(DISTINCT person_id) ... WHERE
  event IN (...)`.  That means reproducing the test-account filter by hand — read it from
  `GET /api/projects/444996/` (`test_account_filters`), which on 2026-09-29 was the single clause
  `person id NOT IN COHORT 333605`, and write `AND person_id NOT IN COHORT 333605`.  **Control the
  substitution before trusting it**: run one single-event row both ways and require them to agree.
  They did, exactly, on two rows (37/37 and 12/12).  The project timezone is `US/Pacific`.
- **A section that genuinely cannot be re-measured gets DATED, not restated** — its own heading
  says when it was measured, both cards name the window, and the footer says plainly that it was
  not re-taken.  That is the treatment the April source sweep gets.  Never quietly re-publish a
  stale window under today's date.

- 🔴 **A list of classes is a sample until it sums to the headline.**  The Treasury bullet
  listed four entity types — cities, counties, states, towns — and printed **3,502 of 7,507**
  entities as though that were the roster.  The missing 4,005 were townships, boroughs and
  villages, which exist because a state hands over its governments in the classes *its own*
  publisher uses: Pennsylvania brings boroughs, Michigan brings townships and villages.  Found
  on 2026-09-22 by asking the database for `entity_type` instead of trusting the list.
  `refresh.mjs` now carries all seven named classes plus a computed `t_other`, and **warns if
  they stop summing to `budget_entities`** — the check that would have caught it.  Generalise
  it: any breakdown on this page that claims to partition a headline must be *shown* to, and a
  catch-all bucket is what keeps a class nobody has met yet from vanishing silently.
- **`meetings.segments` has no `created_at`, so On the Record's freshness has to be read from
  `meetings.meetings`.**  Relevant because the segment count fell twice with no ingest, was
  printed unexplained for two cycles, and then rose 2,071 on 2026-09-22.  The rise is real —
  `meetings.meetings` shows 10 rows created 2026-09-12 to 2026-09-19, and `speakers` 248 in the
  same window — but the *segment* number could not have told you that on its own, and the
  earlier drops are still unexplained.  Cite the dated meetings as the evidence, and do not let
  a total climbing back past its old high be mistaken for an answer about why it fell.
- **Check `inform.seasons` every cycle even when nothing moved, and record that it did not.**
  On 2026-09-22 the query showed Season 2 still open and **Season 3 present as a draft**, which
  is a fact worth publishing in its own right: a season being assembled in the open is the
  opposite of the 2026-09-04 cutover this page missed.  `SELECT number, status, opened_at,
  closed_at FROM inform.seasons`.

- **There are THREE maps now, behind tabs, and they draw the same 52 boxes.**  Added
  2026-10-29.  `data-map="stances"` is researched state and local officials;
  `data-map="treasury"` is governments with a published budget; `data-map="seeded"` is
  officials on file whether researched or not.  Two rules hold the section together and
  both are enforced in `refresh.mjs`:

  - **One tier scale for all three**: Deep = 100+, Growing = 10 to 99, Thin = 1 to 9, and
    **t0 = none** — an outlined tile, deliberately not a paler gold, because gold on these
    maps means data.  Change the scale and you change all three legends, or a reader
    comparing two tabs is comparing two different scales.  t0 is counted in the legend like
    every other tier; leaving a shaded tier out of the count is what once had the legend
    accounting for one tile fewer than the map plainly showed.
  - **The tiles are written per map, scoped by the `data-map` marker.**  🔴 The old writer
    was one global regex over every `.st` tile on the page.  With three maps that regex
    fills all 156 tiles with stance numbers, and the two new maps come out looking
    perfectly plausible while reading the wrong dataset.  The block regex also has to stop
    at the `</div>` **alone on its own line** — every tile ends with a `</div>`, so a lazy
    match to the first one rewrites exactly one box and leaves 51 stale.

  `seatsByState` is `byState` with the `politician_answers` join lifted out, so its
  `researched` column must reproduce `byState` state for state.  `refresh.mjs` asserts that
  every cycle; it is the cheapest guard against the three maps drifting apart, and it is the
  reason the Officials-on-file map can be read as the denominator the stance map is a
  fraction of.  The t0 tooltip's seat count comes off the same query rather than its own, so
  the two maps can never disagree about how many officials a jurisdiction holds — and it is
  still QUERIED, never typed into a caption: DC's used to be the string "27 officials
  seeded" and had no way to notice when that stopped being true.

- **Treasury coverage counts governments with a BUDGET, not rows in `municipalities`.**  That
  table holds entities we know about before any budget arrives for them — 46 of them in four
  states on 2026-10-29 — so counting rows shades Texas 32 where it has 17.  `state` is the
  only geography on the table.  The federal row carries `'US'` and deliberately gets no tile,
  which is why the 52 tiles hold 11,183 governments and the headline roster is 11,184.

- **Four jurisdictions hold officials and have no tile on any map**: American Samoa, Guam, the
  Northern Mariana Islands and the US Virgin Islands, one official each.  `refresh.mjs` prints
  them as a note every run rather than quietly dropping them.  It is a note and not a WARNING
  because adding a box to an 11-column grid of the states is an editorial decision about the
  shape of the map, and the script does not get to make it.

- 🔴 **The federal leak, found and FIXED 2026-10-29 — and the first diagnosis of it was wrong,
  which is the more useful half of this entry.**

  Federal seats belong on none of the three maps: they resolve through `districts.district_type`,
  not through a state's government, and `coverage-table.sql` already counts every one of them in
  its single national row.  Eight federal offices carry `chamber_id` NULL, so the **third**
  jurisdiction link — the one that exists to find offices hanging off no government — was
  picking them up by `representing_state` and shading them onto a state tile, where the page was
  then counting them twice.  All eight are non-voting seats: the **DC Delegate**, DC's **two
  Shadow Senators**, and the Delegates for **Guam, Puerto Rico, the Northern Marianas, the
  Virgin Islands and American Samoa**.  Fix: `AND NOT EXISTS (… districts d WHERE d.id =
  o.district_id AND d.district_type IN ('NATIONAL_UPPER','NATIONAL_LOWER'))` on the third link in
  both `byState` and `seatsByState`.  Measured effect: **DC 16 researched → 14**, DC **27
  officials on file → 24**, **Puerto Rico 161 → 160**, and the four territories that held
  exactly one official each now hold none — that one official was always the Delegate.  No tile
  changed shade.

  **The first measurement said "seven leak in: DC 2, TX 2, CA 1, MN 1, IL 1", and only the DC 2
  were real.**  That query asked *which people on a tile hold any current federal term*, which
  is a different question from *which people are on a tile only because of a federal office*.
  The Texas, Minnesota and Illinois names are **Ken Paxton (Texas Attorney General), James
  Talarico (Texas Representative), and the Lieutenant Governors of Illinois and Minnesota** —
  sitting state officials who each carry a second office titled `Candidate for U.S. Senate —
  <state>` that is typed `NATIONAL_UPPER`.  They are on their own state's tile through their
  real state office, which is correct.  **So the exclusion is by OFFICE and never by person**:
  excluding the person would take four sitting state officials off their state over a candidacy
  they have not won.  The general lesson: *holds a federal term* and *is on this tile because of
  a federal office* are not the same predicate, and the first one over-reports by every dual
  officeholder in the data.

  **`coverage-table.sql` had the opposite half of this defect, and it is fixed too (2026-10-29).**
  Its partition is per person, first match wins, and `nat` ran second — so all four of those
  sitting state officials went to the **national** row, the one the page labels "US Congress +
  national".  The fix is a **reorder, not a new test**: `nat` now runs *below* the two
  government walks, so a person with a real state seat resolves to their state and `nat` catches
  only those whose sole link is federal.  The two `CASE` arms in `cur_st`/`leg_st` were flipped
  for the same reason — a state beats `'national'` when someone's current terms include both,
  instead of `bool_or` poisoning the whole aggregate.  Measured: national **556 → 552**, TX
  **270 → 272**, REST **365 → 367**, the other twelve named rows reproduce to the row, and
  `TOTAL(partition)` still equals `TOTAL(headline)` at 4,311.

  **Why a reorder rather than a test for candidacies:** there is no structural column separating
  a candidacy office from a real seat.  Both carry a district, a chamber, the federal government
  and a `representing_state`, and `seats` is null on 98 of the 102 real Senate offices as well as
  all 52 candidacy ones.  The only thing that distinguishes them is the **title** — "Candidate
  for U.S. Senate — <state>" — and a title test is the class of test this file exists to avoid.
  The reorder needs no such test.

- **A third fault, found by making the two agree: the legacy office link went stale (fixed
  2026-10-29).**  `politicians.office_id` is not cleared when someone moves on.  Aisha Wahab's
  still points at the California state Senate seat she left for Congress, so `byState`'s union
  shaded her onto California while the corrected coverage table — rightly — called her national.
  The second link now applies **only to people holding no current term at all**.  That keeps the
  union a union rather than turning it into a swap: **5** researched people reach a state through
  the legacy link alone, and they are exactly who it was added to protect.  A current term is
  simply better evidence than a stale one.  Effect: **California 377 → 376** researched,
  **2,031 → 2,030** on file.

- 🔴 **`refresh.mjs` now checks the map against the coverage table on every run, and that check
  is the point of all three fixes above.**  It runs `coverage-table.sql` itself — sliced at its
  `agg` CTE so every bucket comes back instead of the editorial named rows — rather than a second
  copy of the partition logic, because a copy would drift in exactly the way the check exists to
  catch.  With all three fixes in, **all 51 state buckets match the map person for person.**  If
  that warning ever fires, the two artifacts have started telling the page two different stories
  about the same people, and they get fixed together or not at all.

  **What the next edition owes the reader.**  The stance map published on 2026-10-27 still
  carries the fault — its DC tile reads **16** where the corrected rule gives **14** — and a
  published figure is not edited.  The next edition carries 14 and says what it corrects.  The
  Officials-on-file tab was corrected on the day it was added, before the freeze, and the note
  at the foot of the map section records what it first said.

- **The `is_placeholder_occupancy` exclusion in `byState` is a dead tripwire, kept on purpose.**
  CA_0206 retired every placeholder office on 2026-09-24, so the column reads false for every
  row and the clause now removes nothing.  It costs nothing, `refresh.mjs` already WARNs if the
  count ever goes back above zero, and the discovery records it used to catch are excluded
  today by having no office to resolve a state through.
- **Puerto Rico is seeded but unresearched, and has an outlined t0 tile as of 2026-08-19.** 161 seats landed
  2026-08-12 (Governor, 81 legislators, the Resident Commissioner, and all 78 municipios with
  their alcaldes), 91 with portraits, all on dated terms — and **0 stances**, so it belongs in
  neither the map nor the coverage table today. Its offices carry `chamber_id` NULL and
  `representing_state = 'PR'`, so `byState` finds them through the third link the moment any
  stance is written, at which point the tile shades itself from t0 up through the normal tiers
  with no further edit. `refresh.mjs` also prints a WARNING for any jurisdiction that has
  researched officials and no tile at all, which is the case this does not cover. The
  territory also proves
  the parties rule: PNP and PPD each contain both US national parties, so party is stored
  verbatim in Spanish and must never be translated to Democrat/Republican.
- 🔴 **Check `inform.seasons` for a cutover every cycle — a season opening is a launch, and the
  numbers do not announce it.**  Season 2 opened 2026-09-04 14:31 UTC and Season 1 closed in the
  same motion; the 2026-09-11 refresh still described Season 2 as "being assembled", because every
  figure the script reads moved smoothly and nothing in them says *the live ladder changed under
  the voter*.  One query settles it: `SELECT number, status, opened_at, closed_at FROM
  inform.seasons`.  Corroborate against what a voter is actually served —
  `curl https://accounts-api.empowered.vote/api/compass/topics` returned 60, the Season 2 ladder,
  where Season 1 had 44.  The general form: **a status column is a fact this page can miss in
  silence, and only a status column will tell you.**
- 🔴 **A flat total cannot tell "quiet" from "stopped" — check recency, not just the count.**
  `verified_sources` has read 2,722 for months and looks like a healthy running total.  Every row
  in it was written in **April 2026**; it is a finished one-off sweep, and the page was printing
  it beside live counts.  Date a figure like that, the way the headshot backlog is dated.  The
  check is one query per dataset: `SELECT max(created_at), count(*) FILTER (WHERE created_at >=
  now() - interval '11 days') FROM <table>`.  Two caveats found doing it on 2026-09-11:
  `treasury.budgets.created_at` is **not maintained** (its max reads March 2026 while 158k rows
  landed in the cycle) and `transparent_motivations.contributions` has none, so neither dataset's
  freshness can be read that way — use the loader commits instead.
- **The topic count is two numbers, and only one of them is what a voter can answer.**
  `topics` counts the whole `inform.compass_topics` library — 63 on 2026-09-11 — but the OPEN
  season serves 60 of them, and the legacy `is_live` flag stopped tracking either when Seasons
  shipped (it reads 44).  Publishing the library count alone overstates the ladder, so
  `topics_open` was added to `refresh.mjs` on 2026-09-11 and the page carries both.  Use
  `topics_open` in any sentence about what the Compass asks today.
- If the database is unreachable the script exits without touching the page.
- The script raises `statement_timeout` to 15 min on connect.  The server default
  is 30s and the campaign-finance aggregate needs about 4 minutes; without the
  bump it failed, got swallowed by its own try/catch, and the page kept
  publishing stale finance figures.  A failure there now prints a WARNING.
- The stance total can go **down** when a research audit retires unsupported
  rows.  That is working as intended — explain it in the narrative rather than
  hiding it.
- 🔴 **A WITHDRAWAL IS NOT ALWAYS AN INSERT, SO `created_at` UNDERCOUNTS THE AUDIT.**  The note
  above describes a withdrawal as a Season 2 row of `0` written over an older answer — an
  INSERT.  That is only one of the two shapes.  On 2026-10-23 the audit had withdrawn **284**
  positions of which only **44** were new rows; the other **240** were existing rows rewritten
  in place, which changes `updated_at` and leaves `created_at` untouched.  A creation-date
  reading of that cycle sees 44 rows of work and misses six sevenths of the campaign.  Measure
  both, and say which you mean:
  ```sql
  SELECT count(*) FILTER (WHERE created_at >= :since)                        AS inserted,
         count(*) FILTER (WHERE created_at <  :since AND updated_at >= :since) AS rewritten
    FROM inform.politician_answers WHERE value = 0;
  ```
  Generalise it: **a query that watches for new rows cannot see a campaign that edits old ones.**
- 🔴 **`financials.empowered.vote` IS EMPOWERED VOTE'S OWN FINANCE PAGE, NOT THE BUDGET EXPLORER,
  AND EIGHT EDITIONS GAVE THE WRONG REASON FOR A RIGHT NUMBER.**  From 2026-09-11 to 2026-10-23
  every edition reported that most people who reach a budget address land on our own
  organisation's budget, and every one explained it as "one click from the donate page".  Opened
  in a browser on 2026-10-27, that host serves *our* finances (h1 "Empowered Vote Finances", a
  Donate element, FY 2026) and **rewrites its own address to `?entity=empowered-vote-ca&year=2026
  &dataset=operating` during load**.  Nobody clicks anything; arriving at the host is enough to be
  counted.  The explorer with the place search is `treasurytracker.empowered.vote`.  The
  conclusion never changed — that traffic is not budget exploration — but the mechanism was
  invented and repeated for six weeks.  It also cost a timing run: a Playwright script pointed at
  `financials` waited out three 90-second timeouts on a search box that only exists on
  `treasurytracker`, which read exactly like a broken page.  **Generalise it: a host name is a
  guess about what a host serves until you open it.**
- **The Treasury page is TIMED now, and this is the method, so it does not have to be argued
  again.**  Five editions said the real page was untimed.  Measured 2026-10-27 with a scripted
  Chromium against production, three cold browser contexts, one machine on a home connection:
  search box visible **0.4–0.9 s**, the `fields=index` place index **1.1–1.4 s at 1.95 MB**, and a
  city's headline spending figure **2.1–2.6 s**.  A direct entity link (`?entity=atlanta-ga`)
  never requests the place index at all and renders in **2.7 s cold / 0.9 s warm**.  Say which of
  those a sentence is about: the deep link and the search front page are different pages.
- 🔴 **THE TRIVIA EXPIRY JOB DOES NOT ALWAYS BUMP `updated_at`.  READ `expiration_history`.**
  On 2026-10-27 the live bank had fallen 3,323 → 3,306 while 40 questions were written, and a
  `status='expired' AND updated_at >= :since` count found only **15** of the **57** expiries that
  actually happened — the other 42 carry an untouched `updated_at` and an `expiration_history`
  entry whose own `timestamp` records the transition.  The honest query is
  ```sql
  SELECT count(DISTINCT q.id) FROM trivia.questions q,
         jsonb_array_elements(q.expiration_history::jsonb) h
   WHERE h->>'action' = 'expired' AND (h->>'timestamp')::timestamptz >= :since;
  ```
  With it the bank reconciles exactly: 3,323 + 40 written − 57 expired = 3,306.  **Generalise it:
  when a total will not reconcile, suspect the timestamp you are filtering on before the count.**
  Related: numeric questions now carry a 7-mark `options_scale` and the server rolls which four
  marks a player sees, so `correct_answer` no longer describes the slot a player meets.  Report the
  A/B/C/D split over the **unscaled** questions only, and say so.
- **`voice-check.mjs` reports one over-length sentence that is not this edition's prose, and that
  is expected.**  The "Previous Briefings" picker carries each past edition's own summary verbatim,
  and the 2026-10-23 summary is 37 words of three clauses — the very string "How to write it" holds
  up as the bad example.  Carrying it forward is right; rewriting another edition's description of
  itself is not.  So the 2026-10-27 edition published with `longest sentence 37 / want <= 35` and
  everything else green.  **Do not retune an archive label to make the counter go green.**
- 🔴 **DO NOT COUNT WHILE A LOAD IS RUNNING — THE SNAPSHOT MEASURES THE LOAD, NOT THE WORK.**
  The 2026-10-20 edition published two figures taken mid-write and drew a wrong conclusion from
  both.  It read 72 stance positions across 15 Georgia officials at 06:01; the batch was still
  being written, two more followed, and the day closed at 90 across 26.  On the strength of that
  it called an eleven-day gap "not yet a restart", which was wrong.  In the *same hour* its
  `pols_curated` query ran through a 2026-candidate load — 408 people landed in that one hour, 823
  across the day — so it printed 12,435 where the settled figure was 13,184.  Neither number was
  false; both were partial.  **Before publishing, check recency on the tables you are about to
  quote** (`max(created_at)` on `politician_answers`, `politicians`, `treasury.budgets`) and if a
  load is in flight, say so or wait for it.  The tell is cheap to look for and there is no way to
  recover from it afterwards, because the edition is frozen.
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
- **The coverage table has a query now: `briefing/coverage-table.sql`.** It encodes the resolution
  order below, prints the fourteen named rows plus the "N more jurisdictions" remainder, and ends
  with the two rows that are the check — TOTAL(partition) against TOTAL(headline). Run it and read
  the numbers off it rather than rebuilding the logic by hand; the header comment says how. Editing
  which jurisdictions get their own row is the one editorial decision, in its `named` CTE.
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

  🔴 **The `US Congress + national` row is a STRUCTURAL test, and it was missing from this
  recipe.** Federal seats are found by `essentials.districts.district_type IN
  ('NATIONAL_UPPER','NATIONAL_LOWER')`, checked BEFORE the state fallbacks. Nothing else
  reproduces it: only **9** offices hang off the United States Federal Government, so no walk
  through office → chamber → government will ever find Congress, and federal members carry
  `representing_state` = the state they represent. Rebuilding without the national test on
  2026-08-19 smeared all 560 of them into their home states (California read 424, not 373) and
  deleted the row — the table still summed perfectly, which is this check's known blind spot.
  Rows carried over from the previous cycle reproduce to the row with the test in place — all
  thirteen of them did on 2026-08-25, when North Carolina was added as the fourteenth and took the
  whole cycle's movement with it out of REST.  That agreement is how
  you know the resolution order is right before you publish.
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
