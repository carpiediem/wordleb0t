// Writes a GitHub Actions step summary table from Vitest's json-summary
// coverage report (coverage/coverage-summary.json). See .github/workflows/ci.yml.
const fs = require('fs');

const { total } = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));

const row = (label, { pct, covered, total }) => `| ${label} | ${pct}% | ${covered}/${total} |`;

const lines = [
  '### Code Coverage',
  '',
  '| | % | Covered/Total |',
  '|---|---|---|',
  row('Statements', total.statements),
  row('Branches', total.branches),
  row('Functions', total.functions),
  row('Lines', total.lines),
];

fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
