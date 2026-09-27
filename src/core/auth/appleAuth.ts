import {
  OAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  revokeAccessToken,
  type User,
} from 'firebase/auth';
import * as Sentry from '@sentry/react';
import { auth } from './firebase';

/**
 * Sign in with Apple on the web.
 *
 * The iPhone app offers Apple sign-in because the App Store requires it, and an account made
 * that way has no password — so without this button its owner could never reach the web app.
 * Uses Firebase's popup flow, which depends on the Services ID, key and return URL configured
 * for the Apple provider in the Firebase console.
 */

const APPLE_PROVIDER_ID = 'apple.com';

function appleProvider(language: string) {
  const provider = new OAuthProvider(APPLE_PROVIDER_ID);
  provider.addScope('email');
  provider.addScope('name');
  // Apple's sheet in the app's language rather than the browser's.
  provider.setCustomParameters({ locale: language === 'he' ? 'he_IL' : 'en_US' });
  return provider;
}

const CANCEL_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);

export function isPopupCancel(err: unknown): boolean {
  return CANCEL_CODES.has((err as { code?: string })?.code ?? '');
}

export async function signInWithApple(language: string): Promise<void> {
  await signInWithPopup(auth, appleProvider(language));
}

/**
 * Account deletion, step one, for an account that signs in with Apple. Apple requires its
 * tokens to be revoked when the account is deleted, and revoking needs a fresh Apple access
 * token, which only a new Apple sign-in yields. The same popup also satisfies Firebase's
 * recent-login check for deleteUser.
 *
 * Runs before anything is deleted, so closing the popup leaves the account intact (the
 * popup-closed error propagates; check it with isPopupCancel). Returns null for accounts that
 * don't use Apple.
 */
export async function reauthenticateAppleForDeletion(user: User, language: string): Promise<string | null> {
  if (!user.providerData.some((p) => p.providerId === APPLE_PROVIDER_ID)) return null;
  const result = await reauthenticateWithPopup(user, appleProvider(language));
  return OAuthProvider.credentialFromResult(result)?.accessToken ?? null;
}

/**
 * Best-effort: the account's data is already gone when this runs, and a failed revocation
 * must not stop the Firebase account from being deleted too.
 */
export async function revokeAppleToken(accessToken: string | null): Promise<void> {
  if (!accessToken) return;
  try {
    await revokeAccessToken(auth, accessToken);
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'apple_revoke' } });
  }
}
