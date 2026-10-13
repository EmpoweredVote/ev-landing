# Treasury Tracker — episode 3 design

**Date:** 2026-10-12
**Status:** design approved in chat; not yet planned or built
**Series design:** `docs/superpowers/specs/2026-10-10-bobit-video-series-design.md`
**Pipeline:** `tools/video/README.md`

## Summary

Episode 3 of the Bobit series explains Treasury Tracker. The script is written
and recorded: 37 lines, nine chapters, 5.53 minutes of speech. `script.md` and
`cuts.json` exist. `episode.mjs` and `art.js` do not, and this spec describes
them.

The episode's subject is a screen, which is new for the series. Episodes 1 and 2
explain an idea and show the product once at the close. Treasury's chapters 2 to
6 describe interface behaviour — press a slice, the breadcrumb builds, change the
year, toggle the view, open the method panel. The decision taken in design is
that all of it is **drawn**, with the real site appearing only at L036–L038, the
same shape the other two episodes have. A screen recording is not an option: OBS
captures frames mid-update, rows tear, and the tear survives into any stitched
still. That is recorded in the pipeline memo and was paid for on episode 2.

## What is settled

**The chart is drawn faithfully, not stylised.** The real component is
`BudgetIcicle` in `C:\treasury-tracker` — a column of horizontal bars, ancestor
rows compressed to 32px, the current row full height at 64px, segments sized by
money, a breadcrumb above. The drawn version keeps that layout, those
proportions and the product's own colours, so the live screen at the close is
recognisably the same object the episode spent five minutes teaching. This is
the rule episode 1 already follows: its compass uses the live legend's dark-theme
values precisely so the closing screenshot agrees with what came before it.

**Los Angeles carries the episode.** Confirmed live on 2026-10-12. It supports
every beat the script claims, with real data:

| Script beat | What Los Angeles actually has |
|---|---|
| chapter 5, four levels | breadcrumb `United States / California / Los Angeles County / Los Angeles` |
| chapter 4, change the year | FY2003–24 of budget data — see "The episode runs on FY2024" below |
| L014, three questions | Money In $21.6B, Money Out $21.5B, **Employees $7.4B** |
| L023, per person | $5,548 per person, already computed and displayed |
| L025, every view names its source | "CA State Controller - Expenditures · as of 2026-08-20", linked |
| L026, whose wording | chips reading "Government-reported" against "computed by Treasury Tracker" |

**The federal view is confirmed too**, checked in a real browser on 2026-10-12.
It is `?entity=united-states-us`, reached from the breadcrumb — whose items are
`<button>`s, not anchors, which is why a link query finds nothing. Chapter 5's
federal beats all render:

| Script beat | What the federal view actually has |
|---|---|
| L020–L021, for it or who spends it | a **"What it's for" / "Who spends it"** toggle |
| L023, per person | a **"$" / "Per person"** toggle — and a "Per taxpayer" mode the script does not mention |
| L027, the method written out | a panel headed **"How to read these numbers"** |

L027 names four things and the panel has all four, under these real headings:

| L027 says | The panel's heading |
|---|---|
| what is counted and what is not | **What we count** |
| why the picture can add up to more than the official total | **Why the spending visual totals more than the official number** |
| where a negative amount went | **Negative money isn't hidden** |
| how far into the year the data runs | **Partial year** |

It carries three more the script does not claim — "How deep the data goes",
"Can these numbers be audited?" and "Scale modes". **These seven headings are
what `drawSourceCard` prints for L027.** They are real, so they can be shown;
the body under them stays rule-lines, for the reason in Direction rules.

Federal Money Out, FY2024, top level: Social Security $1,460.9B, Interest on
the debt $1,133.0B, Health care programs $911.3B, Medicare $874.1B, National
defense $873.5B, Income support programs $670.5B.

The federal page also demonstrates L027's own example in its numbers: the cards
read Money Out $7,195.8B while the prose reads outlays $6,735.3B, and the panel
explains the gap. That is the chapter's point, visible without being staged.

Money Out's top level, FY2024, total $21.5B:

| Segment | Amount |
|---|---|
| Government & Public Safety | $5.6B |
| City Electric Utility | $4.5B |
| Roads & Community Development | $3.5B |
| City Airport | $2.2B |
| Health, Parks & Recreation | $1.7B |
| City Water Utility | $1.5B |
| Debt Payments & Major Projects | remainder |

These are real and must stay real. A segment invented to make the picture
balance is the same fault as an invented reasoning body — see "Direction rules"
below.

**The episode runs on FY2024, and it has to.** Checked live on 2026-10-12 at
all four levels of the breadcrumb. FY2025 exists at the top two levels and does
not exist at the bottom two:

| Level | Budget years | FY2025 |
|---|---|---|
| Los Angeles | FY2003–24 (All Funds · actuals; Total Governmental · actuals is FY2017–24) | **no** |
| Los Angeles County | FY2003–24 | **no** |
| California | FY2002–25 | yes — $221.6B in, $221.8B out |
| United States | FY1976–2025 | yes — $5,234.6B in, $7,532.2B out, flagged **Partial year** |

The year picker is not the test. The Los Angeles picker offers FY2003 to FY2026,
because the **Salaries** dataset reaches further than the budget does. Asking
for `?entity=los-angeles-ca&year=2025&dataset=operating` silently rewrites
itself to `dataset=salaries`: the page keeps its breadcrumb, drops Money In and
Money Out to no figure at all, and shows Employees $6.9B on its own. Los Angeles
County behaves the same way. So "the newest year the picker offers" and "the
newest year this episode can teach" are different years, and only the second one
is usable.

FY2024 is therefore the newest year every level has as a whole budget. The
episode opens on FY2024, chapter 4 `years-across` shows four Los Angeles budget
years ending at FY2024, and chapter 5 compares the four levels at FY2024.

Federal FY2025 stays interesting for one reason: the page carries the banner
"Partial year — totals and proportions aren't comparable to a full fiscal year",
which is one of the four cautions L027 names. It is evidence the chapter can
point at. It is not the year the episode runs on.

## What blocks the cut

**L012 must be re-recorded.** It was read as 20.53s with a 10.60s silence in the
middle, match 0.772. No cut repairs a hole inside a line; keeping it whole is
correct and the result is unusable. The line is "That is the whole trick. It is
not new data. It is the same data the government already published, arranged so a
person can follow it instead of exploring spreadsheets." Chris records the pickup.

**The take must then be re-split.** A dry run on 2026-10-12 showed a re-split
would move 24 of the 37 lines, some later and some *earlier* — L015 by −0.58s,
L019 by −0.47s, L030 by −0.67s at the start and −1.35s at the end. The existing
cuts predate the silence rule.

**These two happen BEFORE `episode.mjs` and `art.js` are written.** Episode 1 was
re-timed the other way round and it cost a session: 27 seconds written against
stale cuts, across two files, five of them missed on the first pass. Writing the
picture against final cuts costs nothing extra. Writing it first costs that
session again.

The splitter already reports three unpinned false-start suspects — L006
(2.489s), L007 (1.412s), L017 (2.137s). `cuts.json` records that these were
listened to and judged to be the reader pausing mid-sentence, with the words on
both sides joining up. That judgement stands; they are reported every run
because they are not pinned, which is correct.

## Scene structure

Ten chapters, 37 scenes, one scene per line. Scene id prefixes match chapter
keys, because `tests/video/12-episode.cjs` fails a prefix no chapter names and a
chapter no scene joins — a renamed key once left four finished scenes out of a
review page that still looked complete.

| Chapter key | Name | Lines | Scenes |
|---|---|---|---|
| `stub` | The money leaves | L001–L004 | `stub-line`, `stub-look`, `stub-doc`, `stub-tired` |
| `title` | Title card | L005 | `title` |
| `bar` | The budget as a picture | L006–L012 | `bar-collapse`, `bar-named`, `bar-open`, `bar-trail`, `bar-items`, `bar-payments`, `bar-trick` |
| `three` | More than one question | L013–L015 | `three-cards`, `three-named`, `three-half` |
| `years` | Across time | L016–L017 | `years-change`, `years-across` |
| `levels` | Across levels | L018–L021, L023 | `levels-city`, `levels-four`, `levels-fed`, `levels-two`, `levels-person` |
| `src` | Where the numbers come from | L024–L028 | `src-ask`, `src-line`, `src-wording`, `src-method`, `src-why` |
| `cover` | What we cover | L029–L031 | `cover-alpha`, `cover-map`, `cover-search` |
| `why` | What this is for | L032–L035 | `why-calm`, `why-angry`, `why-zoom`, `why-democracy` |
| `close` | Close | L036–L038 | `close-screen`, `close-follow`, `close-card` |

Note there is no L022; the script skips it and 37 is the correct count.

**Chapters 2 to 5 are nineteen consecutive scenes of one object.** The bar is
built in `bar`, split three ways in `three`, re-timed in `years` and stacked in
`levels`. Every one of those scenes after `bar-collapse` carries `continues:
true`. Nineteen scenes is nineteen chances for the picture to blink out and fade
back in at a cut, which is the exact fault `continues` was added to stop.

## The pictures

**One shared primitive.** `icicle()` knows what a budget bar looks like: rows,
compressed ancestors, a full-height current row, segments sized by money, the
breadcrumb above. Nothing else draws a bar. Three chapters use it and differ only
in what they do to it. This is the README's rule — where two structures must
agree, they are one structure — applied before they disagree rather than after.
Episode 2 learned it from two arrays read at the same index that were never in
the same order, so every label pointed at the wrong row.

| Function | Scenes | What it owns |
|---|---|---|
| `drawStub` | `stub-line`, `stub-look` | the pay stub, one line picked out |
| `drawDocument` | `stub-doc`, `stub-tired` | the budget document landing, dense and unreadable |
| `drawTitleCard` | `title`, `close-card` | the lockup, and the address at the end |
| `drawBudgetBar` | `bar-collapse`…`bar-trick`, `why-zoom` | depth, which segment opens, the breadcrumb |
| `drawLineItems` | `bar-items` | budgeted against spent, two money columns |
| `drawPayments` | `bar-payments` | a name, an amount, a date |
| `drawThreeCards` | `three-*` | Money In, Money Out, Employees |
| `drawYears` | `years-*` | the bar re-timed, and four years side by side |
| `drawLevels` | `levels-*` | city inside county inside state inside federal |
| `drawSourceCard` | `src-*` | the source line, the two wordings, the method panel |
| `drawCoverage` | `cover-*` | the map, partly filled |
| `drawLiveScreen` | `close-screen`, `close-follow` | the real site, panned |

`drawLiveScreen` takes the panning version from episodes 1 and 2 unchanged —
`panFrom` as a fraction of the travel, `panRate` as fractions per second, one
window that leaves a short shot with no travel. There is one way to pan a screen
in this series and this episode does not invent a second.

## The cast

One taxpayer, present from L001. A second figure arrives at L033 and stays to
the end.

The second figure needs a reason to exist, because a figure in a colour that
means nothing invites the viewer to ask who they are instead of looking at the
chart — episode 1 cut a second figure for exactly that. Here the script supplies
the reason: "Not to make you angry about a line item. Angry is easy." The second
Bobit *is* that reaction, `annoyed` and pointing at one small segment, and by
L035 both of them are calm, `present` and `ponder`.

They **walk on**. Appearing at full size between one frame and the next reads as
a glitch; somebody arriving reads as somebody arriving.

Through each chapter a figure holds one position and one scale, and only what it
is doing changes. Four scenes at four x positions read as the figure jumping
about, which was the first thing a reviewer noticed on episode 1 and the hardest
to stop seeing.

All eight poses the script's direction notes name — `read`, `ponder`,
`exhausted`, `present`, `annoyed`, `standstill`, `offer`, `cheer` — exist in
`ev-anim-extras.js`. None has to be written.

## Assets

Two captures, both of the live site, both taken with
`episodes/treasury/grab-screen.mjs --from` and embedded as JPEG, never PNG: the
file is committed and `render.yaml` serves the whole repo on every deploy.

1. **The Los Angeles budget page**, for `close-screen`.
2. **A taller capture for the pan**, for `close-follow`, the way episode 1's
   browse shot is tall on purpose.

**Both must be captured in dark theme.** The live site defaults to light; the
episodes are drawn on near-black. There is a theme toggle in the header. A light
capture dropped into a dark episode is the brightest thing in five minutes.

No login is needed — Treasury Tracker is public data, unlike episode 1's
calibrated compass. The capture can be taken headlessly.

## Direction rules carried from episodes 1 and 2

These are not restated for completeness; each one has already cost a review round.

- **Nothing is invented and presented as the product's.** L027's method panel is
  drawn as real headings over rule-lines, never as invented sentences. Episode 1
  drew its source card that way deliberately: a written-out body presented as the
  product's own words is a claim, and inventing one to show how careful the real
  ones are would undo the chapter.
- **Every optional second asks for its field by name** — `at(scene, 'openAt', t,
  dur)`, never `since(t, scene.openAt || 0, dur)`. A field nobody set reads as
  zero, zero means "already on screen", and that put four things on screen one to
  two scenes early in episode 2, each looking deliberate.
- **Anything animating from a field's value checks the field is positive first.**
  A zero inherited as "it was already there" is not a clock origin. In episode 2
  one search query typed itself in three times because three scenes inherited the
  field as zero.
- **Anything printed inside a box goes through `fitLabel()`.** It shrinks rather
  than clips or wraps. This fault appeared four times across two episodes before
  it became one shared function.
- **No scene lengths are written in `episode.mjs`.** `hold` adds a beat after a
  line; everything else is measured.

## Order of work

1. Chris re-records L012.
2. Re-split the take with the pickup. Read what `clipped()` reports.
3. Confirm every join is the 0.45s gap and nothing more, measured from the audio
   with `silencedetect`, not from the word times.
4. Read the real LA palette and hierarchy off the live chart. The navy and olive
   palettes in `treasuryConfig.json` are Bloomington's config and may not be
   what Los Angeles renders.
5. Write `episode.mjs` and `art.js` against the final cuts, reading every
   in-scene second off `vo/<take>.words.json`.
6. Check frames with the scratch frame-grab script, not by building. Load the art
   files in the build's order — assets sorted first, `art.js` last.
7. Build, look at the contact sheet, run the video tests.

## Verification

- `tests/video/12-episode.cjs` — scene/line pairing, chapter keys, every named
  draw function registered and every registered one used. Under a second, and
  the cheapest way to learn a line was dropped.
- The full video suite before any commit.
- The contact sheet, looked at. Green tests prove nothing is *visible*.
- Chris reviews `treasury-scratch.mp4`, `treasury-contact.png` and
  `treasury-timing.md`, given as `file:///` links.

## Risks

| Risk | Handling |
|---|---|
| The episode runs long — 5.53 min of speech lands near 6:20 even after L012 is re-recorded, against 5:06 and 5:26 for episodes 1 and 2 | Accepted for now. Chris reviewed the number on 2026-10-12 and chose to judge the length from the stitched cut. Shortening the episode means re-recording, so the decision waits for the first scratch build. |
| Nineteen scenes of one object gets visually monotonous | The object changes meaningfully in each chapter — it drills, splits, re-times, stacks. If it still reads flat on the contact sheet, that is a review finding, not a build failure. |
| A faithful icicle is dense at 1920x1080 | The real component compresses ancestors and gives the current row the height, which carries most of it. Los Angeles's top level is seven named segments with no "Other", so seven is known to fit. If a deeper level needs more than that to be honest, the smallest are gathered into one labelled "Other" and the label says so — a drawn segment must never silently stand for several. |
| LA's real palette differs from the config | Read it off the live chart before writing it down. Step 4. |

## Open questions

1. **Episode length.** Near 6:20, against 5:06 and 5:26. Chris reviewed this on
   2026-10-12 and chose to judge it from the stitched cut rather than trim the
   script in advance. Open only until that cut exists.

**Closed during review.** Two questions that were open when this spec was first
written now have answers.

*Which year leads.* FY2024, settled above. The question assumed the episode
could lead on the latest year available. The latest year is not the same year at
every level, and the two Los Angeles levels have no FY2025 budget at all.

*Whether the federal beats render at all.* They were checked in a real browser
on 2026-10-12 and all four are there; what they are is recorded under
"What is settled" above. That check also confirmed L031 incidentally: an entity
the site does not have returns "We couldn't find a government matching...",
rather than quietly showing somebody else's budget.
