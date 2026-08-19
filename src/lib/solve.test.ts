import { describe, expect, it } from 'vitest';
import { Clue } from './clue';
import { solve, stepsToEmojiGrid } from './solve';

describe('solve', () => {
  it('finds the answer within the guess limit', () => {
    const { steps, guessCount } = solve('slate', 6);

    expect(guessCount).not.toBeNull();
    expect(steps[steps.length - 1].guess).toBe('slate');
    expect(steps.length).toBe(guessCount);
  });

  it('returns a null guessCount when it runs out of guesses', () => {
    const { steps, guessCount } = solve('slate', 1);

    expect(guessCount).toBeNull();
    expect(steps.length).toBe(1);
  });

  it('gives up early if no candidates remain consistent with the clues so far', () => {
    // No 2-letter words exist in the dictionary, so makeGuess() returns nothing
    // for guess 1 and solve() should bail out immediately instead of looping.
    const { steps, guessCount } = solve('zz', 6);

    expect(guessCount).toBeNull();
    expect(steps).toEqual([]);
  });
});

describe('stepsToEmojiGrid', () => {
  it('renders one emoji row per step', () => {
    const { steps } = solve('slate', 6);

    const grid = stepsToEmojiGrid(steps);
    const rows = grid.split('\n');

    expect(rows.length).toBe(steps.length);
    rows.forEach((row) => expect(Array.from(row).length).toBe(5));
  });

  it('maps each clue to its emoji', () => {
    const steps = [
      {
        guess: 'slate',
        clues: [
          { letter: 's', clue: Clue.Correct },
          { letter: 'l', clue: Clue.Elsewhere },
          { letter: 'a', clue: Clue.Absent },
          { letter: 't', clue: Clue.Correct },
          { letter: 'e', clue: Clue.Elsewhere },
        ],
      },
    ];

    expect(stepsToEmojiGrid(steps)).toBe('🟩🟨⬛🟩🟨');
  });
});
