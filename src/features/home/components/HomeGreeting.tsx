import { useTranslation } from 'react-i18next';

export function HomeGreeting() {
  const { t, i18n } = useTranslation();

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? t('home.goodMorning') :
    hour < 18 ? t('home.goodAfternoon') :
    t('home.goodEvening');

  // The app language, not `undefined` — that resolves to the *browser's* locale, which
  // printed a Hebrew date under an English greeting for anyone whose browser is set to
  // Hebrew. Every other formatter in the app already keys off i18n.language.
  const dateStr = now.toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{greeting}</h1>
      <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{dateStr}</p>
    </div>
  );
}
