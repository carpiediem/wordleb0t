import { render, screen } from '@testing-library/react';
import { BucketList } from './BucketList';
import { clue } from '../lib/clue';

describe('BucketList', () => {
  it('renders nothing when there is no guess word yet', () => {
    const { container } = render(<BucketList wordLength={5} guessWord="" clues={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one item per distinct clue pattern the guess would produce', () => {
    const clues = [clue('crane', 'crane')];
    render(<BucketList wordLength={5} guessWord="crane" clues={clues} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('1');
  });

  it('exposes the matching words via a title attribute', () => {
    const clues = [clue('adieu', 'stale'), clue('teils', 'stale')];
    render(<BucketList wordLength={5} guessWord="stale" clues={clues} />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('title');
    expect(items[0].getAttribute('title')!.length).toBeGreaterThan(0);
  });

  it('renders one tile per letter of the guess word', () => {
    const clues = [clue('crane', 'crane')];
    render(<BucketList wordLength={5} guessWord="crane" clues={clues} />);

    expect(document.querySelectorAll('.BucketList-tile')).toHaveLength(5);
  });
});
