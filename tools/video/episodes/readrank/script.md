# Read & Rank — episode script

Inform pillar. Accent `#FFD426`, the same yellow as Empowered Compass.

Every claim below was checked against a component that renders in the shipped
app, not against a function that exists in the source. Two things were cut on
exactly that test.

`buildEssentialsProfileUrl` builds a link that would carry your verdicts onto
a politician's Essentials page and open the issue you ranked. It is written,
it is tested, and nothing calls it. What IS mounted is plainer and is what the
script says instead: every name on the revealed ballot carries a link to that
person's Essentials profile.

The `docs/` directory holds a newer UX redesign prototype, added for review.
It is a prototype. The app this episode describes is the one deployed at
readrank.empowered.vote.

No party letters appear anywhere in this episode. That is a rule for the
series, and here it is also the product's entire argument.

## Chapter 1 is an analogy, and it carries no brand

The cold open borrows the blind tasting: the labels come off, the choice is
made on what is in the cup, and the names go back on last. The two cups carry
no product and no brand. The tags under them read "the one you always buy" and
"the other one", because the chapter is about the ORDER the reading happens
in, not about a drink. The chapter then puts a ballot beside it and shows that
a ballot is read the other way round, name first.

Strictly, the app is blind on the reader's side only: the system knows who
said what the whole time, and says so at the reveal. The script does not say
"double blind" for that reason.

## What the film shows, and why it is that

The mechanic — reading blind, agreeing, ranking, revealing — is drawn on the
2024 Indiana Governor race that ships in `src/data/mockData.ts`. Three real
candidates, their real answers on cannabis, their real named sources, and one
answer with the full verbatim quote and the editor's note that says what was
trimmed out of it. A drawn card has to carry words, and these are words three
people actually said. The election is over, so the film promotes nobody.

An earlier draft used the app's pizza practice round instead. That round is
coming out of the product, so the film cannot be built on it.

Three things follow from the material, and each one cost a line.

**The demo ships four identities and only three people ran.** Rainwater,
McCormick and Braun were on the 2024 ballot for Governor of Indiana. The
fourth, listed in the fixture as a candidate for the same office, was not. The
film uses the three. The fixture is wrong and should be fixed in read-rank.

**A three-candidate race cannot show every ranking rule at once.** The viewer
leaves one answer behind, so the pile is two, so there is no unranked
remainder to sit under the cut-off line. The tie is drawn; "also agree, not
ranked" is not. It stays a real feature that this film does not show.

**No row of the grid is empty.** An earlier line said the ballot still carries
the people you disagreed with the whole way down. Drawn with a real name, a
row of nothing but crosses is a frame that can be lifted out of the film and
read as our verdict on a real person. The line now makes the same point about
the person you agreed with once, and the grid carries a caption saying whose
verdicts these are.

Chapter 1 — the labels come off

## L001
> Direction: `art` — a table, two plain cups on it, nothing written on either one. A Bobit `ponder`.
A blind taste test works for one reason. The labels come off. Two cups, nothing written on either one, and the only thing left to judge is what is in them.

## L002
> Direction: `art` — one cup is chosen, and only then do the names go under both.
You try both, you choose, and you are told what you picked after you have picked it. People surprise themselves. That is the whole reason the labels go back on last.

## L003
> Direction: `art` — a card with a name at the top and a paragraph under it. The name is read first, and the paragraph second.
A ballot is read the other way round. The name is at the top, so you know what you are about to think before you reach the first line of what they wrote.

## L004
> Direction: `art` — the name lifts off the card and the paragraph brightens.
That is not a character flaw. A label is an extremely efficient way to not read something. So take the labels off. What would you make of these people then?

## L005
> Direction: title card on Inform yellow.
This is Read and Rank.

Chapter 2 — the question turned around

## L006
> Direction: `art` — a row of candidates, and an arrow running from them to one person.
Most voting tools start at the candidates. They line them up, ask you some questions, and hand you back a name with a percentage beside it.

## L007
> Direction: `art` — the arrow turns and runs the other way.
This one starts at you. It gives you a window to read what somebody would actually do, before you know whose team they are on.

## L008
> Direction: `art` — one card, with nothing on it but words.
No name. No team. Only the solution, and your own opinion of it.

## L009
> Direction: a Bobit `present` beside the turned arrow.
So the question at the end is not which candidate you fit. It is how these candidates fit you. Those are different questions, and they do not always have the same answer.

Chapter 3 — pick a race

## L010
> Direction: `art` — a list of races: a mayor, a council seat, a governor.
You start by picking a real race. A mayor, a council seat, a governor.

## L011
> Direction: `art` — an address field above the list; the list shortens to one place.
You can type your address and see the races you can actually vote in, or you can ignore that and read any of them.

## L012
> Direction: `art` — the race opens into a short row of question cards.
A race arrives as a set of questions. And the question, not the candidate, is the thing you work on.

Chapter 4 — reading blind

## L013
> Direction: `art` — one question card, with three answers under it and no names on them.
Every card is one question. Under it are the answers, one for each candidate, and there is nothing on them.

## L014
> Direction: `art` — the empty space where a name, a photograph and a party would be.
No name. No photograph. No party. Nothing but what the person said.

## L015
> Direction: `art` — the incoming data is rebuilt, and everything except the words falls away.
And that is held structurally, not as a courtesy. The page takes what the server sends and rebuilds it with the words and nothing else, so a name cannot reach your screen by accident, even if something upstream sends one.

## L016
> Direction: `art` — a question with only one answer is lifted out and dropped.
If only one candidate answered a question, the question does not appear. One voice is not a comparison.

## L017
> Direction: a Bobit reading the card. `ponder`.
So you read them, and you agree, or you do not. Anything you do not agree with you simply leave behind.

Chapter 5 — ranking your pile

## L018
> Direction: `art` — the answers you agreed with gather into a short pile.
What you agree with goes into a pile.

## L019
> Direction: `art` — the pile is dragged into an order, first, then second.
Then you put the pile in order. The one you most want first, then the next.

## L020
> Direction: `art` — two entries settle level on the same rank.
And you can tie them, if you really do want both of them the same amount.

## L021
> Direction: a Bobit `present` beside the ordered pile.
Which should feel oddly familiar. You have just done ranked choice voting, on the words alone, without anybody's name attached to a single one of them.

Chapter 6 — the reveal

## L022
> Direction: `art` — the names and faces arrive on the answers you ranked.
When you are finished, the names come back.

## L023
> Direction: `art` — a ballot assembles itself, ordered by how often you agreed.
Every answer you kept gets its face, and a ballot builds itself out of them, with the person whose words you picked most often at the top.

## L024
> Direction: `art` — a grid: candidates down the side, questions across the top.
Under it there is a grid. Everyone who is running down the side, every question across the top, and in each square what you did with that person's answer.

## L025
> Direction: `art` — the row of the person agreed with only once, still present at the bottom.
Including the person you agreed with only once. Everybody who is running is on your ballot, and the page does not quietly drop the ones you did not pick.

## L026
> Direction: a Bobit looking at the ballot. `confused`.
And you can be surprised here. That is the entire reason the names were off.

Chapter 7 — where the words come from

## L027
> Direction: a Bobit `ponder` beside one revealed answer.
Which raises the next fair question. Who wrote these answers?

## L028
> Direction: `art` — four named kinds of source.
They come from the record. Official candidate statements. Debate transcripts, word for word. Clipped debate video. Verified news reporting.

## L029
> Direction: `art` — a short excerpt sits highlighted inside the full original quote.
What you read while you were blind is an excerpt, kept short so the answers can be compared. After the reveal you can open the whole original and see exactly where that excerpt sat inside it, with the date and the source beside it.

## L030
> Direction: `art` — the source line, with its link.
We show the cut because a quote you cannot check is only us telling you what somebody meant.

Chapter 8 — what exists today

## L031
> Direction: a Bobit `standstill`, plain and level.
Now the honest part, and for this one it decides whether the app is worth your evening.

## L032
> Direction: `art` — a map with a few places lit.
Read and Rank is still in development. The reading works wherever you are. The material does not exist wherever you are.

## L033
> Direction: `art` — a long race beside a short one.
A race opens where the candidates in it have actually answered, and it opens question by question. A question nobody can be compared on is taken out before you see it, so a thin race is simply a short one.

Chapter 9 — afterwards

## L034
> Direction: `art` — one issue from the ranking, carried across to a compass.
At the end there is one more offer. The issue you ranked highest is the one this now knows matters to you, and it will point you at your Compass so that your next race starts from what you care about.

## L035
> Direction: `art` — a revealed name, with the link out to their profile.
And every name on that ballot carries a link to their full profile in Essentials. Their record, their funding, their votes. You read them blind first, and you can read everything else afterwards.

Chapter 10 — close

## L036
> Direction: cut to a few seconds of the real readrank.empowered.vote screen.
It is at read rank dot empowered dot vote.

## L037
> Direction: the real screen holds, and keeps moving.
Read a handful of answers with the names off. Decide what you think. Then look at whose they were.

## L038
> Direction: two Bobits, `cheer`. Text of 'readrank.empowered.vote'.
That is Read and Rank. Go and find out who you actually agree with.
