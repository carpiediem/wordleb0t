// Writes a GitHub Actions step summary comparing this run's NYT answers
// stats (nyt-winrate.json) against the committed baseline for main
// (nyt-answers-baseline.json). Only invoked on pull requests.
const fs = require('fs');

const current = JSON.parse(fs.readFileSync('nyt-winrate.json', 'utf8'));
const baseline = JSON.parse(fs.readFileSync('nyt-answers-baseline.json', 'utf8'));

const winPctDelta = current.winPct - baseline.winPct;
const winPctSign = winPctDelta > 0 ? '+' : '';

const avgGuessesDelta = Math.round((current.avgGuesses - baseline.avgGuesses) * 100) / 100;
const avgGuessesSign = avgGuessesDelta > 0 ? '+' : '';

const lines = [
  '### NYT Answers Win %',
  '',
  '| | Win % | Guesses to Win | Wins | Played | Current Streak | Max Streak |',
  '|---|---|---|---|---|---|---|',
  `| This branch | ${current.winPct}% | ${current.avgGuesses} | ${current.wins} | ${current.played} | ${current.currentStreak} | ${current.maxStreak} |`,
  `| main | ${baseline.winPct}% | ${baseline.avgGuesses} | ${baseline.wins} | ${baseline.played} | ${baseline.currentStreak} | ${baseline.maxStreak} |`,
  '',
  `Change vs main: **${winPctSign}${winPctDelta}%** win rate, **${avgGuessesSign}${avgGuessesDelta}** guesses to win`,
];

fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
