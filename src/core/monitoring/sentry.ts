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
    // `release` is deliberately not set here: @sentry/vite-plugin injects it at build
    // time, which keeps the bundle and its uploaded source maps on the same release.
    ignoreErrors: [
      // Benign browser noise that would otherwise dominate the issue list.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Stale chunk after a deploy: main.tsx handles this by reloading once. Only the
      // case where that reload did NOT fix it is reported, from main.tsx itself.
      /Failed to fetch dynamically imported module/,
      /Importing a module script failed/,
    ],
  });
}
