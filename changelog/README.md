# /changelog — what changed on Empowered Vote

A public page at empowered.vote/changelog.  Short bullets in the house voice, grouped by
week, newest first.  A Claude Code cloud routine writes a post every Tuesday and Friday
morning and publishes it straight to `main` after the checks pass.  Decided in ev-cto
decision 0036 (accepted 2026-11-06), which is the authority for every rule here.

Unlike a briefing edition, a changelog entry is **not frozen**.  A founder can fix or
delete any entry at any time: edit `entries.json` on GitHub and commit.  The page
picks it up on the next deploy.  The feed catches up the next time the routine runs, or
run `node changelog/build-feed.mjs` yourself.

## Files

| File | What it is |
|---|---|
| `entries.json` | The data.  One array, newest first. |
| `index.html` | The page.  It fetches `entries.json` and renders it with `render.mjs`. |
| `render.mjs` | Grouping and HTML.  Shared by the page and the tests. |
| `feed.xml` | RSS feed, one item per entry.  Built by `build-feed.mjs`; never edit by hand. |
| `build-feed.mjs` | Writes `feed.xml` from `entries.json`.  No clock in the output. |
| `rules.mjs` | Every rule an entry must pass.  Shared by the check and the tests. |
| `check-entries.mjs` | The blocking check.  Drops rejected entries and prints why. |
| `blocked-names.txt` | Extra names the check refuses.  **Public repo: only names already public.** |
| `REPOS.md` | Which repos the routine reads, and the product a reader knows each by. |
| `read-commits.mjs` | Lists commits on each repo's default branch in a window, noise removed. |
| `briefing-figures.mjs` | Compares two briefing editions' published figures. |
| `figures.json` | The briefing figures allowed in a "By the numbers" bullet. |
| `last-run.json` | Where the last post stopped reading, and which briefing edition it used. |
| `WRITE-ENTRIES.md` | The prompt the routine runs. |

## Entry shape

```json
{
  "date": "2026-11-10",
  "product": "Compass",
  "text": "Some stance explanations on Compass were hard to read. They're fixed.",
  "link": "https://compass.empowered.vote",
  "highlight": true
}
```

- `date` — the post's date, `YYYY-MM-DD`.  Every bullet in one post shares it.
- `product` — a product the home page links (read from `index.html` on every check), or
  one of `Platform-wide`, `By the numbers`, `Not launched yet`.
- `text` — one sentence, two at most, 50 words at most.
- `link` — optional.  empowered.vote or a listed product's own address only.  A
  `Not launched yet` bullet may link only `/maps/purpose-map.html`; a `By the numbers`
  bullet must link the briefing edition its figure came from.
- `highlight` — optional, `true` for the bullets the newsletter should pick up.

## What the check rejects

`check-entries.mjs` drops an entry, and says why, when it has: a party name; red or blue;
a grant, funder, foundation or sponsor word, or a name in `blocked-names.txt`; a security
word; a word implying invented data ("made up", "invented", "fake"); the word "draft"; an
internal term (rungs, stages, gates, seeding, commits…); an emoji; more than two
sentences; a product the home page does not link; a link anywhere else; or one bullet
too many for its product or its post.  It exits non-zero only if the file is broken.

**Funder names are not listed in this repo on purpose.**  It is public, so a list of
funder or prospect names here would publish the very thing the check guards.  The check
blocks the words a funder credit cannot be written without instead.

## Running the checks

```bash
node changelog/check-entries.mjs --dry
node changelog/build-feed.mjs
node run-tests.mjs tests/changelog
```

`tests/changelog/` is plain node and runs in about a second.  The browser test for the
page is `tests/layout/changelog-page.cjs`; it runs with the full suite and needs
Playwright's Chromium (`npx playwright install chromium-headless-shell`).

## Setting up the routine (a founder, after merge)

Use `/schedule` in Claude Code.  Tuesday and Friday, **08:00 Pacific**.  The decision says
"about 06:00, after the briefing", but the briefing has landed as late as 07:32 Pacific
(2026-11-03).  A run that starts before the briefing lands still works — it picks the new
edition up on the next run, because `last-run.json` remembers which edition it used — but
08:00 gets the numbers into the same morning's post.

The routine needs: the `EmpoweredVote/ev-landing` repo with push to `main`; read access to
the repos in `REPOS.md` (all public except `empowered-validation-quests` and
`empowered-badges`); outbound HTTPS to `api.github.com` and `accounts-api.empowered.vote`.
It needs **no secrets, no database access and no PostHog access.**  The prompt is:

> Follow `changelog/WRITE-ENTRIES.md` in this repo exactly.

Before trusting it, run it once by hand and read the post.
