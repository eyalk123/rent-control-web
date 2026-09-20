import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { MarketingHeader, MarketingFooter } from '../components/MarketingChrome';
import {
  PAID_TIERS,
  TIERS,
  bandLabel,
  monthlyEquivalent,
  yearlySavingPercent,
  type BillingPeriod,
} from '../tiers';

const INCLUDED = ['ledger', 'leases', 'reports', 'reminders', 'documents', 'bilingual'] as const;

export function PricingPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<BillingPeriod>('monthly');

  const free = TIERS[0];
  // Every paid tier is discounted identically, so one figure describes the whole yearly
  // option. Read from the data rather than written into the copy, so changing a price
  // cannot leave the claim behind.
  const saving = yearlySavingPercent(PAID_TIERS[0]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      <div className="mx-auto w-full max-w-[1080px]">
        <MarketingHeader tone="light" />
      </div>

      <main className="mx-auto w-full max-w-[1080px] px-6 pt-12 pb-4">
        <h1
          className="text-[30px] sm:text-[36px] font-bold leading-tight"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.025em', maxWidth: '18ch' }}
        >
          {t('marketing.pricing.heading')}
        </h1>
        <p
          className="mt-3 text-[15.5px] leading-relaxed"
          style={{ color: 'var(--color-text-secondary)', maxWidth: '56ch' }}
        >
          {t('marketing.pricing.subhead')}
        </p>

        {/* Billing period */}
        <div className="mt-8 flex items-center gap-3 flex-wrap">
          <div
            className="inline-flex p-1 rounded-[11px]"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
            role="group"
            aria-label={t('marketing.pricing.billingPeriod')}
          >
            {(['monthly', 'yearly'] as BillingPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className="h-9 px-4 rounded-[8px] text-[13.5px] font-semibold transition-colors"
                style={{
                  background: period === p ? 'var(--color-primary)' : 'transparent',
                  color: period === p ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t(`marketing.pricing.${p}`)}
              </button>
            ))}
          </div>
          {saving !== null && (
            <span className="text-[13.5px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('marketing.pricing.yearlySaving', { percent: saving })}
            </span>
          )}
        </div>

        {/* Free band — deliberately not a fourth card. There is no plan to buy here; it is
            what an account is before it has one, so it reads as a starting condition. */}
        <div
          className="mt-8 rounded-[14px] px-6 py-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
          style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-outline)' }}
        >
          <div className="min-w-0">
            <p className="text-[15.5px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {t('marketing.pricing.freeHeading', { max: free.max })}
            </p>
            <p className="mt-1 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('marketing.pricing.freeBody')}
            </p>
          </div>
          <Link
            to="/sign-in"
            className="h-10 px-5 flex items-center rounded-[9px] text-[14px] font-semibold shrink-0"
            style={{
              background: 'transparent',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
              textDecoration: 'none',
            }}
          >
            {t('marketing.pricing.freeCta')}
          </Link>
        </div>

        {/* Paid tiers */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {PAID_TIERS.map((tier) => {
            const price = period === 'monthly' ? tier.monthly : tier.yearly;
            const perMonth = monthlyEquivalent(tier);
            return (
              <div
                key={tier.id}
                className="rounded-[16px] p-6 flex flex-col"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
              >
                <p
                  className="text-[13.5px] font-semibold"
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {t('marketing.pricing.propertiesBand', { band: bandLabel(tier, '+') })}
                </p>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span
                    className="text-[32px] font-semibold"
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--color-text-primary)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    ${price}
                  </span>
                  <span className="text-[13.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t(`marketing.pricing.per.${period}`)}
                  </span>
                </div>

                <p className="mt-1.5 text-[13px] min-h-[18px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {period === 'yearly' && perMonth !== null
                    ? t('marketing.pricing.perMonthEquivalent', { amount: perMonth })
                    : ''}
                </p>

                <Link
                  to="/sign-in"
                  className="mt-5 h-10 flex items-center justify-center rounded-[9px] text-[14px] font-semibold"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'var(--color-on-primary)',
                    textDecoration: 'none',
                  }}
                >
                  {t('marketing.pricing.choose')}
                </Link>
              </div>
            );
          })}
        </div>

        {/* What every plan includes — stated once rather than repeated in each card. */}
        <section className="mt-10">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('marketing.pricing.includedHeading')}
          </h2>
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2.5">
            {INCLUDED.map((key) => (
              <li key={key} className="flex items-start gap-2.5">
                <Check
                  size={16}
                  strokeWidth={2.6}
                  style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }}
                />
                <span className="text-[14px] leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
                  {t(`marketing.pricing.included.${key}`)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Subscription terms. Apple requires the title, duration and price per period to be
            disclosed alongside links to the Terms and Privacy Policy before purchase; Paddle's
            underwriters look for the same clarity plus a findable refund policy. One block
            satisfies both, which is why it is prose rather than fine print. */}
        <section
          className="mt-10 rounded-[14px] px-6 py-5"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        >
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('marketing.pricing.termsHeading')}
          </h2>
          <p
            className="mt-2 text-[13.5px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)', maxWidth: '78ch' }}
          >
            {t('marketing.pricing.termsBody')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
            <Link to="/terms" style={{ color: 'var(--color-primary)', textDecoration: 'none' }} className="hover:underline">
              {t('legal.termsOfService')}
            </Link>
            <Link to="/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'none' }} className="hover:underline">
              {t('legal.privacyPolicy')}
            </Link>
            <Link to="/refunds" style={{ color: 'var(--color-primary)', textDecoration: 'none' }} className="hover:underline">
              {t('legal.refundPolicy')}
            </Link>
          </div>
        </section>
      </main>

      <div className="flex-1" />
      <MarketingFooter />
    </div>
  );
}
