import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Pencil, Building2, MapPin, Ruler, Home } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { useProperty } from '../queries';
import { useTransactions } from '@/features/transactions/queries';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';

function TransactionRow({ tx }: { tx: import('@/shared/types').Transaction }) {
  const isRevenue = tx.type === 'revenue';
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[var(--color-subtle-outline)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{tx.category_name ?? tx.renter_name ?? '—'}</p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{tx.date_of_payment}</p>
      </div>
      <LtrSpan className={`text-sm font-semibold ${isRevenue ? 'text-[var(--color-rev-fg)]' : 'text-[var(--color-exp-fg)]'}`}>
        {isRevenue ? '+' : '-'}{formatMoney(tx.amount)}
      </LtrSpan>
    </div>
  );
}

export function PropertyDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const propertyId = Number(id);
  const [tab, setTab] = useState('info');

  const { data: property, isLoading } = useProperty(propertyId);
  const { data: txPages } = useTransactions({ propertyId });
  const transactions = txPages?.pages.flat() ?? [];

  if (isLoading) return <PageLoader />;
  if (!property) return null;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
          <ChevronLeft size={16} />
          {t('common.back')}
        </button>
        <button
          onClick={() => navigate(`/properties/${propertyId}/edit`)}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--color-outline)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-input-bg)]"
        >
          <Pencil size={14} />
          {t('common.edit')}
        </button>
      </div>

      {/* Property header card */}
      <div className="mb-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
            {property.image_url ? (
              <img src={property.image_url} alt="property" className="h-12 w-12 rounded-2xl object-cover" />
            ) : (
              <Building2 size={22} className="text-[var(--color-primary)]" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{property.address}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">{property.city}{property.zip_code ? `, ${property.zip_code}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="mb-5 flex gap-1 rounded-xl bg-[var(--color-input-bg)] p-1">
          {(['info', 'renters', 'transactions'] as const).map((tabId) => (
            <Tabs.Trigger
              key={tabId}
              value={tabId}
              className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-primary)] data-[state=active]:shadow-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {t(`property.tab_${tabId}` as never, tabId)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="info">
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 space-y-3">
            {[
              { icon: Home, label: t('property.type'), value: t(`property.type_${property.type}` as never, property.type) },
              { icon: Ruler, label: t('property.sqFt'), value: `${property.sq_ft} m²` },
              { icon: MapPin, label: t('property.owner'), value: property.property_owner },
            ].filter((r) => r.value).map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <row.icon size={16} className="text-[var(--color-text-secondary)]" strokeWidth={1.75} />
                <span className="text-sm text-[var(--color-text-secondary)] w-28 shrink-0">{row.label}</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{row.value}</span>
              </div>
            ))}
          </div>
        </Tabs.Content>

        <Tabs.Content value="renters">
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] divide-y divide-[var(--color-subtle-outline)]">
            {!property.renters || property.renters.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--color-text-secondary)]">{t('empty.renters')}</div>
            ) : property.renters.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/renters/${r.id}`)}
                className="flex w-full items-center gap-3 p-4 text-start hover:bg-[var(--color-input-bg)] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-bg)] text-[var(--color-avatar-text)] text-xs font-semibold border border-[var(--color-avatar-border)]">
                  {r.first_name[0]}{r.last_name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{r.first_name} {r.last_name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{r.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </Tabs.Content>

        <Tabs.Content value="transactions">
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] px-5">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">{t('empty.transactions')}</div>
            ) : transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </PageContainer>
  );
}
