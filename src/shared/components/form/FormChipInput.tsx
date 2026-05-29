import { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  label?: string;
  error?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}

function parseChips(value: string): string[] {
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

export function FormChipInput({ label, error, placeholder, value, onChange }: Props) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const chips = parseChips(value);

  function commitChip(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = [...chips, trimmed];
    onChange(next.join(', '));
  }

  function removeChip(index: number) {
    const next = chips.filter((_, i) => i !== index);
    onChange(next.join(', '));
  }

  function handleChange(text: string) {
    if (text.includes(',')) {
      const parts = text.split(',');
      const toCommit = parts[0]?.trim() ?? '';
      const remainder = parts.slice(1).join(',');
      if (toCommit) commitChip(toCommit);
      setInputValue(remainder);
    } else {
      setInputValue(text);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitChip(inputValue);
      setInputValue('');
    }
  }

  function handleBlur() {
    if (inputValue.trim()) {
      commitChip(inputValue);
      setInputValue('');
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>}
      <div
        className={`flex flex-wrap gap-1.5 min-h-[42px] rounded-xl px-3 py-2 cursor-text border ${
          error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)]'
        }`}
        style={{ background: 'var(--color-input-bg)' }}
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((chip, index) => (
          <span
            key={`${chip}-${index}`}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium"
            style={{
              background: 'var(--color-outline)',
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-input-border)',
            }}
          >
            {chip}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeChip(index); }}
              className="flex items-center justify-center rounded-full opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={chips.length === 0 ? placeholder : undefined}
          className="flex-1 min-w-[80px] bg-transparent outline-none focus-visible:outline-none text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
        />
      </div>
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  );
}
