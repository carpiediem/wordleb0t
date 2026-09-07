import { useEffect, useRef, useState } from 'react';
import { GuessOption } from '../lib/guess';

interface GuessSelectProps {
  options: GuessOption[];
  value: string;
  onChange: (word: string) => void;
}

// A native <select>'s <option>s can only ever hold plain text, so there's no
// way to show per-option entropy metadata (see #34) inside a real select.
// This mimics one closely enough to drop in as a replacement, while its own
// option rows are free to render whatever they want.
export function GuessSelect({ options, value, onChange }: GuessSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (word: string) => {
    onChange(word);
    setIsOpen(false);
  };

  return (
    <div className="GuessSelect" ref={containerRef}>
      <button
        type="button"
        className="GuessSelect-toggle"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{value.toUpperCase()}</span>
        <span className="GuessSelect-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {isOpen && (
        <ul className="GuessSelect-options" role="listbox">
          {options.map((option) => {
            const isSelected = option.word === value;
            const hasMetadata = option.bucketCount !== undefined && option.largestBucket !== undefined;

            return (
              <li
                key={option.word}
                role="option"
                aria-selected={isSelected}
                className={isSelected ? 'GuessSelect-option GuessSelect-option-selected' : 'GuessSelect-option'}
                onClick={() => handleSelect(option.word)}
              >
                <div className="GuessSelect-option-word">
                  {isSelected && <span aria-hidden="true">✓ </span>}
                  {option.word.toUpperCase()}
                </div>
                {hasMetadata && (
                  <div
                    className="GuessSelect-option-meta"
                    title={`Splits the remaining words into ${option.bucketCount} groups; worst case, ${option.largestBucket} words are left`}
                  >
                    <span>
                      🪣 {option.bucketCount} {option.bucketCount === 1 ? 'group' : 'groups'}
                    </span>
                    <span>📉 ≤{option.largestBucket} words left</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
