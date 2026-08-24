// Adapted from rent-control mobile 2026-05-14.
// Changes: expo-constants → import.meta.env, __DEV__ → import.meta.env.DEV,
//          added 401 interceptor for auto sign-out.
import axios from 'axios';
import * as Sentry from '@sentry/react';
import { auth } from '@/core/auth/firebase';
import { signOut } from 'firebase/auth';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

if (import.meta.env.DEV) {
  console.log('[API] Base URL:', baseURL);
}

let _getToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}

apiClient.interceptors.request.use(
  async (config) => {
    if (_getToken) {
      const token = await _getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    if (import.meta.env.DEV) {
      console.log('[API]', config.method?.toUpperCase(), (config.baseURL ?? '') + (config.url ?? ''));
    }
    return config;
  },
  (err) => Promise.reject(err),
);

function getDetailMessage(detail: unknown): string | null {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .filter((x): x is { msg?: string } => typeof x === 'object' && x != null)
      .map((x) => x.msg ?? JSON.stringify(x));
    return parts.length > 0 ? parts.join('; ') : null;
  }
  return null;
}

let _signingOut = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Auto sign-out on 401. Guard against concurrent 401s each firing signOut.
    if (error.response?.status === 401 && !_signingOut) {
      _signingOut = true;
      signOut(auth)
        .catch(() => {})
        .finally(() => { _signingOut = false; });
    }
    const detail = error.response?.data?.detail;
    const userMessage = getDetailMessage(detail);
    if (userMessage) {
      (error as Error & { userMessage?: string }).userMessage = userMessage;
    }
    if (import.meta.env.DEV) {
      console.warn('[API Error]', {
        message: error.message,
        userMessage,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
    }

    // This interceptor is the single owner of HTTP failures for Sentry: every request
    // passes through it, including those react-query never sees. The query/mutation
    // cache handlers in App.tsx deliberately skip axios errors so nothing is filed twice.
    const status: number | undefined = error.response?.status;
    const method = (error.config?.method ?? 'get').toUpperCase();
    // Collapse ids so /properties/42 and /properties/43 are one breadcrumb, one issue.
    const route = (error.config?.url ?? '').replace(/\/\d+(?=\/|$)/g, '/:id');

    Sentry.addBreadcrumb({
      category: 'http',
      type: 'http',
      level: status && status >= 500 ? 'error' : 'warning',
      message: `${method} ${route} -> ${status ?? error.code ?? 'network'}`,
      // Deliberately no request or response bodies: they carry tenant and financial data.
    });

    // Report only what nobody expects. 4xx are normal operation: 400/422 is a validation
    // message the form already displays, 401 signs the user out just above, 403/404 are
    // ordinary outcomes. Reporting them would bury the real failures.
    const isCancel = axios.isCancel(error) || error.code === 'ERR_CANCELED';
    if (!isCancel && (status === undefined || status >= 500)) {
      Sentry.captureException(error, {
        // Axios stringifies every 500 to "Request failed with status code 500", which
        // would collapse every backend failure into a single issue. Group per endpoint.
        fingerprint: ['api', method, route, String(status ?? error.code ?? 'network')],
        tags: {
          api_route: route,
          api_status: String(status ?? ''),
          api_code: error.code ?? '',
        },
      });
    }

    return Promise.reject(error);
  },
);

export default apiClient;

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const withUserMessage = err as Error & { userMessage?: string };
  if (withUserMessage?.userMessage) return withUserMessage.userMessage;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
