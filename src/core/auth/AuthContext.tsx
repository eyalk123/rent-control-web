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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoaded(true);
      setAuthTokenGetter(() => (u ? getIdToken(u) : Promise.resolve(null)));
    });
  }, []);

  const getToken = useCallback(
    () => (user ? getIdToken(user) : Promise.resolve(null)),
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
