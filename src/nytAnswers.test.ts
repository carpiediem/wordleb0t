import { describe, expect, it } from 'vitest';
import { makeGuess } from './guess';
import { clue, CluedLetter } from './clue';
import answers from './nytAnswers.json';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const BAR_WIDTH = 40;

// null means the word wasn't guessed within MAX_GUESSES.
function solve(answer: string): number | null {
  let clues: CluedLetter[][] = [];

  for (let guessCount = 1; guessCount <= MAX_GUESSES; guessCount++) {
    const guess = makeGuess(WORD_LENGTH, clues)[0];
    if (!guess) return null; // no candidates left consistent with the clues so far
    if (guess === answer) return guessCount;
    clues = [...clues, clue(guess, answer)];
  }
  return null;
}

// Mimics the "STATISTICS" card NYT's Wordle shows players.
function renderStatistics(results: (number | null)[]): string {
  const played = results.length;
  const wins = results.filter((result) => result !== null).length;
  const winPct = Math.round((wins / played) * 100);

  let currentStreak = 0;
  let maxStreak = 0;
  for (const result of results) {
    currentStreak = result !== null ? currentStreak + 1 : 0;
    maxStreak = Math.max(maxStreak, currentStreak);
  }

  const distribution = Array.from(
    { length: MAX_GUESSES },
    (_, guessCount) => results.filter((result) => result === guessCount + 1).length,
  );
  const maxCount = Math.max(...distribution, 1);

  const distributionLines = distribution.map((count, index) => {
    const barLength = count === 0 ? 0 : Math.max(1, Math.round((count / maxCount) * BAR_WIDTH));
    const row = `${index + 1}  ${'█'.repeat(barLength)} ${count}`.trimEnd();
    return count === maxCount && count > 0 ? `\x1b[32m${row}\x1b[0m` : row;
  });

  return [
    'STATISTICS',
    '',
    `${played} Played   ${winPct} Win %   ${currentStreak} Current Streak   ${maxStreak} Max Streak`,
    '',
    'GUESS DISTRIBUTION',
    ...distributionLines,
  ].join('\n');
}

// The full list of official NYT Wordle answers (as of the original ~2,300-word
// list), so we can measure how well wordleb0t's general-purpose guesser does
// against the actual game it's most often compared to.
describe('Wordleb0t logic', () => {
  it('solves the vast majority of official NYT Wordle answers within 6 guesses', () => {
    const results = answers.map(solve);
    const failures = answers.filter((_, index) => results[index] === null);

    console.log(
      '\n' + renderStatistics(results) + `\n\nUnsolved (${failures.length}): ${failures.join(', ') || 'none'}`,
    );

    // Not expected to hit 100%, since wordleb0t's dictionary isn't tailored to the NYT
    // answer list - this just guards against regressions in the guessing algorithm.
    const winRate = (answers.length - failures.length) / answers.length;
    expect(winRate).toBeGreaterThanOrEqual(0.95);
  }, 30000);
});
