# Civic Trivia Championships — episode script

Inform pillar. Accent `#FFD426`, the same yellow as Empowered Compass.

Every claim below was checked against the engine that actually serves a game,
which is `EV-Accounts/backend/src/trivia/`, NOT the trivia repository. That
repository still carries a `backend/` of its own and its own comments still
describe a ten-question game. The live game is five questions. Anything
written from the trivia repository alone is a claim about code that nobody
runs. The one part of that repository still doing work is its cron scheduler
— see the chapter 6 note below.

One line was cut for the reason the Essentials and Treasury scripts cut
theirs. An earlier draft said you could see how far through a collection you
had got. The dashboard has the component and the card renders — with
`progress={null}`, above a comment saying no source exists for it. A progress
bar that is always empty is not a feature a viewer has.

Figures that would date the film are deliberately absent. The size of the
bank, the number of collections and the XP a game pays all move. "Dozens of
collections" stays true for longer than "forty-three" does.

## Chapter 6, and what it is allowed to claim

Every claim in the chapter about why this exists is a running cron job.
Questions expire by `expires_at` and `cron/expirationSweep.ts` retires them
hourly; it calls `cron/replacementGenerator.ts` for the replacement, in that
order, archive first. Races within sixty days of an election are found daily
by `cron/electionDetection.ts`. `cron/pipelineCron.ts` runs nightly and writes
into the news collections — world news, US news, climate, and the war in Iran.

All three schedulers are started from `cron/startCron.ts`. The engine
registers them in `trivia/app.ts` behind `TRIVIA_CRONS_ENABLED`, which is off,
because the standalone civic-trivia-backend still owns them during the
parallel run and starts all three with no gate. They run. The film is right
about the behaviour, and it names no service.

The chapter says "the news collections", not "the collections". A city or
state collection is not written from a news feed, and the wider claim would
not be true.

Empowered Badges is NOT named anywhere in this film. It is a strong reason the
game exists and it is not built; our own briefing files it under designed but
not built.

## The flag line, and the gem grant behind it

L010 says "we give special rewards for people who spot those". That line is
Chris’s and it stays in. He decided on 2026-10-15, after being told what the
code holds today.

What is built: the gem ledger is live — `lib/gemService.ts` credits, debits
and awards, and balances sit on connected profiles. Gems are paid today by
trivia progression and by Voter Quest submissions. The flag queue is live as
well — `trivia/routes/admin.ts` lists flags, opens one, dismisses, archives
and restores.

What is in flight: the join between the two. An admin will be able to grant
gems in thanks to the Connected or Empowered account that reported the error.
Chris is building that now. When it lands there will be a grant path from the
flag queue to `awardGems`, which is the thing to look for.

This is the one place in the series where the film names something that was
not finished on the day it was written. Check the grant path exists before
the episode is published. If it is not there by then, the sentence comes out;
the two sentences around it stand on their own without it.

## What the trims took out

The wager chapter, the difficulty ladder, the instant lock, the reply to the
wrong answer you picked, and the closing line of chapter 6 were cut on
2026-10-14. All five describe real behaviour. The film is shorter and nothing
in it is untrue; what it no longer says is written down here so that the next
person does not read the silence as a limit of the product.

Chapter 1 — the test you were made to fear

## L001
> Direction: a Bobit at a school desk, a paper on it. `read`.
Most of us met civics once, in a room like this one. Three branches of government. How a bill becomes a law. Checks and balances.

## L002
> Direction: the paper is marked and slides away. `bored`.
You learned it for a test, you passed the test, and then you never used any of it again. Not because you didn't care. Because nothing in your week ever asked you.

## L003
> Direction: the desk is gone. The Bobit holds a ballot at a kitchen table. `confused`.
Then one day something does ask. A ballot, or a meeting, or an argument you did not want to be in. And the answer is in there somewhere, under years of dust.

## L004
> Direction: `art` — the marked paper turns over and becomes a bright game card.
So here is a different offer. Not a test. A game show.

## L005
> Direction: title card on Inform yellow.
This is the Civic Trivia Championships.

Chapter 2 — how a game runs

## L006
> Direction: `art` — one question card, four answers under it, a clock in the corner.
Matches are quick. A game is five questions. Each one gives you four answers and twenty-five seconds.

## L007
> Direction: `art` — the clock runs down and the points fall with it, in two steps.
A right answer is a hundred points. Answer inside the first ten seconds and it is fifty more. Inside twenty, twenty-five more. Knowing it is worth more than working it out.

Chapter 3 — being wrong is the lesson

## L008
> Direction: `art` — the answer card opens into an explanation panel.
Every question ends the same way, whether you got it or not. The right answer, and an explanation why it is the right answer.

## L009
> Direction: `art` — a named source and a link appear under the explanation.
Under that is where it came from. A named source, with a link you can open, so you never have to take our word for it.

## L010
> Direction: a Bobit beside the card, `offer`. A small flag on the question.
And if you think a question is wrong, then flag it for us; we give special rewards for people who spot those. Press the flag, and it goes into a queue that a person works through.

Chapter 4 — the collections

## L011
> Direction: `art` — a shelf of collection cards, each one a different colour.
The questions are not one pile. They come in collections, usually by location or topic.

## L012
> Direction: `art` — the shelf sorts into three bands: federal, state, city.
There are federal ones, state ones and city ones. The federal collection is where everybody starts, because it applies to each of us.

## L013
> Direction: `art` — one city card opens, and its questions are about that city.
A city collection asks about that city. Its council, its budget, its measures, its own particular history. No civics textbook was ever going to carry those, and that's the corner of the government standing closest to you.

Chapter 5 — the crowd

## L014
> Direction: `art` — an empty field under a collection card. One small figure walks in.
When you get a question right, these little folks start showing up to cheer you on.

## L015
> Direction: `art` — more figures arrive, one for each right answer, and stay.
One Bobit, for a correct answer. They stay. Come back for another round and they are still standing there, and the next right answer brings another one.

## L016
> Direction: `art` — the crowd is big enough that some of them start building.
Once there are enough of them, they stop milling about and start building something.

## L017
> Direction: `art` — the next question dealt is one the field has no figure for.
The game helps you fill it. It puts the questions you have never got right to the front, instead of handing you back the five you already know.

## L018
> Direction: `art` — one figure walks off the field.
And if you get one wrong that you had right before, then that one leaves. Your crowd is what you know today, not what you knew once.

## L019
> Direction: a Bobit `present` beside the field.
You can play Civic Trivia Championship without an account. Signed out, your crowd lives in your browser. Sign in, and it remembers your progress, with your level and your place on the week's leaderboard.

Chapter 6 — why a trivia game

## L020
> Direction: a Bobit `ponder`, alone.
It is fair to ask why a trivia game sits inside a voting platform.

## L021
> Direction: `art` — one line of type, printed and held.
Jefferson's argument was that a nation cannot be both ignorant and free. Nothing in the two centuries since has disproved him. An informed citizen is not a nice addition to a democracy. It is the condition of one.

## L022
> Direction: `art` — several separate people, the same card in every pair of hands.
And an argument between two people holding different facts cannot be settled, only continued. A trivia game is a small thing. It is also one of the few things that hands a lot of people the same set of facts.

## L023
> Direction: `art` — a shelf of general quizzes, and the gap where a local one would be.
There is no shortage of quizzes about the three branches of government. There is no quiz about who runs your city, or what your council decided last year.

## L024
> Direction: `art` — a card with a date on it retires, and a new one takes its place.
And the answers here have end dates. Who is your mayor is only true until it is not, so that question expires on its own, and a replacement with the right answer takes its place. The news collections are written the night before.

Chapter 7 — close

## L025
> Direction: cut to a few seconds of the real ctc.empowered.vote screen.
It is live today, at c t c dot empowered dot vote.

## L026
> Direction: the real screen holds, and keeps moving.
Pick a collection. Five questions, twenty-five seconds each. Then see who turns up.

## L027
> Direction: two Bobits, `cheer`. Text of 'ctc.empowered.vote'.
That is the Civic Trivia Championships. Go find out what you know.
