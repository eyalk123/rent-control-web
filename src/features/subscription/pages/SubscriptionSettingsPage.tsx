import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Check, FileScan, Lock, MessageSquare, Sparkles } from 'lucide-react';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { useProperties } from '@/features/properties/queries';
import { useSubscription } from '../queries';

/**
 * What this account's plan is, and what of it has been used.
 *
 * Every number here comes from `GET /subscription`. None of it is derived locally — the
 * ceilings live in one place on the server, and a copy here would disagree the first time
 * a price moved.
 */
export function SubscriptionSettingsPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useSubscription();
  const { data: properties } = useProperties();

  if (isLoading || !data) return <PageLoader />;

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  const lockedProperties = (properties ?? []).filter((p) => data.locked_property_ids.includes(p.id));

  return (
    <div className="mx-auto w-full max-w-[860px] px-1 py-2">
      <h1
        className="text-[26px] font-bold tracking-tight"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {t('subscription.settings.title')}
      </h1>

      {/* Current plan */}
      <section
        className="mt-6 rounded-[16px] p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold uppercase" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.04em' }}>
              {t('subscription.settings.currentPlan')}
            </p>
            <p className="mt-1 text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {t(`subscription.plan.${data.plan}`)}
            </p>
            {data.current_period_end ? (
              <p className="mt-1 text-[13.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('subscription.settings.renews', { date: formatDate(data.current_period_end) })}
              </p>
            ) : null}
          </div>

          {data.plan === 'free' && (
            <Link
              to="/plans"
              className="h-10 px-5 flex items-center gap-2 rounded-[9px] text-[14px] font-semibold shrink-0"
              style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}
            >
              <Sparkles size={15} /> {t('subscription.settings.upgrade')}
            </Link>
          )}
        </div>

        {/* Where the money is taken decides where cancelling happens. An App Store
            subscription cannot be cancelled by us, so pointing at a button here would
            be a dead end. */}
        {data.source && (
          <p
            className="mt-4 pt-4 text-[13.5px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-subtle-outline)' }}
          >
            {t(`subscription.settings.managedBy.${data.source}`)}
          </p>
        )}

        {!data.enforced && (
          <p className="mt-3 text-[13px]" style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
            {t('subscription.settings.notEnforced')}
          </p>
        )}
      </section>

      {/* What the plan includes, and what is left of it */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UsageCard
          icon={Building2}
          label={t('subscription.settings.properties')}
          value={
            data.limit === null
              ? t('subscription.settings.propertiesUnlimited', { used: data.property_count })
              : t('subscription.settings.propertiesUsage', { used: data.property_count, limit: data.limit })
          }
          exceeded={data.limit !== null && data.property_count > data.limit}
        />
        <UsageCard
          icon={FileScan}
          label={t('subscription.settings.leaseScans')}
          value={
            data.monthly_lease_scans === null
              ? t('subscription.settings.leaseScansUnlimited')
              : t('subscription.settings.leaseScansUsage', {
                  used: data.lease_scans_used,
                  limit: data.monthly_lease_scans,
                })
          }
          exceeded={
            data.monthly_lease_scans !== null && data.lease_scans_used >= data.monthly_lease_scans
          }
        />
        <UsageCard
          icon={MessageSquare}
          label={t('subscription.settings.assistant')}
          value={
            data.agent
              ? t('subscription.settings.assistantIncluded')
              : t('subscription.settings.assistantNotIncluded')
          }
          exceeded={!data.agent}
          tick={data.agent}
        />
      </div>

      {/* Which properties are read-only, named. "Some of your properties" is not
          actionable; a list someone can click into is. */}
      {lockedProperties.length > 0 && (
        <section
          className="mt-5 rounded-[16px] p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        >
          <h2 className="text-[15px] font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Lock size={15} /> {t('subscription.settings.lockedList')}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {lockedProperties.map((property) => (
              <li key={property.id}>
                <Link
                  to={`/properties/${property.id}`}
                  className="text-[14px] hover:underline"
                  style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                >
                  {property.address}, {property.city}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function UsageCard({
  icon: Icon,
  label,
  value,
  exceeded,
  tick,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  exceeded: boolean;
  tick?: boolean;
}) {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      <span
        className="flex items-center justify-center rounded-[9px]"
        style={{
          width: 32,
          height: 32,
          background: 'var(--color-primary-container)',
          color: 'var(--color-on-primary-container)',
        }}
      >
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <p className="mt-3 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <p
        className="mt-0.5 text-[16px] font-bold flex items-center gap-1.5"
        style={{
          color: exceeded ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {tick && <Check size={15} strokeWidth={3} style={{ color: 'var(--color-success)' }} />}
        {value}
      </p>
    </div>
  );
}
