import { useEffect } from 'react';
import { setAuthTokenGetter } from '@/core/api/client';
import { useAppAuth } from './AuthContext';

export function AuthTokenSync() {
  const { getToken } = useAppAuth();
  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);
  return null;
}
