import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Accessibility, Minus, Plus, RotateCcw, X } from 'lucide-react';

// Native accessibility panel: text size, high contrast, reduce motion, and a
// link to the accessibility statement. Settings persist in localStorage and are
// applied to <html> so they cascade through the app's CSS-variable theming.
// No external scripts, cookies, or network calls.

interface A11ySettings {
  fontScale: number;
  highContrast: boolean;
  reduceMotion: boolean;
}

const STORAGE_KEY = 'a11y_settings';
const MIN_SCALE = 1;
const MAX_SCALE = 1.6;
const STEP = 0.1;
const DEFAULTS: A11ySettings = { fontScale: 1, highContrast: false, reduceMotion: false };

function loadSettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<A11ySettings>) };
  } catch {
    return DEFAULTS;
  }
}

function applySettings(s: A11ySettings) {
  const root = document.documentElement;
  root.style.setProperty('zoom', String(s.fontScale));
  if (s.highContrast) root.setAttribute('data-a11y-contrast', 'true');
  else root.removeAttribute('data-a11y-contrast');
  if (s.reduceMotion) root.setAttribute('data-a11y-reduce-motion', 'true');
  else root.removeAttribute('data-a11y-reduce-motion');
}

export function AccessibilityWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(loadSettings);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Apply + persist whenever settings change (and on first mount).
  useEffect(() => {
    applySettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Close on Escape (returning focus to the toggle) and on outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !toggleRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const update = useCallback((patch: Partial<A11ySettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const changeScale = (dir: 1 | -1) =>
    update({ fontScale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(settings.fontScale + dir * STEP).toFixed(2))) });

  const reset = () => setSettings(DEFAULTS);

  const scalePct = Math.round(settings.fontScale * 100);

  return (
    <>
      {/* Floating toggle button */}
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('a11y.openMenu')}
        title={t('a11y.openMenu')}
        className="fixed bottom-4 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2"
        style={{
          insetInlineStart: 16,
          zIndex: 50,
          background: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
        }}
      >
        <Accessibility size={24} aria-hidden="true" />
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('a11y.title')}
          tabIndex={-1}
          className="fixed bottom-20 w-[290px] rounded-[var(--radius-card)] p-4 shadow-2xl focus:outline-none"
          style={{
            insetInlineStart: 16,
            zIndex: 50,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-outline)',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('a11y.title')}</h2>
            <button
              type="button"
              onClick={() => { setOpen(false); toggleRef.current?.focus(); }}
              aria-label={t('a11y.close')}
              className="flex h-7 w-7 items-center justify-center rounded-[7px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Text size */}
          <div className="mb-3">
            <p className="mb-1.5 text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('a11y.textSize')}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeScale(-1)}
                disabled={settings.fontScale <= MIN_SCALE}
                aria-label={t('a11y.decrease')}
                className="flex h-9 flex-1 items-center justify-center rounded-[9px] disabled:opacity-40"
                style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
              >
                <Minus size={16} aria-hidden="true" />
              </button>
              <span className="w-12 text-center text-[13px] font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }} aria-live="polite">
                {scalePct}%
              </span>
              <button
                type="button"
                onClick={() => changeScale(1)}
                disabled={settings.fontScale >= MAX_SCALE}
                aria-label={t('a11y.increase')}
                className="flex h-9 flex-1 items-center justify-center rounded-[9px] disabled:opacity-40"
                style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* High contrast */}
          <ToggleRow
            label={t('a11y.highContrast')}
            checked={settings.highContrast}
            onChange={(v) => update({ highContrast: v })}
          />
          {/* Reduce motion */}
          <ToggleRow
            label={t('a11y.reduceMotion')}
            checked={settings.reduceMotion}
            onChange={(v) => update({ reduceMotion: v })}
          />

          {/* Reset + statement link */}
          <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--color-outline)' }}>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 text-[12.5px] font-medium"
              style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <RotateCcw size={13} aria-hidden="true" /> {t('a11y.reset')}
            </button>
            <Link to="/accessibility" className="text-[12.5px] font-semibold hover:underline" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
              {t('legal.accessibility')}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: checked ? 'var(--color-primary)' : 'var(--color-outline)' }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{ insetInlineStart: checked ? 22 : 2 }}
        />
      </button>
    </div>
  );
}
