import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import {
  useCurrency,
  ALL_CURRENCIES,
  POPULAR_CURRENCIES,
} from '../../context/CurrencyContext';
import { SectionCard } from './shared';

// ── Currency Selector — premium combobox w/ popular quick-picks ───────────────
export default function CurrencySelector() {
  const { t } = useTranslation();
  const { code, setCurrency } = useCurrency();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside (client-event-listeners)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Filtered results — memoized, case-insensitive across code + name + symbol
  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_CURRENCIES;
    const q = query.toLowerCase().trim();
    return ALL_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [query]);

  const select = useCallback(
    (c) => {
      setCurrency(c.code);
      setOpen(false);
      setQuery('');
    },
    [setCurrency],
  );

  // Find the current active currency object for display
  const activeCurrency =
    ALL_CURRENCIES.find((c) => c.code === code) ||
    ALL_CURRENCIES.find((c) => c.code === 'USD');

  return (
    <SectionCard
      title={t('settings.currency.title')}
      subtitle={t('settings.currency.subtitle')}
      overflowVisible
    >
      <div className="px-5 py-5 space-y-4">
        {/* ── Currently selected ─────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white text-lg font-bold shadow-sm">
            {activeCurrency.symbol}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
              {activeCurrency.code}
            </p>
            <p className="text-[11px] text-indigo-500 dark:text-indigo-400">
              {activeCurrency.name}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500">
            {t('settings.currency.active')}
          </span>
        </div>

        {/* ── Popular quick-picks ────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
            {t('settings.currency.popular')}
          </p>
          <div className="flex gap-2 flex-wrap">
            {POPULAR_CURRENCIES.map((c) => {
              const active = c.code === code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => select(c)}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border',
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-[1.02]'
                      : 'bg-white dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 border-[var(--border)] hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm',
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-6 h-6 rounded text-xs font-bold tabular-nums',
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400',
                    )}
                  >
                    {c.symbol}
                  </span>
                  {c.code}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Search combobox ────────────────────────────────────── */}
        <div ref={wrapperRef} className="relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
            {t('settings.currency.all')}
          </p>
          <div className="relative">
            {/* Search icon */}
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!open) setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={t('settings.currency.searchPlaceholder')}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-800 dark:text-white placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-600',
                'border-[var(--border)] transition-colors',
              )}
              id="currency-search"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
                aria-label={t('settings.currency.clearSearch')}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* ── Dropdown results ─────────────────────────────────── */}
          {open && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-1">
                  <span className="text-2xl opacity-30">🔍</span>
                  <p className="text-sm text-gray-400">
                    {t('settings.currency.noMatch', { query })}
                  </p>
                </div>
              ) : (
                <ul className="py-1" role="listbox">
                  {filtered.map((c) => {
                    const active = c.code === code;
                    return (
                      <li key={c.code} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onClick={() => select(c)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            active
                              ? 'bg-indigo-50 dark:bg-indigo-950/30'
                              : 'hover:bg-gray-50 dark:hover:bg-slate-800/60',
                          )}
                        >
                          <span
                            className={cn(
                              'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold tabular-nums',
                              active
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400',
                            )}
                          >
                            {c.symbol}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'text-sm font-semibold truncate',
                                active
                                  ? 'text-indigo-700 dark:text-indigo-300'
                                  : 'text-gray-700 dark:text-gray-200',
                              )}
                            >
                              {c.code}
                              <span className="ml-2 font-normal text-gray-400 text-xs">
                                {c.name}
                              </span>
                            </p>
                          </div>
                          {active && (
                            <svg
                              className="flex-shrink-0 w-4 h-4 text-indigo-600 dark:text-indigo-400"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
