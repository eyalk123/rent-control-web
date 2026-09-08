import { Navigate } from 'react-router-dom';
import { useAppAuth } from './AuthContext';
import { ConsentGate } from '@/features/legal/ConsentGate';
import { useLegalStatus } from '@/features/legal/queries';

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-background)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAppAuth();
  // Every protected route is a child of this component, so checking here covers all of
  // them by construction — no page has to remember to opt in. Gated on a signed-in user:
  // an unauthenticated call would 401, and the api client reads a 401 as an expired
  // session and signs the user out. `blocked` stays false while it loads and on error —
  // see useLegalStatus for why this fails open.
  const legal = useLegalStatus(isLoaded && isSignedIn);

  if (!isLoaded) return <Spinner />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  if (legal.pending) return <Spinner />;
  if (legal.blocked) return <ConsentGate outstanding={legal.outstanding} />;
  return <>{children}</>;
}
