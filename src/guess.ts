import dictionary from "./dictionary-ranked.json";
import targets from "./targets.json";
import allClues from "./allClues.json";
import { Clue, CluedLetter } from "./clue";

type ScoredWord = {
  word: string;
  lettersRank: number;
  usageRank: number;
};

const scoredWords = dictionary.map((word, lettersRank) => ({
  word,
  lettersRank,
  usageRank: targets.indexOf(word),
}));

export function toRegExp(clues: CluedLetter[][]) {
  if (clues.length === 0) return /(?:)/;

  const found = clues[0].map((_) => "");
  const somewhere = [] as string[];
  const nowhere = [] as string[];
  const exclusions = clues[0].map((_) => [] as string[]);
  clues.forEach((row) => {
    row.forEach(({ clue, letter }, index) => {
      if (clue === Clue.Correct) found[index] = letter;
      if (clue === Clue.Elsewhere) {
        exclusions[index].push(letter);
        somewhere.push(letter);
      }
      if (clue === Clue.Absent) {
        exclusions[index].push(letter);

        if (
          !row.some(
            (otherPosition) =>
              otherPosition.letter === letter && otherPosition.clue
          )
        ) {
          nowhere.push(letter);
        }
      }
    });
  });

  const nowherePattern = `(?=^[^${nowhere.join("")}]+$)`;
  const somewherePattern = somewhere
    .filter((letter: string) => !found.includes(letter))
    .map((letter: string) => `(?=.*${letter})`)
    .join("");
  const byPositionPattern = exclusions
    .map((letters, index) => {
      return found[index] || (letters.length ? `[^${letters.join("")}]` : ".");
    })
    .join("");

  return new RegExp(
    [somewherePattern, nowherePattern, `(?=^${byPositionPattern}$)`].join("")
  );
}

function colorIs(colorClue: string, index: number, color: string): boolean {
  return Array.from(colorClue)[index] === color;
}

export function colorToRegExp(word: string, colorClue: string) {
  const letters = Array.from(word);

  const nowhere = letters.filter((letter, index) =>
    colorIs(colorClue, index, "⬛") ? letter : ""
  );
  const found = letters.map((letter, index) =>
    colorIs(colorClue, index, "🟩") ? letter : ""
  );
  const somewhere = letters.filter((letter, index) =>
    colorIs(colorClue, index, "🟨") ? letter : ""
  );
  const exclusions = letters.map((letter, index) =>
    colorIs(colorClue, index, "🟨") ? [letter] : []
  );

  const nowherePattern = `(?=^[^${nowhere.join("")}]+$)`;
  const somewherePattern = somewhere
    .filter((letter: string) => !found.includes(letter))
    .map((letter: string) => `(?=.*${letter})`)
    .join("");
  const byPositionPattern = exclusions
    .map((letters, index) => {
      return found[index] || (letters.length ? `[^${letters.join("")}]` : ".");
    })
    .join("");

  return new RegExp(
    [somewherePattern, nowherePattern, `(?=^${byPositionPattern}$)`].join("")
  );
}

function score({ lettersRank, usageRank }: ScoredWord, guessIndex: number) {
  console.log(guessIndex, dictionary.length, targets.length);

  return (
    dictionary.length -
    lettersRank +
    (usageRank === -1 ? 0 : 0.5 * guessIndex * (targets.length - usageRank))
  );
}

export function makeGuess(
  wordLength: number,
  clues: CluedLetter[][] = []
): string[] {
  const re = toRegExp(clues);

  if (clues.length === 0 && localStorage.INITIAL_GUESS?.length === wordLength) {
    return [localStorage.INITIAL_GUESS];
  }

  const result = scoredWords
    .filter(({ word }) => word.length === wordLength && re.test(word))
    .map((scoredWord) => ({
      ...scoredWord,
      score: score(scoredWord, clues.length),
    }))
    .sort((a, b) => (a.score > b.score ? -1 : 1));
  console.log(result);

  return result.slice(0, 8).map(({ word }) => word);
}
}
