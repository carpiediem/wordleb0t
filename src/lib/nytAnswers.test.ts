import { writeFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { solve as playOut } from './solve';
import answers from '../data/nytAnswers.json';

// Where CI reads the current run's win rate from, to compare against the
// committed baseline for main (see .github/workflows/nyt-answers.yml).
// Gitignored - this is a fresh artifact of each run, not committed state.
const WIN_RATE_OUTPUT_PATH = 'nyt-winrate.json';

const MAX_GUESSES = 6;
const BAR_WIDTH = 40;

// null means the word wasn't guessed within MAX_GUESSES.
function solve(answer: string): number | null {
  return playOut(answer, MAX_GUESSES).guessCount;
}

interface Stats {
  played: number;
  wins: number;
  winPct: number;
  avgGuesses: number; // mean guesses per win
  currentStreak: number;
  maxStreak: number;
  distribution: number[]; // count of wins in 1, 2, ..., MAX_GUESSES guesses
  failures: string[];
}

function computeStats(answers: string[], results: (number | null)[]): Stats {
  const played = results.length;
  const wins = results.filter((result) => result !== null).length;
  const winPct = Math.round((wins / played) * 10000) / 100;
  const failures = answers.filter((_, index) => results[index] === null);

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

  const totalGuesses = results.reduce((sum: number, result) => sum + (result ?? 0), 0);
  const avgGuesses = Math.round((totalGuesses / wins) * 100) / 100;

  return { played, wins, winPct, avgGuesses, currentStreak, maxStreak, distribution, failures };
}

// Mimics the "STATISTICS" card NYT's Wordle shows players.
function renderStatistics(stats: Stats): string {
  const { played, winPct, avgGuesses, currentStreak, maxStreak, distribution, failures } = stats;
  const maxCount = Math.max(...distribution, 1);

  const distributionLines = distribution.map((count, index) => {
    const barLength = count === 0 ? 0 : Math.max(1, Math.round((count / maxCount) * BAR_WIDTH));
    const row = `${index + 1}  ${'█'.repeat(barLength)} ${count}`.trimEnd();
    return count === maxCount && count > 0 ? `\x1b[32m${row}\x1b[0m` : row;
  });

  return [
    'STATISTICS',
    '',
    `${played} Played   ${winPct} Win %   ${avgGuesses} Guesses to Win   ${currentStreak} Current Streak   ${maxStreak} Max Streak`,
    '',
    'GUESS DISTRIBUTION',
    ...distributionLines,
    '',
    `Unsolved (${failures.length}): ${failures.join(', ') || 'none'}`,
  ].join('\n');
}

// The full list of official NYT Wordle answers (as of the original ~2,300-word
// list), so we can measure how well wordleb0t's general-purpose guesser does
// against the actual game it's most often compared to.
describe('Wordleb0t logic', () => {
  it('solves the vast majority of official NYT Wordle answers within 6 guesses', () => {
    const results = answers.map(solve);
    const stats = computeStats(answers, results);

    console.log('\n' + renderStatistics(stats));

    writeFileSync(
      WIN_RATE_OUTPUT_PATH,
      JSON.stringify({ ...stats, updatedAt: new Date().toISOString() }, null, 2) + '\n',
    );

    // Not expected to hit 100%, since wordleb0t's dictionary isn't tailored to the NYT
    // answer list - this just guards against regressions in the guessing algorithm.
    const winRate = stats.wins / stats.played;
    expect(winRate).toBeGreaterThanOrEqual(0.95);
  }, 120000); // GitHub Actions runners are slower than a local machine; this takes ~15s locally.
});
