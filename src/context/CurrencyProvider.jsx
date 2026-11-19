import { useState, useCallback, useMemo, useEffect } from 'react';
import api from '../api';
import { getPref, setPref } from '../utils/userStorage';
import { PRIVACY_MASK, setPrivacyFlag } from '../utils/privacy';
import {
  CurrencyContext,
  DEFAULT_CODE,
  PREF_KEY,
  PRIVACY_KEY,
  currencyMap,
  getInitialCurrency,
} from './CurrencyContext';

export function CurrencyProvider({ children }) {
  // Read from localStorage synchronously to avoid FOUC (rerender-lazy-state-init)
  const [currency, setCurrencyState] = useState(getInitialCurrency);

  // Privacy mode hides every amount (per user, UI only: exports are unaffected).
  // The module flag is updated in the same tick so pure formatters agree with
  // the React state on the very next render.
  const [privacyMode, setPrivacyModeState] = useState(() => {
    const on = getPref(PRIVACY_KEY) === '1';
    setPrivacyFlag(on);
    return on;
  });

  const togglePrivacy = useCallback(() => {
    const next = !privacyMode;
    setPrivacyFlag(next);
    setPref(PRIVACY_KEY, next ? '1' : '0');
    setPrivacyModeState(next);
  }, [privacyMode]);

  // "$1234.50" with the user's symbol, or the mask while privacy mode is on.
  const money = useCallback(
    (value) =>
      privacyMode
        ? PRIVACY_MASK
        : `${currency.symbol}${(Number(value) || 0).toFixed(2)}`,
    [privacyMode, currency.symbol],
  );

  // Persist to localStorage + server whenever the user changes it (rerender-functional-setstate)
  const setCurrency = useCallback(async (code) => {
    const match = currencyMap.get(code);
    if (!match) return;
    setCurrencyState(match);
    setPref(PREF_KEY, code);

    // Fire-and-forget server persistence; don't block the UI
    try {
      await api.put('/user/profile', { currency: code });
    } catch {
      // Non-critical — localStorage acts as the primary source
    }
  }, []);

  // Sync from server on mount — the server is the source of truth per user.
  // The provider is remounted whenever the authenticated identity changes
  // (App.jsx keys it by user id), so this re-runs for each logged-in user and
  // never carries another account's choice over. Overwrites the cached value
  // only when the server differs, preserving the "instant load" from cache.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return; // not logged in yet
    api
      .get('/user/me')
      .then((res) => {
        const serverCode = res.data?.currency || DEFAULT_CODE;
        if (serverCode !== currency.code) {
          const match = currencyMap.get(serverCode);
          if (match) {
            setCurrencyState(match);
            setPref(PREF_KEY, serverCode);
          }
        }
      })
      .catch(() => {
        /* ignore — fall back to the cached preference */
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable context value to avoid unnecessary re-renders (rerender-memo)
  const value = useMemo(
    () => ({
      currency, // { code, symbol, name }
      symbol: currency.symbol,
      code: currency.code,
      setCurrency,
      privacyMode,
      togglePrivacy,
      money,
    }),
    [currency, setCurrency, privacyMode, togglePrivacy, money],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}
