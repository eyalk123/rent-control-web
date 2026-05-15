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
