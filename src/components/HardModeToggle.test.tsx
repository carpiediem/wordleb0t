import { render, screen, fireEvent } from '@testing-library/react';
import { HardModeToggle } from './HardModeToggle';

describe('HardModeToggle', () => {
  it('labels itself "Easy" when unchecked', () => {
    render(<HardModeToggle checked={false} onChange={() => {}} />);

    expect(screen.getByRole('switch')).not.toBeChecked();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('labels itself "Hard" when checked', () => {
    render(<HardModeToggle checked={true} onChange={() => {}} />);

    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  it('calls onChange with the new checked state when toggled', () => {
    const onChange = vi.fn();
    render(<HardModeToggle checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('explains hard mode via a tooltip on the info icon', () => {
    render(<HardModeToggle checked={false} onChange={() => {}} />);

    expect(screen.getByLabelText('What hard mode means')).toHaveAttribute('title', expect.stringContaining('green'));
  });
});
