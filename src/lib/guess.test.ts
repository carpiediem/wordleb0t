import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clue } from './clue';
import { colorToRegExp, countRemaining, makeGuess, toRegExp } from './guess';

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

  it('narrows candidates as more clues accumulate', () => {
    const clues = [clue('adieu', 'stale')];
    const guesses = makeGuess(5, clues);
    guesses.forEach((word) => expect(toRegExp(clues).test(word)).toBe(true));
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
