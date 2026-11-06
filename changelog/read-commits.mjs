#!/usr/bin/env node
// Lists the commits that reached each repo's default branch in a time window, with
// the noise from decision 0036 already removed, grouped by product.
//
//   node changelog/read-commits.mjs                         since last-run.json "through", until now
//   node changelog/read-commits.mjs 2026-11-03T14:00:00Z 2026-11-06T14:00:00Z
//
// Reads through the GitHub API with `gh`, not local clones, so it runs anywhere.
// Every --since carries a time of day (a bare date starts the window at the current
// clock time; briefing/README.md paid for that).  The default branch is resolved per
// repo, never assumed.  A repo that cannot be read is reported, not silently counted
// as a quiet week.
//
// Prints JSON: { since, until, listed: [...], products: { <name>: { listed, repos,
// commits: [{repo, sha, date, subject, body}] } }, skipped_noise, unreadable }.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { listedProducts, SPECIAL_PRODUCTS } from './rules.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export function parseRepos(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    const m = /^\|\s*([\w.-]+\/[\w.-]+)\s*\|\s*([^|]*?)\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (m) rows.push({ repo: m[1], branch: m[2], product: m[3] });
  }
  return rows;
}

// Commits a voter would never notice.  Matching is on the subject line.
const NOISE = [
  [/^(chore|ci|test|tests|docs|build|style)(\(.*?\))?!?:/i, 'chore/ci/test/docs/build/style'],
  [/^Merge (pull request|branch|remote-tracking)/i, 'merge commit'],
  [/^merge:/i, 'merge commit'],
  [/^(bump|update) .* from .* to /i, 'dependency bump'],
  [/^(deps|chore\(deps\))/i, 'dependency bump'],
  [/\b(dependabot|renovate)\b/i, 'bot'],
  [/^wip\b/i, 'work in progress'],
];

export function noiseReason(commit) {
  const subject = commit.subject || '';
  if (/\[bot\]$/i.test(commit.author || '')) return 'bot';
  for (const [re, why] of NOISE) if (re.test(subject)) return why;
  return null;
}

// Drop a commit and its revert when both land in the same window.
export function dropRevertPairs(commits) {
  const reverted = new Set();
  for (const c of commits) {
    const m = /^Revert "(.+)"$/.exec(c.subject);
    if (m) reverted.add(m[1]);
  }
  return commits.filter((c) => {
    const m = /^Revert "(.+)"$/.exec(c.subject);
    if (m && commits.some((o) => o.subject === m[1])) return false;
    return !reverted.has(c.subject);
  });
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

function readRepo(repo, since, until) {
  const branch = gh(['api', `repos/${repo}`, '--jq', '.default_branch']).trim();
  const raw = gh(['api', '--paginate', `repos/${repo}/commits?sha=${encodeURIComponent(branch)}&since=${since}&until=${until}&per_page=100`,
    '--jq', '.[] | {sha: .sha[0:7], date: .commit.committer.date, author: (.author.login // .commit.author.name), message: .commit.message} | @json']);
  const commits = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((c) => {
    const [subject, ...rest] = c.message.split('\n');
    return { repo, branch, sha: c.sha, date: c.date, author: c.author, subject: subject.trim(), body: rest.join('\n').trim().slice(0, 600) };
  });
  return { branch, commits };
}

function main() {
  let [since, until] = process.argv.slice(2);
  if (!since) since = JSON.parse(readFileSync(join(here, 'last-run.json'), 'utf8')).through;
  if (!until) until = new Date().toISOString();
  for (const t of [since, until]) {
    if (!/T\d{2}:\d{2}/.test(t)) throw new Error(`"${t}" has no time of day; pass a full timestamp`);
  }
  const listed = listedProducts(readFileSync(join(here, '..', 'index.html'), 'utf8')).map((p) => p.name);
  const repos = parseRepos(readFileSync(join(here, 'REPOS.md'), 'utf8'));
  const products = {};
  const unreadable = [];
  const skipped = {};
  for (const r of repos) {
    let got;
    try { got = readRepo(r.repo, since, until); } catch (e) {
      unreadable.push({ repo: r.repo, error: String(e.stderr || e.message).trim().split('\n')[0] });
      continue;
    }
    let commits = got.commits.filter((c) => {
      const why = noiseReason(c);
      if (why) skipped[why] = (skipped[why] || 0) + 1;
      return !why;
    });
    commits = dropRevertPairs(commits);
    const p = products[r.product] || (products[r.product] = {
      listed: listed.includes(r.product) || r.product === SPECIAL_PRODUCTS.PLATFORM, repos: [], commits: [],
    });
    p.repos.push(`${r.repo}@${got.branch}`);
    p.commits.push(...commits);
  }
  console.log(JSON.stringify({ since, until, listed, products, skipped_noise: skipped, unreadable }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
