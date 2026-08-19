import { render } from '@testing-library/react';
import { Bot } from './Bot';

describe('Bot', () => {
  it('renders the robot face markup', () => {
    const { container } = render(<Bot isTalking={false} />);

    expect(container.querySelector('.cute-robot-v1')).toBeInTheDocument();
    expect(container.querySelector('.robot-head')).toBeInTheDocument();
    expect(container.querySelector('.robot-face')).toBeInTheDocument();
    expect(container.querySelectorAll('.eyes')).toHaveLength(2);
    expect(container.querySelector('.mouth')).toBeInTheDocument();
  });

  it('renders the same markup regardless of isTalking', () => {
    const { container: notTalking } = render(<Bot isTalking={false} />);
    const { container: talking } = render(<Bot isTalking={true} />);

    expect(talking.innerHTML).toBe(notTalking.innerHTML);
  });
});
