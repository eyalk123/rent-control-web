import { useState } from 'react';
import { Check, Clock, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { useToast } from '@/shared/components/ui/Toast';
import { formatMoney } from '@/shared/utils/money';
import { fmtDate } from '@/shared/utils/dates';
import { useSetLeaseYearAmount } from '@/features/renters/queries';
import type { NotificationItem } from '../types';
import { CpiAmountDialog } from './CpiAmountDialog';

interface Props {
  items: NotificationItem[];
  onOpenRenter: (renterId: number) => void;
  onDismiss: (id: number) => void;
  /** Rows shown before collapsing the rest behind "See all"; all of them when absent. */
  limit?: number;
  onSeeAll?: () => void;
  /** The alerts panel has the room for "View renter" and the index reading behind a figure. */
  detailed?: boolean;
}

const pill =
  'rounded-full px-2 py-0.5 text-xs transition-opacity disabled:opacity-50';

/**
 * CPI rent changes, shared by the home list and the alerts panel so the two can't drift.
 *
 * Each row says whether its figure is an estimate or final. A **final** figure is one to act
 * on: Confirm accepts it, Edit amount sets what was actually agreed (usually rounded). Both
 * write the year's rent through the same endpoint, which also clears the alert, and the
 * later years re-derive from it. Ignore is not offered there — Confirm already clears it.
 * An estimate keeps Ignore: there is nothing to agree to yet.
 */
export function CpiChangeCard({ items, onOpenRenter, onDismiss, limit, onSeeAll, detailed }: Props) {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const { showToast } = useToast();
  const setAmount = useSetLeaseYearAmount();
  const [editing, setEditing] = useState<NotificationItem | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  if (items.length === 0) return null;
  const shown = limit === undefined ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;

  async function save(item: NotificationItem, amount: number) {
    if (item.data.year_index == null) return;
    setSavingId(item.id);
    try {
      await setAmount.mutateAsync({
        renterId: item.renter_id,
        yearIndex: item.data.year_index,
        amount,
      });
      showToast(t('notifications.cpiSaved'), 'default');
      setEditing(null);
    } catch {
      showToast(t('error.saveFailed'), 'error');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={15} style={{ color: 'var(--color-primary)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
          {t('notifications.event.cpi_rent_change')} ({items.length})
        </span>
      </div>
      <div className="space-y-3">
        {shown.map((item) => {
          const upcoming = item.data.stage === 'upcoming';
          const actionable = !upcoming && item.data.year_index != null;
          const saving = savingId === item.id;
          return (
            <div key={item.id} className="flex items-center gap-2">
              <button
                onClick={() => onOpenRenter(item.renter_id)}
                className="flex-1 text-start hover:opacity-80 min-w-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {item.first_name} {item.last_name}
                  </p>
                  {/* Plain icon + text rather than a pill, so it can't be taken for a button.
                      Provisional reads quieter than final. */}
                  <span
                    className="flex items-center gap-1 shrink-0 text-[11px] font-semibold"
                    style={{ color: upcoming ? 'var(--color-text-secondary)' : 'var(--color-text-primary)' }}
                  >
                    {upcoming ? (
                      <Clock size={13} aria-hidden="true" />
                    ) : (
                      <Check size={13} aria-hidden="true" style={{ color: 'var(--color-success)' }} />
                    )}
                    {t(upcoming ? 'notifications.cpiBadgeUpcoming' : 'notifications.cpiBadgeChanged')}
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  <LtrSpan>{formatMoney(item.data.old_amount ?? 0)}</LtrSpan>
                  {isRtl ? ' ← ' : ' → '}
                  <LtrSpan className="font-semibold">{formatMoney(item.data.new_amount ?? 0)}</LtrSpan>
                  {' · '}
                  <bdi>
                    {t(upcoming ? 'notifications.cpiChangesOn' : 'notifications.cpiEffective', {
                      date: fmtDate(item.data.effective_date ?? ''),
                    })}
                  </bdi>
                </p>
                {/* The reading behind a final figure, so a disputed change is traceable. */}
                {detailed && !upcoming && item.data.index_month ? (
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    <bdi>{t('notifications.cpiIndexNote', {
                      month: item.data.index_month,
                      value: item.data.known_index,
                      source: (item.data.index_source ?? '').toUpperCase(),
                    })}</bdi>
                  </p>
                ) : null}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {actionable ? (
                  <>
                    <button
                      onClick={() => setEditing(item)}
                      disabled={saving}
                      className={`${pill} font-medium`}
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
                    >
                      {t('notifications.cpiEditAmount')}
                    </button>
                    <button
                      onClick={() => save(item, item.data.new_amount ?? 0)}
                      disabled={saving}
                      className={`${pill} font-medium`}
                      style={{ background: 'var(--color-rev-bg)', border: '1px solid var(--color-rev-bg)', color: 'var(--color-rev-fg)' }}
                    >
                      {saving && !editing ? t('home.actionSaving') : t('notifications.cpiConfirm')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onDismiss(item.id)}
                      className={pill}
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)' }}
                    >
                      {t('home.actionIgnore')}
                    </button>
                    {detailed && (
                      <button
                        onClick={() => onOpenRenter(item.renter_id)}
                        className={`${pill} font-medium`}
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
                      >
                        {t('notifications.cpiViewRenter')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hidden > 0 && onSeeAll && (
        <button
          onClick={onSeeAll}
          className="mt-3 text-xs font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-primary)' }}
        >
          {t('home.seeAll')} ({hidden} {t('home.more')})
        </button>
      )}

      <CpiAmountDialog
        open={editing !== null}
        loading={editing !== null && savingId === editing.id}
        renterName={editing ? `${editing.first_name ?? ''} ${editing.last_name ?? ''}`.trim() : ''}
        oldAmount={editing?.data.old_amount ?? 0}
        calculatedAmount={editing?.data.new_amount ?? 0}
        effectiveDate={editing?.data.effective_date ? fmtDate(editing.data.effective_date) : ''}
        onConfirm={(amount) => editing && save(editing, amount)}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
