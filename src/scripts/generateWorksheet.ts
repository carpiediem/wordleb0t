// Generates a "follow-up" worksheet for a fixed first guess: an SVG grid
// covering every possible gray/yellow/green clue pattern for that guess,
// paired with Wordleb0t's suggested next guess for each one.
//
// Usage: npm run worksheet -- <WORD> [outputPath]
import { writeFileSync } from 'fs';
import { Clue, CluedLetter } from '../lib/clue';
import { makeGuess } from '../lib/guess';

const TILE_SIZE = 30;
const TILE_GAP = 3;
const CARD_GAP_X = 12;
const CARD_GAP_Y = 14;
const HEADER_HEIGHT = 60;
const MARGIN = 20;
const COLUMNS = 20;

interface TileStyle {
  background: string;
  border: string;
  text: string;
}

const TILE_COLORS: Record<Clue, TileStyle> = {
  [Clue.Correct]: { background: 'rgb(87, 172, 120)', border: 'rgba(0, 0, 0, 0.3)', text: 'white' },
  [Clue.Elsewhere]: { background: '#e9c601', border: '#8a770c', text: 'white' },
  [Clue.Absent]: { background: 'rgb(162, 162, 162)', border: 'transparent', text: 'white' },
};

const SUGGESTION_TILE: TileStyle = { background: '#f6f6f6', border: '#999', text: '#333' };
const BLANK_SUGGESTION_TILE: TileStyle = { background: '#e0e0e0', border: '#999', text: '#999' };

function parseArgs(): { word: string; outputPath: string } {
  const [, , rawWord, outputPath] = process.argv;
  if (!rawWord) {
    throw new Error('Usage: npm run worksheet -- <WORD> [outputPath]');
  }
  const word = rawWord.toLowerCase();
  if (!/^[a-z]+$/.test(word)) {
    throw new Error(`Word must be alphabetic: ${rawWord}`);
  }
  return { word, outputPath: outputPath ?? `worksheet-${word}.svg` };
}

// Every clue pattern of the guess's length, in base-3 counting order,
// excluding the all-Correct pattern (that guess would already be a win).
function everyPattern(wordLength: number): Clue[][] {
  const patterns: Clue[][] = [];
  const total = 3 ** wordLength;
  for (let n = 0; n < total; n++) {
    const pattern: Clue[] = [];
    let rest = n;
    for (let i = 0; i < wordLength; i++) {
      pattern.push(rest % 3);
      rest = Math.floor(rest / 3);
    }
    if (pattern.every((clue) => clue === Clue.Correct)) continue;
    patterns.push(pattern);
  }
  return patterns;
}

function suggestionFor(word: string, pattern: Clue[]): string | undefined {
  const row: CluedLetter[] = word.split('').map((letter, i) => ({ letter, clue: pattern[i] }));
  return makeGuess(word.length, [row])[0];
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderTileRow(letters: string[], styleFor: (index: number) => TileStyle): string {
  return letters
    .map((letter, i) => {
      const x = i * (TILE_SIZE + TILE_GAP);
      const { background, border, text } = styleFor(i);
      return [
        `<rect x="${x}" y="0" width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${background}" stroke="${border}" stroke-width="2" />`,
        `<text x="${x + TILE_SIZE / 2}" y="${TILE_SIZE / 2}" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-weight="bold" font-size="16" fill="${text}">${escapeXml(letter.toUpperCase())}</text>`,
      ].join('');
    })
    .join('');
}

function renderCard(word: string, pattern: Clue[], suggestion: string | undefined): string {
  const guessRow = renderTileRow(word.split(''), (i) => TILE_COLORS[pattern[i]]);

  const suggestionLetters = suggestion ? suggestion.split('') : word.split('').map(() => '-');
  const suggestionRow = renderTileRow(suggestionLetters, () => (suggestion ? SUGGESTION_TILE : BLANK_SUGGESTION_TILE));

  const rowHeight = TILE_SIZE + TILE_GAP;
  return [`<g>`, `<g>${guessRow}</g>`, `<g transform="translate(0, ${rowHeight})">${suggestionRow}</g>`, `</g>`].join(
    '',
  );
}

function generateWorksheet(word: string): string {
  const wordLength = word.length;
  const patterns = everyPattern(wordLength);

  const cardWidth = wordLength * TILE_SIZE + (wordLength - 1) * TILE_GAP;
  const cardHeight = 2 * TILE_SIZE + TILE_GAP;
  const cardOuterWidth = cardWidth + CARD_GAP_X;
  const cardOuterHeight = cardHeight + CARD_GAP_Y;

  const columns = Math.min(COLUMNS, patterns.length);
  const rows = Math.ceil(patterns.length / columns);

  const width = MARGIN * 2 + columns * cardOuterWidth - CARD_GAP_X;
  const height = MARGIN * 2 + HEADER_HEIGHT + rows * cardOuterHeight - CARD_GAP_Y;

  const cards = patterns
    .map((pattern, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = MARGIN + col * cardOuterWidth;
      const y = MARGIN + HEADER_HEIGHT + row * cardOuterHeight;
      const suggestion = suggestionFor(word, pattern);
      return `<g transform="translate(${x}, ${y})">${renderCard(word, pattern, suggestion)}</g>`;
    })
    .join('\n');

  const titleRow = renderTileRow(word.split(''), () => TILE_COLORS[Clue.Correct]);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="white" />`,
    `<text x="${MARGIN}" y="${MARGIN + HEADER_HEIGHT / 2}" dominant-baseline="central" font-family="sans-serif" font-size="28">Following-Up On ${escapeXml(word.toUpperCase())}</text>`,
    `<g transform="translate(${width - MARGIN - cardWidth}, ${MARGIN})">${titleRow}</g>`,
    cards,
    `</svg>`,
  ].join('\n');
}

const { word, outputPath } = parseArgs();
const svg = generateWorksheet(word);
writeFileSync(outputPath, svg);
console.log(`Wrote ${outputPath}`);
