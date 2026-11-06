// Turns entries.json into the changelog page's HTML.  Pure string functions, so the
// page (in the browser) and the tests (in node) render exactly the same way.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Dates are plain YYYY-MM-DD strings; do all arithmetic in UTC so no reader's time
// zone can move a post to the day before.
function utc(date) { return new Date(date + 'T00:00:00Z'); }

export function weekStart(date) {
  const d = utc(date);
  const back = (d.getUTCDay() + 6) % 7; // weeks start on Monday
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

export function longDate(date) {
  const d = utc(date);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function dayHeading(date) {
  const d = utc(date);
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// [{ week, posts: [{ date, entries: [...] }] }], newest first.
export function groupByWeek(entries) {
  const sorted = entries.map((e, i) => [e, i]).sort((a, b) => (a[0].date < b[0].date ? 1 : a[0].date > b[0].date ? -1 : a[1] - b[1])).map(([e]) => e);
  const weeks = [];
  for (const e of sorted) {
    const wk = weekStart(e.date);
    let w = weeks[weeks.length - 1];
    if (!w || w.week !== wk) { w = { week: wk, posts: [] }; weeks.push(w); }
    let p = w.posts[w.posts.length - 1];
    if (!p || p.date !== e.date) { p = { date: e.date, entries: [] }; w.posts.push(p); }
    p.entries.push(e);
  }
  return weeks;
}

function productSlug(product) {
  return String(product).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderEntry(e) {
  const link = e.link
    ? ` <a class="cl-more" href="${escapeHtml(e.link)}">${e.product === 'By the numbers' ? 'Read the briefing' : e.product === 'Not launched yet' ? 'See the Mind Map' : 'Take a look'}<span aria-hidden="true"> →</span></a>`
    : '';
  return `<li class="cl-item"><span class="cl-tag cl-tag--${productSlug(e.product)}">${escapeHtml(e.product)}</span><span class="cl-text">${escapeHtml(e.text)}${link}</span></li>`;
}

export function renderEntries(entries) {
  if (!entries || !entries.length) {
    return '<p class="cl-empty">Nothing here yet. The first post lands on the next Tuesday or Friday.</p>';
  }
  return groupByWeek(entries).map((w) => (
    `<section class="cl-week" aria-labelledby="wk-${w.week}">` +
    `<h2 id="wk-${w.week}">Week of ${longDate(w.week)}</h2>` +
    w.posts.map((p) => (
      `<article class="cl-post" id="${p.date}">` +
      `<h3><a href="#${p.date}">${dayHeading(p.date)}</a></h3>` +
      `<ul class="cl-list">${p.entries.map(renderEntry).join('')}</ul>` +
      `</article>`
    )).join('') +
    `</section>`
  )).join('');
}
