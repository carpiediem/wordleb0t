import { render, screen } from '@testing-library/react';
import { About } from './About';
import { maxGuesses } from '../lib/util';

describe('About', () => {
  it('explains the rules, including the configured number of guesses', () => {
    render(<About />);

    expect(screen.getByText(/Wordle/, { selector: 'i' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`You get ${maxGuesses} tries`))).toBeInTheDocument();
  });

  it('links to the issue tracker and ko-fi page', () => {
    render(<About />);

    expect(screen.getByRole('link', { name: 'here' })).toHaveAttribute(
      'href',
      'https://github.com/lynn/hello-wordl/issues',
    );
    expect(screen.getByRole('link', { name: 'buy me a coffee' })).toHaveAttribute('href', 'https://ko-fi.com/chordbug');
  });
});
