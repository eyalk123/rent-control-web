import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { Check, CheckCircle2, Info, Loader2, Lock } from 'lucide-react';
import type { Package } from '@revenuecat/purchases-js';
import { useAppAuth } from '@/core/auth/AuthContext';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { CONTACT_EMAIL } from '@/features/legal/legalContent';
import { PAID_TIERS, bandLabel, type BillingPeriod, type Tier } from '@/features/marketing/tiers';
import {
  useChangePlan,
  useCheckoutOffering,
  useDiscountedPrices,
  useLocalPrices,
  useLookupDiscount,
  useSubscription,
} from '../queries';
import { CHECKOUT_AVAILABLE, packageFor, purchase } from '../checkout';
import type { LocalPrices } from '../paddle';
import type { DiscountLookup } from '../api/subscriptionApi';
import { DiscountCodeField, discountOff } from '../components/DiscountCodeField';
import type { PlanId, Subscription } from '../types';

/** Paid plans, smallest first — what "bigger" means for an upgrade. */
const PAID_ORDER: PlanId[] = ['tier_3_8', 'tier_9_15', 'tier_16_plus'];

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

/** Whether an applied code covers this plan and period. */
function covers(discount: DiscountLookup, plan: PlanId, period: BillingPeriod): boolean {
  return discount.plans === null || discount.plans.includes(`${plan}_${period}`);
}

/**
 * What the first payment comes to with the applied code, or null when the code does not
 * lower this card's price.
 *
 * Paddle's discounted preview is the answer whenever it exists — it is the same calculation
 * checkout makes, in the same currency. Only without one (Paddle.js blocked, or the USD
 * fallback prices showing) is the discount worked out here from its terms, and a flat amount
 * only when it is in the currency being shown.
 */
function discountedPrice(
  tier: Tier,
  period: BillingPeriod,
  base: ShownPrice | null,
  discount: DiscountLookup | null,
  preview: LocalPrices | undefined,
): ShownPrice | null {
  if (!base || !discount || !covers(discount, tier.plan, period)) return null;
  let amount: number | null = null;
  if (preview && preview.currency === base.currency) {
    amount = preview.amounts[`${tier.plan}_${period}`] ?? null;
  } else if (discount.type === 'percentage') {
    amount = Math.round(base.amount * (1 - Number(discount.amount) / 100) * 100) / 100;
  } else if (discount.currency_code === base.currency && discount.amount) {
    const digits =
      new Intl.NumberFormat('en', { style: 'currency', currency: base.currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
    amount = Math.max(0, base.amount - Number(discount.amount) / 10 ** digits);
  }
  return amount !== null && amount < base.amount ? { ...base, amount } : null;
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
 * - **Web:** an active web subscription upgrades to a bigger plan here, through
 *   `POST /subscription/change-plan` — Paddle charges the prorated difference at once, and
 *   the server updates the plan from Paddle's answer. Nothing goes through checkout again.
 *   Upgrades only: the refund policy says a smaller plan starts at the next renewal, which
 *   Paddle cannot schedule, so a downgrade is a support request.
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
  const canSwitch =
    data?.source === 'paddle' && (data.status === 'active' || data.status === 'trialing') && !pending;
  const changePlan = useChangePlan();
  const [confirming, setConfirming] = useState<PlanId | null>(null);
  const [switched, setSwitched] = useState<PlanId | null>(null);
  const offering = useCheckoutOffering(user?.uid, canBuy);
  const [buying, setBuying] = useState<PlanId | null>(null);
  const [failed, setFailed] = useState(false);
  const localPrices = useLocalPrices();
  // `isPending` stays true for a query that is switched off, so only a running preview counts.
  const pricesLoading = localPrices.isLoading;

  // The discount code: what was typed, the code the server confirmed, and — when the server
  // could not reach Paddle to check — a code passed to checkout unchecked, as before the
  // lookup existed, so an outage never costs anyone their discount.
  const [codeDraft, setCodeDraft] = useState('');
  const [appliedCode, setAppliedCode] = useState<DiscountLookup | null>(null);
  const [unverifiedCode, setUnverifiedCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const lookup = useLookupDiscount();
  const discountedPrices = useDiscountedPrices(appliedCode?.discount_id ?? null);

  /**
   * Check the typed code. Resolves to the code to send to checkout, null when nothing was
   * typed, or false when the code cannot be used (the reason is then on screen).
   */
  async function applyCode(): Promise<string | null | false> {
    const value = codeDraft.trim();
    if (!value) return null;
    // Paddle's own rule; anything else cannot be a code, so there is nothing to ask.
    if (!DISCOUNT_CODE.test(value)) {
      setCodeError(t('subscription.plans.discountInvalid'));
      return false;
    }
    setCodeError(null);
    setUnverifiedCode(null);
    try {
      const result = await lookup.mutateAsync(value);
      if (result.valid) {
        setAppliedCode(result);
        setCodeDraft('');
        return result.code;
      }
      setCodeError(t(`subscription.plans.discount.reason.${result.reason ?? 'not_found'}`));
      return false;
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 429) {
        setCodeError(t('subscription.plans.discount.tooMany'));
        return false;
      }
      setUnverifiedCode(value);
      return value;
    }
  }

  function removeCode() {
    setAppliedCode(null);
    setUnverifiedCode(null);
    setCodeDraft('');
    setCodeError(null);
  }

  async function buy(pkg: Package, plan: PlanId) {
    if (!user) return;
    let discountCode = appliedCode?.code ?? unverifiedCode ?? undefined;
    // A code typed but never applied is checked now rather than silently dropped.
    const typed = codeDraft.trim();
    if (typed && typed.toUpperCase() !== discountCode?.toUpperCase()) {
      const result = await applyCode();
      if (result === false) return;
      discountCode = result ?? undefined;
    }
    // A code restricted to other plans is left out: the card already says it does not apply,
    // and checkout should open at the price the card shows.
    if (appliedCode && discountCode === appliedCode.code && !covers(appliedCode, plan, period)) {
      discountCode = undefined;
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

  function switchTo(plan: Exclude<PlanId, 'free'>) {
    setFailed(false);
    changePlan.mutate(
      { plan, period },
      {
        onSuccess: () => {
          setConfirming(null);
          setSwitched(plan);
        },
        onError: () => {
          setConfirming(null);
          setFailed(true);
        },
      },
    );
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

      {pending ? (
        <PendingBanner data={data} activated={activated} />
      ) : switched ? (
        <SwitchedBanner plan={switched} />
      ) : (
        <AccountBanner data={data} canSwitch={canSwitch} />
      )}

      {failed && (
        <p
          className="mt-3 rounded-[12px] px-4 py-3 text-[14px]"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
          role="alert"
        >
          {t(canSwitch ? 'subscription.plans.switchFailed' : 'subscription.plans.purchaseFailed', {
            email: CONTACT_EMAIL,
          })}
        </p>
      )}

      {/* Billing period, and the discount code beside it: both change the prices below. */}
      <div className="mt-6 flex items-start gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap min-h-[46px]">
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

        {/* Here rather than inside checkout: RevenueCat opens Paddle with Paddle's own
            discount box hidden. See `purchase` in checkout.ts. */}
        {canBuy && CHECKOUT_AVAILABLE && (
          <div className="w-full sm:w-auto sm:ms-auto">
            <DiscountCodeField
              draft={codeDraft}
              onDraftChange={(value) => {
                setCodeDraft(value);
                setCodeError(null);
                setUnverifiedCode(null);
              }}
              applied={appliedCode}
              unverified={unverifiedCode}
              checking={lookup.isPending}
              error={codeError}
              onApply={() => void applyCode()}
              onRemove={removeCode}
            />
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {PAID_TIERS.map((tier) => {
          const price = pricesLoading ? undefined : shownPrice(tier, period, localPrices.data);
          return (
          <PlanCard
            key={tier.id}
            tier={tier}
            period={period}
            price={price}
            discount={canBuy ? appliedCode : null}
            discounted={
              canBuy && price && !discountedPrices.isLoading
                ? discountedPrice(tier, period, price, appliedCode, discountedPrices.data)
                : null
            }
            data={data}
            canBuy={canBuy}
            highlighted={tier.plan === picked || (canBuy && !picked && tier.plan === data.required_plan)}
            pkg={packageFor(offering.data, tier.plan, period)}
            offeringState={offering.isError ? 'error' : offering.isPending ? 'loading' : 'ready'}
            buying={buying}
            onBuy={buy}
            canSwitch={canSwitch}
            confirming={confirming === tier.plan}
            switching={changePlan.isPending && confirming === tier.plan}
            onSwitch={() => {
              setSwitched(null);
              setConfirming(tier.plan);
            }}
            onConfirmSwitch={() => tier.plan !== 'free' && switchTo(tier.plan)}
            onCancelSwitch={() => setConfirming(null)}
          />
          );
        })}
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
function AccountBanner({ data, canSwitch }: { data: Subscription; canSwitch: boolean }) {
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
    text = canSwitch
      ? t('subscription.plans.webManaged', { email: CONTACT_EMAIL })
      : t('subscription.plans.webManagedInactive', { email: CONTACT_EMAIL });
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

/** After a plan switch: the server has already applied it, so this is a statement, not a wait. */
function SwitchedBanner({ plan }: { plan: PlanId }) {
  const { t } = useTranslation();
  return (
    <div
      className="mt-5 rounded-[12px] px-4 py-3 flex items-start gap-3"
      style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}
      role="status"
      aria-live="polite"
    >
      <span className="shrink-0" style={{ marginTop: 2 }}>
        <CheckCircle2 size={16} strokeWidth={2.3} />
      </span>
      <p className="text-[14px] leading-relaxed">
        {t('subscription.plans.switched', { plan: t(`subscription.plan.${plan}`) })}
      </p>
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
  discount,
  discounted,
  data,
  canBuy,
  highlighted,
  pkg,
  offeringState,
  buying,
  onBuy,
  canSwitch,
  confirming,
  switching,
  onSwitch,
  onConfirmSwitch,
  onCancelSwitch,
}: {
  tier: Tier;
  period: BillingPeriod;
  /** Undefined while the preview is loading. */
  price: ShownPrice | null | undefined;
  /** The applied discount code, if any. */
  discount: DiscountLookup | null;
  /** The first payment with that code, or null when it does not lower this card's price. */
  discounted: ShownPrice | null;
  data: Subscription;
  canBuy: boolean;
  highlighted: boolean;
  pkg: Package | null;
  offeringState: 'loading' | 'ready' | 'error';
  buying: PlanId | null;
  onBuy: (pkg: Package, plan: PlanId) => void;
  /** An active web subscription, which switches here instead of buying. */
  canSwitch: boolean;
  confirming: boolean;
  switching: boolean;
  onSwitch: () => void;
  onConfirmSwitch: () => void;
  onCancelSwitch: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isCurrent = tier.plan === data.plan;
  const isUpgrade = PAID_ORDER.indexOf(tier.plan) > PAID_ORDER.indexOf(data.plan);

  const format = (amount: number, digits: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: price!.currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: 2,
    }).format(amount);
  const priceText = price ? format(price.amount, Number.isInteger(price.amount) ? 0 : 2) : '…';
  const perMonth = price ? format(price.amount / 12, 2) : null;
  const discountedText = discounted
    ? format(discounted.amount, Number.isInteger(discounted.amount) ? 0 : 2)
    : null;
  const discountExcludes = discount !== null && !covers(discount, tier.plan, period);

  // Under the price: how long the discounted price lasts and what follows it, or that the
  // code does not cover this plan, or (yearly) the monthly equivalent.
  let note = '';
  if (discounted && discount) {
    note =
      discount.recur && discount.maximum_recurring_intervals === null
        ? t('subscription.plans.discount.everyPayment')
        : t(`subscription.plans.discount.then_${period}`, {
            count: discount.recur ? (discount.maximum_recurring_intervals ?? 1) : 1,
            price: priceText,
          });
  } else if (discountExcludes) {
    // A code for yearly plans read on the monthly tab would otherwise just look useless.
    const other: BillingPeriod = period === 'monthly' ? 'yearly' : 'monthly';
    note = covers(discount, tier.plan, other)
      ? t(`subscription.plans.discount.otherPeriod_${other}`)
      : t('subscription.plans.discount.notThisPlan');
  } else if (period === 'yearly' && perMonth !== null) {
    note = t('subscription.plans.perMonth', { amount: perMonth });
  }

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
            style={{ background: 'var(--color-primary-fill)', color: 'var(--color-on-primary)' }}
          >
            {t('subscription.plans.current')}
          </span>
        )}
        {discounted && discount && (
          <span
            className="text-[11.5px] font-semibold rounded-full px-2 py-0.5"
            style={{
              background: 'var(--color-primary-container)',
              color: 'var(--color-on-primary-container)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {t('subscription.plans.discount.badge', { off: discountOff(discount, i18n.language) })}
          </span>
        )}
      </div>

      {/* Keyed on the shown amount, so a newly discounted price fades in where it lands. */}
      <div
        key={discountedText ?? priceText}
        className="mt-3 flex items-baseline gap-x-2 gap-y-0.5 flex-wrap"
        style={{ animation: discountedText ? 'fadeIn 0.2s ease' : undefined }}
      >
        <span
          className="text-[30px] font-semibold"
          style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
        >
          {discountedText ?? priceText}
        </span>
        {discountedText && (
          <s className="text-[15px]" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>
            <span className="sr-only">{t('subscription.plans.discount.wasPrice')} </span>
            {priceText}
          </s>
        )}
        <span className="text-[13.5px]" style={{ color: 'var(--color-text-secondary)' }}>
          {t(`marketing.pricing.per.${period}`)}
          {price?.taxExclusive ? ` ${t('subscription.plans.plusTax')}` : ''}
        </span>
      </div>
      <p className="mt-1 text-[13px] min-h-[18px]" style={{ color: 'var(--color-text-secondary)' }}>
        {note}
      </p>

      <p className="mt-3 text-[13px] leading-snug min-h-[36px]" style={{ color: 'var(--color-text-secondary)' }}>
        {excess > 0
          ? t('subscription.plans.tooSmall', { count: excess, max: tier.max })
          : canBuy && tier.plan === data.required_plan
            ? t('subscription.plans.recommended')
            : ''}
      </p>

      {canSwitch && isUpgrade && (
        <SwitchControl
          confirming={confirming}
          switching={switching}
          onSwitch={onSwitch}
          onConfirm={onConfirmSwitch}
          onCancel={onCancelSwitch}
        />
      )}

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

/**
 * Switching a web plan charges or credits the difference immediately, so it takes a second,
 * explicit press that says so — never a single click.
 */
function SwitchControl({
  confirming,
  switching,
  onSwitch,
  onConfirm,
  onCancel,
}: {
  confirming: boolean;
  switching: boolean;
  onSwitch: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const primary = {
    background: 'var(--color-primary-fill)',
    color: 'var(--color-on-primary)',
    border: 'none',
    cursor: switching ? 'progress' : 'pointer',
  } as const;

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={onSwitch}
        className="mt-4 h-10 rounded-[9px] text-[14px] font-semibold"
        style={{ ...primary, background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}
      >
        {t('subscription.plans.switch')}
      </button>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className="text-[13px] leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
        {t('subscription.plans.switchConfirm')}
      </p>
      <button
        type="button"
        onClick={onConfirm}
        disabled={switching}
        className="h-10 rounded-[9px] text-[14px] font-semibold inline-flex items-center justify-center gap-2"
        style={primary}
      >
        {switching && <Loader2 size={15} className="animate-spin" />}
        {t(switching ? 'subscription.plans.switching' : 'subscription.plans.switchConfirmButton')}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={switching}
        className="h-9 text-[13.5px] font-semibold"
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
      >
        {t('subscription.plans.switchCancel')}
      </button>
    </div>
  );
}
