import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppAuth } from '@/core/auth/AuthContext';
import logoImage from '@/assets/rent-control-icon-no-text.png';
import { useAcceptLegal } from './queries';
import { withLinks } from './withLinks';
import type { LegalDocument } from './api/legalAcceptance';

/**
 * The blocking consent screen.
 *
 * It exists because the checkbox on the sign-up form cannot be the enforcement point.
 * **Continue with Google** creates the Firebase account the instant the popup closes —
 * there is no moment in that flow where a checkbox could be shown, let alone required. A
 * gate that runs *after* authentication is the only thing that covers every way in, and it
 * covers three other cases for free: accounts that predate this feature, an acceptance POST
 * that was lost, and a future revision of either document.
 *
 * Declining signs out rather than deleting anything. The account and its data are
 * untouched; they can come back and accept whenever they like. No navigation call is
 * needed — ProtectedRoute redirects on `isSignedIn` going false.
 */
export function ConsentGate({ outstanding }: { outstanding: LegalDocument[] }) {
  const { t } = useTranslation();
  const { signOut } = useAppAuth();
  const accept = useAcceptLegal();
  const [checked, setChecked] = useState(false);

  const linkStyle = { color: 'var(--color-primary)' };
  const documentLink = (to: string, label: string) => (
    <a href={to} target="_blank" rel="noreferrer" style={linkStyle}>
      {label}
    </a>
  );

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: 'var(--color-background)' }}
    >
      <div
        className="w-full max-w-[440px] rounded-[14px] p-8"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src={logoImage}
            alt=""
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }}
          />
          <span className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            RentVance
          </span>
        </div>

        <h1
          className="mt-6 text-2xl font-bold"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}
        >
          {t('legal.gateTitle')}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('legal.gateDescription')}
        </p>

        {/* The documents open in a new tab: /terms and /privacy are public routes, so
            reading them does not pass back through this gate. */}
        <label
          className="mt-6 flex items-start gap-2 text-[13px] leading-snug"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <span>
            {withLinks(t('auth.acceptTerms'), {
              terms: documentLink('/terms', t('legal.termsOfService')),
              privacy: documentLink('/privacy', t('legal.privacyPolicy')),
            })}
          </span>
        </label>

        {accept.isError && (
          <p className="mt-3 text-xs text-center" style={{ color: 'var(--color-error)' }}>
            {t('legal.gateError')}
          </p>
        )}

        <button
          type="button"
          onClick={() => accept.mutate(outstanding)}
          disabled={!checked || accept.isPending}
          className="mt-5 h-11 w-full rounded-[10px] text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'var(--color-primary)' }}
        >
          {accept.isPending ? '…' : t('legal.gateAccept')}
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 h-10 w-full rounded-[10px] text-[12.5px] font-semibold"
          style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
        >
          {t('legal.gateDecline')}
        </button>
      </div>
    </div>
  );
}
