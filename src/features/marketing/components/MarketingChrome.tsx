import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage, type SupportedLanguage } from '@/hooks/useLanguage';
import { LegalLinks } from '@/features/legal/LegalLayout';
import logoImage from '@/assets/rent-control-icon-no-text.png';

/**
 * Header and footer for the two public marketing pages.
 *
 * `tone` exists because the landing hero is brand navy and the pricing page is the ordinary
 * app background. Rather than give each page its own header, the same one takes the colours
 * it needs — otherwise the two pages drift apart the first time either is edited.
 */
export type ChromeTone = 'navy' | 'light';

function toneColors(tone: ChromeTone) {
  return tone === 'navy'
    ? {
        text: 'rgba(255,255,255,0.92)',
        muted: 'rgba(255,255,255,0.62)',
        border: 'rgba(255,255,255,0.14)',
        activeBg: 'rgba(255,255,255,0.14)',
      }
    : {
        text: 'var(--color-text-primary)',
        muted: 'var(--color-text-secondary)',
        border: 'var(--color-outline)',
        activeBg: 'var(--color-primary-container)',
      };
}

function LanguageToggle({ tone }: { tone: ChromeTone }) {
  const { language, setLanguage } = useLanguage();
  const c = toneColors(tone);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language">
      {(['en', 'he'] as SupportedLanguage[]).map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          onClick={() => setLanguage(lng)}
          aria-pressed={language === lng}
          className="h-8 px-2.5 rounded-[8px] text-[12.5px] font-semibold transition-colors"
          style={{
            background: language === lng ? c.activeBg : 'transparent',
            color: language === lng ? c.text : c.muted,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {lng === 'en' ? 'EN' : 'עברית'}
        </button>
      ))}
    </div>
  );
}

export function MarketingHeader({ tone }: { tone: ChromeTone }) {
  const { t } = useTranslation();
  const c = toneColors(tone);
  return (
    <header
      className="flex items-center justify-between gap-4 px-6 py-4"
      style={{ borderBottom: tone === 'light' ? `1px solid ${c.border}` : 'none' }}
    >
      <Link to="/" className="flex items-center gap-2.5 shrink-0" style={{ textDecoration: 'none' }}>
        {/* The mark is dark-on-transparent and disappears against the navy hero, and there is
            no light variant of it. A light tile is the honest fix: it reads as a logo lockup
            rather than a washed-out icon, and it costs no new asset. */}
        <span
          className="flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: tone === 'navy' ? '#FFFFFF' : 'transparent',
          }}
        >
          <img src={logoImage} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
        </span>
        <span className="text-[15px] font-bold" style={{ color: c.text }}>
          {t('marketing.productName')}
        </span>
      </Link>

      <nav className="flex items-center gap-1.5" aria-label={t('marketing.productName')}>
        <LanguageToggle tone={tone} />
        <Link
          to="/pricing"
          className="h-9 px-3 hidden sm:flex items-center rounded-[9px] text-[13.5px] font-semibold transition-colors"
          style={{ color: c.muted, textDecoration: 'none' }}
        >
          {t('marketing.nav.pricing')}
        </Link>
        <Link
          to="/sign-in"
          className="h-9 px-4 flex items-center rounded-[9px] text-[13.5px] font-semibold"
          style={{
            background: tone === 'navy' ? '#FFFFFF' : 'var(--color-primary)',
            color: tone === 'navy' ? 'var(--color-brand-navy)' : 'var(--color-on-primary)',
            textDecoration: 'none',
          }}
        >
          {t('marketing.nav.signIn')}
        </Link>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  const { t } = useTranslation();
  return (
    <footer
      className="mt-20 px-6 py-8"
      style={{ borderTop: '1px solid var(--color-outline)', background: 'var(--color-surface)' }}
    >
      <div className="mx-auto max-w-[1080px] flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          {t('marketing.footer.operator')}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px]">
          <LegalLinks />
        </div>
      </div>
    </footer>
  );
}
