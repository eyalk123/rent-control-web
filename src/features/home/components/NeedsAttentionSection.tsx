import { useState } from 'react';
import { AlertCircle, Clock, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@/shared/utils/money';
import { thisMonthISO } from '@/shared/utils/dates';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { useToast } from '@/shared/components/ui/Toast';
import { useMarkRentPaid } from '@/features/transactions/queries';
import { useAlertsPanel } from '@/features/alerts/AlertsPanelContext';
import { useNotifications, useDismissNotification } from '@/features/notifications/queries';
import type { NotificationItem } from '@/features/notifications/types';
import { RateChangeCard } from '@/features/notifications/components/RateChangeCard';
import { CpiChangeCard } from '@/features/notifications/components/CpiChangeCard';
import { ExpiringLeaseAction } from '@/features/renters/components/ExpiringLeaseAction';
import { NotificationsOffNotice, useNotificationsOff } from '@/features/notifications/components/NotificationsOffNotice';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';

/** Rows shown per section before collapsing the rest behind "See all". Keeps the
 *  section's height stable so the neighbouring occupancy card can't be stretched by it. */
const MAX_ROWS_PER_SECTION = 2;

export function NeedsAttentionSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { openPanel } = useAlertsPanel();
  const { data: items = [], isLoading: loading } = useNotifications('all');
  const notificationsOff = useNotificationsOff();
  const { markPaid } = useMarkRentPaid();
  const dismissNotification = useDismissNotification();
  const [savingId, setSavingId] = useState<number | null>(null);
  const anchorRef = useTourAnchor(ANCHORS.homeNeedsAttention);
  const manageAnchorRef = useTourAnchor(ANCHORS.homeManageNotifications);

  const overdue = items.filter((i) => i.type === 'overdue');
  const expiring = items.filter((i) => i.type === 'lease_expiring');
  const cpiChanges = items.filter((i) => i.type === 'cpi_rent_change');
  const rateChanges = items.filter((i) => i.type === 'mortgage_rate_change');

  async function handleMarkPaid(item: NotificationItem) {
    if (!item.property_id) return;
    setSavingId(item.id);
    try {
      // Overdue candidates are only ever generated for the current month
      // (`renter_repository.get_overdue_this_month`), so that is the month being paid for.
      const result = await markPaid({
        property_id: item.property_id,
        renter_id: item.renter_id,
        amount: item.data.amount ?? 0,
        monthFor: thisMonthISO(),
        paymentType: item.payment_type,
      });
      // A payment already on file means the alert is stale, not that the user needs a
      // second one recorded — dismiss it, and say why nothing was written.
      if (!result.created) {
        showToast(t('transactions.rentGrid.markPaid.alreadyRecorded'), 'default');
      }
      dismissNotification.mutate(item.id);
    } catch {
      showToast(t('error.saveTransactionFailed'), 'error');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div ref={anchorRef}>
      {/* Reminder settings sit here, beside the label, rather than only at the foot of
          the alerts panel. They are something you configure in the first week and then
          forget, so being two clicks deep behind the bell made them easy to never find.
          The copy in the panel stays: someone already reading alerts wants it there. */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          {t('home.needsAttention')}
        </p>
        <button
          ref={manageAnchorRef}
          onClick={() => navigate('/settings/notifications')}
          className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Settings2 size={12} aria-hidden="true" /> {t('notifications.manageTitle')}
        </button>
      </div>
      <div className="space-y-3">
        {loading && (
          <div className="rounded-[var(--radius-card)] p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="45%" height={14} className="block" />
                  <Skeleton width="65%" height={11} className="block" />
                </div>
                <Skeleton width={64} height={14} />
              </div>
            ))}
          </div>
        )}
        {!loading && overdue.length > 0 && (
          <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', borderInlineStart: '3px solid var(--color-error)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} style={{ color: 'var(--color-exp-fg)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-exp-fg)' }}>
                {t('home.overdueRent')} ({overdue.length})
              </span>
            </div>
            <div className="space-y-2">
              {overdue.slice(0, MAX_ROWS_PER_SECTION).map((item) => {
                const saving = savingId === item.id;
                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/renters/${item.renter_id}`)}
                      className="flex-1 flex items-center justify-between text-start hover:opacity-80 transition-opacity min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.first_name} {item.last_name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.property_address} · <bdi>{t(item.data.days_overdue === 1 ? 'home.daysOverdue' : 'home.daysOverdue_plural', { count: item.data.days_overdue ?? 0 })}</bdi>
                        </p>
                      </div>
                      <LtrSpan className="text-sm font-semibold shrink-0 ms-2" style={{ color: 'var(--color-text-primary)' }}>{formatMoney(item.data.amount ?? 0)}</LtrSpan>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => dismissNotification.mutate(item.id)}
                        disabled={saving}
                        className="rounded-full px-2 py-0.5 text-xs transition-opacity disabled:opacity-50"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)' }}
                      >
                        {t('home.actionIgnore')}
                      </button>
                      {item.property_id && (
                        <button
                          onClick={() => handleMarkPaid(item)}
                          disabled={saving}
                          className="rounded-full px-2 py-0.5 text-xs font-medium transition-opacity disabled:opacity-50"
                          style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,38,38,0.3)', color: 'var(--color-exp-fg)' }}
                        >
                          {saving ? t('home.actionSaving') : t('home.actionMarkPaid')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {overdue.length > MAX_ROWS_PER_SECTION && (
              <button
                onClick={openPanel}
                className="mt-3 text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-exp-fg)' }}
              >
                {t('home.seeAll')} ({overdue.length - MAX_ROWS_PER_SECTION} {t('home.more')})
              </button>
            )}
          </div>
        )}

        {expiring.length > 0 && (
          <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} style={{ color: 'var(--color-warning)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('home.expiringLeases')} ({expiring.length})
              </span>
            </div>
            <div className="space-y-2">
              {expiring.slice(0, MAX_ROWS_PER_SECTION).map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/renters/${item.renter_id}`)}
                    className="flex-1 flex items-center justify-between text-start hover:opacity-80 min-w-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.first_name} {item.last_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.property_address} · <bdi>{t('home.expiresIn', { count: item.data.days_until_expiry ?? 0 })}</bdi>
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => dismissNotification.mutate(item.id)}
                      className="rounded-full px-2 py-0.5 text-xs transition-opacity"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)' }}
                    >
                      {t('home.actionIgnore')}
                    </button>
                    <ExpiringLeaseAction
                      renterId={item.renter_id}
                      onUpdateLease={() => navigate(`/renters/${item.renter_id}?extend=1`)}
                      className="rounded-full px-2 py-0.5 text-xs font-medium transition-opacity"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {expiring.length > MAX_ROWS_PER_SECTION && (
              <button
                onClick={openPanel}
                className="mt-3 text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('home.seeAll')} ({expiring.length - MAX_ROWS_PER_SECTION} {t('home.more')})
              </button>
            )}
          </div>
        )}

        <CpiChangeCard
          items={cpiChanges}
          onOpenRenter={(id) => navigate(`/renters/${id}`)}
          onDismiss={(id) => dismissNotification.mutate(id)}
          limit={MAX_ROWS_PER_SECTION}
          onSeeAll={openPanel}
        />

        <RateChangeCard
          items={rateChanges}
          onOpen={navigate}
          onDismiss={(id) => dismissNotification.mutate(id)}
        />

        {!loading && notificationsOff ? (
          <NotificationsOffNotice />
        ) : !loading && overdue.length === 0 && expiring.length === 0 && cpiChanges.length === 0 && rateChanges.length === 0 && (
          <div className="rounded-[var(--radius-card)] p-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('home.allCaughtUp')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
