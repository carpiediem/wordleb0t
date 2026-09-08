interface HardModeToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// A hand-rolled switch rather than a UI-library one (see #45) - this repo has
// no UI-library dependency anywhere else, preferring small custom components
// styled to match its own CSS (e.g. GuessSelect over a native <select>).
export function HardModeToggle({ checked, onChange }: HardModeToggleProps) {
  return (
    <span className="HardModeToggle">
      <label className="HardModeToggle-switch">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="HardModeToggle-track" aria-hidden="true">
          <span className="HardModeToggle-thumb" />
        </span>
        {checked ? 'Hard' : 'Easy'}
      </label>
      <span
        className="HardModeToggle-info"
        aria-label="What hard mode means"
        title="In hard mode, every guess must reuse every letter already known to be in the word. A letter that's been marked green must stay in that same position."
      >
        ⓘ
      </span>
    </span>
  );
}
