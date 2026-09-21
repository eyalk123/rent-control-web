import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileScan, Lock } from 'lucide-react';
import { useSubscription } from '../queries';

/**
 * How many AI lease scans are left this month.
 *
 * Shown before the scan, not after it fails. A quota someone discovers by uploading a
 * document and being refused has cost them the upload; the number is cheap to show and
 * the refusal is not.
 *
 * Renders nothing on a plan with no ceiling — an unlimited allowance is not news, and a
 * permanent "unlimited" strip is just furniture in the way of the picker.
 */
export function ScanQuotaStrip() {
  const { t, i18n } = useTranslation();
  const { data } = useSubscription();

  if (!data?.enforced || data.monthly_lease_scans === null) return null;

  const remaining = Math.max(0, data.monthly_lease_scans - data.lease_scans_used);
  const exhausted = remaining === 0;

  return (
    <div
      className="rounded-[11px] px-4 py-3 mb-4 flex items-start gap-3"
      style={{
        background: exhausted ? 'var(--color-surface)' : 'var(--color-primary-container)',
        border: `1px solid ${exhausted ? 'var(--color-outline)' : 'transparent'}`,
      }}
      role="status"
    >
      <span
        className="shrink-0"
        style={{
          color: exhausted ? 'var(--color-text-secondary)' : 'var(--color-on-primary-container)',
          marginTop: 1,
        }}
      >
        {exhausted ? <Lock size={15} strokeWidth={2.4} /> : <FileScan size={15} strokeWidth={2.4} />}
      </span>

      <div className="min-w-0">
        <p
          className="text-[13.5px] font-semibold"
          style={{
            color: exhausted ? 'var(--color-text-primary)' : 'var(--color-on-primary-container)',
          }}
        >
          {exhausted
            ? t('subscription.scanLimit.used', { limit: data.monthly_lease_scans })
            : t('subscription.scanLimit.remaining', { count: remaining })}
        </p>

        {exhausted && (
          <>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('subscription.scanLimit.resets', { date: nextMonthLabel(i18n.language) })}
            </p>
            <Link
              to="/settings/subscription"
              className="mt-1.5 inline-block text-[13px] font-semibold hover:underline"
              style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              {t('subscription.scanLimit.upgrade')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * When the allowance comes back: the first of next month.
 *
 * Computed here rather than read from the 402 body, because the strip is shown *before*
 * anything has been refused and there is no error to read it from. The server uses the
 * same calendar-month boundary.
 */
function nextMonthLabel(language: string): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString(language, { month: 'long', day: 'numeric' });
}
