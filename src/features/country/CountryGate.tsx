import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import logoImage from '@/assets/rent-control-icon-no-text.png';
import {
  useCountries,
  useFinishCountrySetup,
  useRequestCountryNotification,
  useSetCountry,
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
 * **No country is ever refused.** Every ISO country is selectable and every user reaches a
 * working app. What varies is only how much country-specific machinery they get, and the
 * screen says so plainly — a stated absence reads as a roadmap, a silent one reads as a
 * broken product.
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
 * The card the gate renders into. Module scope, not nested in `CountryGate`: a component
 * declared during render is a new type on every render, so React unmounts and remounts the
 * subtree each time — which would drop the select's state as the user typed.
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
  const finishSetup = useFinishCountrySetup();
  const notify = useRequestCountryNotification();

  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Country | null>(null);
  const [notifyRequested, setNotifyRequested] = useState(false);

  const list = useMemo(() => countries ?? [], [countries]);
  const value = selected ?? (list.length ? guessCountry(list) : '');
  const chosen = list.find((c) => c.countryCode === value);

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

  // ── After choosing: say what is and isn't there, then get out of the way ──
  if (confirmed) {
    return (
      <Shell>
        <h1
          className="mt-6 text-2xl font-bold"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}
        >
          {t('country.welcomeTitle', { country: confirmed.name })}
        </h1>

        {/*
          Promises currency and formats, deliberately *not* language: the app ships English
          and Hebrew only, and claiming a language it does not have is exactly the kind of
          overstatement that reads as a broken product on first contact.
        */}
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('country.skimmedNotice', {
            country: confirmed.name,
            currency: confirmed.currency,
          })}
        </p>

        {/* One extra sentence where tenancies are usually open-ended. Nothing is blocked. */}
        {confirmed.openEndedTenancies && (
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('country.openEndedNotice', { country: confirmed.name })}
          </p>
        )}

        <button
          type="button"
          disabled={notifyRequested}
          onClick={() => {
            // Fire and forget: this is a preference, and a failure here must never stand
            // between the user and their portfolio.
            notify.mutate(confirmed.countryCode);
            setNotifyRequested(true);
          }}
          className="mt-6 w-full rounded-[10px] py-3 text-sm font-semibold disabled:opacity-60"
          style={{
            background: 'transparent',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-outline)',
          }}
        >
          {notifyRequested
            ? t('country.notifyRequested')
            : t('country.notifyMe', { country: confirmed.name })}
        </button>

        <button
          type="button"
          onClick={() => finishSetup(confirmed.countryCode)}
          className="mt-3 w-full rounded-[10px] py-3 text-sm font-semibold"
          style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          {t('country.continue')}
        </button>
      </Shell>
    );
  }

  // ── Choosing ──
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

      <label
        htmlFor="country-select"
        className="mt-6 block text-sm font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {t('country.label')}
      </label>
      <select
        id="country-select"
        value={value}
        onChange={(e) => setSelected(e.target.value)}
        className="mt-2 w-full rounded-[10px] px-3 py-3 text-sm"
        style={{
          background: 'var(--color-background)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-outline)',
        }}
      >
        {list.map((c) => (
          <option key={c.countryCode} value={c.countryCode}>
            {c.name}
          </option>
        ))}
      </select>

      {setCountry.isError && (
        <p className="mt-3 text-sm" style={{ color: 'var(--color-danger, #dc2626)' }}>
          {t('country.saveError')}
        </p>
      )}

      <button
        type="button"
        disabled={!chosen || setCountry.isPending}
        onClick={() => {
          if (!chosen) return;
          setCountry.mutate(chosen.countryCode, {
            // Only advance on a confirmed write. The country drives currency and formats,
            // so landing in the app without it stored would silently render as Israel.
            //
            // Israel is Tier N — the full product, nothing absent, nothing to disclose. It
            // goes straight in rather than being shown a screen that would have to say
            // "everything is available", which is noise.
            onSuccess: () => {
              if (chosen.tier === 'native') finishSetup(chosen.countryCode);
              else setConfirmed(chosen);
            },
          });
        }}
        className="mt-6 w-full rounded-[10px] py-3 text-sm font-semibold disabled:opacity-60"
        style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
      >
        {setCountry.isPending ? t('common.loading') : t('country.confirm')}
      </button>
    </Shell>
  );
}
