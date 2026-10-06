import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useAiConsent } from './AiConsentContext';

/**
 * The AI consent prompt, ported from the mobile app's AiConsentSheet.
 *
 * "Not now" is a real answer, not a dismissal to nag about: nothing is sent, the scan or
 * message simply doesn't happen, and the question comes back the next time they try.
 * Escape and the backdrop mean the same.
 *
 * Above the drawers it is opened from and above the tour overlay (1000), like mobile.
 */
export function AiConsentDialog() {
  const { t } = useTranslation();
  const { promptOpen, answer } = useAiConsent();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const decline = useCallback(() => {
    if (saving) return;
    setError(false);
    void answer(false);
  }, [answer, saving]);

  useEffect(() => {
    if (!promptOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') decline();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [promptOpen, decline]);

  const allow = async () => {
    setSaving(true);
    setError(false);
    try {
      await answer(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  if (!promptOpen) return null;

  const muted = { color: 'var(--color-text-secondary)' };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={decline} aria-hidden />
      <div
        className="relative z-10 mx-4 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
            color: 'var(--color-primary)',
          }}
        >
          <Sparkles size={18} aria-hidden />
        </div>
        <h3
          id="ai-consent-title"
          className="mt-4 text-lg font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('aiConsent.title')}
        </h3>
        <div className="mt-2 space-y-2 text-[13.5px] leading-relaxed" style={muted}>
          <p>{t('aiConsent.intro')}</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>{t('aiConsent.sendsLease')}</li>
            <li>{t('aiConsent.sendsQuestions')}</li>
          </ul>
          <p>{t('aiConsent.handling')}</p>
          <p>{t('aiConsent.optional')}</p>
        </div>
        {/* /privacy is a public route, so reading it in a new tab leaves this prompt open. */}
        <a
          href="/privacy"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-[13.5px] font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          {t('legal.privacyPolicy')}
        </a>

        {error && (
          <p className="mt-3 text-xs" style={{ color: 'var(--color-error)' }}>
            {t('aiConsent.error')}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={decline}
            disabled={saving}
            className="h-10 flex-1 rounded-[9px] text-[13px] font-medium disabled:opacity-50"
            style={{ border: '1px solid var(--color-outline)', background: 'var(--color-surface)', ...muted }}
          >
            {t('aiConsent.notNow')}
          </button>
          <button
            type="button"
            onClick={() => void allow()}
            disabled={saving}
            className="h-10 flex-1 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {saving ? '…' : t('aiConsent.allow')}
          </button>
        </div>
      </div>
    </div>
  );
}
