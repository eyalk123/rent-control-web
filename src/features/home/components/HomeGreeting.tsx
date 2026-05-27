import { useTranslation } from 'react-i18next';

export function HomeGreeting() {
  const { t } = useTranslation();

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? t('home.goodMorning') :
    hour < 18 ? t('home.goodAfternoon') :
    t('home.goodEvening');

  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{greeting}</h1>
      <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{dateStr}</p>
    </div>
  );
}
