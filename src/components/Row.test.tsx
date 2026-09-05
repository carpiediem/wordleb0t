import { render, screen, fireEvent } from '@testing-library/react';
import { Row, RowState } from './Row';
import { Clue } from '../lib/clue';

function renderRow(props: Partial<React.ComponentProps<typeof Row>> = {}) {
  const defaultProps: React.ComponentProps<typeof Row> = {
    isPlaying: true,
    rowState: RowState.Editing,
    wordLength: 3,
    word: 'cat',
    foundLetters: [],
    onChange: () => {},
    onLockIn: () => {},
    onUndo: () => {},
  };

  return render(
    <table>
      <tbody>
        <Row {...defaultProps} {...props} />
      </tbody>
    </table>,
  );
}

describe('Row', () => {
  it('renders one cell per letter of wordLength, showing the guessed word', () => {
    renderRow({ wordLength: 3, word: 'cat' });

    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('t')).toBeInTheDocument();
  });

  it('starts letters as unspecified, or correct where a letter was already found', () => {
    renderRow({ word: 'cat', foundLetters: ['c', undefined as unknown as string, 't'] });

    expect(screen.getByText('c')).toHaveClass('letter-correct');
    expect(screen.getByText('a')).toHaveClass('letter-unspecified');
    expect(screen.getByText('t')).toHaveClass('letter-correct');
  });

  it("doesn't start a letter as correct just because that position has a known letter, if this guess's letter there differs", () => {
    // A scout guess (see #31/#32) isn't guaranteed to repeat known-correct
    // letters in their known positions - e.g. "cat" is known correct at
    // position 0, but a scout guessing "dog" there shouldn't have its 'd'
    // pre-filled green just because *some* letter is known for position 0.
    renderRow({ word: 'dog', foundLetters: ['c', undefined as unknown as string, 't'] });

    expect(screen.getByText('d')).toHaveClass('letter-unspecified');
    expect(screen.getByText('o')).toHaveClass('letter-unspecified');
    expect(screen.getByText('g')).toHaveClass('letter-unspecified');
  });

  it('cycles a letter through absent, elsewhere, correct, and back to unspecified on click', () => {
    renderRow({ word: 'cat' });
    const cell = screen.getByText('c');

    expect(cell).toHaveClass('letter-unspecified');
    fireEvent.click(cell);
    expect(cell).toHaveClass('letter-absent');
    fireEvent.click(cell);
    expect(cell).toHaveClass('letter-elsewhere');
    fireEvent.click(cell);
    expect(cell).toHaveClass('letter-correct');
    fireEvent.click(cell);
    expect(cell).toHaveClass('letter-unspecified');
  });

  it('does not respond to clicks when not editing', () => {
    renderRow({ word: 'cat', rowState: RowState.LockedIn });
    const cell = screen.getByText('c');

    fireEvent.click(cell);
    expect(cell).toHaveClass('letter-unspecified');
  });

  it('cycles a letter via its number key, and locks in via Enter, while editing', () => {
    const onLockIn = vi.fn();
    renderRow({ word: 'cat', onLockIn });

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: '3' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onLockIn).toHaveBeenCalledWith([
      { clue: Clue.Absent, letter: 'c' },
      { clue: Clue.Absent, letter: 'a' },
      { clue: Clue.Absent, letter: 't' },
    ]);
  });

  it('ignores number and Enter keys when not editing', () => {
    const onLockIn = vi.fn();
    renderRow({ word: 'cat', rowState: RowState.LockedIn, onLockIn });

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onLockIn).not.toHaveBeenCalled();
  });

  it('disables the lock-in button until every letter has been clued, then enables it', () => {
    renderRow({ word: 'cat' });
    const button = screen.getByRole('button', { name: '✔' });

    expect(button).toBeDisabled();
    fireEvent.click(screen.getByText('c'));
    fireEvent.click(screen.getByText('a'));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByText('t'));
    expect(button).toBeEnabled();
  });

  it('calls onLockIn with the current clues when the lock-in button is clicked', () => {
    const onLockIn = vi.fn();
    renderRow({ word: 'cat', onLockIn });

    fireEvent.click(screen.getByText('c'));
    fireEvent.click(screen.getByText('c'));
    fireEvent.click(screen.getByText('c')); // now Correct
    fireEvent.click(screen.getByText('a'));
    fireEvent.click(screen.getByText('t'));
    fireEvent.click(screen.getByRole('button', { name: '✔' }));

    expect(onLockIn).toHaveBeenCalledWith([
      { clue: Clue.Correct, letter: 'c' },
      { clue: Clue.Absent, letter: 'a' },
      { clue: Clue.Absent, letter: 't' },
    ]);
  });

  it('shows an undo button while playing and locked in, and calls onUndo when clicked', () => {
    const onUndo = vi.fn();
    renderRow({ word: 'cat', rowState: RowState.LockedIn, onUndo });

    const undoButton = screen.getByTitle('Undo this feedback and make changes');
    fireEvent.click(undoButton);

    expect(onUndo).toHaveBeenCalled();
  });

  it('does not show lock-in or undo controls once the game has stopped playing', () => {
    renderRow({ word: 'cat', isPlaying: false, rowState: RowState.LockedIn });

    expect(screen.queryByRole('button', { name: '✔' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Undo this feedback and make changes')).not.toBeInTheDocument();
  });

  it('shows the remaining option count only once locked in', () => {
    const { rerender } = renderRow({ word: 'cat', rowState: RowState.Editing, optionsRemaining: 42 });
    expect(screen.queryByText('42')).not.toBeInTheDocument();

    rerender(
      <table>
        <tbody>
          <Row
            isPlaying
            rowState={RowState.LockedIn}
            wordLength={3}
            word="cat"
            foundLetters={[]}
            optionsRemaining={1}
            onChange={() => {}}
            onLockIn={() => {}}
            onUndo={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('word left')).toBeInTheDocument();
  });

  it('notifies onChange with lockability while editing and playing', () => {
    const onChange = vi.fn();
    renderRow({ word: 'cat', onChange });

    onChange.mockClear();
    fireEvent.click(screen.getByText('c'));
    fireEvent.click(screen.getByText('a'));
    fireEvent.click(screen.getByText('t'));

    expect(onChange).toHaveBeenLastCalledWith(true);
  });
});
