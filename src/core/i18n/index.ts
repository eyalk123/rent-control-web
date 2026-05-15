// Adapted from rent-control mobile 2026-05-14.
// Removed: expo-localization, AsyncStorage, I18nManager.
// Web: uses navigator.language + localStorage.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import he from './locales/he.json';

export type SupportedLanguage = 'en' | 'he';

function getInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem('app_language');
  if (stored === 'he' || stored === 'en') return stored;
  const nav = navigator.language?.slice(0, 2);
  return nav === 'he' ? 'he' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'he'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
