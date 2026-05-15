// Adapted from rent-control mobile 2026-05-14.
// Changes: expo-constants → import.meta.env, __DEV__ → import.meta.env.DEV,
//          added 401 interceptor for auto sign-out.
import axios from 'axios';
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Auto sign-out on 401
    if (error.response?.status === 401) {
      signOut(auth).catch(() => {});
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
