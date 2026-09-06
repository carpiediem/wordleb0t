import dictionary from '../data/dictionary-ranked.json';
import targets from '../data/targets.json';
import { clue as clueFor, Clue, CluedLetter } from './clue';

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

const scoredWordsByWord = new Map(scoredWords.map((scoredWord) => [scoredWord.word, scoredWord]));

export function toRegExp(clues: CluedLetter[][]) {
  if (clues.length === 0) return /(?:)/;

  const found = clues[0].map((_) => '');
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

        if (!row.some((otherPosition) => otherPosition.letter === letter && otherPosition.clue)) {
          nowhere.push(letter);
        }
      }
    });
  });

  const nowherePattern = `(?=^[^${nowhere.join('')}]+$)`;
  const somewherePattern = somewhere
    .filter((letter: string) => !found.includes(letter))
    .map((letter: string) => `(?=.*${letter})`)
    .join('');
  const byPositionPattern = exclusions
    .map((letters, index) => {
      return found[index] || (letters.length ? `[^${letters.join('')}]` : '.');
    })
    .join('');
  const re = new RegExp([somewherePattern, nowherePattern, `(?=^${byPositionPattern}$)`].join(''));

  // console.log({ somewherePattern, nowherePattern, byPositionPattern, re });
  return re;
}

function colorIs(colorClue: string, index: number, color: string): boolean {
  return Array.from(colorClue)[index] === color;
}

export function colorToRegExp(word: string, colorClue: string) {
  const letters = Array.from(word);

  const nowhere = letters.filter((letter, index) => (colorIs(colorClue, index, '⬛') ? letter : ''));
  const found = letters.map((letter, index) => (colorIs(colorClue, index, '🟩') ? letter : ''));
  const somewhere = letters.filter((letter, index) => (colorIs(colorClue, index, '🟨') ? letter : ''));
  const exclusions = letters.map((letter, index) => (colorIs(colorClue, index, '🟨') ? [letter] : []));

  const nowherePattern = `(?=^[^${nowhere.join('')}]+$)`;
  const somewherePattern = somewhere
    .filter((letter: string) => !found.includes(letter))
    .map((letter: string) => `(?=.*${letter})`)
    .join('');
  const byPositionPattern = exclusions
    .map((letters, index) => {
      return found[index] || (letters.length ? `[^${letters.join('')}]` : '.');
    })
    .join('');

  return new RegExp([somewherePattern, nowherePattern, `(?=^${byPositionPattern}$)`].join(''));
}

function score({ lettersRank, usageRank }: ScoredWord, guessIndex: number) {
  return dictionary.length - lettersRank + (usageRank === -1 ? 0 : 0.5 * guessIndex * (targets.length - usageRank));
}

// Ranks by the usual commonality/usage score, highest first.
export function compareRanks(a: ScoredWord, b: ScoredWord, guessIndex: number): number {
  return score(b, guessIndex) - score(a, guessIndex);
}

function rankGuess(remaining: ScoredWord[], guessIndex: number): { word: string }[] {
  return [...remaining].sort((a, b) => compareRanks(a, b, guessIndex));
}

// Below this many remaining candidates, a "scout" guess (see below) can't
// realistically split the field any better than just guessing a candidate
// outright, and forfeits candidates' own chance of being the answer for no
// benefit. Above it, candidates sharing most of their letters (e.g. wafer/
// wager/hater/later, or the bound/found/hound/mound/pound/wound cluster)
// become common enough that testing unconfirmed letters via a non-candidate
// word pays for itself. See #31.
const SCOUT_MIN_REMAINING = 3;

// Scoring a scout costs one entropy() pass per remaining candidate, so the
// scout pool size is chosen as SCOUT_POOL_BUDGET / (number remaining) - a
// rough constant-time budget per guess regardless of how wide the field is.
const SCOUT_POOL_BUDGET = 3_000_000;
// Always consider at least this many of the most letter-common words, even
// when the field is wide enough that the budget above would allow fewer.
const SCOUT_POOL_MIN = 500;

// Packs the gray/yellow/green clue that `guessWord` would get against
// `target` into a single number, so identical clues (e.g. two different
// targets that would both turn "wafer" gray-yellow-gray-green-gray) collapse
// to the same signature and can be grouped with a plain Map. Each letter's
// clue is one of 3 values (Clue.Absent/Elsewhere/Correct), so reading the
// per-letter clues as base-3 "digits" gives every distinct clue pattern its
// own signature with no collisions.
function clueSignature(guessWord: string, target: string): number {
  let signature = 0;
  for (const { clue } of clueFor(guessWord, target)) signature = signature * 3 + clue!;
  return signature;
}

// Shannon entropy, in bits, of the partition `guessWord` induces over
// `remaining` when each remaining candidate is equally likely to be the
// answer. Higher entropy means the guess is expected to eliminate more
// candidates regardless of which clue comes back.
function entropy(guessWord: string, remaining: string[]): number {
  // Group `remaining` by the clue signature guessing `guessWord` would
  // produce against each of them - e.g. every candidate that would turn
  // "wafer" all-gray lands in one bucket, every one that would turn it
  // green-gray-gray-gray-yellow lands in another, and so on. A guess that
  // spreads candidates evenly across many small buckets is more informative
  // (higher entropy below) than one that dumps most of them into a single
  // bucket, since the clue that comes back will narrow the field by more.
  const buckets = new Map<number, number>();
  for (const candidate of remaining) {
    const signature = clueSignature(guessWord, candidate);
    buckets.set(signature, (buckets.get(signature) ?? 0) + 1);
  }

  let bits = 0;
  for (const count of buckets.values()) {
    const p = count / remaining.length;
    bits -= p * Math.log2(p);
  }
  return bits;
}

type ScoutCandidate = {
  word: string;
  bits: number;
  isCandidate: boolean;
  scoredWord?: ScoredWord;
};

// Ranks by information gain (entropy) first. Ties - including an exact tie
// between a real candidate and a scouting word - favor the candidate, since
// guessing it also has a chance of winning outright; further ties fall back
// to the usual commonality/usage score.
export function compareScouts(a: ScoutCandidate, b: ScoutCandidate, guessIndex: number): number {
  if (Math.abs(a.bits - b.bits) > 1e-9) return b.bits - a.bits;
  if (a.isCandidate !== b.isCandidate) return a.isCandidate ? -1 : 1;
  const scoreA = a.scoredWord ? score(a.scoredWord, guessIndex) : -Infinity;
  const scoreB = b.scoredWord ? score(b.scoredWord, guessIndex) : -Infinity;
  return scoreB - scoreA;
}

// Scoring every scout against every remaining candidate is the expensive
// part of this (see below), and the same remaining set recurs constantly
// when backtesting many answers against the same opening guesses - e.g.
// every answer whose first guess comes back all-gray reaches guess 2 with
// an identical remaining set. Caching the ranked result per (guessIndex,
// remaining set) avoids redoing that work for a set already seen.
const scoutCache = new Map<string, { word: string }[]>();

// Picks a guess to maximize information gain about which remaining candidate
// is the answer, considering scouting words that aren't themselves candidates
// (i.e. that don't satisfy every clue so far) when the field is wide enough
// for that to be worthwhile.
function scoutGuess(wordLength: number, remaining: ScoredWord[], guessIndex: number): { word: string }[] {
  const remainingWords = remaining.map(({ word }) => word);

  const cacheKey = `${guessIndex}:${remainingWords.join(',')}`;
  const cached = scoutCache.get(cacheKey);
  if (cached) return cached;

  const remainingSet = new Set(remainingWords);

  // The best scout for a given remaining set is often a word that's globally
  // rare (e.g. "lymph", to split up bound/found/hound/mound/pound/wound):
  // what matters is how well it happens to cover this cluster's unconfirmed
  // letters, not how common its letters are overall. So every dictionary
  // word of the right length is worth considering as a scout - but scoring
  // each of them costs one entropy() pass over `remaining`, so the pool size
  // is capped in inverse proportion to how large `remaining` already is: a
  // handful of remaining candidates (mound's cluster) can afford the entire
  // dictionary as scouts, while hundreds of remaining candidates (typical
  // just after the opening guess) need a smaller pool to stay responsive.
  const poolSize = Math.max(SCOUT_POOL_MIN, Math.floor(SCOUT_POOL_BUDGET / remainingWords.length));
  const commonScouts = scoredWords.filter(({ word }) => word.length === wordLength).slice(0, poolSize);
  const pool = new Set([...remainingWords, ...commonScouts.map(({ word }) => word)]);

  const ranked = Array.from(pool)
    .map((word): ScoutCandidate => ({
      word,
      bits: entropy(word, remainingWords),
      isCandidate: remainingSet.has(word),
      scoredWord: scoredWordsByWord.get(word),
    }))
    .sort((a, b) => compareScouts(a, b, guessIndex));

  scoutCache.set(cacheKey, ranked);
  return ranked;
}

export function makeGuess(wordLength: number, clues: CluedLetter[][] = [], maxGuesses?: number): string[] {
  const re = toRegExp(clues);

  if (clues.length === 0 && typeof localStorage !== 'undefined' && localStorage.INITIAL_GUESS?.length === wordLength) {
    return [localStorage.INITIAL_GUESS];
  }

  const remaining = scoredWords.filter(({ word }) => word.length === wordLength && re.test(word));

  // A scout is only worth guessing if there's a later guess to act on what it
  // reveals - on the last available guess it has no better chance of winning
  // than any other non-candidate word (i.e. none), while every remaining
  // candidate has some chance. maxGuesses is optional (callers that aren't
  // tracking a guess limit, like the worksheet generator, can omit it), in
  // which case there's no such cutoff.
  const guessesLeft = maxGuesses === undefined ? Infinity : maxGuesses - clues.length;
  // For refernece, if we remove the clues.length criterion and run scoutGuess() against
  // the full dictionary, the top suggestions are tares, lares,  rales, rates; not much
  // more optimized than what you get from rankGuess(): raine, irate, retia. The downside
  // is that it takes ~168 million clue simulations and more than 25 seconds.
  const shouldScout = clues.length > 0 && remaining.length > SCOUT_MIN_REMAINING && guessesLeft > 1;

  const guesses = shouldScout ? scoutGuess(wordLength, remaining, clues.length) : rankGuess(remaining, clues.length);

  return guesses.slice(0, 8).map(({ word }) => word);
}

export function countRemaining(wordLength: number, clues: CluedLetter[][] = []): number {
  const re = toRegExp(clues);
  return scoredWords.reduce((count, { word }) => (word.length === wordLength && re.test(word) ? count + 1 : count), 0);
}
