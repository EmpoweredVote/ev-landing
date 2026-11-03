// final-numbers.mjs -- every hand-typed platform figure in briefing/index.html,
// derived in ONE database run.
//
//   DATABASE_URL=... node briefing/final-numbers.mjs      # prints JSON
//
// One run is the whole point. Counting twice, an hour apart, is how a page ends up
// carrying two numbers that disagree, and nothing on the page says which moment
// either was true at. It also prints a `clock` block first -- the database's own
// now(), the last touched row and how many minutes it has been quiet -- because a
// count taken while a load is running is a count of a moving thing.
//
// TWO CONSTANTS ARE PER-EDITION and must be changed before each run:
//
//   SINCE  the hour the PREVIOUS edition's figures were taken, which is the hour
//          its stored-row count was still true. Everything "this cycle" is counted
//          from there.
//   D      the draft season's id. Season 3 while it is the draft; a new id when a
//          later season takes over.
//
// It also reads briefing/coverage-table.sql, which is committed beside it.
// Read-only throughout: every statement is a SELECT.

import pg from 'pg';
import { readFileSync } from 'node:fs';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query(`SET statement_timeout = '15min'`);
const q = async (x) => (await c.query(x)).rows;
const one = async (x) => (await q(x))[0];
const D = `'7b3a066c-815d-43b2-a6a0-6a3029778075'`;
// The window starts at the hour the previous edition's figures were taken, which is the
// hour its stored-row count (39,042) was still true.
const SINCE = `timestamptz '2026-10-29 21:00:00+00'`;

// The map's jurisdiction rule, inlined. It used to be sliced out of a scratch
// file called tiles4.mjs that lived beside this one and is gone now. Three ways
// to place a person in a state, in order, each one only for the people the
// previous could not place: a current term, then the office on the politician
// row for somebody with no current term, then a representing_state for an
// office with no chamber. f then drops anybody held only by placeholder
// occupancy evidence.
const MAPU = `
  WITH by_term AS (
    SELECT upper(trim(g.state)) AS st, pa.politician_id AS pid
    FROM inform.politician_answers pa
    JOIN essentials.office_terms ot ON ot.politician_id = pa.politician_id
    JOIN essentials.offices o ON o.id = ot.office_id
    JOIN essentials.chambers ch ON ch.id = o.chamber_id
    JOIN essentials.governments g ON g.id = ch.government_id
    WHERE g.state IS NOT NULL AND trim(g.state) <> '' AND (ot.term_end IS NULL OR ot.term_end >= current_date)
  ), by_office AS (
    SELECT upper(trim(g.state)) AS st, pa.politician_id AS pid
    FROM inform.politician_answers pa
    JOIN essentials.politicians p ON p.id = pa.politician_id
    JOIN essentials.offices o ON o.id = p.office_id
    JOIN essentials.chambers ch ON ch.id = o.chamber_id
    JOIN essentials.governments g ON g.id = ch.government_id
    WHERE g.state IS NOT NULL AND trim(g.state) <> ''
      AND NOT EXISTS (SELECT 1 FROM essentials.office_terms t WHERE t.politician_id = p.id
                        AND (t.term_end IS NULL OR t.term_end >= current_date))
  ), by_repr AS (
    SELECT upper(btrim(o.representing_state)) AS st, pa.politician_id AS pid
    FROM inform.politician_answers pa
    JOIN essentials.politicians p ON p.id = pa.politician_id
    LEFT JOIN essentials.office_terms ot ON ot.politician_id = p.id AND (ot.term_end IS NULL OR ot.term_end >= current_date)
    JOIN essentials.offices o ON o.id = coalesce(ot.office_id, p.office_id)
    WHERE o.chamber_id IS NULL AND btrim(coalesce(o.representing_state, '')) <> ''
      AND NOT EXISTS (SELECT 1 FROM essentials.districts d WHERE d.id = o.district_id
                        AND d.district_type IN ('NATIONAL_UPPER','NATIONAL_LOWER'))
  ), u AS (SELECT st,pid FROM by_term UNION SELECT st,pid FROM by_office UNION SELECT st,pid FROM by_repr),
  f AS (SELECT st,pid FROM u WHERE NOT EXISTS (SELECT 1 FROM essentials.politician_occupancy_evidence e
                     WHERE e.politician_id=u.pid AND e.is_placeholder_occupancy))`;

const out = {};
const put = (k, v) => { out[k] = v; };

// --- is the database quiet? -------------------------------------------------
put('clock', await one(`SELECT now()::text AS now,
  max(greatest(created_at, updated_at))::text AS last_touch,
  round(extract(epoch from (now() - max(greatest(created_at, updated_at))))/60.0, 1) AS quiet_min,
  count(*)::int AS rows FROM inform.politician_answers`));

// --- this cycle -------------------------------------------------------------
put('cycle', await one(`SELECT count(*)::int AS rows,
  count(*) FILTER (WHERE value = 0)::int AS withdrawals,
  count(DISTINCT season_id)::int AS seasons, count(DISTINCT topic_id)::int AS topics
  FROM inform.politician_answers WHERE created_at >= ${SINCE}`));
put('first_timers', (await one(`SELECT count(*)::int AS n FROM (
  SELECT politician_id FROM inform.politician_answers
  GROUP BY 1 HAVING min(created_at) >= ${SINCE}) z`)).n);

// --- the two served bases ---------------------------------------------------
put('bases', await one(`
  WITH anyseason AS (
    SELECT DISTINCT ON (a.politician_id, a.topic_id) a.politician_id, a.topic_id, a.value, s.number
      FROM inform.politician_answers a JOIN inform.seasons s ON s.id = a.season_id
     ORDER BY a.politician_id, a.topic_id, s.number DESC),
  live AS (
    SELECT DISTINCT ON (a.politician_id, a.topic_id) a.politician_id, a.topic_id, a.value, s.number
      FROM inform.politician_answers a JOIN inform.seasons s ON s.id = a.season_id AND s.status <> 'draft'
     ORDER BY a.politician_id, a.topic_id, s.number DESC)
  SELECT (SELECT count(*) FROM anyseason WHERE value > 0)::int AS served,
         (SELECT count(DISTINCT politician_id) FROM anyseason WHERE value > 0)::int AS pols_served,
         (SELECT count(*) FROM live WHERE value > 0)::int AS live,
         (SELECT count(DISTINCT politician_id) FROM live WHERE value > 0)::int AS pols_live,
         (SELECT count(*) FROM live WHERE value > 0 AND number = 1)::int AS live_s1,
         (SELECT count(*) FROM live WHERE value > 0 AND number = 2)::int AS live_s2,
         (SELECT count(*) FROM anyseason a WHERE a.value > 0 AND a.number = 3
            AND NOT EXISTS (SELECT 1 FROM live l WHERE l.politician_id = a.politician_id
                              AND l.topic_id = a.topic_id AND l.value > 0))::int AS counted_unreadable,
         (SELECT count(*) FROM anyseason a WHERE a.value = 0 AND a.number = 3
            AND EXISTS (SELECT 1 FROM live l WHERE l.politician_id = a.politician_id
                          AND l.topic_id = a.topic_id AND l.value > 0))::int AS hidden_but_read`));

// --- the draft season --------------------------------------------------------
put('season3', await q(`SELECT t.short_title, count(*)::int AS rows,
  count(*) FILTER (WHERE a.value = 0)::int AS blanks
  FROM inform.politician_answers a JOIN inform.compass_topics t ON t.id = a.topic_id
  WHERE a.season_id = ${D} GROUP BY 1 ORDER BY rows DESC`));

// --- the map -----------------------------------------------------------------
put('tiles', await one(MAPU + ` SELECT count(DISTINCT pid)::int AS people FROM f`));
for (const st of ['MI', 'NC', 'WI', 'AZ', 'CA']) {
  put('tile_' + st, (await one(MAPU + ` SELECT count(*)::int AS n FROM f WHERE st='${st}'`)).n);
}
put('draft_only_tiles', await q(MAPU + `, d AS (SELECT politician_id AS pid FROM inform.politician_answers
  GROUP BY 1 HAVING bool_and(season_id = ${D}))
  SELECT f.st, count(*)::int AS n FROM f JOIN d ON d.pid = f.pid GROUP BY 1 ORDER BY n DESC`));
put('mute_on_tiles', (await one(MAPU + `, live AS (
  SELECT DISTINCT ON (a.politician_id, a.topic_id) a.politician_id AS pid, a.value
    FROM inform.politician_answers a JOIN inform.seasons s ON s.id = a.season_id AND s.status <> 'draft'
   ORDER BY a.politician_id, a.topic_id, s.number DESC)
  SELECT count(DISTINCT f.pid)::int AS n FROM f
   WHERE NOT EXISTS (SELECT 1 FROM live WHERE live.pid = f.pid AND live.value > 0)`)).n);
put('off_map', await one(MAPU + `, notile AS (
  SELECT DISTINCT pa.politician_id AS pid FROM inform.politician_answers pa
   WHERE NOT EXISTS (SELECT 1 FROM f WHERE f.pid = pa.politician_id))
  SELECT count(*)::int AS no_tile,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM essentials.office_terms ot
        JOIN essentials.offices o ON o.id = ot.office_id
        JOIN essentials.districts d ON d.id = o.district_id
       WHERE ot.politician_id = notile.pid AND (ot.term_end IS NULL OR ot.term_end >= current_date)
         AND d.district_type IN ('NATIONAL_UPPER','NATIONAL_LOWER')))::int AS federal,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM essentials.race_candidates rc
       WHERE rc.politician_id = notile.pid))::int AS candidate,
    count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM essentials.office_terms ot
        JOIN essentials.offices o ON o.id = ot.office_id
        JOIN essentials.districts d ON d.id = o.district_id
       WHERE ot.politician_id = notile.pid AND (ot.term_end IS NULL OR ot.term_end >= current_date)
         AND d.district_type IN ('NATIONAL_UPPER','NATIONAL_LOWER'))
      AND NOT EXISTS (SELECT 1 FROM essentials.race_candidates rc
       WHERE rc.politician_id = notile.pid))::int AS neither
  FROM notile`));

// --- the coverage table -------------------------------------------------------
const cov = readFileSync('briefing/coverage-table.sql', 'utf8');
put('coverage', await q(cov));

// --- totals that back the prose ------------------------------------------------
put('stored', await one(`SELECT count(*)::int AS rows, count(DISTINCT politician_id)::int AS pols
  FROM inform.politician_answers`));
put('mi_stances', (await one(`SELECT count(*)::int AS n FROM inform.politician_answers a
  WHERE a.politician_id IN (SELECT pid FROM (${MAPU} SELECT pid FROM f WHERE st='MI') z)`)).n);
put('trivia', await one(`WITH live AS (
  SELECT q.* FROM trivia.questions q
  JOIN trivia.collection_questions cq ON cq.question_id = q.id
  JOIN trivia.collections c ON c.id = cq.collection_id AND c.is_active
  WHERE q.status = 'active')
  SELECT (SELECT count(*) FROM live)::int AS bank,
         (SELECT count(*) FROM live WHERE options_scale IS NOT NULL)::int AS scaled,
         (SELECT count(*) FROM live WHERE options_scale IS NULL)::int AS unscaled,
         (SELECT count(*) FROM trivia.questions WHERE options_scale IS NOT NULL)::int AS scaled_ever,
         (SELECT count(*) FROM trivia.questions WHERE created_at >= ${SINCE})::int AS written,
         (SELECT count(DISTINCT q.id) FROM trivia.questions q,
            jsonb_array_elements(q.expiration_history::jsonb) h
           WHERE h->>'action' = 'expired' AND (h->>'timestamp')::timestamptz >= ${SINCE})::int AS expired`));
put('budgets', await q(`SELECT coalesce(audit_grade,'unknown') AS grade, count(*)::int AS n,
  count(DISTINCT municipality_id)::int AS govs FROM treasury.budgets GROUP BY 1 ORDER BY n DESC`));
put('pr', await one(`WITH pr AS (SELECT DISTINCT p.id, o.title FROM essentials.politicians p
   JOIN essentials.office_terms ot ON ot.politician_id = p.id AND (ot.term_end IS NULL OR ot.term_end >= current_date)
   JOIN essentials.offices o ON o.id = ot.office_id
  WHERE upper(btrim(coalesce(o.representing_state,''))) = 'PR')
  SELECT count(*) FILTER (WHERE title = 'Mayor')::int AS mayors,
    count(*) FILTER (WHERE title = 'Mayor' AND NOT EXISTS (SELECT 1 FROM essentials.politician_images i
      WHERE i.politician_id = pr.id AND i.type = 'default'))::int AS mayors_no_photo,
    count(*) FILTER (WHERE title <> 'Mayor')::int AS other_seats,
    count(*) FILTER (WHERE title <> 'Mayor' AND NOT EXISTS (SELECT 1 FROM essentials.politician_images i
      WHERE i.politician_id = pr.id AND i.type = 'default'))::int AS other_no_photo
  FROM pr`));
put('seasons', await q(`SELECT number, status FROM inform.seasons ORDER BY number`));
console.log(JSON.stringify(out, null, 1));
await c.end();
