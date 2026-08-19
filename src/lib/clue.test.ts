import { describe, expect, it } from 'vitest';
import { Difficulty } from './util';
import { Clue, clue, clueClass, clueWord, describeClue, foundReducer, toRegExp, violation } from './clue';

describe('clue', () => {
  it('marks letters correct, elsewhere, or absent', () => {
    expect(clue('stale', 'slate').map((c) => c.clue)).toEqual([
      Clue.Correct,
      Clue.Elsewhere,
      Clue.Correct,
      Clue.Elsewhere,
      Clue.Correct,
    ]);
  });

  it("doesn't clue a repeated letter more times than it appears in the target", () => {
    // target has one 'l'; guess has two, only the correctly placed one clues non-Absent
    expect(clue('llama', 'lucky').map((c) => c.clue)).toEqual([
      Clue.Correct,
      Clue.Absent,
      Clue.Absent,
      Clue.Absent,
      Clue.Absent,
    ]);
  });

  it('marks every letter correct for an exact match', () => {
    expect(clue('slate', 'slate').every((c) => c.clue === Clue.Correct)).toBe(true);
  });
});

describe('clueClass', () => {
  it('maps each clue to its CSS class', () => {
    expect(clueClass(Clue.Absent)).toBe('letter-absent');
    expect(clueClass(Clue.Elsewhere)).toBe('letter-elsewhere');
    expect(clueClass(Clue.Correct)).toBe('letter-correct');
  });
});

describe('clueWord', () => {
  it('maps each clue to a screen-reader word', () => {
    expect(clueWord(Clue.Absent)).toBe('no');
    expect(clueWord(Clue.Elsewhere)).toBe('elsewhere');
    expect(clueWord(Clue.Correct)).toBe('correct');
  });
});

describe('describeClue', () => {
  it('joins each letter with its clue word', () => {
    expect(describeClue(clue('cat', 'cot'))).toBe('C correct, A no, T correct');
  });
});

describe('violation', () => {
  it('allows anything on Normal difficulty', () => {
    expect(violation(Difficulty.Normal, [{ letter: 's', clue: Clue.Correct }], 'xxxxx')).toBeUndefined();
  });

  it('requires a green letter to stay in place on Hard', () => {
    const clues = [{ letter: 's', clue: Clue.Correct }];
    expect(violation(Difficulty.Hard, clues, 'xxxxx')).toBe('1st letter must be S');
  });

  it('requires a single yellow letter to be used on Hard', () => {
    const clues = [{ letter: 's', clue: Clue.Elsewhere }];
    expect(violation(Difficulty.Hard, clues, 'aaaaa')).toBe('Guess must contain S');
  });

  it('requires multiple copies of a repeated yellow letter on Hard', () => {
    const clues = [
      { letter: 's', clue: Clue.Elsewhere },
      { letter: 's', clue: Clue.Elsewhere },
    ];
    expect(violation(Difficulty.Hard, clues, 'aaaaa')).toBe('Guess must contain at least two Ss');
  });

  it('passes on Hard when greens stay put and yellows are used', () => {
    const clues = [{ letter: 's', clue: Clue.Correct }];
    expect(violation(Difficulty.Hard, clues, 's????')).toBeUndefined();
  });

  it("disallows placing a letter where it's already known not to be, on UltraHard", () => {
    const clues = [{ letter: 's', clue: Clue.Elsewhere }];
    expect(violation(Difficulty.UltraHard, clues, 's????')).toBe("1st letter can't be S");
  });

  it('requires a fully-absent letter to be omitted entirely, on UltraHard', () => {
    const clues = [{ letter: 's', clue: Clue.Absent }];
    expect(violation(Difficulty.UltraHard, clues, 'xsxxx')).toBe("Guess can't contain S");
  });

  it('requires the exact known count of a partially-absent letter, on UltraHard', () => {
    const clues = [
      { letter: 's', clue: Clue.Absent },
      { letter: 's', clue: Clue.Elsewhere },
    ];
    expect(violation(Difficulty.UltraHard, clues, 'xss??')).toBe('Guess must contain exactly one S');
  });

  it('passes on UltraHard when every constraint is satisfied', () => {
    const clues = [{ letter: 's', clue: Clue.Correct }];
    expect(violation(Difficulty.UltraHard, clues, 's????')).toBeUndefined();
  });
});

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
    // 'l' is Correct at position 0 and Absent at position 1 in the same row -
    // it must stay usable, or the target itself would fail to match.
    const re = toRegExp([clue('llama', 'lucky')]);
    expect(re.test('lucky')).toBe(true);
  });

  it('globally excludes a letter with no other clue in the row', () => {
    const re = toRegExp([clue('llama', 'rusty')]);
    expect(re.test('rusty')).toBe(true);
    expect(re.test('lucky')).toBe(false);
  });

  it('leaves a not-yet-clued position unconstrained', () => {
    // A row being edited (Row's default state) can have a letter with no clue at all.
    const row = clue('adieu', 'stale');
    row[0] = { letter: row[0].letter, clue: undefined };
    const re = toRegExp([row]);

    expect(re.source).toContain('(?=^.');
  });
});

describe('foundReducer', () => {
  it('accumulates correct letters by position across guesses', () => {
    const rows = [clue('stale', 'slate'), clue('slate', 'slate')];
    expect(rows.reduce(foundReducer, ['', '', '', '', ''])).toEqual(['s', 'l', 'a', 't', 'e']);
  });
});
