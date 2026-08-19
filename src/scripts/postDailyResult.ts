// Solves today's NYT Wordle and posts the result to the @wordleb0t account.
// Run daily by .github/workflows/post-daily-result.yml.
//
// Usage: npm run post:daily-result
import { appendFileSync } from 'fs';
import { ApiResponseError, TwitterApi } from 'twitter-api-v2';
import { solve, stepsToEmojiGrid } from '../lib/solve';

const MAX_GUESSES = 6;
const NYT_WORDLE_ENDPOINT = 'https://www.nytimes.com/svc/wordle/v2';
// No scheme: X auto-links bare domains, and this reads cleaner in the post.
const WORDLEB0T_URL = 'carpiediem.github.io/wordleb0t';

export interface NytWordleResponse {
  solution: string;
  days_since_launch: number;
}

export function todayInNewYork(): string {
  // NYT's puzzle rolls over at midnight America/New_York, not UTC.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // en-CA gives YYYY-MM-DD
}

export async function fetchTodaysAnswer(date: string): Promise<NytWordleResponse> {
  const response = await fetch(`${NYT_WORDLE_ENDPOINT}/${date}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch NYT Wordle answer for ${date}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// Turns a YYYY-MM-DD date into the "June 20, 2021" form used in the post title.
// Built from UTC fields and formatted in UTC so the calendar date doesn't
// shift depending on the runner's local timezone.
function formatPuzzleDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function buildStatus(
  puzzleNumber: number,
  puzzleDate: string,
  guessCount: number | null,
  steps: Parameters<typeof stepsToEmojiGrid>[0],
): string {
  const resultLabel = guessCount ? `${guessCount}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return [
    `Wordle ${puzzleNumber} (${formatPuzzleDate(puzzleDate)}) ${resultLabel}`,
    '',
    stepsToEmojiGrid(steps),
    '',
    `#Wordle${puzzleNumber}`,
    WORDLEB0T_URL,
  ].join('\n');
}

export async function main() {
  const date = todayInNewYork();
  const { solution, days_since_launch: puzzleNumber } = await fetchTodaysAnswer(date);
  const { steps, guessCount } = solve(solution.toLowerCase(), MAX_GUESSES);
  const status = buildStatus(puzzleNumber, date, guessCount, steps);

  const client = new TwitterApi({
    appKey: requireEnv('TWITTER_API_KEY'),
    appSecret: requireEnv('TWITTER_API_SECRET'),
    accessToken: requireEnv('TWITTER_ACCESS_TOKEN'),
    accessSecret: requireEnv('TWITTER_ACCESS_TOKEN_SECRET'),
  });
  await client.v2.tweet(status);

  console.log(status);
}

// X's API returns RFC 7807 problem+json bodies on failure, with a short
// human-readable `title` (e.g. "Payment Required") - surface that instead of
// a generic "Request failed with code 402".
export function describeError(error: unknown): string {
  if (error instanceof ApiResponseError && typeof error.data.title === 'string') {
    return error.data.title;
  }
  return error instanceof Error ? error.message : String(error);
}

export function writeFailureSummary(error: unknown): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  appendFileSync(summaryPath, `### Failed to post daily result\n\n${describeError(error)}\n`);
}

// Only run when executed directly (`npm run post:daily-result`), not when imported by tests.
/* v8 ignore start */
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    writeFailureSummary(error);
    process.exit(1);
  });
}
/* v8 ignore stop */
