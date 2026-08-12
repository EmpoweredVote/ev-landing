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
// from Indiana candidate-committee filings were being counted as curated officials.  Migration 1702
// made the real test one column — essentials.politician_occupancy_evidence.is_placeholder_occupancy,
// which asks whether the office carries geography (district, chamber or city) rather than where the
// person came from.  Provenance is the wrong test: every incumbent seeking re-election has a
// candidate committee.  The two figures below now sum the way migration 1702 describes: 77,002
// placeholder rows in the pool, everyone else curated.
const PLACEHOLDER = `EXISTS (SELECT 1 FROM essentials.politician_occupancy_evidence e
                             WHERE e.politician_id = p.id AND e.is_placeholder_occupancy)`;
const core = await one(`SELECT
  (SELECT count(*) FROM essentials.politicians p WHERE NOT ${PLACEHOLDER}) AS pols_curated,
  (SELECT count(*) FROM essentials.politicians p WHERE ${PLACEHOLDER}) AS pool,
  (SELECT count(*) FROM inform.politician_answers) AS stances,
  (SELECT count(DISTINCT politician_id) FROM inform.politician_answers) AS pols_with_stances,
  (SELECT count(*) FROM inform.compass_topics) AS topics,
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
  (SELECT count(*) FROM meetings.la_council_votes) AS council_votes`);

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
  (SELECT count(*) FROM treasury.municipalities m WHERE m.entity_type='town'   AND EXISTS (SELECT 1 FROM treasury.budgets b WHERE b.municipality_id=m.id)) AS t_towns`);

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
const stateNames = { AK:'Alaska', AL:'Alabama', AR:'Arkansas', AZ:'Arizona', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia', HI:'Hawaii', IA:'Iowa', ID:'Idaho', IL:'Illinois', IN:'Indiana', KS:'Kansas', KY:'Kentucky', LA:'Louisiana', MA:'Massachusetts', MD:'Maryland', ME:'Maine', MI:'Michigan', MN:'Minnesota', MO:'Missouri', MS:'Mississippi', MT:'Montana', NC:'North Carolina', ND:'North Dakota', NE:'Nebraska', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NV:'Nevada', NY:'New York', OH:'Ohio', OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VA:'Virginia', VT:'Vermont', WA:'Washington', WI:'Wisconsin', WV:'West Virginia', WY:'Wyoming', DC:'District of Columbia' };
const counts = Object.fromEntries(byState.map(r => [r.st, Number(r.pols)]));
const tier = (n) => n >= 100 ? 't3' : n >= 10 ? 't2' : n >= 1 ? 't1' : 't0';
const tiers = { t3: 0, t2: 0, t1: 0 };
// DC used to be skipped here because it had no stance rows and was captioned by hand.  It has 16
// now, so it is tallied like anywhere else — otherwise the legend would claim four Growing
// jurisdictions while the map plainly shows five shaded that way.  The legend labels say
// "jurisdictions", not "states", for the same reason.
for (const abbr of Object.keys(stateNames)) {
  const t = tier(counts[abbr] ?? 0);
  if (tiers[t] !== undefined) tiers[t]++;
}

const asof = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const values = {
  asof,
  pols_curated: fmt(core.pols_curated), pool: fmt(core.pool),
  stances: fmt(core.stances), pols_with_stances: fmt(core.pols_with_stances),
  topics: fmt(core.topics), verified_sources: fmt(core.verified_sources),
  candidates_2026: fmt(core.candidates_2026), candidates_with_stances: fmt(core.candidates_with_stances),
  avg_stances: String(core.avg_stances),
  districts: fmt(core.districts), leg_votes: fmt(core.leg_votes), bills: fmt(core.bills),
  meetings: fmt(core.meetings), segments: fmt(core.segments), speakers: fmt(core.speakers),
  council_votes: fmt(core.council_votes),
  budget_entities: fmt(treasury.budget_entities), min_fy: String(treasury.min_fy), max_fy: String(treasury.max_fy),
  line_items_m: fmtM(treasury.line_items), transactions_m: fmtM(treasury.transactions),
  salaries: fmt(treasury.salaries),
  t_cities: fmt(treasury.t_cities), t_counties: fmt(treasury.t_counties),
  t_states: fmt(treasury.t_states), t_towns: fmt(treasury.t_towns),
  tier_deep: String(tiers.t3), tier_growing: String(tiers.t2), tier_seeded: String(tiers.t1),
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

// Map tiles: matched by the two-letter abbreviation they display.
html = html.replace(
  /<div class="st t\d" (style="[^"]*")( data-state="[A-Z]{2}")? title="[^"]*">([A-Z]{2})<\/div>/g,
  (m, style, _ds, abbr) => {
    const n = counts[abbr] ?? 0;
    let t = tier(n), title;
    if (abbr === 'DC' && n === 0) {
      t = 't1';
      title = 'District of Columbia: 27 officials seeded, stance research in progress';
    } else {
      title = `${stateNames[abbr] ?? abbr}: ${fmt(n)} researched official${n === 1 ? '' : 's'}`;
    }
    const next = `<div class="st ${t}" ${style} title="${title}">${abbr}</div>`;
    if (next !== m) changes.push(`map ${abbr}: ${t} (${n})`);
    return next;
  });

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
