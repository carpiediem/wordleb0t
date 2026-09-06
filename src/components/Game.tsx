import { ChangeEvent, useRef, useState, useEffect } from 'react';
import { Row, RowState } from './Row';
import { GuessSelect } from './GuessSelect';
import { Clue, CluedLetter, foundReducer } from '../lib/clue';
import { GuessOption, makeGuessOptions, countRemaining } from '../lib/guess';

declare const window: { ga: (action: string, options: Record<string, unknown>) => void };

enum GameState {
  Playing,
  Won,
  Lost,
}

interface GameProps {
  maxGuesses: number;
}

function Game(props: GameProps) {
  const [wordLength, setWordLength] = useState(5);
  const [gameState, setGameState] = useState(GameState.Playing);
  const [currentOptions, setCurrentOptions] = useState<GuessOption[]>([]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [clues, setClues] = useState<CluedLetter[][]>([]);
  const [optionCounts, setOptionCounts] = useState<number[]>([]);
  const [hint, setHint] = useState<string>("Tap the letters to check Wordlebot's guess");
  const [userWord, setUserWord] = useState('');

  const tableRef = useRef<HTMLTableElement>(null);

  let foundLetters = clues.reduce(foundReducer, []);

  const handleSelect = (word: string) => {
    guesses.splice(-1, 1, word.toLowerCase());
    setGuesses([...guesses]);
  };

  const handleRowChange = (isLockable: boolean) =>
    setHint(isLockable ? 'When the colors are right, tap the checkmark' : "Tap the letters to check Wordlebot's guess");

  const handleLockIn = (rowClues: CluedLetter[]) => {
    if (gameState !== GameState.Playing) return;

    const nextClues = [...clues, rowClues];
    const isWon = rowClues.every(({ clue }) => clue === Clue.Correct);
    const remainingOptions = makeGuessOptions(wordLength, nextClues, props.maxGuesses);
    const isLost = guesses.length === 6 || remainingOptions.length === 0;

    setOptionCounts((value) => [...value, countRemaining(wordLength, nextClues)]);

    if (isWon) {
      setGameState(GameState.Won);
      setHint('Play again?');
      // <a>Share your result</a> or <a>challenge</a> a friend to do better

      window.ga('send', {
        hitType: 'event',
        eventCategory: 'End',
        eventAction: 'win',
        eventLabel: guesses.slice(-1),
      });
    } else if (isLost) {
      setGameState(GameState.Lost);
      setHint('What was your word?');

      window.ga('send', {
        hitType: 'event',
        eventCategory: 'End',
        eventAction: guesses.length === 6 ? 'loss - six guesses' : 'loss - no match',
        eventLabel: guesses.length,
      });
    } else {
      setCurrentOptions(remainingOptions);
      setClues((value) => [...value, rowClues]);
    }
  };

  const handleUndo = (index: number) => {
    setGuesses(guesses.slice(0, index));
    setClues(clues.slice(0, index));
    setOptionCounts(optionCounts.slice(0, index));
  };

  const handleReset = () => {
    foundLetters = [];
    setGuesses([]);
    setClues([]);
    setOptionCounts([]);
    setCurrentOptions(makeGuessOptions(wordLength));
    setGameState(GameState.Playing);
  };

  const handleLengthChange = (e: ChangeEvent<HTMLInputElement>) => {
    const length = Number(e.target.value);
    setWordLength(length);
    setHint(`${length} letters`);
  };

  const handleUserWord = () => {
    window.ga('send', {
      hitType: 'event',
      eventCategory: 'End',
      eventAction: 'specify',
      eventLabel: userWord,
    });

    handleReset();
  };

  useEffect(() => {
    handleReset();
  }, [wordLength]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (guesses.length > clues.length) return;
    setGuesses((state = []) => (currentOptions.length ? [...state, currentOptions[0].word] : state));
  }, [currentOptions, guesses.length, clues.length]);

  const tableRows = Array(props.maxGuesses)
    .fill(undefined)
    .map((_, i) => {
      const rowState =
        i === guesses.length - 1 ? RowState.Editing : i < guesses.length ? RowState.LockedIn : RowState.Pending;
      return (
        <Row
          key={i}
          wordLength={wordLength}
          word={guesses[i] || ''}
          foundLetters={foundLetters}
          isPlaying={gameState === GameState.Playing}
          rowState={rowState}
          optionsRemaining={optionCounts[i]}
          onChange={handleRowChange}
          onLockIn={handleLockIn}
          onUndo={() => handleUndo(i)}
        />
      );
    });

  return (
    <>
      <div className="Bot-container">
        <div className="bubble">
          {gameState === GameState.Playing && (
            <>
              <h2>I think it&apos;s</h2>
              <GuessSelect options={currentOptions} value={guesses[guesses.length - 1] || ''} onChange={handleSelect} />
            </>
          )}

          {gameState === GameState.Won && <h2>I won!</h2>}
          {gameState === GameState.Lost && (guesses.length === 6 ? <h2>Too bad...</h2> : <h2>I give up!</h2>)}
          {gameState !== GameState.Playing && <button onClick={handleReset}>Let&apos;s play again</button>}
        </div>
        <img src="./bot.png" alt="bot" />
      </div>
      <div className="Game-container">
        <div className="Game-options">
          <label htmlFor="wordLength">Letters:</label>
          <input
            type="range"
            min="4"
            max="11"
            id="wordLength"
            disabled={guesses.length > 1}
            value={wordLength}
            onChange={handleLengthChange}
          ></input>
        </div>
        <table className="Game-rows" tabIndex={0} aria-label="Table of guesses" ref={tableRef}>
          <tbody>{tableRows}</tbody>
        </table>
        <p role="alert">{hint || `\u00a0`}</p>
        {gameState === GameState.Lost && (
          <form id="loss-feedback" onSubmit={handleUserWord}>
            <input value={userWord} onChange={(e) => setUserWord(e.target.value)} style={{ width: `` }} />
            <button type="submit">✔</button>
          </form>
        )}
      </div>
    </>
  );
}

export default Game;
