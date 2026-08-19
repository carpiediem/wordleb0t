import { clue, Clue, CluedLetter } from './clue';
import { makeGuess } from './guess';

export interface SolveStep {
  guess: string;
  clues: CluedLetter[];
}

export interface SolveResult {
  steps: SolveStep[];
  guessCount: number | null; // null if the answer wasn't found within maxGuesses
}

// Plays wordleb0t against a known answer, recording each guess and the clue
// it received. Used both to backtest against historical NYT answers and to
// generate the daily result post.
export function solve(answer: string, maxGuesses: number): SolveResult {
  const steps: SolveStep[] = [];
  let clues: CluedLetter[][] = [];

  for (let guessCount = 1; guessCount <= maxGuesses; guessCount++) {
    const guess = makeGuess(answer.length, clues)[0];
    if (!guess) return { steps, guessCount: null }; // no candidates left consistent with the clues so far

    const guessClue = clue(guess, answer);
    steps.push({ guess, clues: guessClue });
    if (guess === answer) return { steps, guessCount };

    clues = [...clues, guessClue];
  }
  return { steps, guessCount: null };
}

const CLUE_EMOJI: Record<Clue, string> = {
  [Clue.Correct]: '🟩',
  [Clue.Elsewhere]: '🟨',
  [Clue.Absent]: '⬛',
};

export function stepsToEmojiGrid(steps: SolveStep[]): string {
  return steps.map(({ clues }) => clues.map(({ clue }) => CLUE_EMOJI[clue!]).join('')).join('\n');
}
