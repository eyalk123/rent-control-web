import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarClock, FileBarChart, Languages } from 'lucide-react';
import { MarketingHeader, MarketingFooter } from '../components/MarketingChrome';
import { LedgerSpecimen } from '../components/LedgerSpecimen';
import { TIERS, bandLabel } from '../tiers';

/** Secondary capabilities — lighter weight than the lead block above them. */
const SECONDARY = [
  { key: 'reports', icon: FileBarChart },
  { key: 'reminders', icon: CalendarClock },
  { key: 'bilingual', icon: Languages },
] as const;

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--color-brand-navy)' }}>
        <div className="mx-auto max-w-[1080px]">
          <MarketingHeader tone="navy" />
        </div>

        <div className="mx-auto max-w-[1080px] px-6 pt-14 pb-20 lg:pt-20 lg:pb-28">
          <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-16">
            <div className="flex-1 min-w-0">
              <h1
                className="text-[34px] sm:text-[42px] lg:text-[48px] font-bold leading-[1.1]"
                style={{ color: '#FFFFFF', letterSpacing: '-0.025em', maxWidth: '16ch' }}
              >
                {t('marketing.hero.headline')}
              </h1>
              <p
                className="mt-5 text-[16px] sm:text-[17px] leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.72)', maxWidth: '52ch' }}
              >
                {t('marketing.hero.subhead')}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/sign-in"
                  className="h-11 px-6 flex items-center rounded-[10px] text-[14.5px] font-semibold"
                  style={{ background: 'var(--color-primary)', color: '#FFFFFF', textDecoration: 'none' }}
                >
                  {t('marketing.hero.primaryCta')}
                </Link>
                <Link
                  to="/pricing"
                  className="h-11 px-6 flex items-center rounded-[10px] text-[14.5px] font-semibold"
                  style={{
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.92)',
                    border: '1px solid rgba(255,255,255,0.26)',
                    textDecoration: 'none',
                  }}
                >
                  {t('marketing.hero.secondaryCta')}
                </Link>
              </div>

              <p className="mt-4 text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {t('marketing.hero.freeNote', { max: TIERS[0].max })}
              </p>
            </div>

            <div className="flex-1 flex justify-center lg:justify-end min-w-0">
              <LedgerSpecimen />
            </div>
          </div>
        </div>
      </div>

      {/* ── Lead capability: scheduled rent changes ────────────────────────── */}
      <section className="mx-auto w-full max-w-[1080px] px-6 pt-16 lg:pt-20">
        <div
          className="rounded-[18px] p-7 sm:p-10"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        >
          <h2
            className="text-[24px] sm:text-[28px] font-bold leading-tight"
            style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em', maxWidth: '32ch' }}
          >
            {t('marketing.lead.heading')}
          </h2>
          <p
            className="mt-4 text-[15px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)', maxWidth: '62ch' }}
          >
            {t('marketing.lead.body')}
          </p>
        </div>
      </section>

      {/* ── Secondary capabilities ─────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1080px] px-6 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {SECONDARY.map(({ key, icon: Icon }) => (
            <div key={key} className="flex flex-col gap-3">
              <span
                className="flex items-center justify-center rounded-[10px]"
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--color-primary-container)',
                  color: 'var(--color-on-primary-container)',
                }}
              >
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <h3 className="text-[15.5px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {t(`marketing.features.${key}.heading`)}
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t(`marketing.features.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing teaser ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1080px] px-6 pt-16">
        <div
          className="rounded-[18px] px-7 py-8 sm:px-10 flex flex-col md:flex-row md:items-center gap-7"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        >
          <div className="flex-1 min-w-0">
            <h2
              className="text-[21px] font-bold leading-tight"
              style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.015em' }}
            >
              {t('marketing.pricingTeaser.heading')}
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t('marketing.pricingTeaser.body', { max: TIERS[0].max })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 shrink-0">
            {TIERS.map((tier) => (
              <div key={tier.id} className="flex flex-col">
                <span
                  className="text-[12.5px]"
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {bandLabel(tier, '+')}
                </span>
                <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {tier.monthly === null ? t('marketing.pricing.free') : `$${tier.monthly}`}
                </span>
              </div>
            ))}
            <Link
              to="/pricing"
              className="h-10 px-5 flex items-center rounded-[9px] text-[14px] font-semibold"
              style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}
            >
              {t('marketing.pricingTeaser.cta')}
            </Link>
          </div>
        </div>
      </section>

      <div className="flex-1" />
      <MarketingFooter />
    </div>
  );
}
