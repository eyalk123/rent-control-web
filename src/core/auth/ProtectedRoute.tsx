import { Navigate } from 'react-router-dom';
import { useAppAuth } from './AuthContext';
import { ConsentGate } from '@/features/legal/ConsentGate';
import { useLegalStatus } from '@/features/legal/queries';
import { CountryGate } from '@/features/country/CountryGate';
import { useApplyCountryFormat, useMyCountry } from '@/features/country/queries';

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
  // Runs *after* consent, not before: terms are the condition of using the product at all,
  // while a country is a setting within it. Asking where someone lives before they have
  // agreed to anything is also the wrong order to collect it in.
  const country = useMyCountry(isLoaded && isSignedIn && !legal.blocked);
  // Publishes the account's currency, date and number formats to the shared
  // formatters. Here rather than in each page: every protected route is a child of
  // this component, so it is covered by construction.
  useApplyCountryFormat();

  if (!isLoaded) return <Spinner />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  if (legal.pending) return <Spinner />;
  if (legal.blocked) return <ConsentGate outstanding={legal.outstanding} />;
  if (country.pending) return <Spinner />;
  if (country.blocked) return <CountryGate />;
  return <>{children}</>;
}
