import { render, screen, fireEvent } from '@testing-library/react';
import { GuessSelect } from './GuessSelect';

const optionsWithMetadata = [
  { word: 'souct', bucketCount: 12, largestBucket: 4 },
  { word: 'pours', bucketCount: 9, largestBucket: 6 },
];

describe('GuessSelect', () => {
  it('shows the current value on the closed toggle', () => {
    render(<GuessSelect options={optionsWithMetadata} value="souct" onChange={() => {}} />);

    expect(screen.getByRole('button')).toHaveTextContent('SOUCT');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the option list when the toggle is clicked', () => {
    render(<GuessSelect options={optionsWithMetadata} value="souct" onChange={() => {}} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('POURS')).toBeInTheDocument();
  });

  it('marks the option matching the current value as selected, with a checkmark', () => {
    render(<GuessSelect options={optionsWithMetadata} value="souct" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('✓ SOUCT');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).not.toHaveTextContent('✓');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('shows bucket-count/largest-bucket metadata for each option', () => {
    render(<GuessSelect options={optionsWithMetadata} value="souct" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('🪣 12');
    expect(options[0]).toHaveTextContent('📉 4');
    expect(options[1]).toHaveTextContent('🪣 9');
  });

  it('formats large metadata numbers with a thousands separator', () => {
    render(
      <GuessSelect
        options={[{ word: 'slate', bucketCount: 1234, largestBucket: 5678 }]}
        value="slate"
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button'));

    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('🪣 1,234');
    expect(option).toHaveTextContent('📉 5,678');
  });

  it("omits the metadata row for an option that doesn't have any", () => {
    render(<GuessSelect options={[{ word: 'slate' }]} value="slate" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.queryByText(/🪣/)).not.toBeInTheDocument();
    expect(screen.queryByText(/📉/)).not.toBeInTheDocument();
    expect(screen.queryByText(/🎯/)).not.toBeInTheDocument();
  });

  it('shows the usage-rank stat, 1-indexed, independent of bucket metadata', () => {
    render(<GuessSelect options={[{ word: 'slate', usageRank: 4 }]} value="slate" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('option')).toHaveTextContent('🎯 5');
    expect(screen.queryByText(/🪣/)).not.toBeInTheDocument();
  });

  it('calls onChange with the clicked option and closes the list', () => {
    const onChange = vi.fn();
    render(<GuessSelect options={optionsWithMetadata} value="souct" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByText('POURS'));

    expect(onChange).toHaveBeenCalledWith('pours');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes when clicking outside the component', () => {
    render(
      <div>
        <GuessSelect options={optionsWithMetadata} value="souct" onChange={() => {}} />
        <button>outside</button>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'SOUCT' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('stays open when the mousedown lands inside the component', () => {
    render(<GuessSelect options={optionsWithMetadata} value="souct" onChange={() => {}} />);
    const toggle = screen.getByRole('button');
    fireEvent.click(toggle);

    fireEvent.mouseDown(toggle);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('ignores a non-Escape key while open', () => {
    render(<GuessSelect options={optionsWithMetadata} value="souct" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<GuessSelect options={optionsWithMetadata} value="souct" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('toggles closed when the toggle is clicked again', () => {
    render(<GuessSelect options={optionsWithMetadata} value="souct" onChange={() => {}} />);
    const toggle = screen.getByRole('button');

    fireEvent.click(toggle);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
