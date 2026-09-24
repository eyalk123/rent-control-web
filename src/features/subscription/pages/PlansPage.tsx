import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Info, Lock } from 'lucide-react';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { CONTACT_EMAIL } from '@/features/legal/legalContent';
import {
  PAID_TIERS,
  bandLabel,
  monthlyEquivalent,
  yearlySavingPercent,
  type BillingPeriod,
  type Tier,
} from '@/features/marketing/tiers';
import { useSubscription } from '../queries';
import { CHECKOUT_AVAILABLE } from '../checkout';
import type { Subscription } from '../types';

/**
 * The plan picker: where a signed-in landlord chooses a band and a billing period.
 *
 * Every "see plans" and "move up a plan" prompt in the app lands here. It is not the public
 * `/pricing` page — that one is for visitors, and its buttons lead to sign-in, which is a
 * dead end for someone already signed in.
 *
 * **Who may buy here is decided by the account, not the card.** Only an account on the free
 * plan is offered a purchase. Every paid plan has come from somewhere — an app store, the
 * web, or a permanent grant — and each needs a different answer, none of which is a second
 * checkout:
 *
 * - **App Store or Google Play:** web checkout would bill the landlord twice through two
 *   systems that know nothing about each other, and refunding one would not cancel the
 *   other. They're told where their subscription lives.
 * - **Web:** changing plans online isn't built yet. They're told how to switch meanwhile.
 * - **A grant, with no billing source** (every account that existed before billing): there
 *   is nothing to sell them. They're told their plan is included.
 *
 * An expired subscription resolves to the free plan on the server, so a lapsed App Store
 * subscriber *is* offered web checkout. The exclusion is about active subscriptions only.
 *
 * Prices are the display prices from `tiers.ts` until checkout is wired. After that they
 * must come from the RevenueCat offering, which carries the localized amount Paddle will
 * actually charge — never a hardcoded dollar figure.
 */
export function PlansPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { data, isLoading } = useSubscription();

  // `/pricing` hands over the visitor's choice, so signing in does not lose it.
  const [period, setPeriod] = useState<BillingPeriod>(
    params.get('period') === 'yearly' ? 'yearly' : 'monthly',
  );
  const picked = params.get('plan');

  if (isLoading || !data) return <PageLoader />;

  const canBuy = data.plan === 'free';
  const saving = yearlySavingPercent(PAID_TIERS[0]);

  return (
    <div className="mx-auto w-full max-w-[980px] px-1 py-2">
      <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
        {t('subscription.plans.title')}
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '62ch' }}>
        {t('subscription.plans.subtitle')}
      </p>

      <AccountBanner data={data} />

      {/* Billing period */}
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <div
          className="inline-flex p-1 rounded-[11px]"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
          role="group"
          aria-label={t('marketing.pricing.billingPeriod')}
        >
          {(['monthly', 'yearly'] as BillingPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className="h-9 px-4 rounded-[8px] text-[13.5px] font-semibold transition-colors"
              style={{
                background: period === p ? 'var(--color-primary)' : 'transparent',
                color: period === p ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t(`marketing.pricing.${p}`)}
            </button>
          ))}
        </div>
        {saving !== null && (
          <span className="text-[13.5px]" style={{ color: 'var(--color-text-secondary)' }}>
            {t('marketing.pricing.yearlySaving', { percent: saving })}
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {PAID_TIERS.map((tier) => (
          <PlanCard
            key={tier.id}
            tier={tier}
            period={period}
            data={data}
            canBuy={canBuy}
            highlighted={tier.plan === picked || (canBuy && !picked && tier.plan === data.required_plan)}
          />
        ))}
      </div>

      <p className="mt-5 text-[13.5px]" style={{ color: 'var(--color-text-secondary)' }}>
        {t('subscription.plans.includes', { assistant: t('subscription.settings.assistant') })}
      </p>

      {/* The subscription terms belong next to the buy button, not only on the public
          pricing page: renewal, currency and cancellation have to be stated where the
          decision is made. */}
      <section
        className="mt-6 rounded-[14px] px-5 py-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '82ch' }}>
          {t('marketing.pricing.termsBody')}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          <Link to="/terms" className="hover:underline" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            {t('legal.termsOfService')}
          </Link>
          <Link to="/privacy" className="hover:underline" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            {t('legal.privacyPolicy')}
          </Link>
          <Link to="/refunds" className="hover:underline" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            {t('legal.refundPolicy')}
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * The one sentence about this account that frames everything below it: why the highlighted
 * card is highlighted, or why there is nothing to buy here.
 */
function AccountBanner({ data }: { data: Subscription }) {
  const { t } = useTranslation();

  let icon = <Info size={16} strokeWidth={2.3} />;
  let text: string;

  if (data.plan === 'free') {
    // Names the plan rather than saying "the highlighted one": when a choice was handed
    // over from /pricing the highlight is the landlord's pick, which need not be the plan
    // that fits.
    text = `${t('subscription.plans.portfolio', { count: data.property_count })} ${
      data.required_plan === 'free'
        ? ''
        : t('subscription.plans.recommendedHint', { plan: t(`subscription.plan.${data.required_plan}`) })
    }`.trim();
  } else if (data.source === 'apple' || data.source === 'google') {
    icon = <Lock size={16} strokeWidth={2.3} />;
    text = t(`subscription.settings.managedBy.${data.source}`);
  } else if (data.source === 'paddle') {
    text = t('subscription.plans.webManaged', { email: CONTACT_EMAIL });
  } else {
    icon = <Check size={16} strokeWidth={2.6} />;
    text = t('subscription.plans.included', { plan: t(`subscription.plan.${data.plan}`) });
  }

  return (
    <div
      className="mt-5 rounded-[12px] px-4 py-3 flex items-start gap-3"
      style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}
      role="status"
    >
      <span className="shrink-0" style={{ marginTop: 2 }}>{icon}</span>
      <p className="text-[14px] leading-relaxed">{text}</p>
    </div>
  );
}

function PlanCard({
  tier,
  period,
  data,
  canBuy,
  highlighted,
}: {
  tier: Tier;
  period: BillingPeriod;
  data: Subscription;
  canBuy: boolean;
  highlighted: boolean;
}) {
  const { t } = useTranslation();
  const price = period === 'monthly' ? tier.monthly : tier.yearly;
  const perMonth = monthlyEquivalent(tier);
  const isCurrent = tier.plan === data.plan;

  // A plan too small for the portfolio is still offered, with the consequence stated. The
  // landlord may intend to remove properties, and refusing the choice would decide that for
  // them. The excess stays read-only, never deleted.
  const excess = tier.max !== null ? data.property_count - tier.max : 0;

  return (
    <div
      className="rounded-[16px] p-5 flex flex-col"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${highlighted || isCurrent ? 'var(--color-primary)' : 'var(--color-outline)'}`,
        boxShadow: highlighted ? '0 0 0 1px var(--color-primary)' : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2 min-h-[22px]">
        <p
          className="text-[13.5px] font-semibold"
          style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}
        >
          {t('marketing.pricing.propertiesBand', { band: bandLabel(tier, '+') })}
        </p>
        {isCurrent && (
          <span
            className="text-[11.5px] font-semibold rounded-full px-2 py-0.5"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {t('subscription.plans.current')}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className="text-[30px] font-semibold"
          style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
        >
          ${price}
        </span>
        <span className="text-[13.5px]" style={{ color: 'var(--color-text-secondary)' }}>
          {t(`marketing.pricing.per.${period}`)}
        </span>
      </div>
      <p className="mt-1 text-[13px] min-h-[18px]" style={{ color: 'var(--color-text-secondary)' }}>
        {period === 'yearly' && perMonth !== null
          ? t('marketing.pricing.perMonthEquivalent', { amount: perMonth.toFixed(2) })
          : ''}
      </p>

      <p className="mt-3 text-[13px] leading-snug min-h-[36px]" style={{ color: 'var(--color-text-secondary)' }}>
        {excess > 0
          ? t('subscription.plans.tooSmall', { count: excess, max: tier.max })
          : canBuy && tier.plan === data.required_plan
            ? t('subscription.plans.recommended')
            : ''}
      </p>

      {canBuy && (
        <button
          type="button"
          disabled={!CHECKOUT_AVAILABLE}
          className="mt-4 h-10 rounded-[9px] text-[14px] font-semibold"
          style={{
            background: CHECKOUT_AVAILABLE ? 'var(--color-primary)' : 'var(--color-surface)',
            color: CHECKOUT_AVAILABLE ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
            border: CHECKOUT_AVAILABLE ? 'none' : '1px dashed var(--color-outline)',
            cursor: CHECKOUT_AVAILABLE ? 'pointer' : 'not-allowed',
          }}
        >
          {CHECKOUT_AVAILABLE ? t('subscription.plans.choose') : t('subscription.plans.checkoutSoon')}
        </button>
      )}
    </div>
  );
}
