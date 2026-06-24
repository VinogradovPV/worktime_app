import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, Translations } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (path: string) => string;
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  // Default to 'ru' immediately — no blocking on AsyncStorage load
  const [language, setLanguageState] = useState<Language>('ru');

  // Load saved language asynchronously — does NOT block rendering
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('appLanguage');
        if (savedLanguage === 'ru') {
          setLanguageState(savedLanguage);
        }
      } catch (error) {
        // Silently ignore — keep default 'ru'
      }
    };

    loadLanguage();
  }, []);

  // Change language and persist
  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('appLanguage', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  // Resolve translation by dot-path (e.g. 'home.title')
  const t = (path: string): string => {
    const keys = path.split('.');
    let value: any = translations[language];

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Fallback: try 'ru' if current language key is missing
        let fallback: any = translations['ru'];
        for (const k of keys) {
          if (fallback && typeof fallback === 'object' && k in fallback) {
            fallback = fallback[k];
          } else {
            return path;
          }
        }
        return typeof fallback === 'string' ? fallback : path;
      }
    }

    return typeof value === 'string' ? value : path;
  };

  // Always render children — no blocking null return
  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
