import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Pencil, Phone, Mail } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { useRenter } from '../queries';
import { useTransactions } from '@/features/transactions/queries';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { getLeaseEndDate } from '@/shared/types';

export function RenterDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const renterId = Number(id);
  const [tab, setTab] = useState('info');

  const { data: renter, isLoading } = useRenter(renterId);
  const { data: txPages } = useTransactions({ renterId });
  const transactions = txPages?.pages.flat() ?? [];

  if (isLoading) return <PageLoader />;
  if (!renter) return null;

  const leaseEnd = getLeaseEndDate(renter);
  const currentYearRent = renter.lease_years[0]?.amount;

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
          <ChevronLeft size={16} />{t('common.back')}
        </button>
        <button onClick={() => navigate(`/renters/${renterId}/edit`)} className="flex items-center gap-1.5 rounded-xl border border-[var(--color-outline)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-input-bg)]">
          <Pencil size={14} />{t('common.edit')}
        </button>
      </div>

      {/* Header */}
      <div className="mb-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-bg)] text-[var(--color-avatar-text)] text-lg font-bold border border-[var(--color-avatar-border)]">
            {renter.first_name[0]}{renter.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{renter.first_name} {renter.last_name}</h1>
            <div className="mt-1 flex items-center gap-4">
              {renter.phone && (
                <a href={`tel:${renter.phone}`} className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
                  <Phone size={12} />{renter.phone}
                </a>
              )}
              {renter.email && (
                <a href={`mailto:${renter.email}`} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:underline">
                  <Mail size={12} />{renter.email}
                </a>
              )}
            </div>
          </div>
          {currentYearRent && (
            <LtrSpan className="text-lg font-bold text-[var(--color-rev-fg)]">
              {formatMoney(currentYearRent)}
            </LtrSpan>
          )}
        </div>
      </div>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="mb-5 flex gap-1 rounded-xl bg-[var(--color-input-bg)] p-1">
          {(['info', 'property', 'transactions'] as const).map((tabId) => (
            <Tabs.Trigger key={tabId} value={tabId} className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-primary)] data-[state=active]:shadow-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              {t(`renter.tab_${tabId}` as never, tabId)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="info">
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 space-y-3">
            {[
              { label: t('renter.leaseStart'), value: renter.lease_start },
              { label: t('renter.leaseEnd'), value: leaseEnd?.toLocaleDateString() },
              { label: t('renter.paymentDay'), value: renter.payment_day_of_month ? `${renter.payment_day_of_month}` : undefined },
              { label: t('renter.paymentType'), value: renter.payment_type },
            ].filter((r) => r.value).map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-sm text-[var(--color-text-secondary)] w-32 shrink-0">{row.label}</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{row.value}</span>
              </div>
            ))}
            {renter.extra_contacts && renter.extra_contacts.length > 0 && (
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t('renter.extraContacts')}</p>
                {renter.extra_contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{c.name}</span>
                    <a href={`tel:${c.phone}`} className="text-sm text-[var(--color-primary)] hover:underline">{c.phone}</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="property">
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5">
            {renter.property ? (
              <button onClick={() => navigate(`/properties/${renter.property_id}`)} className="w-full text-start hover:opacity-80">
                <p className="font-semibold text-[var(--color-text-primary)]">{renter.property.address}</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{renter.property.city}</p>
              </button>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">{t('renter.noProperty')}</p>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="transactions">
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] px-5">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">{t('empty.transactions')}</div>
            ) : transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 py-3 border-b border-[var(--color-subtle-outline)] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{tx.category_name ?? '—'}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{tx.date_of_payment}</p>
                </div>
                <LtrSpan className={`text-sm font-semibold ${tx.type === 'revenue' ? 'text-[var(--color-rev-fg)]' : 'text-[var(--color-exp-fg)]'}`}>
                  {tx.type === 'revenue' ? '+' : '-'}{formatMoney(tx.amount)}
                </LtrSpan>
              </div>
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </PageContainer>
  );
}
