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
  /** Whether a space sits between amount and symbol. Only ever true for a suffix. */
  currencySymbolSpaced: boolean;
  locale: string;
  dateFormat: 'DMY' | 'MDY' | 'YMD';
  numberFormat: string;
  areaUnit: 'sqm' | 'sqft';
  revenueBasisDefault: 'accrual' | 'cash';
  defaultCommsChannel: string;
  /** E.164 calling code. '' means unknown — leave the number exactly as typed. */
  dialCode: string;
  hasPostalCodes: boolean;
  registryKey1: string | null;
  registryKey2: string | null;
  /**
   * i18n keys for the index-linked escalation mode — its label in the rent-change picker
   * and the note under it. Keys rather than labels for the reason above: every market's
   * clause is "the official index", but Israel's is the מדד and Spain's would be the IPC,
   * and the language alone cannot say which. `null` where the country has no index, which
   * is also where `capabilities.cpiLinkage` is off.
   */
  indexLabelKey: string | null;
  indexNoteKey: string | null;
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
  currency_symbol_spaced: boolean;
  locale: string;
  date_format: 'DMY' | 'MDY' | 'YMD';
  number_format: string;
  area_unit: 'sqm' | 'sqft';
  revenue_basis_default: 'accrual' | 'cash';
  default_comms_channel: string;
  dial_code: string;
  has_postal_codes: boolean;
  registry_key_1: string | null;
  registry_key_2: string | null;
  index_label_key: string | null;
  index_note_key: string | null;
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
    currencySymbolSpaced: d.currency_symbol_spaced,
    locale: d.locale,
    dateFormat: d.date_format,
    numberFormat: d.number_format,
    areaUnit: d.area_unit,
    revenueBasisDefault: d.revenue_basis_default,
    defaultCommsChannel: d.default_comms_channel,
    dialCode: d.dial_code,
    hasPostalCodes: d.has_postal_codes,
    registryKey1: d.registry_key_1,
    registryKey2: d.registry_key_2,
    indexLabelKey: d.index_label_key,
    indexNoteKey: d.index_note_key,
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
    currencySymbolSpaced: false,
    locale: 'he',
    dateFormat: 'DMY',
    numberFormat: '1,234.56',
    areaUnit: 'sqm',
    revenueBasisDefault: 'accrual',
    defaultCommsChannel: 'whatsapp',
    dialCode: '972',
    hasPostalCodes: true,
    registryKey1: null,
    registryKey2: null,
    indexLabelKey: 'renter.rentChangeCpi',
    indexNoteKey: 'renter.rentChangeCpiNote',
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
    currencySymbolSpaced: false,
    locale: 'en',
    dateFormat: 'MDY',
    numberFormat: '1,234.56',
    areaUnit: 'sqft',
    revenueBasisDefault: 'cash',
    defaultCommsChannel: 'whatsapp',
    dialCode: '1',
    hasPostalCodes: true,
    registryKey1: 'property.registry.apn',
    registryKey2: null,
    indexLabelKey: null,
    indexNoteKey: null,
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
    currencySymbolSpaced: false,
    locale: 'en',
    dateFormat: 'DMY',
    numberFormat: '1,234.56',
    areaUnit: 'sqft',
    revenueBasisDefault: 'accrual',
    defaultCommsChannel: 'whatsapp',
    dialCode: '44',
    hasPostalCodes: true,
    registryKey1: 'property.registry.title_number',
    registryKey2: null,
    indexLabelKey: null,
    indexNoteKey: null,
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
