import Picker from 'react-mobile-picker';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import type { PickerValue } from 'react-mobile-picker';

export type WheelDatePickerMode = 'date' | 'month' | 'day';
type PickerState = Record<string, number>;

interface Props {
  mode: WheelDatePickerMode;
  value?: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  error?: string;
  minYear?: number;
  maxYear?: number;
}

const THIS_YEAR = new Date().getFullYear();
const ITEM_HEIGHT = 36;
const PICKER_HEIGHT = ITEM_HEIGHT * 5;

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseValue(value: string | number | undefined, mode: WheelDatePickerMode): PickerState {
  const now = new Date();
  if (mode === 'day') {
    const n = typeof value === 'number' ? value : Number(value);
    return { day: n >= 1 && n <= 31 ? n : 1 };
  }
  if (mode === 'month') {
    const m = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})$/) : null;
    return m
      ? { year: +m[1], month: +m[2] }
      : { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const m = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  return m
    ? { year: +m[1], month: +m[2], day: +m[3] }
    : { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function formatValue(state: PickerState, mode: WheelDatePickerMode): string | number {
  if (mode === 'day') return state.day;
  const y = String(state.year).padStart(4, '0');
  const mo = String(state.month).padStart(2, '0');
  if (mode === 'month') return `${y}-${mo}`;
  return `${y}-${mo}-${String(state.day).padStart(2, '0')}`;
}

export function WheelDatePicker({
  mode,
  value,
  onChange,
  label,
  error,
  minYear = THIS_YEAR - 5,
  maxYear = THIS_YEAR + 10,
}: Props) {
  const { t, i18n } = useTranslation();

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2000, i, 1)),
      ),
    [i18n.language],
  );

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i),
    [minYear, maxYear],
  );

  const pickerValue = useMemo(() => {
    const parsed = parseValue(value, mode);
    if (mode === 'date') {
      const max = daysInMonth(parsed.year, parsed.month);
      if (parsed.day > max) return { ...parsed, day: max };
    }
    return parsed;
  }, [value, mode]);

  const dayCount = mode === 'date' ? daysInMonth(pickerValue.year, pickerValue.month) : 31;

  function handleChange(newState: PickerValue) {
    const s = newState as PickerState;
    if (mode === 'date') {
      const max = daysInMonth(s.year, s.month);
      if (s.day > max) s.day = max;
    }
    onChange(formatValue(s, mode));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>
      )}
      <div
        dir="ltr"
        className="rounded-xl overflow-hidden relative"
        style={{
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-input-border)'}`,
          background: 'var(--color-input-bg)',
        }}
      >
        <Picker
          value={pickerValue as PickerValue}
          onChange={handleChange}
          height={PICKER_HEIGHT}
          itemHeight={ITEM_HEIGHT}
          wheelMode="natural"
          style={{ background: 'transparent' }}
        >
          {(mode === 'date' || mode === 'day') && (
            <Picker.Column name="day">
              {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                <Picker.Item key={d} value={d}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {String(d).padStart(2, '0')}
                  </span>
                </Picker.Item>
              ))}
            </Picker.Column>
          )}
          {(mode === 'date' || mode === 'month') && (
            <Picker.Column name="month">
              {monthNames.map((name, i) => (
                <Picker.Item key={i + 1} value={i + 1}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {name}
                  </span>
                </Picker.Item>
              ))}
            </Picker.Column>
          )}
          {(mode === 'date' || mode === 'month') && (
            <Picker.Column name="year">
              {years.map((y) => (
                <Picker.Item key={y} value={y}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {y}
                  </span>
                </Picker.Item>
              ))}
            </Picker.Column>
          )}
        </Picker>
        {/* Custom selection indicator that respects the design system */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: 12,
            right: 12,
            height: `${ITEM_HEIGHT}px`,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            borderTop: '1px solid var(--color-outline)',
            borderBottom: '1px solid var(--color-outline)',
            borderRadius: 6,
          }}
        />
      </div>
      {error && <p className="text-xs text-[var(--color-error)]">{t(error, { defaultValue: error })}</p>}
    </div>
  );
}
