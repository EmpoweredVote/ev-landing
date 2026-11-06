// The rules every changelog entry must pass before it is published.
//
// Pure functions only: no file or network access, so the page, the CLI
// (check-entries.mjs) and the tests all share exactly one copy of the rules.
// The authority for every rule here is ev-cto decision 0036, "Guardrails" and
// "What only gets an entry if a voter can reach it".

// Products that are not apps on the home page but may still get a bullet.
export const SPECIAL_PRODUCTS = {
  PLATFORM: 'Platform-wide',
  NUMBERS: 'By the numbers',
  NOT_LAUNCHED: 'Not launched yet',
  SECURITY: 'Security and privacy',
};

export const MAX_PER_PRODUCT = 2;   // bullets per product per post
export const MAX_PER_POST = 6;      // regular bullets per post (numbers, not-launched and security are extra)
export const MAX_SENTENCES = 2;
export const MAX_WORDS = 50;

export const MIND_MAP_PATH = '/maps/purpose-map.html';

// Each group is a list of [label, regex].  Every regex is matched case-insensitively
// against the entry text.  A hit drops the entry.
//
// FUNDERS: this repo is public, so the check does NOT carry a list of funder or
// prospect names — writing them here would publish the very thing it guards.
// It blocks the words a funder credit cannot be written without instead, plus any
// names in blocked-names.txt.  The one exception (founder decision, 2026-11-06): an
// organisation whose grant we have already announced, listed in announced-funders.txt,
// may be named and thanked.  Never an individual donor.
//
// SECURITY (founder decision, 2026-11-06): security work gets an entry, because
// voters care about it, but only under the "Security and privacy" product and only in
// general words.  The word "security" is allowed there and nowhere else.  The words
// that describe a specific hole (vulnerability, exploit, token, password…) are
// banned everywhere, that product included.
export const BANNED = {
  party: [
    ['party name', /\bdemocrat\w*|\brepublican\w*|\bGOP\b|\blibertarian\w*|\bgreen party\b|\bworking families\b|\bconstitution party\b|\bDNC\b|\bRNC\b|\bMAGA\b/i],
    ['left/right label', /\b(left|right)[- ]wing\b/i],
  ],
  colour: [
    ['red or blue', /\b(red|blue|reds|blues|purple state|purple states)\b/i],
  ],
  funder: [
    ['grant', /\bgrant(s|ee|ees|or|ors|maker|makers)?\b/i],
    ['funder', /\bfunders?\b|\bfunded by\b|\bsponsor(s|ed|ship)?\b|\bphilanthrop\w*/i],
    ['foundation', /\bfoundations?\b/i],
  ],
  security: [
    ['security word outside "Security and privacy"', /\bsecur(e|ity|ed|ing)\b/i],
  ],
  securityDetail: [
    ['security detail', /\bvulnerab\w*|\bexploit\w*|\bRLS\b|\bsecrets?\b|\bpasswords?\b|\btokens?\b|\bkeys?\b|\bCVE\b|\bbreach\w*|\bleak\w*|\bXSS\b|\bCSRF\b|\binjection\b|\battack\w*|\bhack\w*|\bholes?\b|\bexposed\b|\bunauthori[sz]ed\b/i],
  ],
  invented: [
    ['invented-data word', /\bmade[- ]up\b|\binvent(ed|ing)\b|\bfake[ds]?\b|\bfabricat\w*|\bhallucinat\w*/i],
  ],
  unpublished: [
    ['draft content', /\bdrafts?\b/i],
  ],
  jargon: [
    ['internal term', /\breasoning texts?\b|\brungs?\b|\bstages?\b|\bsource store\b|\bgates?\b|\bseed(ing|ed)\b|\bbackfill\w*|\brefactor\w*|\bmigrations?\b|\bendpoints?\b|\bschemas?\b|\brepos?\b|\brepositor(y|ies)\b|\bcommits?\b|\bPRs?\b|\bpull requests?\b|\bpipelines?\b|\bcron\b|\bdeploy(s|ed|ing|ment)?\b/i],
  ],
};

const EMOJI = /\p{Extended_Pictographic}/u;

// Product names a voter can reach: every app the home page links from its tool list.
// Reads the `data-name` of each `a.logo-trigger` in index.html.  Run on every check,
// so the list updates itself the day a product is linked or unlinked.
export function listedProducts(indexHtml) {
  const out = [];
  const re = /<a\b[^>]*class="[^"]*\blogo-trigger\b[^"]*"[^>]*>/g;
  for (const tag of indexHtml.match(re) || []) {
    const name = /data-name="([^"]+)"/.exec(tag);
    const href = /href="([^"]+)"/.exec(tag);
    if (!name) continue;
    out.push({ name: decodeEntities(name[1]), href: href ? href[1] : null });
  }
  return out;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function countSentences(text) {
  // Ignore single-letter abbreviations ("U.S.") and decimals; count terminal punctuation.
  const t = text.replace(/\b[A-Z]\.(?=[A-Z]\.|\s)/g, 'X').replace(/\d\.\d/g, '0');
  const ends = t.match(/[.!?]+(?=\s|$)/g) || [];
  return Math.max(1, ends.length);
}

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function allowedHosts(listed) {
  const hosts = new Set(['empowered.vote', 'www.empowered.vote']);
  for (const p of listed) {
    if (!p.href) continue;
    try { hosts.add(new URL(p.href).host); } catch { /* relative link: same site */ }
  }
  return hosts;
}

function linkProblem(entry, hosts) {
  const { link, product } = entry;
  if (link === undefined || link === null) return null;
  if (typeof link !== 'string' || !link) return 'link is not a string';
  let url;
  try { url = new URL(link, 'https://empowered.vote'); } catch { return `link "${link}" is not a URL`; }
  if (url.protocol !== 'https:') return `link "${link}" is not https`;
  if (!hosts.has(url.host)) return `link "${link}" goes to ${url.host}, which the home page does not link`;
  const onSite = url.host === 'empowered.vote' || url.host === 'www.empowered.vote';
  if (product === SPECIAL_PRODUCTS.NOT_LAUNCHED && !(onSite && url.pathname === MIND_MAP_PATH)) {
    return `"${SPECIAL_PRODUCTS.NOT_LAUNCHED}" may only link the whole Mind Map (${MIND_MAP_PATH})`;
  }
  if (product === SPECIAL_PRODUCTS.SECURITY && !(onSite && url.pathname === '/privacy')) {
    return `"${SPECIAL_PRODUCTS.SECURITY}" may only link the privacy policy (/privacy)`;
  }
  if (product === SPECIAL_PRODUCTS.NUMBERS && !(onSite && url.pathname.startsWith('/briefing'))) {
    return `"${SPECIAL_PRODUCTS.NUMBERS}" must link the briefing edition its figures came from`;
  }
  return null;
}

// Problems with one entry on its own (shape, product, words, length, link).
// Returns an array of reasons; empty means the entry passes.
export function entryProblems(entry, { listed, extraNames = [], announcedFunders = [] }) {
  const reasons = [];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return ['entry is not an object'];
  if (!isValidDate(entry.date)) reasons.push(`date "${entry.date}" is not a real YYYY-MM-DD date`);
  if (typeof entry.text !== 'string' || !entry.text.trim()) reasons.push('text is missing');
  if (entry.highlight !== undefined && typeof entry.highlight !== 'boolean') reasons.push('highlight must be true or false');
  const known = new Set(['date', 'product', 'text', 'link', 'highlight']);
  for (const k of Object.keys(entry)) if (!known.has(k)) reasons.push(`unknown field "${k}"`);

  const names = listed.map((p) => p.name);
  const allowed = new Set([...names, ...Object.values(SPECIAL_PRODUCTS)]);
  if (typeof entry.product !== 'string' || !allowed.has(entry.product)) {
    reasons.push(`product "${entry.product}" is not linked from the home page (listed: ${names.join(', ')})`);
  }
  if (typeof entry.text !== 'string') return reasons;

  const text = entry.text;
  const lower = text.toLowerCase();
  const thanksAnnounced = announcedFunders.some((n) => n && lower.includes(n.toLowerCase()));
  for (const [group, pats] of Object.entries(BANNED)) {
    if (group === 'security' && entry.product === SPECIAL_PRODUCTS.SECURITY) continue;
    if (group === 'funder' && thanksAnnounced) continue;
    for (const [label, re] of pats) {
      const m = re.exec(text);
      if (m) reasons.push(`${group}: ${label} "${m[0]}"`);
    }
  }
  for (const n of extraNames) {
    if (n && text.toLowerCase().includes(n.toLowerCase())) reasons.push(`funder: blocked name "${n}"`);
  }
  if (EMOJI.test(text)) reasons.push('emoji');
  const s = countSentences(text);
  if (s > MAX_SENTENCES) reasons.push(`${s} sentences (max ${MAX_SENTENCES})`);
  const w = countWords(text);
  if (w > MAX_WORDS) reasons.push(`${w} words (max ${MAX_WORDS})`);
  // A product-specific bullet must not name an unlisted product either; the
  // not-launched bullet is the only place those names may appear.
  const lp = linkProblem(entry, allowedHosts(listed));
  if (lp) reasons.push(lp);
  return reasons;
}

// Check a whole entries array.  Returns { kept, dropped: [{entry, index, reasons}] }.
// Per-post caps apply after the per-entry rules, in file order: the first bullets
// written for a product survive, later ones are dropped.
export function checkEntries(entries, ctx) {
  const kept = [];
  const dropped = [];
  const perPost = new Map(); // date -> { regular, numbers, notLaunched, security, byProduct: Map }
  entries.forEach((entry, index) => {
    const reasons = entryProblems(entry, ctx);
    if (!reasons.length) {
      const p = perPost.get(entry.date) || { regular: 0, numbers: 0, notLaunched: 0, security: 0, byProduct: new Map() };
      perPost.set(entry.date, p);
      if (entry.product === SPECIAL_PRODUCTS.NUMBERS) {
        if (p.numbers >= 1) reasons.push('a post has at most one numbers bullet');
        else p.numbers++;
      } else if (entry.product === SPECIAL_PRODUCTS.SECURITY) {
        if (p.security >= 1) reasons.push('a post has at most one security bullet');
        else p.security++;
      } else if (entry.product === SPECIAL_PRODUCTS.NOT_LAUNCHED) {
        if (p.notLaunched >= 1) reasons.push('a post has at most one "Not launched yet" bullet');
        else p.notLaunched++;
      } else {
        const n = p.byProduct.get(entry.product) || 0;
        if (n >= MAX_PER_PRODUCT) reasons.push(`more than ${MAX_PER_PRODUCT} bullets for ${entry.product} in one post`);
        else if (p.regular >= MAX_PER_POST) reasons.push(`more than ${MAX_PER_POST} bullets in one post`);
        else { p.byProduct.set(entry.product, n + 1); p.regular++; }
      }
    }
    if (reasons.length) dropped.push({ entry, index, reasons });
    else kept.push(entry);
  });
  return { kept, dropped };
}

// Newest first.  Entries on the same date keep their written order.
export function isSortedNewestFirst(entries) {
  for (let i = 1; i < entries.length; i++) if (entries[i - 1].date < entries[i].date) return false;
  return true;
}
