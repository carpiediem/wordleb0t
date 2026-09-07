import type { GuessOption } from '../lib/guess';

// Curated opening-guess options, keyed by word length. Used in place of
// rankGuess()'s dynamic (and less informative) picks for the very first
// guess of a game - see #41. Word lengths without an entry here fall back
// to the normal dynamic ranking.
//
// The length-5 list combines three sources:
// - rankGuess()'s own top picks (raine, irate, retia): the most
//   letter-common real dictionary words.
// - scoutGuess()'s top picks by information gain (tares, lares, rales,
//   rates): found by scoring every one of the ~13,000 length-5 dictionary
//   words against every other one and keeping the highest-entropy results.
//   That full search takes ~25s, so it's precomputed here once rather than
//   run at the start of every game (see #31/#34).
// - words popular among real Wordle players (adieu, audio, stare, slate,
//   raise, crane, arise).
//
// bucketCount/largestBucket are computed the same way scoutGuess() computes
// them for any other guess: against every length-5 dictionary word (the
// full field a fresh game starts with), how many distinct clue-pattern
// groups does this guess split it into, and how big is the largest one.
//
// Regenerate this list (and its metadata) if the dictionary changes enough
// to plausibly shift these rankings.
export const openingGuesses: Record<number, GuessOption[]> = {
  5: [
    { word: 'raine', bucketCount: 176, largestBucket: 1207 },
    { word: 'irate', bucketCount: 163, largestBucket: 1184 },
    { word: 'retia', bucketCount: 182, largestBucket: 1195 },
    { word: 'tares', bucketCount: 212, largestBucket: 858 },
    { word: 'lares', bucketCount: 192, largestBucket: 832 },
    { word: 'rales', bucketCount: 182, largestBucket: 832 },
    { word: 'rates', bucketCount: 196, largestBucket: 858 },
    { word: 'adieu', bucketCount: 121, largestBucket: 1709 },
    { word: 'audio', bucketCount: 141, largestBucket: 2202 },
    { word: 'stare', bucketCount: 176, largestBucket: 858 },
    { word: 'slate', bucketCount: 190, largestBucket: 865 },
    { word: 'raise', bucketCount: 178, largestBucket: 882 },
    { word: 'crane', bucketCount: 168, largestBucket: 1578 },
    { word: 'arise', bucketCount: 180, largestBucket: 882 },
  ],
};
