import { afterEach, describe, expect, it, vi } from 'vitest';
import { Difficulty, describeSeed, englishNumbers, ordinal, pick, resetRng, speak, urlParam } from './util';

describe('Difficulty', () => {
  it('has the three expected levels', () => {
    expect(Difficulty.Normal).toBeDefined();
    expect(Difficulty.Hard).toBeDefined();
    expect(Difficulty.UltraHard).toBeDefined();
  });
});

describe('urlParam', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('returns null when the param is absent', () => {
    window.history.pushState({}, '', '/');
    expect(urlParam('seed')).toBeNull();
  });

  it('returns the param value when present', () => {
    window.history.pushState({}, '', '/?seed=20220120');
    expect(urlParam('seed')).toBe('20220120');
  });

  it('returns null outside a browser environment', () => {
    vi.stubGlobal('window', undefined);
    expect(urlParam('seed')).toBeNull();
  });
});

describe('pick', () => {
  it('returns an element chosen via the current RNG', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const array = ['a', 'b', 'c', 'd'];

    expect(pick(array)).toBe('c'); // Math.floor(4 * 0.5) === 2

    randomSpy.mockRestore();
  });
});

describe('resetRng', () => {
  it('reseeds without throwing, and pick keeps working afterward', () => {
    resetRng();
    expect(['x']).toContain(pick(['x']));
  });
});

describe('seeded RNG', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('produces a deterministic sequence, restartable via resetRng', async () => {
    vi.resetModules();
    window.history.pushState({}, '', '/?seed=20220120');
    const seededUtil = await import('./util');

    expect(seededUtil.seed).toBe(20220120);

    const array = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const firstRun = [seededUtil.pick(array), seededUtil.pick(array), seededUtil.pick(array)];

    seededUtil.resetRng();
    const secondRun = [seededUtil.pick(array), seededUtil.pick(array), seededUtil.pick(array)];

    expect(secondRun).toEqual(firstRun);
  });
});

describe('speak', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces text via an aria-live region and removes it after a delay', () => {
    vi.useFakeTimers();
    speak('hello', 'polite');

    vi.advanceTimersByTime(100);
    const el = document.querySelector('[aria-live="polite"]');
    expect(el?.innerHTML).toBe('hello');

    vi.advanceTimersByTime(900);
    expect(document.querySelector('[aria-live="polite"]')).toBeNull();
  });

  it('defaults to assertive priority', () => {
    vi.useFakeTimers();
    speak('hi');

    vi.advanceTimersByTime(100);
    expect(document.querySelector('[aria-live="assertive"]')).not.toBeNull();
    vi.advanceTimersByTime(900);
  });

  it("falls back to 'polite' if priority is explicitly falsy", () => {
    vi.useFakeTimers();
    speak('hi', '' as unknown as 'polite');

    vi.advanceTimersByTime(100);
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
    vi.advanceTimersByTime(900);
  });
});

describe('ordinal', () => {
  it('suffixes 1, 2, and 3 with st/nd/rd', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
  });

  it('suffixes everything else with th, including the 11-13 exceptions', () => {
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
  });

  it('handles multi-digit numbers', () => {
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(100)).toBe('100th');
    expect(ordinal(111)).toBe('111th');
  });
});

describe('englishNumbers', () => {
  it('spells out zero through eleven', () => {
    expect(englishNumbers).toEqual([
      'zero',
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
    ]);
  });
});

describe('describeSeed', () => {
  it('formats a valid YYYYMMDD seed as a long-form date', () => {
    expect(describeSeed(20220120)).toBe('January 20, 2022');
  });

  it('accepts Feb 29 on a standard leap year (divisible by 4, not by 25)', () => {
    expect(describeSeed(20240229)).toBe('February 29, 2024');
  });

  it('accepts Feb 29 on a century year divisible by 400-equivalent (divisible by 16 among /25 years)', () => {
    expect(describeSeed(20000229)).toBe('February 29, 2000');
  });

  it('rejects Feb 29 on a century year not divisible by that 16 rule', () => {
    expect(describeSeed(21000229)).toBe('seed 21000229');
  });

  it('falls back to "seed N" for a year outside 2000-2100', () => {
    expect(describeSeed(19990101)).toBe('seed 19990101');
  });

  it('falls back to "seed N" for an out-of-range month', () => {
    expect(describeSeed(20221301)).toBe('seed 20221301');
  });

  it('falls back to "seed N" for a day beyond the month\'s length', () => {
    expect(describeSeed(20220431)).toBe('seed 20220431'); // April has 30 days
  });
});
