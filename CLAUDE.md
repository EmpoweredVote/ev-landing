# CLAUDE.md

## How to report

Report in plain English. Readers are smart non-developers.

- Lead with the answer or result. Then give only the detail needed to act on it.
- Short sentences, one idea per sentence, active voice. No idioms, metaphors, or filler.
- Use a plain word instead of a technical term when one exists. When you must use
  a technical term, define it in a few words the first time.
- Make each reply as long as the question needs, and no longer. Do not repeat
  what you already said.

This controls chat replies only. It does not control the style of the files you write —
docs, code comments, commit messages, and page copy follow this repo's own conventions.

## Render settings live in ev-infra

This repo's Render services (`ev-landing`) are managed by the Render Blueprint in
[`EmpoweredVote/ev-infra`](https://github.com/EmpoweredVote/ev-infra) (`render.yaml`).

- Build and start commands, rewrites, headers, custom domains, plans, cron
  schedules and build filters change **only through a PR to ev-infra**. Render
  syncs its `main` branch automatically.
- A setting changed in the Render dashboard is **undone on the next sync**.
- Env var **values** are the exception: set them in the Render dashboard. Add a
  new variable's name to ev-infra (with `sync: false`) so the record stays complete.
- Do not add a `render.yaml` to this repo. Render does not read it.

## Never aggregate the big tables in production

`briefing/refresh.mjs` reads the production database (E.V Backend), which runs on a small compute
size with a daily Disk IO budget. One whole-table read of a large table uses gigabytes of that
budget; in November 2026 this script and ad-hoc counts used it up (ev-cto decision 0038).

- **Never add `count(*)`, `sum()`, `count(DISTINCT …)` or any other unfiltered aggregate** over
  `transparent_motivations.contributions`, `treasury.budgets`, `treasury.budget_categories`,
  `treasury.transactions` or `essentials.legislative_votes`.
- **Campaign-finance totals** come from `transparent_motivations.contribution_totals` (one row,
  refreshed daily by ev-accounts' `ev-jobs-fec-burst`).
- **Row estimate:** `pg_class.reltuples`. **Sample:** `TABLESAMPLE SYSTEM (1)`. **Whole-table work
  on contributions:** the local FEC mirror (`ev-accounts/backend/scripts/033-fec-mirror-bootstrap.ts`).
- After changing a query here, run the script once and check `extensions.pg_stat_statements`
  (`shared_blks_read`, `temp_blks_written`).
