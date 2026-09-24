/**
 * Where web checkout starts.
 *
 * Checkout runs inside RentVance through RevenueCat's Web SDK (purchases-js), with Paddle as
 * the payment provider underneath. purchases-js opens Paddle's checkout in the page and tells
 * RevenueCat whose purchase it is; RevenueCat then sends the webhook that changes the plan on
 * our server. Nothing here changes the plan itself.
 *
 * **The app user id is the Firebase UID, always.** The webhook reads `app_user_id` as the
 * account id, so a purchase made under anything else — including an anonymous RevenueCat id —
 * belongs to nobody and the server ignores it.
 *
 * The SDK is about a megabyte, so it is imported on demand: only a landlord who opens the
 * plan picker downloads it.
 *
 * `VITE_REVENUECAT_PUBLIC_KEY` is the *public* key of the Paddle app in RevenueCat, designed
 * to ship in browser code. Without it the picker shows its buy buttons disabled and says so.
 */
import type { Offering, Package } from '@revenuecat/purchases-js';
import type { BillingPeriod } from '@/features/marketing/tiers';
import type { PlanId } from './types';

const KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY as string | undefined;

export const CHECKOUT_AVAILABLE = Boolean(KEY);

/** The offering whose packages the picker sells. Configured in the RevenueCat dashboard. */
const OFFERING_ID = 'default';

async function purchasesFor(appUserId: string) {
  if (!KEY) throw new Error('RevenueCat is not configured');
  const { Purchases } = await import('@revenuecat/purchases-js');
  if (!Purchases.isConfigured()) {
    return Purchases.configure({ apiKey: KEY, appUserId });
  }
  const purchases = Purchases.getSharedInstance();
  // Another account signed in on this tab since the SDK was configured. Buying under the
  // old id would give the new account's money to the previous account.
  if (purchases.getAppUserId() !== appUserId) await purchases.changeUser(appUserId);
  return purchases;
}

/** The six packages, keyed `<plan>_<period>` — the package identifiers in the dashboard. */
export async function loadOffering(appUserId: string): Promise<Offering | null> {
  const purchases = await purchasesFor(appUserId);
  const offerings = await purchases.getOfferings();
  return offerings.all[OFFERING_ID] ?? offerings.current;
}

export function packageFor(
  offering: Offering | null | undefined,
  plan: PlanId,
  period: BillingPeriod,
): Package | null {
  return offering?.packagesById[`${plan}_${period}`] ?? null;
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

/**
 * Open checkout for one package and wait for it to finish.
 *
 * Resolves `'purchased'` once Paddle has taken the payment. The plan is **not** changed yet at
 * that point: the webhook still has to reach our server, which is what the picker's pending
 * state waits for.
 */
export async function purchase(
  appUserId: string,
  rcPackage: Package,
  options: { email?: string | null; locale: string },
): Promise<PurchaseOutcome> {
  const purchases = await purchasesFor(appUserId);
  const { ErrorCode, PurchasesError } = await import('@revenuecat/purchases-js');
  try {
    await purchases.purchase({
      rcPackage,
      customerEmail: options.email ?? undefined,
      selectedLocale: options.locale,
      defaultLocale: 'en',
    });
    return 'purchased';
  } catch (error) {
    if (error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError) {
      return 'cancelled';
    }
    throw error;
  }
}
