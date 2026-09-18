import apiClient from '@/core/api/client';
import { USE_MOCK_API } from '@/core/api/mock';

/**
 * The currency table, as the backend's `app/countries/currencies.py` serves it.
 *
 * Separate from the country table because currency stopped being a pure function of
 * country: an account can choose one, so the picker needs a *name* ("Euro", not `EUR`) and
 * the formatter needs the currency's own opinion about decimals and symbol side.
 *
 * `symbol` is the ISO code itself for a currency with no glyph — correct if plain, and
 * what lets the picker list every currency rather than only the pretty ones.
 */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  /** A display *cap*, never a minimum: JPY has no minor unit, USD is unaffected. */
  decimals: number;
  /** Consulted only when the chosen currency is not the country's own. */
  defaultSymbolPosition: 'prefix' | 'suffix';
}

interface CurrencyDto {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  default_symbol_position: 'prefix' | 'suffix';
}

function fromDto(d: CurrencyDto): Currency {
  return {
    code: d.code,
    name: d.name,
    symbol: d.symbol,
    decimals: d.decimals,
    defaultSymbolPosition: d.default_symbol_position,
  };
}

/** Enough rows for offline UI work and for the e2e specs to switch between them. */
const MOCK_CURRENCIES: Currency[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, defaultSymbolPosition: 'suffix' },
  { code: 'GBP', name: 'Pound sterling', symbol: '£', decimals: 2, defaultSymbolPosition: 'prefix' },
  { code: 'ILS', name: 'Israeli new shekel', symbol: '₪', decimals: 2, defaultSymbolPosition: 'suffix' },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥', decimals: 0, defaultSymbolPosition: 'prefix' },
  { code: 'USD', name: 'US dollar', symbol: '$', decimals: 2, defaultSymbolPosition: 'prefix' },
  { code: 'XOF', name: 'West African CFA franc', symbol: 'XOF', decimals: 0, defaultSymbolPosition: 'suffix' },
];

export async function getCurrencies(): Promise<Currency[]> {
  if (USE_MOCK_API) return MOCK_CURRENCIES;
  const response = await apiClient.get<CurrencyDto[]>('/currencies');
  return response.data.map(fromDto);
}

export interface Preferences {
  currency: string | null;
  language: string | null;
}

/** What the account chose, or nulls where it never did and the defaults still apply. */
export async function getMyPreferences(): Promise<Preferences> {
  if (USE_MOCK_API) return { currency: null, language: null };
  const response = await apiClient.get<Preferences>('/users/me');
  return { currency: response.data.currency ?? null, language: response.data.language ?? null };
}

/**
 * Records either choice. Omitting a field leaves it alone rather than clearing it, so the
 * Settings rows can each send only their own.
 *
 * A currency *change* is refused with 409 once the account has a property — see the
 * endpoint. The caller should surface that rather than retry: it is a real answer, not a
 * transient failure.
 */
export async function setMyPreferences(patch: Partial<Preferences>): Promise<Preferences> {
  if (USE_MOCK_API) {
    return { currency: patch.currency ?? null, language: patch.language ?? null };
  }
  const response = await apiClient.patch<Preferences>('/users/me/preferences', patch);
  return { currency: response.data.currency ?? null, language: response.data.language ?? null };
}
