import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockRentersApi } from '@/core/api/mock';
import type { Renter, RenterCreate, RenterUpdate } from '@/shared/types';

export async function getRenters(): Promise<Renter[]> {
  if (USE_MOCK_API) return mockRentersApi.getRenters();
  const response = await apiClient.get<Renter[]>('/renters');
  return response.data;
}

export async function getRenterById(id: number): Promise<Renter> {
  if (USE_MOCK_API) return mockRentersApi.getRenterById(id);
  const response = await apiClient.get<Renter>(`/renters/${id}`);
  return response.data;
}

function sanitizeRenterCreate(data: RenterCreate): RenterCreate {
  const {
    property_id,
    first_name,
    last_name,
    phone,
    email,
    lease_years,
    lease_start,
    number_of_payments,
    payment_type,
    payment_day_of_month,
    insurance_type,
    insurance_amount,
    contact_id,
    extra_contacts,
    full_contract_url,
    id_image_url,
    contract_term_years,
    option_years,
    base_rent,
    rent_escalation_mode,
    rent_escalation_value,
  } = data;
  const out: RenterCreate = {
    property_id: property_id ?? null,
    first_name,
    last_name,
    phone,
    email,
    lease_years: lease_years ?? [],
    lease_start,
  };
  if (number_of_payments !== undefined) out.number_of_payments = number_of_payments;
  if (contract_term_years !== undefined) out.contract_term_years = contract_term_years;
  if (option_years !== undefined) out.option_years = option_years;
  if (base_rent !== undefined) out.base_rent = base_rent;
  if (rent_escalation_mode !== undefined) out.rent_escalation_mode = rent_escalation_mode;
  if (rent_escalation_value !== undefined) out.rent_escalation_value = rent_escalation_value;
  if (payment_type !== undefined) out.payment_type = payment_type;
  if (payment_day_of_month !== undefined) out.payment_day_of_month = payment_day_of_month;
  if (insurance_type !== undefined) out.insurance_type = insurance_type;
  if (insurance_amount !== undefined) out.insurance_amount = insurance_amount;
  if (contact_id !== undefined) out.contact_id = contact_id ?? null;
  if (extra_contacts !== undefined) out.extra_contacts = extra_contacts;
  if (full_contract_url !== undefined) out.full_contract_url = full_contract_url;
  if (id_image_url !== undefined) out.id_image_url = id_image_url;
  return out;
}

function sanitizeRenterUpdate(data: RenterUpdate): Record<string, unknown> {
  const allowed = [
    'property_id',
    'first_name',
    'last_name',
    'phone',
    'email',
    'lease_years',
    'lease_start',
    'number_of_payments',
    'payment_type',
    'payment_day_of_month',
    'insurance_type',
    'insurance_amount',
    'contact_id',
    'extra_contacts',
    'full_contract_url',
    'id_image_url',
    'contract_term_years',
    'option_years',
    'base_rent',
    'rent_escalation_mode',
    'rent_escalation_value',
  ];
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    const val = data[key as keyof RenterUpdate];
    if (val !== undefined) out[key] = val;
  }
  return out;
}

export async function createRenter(data: RenterCreate): Promise<Renter> {
  if (USE_MOCK_API) return mockRentersApi.createRenter(data);
  const payload = sanitizeRenterCreate(data);
  const response = await apiClient.post<Renter>('/renters', payload);
  return response.data;
}

export async function updateRenter(
  id: number,
  data: RenterUpdate
): Promise<Renter> {
  if (USE_MOCK_API) return mockRentersApi.updateRenter(id, data);
  const payload = sanitizeRenterUpdate(data);
  const response = await apiClient.patch<Renter>(`/renters/${id}`, payload);
  return response.data;
}

export async function deleteRenter(id: number): Promise<void> {
  if (USE_MOCK_API) return mockRentersApi.deleteRenter(id);
  await apiClient.delete(`/renters/${id}`);
}
