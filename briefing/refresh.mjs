#!/usr/bin/env node
/**
 * Refreshes the auto-marked numbers in briefing/index.html from the live database.
 *
 * Usage:
 *   node --env-file=path/to/.env briefing/refresh.mjs          # needs DATABASE_URL
 *   node --env-file=path/to/.env briefing/refresh.mjs --dry    # print changes, write nothing
 *
 * What it updates: <span data-auto="key"> values, the US map tile shading/tooltips,
 * the legend tier counts, and the as-of date.  All narrative prose is left alone
 * on purpose; judgment stays human.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const DRY = process.argv.includes('--dry');
const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = join(HERE, 'index.html');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.  Run with: node --env-file=<file with DATABASE_URL> briefing/refresh.mjs');
  process.exit(2);
}

// An edition can carry a note saying which of its figures were added AFTER publication and
// on what date — the Treasury Tracker and Officials-on-file maps were, on 2026-10-29.  A
// refresh rewrites those figures, and the note is then a false claim about a page whose
// whole offer to the reader is that its numbers can be checked.  So a write refuses while
// the note is there; --dry still reports, because inspecting a page is always safe.
// Rewrite or remove the note first.  The next edition removes it anyway: it is written
// fresh, and every figure it carries shares one as-of date again.
//
// This runs BEFORE the connection on purpose.  Refusing after the queries means waiting out
// the campaign-finance aggregate — about twenty minutes — to be told no.
if (/Added after publication, and dated separately/.test(readFileSync(PAGE, 'utf8'))) {
  console.error('This edition carries an "Added after publication" note, which names figures that');
  console.error('  were queried on a date of their own.  Refreshing rewrites them and leaves the');
  console.error('  note claiming something that is no longer true.  Rewrite or remove the note in');
  console.error('  briefing/index.html first.');
  if (!DRY) {
    console.error('REFUSING to write.  Re-run with --dry to see what would change.');
    process.exit(3);
  }
  console.error('  (--dry, so reporting anyway; nothing will be written.)\n');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
// The server default is 30s, which the campaign-finance aggregate (tens of millions of
// rows) blows through.  Without this the finance query fails, gets swallowed by its
// try/catch, and the page keeps publishing whatever numbers were last written by hand.
await client.query(`SET statement_timeout = '15min'`);
const one = async (sql) => (await client.query(sql)).rows[0];
const all = async (sql) => (await client.query(sql)).rows;

const fmt = (n) => Number(n).toLocaleString('en-US');
const fmtM = (n) => (Number(n) / 1e6).toFixed(1).replace(/\.0$/, '') + ' million';
const fmtB = (n) => (Number(n) / 1e9).toFixed(1).replace(/\.0$/, '') + ' billion';

// ---------- queries ----------
// Curated vs discovery pool is a STRUCTURAL question, not a source-name one.  Testing
// source = 'cal_access_discovery' caught California and missed Indiana entirely: 672 records seeded
// from Indiana candidate-committee filings were being counted as curated officials.  Provenance
// stays the wrong test: every incumbent seeking re-election has a candidate committee.
//
// 🔴 THE MIGRATION-1702 TEST DIED ON 2026-09-24 AND DIED SILENTLY, BY BEING FIXED.  It asked
// essentials.politician_occupancy_evidence.is_placeholder_occupancy — does this person hold an
// office carrying no geography — and migration CA_0206 retired all 76,330 of those placeholder
// offices (essentials.offices 85,134 -> 8,804).  Nobody holds a placeholder any more, so the
// column reads false for every row in the table and the old query answered "89,903 curated, 0 in
// the pool".  A test can stop discriminating because the thing it detected was REMOVED, and that
// failure looks exactly like a clean bill of health.  The retired records themselves were not
// deleted: all 76,330 people are still there, now simply seated on nothing.
//
// The replacement asks what a record RESTS ON.  A curated record carries at least one anchor —
// a current term, the legacy office link, a candidacy in a race, or researched stances.  A
// discovery record carries none of the four; it is a name lifted off a campaign-finance filing
// and nothing else.  That is structural in the same way the old test was, and it survives the
// placeholder offices being gone, because it never asked about them.
//
// The status flag `is_active` is kept as an INDEPENDENT second opinion rather than as the
// answer, and the two are compared below.  Measured 2026-09-29 they agree on 89,441 of 89,903
// records (99.5%); the disagreements are 350 active records with no anchor yet and 112 retired
// people who still carry one.  If they ever diverge badly, the flag or the anchors moved and
// this line needs reading again — hence the WARNING.
const ANCHORED = `(
     EXISTS (SELECT 1 FROM essentials.office_terms t
              WHERE t.politician_id = p.id AND (t.term_end IS NULL OR t.term_end >= current_date))
  OR p.office_id IS NOT NULL
  OR EXISTS (SELECT 1 FROM essentials.race_candidates rc WHERE rc.politician_id = p.id)
  OR EXISTS (SELECT 1 FROM inform.politician_answers a WHERE a.politician_id = p.id))`;
const core = await one(`SELECT
  (SELECT count(*) FROM essentials.politicians p WHERE ${ANCHORED}) AS pols_curated,
  (SELECT count(*) FROM essentials.politicians p WHERE NOT ${ANCHORED}) AS pool,
  (SELECT count(*) FROM essentials.politicians p WHERE p.is_active) AS active_flagged,
  (SELECT count(*) FROM essentials.politician_occupancy_evidence WHERE is_placeholder_occupancy) AS placeholder_held,
  (SELECT count(*) FROM inform.politician_answers) AS stances,
  (SELECT count(DISTINCT politician_id) FROM inform.politician_answers) AS pols_with_stances,
  (SELECT count(*) FROM inform.compass_topics) AS topics,
  -- The library is not the ladder a voter answers today.  63 topics exist; the OPEN season
  -- serves 60 of them, and the legacy is_live flag (44) has not tracked either since Seasons
  -- shipped.  Publishing the library count alone overstates what the Compass asks, so the page
  -- carries both and this is the one that moves when a topic is pinned into the open season.
  (SELECT count(DISTINCT sq.topic_id) FROM inform.season_questions sq
     JOIN inform.seasons s ON s.id = sq.season_id WHERE s.status = 'open') AS topics_open,
  (SELECT count(*) FROM public.source_verifications) AS verified_sources,
  (SELECT count(*) FROM essentials.race_candidates) AS candidates_2026,
  (SELECT count(DISTINCT rc.politician_id) FROM essentials.race_candidates rc
     JOIN inform.politician_answers pa ON pa.politician_id = rc.politician_id) AS candidates_with_stances,
  (SELECT round(avg(cnt),1) FROM (SELECT count(*) cnt FROM inform.politician_answers GROUP BY politician_id) t) AS avg_stances,
  (SELECT count(*) FROM essentials.districts) AS districts,
  (SELECT count(*) FROM essentials.legislative_votes) AS leg_votes,
  (SELECT count(*) FROM essentials.legislative_bills) AS bills,
  (SELECT count(*) FROM meetings.meetings) AS meetings,
  (SELECT count(*) FROM meetings.segments) AS segments,
  (SELECT count(*) FROM meetings.speakers) AS speakers,
  (SELECT count(*) FROM meetings.la_council_votes) AS council_votes,
  -- Civic Trivia's live bank.  Count the questions a PLAYER can be served: status 'active' AND
  -- linked to an ACTIVE collection.  A bare count of trivia.questions reads ~9,000 because it
  -- includes 4,021 archived and 1,974 expired rows, and a count that ignores the collection link
  -- counts questions no collection serves.  The audit's own handoff re-derives this number every
  -- session rather than carrying it forward, for the same reason the note there gives: nightly
  -- yield and automatic expiry both move it, in opposite directions.
  (SELECT count(*) FROM trivia.questions q
     JOIN trivia.collection_questions cq ON cq.question_id = q.id
     JOIN trivia.collections c ON c.id = cq.collection_id AND c.is_active
    WHERE q.status = 'active') AS trivia_active`);

// 🔴 THE STANCE TOTAL COUNTS STORAGE, NOT POSITIONS, AND IT HAD NEVER BEEN ASKED TO PROVE IT.
// `count(*) FROM politician_answers` is a row count.  Since Seasons shipped, one person can hold
// a Season 1 AND a Season 2 answer on the SAME topic, and both rows are counted — 38,311 rows
// resolve to 33,629 distinct (politician, topic) pairs.  Worse, from 2026-10-06 the stance audit
// began withdrawing unsupported positions by writing a Season 2 answer of 0 over them: compassService
// does `NULLIF(pa.value, 0) AS stance_value` with the guard OUTSIDE the season collapse, so a 0 in
// the newest season SUPPRESSES the pair rather than falling through to Season 1.  A withdrawal
// therefore INSERTS a row, and the headline total goes UP while the number of positions a voter can
// actually read goes DOWN.  On 2026-10-10 the stored total rose 36,438 -> 38,311 in the same five
// days that 1,629 positions were withdrawn.
//
// So the page carries both, the way it already carries `topics` beside `topics_open`:
//   stances         — rows stored.  This is what coverage-table.sql partitions, so the table's
//                     TOTAL(partition) = TOTAL(headline) check still reconciles against it.
//   stances_served  — positions a voter is served: the newest season's answer per (politician,
//                     topic), counted only where it is not a blank.  This is the honest headline.
const servedRows = await one(`
  WITH latest AS (
    SELECT DISTINCT ON (a.politician_id, a.topic_id)
           a.politician_id, a.topic_id, a.value
      FROM inform.politician_answers a
      JOIN inform.seasons s ON s.id = a.season_id
     ORDER BY a.politician_id, a.topic_id, s.number DESC
  )
  SELECT count(*) FILTER (WHERE value > 0)                        AS stances_served,
         count(*) FILTER (WHERE value = 0)                        AS stances_blanked,
         count(*)                                                 AS stance_pairs,
         count(DISTINCT politician_id) FILTER (WHERE value > 0)   AS pols_served,
         round(count(*) FILTER (WHERE value > 0)::numeric
               / NULLIF(count(DISTINCT politician_id) FILTER (WHERE value > 0), 0), 1) AS avg_served
    FROM latest`);

const treasury = await one(`SELECT
  (SELECT count(DISTINCT municipality_id) FROM treasury.budgets) AS budget_entities,
  (SELECT min(fiscal_year) FROM treasury.budgets) AS min_fy,
  (SELECT max(fiscal_year) FROM treasury.budgets) AS max_fy,
  (SELECT count(*) FROM treasury.budget_line_items) AS line_items,
  (SELECT count(*) FROM treasury.transactions) AS transactions,
  (SELECT count(*) FROM treasury.salaries) AS salaries,
  (SELECT count(*) FROM treasury.municipalities m WHERE m.entity_type='city'   AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id=m.id)) AS t_cities,
  (SELECT count(*) FROM treasury.municipalities m WHERE m.entity_type='county' AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id=m.id)) AS t_counties,
  (SELECT count(*) FROM treasury.municipalities m WHERE m.entity_type='state'  AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id=m.id)) AS t_states,
  (SELECT count(*) FROM treasury.municipalities m WHERE m.entity_type='town'   AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id=m.id)) AS t_towns,
  -- The four types above are NOT the whole roster, and publishing only those four under-counted
  -- the page by 4,005 entities on 2026-09-22: the bulk state sweeps arrive as the classes their
  -- own publisher uses, so Pennsylvania brings boroughs and Michigan brings townships and
  -- villages.  Anything not named here lands in t_other, which is computed rather than typed so a
  -- class nobody has seen yet still shows up somewhere instead of vanishing.
  (SELECT count(*) FROM treasury.municipalities m WHERE m.entity_type='township' AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id=m.id)) AS t_townships,
  (SELECT count(*) FROM treasury.municipalities m WHERE m.entity_type='borough'  AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id=m.id)) AS t_boroughs,
  (SELECT count(*) FROM treasury.municipalities m WHERE m.entity_type='village'  AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id=m.id)) AS t_villages,
  (SELECT count(*) FROM treasury.municipalities m WHERE m.entity_type NOT IN ('city','county','state','town','township','borough','village')
                                                   AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id=m.id)) AS t_other`);

// The anchor test and the `is_active` flag are two independent readings of the same split, so they
// have to keep agreeing.  This is the check that would have caught CA_0206 retiring the placeholder
// offices out from under the old test: the moment the two answers diverge, one of them has stopped
// measuring the thing.  `placeholder_held` is printed for the same reason — it is the old test, kept
// as a tripwire rather than deleted, and it should now read 0 for ever.
{
  const curated = Number(core.pols_curated), flagged = Number(core.active_flagged);
  const gap = Math.abs(curated - flagged);
  // 5%, not 2%.  Measured 2026-09-29 the honest gap is already 238 of 12,198 — 1.95% — so a 2%
  // threshold would fire on an ordinary week's drift, and a warning that cries wolf is one people
  // learn to scroll past.  This is meant to catch a test losing its subject, not to police noise.
  if (gap > curated * 0.05) {
    console.log(`WARNING: the anchor test says ${curated} curated records, is_active says ${flagged}`);
    console.log(`  — a gap of ${gap}, past the 5% these two have historically tracked within.`);
    console.log('  Read both before publishing; one of them has stopped describing the split.');
  }
  if (Number(core.placeholder_held) > 0) {
    console.log(`WARNING: ${core.placeholder_held} records hold a placeholder office again.`);
    console.log('  CA_0206 retired all of them on 2026-09-24; if they are back, a loader is making');
    console.log('  offices with no geography again and the pool figure is understated.');
  }
}

// The entity-class rows are a PARTITION of the headline entity count, so they have to sum to it.
// That check is the only thing that would have caught the 2026-09-22 defect, where the page listed
// four classes out of ten and printed 3,502 of 7,507 entities as though it were the whole roster.
{
  const parts = ['t_cities','t_counties','t_states','t_towns','t_townships','t_boroughs','t_villages','t_other']
    .reduce((a, k) => a + Number(treasury[k]), 0);
  if (parts !== Number(treasury.budget_entities)) {
    console.log(`WARNING: entity classes sum to ${parts} but budget_entities is ${treasury.budget_entities}.`);
    console.log('  A class is missing from the breakdown, or t_other is not catching it.  Fix the');
    console.log('  query before publishing — the sum is what makes the list a roster and not a sample.');
  }
}

// Which state a researched official belongs to has TWO linkages, and the map has to read both.
// ADR 0002 moved officeholder occupancy onto dated `office_terms`; `politicians.office_id` is the
// older link and is not backfilled for anyone seeded after that change.  Reading only office_id
// showed Wisconsin as 5 researched officials when it has 208 (its whole 2026 build is term-linked),
// and Massachusetts as 109 when it has 302 — WI sat in the palest map tier for a month.  The union
// is deliberate: term-linked is a superset today, but a politician still carrying only the legacy
// link would silently vanish from the map if we swapped rather than unioned.  Terms are filtered to
// CURRENT occupancy (term_end null or not yet passed) so a former officeholder does not keep
// shading a state he has left.
const byState = await all(`
  WITH by_term AS (
    SELECT upper(trim(g.state)) AS st, pa.politician_id AS pid
    FROM inform.politician_answers pa
    JOIN essentials.office_terms ot ON ot.politician_id = pa.politician_id
    JOIN essentials.offices o ON o.id = ot.office_id
    JOIN essentials.chambers c ON c.id = o.chamber_id
    JOIN essentials.governments g ON g.id = c.government_id
    WHERE g.state IS NOT NULL AND trim(g.state) <> ''
      AND (ot.term_end IS NULL OR ot.term_end >= current_date)
  ), by_office AS (
    SELECT upper(trim(g.state)) AS st, pa.politician_id AS pid
    FROM inform.politician_answers pa
    JOIN essentials.politicians p ON p.id = pa.politician_id
    JOIN essentials.offices o ON o.id = p.office_id
    JOIN essentials.chambers c ON c.id = o.chamber_id
    JOIN essentials.governments g ON g.id = c.government_id
    WHERE g.state IS NOT NULL AND trim(g.state) <> ''
      -- ...and only for someone who holds NO current term at all.  Added 2026-10-29.  The legacy
      -- link is not cleared when a person moves on: Aisha Wahab's politicians.office_id still
      -- points at the California state Senate seat she left for Congress, so the union was
      -- shading her onto California while coverage-table.sql correctly called her national.  The
      -- union is still a union and not a swap -- 5 researched people reach a state through this
      -- link ALONE, and they are exactly who it was added to protect -- but a CURRENT term is
      -- better evidence than a stale one, so where both exist the current one decides.
      AND NOT EXISTS (SELECT 1 FROM essentials.office_terms t
                       WHERE t.politician_id = p.id
                         AND (t.term_end IS NULL OR t.term_end >= current_date))
  ), by_repr AS (
    -- Third link, and the reason it is needed: 93% of offices (77,680 of 83,291) have
    -- chamber_id NULL and carry their jurisdiction on the office row itself.  Both joins above
    -- walk office -> chamber -> government, so every one of those offices is invisible to them.
    -- This hid 29 researched officials, 16 of them the District of Columbia — which the tile
    -- writer below was still captioning as "stance research in progress" because its count read 0.
    SELECT upper(btrim(o.representing_state)) AS st, pa.politician_id AS pid
    FROM inform.politician_answers pa
    JOIN essentials.politicians p ON p.id = pa.politician_id
    LEFT JOIN essentials.office_terms ot ON ot.politician_id = p.id
         AND (ot.term_end IS NULL OR ot.term_end >= current_date)
    JOIN essentials.offices o ON o.id = coalesce(ot.office_id, p.office_id)
    WHERE o.chamber_id IS NULL AND btrim(coalesce(o.representing_state, '')) <> ''
      -- ...but NOT a federal seat.  Fixed 2026-10-29.  Eight federal offices carry no chamber
      -- -- the DC Delegate, DC's two Shadow Senators, and the Delegates for Guam, Puerto Rico,
      -- the Northern Marianas, the Virgin Islands and American Samoa -- so this link, which
      -- exists to find offices that hang off no government, was finding them and shading them
      -- onto a state tile.  These maps are state and local by their own caption, and
      -- coverage-table.sql already counts every NATIONAL_UPPER/LOWER seat in its one national
      -- row, so a delegate was being counted twice on the same page.  Measured effect: DC 16
      -- researched -> 14, DC 27 officials on file -> 24, Puerto Rico 161 -> 160, and the four
      -- territories that held exactly one official each now hold none.
      --
      -- Excluded by OFFICE, never by person.  Four sitting state officials carry a second
      -- office titled "Candidate for U.S. Senate -- <state>" that is typed NATIONAL_UPPER:
      -- Ken Paxton (Texas Attorney General), James Talarico (Texas Representative), and the
      -- Lieutenant Governors of Illinois and Minnesota.  Excluding the PERSON would take all
      -- four off their own state's tile over a candidacy they have not won.
      AND NOT EXISTS (SELECT 1 FROM essentials.districts d
                       WHERE d.id = o.district_id
                         AND d.district_type IN ('NATIONAL_UPPER','NATIONAL_LOWER'))
  )
  SELECT st, count(*) AS pols
  FROM (SELECT st, pid FROM by_term
        UNION SELECT st, pid FROM by_office
        UNION SELECT st, pid FROM by_repr) u
  -- ...and then take the discovered candidates back out.  Adding by_repr above pulled in 7 Indiana
  -- records whose "office" is a placeholder with no geography — they are people we found in
  -- candidate-committee filings, not sitting officials, and they had Indiana reading 27 where it
  -- holds 20.  Migration 1702's view is the test; a source-name test misses this class by design.
  WHERE NOT EXISTS (SELECT 1 FROM essentials.politician_occupancy_evidence e
                    WHERE e.politician_id = u.pid AND e.is_placeholder_occupancy)
  GROUP BY 1`);

// The SECOND and THIRD maps, added 2026-10-29.  All three draw the same 52 boxes and differ
// only in what fills them, so the two new ones have to resolve a jurisdiction exactly the way
// byState does or the tabs stop being comparable — and comparing them is the whole point of
// putting them behind tabs.  seatsByState is literally byState with the `politician_answers`
// join lifted out, which is why its `researched` column reproduces byState state for state;
// that equality is asserted below and is the cheapest guard against the three maps drifting
// apart.  It starts from office_terms and offices, never from a scan of politicians: the first
// draft of the old per-jurisdiction seat count walked all 85k people and never finished.
const seatsByState = await all(`
  WITH pol_state AS (
    SELECT upper(trim(g.state)) AS st, ot.politician_id AS pid
    FROM essentials.office_terms ot
    JOIN essentials.offices o ON o.id = ot.office_id
    JOIN essentials.chambers c ON c.id = o.chamber_id
    JOIN essentials.governments g ON g.id = c.government_id
    WHERE g.state IS NOT NULL AND trim(g.state) <> ''
      AND (ot.term_end IS NULL OR ot.term_end >= current_date)
    UNION
    SELECT upper(trim(g.state)), p.id
    FROM essentials.politicians p
    JOIN essentials.offices o ON o.id = p.office_id
    JOIN essentials.chambers c ON c.id = o.chamber_id
    JOIN essentials.governments g ON g.id = c.government_id
    WHERE g.state IS NOT NULL AND trim(g.state) <> ''
      -- ...and only for someone who holds NO current term at all.  Added 2026-10-29.  The legacy
      -- link is not cleared when a person moves on: Aisha Wahab's politicians.office_id still
      -- points at the California state Senate seat she left for Congress, so the union was
      -- shading her onto California while coverage-table.sql correctly called her national.  The
      -- union is still a union and not a swap -- 5 researched people reach a state through this
      -- link ALONE, and they are exactly who it was added to protect -- but a CURRENT term is
      -- better evidence than a stale one, so where both exist the current one decides.
      AND NOT EXISTS (SELECT 1 FROM essentials.office_terms t
                       WHERE t.politician_id = p.id
                         AND (t.term_end IS NULL OR t.term_end >= current_date))
    UNION
    SELECT upper(btrim(o.representing_state)), p.id
    FROM essentials.politicians p
    LEFT JOIN essentials.office_terms ot ON ot.politician_id = p.id
         AND (ot.term_end IS NULL OR ot.term_end >= current_date)
    JOIN essentials.offices o ON o.id = coalesce(ot.office_id, p.office_id)
    WHERE o.chamber_id IS NULL AND btrim(coalesce(o.representing_state, '')) <> ''
      -- ...but NOT a federal seat.  Fixed 2026-10-29.  Eight federal offices carry no chamber
      -- -- the DC Delegate, DC's two Shadow Senators, and the Delegates for Guam, Puerto Rico,
      -- the Northern Marianas, the Virgin Islands and American Samoa -- so this link, which
      -- exists to find offices that hang off no government, was finding them and shading them
      -- onto a state tile.  These maps are state and local by their own caption, and
      -- coverage-table.sql already counts every NATIONAL_UPPER/LOWER seat in its one national
      -- row, so a delegate was being counted twice on the same page.  Measured effect: DC 16
      -- researched -> 14, DC 27 officials on file -> 24, Puerto Rico 161 -> 160, and the four
      -- territories that held exactly one official each now hold none.
      --
      -- Excluded by OFFICE, never by person.  Four sitting state officials carry a second
      -- office titled "Candidate for U.S. Senate -- <state>" that is typed NATIONAL_UPPER:
      -- Ken Paxton (Texas Attorney General), James Talarico (Texas Representative), and the
      -- Lieutenant Governors of Illinois and Minnesota.  Excluding the PERSON would take all
      -- four off their own state's tile over a candidacy they have not won.
      AND NOT EXISTS (SELECT 1 FROM essentials.districts d
                       WHERE d.id = o.district_id
                         AND d.district_type IN ('NATIONAL_UPPER','NATIONAL_LOWER'))
  )
  SELECT st, count(*) AS seated,
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM inform.politician_answers a
                                         WHERE a.politician_id = u.pid)) AS researched
  FROM pol_state u
  WHERE NOT EXISTS (SELECT 1 FROM essentials.politician_occupancy_evidence e
                    WHERE e.politician_id = u.pid AND e.is_placeholder_occupancy)
  GROUP BY 1`);

// Treasury coverage, by the state the government sits in.  A government is "covered" when it has
// a budget, not when it has a row — treasury.municipalities holds entities we know about ahead of
// any budget for them, and on 2026-10-29 that was 46 entities in four states.  Counting rows
// instead of budgets would have shaded Texas 32 where it has 17.  `state` is the only geography
// on the table; the federal row carries 'US' and deliberately gets no tile.
const treasuryByState = await all(`
  SELECT upper(btrim(m.state)) AS st, count(*) AS entities
  FROM treasury.municipalities m
  WHERE btrim(coalesce(m.state, '')) <> ''
    AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id = m.id)
  GROUP BY 1`);

// The first two jurisdiction links walk office -> chamber -> government and are safe from the
// federal leak only because the federal government row carries no state.  That is a property of
// the data, not of the query, so it is checked rather than assumed: if a federal office ever
// becomes reachable through a state government, the guard above will not catch it.
{
  const [{ n }] = await all(`
    SELECT count(*) AS n FROM essentials.offices o
    JOIN essentials.districts d ON d.id = o.district_id
    JOIN essentials.chambers ch ON ch.id = o.chamber_id
    JOIN essentials.governments g ON g.id = ch.government_id
    WHERE d.district_type IN ('NATIONAL_UPPER','NATIONAL_LOWER')
      AND g.state IS NOT NULL AND btrim(g.state) <> ''`);
  if (Number(n) > 0) {
    console.log(`WARNING: ${n} federal offices now hang off a government carrying a state, so the`);
    console.log('  first two jurisdiction links can reach Congress and are shading state tiles with');
    console.log('  it.  The NATIONAL_UPPER/LOWER guard is on the third link only.  Widen it.');
  }
}

// Campaign finance (FEC).  Wrapped: if the schema is absent, leave the spans as-is.
let finance = null;
try {
  finance = await one(`SELECT
    count(*) AS fin_contribs,
    count(DISTINCT politician_source_id) AS fin_pols,
    round(sum(amount)) AS fin_dollars,
    count(DISTINCT election_cycle) FILTER (WHERE election_cycle ~ '^(19|20)[0-9]{2}$') AS fin_cycles,
    min(election_cycle) FILTER (WHERE election_cycle ~ '^(19|20)[0-9]{2}$') AS fin_min_cycle,
    max(election_cycle) FILTER (WHERE election_cycle ~ '^(19|20)[0-9]{2}$') AS fin_max_cycle
    FROM transparent_motivations.contributions`);
} catch (e) {
  // Leave the existing values rather than publishing a wrong number — but say so loudly,
  // because a silent skip here is indistinguishable from "already up to date".
  console.warn(`WARNING: campaign-finance query failed, leaving those figures untouched: ${e.message}`);
}

// Map inputs, computed here because they need the connection: which jurisdictions the map
// draws, how many researched officials each has, and the seat count for any with none.
const stateNames = { AK:'Alaska', AL:'Alabama', AR:'Arkansas', AZ:'Arizona', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia', HI:'Hawaii', IA:'Iowa', ID:'Idaho', IL:'Illinois', IN:'Indiana', KS:'Kansas', KY:'Kentucky', LA:'Louisiana', MA:'Massachusetts', MD:'Maryland', ME:'Maine', MI:'Michigan', MN:'Minnesota', MO:'Missouri', MS:'Mississippi', MT:'Montana', NC:'North Carolina', ND:'North Dakota', NE:'Nebraska', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NV:'Nevada', NY:'New York', OH:'Ohio', OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VA:'Virginia', VT:'Vermont', WA:'Washington', WI:'Wisconsin', WV:'West Virginia', WY:'Wyoming', DC:'District of Columbia', PR:'Puerto Rico' };
const counts = Object.fromEntries(byState.map(r => [r.st, Number(r.pols)]));
const seatCounts = Object.fromEntries(seatsByState.map(r => [r.st, Number(r.seated)]));
const researched = Object.fromEntries(seatsByState.map(r => [r.st, Number(r.researched)]));
const treasuryCounts = Object.fromEntries(treasuryByState.map(r => [r.st, Number(r.entities)]));

// The seat count behind a t0 tooltip used to come from its own query, run only for the
// jurisdictions that needed it.  It comes off seatsByState now — one query, one number, so the
// tooltip on the stance map and the tooltip on the Officials-on-file map can never disagree
// about how many officials a jurisdiction holds.  Either way it is QUERIED, not typed into a
// caption: DC's said "27 officials seeded" long after that stopped being true.
const seeded = seatCounts;
for (const abbr of Object.keys(stateNames).filter((a) => !counts[a])) {
  console.log(`note: ${abbr} has ${seeded[abbr] ?? 0} seats seeded and no researched stances yet.`);
}

// 🔴 THE MAP AND THE COVERAGE TABLE MUST AGREE, STATE FOR STATE.  They are two views of one
// dataset on one page, and on 2026-10-29 they silently disagreed about six people: the table
// filed four sitting state officials as national because a Senate candidacy is recorded as a
// national office, and the map put a DC Delegate and a former California state senator on state
// tiles.  Nothing on the page explained the difference, and nothing in this script looked.
//
// So it looks now, every run, by running coverage-table.sql itself rather than a copy of its
// logic -- a second copy would drift in exactly the way this check exists to catch.  The file is
// sliced at its `agg` CTE so every bucket comes back instead of the editorial named rows.
{
  const sql = readFileSync(join(HERE, 'coverage-table.sql'), 'utf8');
  const cut = sql.indexOf('agg AS (');
  if (cut < 0) {
    console.log('WARNING: coverage-table.sql no longer has an `agg` CTE to slice at, so the map');
    console.log('  could not be checked against it.  Re-point this check or drop it; leaving it');
    console.log('  silently skipped is how the two drifted apart in the first place.');
  } else {
    const rows = await all(sql.slice(0, cut) + 'agg AS (SELECT bucket, count(*)::int AS pols FROM part GROUP BY 1) SELECT * FROM agg');
    const table = Object.fromEntries(rows.map((r) => [r.bucket, Number(r.pols)]));
    const off = Object.keys(stateNames)
      .filter((st) => (table[st] ?? 0) !== (counts[st] ?? 0))
      .map((st) => `${st} table ${table[st] ?? 0} vs map ${counts[st] ?? 0}`);
    if (off.length) {
      console.log('WARNING: the coverage table and the stance map disagree about who belongs to a');
      console.log('  state.  One of them is counting a federal seat as state and local, or missing');
      console.log('  someone the other has.  Both are on the same page, so fix them together:');
      for (const o of off) console.log(`    ${o}`);
    }
  }
}

// The three maps must agree about who is researched, or the tabs are measuring different things.
// seatsByState.researched is byState with one join removed, so they have to match state for state.
{
  const off = Object.keys(stateNames)
    .filter((a) => (counts[a] ?? 0) !== (researched[a] ?? 0))
    .map((a) => `${a} ${counts[a] ?? 0}/${researched[a] ?? 0}`);
  if (off.length) {
    console.log('WARNING: the stance map and the officials-on-file map disagree on researched');
    console.log('  counts, which should be impossible — one query is the other with a join taken');
    console.log(`  out.  Read both before publishing: ${off.join(', ')}`);
  }
}

// A jurisdiction can hold officials and have no tile to shade.  Four did until 2026-10-29 --
// American Samoa, Guam, the Northern Marianas and the US Virgin Islands, one official each --
// and that one official was in every case the territory's non-voting Delegate to Congress, which
// the federal guard above now excludes.  So this should print nothing, and if it starts printing
// again a real jurisdiction has gained an official with nowhere to show it.  Reported rather
// than fixed: adding a box to an 11-column grid of the states is an editorial decision about the
// shape of the map, and this script does not get to make it.
{
  const missing = Object.entries(seatCounts)
    .filter(([st, n]) => n > 0 && !(st in stateNames))
    .sort((a, b) => b[1] - a[1]);
  if (missing.length) {
    console.log('note: officials on file in jurisdictions with no tile on any of the three maps:');
    for (const [st, n] of missing) console.log(`        ${st}: ${n}`);
  }
}

await client.end();

// ---------- commits in the last 30 days across local repos (best effort) ----------
const REPOS = [
  'C:/EV-Accounts', 'C:/EV-CompassV2', 'C:/Transparent Motivations',
  'C:/Transparent Motivations/essentials', 'C:/treasury-tracker', 'C:/read-rank',
  'C:/Project Test', 'C:/Civic Spaces', 'C:/Empowered Listening',
  'C:/Focused Communities', 'C:/Fallacy Finders', 'C:/On the Record',
  'C:/Validation Quests', 'C:/ev-landing/ev-landing-main',
];
let commits30 = 0, reposCounted = 0;
for (const r of REPOS) {
  if (!existsSync(r)) continue;
  try {
    commits30 += Number(execFileSync('git', ['-C', r, 'rev-list', '--count', '--since=30 days ago', 'HEAD'], { encoding: 'utf8' }).trim());
    reposCounted++;
  } catch { /* repo unreadable; skip */ }
}

// ---------- compute values ----------

// Every map uses the SAME four tiers.  That is deliberate and it is the only reason the tabs
// can be read against each other: 100+, 10 to 99, 1 to 9, none.  Change this and you have to
// change all three legends, or a reader comparing two tabs is comparing two different scales.
const tier = (n) => n >= 100 ? 't3' : n >= 10 ? 't2' : n >= 1 ? 't1' : 't0';

// t0 is counted like every other tier.  Leaving a shaded tier out of the count is what once let
// DC be shaded on the map while the legend accounted for one tile fewer than the map plainly
// showed, and the same trap is now set three times over.  The labels say "jurisdictions", not
// "states", because DC and Puerto Rico are tiles and are neither.
const tally = (by) => {
  const t = { t3: 0, t2: 0, t1: 0, t0: 0 };
  for (const abbr of Object.keys(stateNames)) t[tier(by[abbr] ?? 0)]++;
  return t;
};
const tiers = tally(counts);
const treTiers = tally(treasuryCounts);
const seatTiers = tally(seatCounts);

// Each map's tiles must sum to the 52 boxes the page draws, or a legend is quietly describing a
// different map from the one above it.
for (const [name, t] of [['stances', tiers], ['treasury', treTiers], ['seeded', seatTiers]]) {
  const n = t.t3 + t.t2 + t.t1 + t.t0;
  if (n !== Object.keys(stateNames).length) {
    console.log(`WARNING: the ${name} legend accounts for ${n} tiles, not ${Object.keys(stateNames).length}.`);
  }
}

const asof = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const values = {
  asof,
  pols_curated: fmt(core.pols_curated), pool: fmt(core.pool),
  stances: fmt(core.stances), pols_with_stances: fmt(core.pols_with_stances),
  stances_served: fmt(servedRows.stances_served), stances_blanked: fmt(servedRows.stances_blanked),
  stance_pairs: fmt(servedRows.stance_pairs), pols_served: fmt(servedRows.pols_served),
  avg_served: String(servedRows.avg_served),
  topics: fmt(core.topics), topics_open: fmt(core.topics_open),
  verified_sources: fmt(core.verified_sources),
  candidates_2026: fmt(core.candidates_2026), candidates_with_stances: fmt(core.candidates_with_stances),
  avg_stances: String(core.avg_stances),
  districts: fmt(core.districts), leg_votes: fmt(core.leg_votes), bills: fmt(core.bills),
  meetings: fmt(core.meetings), segments: fmt(core.segments), speakers: fmt(core.speakers),
  council_votes: fmt(core.council_votes),
  trivia_active: fmt(core.trivia_active),
  budget_entities: fmt(treasury.budget_entities), min_fy: String(treasury.min_fy), max_fy: String(treasury.max_fy),
  line_items_m: fmtM(treasury.line_items), transactions_m: fmtM(treasury.transactions),
  salaries: fmt(treasury.salaries),
  t_cities: fmt(treasury.t_cities), t_counties: fmt(treasury.t_counties),
  t_states: fmt(treasury.t_states), t_towns: fmt(treasury.t_towns),
  t_townships: fmt(treasury.t_townships), t_boroughs: fmt(treasury.t_boroughs),
  t_villages: fmt(treasury.t_villages), t_other: fmt(treasury.t_other),
  tier_deep: String(tiers.t3), tier_growing: String(tiers.t2), tier_seeded: String(tiers.t1),
  tier_none: String(tiers.t0),
  tre_deep: String(treTiers.t3), tre_growing: String(treTiers.t2),
  tre_seeded: String(treTiers.t1), tre_none: String(treTiers.t0),
  seat_deep: String(seatTiers.t3), seat_growing: String(seatTiers.t2),
  seat_seeded: String(seatTiers.t1), seat_none: String(seatTiers.t0),
  commits30: reposCounted ? '~' + fmt(Math.round(commits30 / 100) * 100) : null,
  ...(finance ? {
    fin_contribs_m: fmtM(finance.fin_contribs),
    fin_dollars_b: fmtB(finance.fin_dollars),
    fin_pols: fmt(finance.fin_pols),
    fin_cycles: String(finance.fin_cycles),
    fin_min_cycle: String(finance.fin_min_cycle),
    fin_max_cycle: String(finance.fin_max_cycle),
  } : {}),
};

// ---------- apply ----------
let html = readFileSync(PAGE, 'utf8');
const changes = [];

for (const [key, val] of Object.entries(values)) {
  if (val === null) continue; // leave existing value when a source was unavailable
  const re = new RegExp(`(<(?:span|div)([^>]*) data-auto="${key}"[^>]*>)([^<]*)(</(?:span|div)>)`, 'g');
  html = html.replace(re, (m, open, _attrs, old, close) => {
    if (old !== val) changes.push(`${key}: ${old} -> ${val}`);
    return open + val + close;
  });
}

// 🔴 STORED AND SERVED MUST NOT MOVE IN OPPOSITE DIRECTIONS WITHOUT SOMEONE SAYING SO.  That is
// precisely what a withdrawal campaign does — it inserts suppressing rows, so the row count climbs
// while the positions a voter can read fall — and on 2026-10-10 nothing in this script noticed.
// `changes` already carries the old value straight off the page, so the comparison is free.
{
  const moved = (key) => {
    const c = changes.find((x) => x.startsWith(key + ': '));
    if (!c) return null;
    const [, from, to] = c.match(/: ([\d,]+) -> ([\d,]+)$/) ?? [];
    if (!from) return null;
    return Number(to.replace(/,/g, '')) - Number(from.replace(/,/g, ''));
  };
  const a = moved('stances'), b = moved('stances_served');
  if (a !== null && b !== null && Math.sign(a) !== Math.sign(b)) {
    console.log(`WARNING: rows stored moved ${a > 0 ? '+' : ''}${a} while positions served moved ${b > 0 ? '+' : ''}${b}.`);
    console.log('  The two disagree on direction, which is the signature of a withdrawal campaign:');
    console.log('  a blank in the newest season is an INSERT that suppresses an older answer.');
    console.log('  Say so in the narrative; do not publish the rising number on its own.');
  }
}

// Map tiles.  THE REWRITE IS SCOPED PER MAP, and that is the whole trick here.  Before the tabs
// shipped on 2026-10-29 there was one map and one global regex over `.st` tiles; with three maps
// on the page that same regex rewrites all 156 tiles with stance numbers, and the two new maps
// come out looking plausible and reading the wrong dataset.  So each `<div class="usmap"
// data-map="...">` block is pulled out by its own marker and only its tiles are touched.  A map
// whose name is not in MAPS below is left exactly as it is rather than filled with a guess.
const MAPS = {
  stances: (abbr) => {
    const n = counts[abbr] ?? 0;
    if (n === 0) {
      const s = seeded[abbr];
      return { n, title: s
        ? `${stateNames[abbr] ?? abbr}: ${fmt(s)} officials seeded, stance research not started`
        : `${stateNames[abbr] ?? abbr}: stance research not started` };
    }
    return { n, title: `${stateNames[abbr] ?? abbr}: ${fmt(n)} researched official${n === 1 ? '' : 's'}` };
  },
  treasury: (abbr) => {
    const n = treasuryCounts[abbr] ?? 0;
    return { n, title: n === 0
      ? `${stateNames[abbr] ?? abbr}: no budgets published yet`
      : `${stateNames[abbr] ?? abbr}: ${fmt(n)} government${n === 1 ? '' : 's'} with published budgets` };
  },
  seeded: (abbr) => {
    const n = seatCounts[abbr] ?? 0, r = researched[abbr] ?? 0;
    return { n, title: n === 0
      ? `${stateNames[abbr] ?? abbr}: no officials on file`
      : `${stateNames[abbr] ?? abbr}: ${fmt(n)} official${n === 1 ? '' : 's'} on file, ${fmt(r)} researched` };
  },
};

const seenMaps = [];
html = html.replace(
  // The closing marker is a </div> alone on its own line at the block's own indent, NOT the
  // first </div> that turns up: every tile inside the map ends with one, so a lazy match to
  // `</div>` stops after tile one and rewrites a single box.
  /(<div class="usmap" data-map="([a-z]+)">)([\s\S]*?)(\r?\n  <\/div>)/g,
  (whole, open, kind, body, close) => {
    seenMaps.push(kind);
    const fill = MAPS[kind];
    if (!fill) {
      console.log(`WARNING: the page carries a map named "${kind}" that this script cannot fill.`);
      console.log('  Its tiles were left untouched, which means they are showing whatever was');
      console.log('  last written into them by hand.  Add it to MAPS or take it off the page.');
      return whole;
    }
    const next = body.replace(
      /<div class="st t\d" (style="[^"]*") title="[^"]*">([A-Z]{2})<\/div>/g,
      (m, style, abbr) => {
        const { n, title } = fill(abbr);
        const t = tier(n);
        const tile = `<div class="st ${t}" ${style} title="${title}">${abbr}</div>`;
        if (tile !== m) changes.push(`map ${kind} ${abbr}: ${t} (${fmt(n)})`);
        return tile;
      });
    return open + next + close;
  });

// Every map this script knows how to fill should be ON the page.  A map that quietly stops being
// rendered is how a tab ends up linking to a panel that is not there.
for (const kind of Object.keys(MAPS)) {
  if (!seenMaps.includes(kind)) {
    console.log(`WARNING: no <div class="usmap" data-map="${kind}"> on the page, so that map was`);
    console.log('  not written.  Either the section was rewritten without it or the marker moved.');
  }
}

if (changes.length === 0) {
  console.log('Already up to date.');
} else {
  console.log(`${changes.length} change(s):`);
  for (const c of changes) console.log('  ' + c);
  if (DRY) {
    console.log('\nDry run; nothing written.');
  } else {
    writeFileSync(PAGE, html);
    console.log(`\nWrote ${PAGE}.  Review, then commit and push to deploy.`);
  }
}
