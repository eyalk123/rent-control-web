import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockMortgagesApi, mockPropertiesApi, mockPropertyValuationsApi } from '@/core/api/mock';
import i18n from 'i18next';
import { downloadFile } from '@/shared/utils/download';
import type {
  Property,
  PropertyCreate,
  PropertyUpdate,
  Mortgage,
  MortgageCreate,
  MortgagePaymentInput,
  MortgageUpdate,
  PropertyValuation,
  PropertyValuationInput,
} from '@/shared/types';

export async function getProperties(): Promise<Property[]> {
  if (USE_MOCK_API) return mockPropertiesApi.getProperties();
  const response = await apiClient.get<Property[]>('/properties');
  return response.data;
}

export async function getPropertyById(id: number): Promise<Property> {
  if (USE_MOCK_API) return mockPropertiesApi.getPropertyById(id);
  const response = await apiClient.get<Property>(`/properties/${id}`);
  return response.data;
}

function sanitizePropertyCreate(data: PropertyCreate): PropertyCreate {
  const {
    address,
    city,
    zip_code,
    type,
    sq_ft,
    image_url,
    number_of_rooms,
    parking_numbers,
    electricity_meter_number,
    electricity_account_number,
    water_meter_number,
    water_account_number,
    property_tax,
    house_committee,
    property_owner_id,
    property_owner,
    inventory_notes,
    basic_contract_url,
    land_registry_url,
  } = data;
  const out: PropertyCreate = {
    address,
    city,
    zip_code,
    type,
    sq_ft,
  };
  if (image_url !== undefined) out.image_url = image_url;
  if (number_of_rooms !== undefined) out.number_of_rooms = number_of_rooms;
  if (parking_numbers !== undefined) out.parking_numbers = parking_numbers;
  if (electricity_meter_number !== undefined) out.electricity_meter_number = electricity_meter_number;
  if (electricity_account_number !== undefined) out.electricity_account_number = electricity_account_number;
  if (water_meter_number !== undefined) out.water_meter_number = water_meter_number;
  if (water_account_number !== undefined) out.water_account_number = water_account_number;
  if (property_tax !== undefined) out.property_tax = property_tax;
  if (house_committee !== undefined) out.house_committee = house_committee;
  if (property_owner_id !== undefined) out.property_owner_id = property_owner_id;
  if (property_owner !== undefined) out.property_owner = property_owner;
  if (inventory_notes !== undefined) out.inventory_notes = inventory_notes;
  if (basic_contract_url !== undefined) out.basic_contract_url = basic_contract_url;
  if (land_registry_url !== undefined) out.land_registry_url = land_registry_url;
  if (data.floor !== undefined) out.floor = data.floor;
  if (data.apartment !== undefined) out.apartment = data.apartment;
  if (data.block !== undefined) out.block = data.block;
  if (data.plot !== undefined) out.plot = data.plot;
  if (data.purchase_price !== undefined) out.purchase_price = data.purchase_price;
  if (data.purchase_date !== undefined) out.purchase_date = data.purchase_date;
  if (data.valuation !== undefined) out.valuation = data.valuation;
  return out;
}

function sanitizePropertyUpdate(data: PropertyUpdate): Record<string, unknown> {
  const allowed = [
    'address',
    'city',
    'zip_code',
    'type',
    'sq_ft',
    'image_url',
    'number_of_rooms',
    'parking_numbers',
    'electricity_meter_number',
    'electricity_account_number',
    'water_meter_number',
    'water_account_number',
    'property_tax',
    'house_committee',
    'property_owner_id',
    'property_owner',
    'inventory_notes',
    'basic_contract_url',
    'land_registry_url',
    'floor',
    'apartment',
    'block',
    'plot',
    'purchase_price',
    'purchase_date',
    'valuation',
  ];
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    const val = data[key as keyof PropertyUpdate];
    if (val !== undefined) out[key] = val;
  }
  return out;
}

export async function createProperty(data: PropertyCreate): Promise<Property> {
  if (USE_MOCK_API) return mockPropertiesApi.createProperty(data);
  const payload = sanitizePropertyCreate(data);
  const response = await apiClient.post<Property>('/properties', payload);
  return response.data;
}

export async function updateProperty(
  id: number,
  data: PropertyUpdate
): Promise<Property> {
  if (USE_MOCK_API) return mockPropertiesApi.updateProperty(id, data);
  const payload = sanitizePropertyUpdate(data);
  const response = await apiClient.patch<Property>(`/properties/${id}`, payload);
  return response.data;
}

export async function deleteProperty(id: number): Promise<void> {
  if (USE_MOCK_API) return mockPropertiesApi.deleteProperty(id);
  await apiClient.delete(`/properties/${id}`);
}

/**
 * The one-page PDF an owner sends to a new renter — renter-safe fields only, chosen by the
 * backend. Rendered in the language the app is in, like the reports.
 */
export async function downloadPropertySheet(property: Pick<Property, 'id' | 'address'>): Promise<void> {
  const lang = i18n.language?.startsWith('he') ? 'he' : 'en';
  // Characters no file system accepts are dropped; Hebrew is fine in a download name.
  const name = property.address.replace(/[\\/:*?"<>|]+/g, ' ').trim() || `property-${property.id}`;
  await downloadFile(`/properties/${property.id}/sheet`, `${name}.pdf`, { params: { lang } });
}

/** The property's value history, newest first. The first entry is `current_value`. */
export async function getPropertyValuations(propertyId: number): Promise<PropertyValuation[]> {
  if (USE_MOCK_API) return mockPropertyValuationsApi.list(propertyId);
  const response = await apiClient.get<PropertyValuation[]>(`/properties/${propertyId}/valuations`);
  return response.data;
}

export async function createPropertyValuation(
  propertyId: number,
  data: PropertyValuationInput,
): Promise<PropertyValuation> {
  if (USE_MOCK_API) return mockPropertyValuationsApi.create(propertyId, data);
  const response = await apiClient.post<PropertyValuation>(`/properties/${propertyId}/valuations`, data);
  return response.data;
}

export async function deletePropertyValuation(propertyId: number, valuationId: number): Promise<void> {
  if (USE_MOCK_API) return mockPropertyValuationsApi.delete(propertyId, valuationId);
  await apiClient.delete(`/properties/${propertyId}/valuations/${valuationId}`);
}

/** The property's mortgages. Israel only: the API refuses this elsewhere. */
export async function getPropertyMortgages(propertyId: number): Promise<Mortgage[]> {
  if (USE_MOCK_API) return mockMortgagesApi.list(propertyId);
  const response = await apiClient.get<Mortgage[]>(`/properties/${propertyId}/mortgages`);
  return response.data;
}

export async function createPropertyMortgage(propertyId: number, data: MortgageCreate): Promise<Mortgage> {
  if (USE_MOCK_API) return mockMortgagesApi.create(propertyId, data);
  const response = await apiClient.post<Mortgage>(`/properties/${propertyId}/mortgages`, data);
  return response.data;
}

export async function updatePropertyMortgage(
  propertyId: number,
  mortgageId: number,
  data: MortgageUpdate,
): Promise<Mortgage> {
  if (USE_MOCK_API) return mockMortgagesApi.update(mortgageId, data);
  const response = await apiClient.patch<Mortgage>(`/properties/${propertyId}/mortgages/${mortgageId}`, data);
  return response.data;
}

export async function deletePropertyMortgage(propertyId: number, mortgageId: number): Promise<void> {
  if (USE_MOCK_API) return mockMortgagesApi.delete(mortgageId);
  await apiClient.delete(`/properties/${propertyId}/mortgages/${mortgageId}`);
}

/** A new monthly amount from a date on. Answers with the whole mortgage. */
export async function createMortgagePayment(
  propertyId: number,
  mortgageId: number,
  data: MortgagePaymentInput,
): Promise<Mortgage> {
  if (USE_MOCK_API) return mockMortgagesApi.addPayment(mortgageId, data);
  const response = await apiClient.post<Mortgage>(
    `/properties/${propertyId}/mortgages/${mortgageId}/payments`,
    data,
  );
  return response.data;
}

/** The last remaining amount cannot be removed (400) — delete the mortgage instead. */
export async function deleteMortgagePayment(
  propertyId: number,
  mortgageId: number,
  paymentId: number,
): Promise<Mortgage> {
  if (USE_MOCK_API) return mockMortgagesApi.deletePayment(mortgageId, paymentId);
  const response = await apiClient.delete<Mortgage>(
    `/properties/${propertyId}/mortgages/${mortgageId}/payments/${paymentId}`,
  );
  return response.data;
}
