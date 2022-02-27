import { useState, useEffect } from "react";
import { Clue, CluedLetter } from "./clue";

export enum RowState {
  LockedIn,
  Editing,
  Pending,
}

interface RowProps {
  rowState: RowState;
  wordLength: number;
  word: string;
  foundLetters: string[];
  onChange: (isLockable: boolean) => void;
  onLockIn: (rowClues: CluedLetter[]) => void;
  onUndo: () => void;
}

const letterClasses = [
  "letter-unspecified",
  "letter-absent",
  "letter-elsewhere",
  "letter-correct",
];

export function Row({
  wordLength,
  word = "",
  foundLetters = [],
  rowState,
  onChange,
  onLockIn,
  onUndo,
}: RowProps) {
  const [rowClues, setRowClues] = useState<number[]>(
    Array.from(word).map((_) => -1)
  );
  const isEmpty = !word || rowClues.every((value) => value === -1);
  const isLockable = !!rowClues.length && !rowClues.includes(-1);
  const isAboutToWin =
    !!rowClues.length && !rowClues.every((clue) => clue === Clue.Correct);
  const isLockedIn = rowState === RowState.LockedIn;
  const isEditing = rowState === RowState.Editing;

  useEffect(() => {
    isEditing && onChange(isLockable);
  }, [onChange, isEditing, isLockable]);

  const handleClick = (i: number) => () => {
    if (!isEditing) return;
    const newLetterState = rowClues[i] === 2 ? -1 : rowClues[i] + 1;
    setRowClues([
      ...rowClues.slice(0, i),
      newLetterState,
      ...rowClues.slice(i + 1),
    ]);
  };

  useEffect(() => {
    const handleKeyDown = ({ key }: KeyboardEvent) => {
      if (!isEditing || !/\d|Enter/.test(key)) return;
      if (key === "Enter") {
        onLockIn(rowClues.map((clue, i) => ({ clue, letter: word[i] })));
        return;
      }

      const i = parseInt(key, 10) - 1;

      i >= 0 && i <= wordLength - 1 && handleClick(i)();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  useEffect(() => {
    isEmpty &&
      setRowClues(
        Array.from(word).map((_, index) => (foundLetters[index] ? 2 : -1))
      );
  }, [word, foundLetters, isEmpty]);

  return (
    <tr className="Row">
      {Array(wordLength)
        .fill(null)
        .map((_, i) => (
          <td
            key={i}
            onClick={handleClick(i)}
            className={`Row-letter ${letterClasses[rowClues[i] + 1]}`}
          >
            {word[i]}
          </td>
        ))}
      <td>
        {isEditing && (
          <button
            onClick={() =>
              onLockIn(rowClues.map((clue, i) => ({ clue, letter: word[i] })))
            }
            disabled={!isLockable}
            style={
              !isLockable
                ? {}
                : {
                    backgroundColor: isAboutToWin
                      ? "rgb(84, 163, 84)"
                      : "#195272",
                  }
            }
          >
            ✔
          </button>
        )}
        {isLockedIn && (
          <button
            onClick={onUndo}
            className="undo"
            title="Undo this feedback and make changes"
          >
            ⎌
          </button>
        )}
      </td>
    </tr>
  );
}
