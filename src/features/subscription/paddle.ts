/**
 * Paddle.js, loaded on demand and shared by the pages that need it.
 *
 * Two pages use it: `/pay` (Paddle's default payment link, which opens a checkout by itself)
 * and `/plans` (price preview, so each visitor sees the price in their own currency).
 * RevenueCat's SDK loads the same `window.Paddle` for checkout, and it already handles an
 * instance that is initialised: it calls `Update` instead of `Initialize`. This module does
 * the same, because Paddle.js may only be initialised once per page load.
 *
 * `VITE_PADDLE_CLIENT_TOKEN` is a Paddle *client-side* token (`live_…` / `test_…`), which is
 * designed to ship in browser code. It is never the API key.
 */
import type { BillingPeriod } from '@/features/marketing/tiers';
import type { PlanId } from './types';

const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js';
const TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined;

export const PADDLE_AVAILABLE = Boolean(TOKEN);

export interface PaddleEvent {
  name?: string;
}

interface PreviewLineItem {
  price: { id: string };
  /** Minor units (cents/agorot), as strings. */
  unitTotals: { subtotal: string; tax: string; total: string };
}

interface PricePreviewResult {
  data: {
    currencyCode: string;
    address: { countryCode: string };
    details: { lineItems: PreviewLineItem[] };
  };
}

interface PaddleGlobal {
  Initialized?: boolean;
  Environment: { set: (env: 'sandbox') => void };
  Initialize: (options: { token: string; eventCallback?: (event: PaddleEvent) => void }) => void;
  Update: (options: { eventCallback?: (event: PaddleEvent) => void }) => void;
  PricePreview: (request: { items: { priceId: string; quantity: number }[] }) => Promise<PricePreviewResult>;
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

let script: Promise<PaddleGlobal> | null = null;

function loadScript(): Promise<PaddleGlobal> {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  script ??= new Promise<PaddleGlobal>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = PADDLE_JS;
    el.async = true;
    el.onload = () => (window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle.js missing')));
    el.onerror = () => {
      script = null;
      el.remove();
      reject(new Error('Paddle.js failed to load'));
    };
    document.head.appendChild(el);
  });
  return script;
}

/** Loads Paddle.js and initialises it once; later callers only swap the event callback. */
export async function initPaddle(eventCallback?: (event: PaddleEvent) => void): Promise<PaddleGlobal> {
  if (!TOKEN) throw new Error('Paddle is not configured');
  const paddle = await loadScript();
  if (paddle.Initialized) {
    if (eventCallback) paddle.Update({ eventCallback });
  } else {
    // Sandbox tokens only work against Paddle's sandbox; the prefix says which this is.
    if (TOKEN.startsWith('test_')) paddle.Environment.set('sandbox');
    paddle.Initialize({ token: TOKEN, eventCallback });
  }
  return paddle;
}

/**
 * The Paddle price behind each RevenueCat package, keyed `<plan>_<period>` like the packages.
 * These are the live price ids; they must stay in step with the products in the RevenueCat
 * offering, which is what checkout actually sells.
 */
const PRICE_IDS: Record<`${Exclude<PlanId, 'free'>}_${BillingPeriod}`, string> = {
  tier_3_8_monthly: 'pri_01m39bzfjqd489x258g3srtg9v',
  tier_3_8_yearly: 'pri_01m39c0e8mx96spd6sagf972ny',
  tier_9_15_monthly: 'pri_01m39c1sm362n1j2jvd7jhxs32',
  tier_9_15_yearly: 'pri_01m39c2j8af8j4vd49n2t5hsm6',
  tier_16_plus_monthly: 'pri_01m39c3qa4597sp255tbbhes17',
  tier_16_plus_yearly: 'pri_01m39c45cxf0jwj12gb7aq6b7h',
};

/**
 * Countries where the prices' `location` tax mode adds tax on top at checkout. Everywhere
 * else the price already includes it (VAT in Israel and the EU).
 */
const TAX_EXCLUSIVE_COUNTRIES = new Set(['US', 'CA']);

/** Give up on the preview after this long and show the USD fallback instead. */
const PREVIEW_TIMEOUT_MS = 8_000;

export interface LocalPrices {
  currency: string;
  /** True where tax is added at checkout, so the price is shown with "+ tax". */
  taxExclusive: boolean;
  /** The price as it will be charged before any added tax, in major units, per package key. */
  amounts: Record<string, number>;
}

/**
 * What each package costs this visitor, from Paddle's price preview. Paddle picks the
 * country from the visitor's IP and applies the same per-country prices checkout uses.
 */
export async function previewPrices(): Promise<LocalPrices> {
  const paddle = await initPaddle();
  const keys = Object.keys(PRICE_IDS) as (keyof typeof PRICE_IDS)[];
  const request = paddle.PricePreview({ items: keys.map((k) => ({ priceId: PRICE_IDS[k], quantity: 1 })) });
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Paddle price preview timed out')), PREVIEW_TIMEOUT_MS);
  });
  const { data } = await Promise.race([request, timeout]).finally(() => window.clearTimeout(timer));

  const taxExclusive = TAX_EXCLUSIVE_COUNTRIES.has(data.address.countryCode);
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency: data.currencyCode }).resolvedOptions()
    .maximumFractionDigits ?? 2;
  const amounts: LocalPrices['amounts'] = {};
  for (const key of keys) {
    const item = data.details.lineItems.find((li) => li.price.id === PRICE_IDS[key]);
    // A missing price would leave one card in another currency; fall back to USD for all.
    if (!item) throw new Error(`Paddle price preview is missing ${key}`);
    // Tax-inclusive: the total is the listed price. Tax-exclusive: the subtotal is, and
    // tax is added at checkout.
    const minor = Number(taxExclusive ? item.unitTotals.subtotal : item.unitTotals.total);
    amounts[key] = minor / 10 ** digits;
  }
  return { currency: data.currencyCode, taxExclusive, amounts };
}
