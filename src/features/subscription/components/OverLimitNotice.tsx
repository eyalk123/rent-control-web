import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, X } from 'lucide-react';
import { useAcknowledgeLockNotice, useSubscription } from '../queries';

/**
 * The one-time explanation of why some properties became read-only.
 *
 * Shown after a subscription lapses or is downgraded, once per plan the account lands in
 * — not once ever. Someone who acknowledges this on the free plan, resubscribes, and
 * later drops to a different band has a different number of locked properties, and
 * saying nothing the second time would leave them to work that out from a disabled
 * button. The server decides when it is due; this component only renders and acknowledges.
 *
 * It states three things in order, because they are the three questions in the reader's
 * head: what happened, what is still true (everything is safe and readable), and what to
 * do about it.
 */
export function OverLimitNotice() {
  const { t } = useTranslation();
  const { data } = useSubscription();
  const acknowledge = useAcknowledgeLockNotice();

  const due = Boolean(data?.show_lock_notice && data.enforced);

  // Latched, and this is not optional. The acknowledgement flips `show_lock_notice` to
  // false in the cache, so rendering straight off the server flag would make the notice
  // erase itself in the same tick it appeared — told, and never read. The latch keeps it
  // on screen for this visit; the server flag stops it coming back on the next one.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (due) setVisible(true);
  }, [due]);

  // Acknowledged on display rather than on dismissal: the promise is "we told you", and
  // someone who reads it and then navigates away with the back button has still been told.
  useEffect(() => {
    if (due && acknowledge.isIdle) acknowledge.mutate();
  }, [due, acknowledge]);

  if (!visible || !data) return null;

  const lockedCount = data.locked_property_ids.length;

  return (
    <div
      className="rounded-[14px] p-5 mb-5 flex items-start gap-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-outline)',
        borderInlineStartWidth: 3,
        borderInlineStartColor: 'var(--color-primary)',
      }}
      role="status"
    >
      <span
        className="flex items-center justify-center rounded-[10px] shrink-0"
        style={{
          width: 36,
          height: 36,
          background: 'var(--color-primary-container)',
          color: 'var(--color-on-primary-container)',
        }}
      >
        <Lock size={17} strokeWidth={2.3} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {t('subscription.overLimit.heading', { count: lockedCount })}
        </p>
        <p
          className="mt-1.5 text-[14px] leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('subscription.overLimit.body', { count: lockedCount, limit: data.limit ?? 0 })}
        </p>
        <p
          className="mt-2 text-[14px] leading-relaxed font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('subscription.overLimit.safe')}
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          <Link
            to="/settings/subscription"
            className="h-9 px-4 flex items-center rounded-[9px] text-[13.5px] font-semibold"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              textDecoration: 'none',
            }}
          >
            {t('subscription.overLimit.cta')}
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label={t('common.close')}
        className="shrink-0 rounded-[8px] p-1.5"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
