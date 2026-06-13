import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockPropertiesApi } from '@/core/api/mock';
import type { Property, PropertyCreate, PropertyUpdate } from '@/shared/types';

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
  if (property_owner !== undefined) out.property_owner = property_owner;
  if (inventory_notes !== undefined) out.inventory_notes = inventory_notes;
  if (basic_contract_url !== undefined) out.basic_contract_url = basic_contract_url;
  if (land_registry_url !== undefined) out.land_registry_url = land_registry_url;
  if (data.floor !== undefined) out.floor = data.floor;
  if (data.apartment !== undefined) out.apartment = data.apartment;
  if (data.block !== undefined) out.block = data.block;
  if (data.plot !== undefined) out.plot = data.plot;
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
    'property_owner',
    'inventory_notes',
    'basic_contract_url',
    'land_registry_url',
    'floor',
    'apartment',
    'block',
    'plot',
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
