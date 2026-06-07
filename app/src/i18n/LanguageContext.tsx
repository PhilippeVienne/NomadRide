import { createContext, useContext, useState, ReactNode } from 'react';
import { translations } from './translations';

export type Language = 'fr' | 'en';
export type TranslationKeys = keyof typeof translations.fr;

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('nomad_lang');
    if (saved === 'en' || saved === 'fr') {
      return saved as Language;
    }
    // French first (default on initial install/visit)
    return 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('nomad_lang', lang);
  };

  const t = (key: TranslationKeys, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.fr;
    const value = dict[key];
    if (!value) {
      // Fallback to French if the translation is missing in the target language
      const fallbackValue = translations.fr[key] || String(key);
      return interpolate(fallbackValue, params);
    }
    return interpolate(value, params);
  };

  const interpolate = (text: string, params?: Record<string, string | number>): string => {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
