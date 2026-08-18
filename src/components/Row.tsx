import { useState, useEffect } from 'react';
import { Clue, CluedLetter } from '../lib/clue';

export enum RowState {
  LockedIn,
  Editing,
  Pending,
}

interface RowProps {
  isPlaying: boolean;
  rowState: RowState;
  wordLength: number;
  word: string;
  foundLetters: string[];
  optionsRemaining?: number;
  onChange: (isLockable: boolean) => void;
  onLockIn: (rowClues: CluedLetter[]) => void;
  onUndo: () => void;
}

const letterClasses = ['letter-unspecified', 'letter-absent', 'letter-elsewhere', 'letter-correct'];

export function Row({
  isPlaying,
  wordLength,
  word = '',
  foundLetters = [],
  rowState,
  optionsRemaining,
  onChange,
  onLockIn,
  onUndo,
}: RowProps) {
  const [rowClues, setRowClues] = useState<number[]>(Array.from(word).map((_) => -1));
  const isEmpty = !word || rowClues.every((value) => value === -1);
  const isLockable = !!rowClues.length && !rowClues.includes(-1);
  const isAboutToWin = !!rowClues.length && !rowClues.every((clue) => clue === Clue.Correct);
  const isLockedIn = rowState === RowState.LockedIn;
  const isEditing = rowState === RowState.Editing;
  const isCallbackTriggered = isPlaying && isEditing;

  useEffect(() => {
    if (isCallbackTriggered) onChange(isLockable);
  }, [onChange, isCallbackTriggered, isLockable]);

  const handleClick = (i: number) => () => {
    if (!isEditing) return;
    const newLetterState = rowClues[i] === 2 ? -1 : rowClues[i] + 1;
    setRowClues([...rowClues.slice(0, i), newLetterState, ...rowClues.slice(i + 1)]);
  };

  useEffect(() => {
    const handleKeyDown = ({ key }: KeyboardEvent) => {
      if (!isEditing || !/\d|Enter/.test(key)) return;
      if (key === 'Enter') {
        onLockIn(rowClues.map((clue, i) => ({ clue, letter: word[i] })));
        return;
      }

      const i = parseInt(key, 10) - 1;

      if (i >= 0 && i <= wordLength - 1) handleClick(i)();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  useEffect(() => {
    if (isEmpty) setRowClues(Array.from(word).map((_, index) => (foundLetters[index] ? 2 : -1)));
  }, [word, foundLetters, isEmpty]);

  return (
    <tr className="Row">
      {Array(wordLength)
        .fill(null)
        .map((_, i) => (
          <td key={i} onClick={handleClick(i)} className={`Row-letter ${letterClasses[rowClues[i] + 1]}`}>
            {word[i]}
          </td>
        ))}
      <td>
        {isPlaying && isEditing && (
          <button
            onClick={() => onLockIn(rowClues.map((clue, i) => ({ clue, letter: word[i] })))}
            disabled={!isLockable}
            style={
              !isLockable
                ? {}
                : {
                    backgroundColor: isAboutToWin ? 'rgb(84, 163, 84)' : '#195272',
                  }
            }
          >
            ✔
          </button>
        )}
        {isPlaying && isLockedIn && (
          <button onClick={onUndo} className="undo" title="Undo this feedback and make changes">
            ⎌
          </button>
        )}
      </td>
      <td className="Row-count">
        {isLockedIn && optionsRemaining !== undefined && (
          <>
            <span className="Row-count-number">{optionsRemaining.toLocaleString()}</span>
            <span className="Row-count-label">{optionsRemaining === 1 ? 'word left' : 'words left'}</span>
          </>
        )}
      </td>
    </tr>
  );
}
