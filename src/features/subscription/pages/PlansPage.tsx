import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Info, Loader2, Lock } from 'lucide-react';
import type { Package } from '@revenuecat/purchases-js';
import { useAppAuth } from '@/core/auth/AuthContext';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { FormInput } from '@/shared/components/form/FormInput';
import { CONTACT_EMAIL } from '@/features/legal/legalContent';
import { PAID_TIERS, bandLabel, type BillingPeriod, type Tier } from '@/features/marketing/tiers';
import { useCheckoutOffering, useLocalPrices, useSubscription } from '../queries';
import { CHECKOUT_AVAILABLE, packageFor, purchase } from '../checkout';
import type { LocalPrices } from '../paddle';
import type { PlanId, Subscription } from '../types';

/** How often the page asks the server whether the purchase's webhook has landed. */
const POLL_MS = 3_000;
/** After this long, say that activation is slow rather than spinning forever. */
const SLOW_AFTER_MS = 90_000;
/** Paddle's own rule for a discount code. */
const DISCOUNT_CODE = /^[a-zA-Z0-9]{1,32}$/;

/** One card's price: what is charged per period, in which currency. */
interface ShownPrice {
  amount: number;
  currency: string;
  /** Tax is added at checkout (US), so the price reads "+ tax". */
  taxExclusive: boolean;
}

/**
 * The visitor's own price when Paddle's preview has it; the USD display price from
 * `tiers.ts` when it has failed or isn't configured.
 */
function shownPrice(tier: Tier, period: BillingPeriod, local: LocalPrices | undefined): ShownPrice | null {
  if (local) {
    return {
      amount: local.amounts[`${tier.plan}_${period}`],
      currency: local.currency,
      taxExclusive: local.taxExclusive,
    };
  }
  const usd = period === 'monthly' ? tier.monthly : tier.yearly;
  return usd === null ? null : { amount: usd, currency: 'USD', taxExclusive: false };
}

/** Whole-percent saving of yearly over twelve monthly payments, from the prices shown. */
function yearlySaving(monthly: ShownPrice | null, yearly: ShownPrice | null): number | null {
  if (!monthly || !yearly || monthly.amount <= 0) return null;
  return Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100);
}

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
 * Prices come from Paddle's price preview, in the visitor's own currency: Paddle picks the
 * country from their IP and applies the same per-country prices its checkout charges (ILS in
 * Israel, EUR in the eurozone, USD elsewhere). If the preview fails — Paddle.js blocked, the
 * domain not yet approved, the network — the USD display prices in `tiers.ts` stand in, and
 * the footnote says checkout shows the local price.
 *
 * **Paying does not change the plan here.** Paddle takes the money, RevenueCat sends a webhook,
 * and the server updates the plan. The page marks itself `?checkout=pending` and polls
 * `/subscription` until the new plan shows up.
 */
export function PlansPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAppAuth();
  const [params, setParams] = useSearchParams();

  // After checkout the URL carries `?checkout=pending`, so a reload mid-wait keeps waiting
  // instead of offering the purchase again.
  const pending = params.get('checkout') === 'pending';
  const { data, isLoading } = useSubscription({ pollMs: pending ? POLL_MS : false });
  const activated = pending && !!data && data.plan !== 'free';

  // `/pricing` hands over the visitor's choice, so signing in does not lose it.
  const [period, setPeriod] = useState<BillingPeriod>(
    params.get('period') === 'yearly' ? 'yearly' : 'monthly',
  );
  const picked = params.get('plan');

  const canBuy = data?.plan === 'free' && !pending;
  const offering = useCheckoutOffering(user?.uid, canBuy);
  const [buying, setBuying] = useState<PlanId | null>(null);
  const [failed, setFailed] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeInvalid, setCodeInvalid] = useState(false);
  const localPrices = useLocalPrices();
  // `isPending` stays true for a query that is switched off, so only a running preview counts.
  const pricesLoading = localPrices.isLoading;

  async function buy(pkg: Package, plan: PlanId) {
    if (!user) return;
    // Paddle codes are letters and digits only. Anything else cannot be a code, so say so here
    // rather than open a checkout that silently shows the full price. Whether a well-formed
    // code is valid only Paddle knows — checkout shows the resulting total before payment.
    const discountCode = code.trim();
    if (discountCode && !DISCOUNT_CODE.test(discountCode)) {
      setCodeInvalid(true);
      return;
    }
    setBuying(plan);
    setFailed(false);
    try {
      const outcome = await purchase(user.uid, pkg, {
        email: user.email,
        locale: i18n.language,
        discountCode,
      });
      if (outcome === 'purchased') {
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('checkout', 'pending');
            return next;
          },
          { replace: true },
        );
      }
    } catch {
      setFailed(true);
    } finally {
      setBuying(null);
    }
  }

  if (isLoading || !data) return <PageLoader />;

  const saving = pricesLoading
    ? null
    : yearlySaving(
        shownPrice(PAID_TIERS[0], 'monthly', localPrices.data),
        shownPrice(PAID_TIERS[0], 'yearly', localPrices.data),
      );

  return (
    <div className="mx-auto w-full max-w-[980px] px-1 py-2">
      <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
        {t('subscription.plans.title')}
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '62ch' }}>
        {t('subscription.plans.subtitle')}
      </p>

      {pending ? <PendingBanner data={data} activated={activated} /> : <AccountBanner data={data} />}

      {failed && (
        <p
          className="mt-3 rounded-[12px] px-4 py-3 text-[14px]"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
          role="alert"
        >
          {t('subscription.plans.purchaseFailed', { email: CONTACT_EMAIL })}
        </p>
      )}

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
            price={pricesLoading ? undefined : shownPrice(tier, period, localPrices.data)}
            data={data}
            canBuy={canBuy}
            highlighted={tier.plan === picked || (canBuy && !picked && tier.plan === data.required_plan)}
            pkg={packageFor(offering.data, tier.plan, period)}
            offeringState={offering.isError ? 'error' : offering.isPending ? 'loading' : 'ready'}
            buying={buying}
            onBuy={buy}
          />
        ))}
      </div>

      {/* Before the buy buttons are pressed, not inside checkout: RevenueCat opens Paddle with
          Paddle's own discount box hidden. See `purchase` in checkout.ts. */}
      {canBuy && CHECKOUT_AVAILABLE && (
        <div className="mt-4">
          {codeOpen ? (
            <div className="max-w-[320px]">
              <FormInput
                label={t('subscription.plans.discountLabel')}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeInvalid(false);
                }}
                error={codeInvalid ? t('subscription.plans.discountInvalid') : undefined}
                hint={t('subscription.plans.discountHint')}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                dir="ltr"
                maxLength={32}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCodeOpen(true)}
              className="text-[13.5px] font-semibold hover:underline"
              style={{ color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {t('subscription.plans.discountToggle')}
            </button>
          )}
        </div>
      )}

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
          {t(localPrices.data ? 'subscription.plans.termsLocal' : 'subscription.plans.termsUsd')}
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

/**
 * Shown between a completed checkout and the webhook that activates the plan — usually a few
 * seconds. The payment has gone through either way, so the slow case says so plainly rather
 * than implying something failed.
 */
function PendingBanner({ data, activated }: { data: Subscription; activated: boolean }) {
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (activated) return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [activated]);

  let icon = <Loader2 size={16} strokeWidth={2.3} className="animate-spin" />;
  let text = t('subscription.plans.pending');
  if (activated) {
    icon = <CheckCircle2 size={16} strokeWidth={2.3} />;
    text = t('subscription.plans.activated', { plan: t(`subscription.plan.${data.plan}`) });
  } else if (slow) {
    text = t('subscription.plans.pendingSlow', { email: CONTACT_EMAIL });
  }

  return (
    <div
      className="mt-5 rounded-[12px] px-4 py-3 flex items-start gap-3"
      style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}
      role="status"
      aria-live="polite"
    >
      <span className="shrink-0" style={{ marginTop: 2 }}>{icon}</span>
      <div className="text-[14px] leading-relaxed">
        <p>{text}</p>
        {activated && (
          <Link to="/home" className="mt-1 inline-block font-semibold hover:underline" style={{ color: 'inherit' }}>
            {t('subscription.plans.goHome')}
          </Link>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  tier,
  period,
  price,
  data,
  canBuy,
  highlighted,
  pkg,
  offeringState,
  buying,
  onBuy,
}: {
  tier: Tier;
  period: BillingPeriod;
  /** Undefined while the preview is loading. */
  price: ShownPrice | null | undefined;
  data: Subscription;
  canBuy: boolean;
  highlighted: boolean;
  pkg: Package | null;
  offeringState: 'loading' | 'ready' | 'error';
  buying: PlanId | null;
  onBuy: (pkg: Package, plan: PlanId) => void;
}) {
  const { t, i18n } = useTranslation();
  const isCurrent = tier.plan === data.plan;

  const format = (amount: number, digits: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: price!.currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: 2,
    }).format(amount);
  const priceText = price ? format(price.amount, Number.isInteger(price.amount) ? 0 : 2) : '…';
  const perMonth = price ? format(price.amount / 12, 2) : null;

  const purchasable = CHECKOUT_AVAILABLE && pkg !== null && buying === null;
  let buttonLabel = t('subscription.plans.checkoutSoon');
  if (buying === tier.plan) buttonLabel = t('subscription.plans.opening');
  else if (CHECKOUT_AVAILABLE && pkg) buttonLabel = t('subscription.plans.choose');
  else if (CHECKOUT_AVAILABLE && offeringState === 'loading') buttonLabel = t('subscription.plans.loadingPrices');
  else if (CHECKOUT_AVAILABLE) buttonLabel = t('subscription.plans.checkoutUnavailable');

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
          {priceText}
        </span>
        <span className="text-[13.5px]" style={{ color: 'var(--color-text-secondary)' }}>
          {t(`marketing.pricing.per.${period}`)}
          {price?.taxExclusive ? ` ${t('subscription.plans.plusTax')}` : ''}
        </span>
      </div>
      <p className="mt-1 text-[13px] min-h-[18px]" style={{ color: 'var(--color-text-secondary)' }}>
        {period === 'yearly' && perMonth !== null
          ? t('subscription.plans.perMonth', { amount: perMonth })
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
          disabled={!purchasable}
          onClick={() => pkg && onBuy(pkg, tier.plan)}
          className="mt-4 h-10 rounded-[9px] text-[14px] font-semibold inline-flex items-center justify-center gap-2"
          style={{
            background: purchasable || buying === tier.plan ? 'var(--color-primary)' : 'var(--color-surface)',
            color: purchasable || buying === tier.plan ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
            border: purchasable || buying === tier.plan ? 'none' : '1px dashed var(--color-outline)',
            cursor: purchasable ? 'pointer' : 'not-allowed',
          }}
        >
          {buying === tier.plan && <Loader2 size={15} className="animate-spin" />}
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
