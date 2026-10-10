import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellRing, FileBarChart, Sparkles, TrendingUp } from 'lucide-react';
import { MarketingHeader, MarketingFooter } from '../components/MarketingChrome';
import { LeaseScanDemo } from '../components/LeaseScanDemo';
import { TIERS } from '../tiers';

/** What the product does once a lease is in — the hero already shows the scan itself. */
const FEATURES = [
  { key: 'assistant', icon: Sparkles },
  { key: 'alerts', icon: BellRing },
  { key: 'rent', icon: TrendingUp },
  { key: 'reports', icon: FileBarChart },
] as const;

export function LandingPage() {
  const { t } = useTranslation();
  const freeNote = t('marketing.hero.freeNote', { max: TIERS[0].max });

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
                className="mt-5 text-[17px] sm:text-[18px] leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.72)', maxWidth: '40ch' }}
              >
                {t('marketing.hero.subhead')}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
                <Link
                  to="/sign-in"
                  className="h-11 px-6 flex items-center rounded-[10px] text-[14.5px] font-semibold"
                  style={{ background: 'var(--color-primary)', color: '#FFFFFF', textDecoration: 'none' }}
                >
                  {t('marketing.hero.primaryCta')}
                </Link>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {freeNote}
                </p>
              </div>
            </div>

            <div className="flex-1 flex justify-center lg:justify-end min-w-0">
              <LeaseScanDemo />
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[880px] px-6 pt-16 lg:pt-24">
        <h2
          className="text-[24px] sm:text-[28px] font-bold leading-tight"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
        >
          {t('marketing.features.heading')}
        </h2>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
          {FEATURES.map(({ key, icon: Icon }) => (
            <div key={key} className="flex items-start gap-4">
              <span
                className="flex items-center justify-center rounded-[10px] shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  background: 'var(--color-primary-container)',
                  color: 'var(--color-on-primary-container)',
                }}
              >
                <Icon size={19} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
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
      </section>

      {/* ── Closing ────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[880px] px-6 pt-20 pb-20 lg:pt-28 lg:pb-24 text-center">
        <h2
          className="text-[24px] sm:text-[28px] font-bold leading-tight"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
        >
          {t('marketing.closing.heading')}
        </h2>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
          {freeNote}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Link
            to="/sign-in"
            className="h-11 px-6 flex items-center rounded-[10px] text-[14.5px] font-semibold"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}
          >
            {t('marketing.hero.primaryCta')}
          </Link>
          <Link to="/pricing" className="text-[14.5px] font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>
            {t('marketing.closing.pricingLink')}
          </Link>
        </div>
      </section>

      <div className="flex-1" />
      <MarketingFooter />
    </div>
  );
}
