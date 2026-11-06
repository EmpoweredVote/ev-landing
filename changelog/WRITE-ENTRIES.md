# Write this Tuesday's or Friday's changelog post

You are running unattended, as a Claude Code cloud routine, on a Tuesday or Friday
morning (US time).  Nobody is watching.  When you finish, your post is live on
empowered.vote/changelog within minutes, and the newsletter may quote it.  A founder
reads it after the fact, not before.  **Write only what you would be happy to see
quoted in a newsletter with your name on it.**

The rules come from ev-cto decision 0036.  This file is how to apply them.  Work in the
root of the `EmpoweredVote/ev-landing` checkout, on `main`.

## Before anything else

1. `git pull --ff-only origin main`.  The briefing may have published overnight.
2. Read `changelog/README.md` (what each file does) and `changelog/REPOS.md` (which repo is
   which product).
3. Read the voice guide: ev-marketer `knowledge/VOICE.md` on `main`, **all of it**, and the
   "Warmth and play" section twice.  If you can reach the ev-marketer repo, read it there
   (`gh api repos/EmpoweredVote/ev-marketer/contents/knowledge/VOICE.md --jq .content | base64 -d`).
   If you cannot, use the short version under "How it should sound" below and say so in
   the run log.  Do not stop because of it.
4. Read the last two posts in `changelog/entries.json`, so you do not repeat yourself.

## The job

### 1. Find the window

```bash
cat changelog/last-run.json
```

`through` is where the last published post stopped reading.  Your window runs from
`through` to now.  If the last run had nothing to say it made no commit, so the window
can cover more than one run.  That is fine: nothing in it has been written about yet.

### 2. Read what changed

```bash
node changelog/read-commits.mjs > /tmp/commits.json
```

It reads each repo in `REPOS.md` through the GitHub API, on each repo's real default
branch, with the noise already removed (dependency bumps, bots, `chore:`, `ci:`, `test:`,
`docs:`, merge commits, a change and its revert in the same window).  It prints commits
grouped by product, and `listed: true/false` for each product.

- **If `gh` cannot reach a repo**, it lands in `unreadable`.  Every repo in `REPOS.md`
  except the two private ones is public, so you can still read it without a token:
  `git clone --bare --filter=blob:none --shallow-since=<through> https://github.com/<repo>`,
  then `git log <default branch> --since=<through>` with the full timestamp.
- **Read `unreadable`.**  A repo that could not be read is not a quiet week.  Name it in the
  run log.  Never write "nothing changed in X" for a repo you could not read.
- Commit subjects are written by developers for developers.  Read the body too when the
  subject is unclear.  When you still cannot tell what a voter would see, leave it out.

### 3. Decide what a voter can see

Go through the commits product by product.  A change gets a bullet only if **all** of
these hold:

- **A voter can see it or use it today**, on a product the home page links.  The listed
  products are whatever `listedProducts()` finds in `index.html` (`node -e "import('./changelog/rules.mjs').then(m=>console.log(m.listedProducts(require('fs').readFileSync('index.html','utf8')).map(p=>p.name)))"`).
  On 2026-11-06 they were Compass, Essentials, Read & Rank, Treasury Tracker and Civic
  Trivia Championships.
- **It is not draft content.**  A Compass topic or season gets an entry only when voters
  can answer it.  Check what Compass actually serves:
  `curl -s https://accounts-api.empowered.vote/api/compass/topics` lists the topics a voter
  is served (no sign-in needed).  Research for a topic that is not in that list is draft,
  however many commits it took.  On 2026-11-06 the gun-policy and voting-rights work for
  "Season 3" was all draft: none of it qualified.
- **It is not a security change.**  Never write about one, from any repo, however it is
  phrased: access rules, keys, sign-in hardening, "advisor" warnings, permission grants.
  Not even "we fixed a bug" — leave it out entirely.
- **It is not internal.**  Research tooling, loaders, verifiers, test guards, scripts,
  scheduled jobs, the admin side, and anything a voter would not notice get no bullet.
  About four in five commits are like this.  That is normal.

`ev-accounts` is the shared backend, so its commits belong to different products.  Map
each one to the product a voter would see it in (portraits and officials → Essentials;
stance explanations → Compass; budgets → Treasury Tracker).  `ev-landing` commits are the
home page: write about them only when a voter would notice, and never about `briefing/`
or `changelog/` itself.

**Unlisted products** (`listed: false`: Civic Spaces, Focused Communities and the rest on
2026-11-06) share **at most one** bullet with product `"Not launched yet"`.  It may name
them.  It may say, in general words, that work happened.  It gives **no feature detail**
and links nowhere except the whole Mind Map, `/maps/purpose-map.html`.  Example: "This
week we also made progress on Civic Spaces and Focused Communities."  Leave it out when
there is nothing to say.

### 4. Group, then cut

- Several commits about one change are one bullet.  A week of portrait fixes is one bullet.
- **At most two bullets per product and six per post**, plus one "By the numbers" bullet
  and one "Not launched yet" bullet.  A busy window gets grouped harder, not longer.
- Prefer what a voter would care about most.  A new city beats a fixed tooltip.

### 5. The numbers bullet

```bash
node changelog/briefing-figures.mjs
```

It compares the newest briefing edition with the one the last post used (`edition` in
`last-run.json`).  It only compares figures on the allow-list in `figures.json`, which
are figures that count what a voter can read.  It **skips** any figure whose name is
missing from either edition, because a renamed figure is a changed label, and comparing
across it prints a jump that never happened.

- If `moves` is empty, there is no numbers bullet.  Do not reach for a smaller number.
- Use only what it printed.  Round down: use its `say` ("more than 1,300") or
  `total_more_than`.  Never compute a new number, and never pull one from the briefing's
  prose.
- A drop is reported plainly ("Civic Trivia has a few fewer live questions this week, as
  older ones expire").  Do not hide it and do not spin it.
- Product `"By the numbers"`, and the link is the edition's dated address, `link` in the
  output (for example `/briefing/2026-11-10`).
- Do not turn the briefing's narrative into bullets.  It describes the same commits you
  already read, so it would count them twice.

### 6. Write the entries

Add them to the **top** of `changelog/entries.json`, today's date, in the order you want
them read (the most interesting first; numbers and not-launched last).  Each entry:

```json
{ "date": "2026-11-10", "product": "Compass", "text": "One sentence, two at most.", "link": "https://compass.empowered.vote", "highlight": false }
```

- `product` is a listed product name exactly as the home page writes it, or
  `"Platform-wide"`, `"By the numbers"`, `"Not launched yet"`.
- `link` is optional.  Only empowered.vote or a listed product's own address.  Link only
  when the reader can go and see the thing.
- `highlight: true` on the one or two bullets the newsletter should pick up.  Most posts
  have one.  Some have none.
- Do not start the text with the product name or with "Not launched yet:"; the page shows
  the product as a tag beside it.

**If nothing is worth saying, stop here.**  Change no file, make no commit, and print
"No post today:" and why.  An empty post is worse than none.

## How it should sound

The full guide is VOICE.md.  The short version:

- **A voter's words, not ours.**  Say what a voter now sees or can do.  Never: reasoning
  texts, rungs, stages, the source store, gates, seeding, backfill, pipeline, migration,
  endpoint, repo, commit, deploy, Phase/Stage/CA_/CC_ codes.  "Some stance explanations on
  Compass were hard to read.  They're fixed."
- **One sentence, two at most.**  Under 35 words.  Use "you" and "we", and contractions.
- **Light and a little dry.**  A joke is welcome when it is cuttable: delete it and the
  bullet still says everything.  Not every bullet needs one.  Two jokes in a post is plenty.
- **Joke about the software, the process, the weather, our size, our hosting bill.**  Never
  about voters, officials, candidates, parties or any group.  Never about elections or
  their results.
- **Own data mistakes plainly, and never joke about them.**  "We found that some of
  McKinney's department names were inaccurate.  They now come straight from the city."
  Never say data was made up, invented, faked or fabricated, even when a commit message
  does.  Say it was "inaccurate", "wrong" or "didn't match the source", and say what it
  matches now.
- **Numbers only from the briefing.**  A count, a dollar figure or a year span in a commit
  message has not been checked by anyone; leave it out of the text.  The only numbers a
  post may print are the ones `briefing-figures.mjs` gives you, in the numbers bullet.
- **No hype, no guilt, no urgency, no emojis, no exclamation marks.**
- **Never name a funder, grant, foundation or sponsor**, whatever a branch name or commit
  tag says.  Report the work, not who paid for it.
- **No party names.  Nothing red or blue.**  Not even as a joke about maps.
- **No names of private people.**  Elected officials and cities may be named when the
  change is about their public record.  Volunteers and contributors are not named without
  their consent.
- **No user data.**  Never any number about who used what.

Good:

- "Treasury Tracker now covers Plano's check register, straight from the city's own site."
- "Portraits now carry the photo credit their licence asks for.  Small print, done properly."
- "We found that some of McKinney's department names were inaccurate.  They now come
  straight from the city."

Bad, and why:

- "Stage 5 gate now reads Georgia resolutions" — internal, and no voter sees it.
- "Season 3 gun-policy research doubled" — draft content.
- "Removed department names Treasury Tracker had made up" — says we invented data.
- "Cleared the security advisor errors" — security change.
- "Civic Spaces now lets signed-out readers open a shared post" — feature detail for an
  unlisted product.

## Check, then publish

```bash
node changelog/check-entries.mjs     # drops any entry that breaks a rule, and says why
node changelog/build-feed.mjs        # rebuilds feed.xml from entries.json
node run-tests.mjs tests/changelog   # must print "N/N passed"
```

- **Read every DROPPED line.**  Do not rewrite a dropped entry to sneak it past the check.
  If the reason was a wording slip (a jargon word in an otherwise fine bullet), you may
  rewrite it once in plain words and check again.  If the reason is the subject itself
  (security, draft, unlisted product, a funder), leave it dropped.
- If every entry was dropped, there is no post: restore the files (`git checkout -- changelog`)
  and stop.
- **If a test fails, do not push.**  Restore the files, print the failure, and stop.  The
  next run, or a human, will pick it up.

Then update `changelog/last-run.json`:

```json
{ "through": "<the until timestamp read-commits.mjs printed>", "edition": "<the 'to' edition briefing-figures.mjs printed>" }
```

Run the tests once more (`01-entries-valid` reads `last-run.json`), then commit **only
the changelog files**:

```bash
git add changelog/entries.json changelog/feed.xml changelog/last-run.json
git diff --cached --stat     # must show only those three files
git commit -m "docs(changelog): the <Month D> post, <what it says in a few words>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git pull --rebase origin main && git push origin main
```

Render deploys on the push.  If the push is rejected twice, stop and say so; do not
force-push, ever.

## If you cannot finish

- No access to a repo: write the post from what you could read, and name the missing repo
  in the run log.
- No access to ev-landing push: stop; print the entries you would have published.
- Anything you do not understand: publish nothing.  A missing post costs nothing.  A wrong
  one is public.
