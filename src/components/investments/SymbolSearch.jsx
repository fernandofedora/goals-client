import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { cn } from '../../lib/utils';

const DEBOUNCE_MS = 300;

/**
 * Search box for stocks/ETFs (server searches the local catalog, so typing
 * costs no market-data quota). Calls onSelect(symbol) with the catalog entry.
 */
export default function SymbolSearch({ onSelect }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const listId = useId();

  // Debounced search; a newer query aborts the previous request.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      setError(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/investments/search', {
          params: { q },
          signal: controller.signal,
        });
        setResults(res.data);
        setError(false);
        setActive(res.data.length ? 0 : -1);
      } catch (err) {
        if (err.name !== 'CanceledError') setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (item) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) setOpen(true);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && active >= 0 ? `${listId}-${active}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('investments.search.placeholder')}
          className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-gray-300 border-t-indigo-600 animate-spin" />
        )}
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-white dark:bg-slate-900 shadow-xl py-1"
        >
          {error && (
            <li className="px-4 py-3 text-sm text-rose-600">
              {t('investments.search.error')}
            </li>
          )}
          {!error && !loading && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
              {t('investments.search.noResults')}
            </li>
          )}
          {!error &&
            results.map((r, i) => (
              <li
                key={r.providerSymbol}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // onMouseMove (not onMouseEnter): results appearing under a
                // resting cursor must not steal the keyboard selection.
                onMouseMove={() => active !== i && setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 cursor-pointer',
                  i === active && 'bg-[var(--muted)]',
                )}
              >
                <span className="font-semibold text-sm w-16 shrink-0">
                  {r.symbol}
                </span>
                <span className="flex-1 min-w-0 text-sm truncate text-[var(--muted-foreground)]">
                  {r.name}
                </span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                  {t(`investments.assetType.${r.assetType}`)}
                  {r.mic ? ` · ${r.mic}` : ''}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
