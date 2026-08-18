import { render } from '@testing-library/react';
import App from './App';

declare const window: { ga: (action: string, options: Record<string, unknown>) => void };

beforeEach(() => {
  window.ga = vi.fn();
});

describe('App', () => {
  it('renders the game inside its container', () => {
    const { container } = render(<App />);

    const appContainer = container.querySelector('.App-container');
    expect(appContainer).toBeInTheDocument();
    expect(appContainer!.querySelector('table.Game-rows')).toBeInTheDocument();
  });
});
