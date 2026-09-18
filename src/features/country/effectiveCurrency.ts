import type { Country } from './api/countries';
import type { Currency } from './api/currencies';

export interface EffectiveCurrency {
  code: string;
  symbol: string;
  symbolPosition: 'prefix' | 'suffix';
  decimals: number;
}

/**
 * The currency an account actually uses, and how to write it.
 *
 * Mirrors `country_service.effective_currency` on the backend — the same rule has to hold
 * in both places, because the server prints the reports and the client prints everything
 * else, and a portfolio whose screens and PDFs disagree about where the symbol goes is
 * worse than either choice.
 *
 * `chosen` is the explicit pick from the signup gate; `null` means "never chose", which is
 * every account that predates the picker and most accounts after it.
 *
 * **Where the symbol goes has two answers on purpose.** Position is a property of the
 * *reader*, not of the money: `€1,234` in Ireland and `1.234 €` in Germany are the same
 * currency written two ways, and only the country knows which. So while the chosen currency
 * is the country's own — the overwhelming majority, Israel included — position comes from
 * the country row and nothing changes.
 *
 * It is when the two come apart that the country stops being the authority. An Israeli
 * account holding dollars would otherwise read `1,234$`, because Israel writes its symbol
 * last and nobody writes dollars that way. There, the currency's own default wins.
 */
export function resolveEffectiveCurrency(
  country: Country | undefined,
  currencies: Currency[] | undefined,
  chosen: string | null,
): EffectiveCurrency | null {
  if (!country) return null;

  const native = currencies?.find((c) => c.code === country.currency);
  const nativeCurrency: EffectiveCurrency = {
    code: country.currency,
    symbol: country.currencySymbol,
    symbolPosition: country.currencySymbolPosition,
    decimals: native?.decimals ?? 2,
  };

  if (!chosen || chosen === country.currency) return nativeCurrency;

  // An unknown code falls back to the country's currency rather than inventing a symbol —
  // the same direction of failure the backend takes.
  const picked = currencies?.find((c) => c.code === chosen);
  if (!picked) return nativeCurrency;

  return {
    code: picked.code,
    symbol: picked.symbol,
    symbolPosition: picked.defaultSymbolPosition,
    decimals: picked.decimals,
  };
}
