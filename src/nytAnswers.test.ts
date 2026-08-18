import { describe, expect, it } from 'vitest';
import { makeGuess } from './guess';
import { clue, CluedLetter } from './clue';
import answers from './nytAnswers.json';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

// The full list of official NYT Wordle answers (as of the original ~2,300-word
// list), so we can measure how well wordleb0t's general-purpose guesser does
// against the actual game it's most often compared to.
describe('guess logic against every NYT Wordle answer', () => {
  it('solves the vast majority of official answers within 6 guesses', () => {
    const failures: string[] = [];
    let totalGuesses = 0;

    for (const answer of answers) {
      let clues: CluedLetter[][] = [];
      let solved = false;

      for (let guessCount = 1; guessCount <= MAX_GUESSES; guessCount++) {
        const guess = makeGuess(WORD_LENGTH, clues)[0];
        if (!guess) break; // no candidates left consistent with the clues so far

        if (guess === answer) {
          solved = true;
          totalGuesses += guessCount;
          break;
        }

        clues = [...clues, clue(guess, answer)];
      }

      if (!solved) failures.push(answer);
    }

    const solvedCount = answers.length - failures.length;
    const winRate = solvedCount / answers.length;

    console.log(
      `Solved ${solvedCount}/${answers.length} answers (${(winRate * 100).toFixed(1)}%), ` +
        `averaging ${(totalGuesses / solvedCount).toFixed(2)} guesses per win.\n` +
        `Unsolved: ${failures.join(', ') || 'none'}`,
    );

    // Not expected to hit 100%, since wordleb0t's dictionary isn't tailored to the NYT
    // answer list - this just guards against regressions in the guessing algorithm.
    expect(winRate).toBeGreaterThanOrEqual(0.95);
  }, 30000);
});
