import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The marker on a property the plan no longer covers.
 *
 * Says "read-only", not "locked out". Nothing has been hidden or deleted — the whole
 * record still opens and still exports — and a badge that implied otherwise would
 * contradict the published refund policy as well as frightening people about their data.
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
      {t('subscription.readOnly')}
    </span>
  );
}

/**
 * Wraps an action that a locked property does not allow.
 *
 * Renders the control disabled with a lock and an explanation on hover, rather than
 * removing it. A button that vanishes leaves someone hunting for a feature they used
 * yesterday; a disabled one that says why is the difference between a limit and a bug.
 */
export function LockedAction({
  locked,
  children,
  className,
}: {
  locked: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!locked) return <>{children}</>;

  return (
    <span
      className={className}
      title={t('subscription.lockedActionHint')}
      style={{ display: 'inline-flex', cursor: 'not-allowed' }}
      // The disabled control inside cannot receive focus, so the wrapper carries the
      // explanation for anyone not using a mouse.
      tabIndex={0}
      role="note"
      aria-label={t('subscription.lockedActionHint')}
    >
      <span style={{ pointerEvents: 'none', opacity: 0.45, display: 'inline-flex' }}>
        {children}
      </span>
    </span>
  );
}
