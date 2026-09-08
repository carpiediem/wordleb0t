import { ChangeEvent, useRef, useState, useEffect } from 'react';
import { Row, RowState } from './Row';
import { GuessSelect } from './GuessSelect';
import { BucketList } from './BucketList';
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
        // Scouting narrows the field aggressively enough now that guessing
        // wrong 6 times in a row without exhausting every remaining candidate
        // first doesn't happen in practice (confirmed via npm run test:nyt
        // and an exhaustive/randomized search through every legally-reachable
        // 6-guess sequence) - this is effectively always 'loss - no match'.
        /* v8 ignore next */
        eventAction: guesses.length === 6 ? 'loss - six guesses' : 'loss - no match',
        eventLabel: guesses.length,
      });
    } else {
      setCurrentOptions(remainingOptions);
      setClues((value) => [...value, rowClues]);
    }
  };

  const handleUndo = (index: number) => {
    const previousClues = clues.slice(0, index);
    // Keep the undone row's own guess (guesses.slice(0, index + 1), not
    // index) so it reopens showing exactly what it looked like before it was
    // locked in, rather than being overwritten by the auto-fill effect below
    // - that effect only fills in a fresh guess once guesses catches up to
    // clues, and clues is now one shorter than guesses.
    setGuesses(guesses.slice(0, index + 1));
    setClues(previousClues);
    setOptionCounts(optionCounts.slice(0, index));
    // currentOptions was left over from the row just undone - without this,
    // the dropdown would still offer the *next* guess's options instead of
    // the ones valid at this point (#37).
    setCurrentOptions(makeGuessOptions(wordLength, previousClues));
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

  // See the matching guesses.length === 6 comment in handleLockIn - always false in practice.
  /* v8 ignore next */
  const lossHeading = guesses.length === 6 ? 'Too bad...' : 'I give up!';

  // hint is never actually empty - every setHint call passes a non-empty string - but keep the alert's height stable if that ever changes.
  /* v8 ignore next */
  const alertText = hint || '\u00a0';

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
          {gameState === GameState.Lost && <h2>{lossHeading}</h2>}
          {gameState !== GameState.Playing && <button onClick={handleReset}>Let&apos;s play again</button>}
        </div>
        <img src="./bot.png" alt="bot" />
        {gameState === GameState.Playing && (
          <BucketList wordLength={wordLength} guessWord={guesses[guesses.length - 1] || ''} clues={clues} />
        )}
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
        <p role="alert">{alertText}</p>
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
