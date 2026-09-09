import { useLocation, useNavigate } from 'react-router-dom';
import type { DetailBackState } from '@/shared/components/detail/useDetailBackTarget';

/**
 * Opens a transaction's detail page, carrying the page it was opened from — and, when the
 * caller knows one, a human name for it — on navigation state (the same `DetailBackState`
 * shape the property and renter pages use). The label is what turns the detail page's back
 * link from a blanket "All transactions" into "Back to 12 Herzl St".
 *
 * Deleting the transaction cannot go back through history — the entry it would land on is
 * the one it came from, but `navigate(-1)` leaves the now-dead detail page in forward
 * history — so the detail page replaces itself with this origin instead. Without it a
 * delete dropped the user on the global transactions list, losing the property or renter
 * page, its tab and its year/category selections, all of which live in the URL here.
 */
export function useOpenTransaction() {
  const navigate = useNavigate();
  const location = useLocation();

  return (id: number, backLabel?: string) => {
    const state: DetailBackState = { backTo: location.pathname + location.search, backLabel };
    navigate(`/transactions/${id}`, { state });
  };
}
