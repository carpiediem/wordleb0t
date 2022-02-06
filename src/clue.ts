import { Difficulty, englishNumbers, ordinal } from "./util";

export enum Clue {
  Absent,
  Elsewhere,
  Correct,
}

export interface CluedLetter {
  clue?: Clue;
  letter: string;
}

export function clue(word: string, target: string): CluedLetter[] {
  let elusive: string[] = [];
  target.split("").forEach((letter, i) => {
    if (word[i] !== letter) {
      elusive.push(letter);
    }
  });
  return word.split("").map((letter, i) => {
    let j: number;
    if (target[i] === letter) {
      return { clue: Clue.Correct, letter };
    } else if ((j = elusive.indexOf(letter)) > -1) {
      // "use it up" so we don't clue at it twice
      elusive[j] = "";
      return { clue: Clue.Elsewhere, letter };
    } else {
      return { clue: Clue.Absent, letter };
    }
  });
}

export function clueClass(clue: Clue): string {
  if (clue === Clue.Absent) {
    return "letter-absent";
  } else if (clue === Clue.Elsewhere) {
    return "letter-elsewhere";
  } else {
    return "letter-correct";
  }
}

export function clueWord(clue: Clue): string {
  if (clue === Clue.Absent) {
    return "no";
  } else if (clue === Clue.Elsewhere) {
    return "elsewhere";
  } else {
    return "correct";
  }
}

export function describeClue(clue: CluedLetter[]): string {
  return clue
    .map(({ letter, clue }) => letter.toUpperCase() + " " + clueWord(clue!))
    .join(", ");
}

export function violation(
  difficulty: Difficulty,
  clues: CluedLetter[],
  guess: string
): string | undefined {
  if (difficulty === Difficulty.Normal) {
    return undefined;
  }
  const ultra = difficulty === Difficulty.UltraHard;
  let i = 0;
  for (const { letter, clue } of clues) {
    const clueCount = clues.filter(
      (c) => c.letter === letter && c.clue !== Clue.Absent
    ).length;
    const guessCount = guess.split(letter).length - 1;
    const glyph = letter.toUpperCase();
    const glyphs = glyph + (clueCount !== 1 ? "s" : "");
    const nth = ordinal(i + 1);

    // Hard: enforce greens stay in place.
    if (clue === Clue.Correct && guess[i] !== letter) {
      return nth + " letter must be " + glyph;
    }

    // Hard: enforce yellows are used.
    if (guessCount < clueCount) {
      const atLeastN =
        clueCount > 1 ? `at least ${englishNumbers[clueCount]} ` : "";
      return `Guess must contain ${atLeastN}${glyphs}`;
    }

    // Ultra Hard: disallow would-be greens.
    if (ultra && clue !== Clue.Correct && guess[i] === letter) {
      return nth + " letter can't be " + glyph;
    }

    // Ultra Hard: if the exact amount is known because of an Absent clue, enforce it.
    if (ultra && clue === Clue.Absent && guessCount !== clueCount) {
      return clueCount === 0
        ? `Guess can't contain ${glyph}`
        : `Guess must contain exactly ${englishNumbers[clueCount]} ${glyphs}`;
    }

    ++i;
  }
  return undefined;
}

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

export const foundReducer = (agg: string[], cur: CluedLetter[]) => {
  cur.forEach(({ clue, letter }, index) => {
    if (clue === Clue.Correct) agg[index] = letter;
  });
  return agg;
};
