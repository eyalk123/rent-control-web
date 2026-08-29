import { useCallback, useEffect, useState } from 'react';
import i18n from '@/core/i18n';

export type SupportedLanguage = 'en' | 'he';

const STORAGE_KEY = 'app_language';

function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'he') return stored;
  const nav = navigator.language?.slice(0, 2);
  return nav === 'he' ? 'he' : 'en';
}

export function useLanguage() {
  const [language, setLanguageState] = useState<SupportedLanguage>(detectLanguage);

  // Each call to this hook owns its own state, so two components using it at the same time
  // drift apart: the sign-in page renders a language toggle in the brand panel and another
  // in the form column (the brand panel is hidden below `md`), and clicking one left the
  // other still showing the old language as selected — and its effect then called
  // `changeLanguage` back with the stale value on the next render it happened to do.
  // i18n already holds the one real answer, so every instance mirrors it.
  useEffect(() => {
    const sync = (lng: string) => {
      if (lng === 'en' || lng === 'he') setLanguageState(lng);
    };
    i18n.on('languageChanged', sync);
    return () => {
      i18n.off('languageChanged', sync);
    };
  }, []);

  useEffect(() => {
    const isRtl = language === 'he';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    i18n.changeLanguage(language);
  }, [language]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  return { language, setLanguage, isRtl: language === 'he' };
}
