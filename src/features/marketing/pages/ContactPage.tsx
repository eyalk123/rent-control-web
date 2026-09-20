import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { MarketingHeader, MarketingFooter } from '../components/MarketingChrome';
import { CONTACT_EMAIL } from '@/features/legal/legalContent';

/**
 * Public contact page.
 *
 * Exists because a payment provider underwriting the account requires a contact route
 * reachable from the homepage — the address inside the policy documents does not count.
 * It is deliberately a real page rather than a bare `mailto:` in the footer, so the link
 * survives a visitor with no mail client configured and has somewhere to state who
 * operates the service.
 *
 * The address itself is read from `legalContent`, which is the single place it is written
 * down; changing the support address must not mean hunting through pages.
 */
export function ContactPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      <div className="mx-auto w-full max-w-[1080px]">
        <MarketingHeader tone="light" />
      </div>

      <main className="mx-auto w-full max-w-[760px] px-6 pt-12 pb-4">
        <h1
          className="text-[30px] sm:text-[36px] font-bold leading-tight"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.025em' }}
        >
          {t('marketing.contact.heading')}
        </h1>
        <p
          className="mt-3 text-[15.5px] leading-relaxed"
          style={{ color: 'var(--color-text-secondary)', maxWidth: '56ch' }}
        >
          {t('marketing.contact.subhead')}
        </p>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-8 rounded-[14px] px-6 py-5 flex items-center gap-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-outline)',
            textDecoration: 'none',
          }}
        >
          <span
            className="flex items-center justify-center rounded-[10px] shrink-0"
            style={{
              width: 40,
              height: 40,
              background: 'var(--color-primary-container)',
              color: 'var(--color-on-primary-container)',
            }}
          >
            <Mail size={19} strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('marketing.contact.emailLabel')}
            </span>
            <span
              className="block text-[16px] font-semibold break-all"
              style={{ color: 'var(--color-primary)' }}
            >
              {CONTACT_EMAIL}
            </span>
          </span>
        </a>

        <section className="mt-8">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('marketing.contact.responseHeading')}
          </h2>
          <p
            className="mt-2 text-[14.5px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)', maxWidth: '62ch' }}
          >
            {t('marketing.contact.responseBody')}
          </p>
        </section>

        <section className="mt-7">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('marketing.contact.operatorHeading')}
          </h2>
          <p
            className="mt-2 text-[14.5px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)', maxWidth: '62ch' }}
          >
            {t('marketing.contact.operatorBody')}
          </p>
        </section>
      </main>

      <div className="flex-1" />
      <MarketingFooter />
    </div>
  );
}
