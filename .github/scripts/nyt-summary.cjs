// Writes a GitHub Actions step summary comparing this run's NYT answers
// stats (nyt-winrate.json) against the committed baseline for main
// (nyt-answers-baseline.json). Only invoked on pull requests.
const fs = require('fs');

const current = JSON.parse(fs.readFileSync('nyt-winrate.json', 'utf8'));
const baseline = JSON.parse(fs.readFileSync('nyt-answers-baseline.json', 'utf8'));
const delta = current.winPct - baseline.winPct;
const sign = delta > 0 ? '+' : '';

const lines = [
  '### NYT Answers Win %',
  '',
  '| | Win % | Wins | Played | Current Streak | Max Streak |',
  '|---|---|---|---|---|---|',
  `| This branch | ${current.winPct}% | ${current.wins} | ${current.played} | ${current.currentStreak} | ${current.maxStreak} |`,
  `| main | ${baseline.winPct}% | ${baseline.wins} | ${baseline.played} | ${baseline.currentStreak} | ${baseline.maxStreak} |`,
  '',
  `Change vs main: **${sign}${delta}%**`,
];

fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
