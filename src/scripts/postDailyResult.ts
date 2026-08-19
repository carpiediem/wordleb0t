// Solves today's NYT Wordle and posts the result to the @wordleb0t account.
// Run daily by .github/workflows/post-daily-result.yml.
//
// Usage: npm run post:daily-result
import { TwitterApi } from 'twitter-api-v2';
import { solve, stepsToEmojiGrid } from '../lib/solve';

const MAX_GUESSES = 6;
const NYT_WORDLE_ENDPOINT = 'https://www.nytimes.com/svc/wordle/v2';

export interface NytWordleResponse {
  solution: string;
  days_since_launch: number;
}

export function todayInNewYork(): string {
  // NYT's puzzle rolls over at midnight America/New_York, not UTC.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // en-CA gives YYYY-MM-DD
}

export async function fetchTodaysAnswer(): Promise<NytWordleResponse> {
  const date = todayInNewYork();
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

export function buildStatus(
  puzzleNumber: number,
  guessCount: number | null,
  steps: Parameters<typeof stepsToEmojiGrid>[0],
): string {
  const resultLabel = guessCount ? `${guessCount}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return [`Wordleb0t ${puzzleNumber} ${resultLabel}`, '', stepsToEmojiGrid(steps)].join('\n');
}

export async function main() {
  const { solution, days_since_launch: puzzleNumber } = await fetchTodaysAnswer();
  const { steps, guessCount } = solve(solution.toLowerCase(), MAX_GUESSES);
  const status = buildStatus(puzzleNumber, guessCount, steps);

  const client = new TwitterApi({
    appKey: requireEnv('TWITTER_API_KEY'),
    appSecret: requireEnv('TWITTER_API_SECRET'),
    accessToken: requireEnv('TWITTER_ACCESS_TOKEN'),
    accessSecret: requireEnv('TWITTER_ACCESS_TOKEN_SECRET'),
  });
  await client.v2.tweet(status);

  console.log(status);
}

// Only run when executed directly (`npm run post:daily-result`), not when imported by tests.
/* v8 ignore start */
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
/* v8 ignore stop */
