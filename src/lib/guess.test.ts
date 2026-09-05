import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clue } from './clue';
import { colorToRegExp, compareRanks, compareScouts, countRemaining, makeGuess, toRegExp } from './guess';

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

  it('returns candidates consistent with the clues so far, best guesses first', () => {
    const guesses = makeGuess(5);
    expect(guesses.length).toBeGreaterThan(0);
    expect(guesses.length).toBeLessThanOrEqual(8);
    guesses.forEach((word) => expect(word).toHaveLength(5));
  });

  it('narrows candidates as more clues accumulate, staying consistent with the clues once few remain', () => {
    // adieu vs. stale alone still leaves a wide field, so scouting may
    // suggest a guess that doesn't itself satisfy every clue (see #31) -
    // narrow further first so this targets the small-field case, where every
    // guess is still expected to be a candidate consistent with the clues.
    const clues = [clue('adieu', 'stale'), clue('raile', 'stale')];
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

  it('uses localStorage.INITIAL_GUESS as the opening guess when it matches the word length', () => {
    localStorageMock.INITIAL_GUESS = 'slate';
    expect(makeGuess(5)).toEqual(['slate']);
  });

  it('ignores INITIAL_GUESS when its length differs from the requested word length', () => {
    localStorageMock.INITIAL_GUESS = 'slate';
    const guesses = makeGuess(4);
    expect(guesses).not.toEqual(['slate']);
  });
});

describe('compareScouts', () => {
  it('ranks higher entropy first', () => {
    const higher = { word: 'a', bits: 2, isCandidate: false };
    const lower = { word: 'b', bits: 1, isCandidate: false };
    expect(compareScouts(higher, lower, 1)).toBeLessThan(0);
    expect(compareScouts(lower, higher, 1)).toBeGreaterThan(0);
  });

  it('breaks an entropy tie in favor of an actual candidate', () => {
    const candidate = { word: 'a', bits: 1, isCandidate: true };
    const scout = { word: 'b', bits: 1, isCandidate: false };
    expect(compareScouts(candidate, scout, 1)).toBeLessThan(0);
    expect(compareScouts(scout, candidate, 1)).toBeGreaterThan(0);
  });

  it('breaks a further tie by usage/commonality score', () => {
    const common = { word: 'a', bits: 1, isCandidate: true, scoredWord: { word: 'a', lettersRank: 0, usageRank: 0 } };
    const rare = { word: 'b', bits: 1, isCandidate: true, scoredWord: { word: 'b', lettersRank: 100, usageRank: -1 } };
    expect(compareScouts(common, rare, 1)).toBeLessThan(0);
  });

  it('treats a missing scoredWord as the lowest possible score', () => {
    const scored = { word: 'a', bits: 1, isCandidate: true, scoredWord: { word: 'a', lettersRank: 0, usageRank: 0 } };
    const unscored = { word: 'b', bits: 1, isCandidate: true };
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
