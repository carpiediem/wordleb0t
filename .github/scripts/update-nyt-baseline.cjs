// Promotes the current run's win-rate stats (written by nytAnswers.test.ts)
// to the committed baseline, so PRs can compare against main without
// rerunning the simulation. Only invoked on pushes to main.
const fs = require('fs');

const current = JSON.parse(fs.readFileSync('nyt-winrate.json', 'utf8'));
current.sha = process.env.GITHUB_SHA;
fs.writeFileSync('nyt-answers-baseline.json', JSON.stringify(current, null, 2) + '\n');
