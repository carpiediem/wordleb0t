import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Clue } from '../lib/clue';

const tweetMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const twitterApiConstructorMock = vi.hoisted(() => vi.fn());

vi.mock('twitter-api-v2', () => ({
  TwitterApi: class {
    v2 = { tweet: tweetMock };
    constructor(...args: unknown[]) {
      twitterApiConstructorMock(...args);
    }
  },
}));

import { buildStatus, fetchTodaysAnswer, main, requireEnv, todayInNewYork } from './postDailyResult';

describe('todayInNewYork', () => {
  it('returns an ISO-formatted date', () => {
    expect(todayInNewYork()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('fetchTodaysAnswer', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('returns the parsed response on success', async () => {
    const body = { solution: 'slate', days_since_launch: 1234 };
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });

    await expect(fetchTodaysAnswer()).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('https://www.nytimes.com/svc/wordle/v2/'));
  });

  it('throws when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    await expect(fetchTodaysAnswer()).rejects.toThrow(/404/);
  });
});

describe('requireEnv', () => {
  const ORIGINAL = process.env.WORDLEB0T_TEST_VAR;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.WORDLEB0T_TEST_VAR;
    else process.env.WORDLEB0T_TEST_VAR = ORIGINAL;
  });

  it('returns the value when set', () => {
    process.env.WORDLEB0T_TEST_VAR = 'value';
    expect(requireEnv('WORDLEB0T_TEST_VAR')).toBe('value');
  });

  it('throws when unset', () => {
    delete process.env.WORDLEB0T_TEST_VAR;
    expect(() => requireEnv('WORDLEB0T_TEST_VAR')).toThrow('WORDLEB0T_TEST_VAR');
  });
});

describe('buildStatus', () => {
  const steps = [{ guess: 'slate', clues: [{ letter: 's', clue: Clue.Correct }] }];

  it('shows the guess count when solved', () => {
    expect(buildStatus(1234, 3, steps)).toBe('Wordleb0t 1234 3/6\n\n🟩');
  });

  it('shows X when unsolved', () => {
    expect(buildStatus(1234, null, steps)).toBe('Wordleb0t 1234 X/6\n\n🟩');
  });
});

describe('main', () => {
  const fetchMock = vi.fn();
  const ENV_VARS = ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN_SECRET'];

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ solution: 'slate', days_since_launch: 1234 }),
    });
    ENV_VARS.forEach((name) => (process.env[name] = `${name}-value`));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    tweetMock.mockClear();
    twitterApiConstructorMock.mockClear();
    ENV_VARS.forEach((name) => delete process.env[name]);
    vi.restoreAllMocks();
  });

  it('solves the day and tweets the result', async () => {
    await main();

    expect(twitterApiConstructorMock).toHaveBeenCalledWith({
      appKey: 'TWITTER_API_KEY-value',
      appSecret: 'TWITTER_API_SECRET-value',
      accessToken: 'TWITTER_ACCESS_TOKEN-value',
      accessSecret: 'TWITTER_ACCESS_TOKEN_SECRET-value',
    });
    expect(tweetMock).toHaveBeenCalledTimes(1);
    expect(tweetMock.mock.calls[0][0]).toMatch(/^Wordleb0t 1234 \d\/6\n\n/);
  });
});
