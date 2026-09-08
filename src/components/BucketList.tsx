import { clueClass, CluedLetter } from '../lib/clue';
import { getBuckets } from '../lib/guess';

interface BucketListProps {
  wordLength: number;
  guessWord: string;
  clues: CluedLetter[][];
}

// Shows every distinct clue pattern the current guess could produce against
// the words still in play, and how many words would produce it - the full
// breakdown that GuessSelect's 🪣/📉 stats only ever summarize (see #43).
export function BucketList({ wordLength, guessWord, clues }: BucketListProps) {
  if (!guessWord) return null;

  const buckets = getBuckets(wordLength, guessWord, clues);

  return (
    <ul className="BucketList">
      {buckets.map((bucket, index) => (
        <li key={index} className="BucketList-bucket" title={bucket.words.join(', ')}>
          <span className="BucketList-pattern">
            {bucket.clues.map((letterClue, letterIndex) => (
              <span key={letterIndex} className={`BucketList-tile ${clueClass(letterClue)}`} aria-hidden="true" />
            ))}
          </span>
          <span className="BucketList-count">{bucket.words.length.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
