# wordlb0t

When you play [Wordle](https://www.powerlanguage.co.uk/wordle/), the computer picks the word and you guess. Wordleb0t flips the script and guesses the word that you choose.

Play it [**here**](https://wordleb0t.rslc.us/).

## Introduction

Start by picking a secret word (between 4 and 11 letters).

Wordleb0t gets 6 tries to guess your word. Each time, you can check the guess by clicking on the letters to change their background color. Green means a letter is correct in this spot; yellow means a letter is _elsewhere_ in the target word; gray means a letter is not in the target word at all. Once you've colored in every letter, click the checkmark to lock-in your feedback and Wordleb0t will make its next guess.

If you realize you made a mistake, there's an undo button to go back. Speed things up with the number keys on your keyboard- each one will increment the color of the of the associated letter.

## Source

The core of this repository was forked from [@chordbug](https://twitter.com/chordbug)'s excellent [hello-wordl](https://github.com/lynn/hello-wordl) project.

## For developers

If you can make Wordleb0t smarter, please feel free to [fork the code](https://docs.github.com/en/get-started/quickstart/fork-a-repo) on GitHub or leave a pull request.

To run the code locally, first install [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#using-a-node-version-manager-to-install-nodejs-and-npm). Then, in this directory, open a terminal and run `npm install` followed by `npm run start`. _hello wordl_ will be running at http://localhost:3000/. Any changes you make to the source code will be reflected there. Have fun!

Finally, `npm run deploy` will deploy your code to the `gh-pages` branch of your fork, so that everyone can play your version at https://yourname.github.io/wordleb0t (or the name of your fork if you renamed it).
