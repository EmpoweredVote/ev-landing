-- Rebuilds the hand-maintained "Sourced stances, by where they serve" table in index.html.
--
-- Run it with any env file carrying DATABASE_URL, from the repo root:
--   node --env-file="C:/EV-Accounts/backend/.env" -e "const pg=require('pg');const fs=require('fs');(async()=>{const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query(\"SET statement_timeout='15min'\");console.table((await c.query(fs.readFileSync('briefing/coverage-table.sql','utf8'))).rows);await c.end();})()"
--
-- It is an EXCLUSIVE partition: every politician with at least one answer lands in exactly one
-- bucket, first match wins.  The order is load-bearing and each step is there because skipping it
-- produced a published wrong number once (see briefing/README.md):
--   1. placeholder occupancy            -> 'no seat'   (migration 1702; keeps discovered candidates out)
--   2. a NATIONAL_UPPER/LOWER district  -> 'national'  (only 9 offices hang off the federal
--                                                       government, so no office->chamber->government
--                                                       walk finds Congress; without this test all
--                                                       560+ members smear into their home states)
--   3. current office_terms row         -> that government's state
--   4. legacy politicians.office_id     -> that government's state
--   5. offices.representing_state       -> that state   (93% of offices have chamber_id NULL)
--   6. otherwise                        -> 'no seat'
--
-- The last two output rows are the check: TOTAL(partition) must equal TOTAL(headline), which is
-- what refresh.mjs writes into the data-auto spans.  That check catches MISSING rows, not
-- misplaced ones — the corroborating signal is that ten of the thirteen named rows reproduce
-- unchanged from the previous cycle.
WITH ans AS (
  SELECT politician_id AS pid, count(*)::int AS n FROM inform.politician_answers GROUP BY 1
),
ph AS (SELECT DISTINCT politician_id AS pid FROM essentials.politician_occupancy_evidence WHERE is_placeholder_occupancy),
cur AS (SELECT DISTINCT ot.politician_id AS pid, ot.office_id FROM essentials.office_terms ot
        WHERE (ot.term_end IS NULL OR ot.term_end >= current_date)),
leg AS (SELECT p.id AS pid, p.office_id FROM essentials.politicians p WHERE p.office_id IS NOT NULL),
anyoff AS (SELECT pid, office_id FROM cur UNION SELECT pid, office_id FROM leg),
nat AS (SELECT DISTINCT x.pid FROM anyoff x JOIN essentials.offices o ON o.id=x.office_id
        JOIN essentials.districts d ON d.id=o.district_id
        WHERE d.district_type IN ('NATIONAL_UPPER','NATIONAL_LOWER')),
cur_st AS (SELECT c.pid, CASE WHEN bool_or(g.type IN ('NATIONAL','federal')) THEN 'national'
             ELSE min(upper(btrim(g.state))) FILTER (WHERE btrim(coalesce(g.state,'')) <> '') END AS st
           FROM cur c JOIN essentials.offices o ON o.id=c.office_id
           JOIN essentials.chambers ch ON ch.id=o.chamber_id
           JOIN essentials.governments g ON g.id=ch.government_id GROUP BY 1),
leg_st AS (SELECT l.pid, CASE WHEN bool_or(g.type IN ('NATIONAL','federal')) THEN 'national'
             ELSE min(upper(btrim(g.state))) FILTER (WHERE btrim(coalesce(g.state,'')) <> '') END AS st
           FROM leg l JOIN essentials.offices o ON o.id=l.office_id
           JOIN essentials.chambers ch ON ch.id=o.chamber_id
           JOIN essentials.governments g ON g.id=ch.government_id GROUP BY 1),
rep_st AS (SELECT x.pid, min(upper(btrim(o.representing_state))) AS st FROM anyoff x
           JOIN essentials.offices o ON o.id=x.office_id
           WHERE btrim(coalesce(o.representing_state,'')) <> '' GROUP BY 1),
part AS (
  SELECT a.pid, a.n,
    CASE WHEN ph.pid IS NOT NULL THEN 'no seat'
         WHEN nat.pid IS NOT NULL THEN 'national'
         WHEN cur_st.st IS NOT NULL THEN cur_st.st
         WHEN leg_st.st IS NOT NULL THEN leg_st.st
         WHEN rep_st.st IS NOT NULL THEN rep_st.st
         ELSE 'no seat' END AS bucket
  FROM ans a
  LEFT JOIN ph ON ph.pid=a.pid LEFT JOIN nat ON nat.pid=a.pid
  LEFT JOIN cur_st ON cur_st.pid=a.pid LEFT JOIN leg_st ON leg_st.pid=a.pid LEFT JOIN rep_st ON rep_st.pid=a.pid
),
agg AS (SELECT bucket, count(*)::int AS pols, sum(n)::int AS stances FROM part GROUP BY 1),
-- The named rows are editorial: whichever jurisdictions currently earn their own line.  Everything
-- else collapses into the "N more jurisdictions" row, and `jurisdictions` below is that N.
named AS (SELECT * FROM agg WHERE bucket IN
  ('national','no seat','CA','MA','TX','MD','ME','VA','OR','WI','UT','WA','AZ'))
SELECT 1 AS ord, bucket, pols, stances, NULL::int AS jurisdictions FROM named
UNION ALL
SELECT 2, 'REST', sum(pols)::int, sum(stances)::int, count(*)::int FROM agg WHERE bucket NOT IN (SELECT bucket FROM named)
UNION ALL
SELECT 3, 'TOTAL(partition)', sum(pols)::int, sum(stances)::int, NULL FROM agg
UNION ALL
SELECT 4, 'TOTAL(headline)', (SELECT count(DISTINCT politician_id)::int FROM inform.politician_answers),
       (SELECT count(*)::int FROM inform.politician_answers), NULL
ORDER BY 1, 4 DESC;
