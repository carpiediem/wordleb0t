import { render, screen, fireEvent } from '@testing-library/react';
import Game from './Game';
import { makeGuess } from '../lib/guess';

declare const window: { ga: (action: string, options: Record<string, unknown>) => void };

beforeEach(() => {
  window.ga = vi.fn();
});

function editingRow(container: HTMLElement): HTMLTableRowElement {
  const rows = Array.from(container.querySelectorAll('tr'));
  const row = rows.find((tr) => tr.querySelector('button:not(.undo)'));
  if (!row) throw new Error('No editing row found');
  return row as HTMLTableRowElement;
}

// Marks every letter in the currently-editing row Absent, then locks it in -
// this can never satisfy a win, so repeating it drives the game to a loss.
function playAbsentRound(container: HTMLElement) {
  const row = editingRow(container);
  row.querySelectorAll('.Row-letter').forEach((cell) => fireEvent.click(cell));
  fireEvent.click(row.querySelector('button:not(.undo)')!);
}

describe('Game', () => {
  it("renders one row per maxGuesses, with the bot's top guess filled into the first", () => {
    const { container } = render(<Game maxGuesses={6} />);

    expect(container.querySelectorAll('tr')).toHaveLength(6);

    const topGuess = makeGuess(5)[0];
    Array.from(topGuess).forEach((letter) => {
      expect(screen.getAllByText(letter.toLowerCase()).length).toBeGreaterThan(0);
    });
  });

  it('shows the initial hint prompting the user to check the guess', () => {
    render(<Game maxGuesses={6} />);

    expect(screen.getByRole('alert')).toHaveTextContent("Tap the letters to check Wordlebot's guess");
  });

  it('resizes the rows when the word-length slider changes', () => {
    const { container } = render(<Game maxGuesses={6} />);

    fireEvent.change(screen.getByLabelText('Letters:'), { target: { value: '7' } });

    const firstRowCells = container.querySelector('tr')!.querySelectorAll('.Row-letter');
    expect(firstRowCells).toHaveLength(7);
  });

  it('declares a win and reports it via ga when every letter is marked correct', () => {
    const { container } = render(<Game maxGuesses={6} />);

    const row = editingRow(container);
    row.querySelectorAll('.Row-letter').forEach((cell) => {
      fireEvent.click(cell);
      fireEvent.click(cell);
      fireEvent.click(cell); // three clicks cycles a letter to Correct
    });
    fireEvent.click(row.querySelector('button:not(.undo)')!);

    expect(screen.getByText('I won!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Let's play again" })).toBeInTheDocument();
    expect(window.ga).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({ eventCategory: 'End', eventAction: 'win' }),
    );
  });

  it('declares a loss and reports it via ga when guesses run out without a win', () => {
    const { container } = render(<Game maxGuesses={6} />);

    for (let i = 0; i < 6; i++) {
      if (screen.queryByRole('button', { name: "Let's play again" })) break;
      playAbsentRound(container);
    }

    expect(screen.getByRole('button', { name: "Let's play again" })).toBeInTheDocument();
    expect(screen.getByText(/Too bad|I give up/)).toBeInTheDocument();
    expect(window.ga).toHaveBeenCalledWith('send', expect.objectContaining({ eventCategory: 'End' }));
  });

  it('resets to a fresh game when "play again" is clicked after a win', () => {
    const { container } = render(<Game maxGuesses={6} />);

    const row = editingRow(container);
    row.querySelectorAll('.Row-letter').forEach((cell) => {
      fireEvent.click(cell);
      fireEvent.click(cell);
      fireEvent.click(cell);
    });
    fireEvent.click(row.querySelector('button:not(.undo)')!);

    fireEvent.click(screen.getByRole('button', { name: "Let's play again" }));

    expect(screen.getByRole('alert')).toHaveTextContent("Tap the letters to check Wordlebot's guess");
    expect(screen.queryByText('I won!')).not.toBeInTheDocument();
  });

  it('undoes a locked-in row back to editing', () => {
    const { container } = render(<Game maxGuesses={6} />);

    playAbsentRound(container);
    expect(container.querySelectorAll('.undo')).toHaveLength(1);

    fireEvent.click(container.querySelector('.undo')!);

    expect(container.querySelectorAll('.undo')).toHaveLength(0);
  });
});
