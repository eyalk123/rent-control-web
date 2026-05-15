import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockHomeApi } from '@/core/api/mock';

export interface OverdueRenter {
  renter_id: number;
  first_name: string;
  last_name: string;
  property_id: number | null;
  property_address: string | null;
  property_city: string | null;
  property_owner: string | null;
  monthly_amount: number;
  payment_day_of_month: number;
  payment_type?: string | null;
  days_overdue: number;
}

export interface OverdueParams {
  property_owner?: string;
}

export async function getOverdueRenters(params?: OverdueParams): Promise<OverdueRenter[]> {
  if (USE_MOCK_API) return mockHomeApi.getOverdueRenters(params);
  const { data } = await apiClient.get<OverdueRenter[]>('/renters/overdue', { params });
  return data;
}

export interface ExpiringRenter {
  renter_id: number;
  first_name: string;
  last_name: string;
  property_id: number | null;
  property_address: string | null;
  property_city: string | null;
  property_owner: string | null;
  lease_end_date: string;
  days_until_expiry: number;
}

export interface ExpiringParams {
  days_until?: number;
}

export async function getExpiringRenters(params?: ExpiringParams): Promise<ExpiringRenter[]> {
  if (USE_MOCK_API) return mockHomeApi.getExpiringRenters(params);
  const { data } = await apiClient.get<ExpiringRenter[]>('/renters/expiring', { params });
  return data;
}
