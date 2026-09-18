import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import logoImage from '@/assets/rent-control-icon-no-text.png';
import { CountryFlag } from '@/shared/components/ui/CountryFlag';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { useLanguage, type SupportedLanguage } from '@/hooks/useLanguage';
import {
  useCountries,
  useCurrencies,
  useFinishCountrySetup,
  useSetCountry,
  useSetPreferences,
} from './queries';
import type { Country } from './api/countries';

/**
 * The blocking country screen, shown once.
 *
 * It sits in the same slot as `ConsentGate`, for the same reason: **Continue with Google**
 * creates the account the instant the popup closes, so there is no moment in the sign-up
 * flow where a field could be shown, let alone required. A gate that runs *after*
 * authentication is the only thing that covers every way in.
 *
 * Every pre-existing account was backfilled to `IL`, so this never fires for them.
 *
 * **No country is refused, and none is told what it is missing.** Choosing is the whole
 * screen: confirm, and you are in the app. There used to be a second step for non-Israeli
 * accounts listing the country-specific features that do not exist yet, with a "notify me
 * when you add {Country}" capture under it. Both are gone — the first thing a new user met
 * was an inventory of absences, and the one sentence on it that did real work (open-ended
 * tenancies still need an estimated end date) is said by the lease form itself, at the
 * field it is about: `renter.openEndedTermNote` in LeaseTermBuilder.
 */

/** Best guess from the browser, always confirmable. Never a silent decision. */
function guessCountry(countries: Country[]): string {
  const known = new Set(countries.map((c) => c.countryCode));

  // A region subtag is the strongest signal the browser gives (en-GB, he-IL).
  for (const lang of navigator.languages ?? [navigator.language]) {
    const region = lang?.split('-')[1]?.toUpperCase();
    if (region && known.has(region)) return region;
  }

  // Timezone is a good second: Asia/Jerusalem is unambiguous where `he` is not.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    const city = tz.split('/')[1];
    if (city === 'Jerusalem' || city === 'Tel_Aviv') return 'IL';
  } catch {
    // Intl can be missing a timezone in odd environments. Fall through.
  }

  return known.has('IL') ? 'IL' : (countries[0]?.countryCode ?? 'IL');
}

/**
 * Lowercased and stripped of accents, so "cote" finds Côte d'Ivoire and "aland" finds
 * Åland Islands. The explicit combining-mark range rather than `\p{Diacritic}`: the same
 * helper exists on mobile, where the JS engine's unicode property escapes are not worth
 * depending on.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * What the app actually has, named in itself — a language picker that reads "Hebrew" to
 * someone who only reads Hebrew is no help. Two entries today; the list is the only thing
 * that has to change when a third locale ships.
 */
const LANGUAGE_OPTIONS = [
  { value: 'en' as SupportedLanguage, label: 'English' },
  { value: 'he' as SupportedLanguage, label: 'עברית' },
];

/**
 * The card the gate renders into. Module scope, not nested in `CountryGate`: a component
 * declared during render is a new type on every render, so React unmounts and remounts the
 * subtree each time — which would drop the search box's text as the user typed.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: 'var(--color-background)' }}
    >
      <div
        className="w-full max-w-[440px] rounded-[14px] p-8"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src={logoImage}
            alt=""
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }}
          />
          <span className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Rent Control
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CountryGate() {
  const { t } = useTranslation();
  const { data: countries, isPending, isError } = useCountries();
  const setCountry = useSetCountry();
  const setPreferences = useSetPreferences();
  const { language, setLanguage } = useLanguage();
  const finishSetup = useFinishCountrySetup();
  const { data: currencies } = useCurrencies();

  /**
   * The chosen country, or `null` while the search is open. **One or the other is on
   * screen, never both.**
   *
   * A choice used to be nothing but a tinted row inside a 250-row scroller: scroll past it
   * and the screen showed no evidence anything had been picked, and the next stray click
   * anywhere in the list silently replaced it. Now choosing collapses the search into a
   * chip naming the country, and changing it is a deliberate act — the X.
   *
   * The browser guess seeds this once, when the table lands, so the ordinary case is still
   * one confirmation rather than a search. That is the same guess as before and it is more
   * visible than it was, not less: it used to be a highlight somewhere down the list, and
   * it is now the only thing on the screen. Clearing it must not be undone, which is what
   * `seeded` is for — without it the effect would re-guess the instant the X emptied it.
   */
  const [selected, setSelected] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [query, setQuery] = useState('');

  const list = useMemo(() => countries ?? [], [countries]);

  useEffect(() => {
    if (seeded || list.length === 0) return;
    setSeeded(true);
    setSelected(guessCountry(list));
  }, [list, seeded]);

  const chosen = list.find((c) => c.countryCode === selected);

  /**
   * Currency and language follow the country until the user says otherwise.
   *
   * `null` means "still following" rather than "unset", which is what lets the two fields
   * re-fill as the country changes and then stop the moment either is touched. Someone who
   * picks Switzerland, sets EUR, then corrects the country to France must not have their
   * EUR silently replaced — even though France would have suggested it anyway.
   */
  const [currencyTouched, setCurrencyTouched] = useState<string | null>(null);
  const [languageTouched, setLanguageTouched] = useState<string | null>(null);

  const currencyValue = currencyTouched ?? chosen?.currency ?? '';
  // The device's language, not the country's. `navigator.language` knows what this person
  // reads; the country only knows where their buildings are, and a French-reading Israeli
  // is an ordinary case. The country config carries a `locale` and it is deliberately not
  // consulted here.
  const languageValue = (languageTouched ?? language) as SupportedLanguage;

  const currencyOptions = useMemo(
    () =>
      (currencies ?? []).map((c) => ({
        value: c.code,
        label: `${c.code} — ${c.name}${c.symbol === c.code ? '' : ` (${c.symbol})`}`,
      })),
    [currencies],
  );

  /**
   * Prefix matches first, then matches anywhere: typing "ind" offers India before British
   * Indian Ocean Territory. The ISO code matches too, for anyone who thinks in codes.
   */
  const matches = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return list;
    const starts: Country[] = [];
    const contains: Country[] = [];
    for (const c of list) {
      const name = fold(c.name);
      if (name.startsWith(q) || fold(c.countryCode).startsWith(q)) starts.push(c);
      else if (name.includes(q)) contains.push(c);
    }
    return [...starts, ...contains];
  }, [list, query]);

  // The table failing to load must not strand anyone. Offer a retry rather than an empty
  // picker — this is reference data, so a reload almost always fixes it.
  if (isError) {
    return (
      <Shell>
        <h1
          className="mt-6 text-2xl font-bold"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}
        >
          {t('country.loadErrorTitle')}
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('country.loadErrorBody')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 w-full rounded-[10px] py-3 text-sm font-semibold"
          style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          {t('common.tryAgain')}
        </button>
      </Shell>
    );
  }

  if (isPending) {
    return (
      <Shell>
        <div className="flex h-40 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1
        className="mt-6 text-2xl font-bold"
        style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}
      >
        {t('country.gateTitle')}
      </h1>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {t('country.gateSubtitle')}
      </p>

      {/*
        A plain `<p>` plus `aria-labelledby` on whichever control is showing, rather than a
        `<label htmlFor>`: the thing being labelled swaps between an input and a chip, and a
        `htmlFor` pointing at an id that is not in the DOM labels nothing.
      */}
      <p
        id="country-field-label"
        className="mt-6 block text-sm font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {t('country.label')}
      </p>

      {chosen ? (
        /*
          The choice, standing where the search box was. Deliberately not a button: nothing
          on the chip is clickable except the X. The old list could be re-picked by any
          stray click anywhere in 250 rows; this cannot be changed by accident at all.
        */
        <div
          aria-labelledby="country-field-label"
          className="mt-2 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-3"
          style={{
            background: 'var(--color-primary-container)',
            border: '1px solid var(--color-primary)',
          }}
        >
          <CountryFlag code={chosen.countryCode} size={20} fallback="none" />
          <span
            className="flex-1 min-w-0 truncate text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {chosen.name}
          </span>
          <span className="shrink-0 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {chosen.countryCode}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              // Whatever was typed before would still be filtering the list that is about
              // to reappear, which is not what "choose a different country" means.
              setQuery('');
            }}
            aria-label={t('country.clearChoice')}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          {/*
            A search box over a list, not a `<select>`. Two hundred and fifty options is well
            past what a native picker can be walked: it offers single-letter typeahead only,
            so reaching the Netherlands meant pressing "n" five times, and its popup grows to
            the full height of the window on desktop.
          */}
          <input
            id="country-search"
            type="text"
            autoComplete="off"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('country.searchPlaceholder')}
            aria-labelledby="country-field-label"
            className="mt-2 w-full rounded-[10px] px-3 py-3 text-sm outline-none"
            style={{
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-outline)',
            }}
          />

          {/*
            Capped and scrolled rather than left to run: unbounded, the list is the whole
            window and the Continue button below it sits somewhere off the bottom of the
            screen. A pixel height rather than a row count, so it holds whatever the filter
            leaves behind.
          */}
          <div
            role="listbox"
            aria-label={t('country.label')}
            className="mt-2 max-h-[260px] overflow-y-auto rounded-[10px]"
            style={{ border: '1px solid var(--color-outline)' }}
          >
            {matches.length === 0 ? (
              <p className="px-3 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {t('country.noMatches')}
              </p>
            ) : (
              /*
                No selected state to draw in here any more: picking a row is what closes this
                list, so a highlighted row could only ever be one nobody had chosen.
              */
              matches.map((c) => (
                <button
                  key={c.countryCode}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => setSelected(c.countryCode)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-sm transition-colors hover:bg-[var(--color-input-filled-background)]"
                  style={{ background: 'transparent', color: 'var(--color-text-primary)' }}
                >
                  <CountryFlag code={c.countryCode} size={17} fallback="none" />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="shrink-0 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {c.countryCode}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {/*
        Currency and language, pre-filled and changeable. The country is a good guess at
        both and not a fact: a Swiss landlord may let in euros, and plenty of people read
        the app in a language their country does not imply.

        Both sit on this screen rather than behind it because this is the one moment the
        account is empty, which is the only moment the currency can be chosen freely —
        after the first property it locks, since every property freezes its currency at
        creation. Asking here costs one field; asking later is a rule we would have to
        explain.
      */}
      <div className="mt-5 flex flex-col gap-4">
        {/*
          The placeholder is what the field says while it is following a country that has
          not been chosen yet — clearing the chip empties this, and a silently blank box
          reads as broken rather than as "waiting on the answer above".
        */}
        <FormSelect
          label={t('country.currencyLabel')}
          value={currencyValue}
          onValueChange={setCurrencyTouched}
          options={currencyOptions}
          placeholder={t('country.currencyFollowsCountry')}
          aria-label={t('country.currencyLabel')}
        />
        <FormSelect
          label={t('country.languageLabel')}
          value={languageValue}
          onValueChange={setLanguageTouched}
          options={LANGUAGE_OPTIONS}
          sorted={false}
          aria-label={t('country.languageLabel')}
        />
      </div>

      {(setCountry.isError || setPreferences.isError) && (
        <p className="mt-3 text-sm" style={{ color: 'var(--color-danger, #dc2626)' }}>
          {t('country.saveError')}
        </p>
      )}

      <button
        type="button"
        disabled={!chosen || setCountry.isPending || setPreferences.isPending}
        onClick={() => {
          if (!chosen) return;
          setCountry.mutate(chosen.countryCode, {
            // Only advance on a confirmed write. The country drives currency and formats,
            // so landing in the app without it stored would silently render as Israel.
            //
            // The preferences ride on the same success: country first because it is the
            // one that gates the screen, then the two that depend on it. One `finishSetup`
            // at the end, so the gate still dismisses in exactly one place.
            onSuccess: () =>
              setPreferences.mutate(
                { currency: currencyValue, language: languageValue },
                {
                  onSuccess: () => {
                    // Apply it here as well as storing it: `useLanguage` owns i18n and the
                    // document direction, and the app behind this screen is about to render.
                    setLanguage(languageValue);
                    finishSetup(chosen.countryCode);
                  },
                },
              ),
          });
        }}
        className="mt-6 w-full rounded-[10px] py-3 text-sm font-semibold disabled:opacity-60"
        style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
      >
        {setCountry.isPending || setPreferences.isPending
          ? t('common.loading')
          : t('country.confirm')}
      </button>
    </Shell>
  );
}
