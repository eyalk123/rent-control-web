import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  getIdToken,
  deleteUser,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { setAuthTokenGetter } from '@/core/api/client';

interface AuthContextValue {
  user: User | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteFirebaseAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// E2E-only: when VITE_E2E_AUTH_BYPASS is "true", skip Firebase entirely and act as a
// signed-in user. Gated on an env var that is unset in normal builds, so the real
// Firebase auth path below is untouched in dev/prod. Used together with VITE_USE_MOCK_API.
const E2E_AUTH_BYPASS = import.meta.env.VITE_E2E_AUTH_BYPASS === 'true';
const E2E_USER = {
  uid: 'e2e-test-user',
  email: 'e2e@test.local',
  displayName: 'E2E Tester',
} as unknown as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(E2E_AUTH_BYPASS ? E2E_USER : null);
  const [isLoaded, setIsLoaded] = useState(E2E_AUTH_BYPASS);

  useEffect(() => {
    if (E2E_AUTH_BYPASS) {
      setAuthTokenGetter(() => Promise.resolve('e2e-test-token'));
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoaded(true);
      setAuthTokenGetter(() => (u ? getIdToken(u) : Promise.resolve(null)));
    });
  }, []);

  const getToken = useCallback(
    () =>
      E2E_AUTH_BYPASS
        ? Promise.resolve('e2e-test-token')
        : user
          ? getIdToken(user)
          : Promise.resolve(null),
    [user],
  );

  const signOut = useCallback(() => firebaseSignOut(auth), []);

  const deleteFirebaseAccount = useCallback(async () => {
    if (!user) throw new Error('No authenticated user');
    await deleteUser(user);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, isSignedIn: !!user, isLoaded, getToken, signOut, deleteFirebaseAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAppAuth must be used inside AuthProvider');
  return ctx;
}
