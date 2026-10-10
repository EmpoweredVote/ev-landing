# Publish tonight's briefing edition

You are running unattended, from a Windows scheduled task, at about 02:07 on a Tuesday or a
Friday. Nobody is watching. When you finish, the new edition is live on empowered.vote/briefing
and volunteers read it. **Act accordingly: an edition is never edited after it is frozen, so a
number you did not check is a number that is wrong for ever.**

Work in `C:\ev-landing\ev-landing-main`.

## Before anything else

**Read `briefing/README.md` from top to bottom.** All of it. It is long because every paragraph in
it is a figure this page published wrongly once. It carries the publishing checklist, the exact
queries, the PostHog recipe, the host map, and about twenty traps with the dates they were paid
for. This file does not repeat it; it only says what is specific to running without a human.

Then read the current `briefing/index.html` — the outgoing edition — for its facts and for the
promises it made. **Open it to read, never to edit.** Each edition is a fresh re-write.

## The job

Follow "Publishing a new edition" in the README exactly. In outline:

1. **Freeze the outgoing edition first.** `cp briefing/index.html briefing/<its date>/index.html`,
   then retitle it, point its canonical at its own dated address, add `robots: noindex`, and
   insert the `.archived` banner. The worked example is `briefing/2026-09-11/index.html`.
   **Nothing else in this job matters if this step is skipped** — publishing over an unfrozen
   predecessor destroys it and there is no other copy.
2. Give tonight's edition its dated folder with a forwarder to `/briefing`.
3. Write the new `briefing/index.html`. Fresh prose. Keep the stylesheet, the `data-auto` spans,
   the map block, the jump strip and the page chrome.
4. Update **both** copies of the archive list — the `<details class="prevdrop">` picker in the
   header and the `Past Briefings` section — moving the `current` tag onto tonight's edition.
5. Update the dated permalink in the footer.
6. Run `node --env-file="C:/EV-Accounts/backend/.env" briefing/refresh.mjs --dry`, read every
   WARNING it prints, then run it for real.
7. Add the newly frozen edition to `PAGES` in `tests/layout/briefing-tables-mobile.cjs`.
8. Run the tests. At minimum `node tests/layout/briefing-tables-mobile.cjs`; run the rest of
   `tests/` too, and do not publish on a failure you have not understood.
9. Commit and push to `main`. Render deploys on the push.

## Gathering the numbers

The README has the detail. The shape of it:

- **The database** is the source of truth. `refresh.mjs` writes the `data-auto` spans; anything
  narrative you have to query yourself, with `node --env-file="C:/EV-Accounts/backend/.env"`.
- **Sibling repos**: fetch, resolve `origin/HEAD` per repo rather than assuming `main`, and pass
  an explicit **time of day** on every `--since` — a bare date silently starts the window at the
  current clock time. The repo list is `REPOS` in `refresh.mjs`.
- **PostHog**: `POSTHOG_API_KEY` and `POSTHOG_PROJECT_ID` are in the same env file. Re-run the
  `$host` breakdown first as discovery, reconcile it against the host map in the README, then
  query each app once with an exact host filter. Control the cohort substitution against
  `filterTestAccounts` on at least one row and require exact agreement.
- **`inform.seasons`** every cycle, even when nothing moved — a season opening is a launch and no
  other figure announces it.

## What this page is for

It is a progress report that claims every number on it can be checked. That claim is the product.
So:

- **Report what you measured, not what you expected.** A flat week is a finding. A total that
  fell because an audit retired rows is a finding, and a good one. Write it plainly.
- **A figure you cannot reproduce does not go on the page.** Not even as a carried-forward label.
  If the previous edition printed something you cannot now derive, say that it is unverified or
  leave it out — do not copy it forward because it was there last time.
- **Honour what the last edition promised.** If it said "the next pull is the one to read", read
  it and print the answer even when the answer is "nothing changed". If it named a test, run it.
- **If the last edition got something wrong, this one says so and says what it corrects.** Never
  reach back into the archive.
- **When a figure suddenly looks perfect, or moves the wrong way for the work that was done,
  suspect the measurement before you celebrate the result.** That is how most of the warnings in
  the README came to be written.
- **Never name a funder, grant programme or foundation in page copy**, whatever the branch names
  and commit tags say. Report the work, not who paid for it.
- **Nothing on this page is coloured red or blue.**

## If you cannot finish

Do not publish half an edition.

- If the database is unreachable, or `refresh.mjs` fails, **stop**. Leave `briefing/index.html`
  exactly as it is, make no commit, and print clearly what failed. A stale current edition is far
  better than a broken new one. The next run, or a human, will pick it up.
- If you have already frozen the outgoing edition and then cannot write the new one, **commit the
  freeze on its own** — it is correct and self-contained — and say in the commit message that the
  new edition did not follow and why.
- If a test fails for a reason you cannot explain, do not publish. Say so in the log.

## Commit messages

Follow the repo's convention: `docs(briefing): <what this edition found>`, in the voice the recent
log uses. End the message with:

```
Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```
