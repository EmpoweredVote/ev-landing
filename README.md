# ev-landing

Public alpha landing page for [Empowered Vote](https://empowered.vote).

A single static HTML page that:

- Briefly explains what Empowered Vote is.
- Links out to each Inform-pillar tool (Compass, Essentials, Read & Rank, Treasury Tracker, Empowered Badges, Civic Trivia Championships).
- Is honest about the alpha state — small part-time team, AI-assisted development with human review, things will break.
- Points to [financials.empowered.vote](https://financials.empowered.vote) for funding transparency.

## Develop

No build step. Open `index.html` in a browser, or:

```bash
python3 -m http.server 5173
# then visit http://localhost:5173
```

## Analytics

We use PostHog to see how many people visit each page and how long they stay.

**Adding a new page? Put this line near the top of its `<head>`:**

```html
<script src="analytics.js"></script>          <!-- a page at the repo root -->
<script src="/analytics.js"></script>         <!-- a page in a subdirectory -->
```

The two forms are not interchangeable, and the check below enforces which one you
need. A subdirectory page (`briefing/`, `maps/`) must use the leading slash, or the
path resolves against its own folder and 404s. A root page must leave it off, or the
page cannot be opened from `file://` for local testing — a root-absolute path there
resolves to `C:/analytics.js`, and every click handler that calls PostHog throws.

That's the whole setup. Everything about how this site measures traffic lives in
`analytics.js`, so if it ever needs changing, change it there — not in a page.

There's an automatic check that warns when a page is missing that line. It
exists because four pages (the three maps and the briefing) were quietly
measuring nothing at all until 2026-08-17.

**That check warns, but does not block merges** (Chris Andrews, 2026-08-17).
Our analytics setup is currently understood by only a small number of people, so
we don't want to block someone because they can't fix a warning on their own.
That's intentional — for now. Please ask before changing it.

### Three easy ways to misread the numbers

- **PostHog's "avg time on page" isn't really an average.** It leans toward the
  longest visits, and a browser tab left open counts the whole time — one visit
  measured 63 days. Use the
  [Time on page — median](https://us.posthog.com/project/444996/insights/aYA2KCir)
  report instead; it shows the typical visit.
- **Pages that instantly forward you elsewhere still get counted**, and show up
  as visits lasting a fraction of a second. That's real, not a mistake.
- **An app that doesn't announce its own navigation looks like nobody gets past
  the front page.** Treasury Tracker changed the address bar as you moved through
  a budget but never told PostHog, so every one of its visitors was recorded
  against the bare domain and nothing else. On 2026-08-15 the briefing published
  "seven people in a quarter opened any of Treasury Tracker" off that data. The
  events were fine; the denominator was not, and the figure was withdrawn the next
  day. Treasury was fixed on 2026-08-16 and now sends a pageview when its URL
  changes. The rule it left behind, which applies to every app we measure:
  **a low count is a claim about the instrument until you have read the code path.**

### Checking that a page really measures

- **You cannot smoke-test our analytics with Playwright, or any other browser
  automation.** Two separate walls, both hit on 2026-08-16. Locally, `analytics.js`
  marks localhost traffic as internal and test. On production, posthog-js loads its
  assets and then transmits nothing at all under an automated browser — including
  for events that are known to work, and spoofing the user agent doesn't help. That
  silence is not evidence of a broken instrument.
- **To confirm new capture code actually shipped, read the deployed bundle.** Fetch
  the site, pull its `/assets/index-*.js` chunk, and grep around the call you added.
  That is what settled the Treasury fix, after the browser tests proved nothing
  either way.
- **At our traffic levels, check where the "visitors" are before believing them.**
  A `$geoip_city_name` breakdown is the cheap discriminator — Boardman, Burleson and
  Dulles are datacenter ranges, not people. Four of Treasury's first six post-fix
  visitors were bots or us.
- **PostHog's relative date ranges snap to midnight.** `-2d` with a daily interval
  silently excludes today, which reads as a confident zero. Use `-24h` or `-12h`
  with an hourly interval when you're checking whether something that shipped this
  morning is capturing.

## Deploy

Configured for Render as a static site via `render.yaml`. Connect the repo on Render and it will publish `./` (root) on every push to `main`.

## Stack

- Plain HTML + CSS + a tiny script for the footer year.
- Manrope from Google Fonts.
- Empowered Vote color palette: coral `#ff5740`, blue `#00657c`, light blue `#59b0c4`, yellow `#fed12e`.
