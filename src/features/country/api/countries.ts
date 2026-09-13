import apiClient from '@/core/api/client';
import { USE_MOCK_API } from '@/core/api/mock';

/**
 * Per-country reference data, as the backend's `app/countries/` serves it.
 *
 * `registryKey1` / `registryKey2` are **i18n keys, not labels**. The country decides which
 * concept applies (Block vs Title number vs Cadastral reference); the locale file says it
 * in whatever language the reader chose. `null` means "no override — use your own
 * translation files", which is what Israel sends, so `t('property.block')` still resolves
 * to Block / גוש and the Israeli rendering path is untouched rather than re-implemented.
 */
export interface CountryCapabilities {
  cpiLinkage: boolean;
  taxTracks: boolean;
  israeliPropertyTypes: boolean;
  bitPayments: boolean;
  structuredBankDetails: boolean;
}

export interface Country {
  countryCode: string;
  name: string;
  tier: 'native' | 'supported';
  openEndedTenancies: boolean;
  currency: string;
  currencySymbol: string;
  currencySymbolPosition: 'prefix' | 'suffix';
  locale: string;
  dateFormat: 'DMY' | 'MDY' | 'YMD';
  numberFormat: string;
  areaUnit: 'sqm' | 'sqft';
  revenueBasisDefault: 'accrual' | 'cash';
  defaultCommsChannel: string;
  hasPostalCodes: boolean;
  registryKey1: string | null;
  registryKey2: string | null;
  capabilities: CountryCapabilities;
}

interface CountryDto {
  country_code: string;
  name: string;
  tier: 'native' | 'supported';
  open_ended_tenancies: boolean;
  currency: string;
  currency_symbol: string;
  currency_symbol_position: 'prefix' | 'suffix';
  locale: string;
  date_format: 'DMY' | 'MDY' | 'YMD';
  number_format: string;
  area_unit: 'sqm' | 'sqft';
  revenue_basis_default: 'accrual' | 'cash';
  default_comms_channel: string;
  has_postal_codes: boolean;
  registry_key_1: string | null;
  registry_key_2: string | null;
  capabilities: {
    cpi_linkage: boolean;
    tax_tracks: boolean;
    israeli_property_types: boolean;
    bit_payments: boolean;
    structured_bank_details: boolean;
  };
}

function fromDto(d: CountryDto): Country {
  return {
    countryCode: d.country_code,
    name: d.name,
    tier: d.tier,
    openEndedTenancies: d.open_ended_tenancies,
    currency: d.currency,
    currencySymbol: d.currency_symbol,
    currencySymbolPosition: d.currency_symbol_position,
    locale: d.locale,
    dateFormat: d.date_format,
    numberFormat: d.number_format,
    areaUnit: d.area_unit,
    revenueBasisDefault: d.revenue_basis_default,
    defaultCommsChannel: d.default_comms_channel,
    hasPostalCodes: d.has_postal_codes,
    registryKey1: d.registry_key_1,
    registryKey2: d.registry_key_2,
    capabilities: {
      cpiLinkage: d.capabilities.cpi_linkage,
      taxTracks: d.capabilities.tax_tracks,
      israeliPropertyTypes: d.capabilities.israeli_property_types,
      bitPayments: d.capabilities.bit_payments,
      structuredBankDetails: d.capabilities.structured_bank_details,
    },
  };
}

/**
 * Mock mode has no server. Israel plus a couple of contrasting rows is enough for offline
 * UI work and for an e2e spec to exercise both the plain and the open-ended messaging.
 */
const MOCK_COUNTRIES: Country[] = [
  {
    countryCode: 'IL',
    name: 'Israel',
    tier: 'native',
    openEndedTenancies: false,
    currency: 'ILS',
    currencySymbol: '₪',
    currencySymbolPosition: 'suffix',
    locale: 'he',
    dateFormat: 'DMY',
    numberFormat: '1,234.56',
    areaUnit: 'sqm',
    revenueBasisDefault: 'accrual',
    defaultCommsChannel: 'whatsapp',
    hasPostalCodes: true,
    registryKey1: null,
    registryKey2: null,
    capabilities: {
      cpiLinkage: true,
      taxTracks: true,
      israeliPropertyTypes: true,
      bitPayments: true,
      structuredBankDetails: true,
    },
  },
  {
    countryCode: 'US',
    name: 'United States',
    tier: 'supported',
    openEndedTenancies: false,
    currency: 'USD',
    currencySymbol: '$',
    currencySymbolPosition: 'prefix',
    locale: 'en',
    dateFormat: 'MDY',
    numberFormat: '1,234.56',
    areaUnit: 'sqft',
    revenueBasisDefault: 'cash',
    defaultCommsChannel: 'whatsapp',
    hasPostalCodes: true,
    registryKey1: 'property.registry.apn',
    registryKey2: null,
    capabilities: {
      cpiLinkage: false,
      taxTracks: false,
      israeliPropertyTypes: false,
      bitPayments: false,
      structuredBankDetails: false,
    },
  },
  {
    countryCode: 'GB',
    name: 'United Kingdom',
    tier: 'supported',
    openEndedTenancies: true,
    currency: 'GBP',
    currencySymbol: '£',
    currencySymbolPosition: 'prefix',
    locale: 'en',
    dateFormat: 'DMY',
    numberFormat: '1,234.56',
    areaUnit: 'sqft',
    revenueBasisDefault: 'accrual',
    defaultCommsChannel: 'whatsapp',
    hasPostalCodes: true,
    registryKey1: 'property.registry.title_number',
    registryKey2: null,
    capabilities: {
      cpiLinkage: false,
      taxTracks: false,
      israeliPropertyTypes: false,
      bitPayments: false,
      structuredBankDetails: false,
    },
  },
];

/**
 * The signed-in account's country, or null if the gate has not been answered.
 *
 * Mock mode answers "Israel" so the gate stays out of the way of every unrelated e2e spec
 * and of offline UI work — the same shape the legal gate uses, and
 * `COUNTRY_MOCK_OVERRIDE_KEY` arms the other answer.
 */
export const COUNTRY_MOCK_OVERRIDE_KEY = 'country.mockCountry';

export async function getMyCountry(): Promise<string | null> {
  if (USE_MOCK_API) {
    try {
      const override = localStorage.getItem(COUNTRY_MOCK_OVERRIDE_KEY);
      if (override === 'unset') return null;
      if (override) return override;
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). Not a reason to fail.
    }
    return 'IL';
  }
  const response = await apiClient.get<{ country: string | null }>('/users/me');
  return response.data.country ?? null;
}

export async function getCountries(): Promise<Country[]> {
  if (USE_MOCK_API) return MOCK_COUNTRIES;
  const response = await apiClient.get<CountryDto[]>('/countries');
  return response.data.map(fromDto);
}

/** Records the signup country choice. Asked once, never again in normal use. */
export async function setMyCountry(countryCode: string): Promise<string> {
  if (USE_MOCK_API) return countryCode;
  const response = await apiClient.patch<{ country: string | null }>('/users/me/country', {
    country: countryCode,
  });
  return response.data.country ?? countryCode;
}

/** "Tell me when you add {Country}". Optional; nothing depends on it succeeding. */
export async function requestCountryNotification(countryCode: string): Promise<void> {
  if (USE_MOCK_API) return;
  await apiClient.post('/users/me/notify-country', { country_code: countryCode });
}
