import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
import { MarketingHeader, MarketingFooter } from '@/features/marketing/components/MarketingChrome';
import { CONTACT_EMAIL } from '@/features/legal/legalContent';

/**
 * Paddle's "default payment link" — `https://rentvance.app/pay`.
 *
 * Paddle sends customers here on its own, not from anything in the app: dunning emails after
 * a failed renewal, "update your payment method" links, and any transaction created outside
 * our checkout. Each arrives as `/pay?_ptxn=txn_…`, and Paddle.js opens the checkout for that
 * transaction by itself once it's loaded — this page only has to load it.
 *
 * **Public on purpose.** A landlord whose card failed opens this from an email, very likely on
 * a device where they aren't signed in. Behind the auth guard, the redirect to sign-in would
 * drop `_ptxn` and the payment would never open — failed-renewal recovery would quietly do
 * nothing. Nothing here needs an account: the transaction id is what identifies the payment.
 *
 * Paddle.js is loaded by this page alone rather than in `index.html`, so no other page pays
 * for a third-party script it never uses. The CSP in `Caddyfile` has to allow Paddle's
 * domains for it to load at all.
 *
 * `VITE_PADDLE_CLIENT_TOKEN` is a Paddle *client-side* token (`live_…` / `test_…`), which is
 * designed to ship in browser code. It is never the API key.
 */

const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js';
const TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined;

interface PaddleEvent {
  name?: string;
}
interface PaddleGlobal {
  Environment: { set: (env: 'sandbox') => void };
  Initialize: (options: { token: string; eventCallback?: (event: PaddleEvent) => void }) => void;
}
declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

type State = 'loading' | 'open' | 'completed' | 'closed' | 'failed';

function loadPaddle(): Promise<PaddleGlobal> {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PADDLE_JS;
    script.async = true;
    script.onload = () => (window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle.js missing')));
    script.onerror = () => reject(new Error('Paddle.js failed to load'));
    document.head.appendChild(script);
  });
}

export function PayPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const transaction = params.get('_ptxn');
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (!transaction || !TOKEN) return;
    let cancelled = false;
    loadPaddle()
      .then((paddle) => {
        if (cancelled) return;
        // Sandbox tokens only work against Paddle's sandbox; the prefix says which this is.
        if (TOKEN.startsWith('test_')) paddle.Environment.set('sandbox');
        paddle.Initialize({
          token: TOKEN,
          eventCallback: (event) => {
            if (event.name === 'checkout.loaded') setState('open');
            else if (event.name === 'checkout.completed') setState('completed');
            else if (event.name === 'checkout.closed') setState((s) => (s === 'completed' ? s : 'closed'));
          },
        });
      })
      .catch(() => !cancelled && setState('failed'));
    return () => {
      cancelled = true;
    };
  }, [transaction]);

  let icon = <Loader2 size={22} className="animate-spin" />;
  let heading = t('subscription.pay.loadingTitle');
  let body = t('subscription.pay.loadingBody');
  let showHome = false;

  if (!transaction) {
    icon = <CreditCard size={22} />;
    heading = t('subscription.pay.noTransactionTitle');
    body = t('subscription.pay.noTransactionBody');
    showHome = true;
  } else if (!TOKEN || state === 'failed') {
    icon = <CreditCard size={22} />;
    heading = t('subscription.pay.unavailableTitle');
    body = t('subscription.pay.unavailableBody', { email: CONTACT_EMAIL });
  } else if (state === 'completed') {
    icon = <CheckCircle2 size={22} />;
    heading = t('subscription.pay.doneTitle');
    body = t('subscription.pay.doneBody');
    showHome = true;
  } else if (state === 'closed') {
    icon = <CreditCard size={22} />;
    heading = t('subscription.pay.closedTitle');
    body = t('subscription.pay.closedBody', { email: CONTACT_EMAIL });
    showHome = true;
  } else if (state === 'open') {
    icon = <CreditCard size={22} />;
    heading = t('subscription.pay.openTitle');
    body = t('subscription.pay.openBody');
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      <div className="mx-auto w-full max-w-[1080px]">
        <MarketingHeader tone="light" />
      </div>

      <main className="mx-auto w-full max-w-[560px] px-6 pt-16 pb-8 text-center flex flex-col items-center">
        <span
          className="flex items-center justify-center rounded-[14px]"
          style={{
            width: 52,
            height: 52,
            background: 'var(--color-primary-container)',
            color: 'var(--color-on-primary-container)',
          }}
        >
          {icon}
        </span>
        <h1 className="mt-5 text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {heading}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {body}
        </p>
        {showHome && (
          <Link
            to="/"
            className="mt-6 h-10 px-5 flex items-center rounded-[9px] text-[14px] font-semibold"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', textDecoration: 'none' }}
          >
            {t('subscription.pay.goToApp')}
          </Link>
        )}
      </main>

      <div className="flex-1" />
      <MarketingFooter />
    </div>
  );
}
