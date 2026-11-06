# Changelog repo list

The repos the Tuesday/Friday changelog task reads, and the product name a reader
knows each one by.  `read-commits.mjs` parses the table below, so keep it a table
with these four columns.  Source: ev-cto decision 0036, "What the task reads".

- **Product** is the name on the empowered.vote home page.  A repo whose product is
  not linked from the home page still gets read, but its work can only go in the one
  "Not launched yet" bullet.  The check reads the home page on every run, so when a
  product is linked there it moves into its own bullets with no edit here.
- **Platform-wide** means the repo serves several products.  Name the product a voter
  would notice when the change shows up in one; use "Platform-wide" only when it really
  shows up everywhere (sign-in, the shared header, accounts).
- The default branch is resolved from GitHub on every run.  The column below is a
  reminder, not the source: ev-accounts uses `master`, and so do several others.

Left out on purpose: ev-cto, ev-marketer, ev-analytics, ev-qa, ev-relay,
transparent-motivations, and the legacy repos (EV-Backend, Empowered-Compass,
empowered-api, EV-prototypes, empowered-vote-static, ev-context).

| Repo | Default branch | Product | Notes |
|---|---|---|---|
| EmpoweredVote/ev-accounts | master | Platform-wide | The shared backend. Most commits are Compass research, Essentials data or the election; map each one to the product a voter would see it in. Mostly direct pushes, so read commits, not pull requests. |
| EmpoweredVote/CompassV2 | main | Compass | |
| EmpoweredVote/essentials | main | Essentials | |
| EmpoweredVote/read-rank | main | Read & Rank | Linked from the home page; not in 0036's starting list, added because it is a listed product. |
| EmpoweredVote/treasury-tracker | main | Treasury Tracker | |
| EmpoweredVote/Civic-Trivia-Championships | master | Civic Trivia Championships | Has a contributor fork; read EmpoweredVote's copy only. |
| EmpoweredVote/civic-spaces | main | Civic Spaces | Not linked from the home page on 2026-11-06. |
| EmpoweredVote/focused-communities | master | Focused Communities | Not linked from the home page on 2026-11-06. |
| EmpoweredVote/fallacy-finders | main | Fallacy Finders | Not linked from the home page on 2026-11-06. |
| EmpoweredVote/empowered-validation-quests | master | Validation Quests | Private. Not linked from the home page on 2026-11-06. |
| EmpoweredVote/on-the-record | main | On the Record | Not linked from the home page on 2026-11-06. |
| EmpoweredVote/Empowered-Listening | master | Empowered Listening | Not linked from the home page on 2026-11-06. |
| EmpoweredVote/empowered-badges | main | Badges | Private. Not linked from the home page on 2026-11-06. |
| EmpoweredVote/ev-ui | main | Platform-wide | Shared components. Only changes a voter would see in a listed app count. |
| EmpoweredVote/ev-landing | main | Platform-wide | The home page itself. Skip briefing/ and changelog/ commits: the briefing is mined for numbers, and the changelog never writes about itself. |
