import { useTranslation } from 'react-i18next';
import { BellRing, MessageCircle, Sparkles } from 'lucide-react';

/**
 * The four features, each shown with the lease the hero just scanned rather than described in
 * the abstract: the same renter, property and rent turn up here, so the page reads as one
 * story — the lease goes in, and this is what happens next. Static on purpose; the hero is
 * the one place that moves.
 */

const KEYS = ['assistant', 'alerts', 'rent', 'reports'] as const;
type Key = (typeof KEYS)[number];

/** A year of net income per month, as fractions of the tallest bar — two repair months dip. */
const MONTHS = [0.86, 0.9, 0.9, 0.62, 0.9, 0.9, 0.93, 0.93, 0.93, 0.7, 0.93, 0.93];

export function FeatureTiles() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {KEYS.map((key) => (
        <div
          key={key}
          className="flex flex-col rounded-[16px] overflow-hidden"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        >
          <div
            className="h-[150px] px-5 flex items-center justify-center"
            style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-subtle-outline)' }}
            aria-hidden="true"
          >
            <Vignette name={key} />
          </div>
          <div className="px-5 pt-4 pb-5">
            <h3 className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {t(`marketing.features.${key}.heading`)}
            </h3>
            <p className="mt-1 text-[14.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t(`marketing.features.${key}.body`)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Vignette({ name }: { name: Key }) {
  const { t } = useTranslation();
  const ex = (field: string) => t(`marketing.features.${name}.example.${field}`);

  if (name === 'assistant') {
    return (
      <div className="w-full max-w-[280px] flex flex-col gap-2 text-[13px]">
        <span
          className="self-end rounded-[14px] rounded-ee-[4px] px-3 py-2"
          style={{ background: 'var(--color-primary-fill)', color: 'var(--color-on-primary)' }}
        >
          {ex('question')}
        </span>
        <span
          className="self-start flex items-center gap-2 rounded-[14px] rounded-es-[4px] px-3 py-2"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-outline)' }}
        >
          <Sparkles size={13} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
          {ex('answer')}
        </span>
      </div>
    );
  }

  if (name === 'alerts') {
    return (
      <div
        className="w-full max-w-[290px] rounded-[12px] p-3 flex flex-col gap-2.5"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex items-center justify-center rounded-[8px] shrink-0"
            style={{ width: 28, height: 28, background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}
          >
            <BellRing size={14} strokeWidth={2.4} />
          </span>
          <span className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
            {ex('notice')}
          </span>
        </div>
        {/* WhatsApp's own green: the button opens WhatsApp, so it should look like it */}
        <span
          className="self-start flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
          style={{ background: '#25D366', color: '#FFFFFF' }}
        >
          <MessageCircle size={13} strokeWidth={2.4} />
          {ex('action')}
        </span>
      </div>
    );
  }

  if (name === 'rent') {
    return (
      <div className="flex flex-col items-center gap-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <div className="flex items-center gap-3 text-[22px] font-bold">
          <span style={{ color: 'var(--color-text-secondary)', textDecoration: 'line-through', textDecorationThickness: 1.5 }}>
            {ex('from')}
          </span>
          {/* Points forward in either reading direction */}
          <span className="rtl:-scale-x-100" style={{ color: 'var(--color-text-secondary)' }}>
            →
          </span>
          <span style={{ color: 'var(--color-text-primary)' }}>{ex('to')}</span>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[12px] font-medium"
          style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}
        >
          {ex('when')}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[290px] flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        <span style={{ color: 'var(--color-text-secondary)' }}>{ex('title')}</span>
        <span className="font-bold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {ex('net')}
        </span>
      </div>
      <div className="h-[64px] flex items-end gap-[5px]">
        {MONTHS.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-t-[3px]"
            style={{ height: `${h * 100}%`, background: 'var(--color-chart-1)', opacity: 0.85 }}
          />
        ))}
      </div>
    </div>
  );
}
