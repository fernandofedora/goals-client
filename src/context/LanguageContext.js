import { createContext, useContext } from 'react';

export const PREF_KEY = 'language';

export const LanguageContext = createContext(null);

/**
 * useLanguage() — returns { language, setLanguage }
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
