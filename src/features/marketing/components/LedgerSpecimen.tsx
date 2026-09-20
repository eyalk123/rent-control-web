import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';

/**
 * The hero illustration: one property as the product actually shows it.
 *
 * Deliberately not a screenshot. A screenshot goes stale the first time the app is restyled
 * and can never be translated; this is built from the same design tokens as the product, so
 * it follows the theme, flips for RTL and stays honest as the app evolves. The figures are
 * plainly illustrative — round numbers, a sample address — and every string is translated,
 * so the Hebrew visitor sees a Hebrew ledger rather than an English picture of one.
 */
export function LedgerSpecimen() {
  const { t } = useTranslation();

  const rows = [
    { key: 'rent', icon: ArrowDownLeft, amount: '+ 5,400', tone: 'in' as const },
    { key: 'committee', icon: ArrowUpRight, amount: '− 260', tone: 'out' as const },
    { key: 'repair', icon: ArrowUpRight, amount: '− 480', tone: 'out' as const },
  ];

  return (
    <div
      className="w-full max-w-[380px] rounded-[16px] overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-outline)',
        boxShadow: '0 24px 60px -20px rgba(0,0,0,0.45)',
      }}
      aria-hidden="true"
    >
      {/* Property header */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--color-subtle-outline)' }}>
        <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {t('marketing.specimen.address')}
        </p>
        <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          {t('marketing.specimen.renter')}
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span
            className="text-[30px] font-semibold"
            style={{
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            ₪5,400
          </span>
          <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            {t('marketing.specimen.perMonth')}
          </span>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-5 py-3 flex flex-col">
        {rows.map(({ key, icon: Icon, amount, tone }) => (
          <div key={key} className="flex items-center gap-3 py-2">
            <span
              className="flex items-center justify-center rounded-[8px] shrink-0"
              style={{
                width: 28,
                height: 28,
                background: tone === 'in' ? 'var(--color-rev-bg)' : 'var(--color-exp-bg)',
                color: tone === 'in' ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)',
              }}
            >
              <Icon size={14} strokeWidth={2.5} />
            </span>
            <span className="flex-1 text-[13.5px]" style={{ color: 'var(--color-text-primary)' }}>
              {t(`marketing.specimen.rows.${key}`)}
            </span>
            <span
              className="text-[13.5px] font-medium"
              style={{
                fontVariantNumeric: 'tabular-nums',
                color: tone === 'in' ? 'var(--color-rev-fg)' : 'var(--color-text-secondary)',
              }}
            >
              {amount}
            </span>
          </div>
        ))}
      </div>

      {/* The differentiator: the next scheduled rent change */}
      <div
        className="px-5 py-3.5 flex items-center gap-2.5"
        style={{ background: 'var(--color-primary-container)', borderTop: '1px solid var(--color-subtle-outline)' }}
      >
        <TrendingUp size={15} strokeWidth={2.5} style={{ color: 'var(--color-on-primary-container)', flexShrink: 0 }} />
        <p className="text-[12.5px] leading-snug" style={{ color: 'var(--color-on-primary-container)' }}>
          {t('marketing.specimen.escalation')}
        </p>
      </div>
    </div>
  );
}
