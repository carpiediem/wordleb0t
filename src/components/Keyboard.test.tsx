import { render, screen, fireEvent } from '@testing-library/react';
import { Keyboard } from './Keyboard';
import { Clue } from '../lib/clue';

describe('Keyboard', () => {
  it('renders one row per hyphen-separated group, expanding B and E to Backspace and Enter', () => {
    render(<Keyboard layout="QWR-ASD-BZXCE" letterInfo={new Map()} onKey={() => {}} />);

    expect(screen.getByText('Q')).toBeInTheDocument();
    expect(screen.getByText('⌫')).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.queryByText('B')).not.toBeInTheDocument();
    expect(screen.queryByText('E')).not.toBeInTheDocument();
  });

  it('applies a wide class to multi-letter keys only', () => {
    render(<Keyboard layout="Q-BZE" letterInfo={new Map()} onKey={() => {}} />);

    expect(screen.getByText('Q')).not.toHaveClass('Game-keyboard-button-wide');
    expect(screen.getByText('⌫')).toHaveClass('Game-keyboard-button-wide');
    expect(screen.getByText('Enter')).toHaveClass('Game-keyboard-button-wide');
  });

  it('applies a clue class to keys with known letter info', () => {
    const letterInfo = new Map([
      ['Q', Clue.Correct],
      ['W', Clue.Elsewhere],
      ['R', Clue.Absent],
    ]);
    render(<Keyboard layout="QWRT" letterInfo={letterInfo} onKey={() => {}} />);

    expect(screen.getByText('Q')).toHaveClass('letter-correct');
    expect(screen.getByText('W')).toHaveClass('letter-elsewhere');
    expect(screen.getByText('R')).toHaveClass('letter-absent');
    expect(screen.getByText('T')).not.toHaveClass('letter-correct', 'letter-elsewhere', 'letter-absent');
  });

  it('calls onKey with the raw label when a key is clicked', () => {
    const onKey = vi.fn();
    render(<Keyboard layout="QWR-BZXE" letterInfo={new Map()} onKey={onKey} />);

    fireEvent.click(screen.getByText('Q'));
    fireEvent.click(screen.getByText('⌫'));
    fireEvent.click(screen.getByText('Enter'));

    expect(onKey).toHaveBeenNthCalledWith(1, 'Q');
    expect(onKey).toHaveBeenNthCalledWith(2, 'Backspace');
    expect(onKey).toHaveBeenNthCalledWith(3, 'Enter');
  });
});
