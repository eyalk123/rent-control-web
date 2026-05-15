import { useQuery } from '@tanstack/react-query';
import { getOverdueRenters, getExpiringRenters } from './api/homeApi';

export function useOverdueRenters() {
  return useQuery({ queryKey: ['home', 'overdue'], queryFn: () => getOverdueRenters() });
}

export function useExpiringRenters(daysUntil = 60) {
  return useQuery({
    queryKey: ['home', 'expiring', daysUntil],
    queryFn: () => getExpiringRenters({ days_until: daysUntil }),
  });
}
