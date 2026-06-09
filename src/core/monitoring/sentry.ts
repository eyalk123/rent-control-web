import * as Sentry from '@sentry/react';

/**
 * Initialise Sentry error monitoring.
 *
 * Enabled only in production builds when VITE_SENTRY_DSN is set. Configured as
 * error-only: no performance tracing, no session replay, and no PII — which
 * keeps it in the "strictly functional" bucket so it does not require a cookie /
 * consent banner. (If replay or tracing is added later, a consent banner becomes
 * required — see B7 in the deployment checklist.)
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!import.meta.env.PROD || !dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}
