# wordlb0t

[![codecov](https://codecov.io/gh/carpiediem/wordleb0t/branch/main/graph/badge.svg)](https://codecov.io/gh/carpiediem/wordleb0t)
[![CI Status](https://img.shields.io/github/actions/workflow/status/carpiediem/wordleb0t/ci.yml?branch=main)](https://github.com/carpiediem/wordleb0t/actions?query=workflow%3A%22Node+CI%22)

When you play [Wordle](https://www.powerlanguage.co.uk/wordle/), the computer
picks the word and you guess. Wordleb0t flips the script and guesses the word
that you choose.

Play it [**here**](https://carpiediem.github.io/wordleb0t/), or follow
[@wordleb0t](https://x.com/wordleb0t) on X for a daily post of its guesses
against that day's NYT puzzle.

## Introduction

Start by picking a secret word (between 4 and 11 letters).

Wordleb0t gets 6 tries to guess your word. Each time, you can check the guess
by clicking on the letters to change their background color. Green means a
letter is correct in this spot; yellow means a letter is _elsewhere_ in the
target word; gray means a letter is not in the target word at all. Once
you've colored in every letter, click the checkmark to lock-in your feedback
and Wordleb0t will make its next guess.

If you realize you made a mistake, there's an undo button to go back. Speed
things up with the number keys on your keyboard- each one will increment the
color of the of the associated letter.

## Source

The core of this repository was forked from
[@chordbug](https://twitter.com/chordbug)'s excellent
[hello-wordl](https://github.com/lynn/hello-wordl) project.

Wordleb0t was released in January 2022, several months before the New York
Times launched its own
[Wordle-solving analysis tool](https://www.nytimes.com/interactive/2022/upshot/wordle-bot.html)
in April 2022.

## Algorithm

At every turn, Wordleb0t narrows the field to the words consistent with every
clue you've given so far - the right letters in the right (or wrong) spots,
and the letters ruled out entirely.

When that field is small (8 or fewer words), Wordleb0t just guesses the most
promising word left in it, ranked by how common its letters are and, for
words that have actually been NYT Wordle answers before, how likely NYT is to
reuse it.

When the field is wider than that, ranking candidates against each other
stops being enough: a cluster of words that share almost every letter (e.g.
`wafer`/`wager`/`hater`/`later`/`eager`/...) can trap a guesser into testing
one look-alike per turn, since no candidate word can distinguish more than
one of the unconfirmed letters at a time. Wordleb0t instead picks a guess -
which may not even be a possible answer itself - that best _splits up_ the
remaining field, using [Shannon
entropy](https://en.wikipedia.org/wiki/Entropy_(information_theory)) to
measure how much a guess narrows things down: for each candidate guess,
Wordleb0t simulates the clue it would get back against every remaining word,
groups the results by that clue pattern, and scores the guess by how evenly
and finely that groups the field. A guess that's equally likely to produce
any of several very different clues carries more information (higher
entropy) than one that mostly produces the same clue no matter which
remaining word turns out to be the answer, so it's expected to eliminate more
of the field in one go regardless of what comes back. Ties go to an actual
candidate word, since guessing one also has a chance of winning outright.

This is the same information-theoretic idea behind [3Blue1Brown's "Solving
Wordle using information
theory"](https://www.youtube.com/watch?v=v68zYyaEmEA) ([writeup
here](https://www.3blue1brown.com/lessons/wordle)), adapted to run
efficiently for words of any length and to weigh a candidate's own chance of
being the answer against pure information gain. The discussion that led to
it is in [issue #31](https://github.com/carpiediem/wordleb0t/issues/31).

## For developers

If you can make Wordleb0t smarter, please feel free to
[fork the code](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
on GitHub or leave a pull request.

To run the code locally, first install
[Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#using-a-node-version-manager-to-install-nodejs-and-npm).
Then, in this directory, open a terminal and run `npm install` followed by
`npm run start` (`npm run dev` is an alias). _hello wordl_ will be running at
http://localhost:3000/. Any changes you make to the source code will be
reflected there. Have fun!

Finally, `npm run deploy` will deploy your code to the `gh-pages` branch of
your fork, so that everyone can play your version at
https://yourname.github.io/wordleb0t (or the name of your fork if you
renamed it).

### Follow-up worksheets

If you always open with the same first guess (say, `adieu` or `slate`), you
can generate an SVG worksheet covering every possible gray/yellow/green
result for that guess, paired with Wordleb0t's suggested next guess for each
one:

```sh
npm run worksheet -- adieu
```

This writes `worksheet-adieu.svg` to the current directory (pass a second
argument to choose a different output path). Convert it to PNG or PDF with
any SVG tool, e.g. [Inkscape](https://inkscape.org/) or `rsvg-convert`.

The all-gray and all-yellow results are shown as two cards next to the title,
since each is just a single result rather than a whole column's worth. The
remaining results are grouped into columns by how many letters came back
colored (yellow or green) and by which of those are green vs. yellow, so you
can jump straight to the column that matches what you saw. Results with 4 or
5 colored letters are broken out into their own section below the rest, since
there are far more color arrangements than there are worthwhile columns to
spread them across.

### Daily X post

The [Post Daily Result](.github/workflows/post-daily-result.yml) GitHub
Actions workflow runs on a schedule, fetching that day's NYT Wordle answer,
solving it with Wordleb0t, and posting the result to
[@wordleb0t](https://x.com/wordleb0t). It reads Twitter/X API credentials
from repo secrets (`TWITTER_API_KEY`, `TWITTER_API_SECRET`,
`TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`) and can also be
triggered manually from the Actions tab.
