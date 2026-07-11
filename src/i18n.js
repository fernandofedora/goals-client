import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getPref } from './utils/userStorage';
import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['en', 'es'];
export const DEFAULT_LANGUAGE = 'en';

// Synchronous init from the per-user localStorage preference avoids a language
// flash on reload. The server is still the source of truth and is re-synced by
// LanguageContext on mount (see src/context/LanguageContext.jsx).
const initial = getPref('language');
i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: SUPPORTED_LANGUAGES.includes(initial) ? initial : DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18next;
