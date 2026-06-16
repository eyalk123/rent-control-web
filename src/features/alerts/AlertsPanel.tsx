import { useEffect, useState } from 'react';
import { AlertCircle, Clock, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Drawer } from '@/shared/components/ui/Drawer';
import { useToast } from '@/shared/components/ui/Toast';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { useCreateRevenueTransaction } from '@/features/transactions/queries';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useDismissNotification,
} from '@/features/notifications/queries';
import type { NotificationItem } from '@/features/notifications/types';
import { useAlertsPanel } from './AlertsPanelContext';
import type { PaymentMethod } from '@/shared/types';

function mapPaymentType(type?: string | null): PaymentMethod {
  if (type === 'wire_transfer') return 'bank_transfer';
  if (type === 'bit') return 'bit';
  if (type === 'check') return 'check';
  return 'cash';
}

export function AlertsPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isOpen, closePanel, setHasAlerts } = useAlertsPanel();

  const { data: items = [] } = useNotifications('all');
  const createRevenue = useCreateRevenueTransaction();
  const dismissNotification = useDismissNotification();
  const markAllRead = useMarkAllNotificationsRead();
  const [savingId, setSavingId] = useState<number | null>(null);

  const overdue = items.filter((i) => i.type === 'overdue');
  const expiring = items.filter((i) => i.type === 'lease_expiring');

  // Surface the unread dot on the bell.
  useEffect(() => {
    setHasAlerts(items.some((i) => !i.read));
  }, [items, setHasAlerts]);

  // Opening the panel counts as seeing the alerts.
  useEffect(() => {
    if (isOpen && items.some((i) => !i.read)) markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleNavigate(renterId: number) {
    navigate(`/renters/${renterId}`);
    closePanel();
  }

  async function handleMarkPaid(item: NotificationItem) {
    if (!item.property_id) return;
    setSavingId(item.id);
    try {
      await createRevenue.mutateAsync({
        property_id: item.property_id,
        renter_id: item.renter_id,
        amount: item.data.amount ?? 0,
        date_of_payment: new Date().toISOString().slice(0, 10),
        month_for: new Date().toISOString().slice(0, 8) + '01',
        payment_method: mapPaymentType(item.payment_type),
      });
      dismissNotification.mutate(item.id);
    } catch {
      showToast(t('error.saveTransactionFailed'), 'error');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Drawer open={isOpen} onClose={closePanel} title={t('common.notifications')} width={420}>
      <div className="space-y-4">
        {overdue.length > 0 && (
          <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-exp-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} style={{ color: 'var(--color-exp-fg)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-exp-fg)' }}>
                {t('home.overdueRent')} ({overdue.length})
              </span>
            </div>
            <div className="space-y-2">
              {overdue.map((item) => {
                const saving = savingId === item.id;
                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <button
                      onClick={() => handleNavigate(item.renter_id)}
                      className="flex-1 flex items-center justify-between text-start hover:opacity-80 transition-opacity min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.first_name} {item.last_name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.property_address} · <bdi>{t(item.data.days_overdue === 1 ? 'home.daysOverdue' : 'home.daysOverdue_plural', { count: item.data.days_overdue ?? 0 })}</bdi>
                        </p>
                      </div>
                      <LtrSpan className="text-sm font-semibold shrink-0 ms-2" style={{ color: 'var(--color-exp-fg)' }}>{formatMoney(item.data.amount ?? 0)}</LtrSpan>
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
          </div>
        )}

        {expiring.length > 0 && (
          <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} style={{ color: 'var(--color-warning)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>
                {t('home.expiringLeases')} ({expiring.length})
              </span>
            </div>
            <div className="space-y-2">
              {expiring.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavigate(item.renter_id)}
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
                    <button
                      onClick={() => handleNavigate(item.renter_id)}
                      className="rounded-full px-2 py-0.5 text-xs font-medium transition-opacity"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}
                    >
                      {t('home.actionUpdateLease')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {overdue.length === 0 && expiring.length === 0 && (
          <div className="rounded-[var(--radius-card)] p-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('home.allCaughtUp')}</p>
          </div>
        )}

        <button
          onClick={() => { navigate('/settings/notifications'); closePanel(); }}
          className="flex items-center gap-1.5 text-xs font-medium pt-1 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Settings2 size={13} aria-hidden="true" /> {t('notifications.manageTitle')}
        </button>
      </div>
    </Drawer>
  );
}
