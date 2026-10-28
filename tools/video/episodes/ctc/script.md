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
**The film no longer mentions that last one.** L024 stopped saying "the news
collections are written the night before" on 2026-10-26, and the caption that
drew it came out of the episode with it. The cron is still described here
because it still runs, not because anything on screen claims it.

All three schedulers are started from `cron/startCron.ts`. The engine
registers them in `trivia/app.ts` behind `TRIVIA_CRONS_ENABLED`, which is off,
because the standalone civic-trivia-backend still owns them during the
parallel run and starts all three with no gate. They run. The film is right
about the behaviour, and it names no service.

That wording mattered while the line existed: it said "the news collections",
never "the collections", because a city or state collection is not written
from a news feed and the wider claim would have been false. Kept here in case
the sentence is ever restored.

Empowered Badges is NOT named anywhere in this film. It is a strong reason the
game exists and it is not built; our own briefing files it under designed but
not built.

## The flag line, and the reward that is no longer promised

**L010 no longer says "we give special rewards for people who spot those."**
Chris took it out on 2026-10-26, and the line now stops at the queue a person
works through. That closes the one place in the series where the film named
something unfinished, so the episode no longer has a release condition.

The reason it was ever in doubt is worth keeping, because the halves exist and
somebody will be tempted to put the sentence back. The gem ledger is live —
`lib/gemService.ts` credits, debits and awards, and balances sit on connected
profiles; gems are paid today by trivia progression and by Voter Quest
submissions. The flag queue is live too — `trivia/routes/admin.ts` lists
flags, opens one, dismisses, archives and restores. What does not exist is the
JOIN: a grant path from the flag queue to `awardGems`, so an admin can thank
the account that reported the error.

**Do not restore the sentence until that path is in the code.** What is left
says only what the product does today.

## What the trims took out

The wager chapter, the difficulty ladder, the instant lock, the reply to the
wrong answer you picked, and the closing line of chapter 6 were cut on
2026-10-14. All five describe real behaviour. The film is shorter and nothing
in it is untrue; what it no longer says is written down here so that the next
person does not read the silence as a limit of the product.

Three more went on 2026-10-26, and all three are real behaviour too:

- **L017 — the game puts questions you have never got right to the front.**
  That is the spaced-repetition half of the crowd, and it is the strongest
  reason to come back. It is now unsaid.
- **L022 — an argument between two people holding different facts cannot be
  settled, only continued.** The shared-facts argument for why this exists.
- **L023 — there is no shortage of quizzes about the three branches, and no
  quiz about who runs your city.** The local-gap argument.

L022 and L023 were two of the three legs chapter 6 stood on; it now rests on
Jefferson and on the expiry. The scenes that drew all three are gone from
`episode.mjs`, but their `drawCrowd` and `drawWhy` stages are still in
`art.js` — unreachable, and left there deliberately so restoring a line is
putting a scene back rather than drawing it again.

**Line numbers are not renumbered.** L017, L022 and L023 are simply missing,
the way Treasury is missing L015 and L022. Every cut, pin and scene keys off
the numbers.

## What the booth changed, 2026-10-27

Chris recorded the whole script in one take (`DJI_38_20261027_102134.WAV`, 8.5 minutes, 24 of
24 lines) and edited as he read, which is the rule for this series: his read IS the script, and
only a flub, a cough or a broken sentence is a mistake. Twelve lines moved. All of them move the
same way — contractions, present tense, a plainer word, one fewer clause.

Two are more than wording. **L015 opens somewhere else now.** It used to begin "When you get a
correct answer, they stay and hang out", which repeated L014's "when you get a question right"
one line later; he read "Between questions, they stay and hang out" instead, and the repetition
is gone. And **L019 says Championship*s***, plural, which is the name of the product.

**One flub, and it is the only one.** L024 was started twice: the first attempt says "Some
answers have dates", drops the word "end", stops, and he comes back 5.5 seconds later and reads
the line whole. The later reading is the cut; the pin is in `cuts.json` with what is on the tape
written beside it.

**Two pins, and the second one is a warning.** L024's is an ordinary false start. L015's is not:
the whole-file transcript writes L013's words over L015's opening seconds — not a gap, which the
repair pass would have caught, but the wrong words confidently stamped on the right seconds. The
same three seconds transcribed on their own come back correct. **A low match score is not the
only way a line can be mis-read, and a sentence that looks absent can simply have been written
down as something else.** Transcribe the span alone before believing it is missing.

Chapter 1 — the test you were made to fear

## L001
> Direction: a Bobit at a school desk, a paper on it. `read`.
Most of us met civics once, in a room like this one. Three branches of government. How a bill becomes a law. Checks and balances.

## L002
> Direction: the paper is marked and slides away. `bored`.
You learned it for a test, you passed the test, and then you never had to use any of it again. Not because you didn't care. But because nothing in your week ever asked you.

## L003
> Direction: the desk is gone. The Bobit holds a ballot at a kitchen table. `confused`.
Then one day something does ask. A ballot, or a meeting, or an argument you do not want to be in. And the answer is in there somewhere, under years of dust.

## L004
> Direction: `art` — the marked paper turns over and becomes a bright game card.
So here is a different offer. Not a test. A game show.

## L005
> Direction: title card on Inform yellow.
This is the Civic Trivia Championships.

Chapter 2 — how a game runs

## L006
> Direction: `art` — one question card, four answers under it, a clock in the corner.
Matches are quick. A game is five questions. Each one gives you four answers in twenty-five seconds.

## L007
> Direction: `art` — the clock runs down and the points fall with it, in two steps.
A right answer is a hundred points. Answer inside the first ten seconds and it's fifty more. Inside twenty, twenty-five more. Knowing an answer is worth more than working it out.

Chapter 3 — being wrong is the lesson

## L008
> Direction: `art` — the answer card opens into an explanation panel.
Every question ends the same way, whether you got it or not. The right answer, and an explanation of why it's the right answer.

## L009
> Direction: `art` — a named source and a link appear under the explanation.
Under that is where it came from. A named source, with a link you can open, so you never have to take our word for it.

## L010
> Direction: a Bobit beside the card. A small flag on the question.
And if you think a question is wrong, then flag it for us; it goes into a queue that a real person works through.

Chapter 4 — the collections

## L011
> Direction: `art` — a shelf of collection cards, each one a different colour.
The questions are not one big pile. They come in collections, usually by location or topic.

## L012
> Direction: `art` — the shelf sorts into three bands: federal, state, city.
There are federal ones, state ones and city ones. The federal collection is a good place to start, because it applies to each of us.

## L013
> Direction: `art` — one city card opens, and its questions are about that city.
A city collection asks about that city. Its council, its budget, its measures, its own particular history. No civics textbook was ever going to carry those, and that's the corner of government standing closest to you.

Chapter 5 — the crowd

## L014
> Direction: `art` — an empty field under a collection card. One small figure walks in.
When you get a question right, these little folks start showing up to cheer you on.

## L015
> Direction: `art` — more figures arrive, one for each right answer, and stay.
Between questions, they stay and hang out. Come back for another round and they're still standing there. Then the next right answer brings another one.

## L016
> Direction: `art` — the crowd is big enough that some of them start building.
Once there are enough of them, they stop milling about and start building something.

## L018
> Direction: `art` — one figure walks off the field.
And if you get an answer wrong that you had right before, then that one leaves. Your crowd is what you know today, not what you knew once.  

## L019
> Direction: a Bobit `present` beside the field.
You can play Civic Trivia Championships without an account. Signed out, your crowd lives in your browser.  But when you sign in, it remembers your progress, with your level and your place on the week's leaderboard.

Chapter 6 — why a trivia game

## L020
> Direction: a Bobit `ponder`, alone.
That's fair to ask why a trivia game sits inside a voting platform.

## L021
> Direction: `art` — one line of type, printed and held.
Jefferson's argument was that a nation cannot be both ignorant and free. Nothing in the two centuries since has made that less true.  An informed citizen is not a nice addition to a democracy.  It is the condition of one.

## L024
> Direction: `art` — a card with a date on it retires, and a new one takes its place.
And the collections are evolving.  Some answers have end dates.  'Who is your mayor?' is only true until it is not, so that question expires at the end of their term, and a replacement with the right answer takes its place.

Chapter 7 — close

## L025
> Direction: cut to a few seconds of the real ctc.empowered.vote screen.
It's live today, at ctc dot empowered dot vote.

## L026
> Direction: the real screen holds, and keeps moving.
Pick a collection. Five questions, twenty-five seconds each. Then see who turns up.

## L027
> Direction: two Bobits, `cheer`. Text of 'ctc.empowered.vote'.
That is the Civic Trivia Championships. Go find out what you know.
