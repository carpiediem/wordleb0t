import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Clue } from '../lib/clue';

const tweetMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const twitterApiConstructorMock = vi.hoisted(() => vi.fn());

const MockApiResponseError = vi.hoisted(
  () =>
    class MockApiResponseError extends Error {
      data: Record<string, unknown>;
      constructor(data: Record<string, unknown>) {
        super('Request failed');
        this.data = data;
      }
    },
);

vi.mock('twitter-api-v2', () => ({
  TwitterApi: class {
    v2 = { tweet: tweetMock };
    constructor(...args: unknown[]) {
      twitterApiConstructorMock(...args);
    }
  },
  ApiResponseError: MockApiResponseError,
}));

import {
  buildStatus,
  describeError,
  fetchTodaysAnswer,
  main,
  requireEnv,
  todayInNewYork,
  writeFailureSummary,
} from './postDailyResult';

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

    await expect(fetchTodaysAnswer('2026-08-19')).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith('https://www.nytimes.com/svc/wordle/v2/2026-08-19.json');
  });

  it('throws when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    await expect(fetchTodaysAnswer('2026-08-19')).rejects.toThrow(/404/);
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
  const footer = '\n\n#Wordle1234\nhttps://carpiediem.github.io/wordleb0t';

  it('shows the guess count when solved', () => {
    expect(buildStatus(1234, '2026-08-19', 3, steps)).toBe(`Wordle 1234 August 19, 2026 3/6\n\n🟩${footer}`);
  });

  it('shows X when unsolved', () => {
    expect(buildStatus(1234, '2026-08-19', null, steps)).toBe(`Wordle 1234 August 19, 2026 X/6\n\n🟩${footer}`);
  });
});

describe('describeError', () => {
  it("returns the API's problem title when present", () => {
    const error = new MockApiResponseError({ title: 'Payment Required', detail: 'credits depleted' });
    expect(describeError(error)).toBe('Payment Required');
  });

  it('falls back to the message for a plain Error', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
  });

  it('falls back to String() for a non-Error value', () => {
    expect(describeError('boom')).toBe('boom');
  });
});

describe('writeFailureSummary', () => {
  const ORIGINAL_SUMMARY_PATH = process.env.GITHUB_STEP_SUMMARY;
  let tempDir: string;
  let summaryPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'wordleb0t-'));
    summaryPath = join(tempDir, 'summary.md');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    if (ORIGINAL_SUMMARY_PATH === undefined) delete process.env.GITHUB_STEP_SUMMARY;
    else process.env.GITHUB_STEP_SUMMARY = ORIGINAL_SUMMARY_PATH;
  });

  it('appends the error description to the step summary file', () => {
    process.env.GITHUB_STEP_SUMMARY = summaryPath;

    writeFailureSummary(new MockApiResponseError({ title: 'Payment Required' }));

    expect(readFileSync(summaryPath, 'utf8')).toContain('Payment Required');
  });

  it('does nothing outside of GitHub Actions', () => {
    delete process.env.GITHUB_STEP_SUMMARY;

    expect(() => writeFailureSummary(new Error('boom'))).not.toThrow();
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
    const status = tweetMock.mock.calls[0][0] as string;
    expect(status).toMatch(/^Wordle 1234 [A-Z][a-z]+ \d{1,2}, \d{4} \d\/6\n\n/);
    expect(status).toContain('#Wordle1234');
    expect(status).toContain('https://carpiediem.github.io/wordleb0t');
  });
});
