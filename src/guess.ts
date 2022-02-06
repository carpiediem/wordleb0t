import dictionary from "./dictionary-ranked.json";
import { CluedLetter, toRegExp } from "./clue";

export function makeGuess(
  wordLength: number,
  clues: CluedLetter[][] = []
): string[] {
  const re = toRegExp(clues);

  if (clues.length === 0 && localStorage.INITIAL_GUESS?.length === wordLength) {
    return [localStorage.INITIAL_GUESS];
  }

  return (
    dictionary
      .filter((word) => word.length === wordLength && re.test(word))
      // .sort()
      .slice(0, 8)
  );
}
