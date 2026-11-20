import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, TranslationDictionary, LANGUAGE_OPTIONS, LanguageOption } from './types';
import { de } from './translations/de';
import { ms } from './translations/ms';
import { id } from './translations/id';
import { en } from './translations/en';

const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  de,
  ms,
  id,
  en
};

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: TranslationDictionary;
  options: LanguageOption[];
  currentOption: LanguageOption;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'percikan_iman_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // German ('de') is the MAIN LANGUAGE requested by user
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'de' || saved === 'ms' || saved === 'id' || saved === 'en') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'de'; // Default to German
  });

  const setLanguage = (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === language) || LANGUAGE_OPTIONS[0];

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t: TRANSLATIONS[language] || de,
    options: LANGUAGE_OPTIONS,
    currentOption
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export { LANGUAGE_OPTIONS };
