import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The marker on a property the plan no longer covers.
 *
 * A locked property cannot be opened: the list shows it as a stub and every other read
 * is refused. Nothing is deleted, though, and the account export still includes it — the
 * over-limit notice says so, so the badge itself can stay one word.
 */
export function LockedBadge({ size = 'default' }: { size?: 'default' | 'small' }) {
  const { t } = useTranslation();
  const small = size === 'small';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold shrink-0"
      style={{
        background: 'var(--color-warning-container, var(--color-surface-variant))',
        color: 'var(--color-on-warning-container, var(--color-text-secondary))',
        border: '1px solid var(--color-outline)',
        padding: small ? '2px 8px' : '3px 10px',
        fontSize: small ? 11 : 12,
      }}
data-testid="locked-badge"
    >
      <Lock size={small ? 11 : 12} strokeWidth={2.6} />
      {t('subscription.locked')}
    </span>
  );
}
