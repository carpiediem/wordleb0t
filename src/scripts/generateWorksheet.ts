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
const MARGIN = 20;
const TITLE_FONT_SIZE = 28;

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

// Every way to choose `k` items out of `n`, as index combinations in
// lexicographic order.
function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const combo: number[] = [];
  function backtrack(start: number) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < n; i++) {
      combo.push(i);
      backtrack(i + 1);
      combo.pop();
    }
  }
  backtrack(0);
  return result;
}

// Every way to color `n` letters green/yellow, ordered by how many are green
// (fewest first), then lexicographically by which ones are green.
function colorPatterns(n: number): boolean[][] {
  const patterns: boolean[][] = [];
  for (let greenCount = 0; greenCount <= n; greenCount++) {
    for (const combo of combinations(n, greenCount)) {
      const pattern = new Array<boolean>(n).fill(false);
      combo.forEach((i) => (pattern[i] = true));
      patterns.push(pattern);
    }
  }
  return patterns;
}

function cluesFor(wordLength: number, positions: number[], colors: boolean[]): Clue[] {
  const clue = new Array<Clue>(wordLength).fill(Clue.Absent);
  positions.forEach((position, i) => {
    clue[position] = colors[i] ? Clue.Correct : Clue.Elsewhere;
  });
  return clue;
}

interface PatternGroup {
  // How many of the guess's letters are colored (green or yellow) in this
  // group's patterns.
  coloredCount: number;
  // Which of those colored letters are green, rather than yellow.
  greens: boolean[];
  patterns: Clue[][];
}

// Every possible clue pattern, grouped by how many letters are colored and
// which of those are green vs. yellow, ordered by coloredCount ascending,
// then by green count ascending, then lexicographically by which letters are
// green. Excludes the all-Correct pattern (that guess would already be a
// win) and, when every letter is colored, the pattern with exactly one
// yellow letter (with a guess of distinct letters, that state can't happen:
// the one remaining position could only make that letter correct, not
// elsewhere).
function patternGroups(wordLength: number): PatternGroup[] {
  const groups: PatternGroup[] = [];
  for (let coloredCount = 0; coloredCount <= wordLength; coloredCount++) {
    const positionCombos = combinations(wordLength, coloredCount);
    for (const greens of colorPatterns(coloredCount)) {
      const greenCount = greens.filter(Boolean).length;
      if (coloredCount === wordLength && greenCount === wordLength - 1) continue;
      const patterns = positionCombos
        .map((positions) => cluesFor(wordLength, positions, greens))
        .filter((pattern) => !pattern.every((clue) => clue === Clue.Correct));
      if (patterns.length > 0) groups.push({ coloredCount, greens, patterns });
    }
  }
  return groups;
}

// Packs a sequence of same-sized-ish groups into columns of at most
// `maxRows` each, without splitting a group across two columns, so that
// small groups (like a single colored letter, which can only be green or
// yellow) share a column instead of leaving it mostly empty.
function packColumns(groups: Clue[][][], maxRows: number): Clue[][][] {
  const columns: Clue[][][] = [];
  let current: Clue[][] = [];
  for (const group of groups) {
    if (current.length > 0 && current.length + group.length > maxRows) {
      columns.push(current);
      current = [];
    }
    current.push(...group);
  }
  if (current.length > 0) columns.push(current);
  return columns;
}

// Lays out every clue pattern into worksheet columns, to match the layout
// from https://github.com/carpiediem/wordleb0t/issues/19. The all-gray and
// all-yellow patterns are pulled out to be shown in the header instead, since
// each is just a single pattern. The columns for guesses with almost every
// letter colored (all but one, or all of them) are split out into their own
// section below the rest, since by then there are more color arrangements
// than there are useful positions to put them in.
function worksheetLayout(wordLength: number): {
  headerPatterns: Clue[][];
  topColumns: Clue[][][];
  bottomColumns: Clue[][][];
} {
  const headerPatterns: Clue[][] = [];
  const groupsByColoredCount = new Map<number, Clue[][][]>();
  for (const { coloredCount, greens, patterns } of patternGroups(wordLength)) {
    const isAllGray = coloredCount === 0;
    const isAllYellow = coloredCount === wordLength && greens.every((green) => !green);
    if (isAllGray || isAllYellow) {
      headerPatterns.push(...patterns);
      continue;
    }
    if (!groupsByColoredCount.has(coloredCount)) groupsByColoredCount.set(coloredCount, []);
    groupsByColoredCount.get(coloredCount)!.push(patterns);
  }

  // The natural column height: the most rows any single arrangement of
  // colors can produce for this word length.
  const maxRows = Math.max(...Array.from({ length: wordLength + 1 }, (_, n) => combinations(wordLength, n).length));

  const topColumns: Clue[][][] = [];
  const bottomColumns: Clue[][][] = [];
  for (const coloredCount of [...groupsByColoredCount.keys()].sort((a, b) => a - b)) {
    const packed = packColumns(groupsByColoredCount.get(coloredCount)!, maxRows);
    if (coloredCount >= wordLength - 1) {
      bottomColumns.push(...packed);
    } else {
      topColumns.push(...packed);
    }
  }

  return { headerPatterns, topColumns, bottomColumns };
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

function renderColumns(
  word: string,
  columns: Clue[][][],
  top: number,
  cardOuterWidth: number,
  cardOuterHeight: number,
): string {
  return columns
    .flatMap((column, col) =>
      column.map((pattern, row) => {
        const x = MARGIN + col * cardOuterWidth;
        const y = top + row * cardOuterHeight;
        const suggestion = suggestionFor(word, pattern);
        return `<g transform="translate(${x}, ${y})">${renderCard(word, pattern, suggestion)}</g>`;
      }),
    )
    .join('\n');
}

function generateWorksheet(word: string): string {
  const wordLength = word.length;
  const { headerPatterns, topColumns, bottomColumns } = worksheetLayout(wordLength);

  const cardWidth = wordLength * TILE_SIZE + (wordLength - 1) * TILE_GAP;
  const cardHeight = 2 * TILE_SIZE + TILE_GAP;
  const cardOuterWidth = cardWidth + CARD_GAP_X;
  const cardOuterHeight = cardHeight + CARD_GAP_Y;
  const headerHeight = cardHeight + MARGIN;
  const sectionGap = MARGIN * 2;

  const topRows = Math.max(...topColumns.map((column) => column.length));
  const bottomRows = Math.max(...bottomColumns.map((column) => column.length));
  const bodyWidth = MARGIN * 2 + Math.max(topColumns.length, bottomColumns.length) * cardOuterWidth - CARD_GAP_X;

  const topSectionTop = MARGIN + headerHeight;
  const topSectionHeight = topRows * cardOuterHeight - CARD_GAP_Y;
  const dividerY = topSectionTop + topSectionHeight + sectionGap / 2;
  const bottomSectionTop = dividerY + sectionGap / 2;

  const topCards = renderColumns(word, topColumns, topSectionTop, cardOuterWidth, cardOuterHeight);
  const bottomCards = renderColumns(word, bottomColumns, bottomSectionTop, cardOuterWidth, cardOuterHeight);

  // Lay the title text and the all-gray/all-yellow header cards out
  // left-to-right, tracking how far right they reach so the page is wide
  // enough to fit them.
  const titleText = `Wordle First Guess Follow-ups: ${word.toUpperCase()}`;
  let cursorX = MARGIN + titleText.length * TITLE_FONT_SIZE * 0.6 + CARD_GAP_X;

  const headerCards = headerPatterns
    .map((pattern) => {
      const suggestion = suggestionFor(word, pattern);
      const x = cursorX;
      cursorX += cardOuterWidth;
      return `<g transform="translate(${x}, ${MARGIN + (headerHeight - cardHeight) / 2})">${renderCard(word, pattern, suggestion)}</g>`;
    })
    .join('\n');
  cursorX -= CARD_GAP_X;

  const width = Math.max(bodyWidth, cursorX + MARGIN);
  const height = bottomSectionTop + bottomRows * cardOuterHeight - CARD_GAP_Y + MARGIN;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="white" />`,
    `<text x="${MARGIN}" y="${MARGIN + headerHeight / 2}" dominant-baseline="central" font-family="sans-serif" font-size="${TITLE_FONT_SIZE}">${escapeXml(titleText)}</text>`,
    headerCards,
    topCards,
    `<line x1="${MARGIN}" y1="${dividerY}" x2="${width - MARGIN}" y2="${dividerY}" stroke="#ccc" stroke-width="2" />`,
    bottomCards,
    `</svg>`,
  ].join('\n');
}

const { word, outputPath } = parseArgs();
const svg = generateWorksheet(word);
writeFileSync(outputPath, svg);
console.log(`Wrote ${outputPath}`);
