import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import api from '../api';
import i18n, { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../i18n';
import { getPref, setPref } from '../utils/userStorage';

const PREF_KEY = 'language';

const LanguageContext = createContext(null);

/**
 * LanguageProvider — mirrors CurrencyContext's per-user sync model on top of
 * the global i18next singleton.
 *
 * i18next is a single global instance, but this provider is remounted whenever
 * the authenticated identity changes (App.jsx keys it by user id). On mount it
 * (A) resets i18next to the current user's stored preference, then (B) syncs
 * from the server, which is the source of truth per user.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(i18n.language);

  // Keep local state in lockstep with i18next so consumers re-render on change.
  useEffect(() => {
    const onChange = (lng) => setLanguageState(lng);
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, []);

  // (A) On mount, align the global singleton with THIS user's stored preference.
  // Logged out → 'anon' scope → default language (no cross-user leak).
  useEffect(() => {
    const pref = getPref(PREF_KEY);
    const initial = SUPPORTED_LANGUAGES.includes(pref)
      ? pref
      : DEFAULT_LANGUAGE;
    if (i18n.language !== initial) i18n.changeLanguage(initial);
  }, []);

  // (B) Sync from server on mount — the server is the source of truth per user.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api
      .get('/user/me')
      .then((res) => {
        const serverLang = res.data?.language || DEFAULT_LANGUAGE;
        if (
          SUPPORTED_LANGUAGES.includes(serverLang) &&
          serverLang !== i18n.language
        ) {
          i18n.changeLanguage(serverLang);
          setPref(PREF_KEY, serverLang);
        }
      })
      .catch(() => {
        /* ignore — fall back to the cached preference */
      });
  }, []);

  const setLanguage = useCallback(async (code) => {
    if (!SUPPORTED_LANGUAGES.includes(code)) return;
    i18n.changeLanguage(code);
    setPref(PREF_KEY, code);
    // Fire-and-forget server persistence; don't block the UI
    try {
      await api.put('/user/profile', { language: code });
    } catch {
      // Non-critical — localStorage acts as the primary source
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useLanguage() — returns { language, setLanguage }
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
