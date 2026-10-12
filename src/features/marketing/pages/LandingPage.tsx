import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MarketingHeader, MarketingFooter } from '../components/MarketingChrome';
import { LeaseScanDemo } from '../components/LeaseScanDemo';
import { FeatureTiles } from '../components/FeatureTiles';
import { StoreBadges } from '../components/StoreBadges';
import { TIERS } from '../tiers';

export function LandingPage() {
  const { t } = useTranslation();
  const freeNote = t('marketing.hero.freeNote', { max: TIERS[0].max });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      {/* One background for the whole hero: the navy stops partway down the demo, so the demo
          straddles the hero and the page. Split over two elements, the join showed as a hairline. */}
      <div
        className="overflow-x-clip"
        style={{ background: 'linear-gradient(var(--color-brand-navy) calc(100% - 200px), transparent calc(100% - 200px))' }}
      >
        <div>
          <div className="mx-auto max-w-[1080px]">
            <MarketingHeader tone="navy" />
          </div>

          <div className="mx-auto max-w-[1080px] px-6 pt-12 pb-14 lg:pt-16 lg:pb-16 flex flex-col items-center text-center">
            <h1
              className="text-[34px] sm:text-[42px] lg:text-[52px] font-bold leading-[1.08]"
              style={{ color: '#FFFFFF', letterSpacing: '-0.025em', maxWidth: '18ch', textWrap: 'balance' }}
            >
              {t('marketing.hero.headline')}
            </h1>
            <p
              className="mt-5 text-[17px] sm:text-[18px] leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.72)', maxWidth: '40ch' }}
            >
              {t('marketing.hero.subhead')}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <StartFree />
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {freeNote}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6">
          <div className="mx-auto max-w-[880px] flex justify-center">
            <LeaseScanDemo />
          </div>
        </div>
      </div>

      {/* ── What happens next ──────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[880px] px-6 pt-20 lg:pt-28">
        <h2
          className="text-[24px] sm:text-[28px] font-bold leading-tight"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
        >
          {t('marketing.features.heading')}
        </h2>
        <div className="mt-8">
          <FeatureTiles />
        </div>
      </section>

      {/* ── Closing: navy again, so the page is framed by the hero and this ─── */}
      <section className="mt-20 lg:mt-28 px-6 py-16 lg:py-20 text-center" style={{ background: 'var(--color-brand-navy)' }}>
        <h2
          className="text-[26px] sm:text-[32px] font-bold leading-tight"
          style={{ color: '#FFFFFF', letterSpacing: '-0.02em' }}
        >
          {t('marketing.closing.heading')}
        </h2>
        <p className="mt-3 text-[15px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {freeNote}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <StartFree />
          <Link to="/pricing" className="text-[14.5px] font-semibold hover:underline" style={{ color: '#FFFFFF' }}>
            {t('marketing.closing.pricingLink')}
          </Link>
        </div>
        <div className="mt-10">
          <StoreBadges />
        </div>
      </section>

      <div className="flex-1" />
      <MarketingFooter flush />
    </div>
  );
}

function StartFree() {
  const { t } = useTranslation();
  return (
    <Link
      to="/sign-in"
      className="h-11 px-6 flex items-center rounded-[10px] text-[14.5px] font-semibold"
      style={{ background: 'var(--color-primary)', color: '#FFFFFF', textDecoration: 'none' }}
    >
      {t('marketing.hero.primaryCta')}
    </Link>
  );
}
