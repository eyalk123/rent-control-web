import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage, type SupportedLanguage } from '@/hooks/useLanguage';
import logoImage from '@/assets/rent-control-icon-no-text.png';
import type { LegalDoc } from './legalContent';

/** Inline row of links to the legal pages — reused on sign-in and settings. */
export function LegalLinks({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { t } = useTranslation();
  const linkStyle: React.CSSProperties = { color: 'var(--color-text-secondary)', textDecoration: 'none' };
  return (
    <nav className={className} style={style} aria-label={t('legal.sectionTitle')}>
      <Link to="/privacy" style={linkStyle} className="hover:underline">{t('legal.privacyPolicy')}</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/terms" style={linkStyle} className="hover:underline">{t('legal.termsOfService')}</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/accessibility" style={linkStyle} className="hover:underline">{t('legal.accessibility')}</Link>
    </nav>
  );
}

/** Full-page layout for a single legal document. */
export function LegalLayout({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3.5"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-outline)' }}
      >
        <Link to="/sign-in" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
          <img src={logoImage} alt="" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'contain' }} />
          <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>Rent Control</span>
        </Link>
        <div className="flex items-center gap-1" role="group" aria-label="Language">
          {(['en', 'he'] as SupportedLanguage[]).map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => setLanguage(lng)}
              aria-pressed={language === lng}
              className="h-8 px-3 rounded-[8px] text-[12.5px] font-semibold transition-colors"
              style={{
                background: language === lng ? 'var(--color-primary-container)' : 'transparent',
                color: language === lng ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {lng === 'en' ? 'EN' : 'עברית'}
            </button>
          ))}
        </div>
      </header>

      {/* Document */}
      <main className="mx-auto max-w-[760px] px-6 py-10">
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{doc.title}</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          {t('legal.lastUpdated')}: {doc.lastUpdated}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {doc.intro.map((p, i) => (
            <p key={i} className="text-[14.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{p}</p>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-7">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-[17px] font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{section.heading}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="text-[14.5px] leading-relaxed mb-2" style={{ color: 'var(--color-text-secondary)' }}>{p}</p>
              ))}
              {section.bullets && (
                <ul className="flex flex-col gap-1.5 mt-1 ps-5" style={{ listStyleType: 'disc' }}>
                  {section.bullets.map((b, i) => (
                    <li key={i} className="text-[14.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px]" style={{ borderTop: '1px solid var(--color-outline)' }}>
          <LegalLinks />
          <span aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }}> · </span>
          <Link to="/sign-in" className="hover:underline" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            {t('legal.backToSignIn')}
          </Link>
        </footer>
      </main>
    </div>
  );
}
