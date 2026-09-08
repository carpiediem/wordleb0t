import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clue } from './clue';
import {
  colorToRegExp,
  compareRanks,
  compareScouts,
  countRemaining,
  getBuckets,
  makeGuess,
  makeGuessOptions,
  toRegExp,
} from './guess';
import { Clue } from './clue';

describe('toRegExp', () => {
  it('matches anything when there are no clues', () => {
    expect(toRegExp([]).test('anything')).toBe(true);
  });

  it('builds a pattern from correct and elsewhere clues that matches the target', () => {
    const re = toRegExp([clue('stale', 'slate')]);
    expect(re.test('slate')).toBe(true);
    expect(re.test('stale')).toBe(false);
  });

  it("doesn't globally exclude a letter that's absent in one slot but known elsewhere in the same row", () => {
    const re = toRegExp([clue('llama', 'lucky')]);
    expect(re.test('lucky')).toBe(true);
  });

  it('globally excludes a letter with no other clue in the row', () => {
    const re = toRegExp([clue('llama', 'rusty')]);
    expect(re.test('rusty')).toBe(true);
    expect(re.test('lucky')).toBe(false);
  });

  it('leaves a not-yet-clued position unconstrained', () => {
    const row = clue('adieu', 'stale');
    row[0] = { letter: row[0].letter, clue: undefined };
    const re = toRegExp([row]);

    expect(re.source).toContain('(?=^.');
  });
});

describe('colorToRegExp', () => {
  it('builds a pattern from a color-emoji clue string', () => {
    // c correct, r absent, a elsewhere (not at index 2), n absent, e absent
    const re = colorToRegExp('crane', '🟩⬛🟨⬛⬛');

    expect(re.test('caflu')).toBe(true); // starts with c, has an 'a' not at index 2, no r/n/e
    expect(re.test('crash')).toBe(false); // contains the globally-excluded 'r'
    expect(re.test('cwxyz')).toBe(false); // missing the required 'a'
    expect(re.test('cwaxy')).toBe(false); // 'a' lands on the excluded index 2
  });
});

describe('makeGuess', () => {
  // Real localStorage support in jsdom/Node varies by Node version (some
  // defer to Node's own build-flag-gated implementation), so stub it with a
  // plain object rather than depending on the environment providing one.
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns candidates consistent with the clues so far, best guesses first, capped at 8', () => {
    // A curated list (see #41) replaces the dynamic ranking for the very
    // first guess when word length 5 - use a second guess instead to
    // exercise the ordinary dynamic-ranking, 8-result-cap path.
    const clues = [clue('adieu', 'stale')];
    const guesses = makeGuess(5, clues);
    expect(guesses.length).toBeGreaterThan(0);
    expect(guesses.length).toBeLessThanOrEqual(8);
    guesses.forEach((word) => expect(word).toHaveLength(5));
  });

  it('narrows candidates as more clues accumulate, staying consistent with the clues once few remain', () => {
    // adieu vs. stale alone still leaves a wide field, so scouting may
    // suggest a guess that doesn't itself satisfy every clue (see #31) -
    // narrow further first so this targets the small-field case, where every
    // guess is still expected to be a candidate consistent with the clues.
    const clues = [clue('adieu', 'stale'), clue('teils', 'stale')];
    const guesses = makeGuess(5, clues);
    guesses.forEach((word) => expect(toRegExp(clues).test(word)).toBe(true));
  });

  it('scouts a guess outside the remaining candidates to split up a wide, ambiguous field', () => {
    // wafer/wager/hater/later/eager/... all match `.a.er`, sharing every
    // letter but the first - no candidate can test more than one of those
    // first letters at once, but a non-candidate guess can.
    const clues = [clue('nervy', 'water')];
    const guesses = makeGuess(5, clues);
    const re = toRegExp(clues);
    expect(guesses.some((word) => !re.test(word))).toBe(true);
  });

  it("doesn't scout on the last available guess, even with a wide field", () => {
    // Same wide field as above, but with only one guess left: a scout has no
    // chance of being the answer, while every candidate has some chance, so
    // every guess offered must still be consistent with the clues.
    const clues = [clue('nervy', 'water')];
    const guesses = makeGuess(5, clues, clues.length + 1);
    const re = toRegExp(clues);
    guesses.forEach((word) => expect(re.test(word)).toBe(true));
  });

  it('scouts again once more than one guess remains', () => {
    const clues = [clue('nervy', 'water')];
    const guesses = makeGuess(5, clues, clues.length + 2);
    const re = toRegExp(clues);
    expect(guesses.some((word) => !re.test(word))).toBe(true);
  });

  it('uses localStorage.INITIAL_GUESS as the opening guess when it matches the word length', () => {
    localStorageMock.INITIAL_GUESS = 'slate';
    expect(makeGuess(5)).toEqual(['slate']);
  });

  it('ignores INITIAL_GUESS when its length differs from the requested word length', () => {
    localStorageMock.INITIAL_GUESS = 'slate';
    const guesses = makeGuess(4);
    expect(guesses).not.toEqual(['slate']);
  });

  it('uses the curated opening list for a word length that has one (#41)', () => {
    const guesses = makeGuess(5);
    expect(guesses).toContain('raine'); // rankGuess()'s own top pick
    expect(guesses).toContain('tares'); // scoutGuess()'s top pick by entropy
    expect(guesses).toContain('adieu'); // a popular real-player opener
  });

  it("falls back to the dynamic ranking for a word length that isn't curated", () => {
    const guesses = makeGuess(4);
    expect(guesses).not.toContain('adieu'); // 5 letters, couldn't appear for length 4 anyway
    guesses.forEach((word) => expect(word).toHaveLength(4));
  });
});

describe('makeGuessOptions', () => {
  it('includes bucketCount/largestBucket metadata for scouted options', () => {
    const clues = [clue('nervy', 'water')];
    const remaining = countRemaining(5, clues);
    const options = makeGuessOptions(5, clues);

    expect(options.length).toBeGreaterThan(0);
    options.forEach(({ bucketCount, largestBucket }) => {
      expect(bucketCount).toBeGreaterThan(0);
      expect(bucketCount).toBeLessThanOrEqual(remaining);
      expect(largestBucket).toBeGreaterThan(0);
      expect(largestBucket).toBeLessThanOrEqual(remaining);
    });
  });

  it("omits metadata for small-field options that weren't scored against the remaining field", () => {
    const clues = [clue('adieu', 'stale'), clue('teils', 'stale')];
    const options = makeGuessOptions(5, clues);

    options.forEach(({ bucketCount, largestBucket }) => {
      expect(bucketCount).toBeUndefined();
      expect(largestBucket).toBeUndefined();
    });
  });

  it('includes precomputed metadata for every curated opening option (#41)', () => {
    const options = makeGuessOptions(5);

    expect(options.length).toBeGreaterThan(8); // wider than the usual 8-result cap
    options.forEach(({ bucketCount, largestBucket }) => {
      expect(bucketCount).toBeGreaterThan(0);
      expect(largestBucket).toBeGreaterThan(0);
    });
  });
});

describe('compareScouts', () => {
  const scoutCandidate = (overrides: Partial<Parameters<typeof compareScouts>[0]>) => ({
    word: 'a',
    bits: 0,
    bucketCount: 0,
    largestBucket: 0,
    isCandidate: false,
    ...overrides,
  });

  it('ranks higher entropy first', () => {
    const higher = scoutCandidate({ word: 'a', bits: 2 });
    const lower = scoutCandidate({ word: 'b', bits: 1 });
    expect(compareScouts(higher, lower, 1)).toBeLessThan(0);
    expect(compareScouts(lower, higher, 1)).toBeGreaterThan(0);
  });

  it('breaks an entropy tie in favor of an actual candidate', () => {
    const candidate = scoutCandidate({ word: 'a', bits: 1, isCandidate: true });
    const scout = scoutCandidate({ word: 'b', bits: 1, isCandidate: false });
    expect(compareScouts(candidate, scout, 1)).toBeLessThan(0);
    expect(compareScouts(scout, candidate, 1)).toBeGreaterThan(0);
  });

  it('breaks a further tie by usage/commonality score', () => {
    const common = scoutCandidate({
      word: 'a',
      bits: 1,
      isCandidate: true,
      scoredWord: { word: 'a', lettersRank: 0, usageRank: 0 },
    });
    const rare = scoutCandidate({
      word: 'b',
      bits: 1,
      isCandidate: true,
      scoredWord: { word: 'b', lettersRank: 100, usageRank: -1 },
    });
    expect(compareScouts(common, rare, 1)).toBeLessThan(0);
  });

  it('treats a missing scoredWord as the lowest possible score', () => {
    const scored = scoutCandidate({
      word: 'a',
      bits: 1,
      isCandidate: true,
      scoredWord: { word: 'a', lettersRank: 0, usageRank: 0 },
    });
    const unscored = scoutCandidate({ word: 'b', bits: 1, isCandidate: true });
    expect(compareScouts(scored, unscored, 1)).toBeLessThan(0);
    expect(compareScouts(unscored, scored, 1)).toBeGreaterThan(0);
  });
});

describe('compareRanks', () => {
  it('ranks more common letters first when usage is equal', () => {
    const common = { word: 'a', lettersRank: 0, usageRank: -1 };
    const rare = { word: 'b', lettersRank: 100, usageRank: -1 };
    expect(compareRanks(common, rare, 1)).toBeLessThan(0);
  });

  it('ranks a more frequently used target higher, weighted by guess index', () => {
    const frequent = { word: 'a', lettersRank: 0, usageRank: 0 };
    const infrequent = { word: 'b', lettersRank: 0, usageRank: 1000 };
    expect(compareRanks(frequent, infrequent, 1)).toBeLessThan(0);
  });

  it('ignores the usage bonus entirely on the first guess (guessIndex 0)', () => {
    const frequent = { word: 'a', lettersRank: 0, usageRank: 0 };
    const infrequent = { word: 'b', lettersRank: 0, usageRank: 1000 };
    expect(compareRanks(frequent, infrequent, 0)).toBe(0);
  });

  it('gives no usage bonus to a word absent from the target list', () => {
    const nonTarget = { word: 'a', lettersRank: 0, usageRank: -1 };
    const target = { word: 'b', lettersRank: 0, usageRank: 0 };
    expect(compareRanks(nonTarget, target, 1)).toBeGreaterThan(0);
  });
});

describe('getBuckets', () => {
  it('groups every remaining word by the clue pattern the guess would give it', () => {
    const buckets = getBuckets(5, 'crane');
    const remaining = countRemaining(5);

    const totalWords = buckets.reduce((sum, { words }) => sum + words.length, 0);
    expect(totalWords).toBe(remaining);
  });

  it('orders buckets largest first', () => {
    const buckets = getBuckets(5, 'crane');
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].words.length).toBeLessThanOrEqual(buckets[i - 1].words.length);
    }
  });

  it("gives every bucket's clue pattern the same length as the guess word", () => {
    const buckets = getBuckets(5, 'crane');
    buckets.forEach(({ clues }) => expect(clues).toHaveLength(5));
  });

  it('marks the all-correct bucket when the guess itself is the only remaining candidate', () => {
    const clues = [clue('crane', 'crane')];
    const buckets = getBuckets(5, 'crane', clues);

    expect(buckets).toEqual([{ clues: Array(5).fill(Clue.Correct), words: ['crane'] }]);
  });

  it('respects the clues given so far when narrowing the remaining field', () => {
    const clues = [clue('adieu', 'stale')];
    const withClues = getBuckets(5, 'crane', clues);
    const withoutClues = getBuckets(5, 'crane');

    const totalWithClues = withClues.reduce((sum, { words }) => sum + words.length, 0);
    const totalWithoutClues = withoutClues.reduce((sum, { words }) => sum + words.length, 0);
    expect(totalWithClues).toBeLessThan(totalWithoutClues);
  });

  it('sorts the words within a bucket', () => {
    const buckets = getBuckets(5, 'crane');
    buckets.forEach(({ words }) => expect(words).toEqual([...words].sort()));
  });
});

describe('countRemaining', () => {
  it('counts candidates consistent with the clues so far', () => {
    expect(countRemaining(5)).toBeGreaterThan(0);
  });

  it('returns fewer candidates as clues narrow the field', () => {
    const withoutClues = countRemaining(5);
    const withClues = countRemaining(5, [clue('adieu', 'stale')]);
    expect(withClues).toBeLessThan(withoutClues);
  });
});
