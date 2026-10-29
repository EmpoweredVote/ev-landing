-- Rebuilds the hand-maintained "Sourced stances, by where they serve" table in index.html.
--
-- Run it with any env file carrying DATABASE_URL, from the repo root:
--   node --env-file="C:/EV-Accounts/backend/.env" -e "const pg=require('pg');const fs=require('fs');(async()=>{const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query(\"SET statement_timeout='15min'\");console.table((await c.query(fs.readFileSync('briefing/coverage-table.sql','utf8'))).rows);await c.end();})()"
--
-- It is an EXCLUSIVE partition: every politician with at least one answer lands in exactly one
-- bucket, first match wins.  The order is load-bearing and each step is there because skipping it
-- produced a published wrong number once (see briefing/README.md):
--   1. placeholder occupancy            -> 'no seat'   (migration 1702; keeps discovered candidates out)
--   2. current office_terms row         -> that government's state, else 'national'
--   3. legacy politicians.office_id     -> that government's state, else 'national'
--   4. a NATIONAL_UPPER/LOWER district  -> 'national'  (no office->chamber->government walk finds
--                                                       the chamber-less federal seats; without this
--                                                       test the Delegates smear into their
--                                                       territories at step 5)
--   5. offices.representing_state       -> that state   (93% of offices have chamber_id NULL)
--   6. otherwise                        -> 'no seat'
--
-- REORDERED 2026-10-29, and the reorder is the fix.  `nat` used to run SECOND, before either
-- government walk, and it is a per-PERSON test: it asks whether someone holds any office in a
-- NATIONAL_UPPER/LOWER district.  Fifty-two offices titled "Candidate for U.S. Senate - <state>"
-- are typed NATIONAL_UPPER, so four sitting state officials who are running for the Senate were
-- being filed as national seats: Ken Paxton (Texas Attorney General), James Talarico (Texas
-- Representative), and the Lieutenant Governors of Illinois and Minnesota.  The page labels that
-- row "US Congress + national"; the Attorney General of Texas is not in Congress.
--
-- There is no structural column that separates a candidacy office from a real seat -- both carry
-- a district, a chamber, the federal government and a representing_state, and `seats` is null on
-- 98 of the 102 real ones too -- so testing for one would mean matching the TITLE, which is the
-- class of test this file exists to avoid.  Moving `nat` below the two government walks needs no
-- such test: a person with a real state seat resolves to their state first, and `nat` then
-- catches only the people whose sole link is federal, which is exactly who it was added for.
-- The two CASE arms below were flipped for the same reason -- a state wins over 'national' when
-- a person's current terms include both, instead of bool_or poisoning the whole aggregate.
--
-- Measured: national 556 -> 552, TX 270 -> 272, REST 365 -> 367, and the other twelve named rows
-- reproduce to the row.  That is the corroborating signal this file's header describes, and it
-- is the reason to trust a reorder of a load-bearing partition at all.
--
-- This mirrors the federal guard added to byState/seatsByState in refresh.mjs on the same day,
-- and it has to: the map and this table are two views of one dataset on one page, and if they
-- disagree about who is national the page carries two numbers for the same people.
--
-- The last two output rows are the check: TOTAL(partition) must equal TOTAL(headline), which is
-- what refresh.mjs writes into the data-auto spans.  That check catches MISSING rows, not
-- misplaced ones — the corroborating signal is that the named rows carried over from the previous
-- cycle reproduce unchanged.  On 2026-08-25 ALL THIRTEEN did, to the row, and the entire cycle's
-- movement landed in the fourteenth (North Carolina, added to `named` that day) plus REST.  That
-- is the strongest form of this signal: it says the resolution order did not shift under you.
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
cur_st AS (SELECT c.pid, CASE
             -- A real state seat decides, even when the same person also holds a federal
             -- office; bool_or used to answer 'national' for anyone holding both.
             WHEN min(upper(btrim(g.state))) FILTER (WHERE btrim(coalesce(g.state,'')) <> '') IS NOT NULL
               THEN min(upper(btrim(g.state))) FILTER (WHERE btrim(coalesce(g.state,'')) <> '')
             WHEN bool_or(g.type IN ('NATIONAL','federal')) THEN 'national' END AS st
           FROM cur c JOIN essentials.offices o ON o.id=c.office_id
           JOIN essentials.chambers ch ON ch.id=o.chamber_id
           JOIN essentials.governments g ON g.id=ch.government_id GROUP BY 1),
leg_st AS (SELECT l.pid, CASE
             -- A real state seat decides, even when the same person also holds a federal
             -- office; bool_or used to answer 'national' for anyone holding both.
             WHEN min(upper(btrim(g.state))) FILTER (WHERE btrim(coalesce(g.state,'')) <> '') IS NOT NULL
               THEN min(upper(btrim(g.state))) FILTER (WHERE btrim(coalesce(g.state,'')) <> '')
             WHEN bool_or(g.type IN ('NATIONAL','federal')) THEN 'national' END AS st
           FROM leg l JOIN essentials.offices o ON o.id=l.office_id
           JOIN essentials.chambers ch ON ch.id=o.chamber_id
           JOIN essentials.governments g ON g.id=ch.government_id GROUP BY 1),
rep_st AS (SELECT x.pid, min(upper(btrim(o.representing_state))) AS st FROM anyoff x
           JOIN essentials.offices o ON o.id=x.office_id
           WHERE btrim(coalesce(o.representing_state,'')) <> '' GROUP BY 1),
part AS (
  SELECT a.pid, a.n,
    CASE WHEN ph.pid IS NOT NULL THEN 'no seat'
         WHEN cur_st.st IS NOT NULL THEN cur_st.st
         WHEN leg_st.st IS NOT NULL THEN leg_st.st
         WHEN nat.pid IS NOT NULL THEN 'national'
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
  ('national','no seat','CA','MA','TX','MD','ME','VA','OR','WI','UT','WA','AZ','NC','TN'))
SELECT 1 AS ord, bucket, pols, stances, NULL::int AS jurisdictions FROM named
UNION ALL
SELECT 2, 'REST', sum(pols)::int, sum(stances)::int, count(*)::int FROM agg WHERE bucket NOT IN (SELECT bucket FROM named)
UNION ALL
SELECT 3, 'TOTAL(partition)', sum(pols)::int, sum(stances)::int, NULL FROM agg
UNION ALL
SELECT 4, 'TOTAL(headline)', (SELECT count(DISTINCT politician_id)::int FROM inform.politician_answers),
       (SELECT count(*)::int FROM inform.politician_answers), NULL
ORDER BY 1, 4 DESC;
