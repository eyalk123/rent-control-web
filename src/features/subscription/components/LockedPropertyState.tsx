import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import type { PlanLimitError } from '../types';

/**
 * Whether a failed request was refused because its property is over the plan's limit.
 *
 * A locked property answers every read with 402 `property_locked` — its detail, its
 * renters, its transactions. Detail pages check this before falling back to "not found",
 * so an old link or a bookmark says what actually happened.
 */
export function isPropertyLockedError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { detail?: PlanLimitError } } })
    ?.response;
  return response?.status === 402 && response.data?.detail?.error === 'property_locked';
}

/**
 * In-page state for a property the plan no longer covers.
 *
 * Replaces the detail view rather than showing a disabled one: a locked property cannot
 * be opened at all. Points at the two ways out — a bigger plan, or deleting a property
 * from the list (the stub card there carries the delete button).
 */
export function LockedPropertyState() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: 'var(--color-background)' }}
      data-testid="locked-property-state"
    >
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}
      >
        <Lock size={28} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {t('subscription.lockedDetail.title')}
      </p>
      <p className="mt-2 text-sm max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {t('subscription.lockedDetail.body')}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => navigate('/properties')}
          className="h-9 px-4 rounded-[9px] text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
        >
          {t('subscription.lockedDetail.back')}
        </button>
        <button
          onClick={() => navigate('/plans')}
          className="h-9 px-4 rounded-[9px] text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          {t('subscription.lockedDetail.cta')}
        </button>
      </div>
    </div>
  );
}
