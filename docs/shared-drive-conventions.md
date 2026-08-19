# Shared Drive conventions

**Source:** `ev-landing/docs/shared-drive-conventions.md` — this repo file is canonical.
**Published copy:** `Org/Shared Drive conventions` in the Empowered Vote Shared Drive. Edit here, then re-paste there (Docs: right-click → Paste from Markdown).
**Status:** live · owner Chris Andrews · last revised 2026-08-19

The rules for this Shared Drive, and why each one is the way it is. Tracked on the Backlog board as "Shared Drive structure — folders, conventions, access" (item 12836319723).

This document states rules, not inventory. Counts of what is currently in a folder go stale within days — Drive itself is the inventory.

## The drive

The live Shared Drive is `0ANlcw2mUcqF2Uk9PVA`. Chris Andrews and Chris Cantrell are both **Manager** on it.

A second drive, `0AJp3b53hp-8DUk9PVA`, was created first and is now empty. Do not put anything in it.

## Structure

```
_Templates/
Brand/          Voice and Tone/ · Brand Book/ · Logos/
Inform/         one folder per product
Connect/        one folder per product
Empower/        one folder per product
Outreach/       Newsletter/
Org/
```

The root is the three pillars from [the purpose map](https://empowered.vote/maps/purpose-map.html), plus the things that are not products — `Brand`, `Outreach`, `Org` — and `_Templates`, which leads with an underscore so it sorts first.

We deliberately did **not** mirror the Monday board's groups. The board has 17 of them, and across its items five of the six active product areas resolve to Inform, so a mirror would have produced 17 top-level folders for a two-person team with 11 of them empty. Monday groups are work containers that should die when the work stops; Drive folders are artifact containers that have to outlive the work. Coupling them forces you either to delete folders still holding documents, or to keep dead groups alive for parity.

### Folder per product

**Every product gets its own folder, whether or not it has active work,** and its design doc and reference material live inside it.

An earlier version of this rule said folders exist only where there is real work, with everything else kept loose at the pillar root. That was abandoned on 2026-08-18: once Inform went folder-per-product it produced two different layouts in one drive, and a rule applied half the time predicts nothing.

### What is a product

A product is something the purpose map lists. A **feature** belongs inside its product's folder, not at the pillar root.

**On The Record is a feature of Empowered Essentials**, not a product — so it lives at `Inform/Empowered Essentials/On The Record/`. The purpose map omitting it is correct. The standalone Monday group is the outlier, and the map should not be "corrected" to add it.

## Naming

**Product names come from the purpose map**, which sits upstream of both the repo and the Monday board. Where they disagree, the map wins — it says `Common Ground`, the board says `Common Grounds`.

Three Connect products have no map node at all: Issues in Focus, Civil Civics (Equal Slices) and Validation Quests. Their folder names came from the old `.md` filenames, and Monday calls the last one `Empowered Quests`. If the map gains nodes for them, rename the folders to match.

Avoid `&` in file and folder names. It survives the Drive UI but gets mangled to `&amp;` through the API, so prefer "and".

**Filenames never carry version numbers.** A doc that evolves is edited in place, and `File → Version history → Name current version` records the milestones. One URL, forever, so a link pasted into Monday or Slack never rots.

**A doc is renamed only when it is dead.** Then it moves to an `Archive/` subfolder inside its product folder, with an `ARCHIVED YYYY-MM-DD — ` prefix stating why.

**Series get a zero-padded number and a subject, and no date.** `Newsletter 01 — Thank you and a brief update`. The number is immutable and sorts correctly past 09. The send date is mutable until it happens, so it lives in the doc's Status line instead — a slipped send never forces a rename.

## Feedback state

A doc collecting feedback **does not move and does not get renamed.** State lives in the first line of the doc:

```
Status: collecting feedback · round 2 · owner Chris A
```

Rounds happen in comments and suggesting mode. Closing a round means naming a version, not making a file.

The reason: a folder move or a `DRAFT —` prefix is state a human has to remember to change, and stale state is worse than none. A `LIVE` prefix nobody updated is actively misleading; an unchanged modified-date is merely uninformative.

## Access

- **Members: Chris Andrews and Chris Cantrell, both Manager.** Nobody else.
- **Shared Drive membership is all-or-nothing across the whole drive** — any member can see `Org/`. That constraint, not preference, is why the member list stays at two.
- **Volunteers are never members.** They get named grants on a specific folder: Commenter for Entry tier, Contributor for Practitioner and Senior, matching the Backlog board's Volunteer Tier column.
- **`Org/` is never shared** outside the member list.
- **Link sharing stays off.** Access is always a named person, so offboarding is one revoke and there is always an answer to "who can see this".

## Editing these docs

Use Google Docs' native Markdown. Enable it once under **Tools → Preferences → Enable Markdown**, then **right-click → Paste from Markdown**. It converts headings, tables and blockquotes correctly and keeps the file's URL and version history.

Do not create a new Doc to carry revised content — that breaks the one-URL rule and splits the comment thread.

Some documents are canonical in a repo rather than here. `Brand/Voice and Tone/Voice and Tone` is a published copy of `ev-landing/docs/voice-and-tone.md`; edit the repo file and re-paste. Any doc in that position says so in its own header.

## The copies, and what they are

The product design docs here are **copies**. The originals remain in Chris Cantrell's My Drive, untouched — not retitled, not re-shared. The copy in this drive is the live document; edit here, not there.

This is a deliberate, temporary state. The permanent home is a conversation Chris Andrews owes Chris Cantrell, still to happen. Until then, do not tidy up the originals.

Copied 2026-08-18. All originals owned by `chris@empowered.vote`.

| Copy in this drive | Original |
| --- | --- |
| Inform/Empowered Essentials/Empowered Essentials — design doc | `1sK8rKncjDaahVzgDXzZ6MZuXSRcLmT0RS2OiYDJM1Qg` |
| Inform/Empowered Compass/Empowered Compass — design doc | `19hDJCGcIR7v7CjhyJYPcoarPGZIMoPp3_gAmIFHwWFI` |
| Inform/Read & Rank/Read & Rank — design doc | `13Rb14ol6s1UHponrDMLql-lfixVQ822KKw23GBT79t8` |
| Inform/Treasury Tracker/Treasury Tracker — design doc | `1rMENZVz3MVRE2vgjJkw7uhWARS_E9GqnXegMwMMfeI4` |
| Inform/Empowered Badges/Empowered Badges — design doc | `1mD65bpFsoAfr2gIQF-uBe5WRVHqSSOnwA15cXireE0s` |
| Inform/Inform pillar — design doc | `19GOi-e_DqW9J7vsAFU19KicxIcHhw5zrh4T965fcnD8` |
| Inform/Empowered Compass/Empowered Compass — issues and stances | `1qwpLMBuaLPwSC3MnlrYhfzGBeFpcU9WsOcANznWGzTU` |
| Inform/Empowered Compass/Donald Trump — stances | `1kbiWB1GnHjgRAfCyMj_Bl5jXKCsHqU9dhbONtMo-9Y0` |

### Known consequence

Three of the originals are shared with **anyone who has the link** — two as commenter, one as reader. Files in this Shared Drive are members-only. So an external reviewer holding an old link still reaches the original rather than the live copy, and their comments land on the dead side. This includes Brennan at `bdhaase@gmail.com`, who owns the brand book. Anyone who should be commenting on a live version needs a named grant.

## Templates

`_Templates/` holds the shapes that repeat: product design doc, newsletter issue, compass topic and stance revision. Copy them out; never edit them in place.

The purpose map lists 23 products, so most product design docs are still to be written — which is the whole reason the template exists.
