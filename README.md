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
[hello-wordl](https://github.com/lynn/hello-wordl) project, including
[@lynn](https://github.com/lynn)'s initial editing of its word list.

Wordleb0t was released in January 2022, several months before the New York
Times launched its own
[Wordle-solving analysis tool](https://www.nytimes.com/interactive/2022/upshot/wordle-bot.html)
in April 2022.

When checking whether a word belongs in the dictionary (see #33), Peter
Norvig's [word frequency list](http://norvig.com/mayzner.html) - derived
from the Google Books Ngrams dataset - is a useful cross-reference for how
common a real word actually is.

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
