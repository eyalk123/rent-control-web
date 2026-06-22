import Picker from 'react-mobile-picker';
import { useTranslation } from 'react-i18next';
import { useMemo, useRef, useState } from 'react';
import { Calendar, Lock, Pencil } from 'lucide-react';
import type { PickerValue } from 'react-mobile-picker';
import { RequiredMark } from './RequiredMark';

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
  required?: boolean;
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
  required,
}: Props) {
  const { t, i18n } = useTranslation();

  // Start locked when a value already exists (editing) so stray scrolls can't change it;
  // start unlocked for new/empty records so the user can pick straight away.
  const [locked, setLocked] = useState(
    () => value !== undefined && value !== null && value !== '',
  );
  // Hover highlight on the editing wheel — reinforces that the box is clickable (locks).
  const [hovered, setHovered] = useState(false);

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

  // Human-readable value shown in the collapsed (locked) field, localised per mode.
  const displayValue = useMemo(() => {
    if (mode === 'day') return String(pickerValue.day);
    const d = new Date(pickerValue.year, pickerValue.month - 1, mode === 'date' ? pickerValue.day : 1);
    return new Intl.DateTimeFormat(
      i18n.language,
      mode === 'date'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { month: 'long', year: 'numeric' },
    ).format(d);
  }, [pickerValue, mode, i18n.language]);

  function handleChange(newState: PickerValue) {
    const s = newState as PickerState;
    if (mode === 'date') {
      const max = daysInMonth(s.year, s.month);
      if (s.day > max) s.day = max;
    }
    onChange(formatValue(s, mode));
  }

  function toggleLock() {
    setLocked((prev) => {
      // unlocked -> locked: commit the currently displayed value so accepting the
      // default (which never fires onChange on its own) still saves it.
      if (!prev) onChange(formatValue(pickerValue, mode));
      return !prev;
    });
  }

  // Tap-vs-drag detection: a clean click on the (unlocked) picker body locks it, while
  // dragging the wheels (movement past the threshold) keeps scrolling. We never call
  // preventDefault/stopPropagation, so the library's own drag handling is untouched.
  const TAP_THRESHOLD = 6;
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  function handleBodyPointerDown(e: React.PointerEvent) {
    pointerDown.current = { x: e.clientX, y: e.clientY };
  }

  function handleBodyPointerUp(e: React.PointerEvent) {
    const start = pointerDown.current;
    pointerDown.current = null;
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < TAP_THRESHOLD) {
      toggleLock();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        {label ? (
          <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}{required && <RequiredMark />}</label>
        ) : (
          <span />
        )}
        {/* The Done button only appears while editing; when locked, the collapsed field
            itself is the affordance, so no button is needed there. */}
        {!locked && (
          <button
            type="button"
            onClick={toggleLock}
            className="text-sm font-medium hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('common.done')}
          </button>
        )}
      </div>

      {locked ? (
        // Collapsed, read-only field — looks like a normal input and is clearly tappable.
        <>
        <button
          type="button"
          onClick={() => setLocked(false)}
          title={t('common.edit')}
          className="flex w-full items-center justify-between gap-2 rounded-xl px-3.5 text-sm"
          style={{
            height: 42,
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-input-border)'}`,
            background: 'var(--color-input-bg)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            transition: 'border-color 150ms ease',
          }}
        >
          <span className="flex items-center gap-2">
            <Calendar size={16} style={{ color: 'var(--color-placeholder)' }} aria-hidden />
            <span className="font-medium">{displayValue}</span>
          </span>
          <Pencil size={15} style={{ color: 'var(--color-primary)' }} aria-hidden />
        </button>
        {/* Matching hint so the edit action is discoverable, mirroring "Tap to lock". */}
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--color-placeholder)' }}
        >
          <Pencil size={12} aria-hidden />
          {t('common.tapToEdit')}
        </div>
        </>
      ) : (
        // Expanded wheel — only rendered while editing.
        <>
        <div
          dir="ltr"
          className="rounded-xl overflow-hidden relative"
          onPointerDown={handleBodyPointerDown}
          onPointerUp={handleBodyPointerUp}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          title={t('common.tapToLock')}
          style={{
            border: `1px solid ${
              error ? 'var(--color-error)' : hovered ? 'var(--color-primary)' : 'var(--color-input-border)'
            }`,
            background: hovered ? 'var(--color-primary-container)' : 'var(--color-input-bg)',
            cursor: 'pointer',
            transition: 'border-color 150ms ease, background 150ms ease',
          }}
        >
          <Picker
            value={pickerValue as PickerValue}
            onChange={handleChange}
            height={PICKER_HEIGHT}
            itemHeight={ITEM_HEIGHT}
            wheelMode="normal"
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
          {/* Custom selection indicator that respects the design system. */}
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
        {/* Persistent hint so the lock action is discoverable without hovering. */}
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--color-placeholder)' }}
        >
          <Lock size={12} aria-hidden />
          {t('common.tapToLock')}
        </div>
        </>
      )}
      {error && <p className="text-xs text-[var(--color-error)]">{t(error, { defaultValue: error })}</p>}
    </div>
  );
}
