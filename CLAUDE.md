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
