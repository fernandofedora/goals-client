import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../api';
import Button from './ui/button';
import SheetDialog from './ui/sheet-dialog';
import { useCurrency } from '../context/CurrencyContext';
import {
  categoriesForTxType,
  categoryOptions,
  foldText,
  ruleKeyword,
} from '../utils/categories';
import { emitTransactionsChanged } from '../utils/transactionEvents';
import { cn } from '../lib/utils';

const BATCH = 100;

/** One uncategorized transaction at a time: pick with the keyboard, move on. */
export default function CategorizeDialog({ open, onOpenChange, categories }) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const [queue, setQueue] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [lastAssigned, setLastAssigned] = useState(null);
  const [busy, setBusy] = useState(false);
  const skipped = useRef(new Set());
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data } = await api.get('/transactions/uncategorized', {
        params: { limit: BATCH + skipped.current.size },
      });
      const items = data.items.filter((tx) => !skipped.current.has(tx.id));
      setQueue(items);
      setRemaining(data.count);
      setStatus(items.length ? 'ready' : 'empty');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    skipped.current = new Set();
    setLastAssigned(null);
    load();
  }, [open, load]);

  const current = queue[0] ?? null;
  const options = useMemo(() => {
    if (!current) return [];
    const q = foldText(query.trim());
    return categoryOptions(
      categoriesForTxType(categories, current.type),
    ).filter((o) => !q || foldText(o.label).includes(q));
  }, [categories, current, query]);

  useEffect(() => {
    setActive(0);
  }, [query, current?.id]);
  useEffect(() => {
    if (status === 'ready') inputRef.current?.focus();
  }, [status, current?.id]);

  const next = () => {
    setQuery('');
    const rest = queue.slice(1);
    setQueue(rest);
    // The batch ran out: fetch the next one (or find the inbox is empty).
    if (!rest.length) load();
  };

  const assign = async (option) => {
    if (!current || !option || busy) return;
    setBusy(true);
    try {
      await api.patch('/transactions/bulk', {
        ids: [current.id],
        categoryId: option.id,
      });
      setLastAssigned({
        description: current.description,
        category: option.category,
        keyword: ruleKeyword(current.description),
      });
      setRemaining((n) => Math.max(0, n - 1));
      emitTransactionsChanged();
      next();
    } catch {
      toast.error(t('categorize.assignFailed'));
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    if (!current) return;
    skipped.current.add(current.id);
    next();
  };

  // A rule for the last assignment, applied at once to the rest of the inbox.
  const createRule = async () => {
    const { keyword, category } = lastAssigned;
    setLastAssigned(null);
    try {
      const { data: rule } = await api.post('/rules', {
        name: keyword,
        field: 'description',
        operator: 'contains',
        value: keyword,
        categoryId: category.id,
      });
      const { data } = await api.post(`/rules/${rule.id}/apply-existing`, {
        dryRun: false,
      });
      toast.success(
        t('categorize.ruleCreated', {
          count: data.updated,
          keyword,
          category: category.name,
        }),
      );
      emitTransactionsChanged();
      load();
    } catch {
      toast.error(t('categorize.ruleFailed'));
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      assign(options[active]);
    }
  };

  const where = (tx) => tx.Account?.name || tx.Card?.name || t('import.cash');

  return (
    <SheetDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('categorize.title')}
      description={
        status === 'ready'
          ? t('categorize.remaining', { count: remaining })
          : null
      }
    >
      {status === 'loading' && (
        <div className="h-48 rounded-xl bg-[var(--muted)] animate-pulse motion-reduce:animate-none" />
      )}
      {status === 'error' && (
        <p className="text-sm text-rose-700 dark:text-rose-400">
          {t('categorize.loadFailed')}
        </p>
      )}
      {status === 'empty' && (
        <div className="py-8 text-center space-y-3">
          <p className="text-base font-medium text-[var(--foreground)]">
            {skipped.current.size
              ? t('categorize.doneSkipped', { count: skipped.current.size })
              : t('categorize.done')}
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={() => onOpenChange(false)}
          >
            {t('categorize.close')}
          </Button>
        </div>
      )}

      {status === 'ready' && current && (
        <div className="space-y-4">
          {lastAssigned?.keyword && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
              <span className="text-[var(--foreground)]">
                {t('categorize.ruleOffer', {
                  keyword: lastAssigned.keyword,
                  category: lastAssigned.category.name,
                })}
              </span>
              <span className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLastAssigned(null)}
                >
                  {t('categorize.noThanks')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={createRule}
                >
                  {t('categorize.createRule')}
                </Button>
              </span>
            </div>
          )}

          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-[var(--foreground)] break-words">
                {current.description}
              </p>
              <p
                className={cn(
                  'text-base font-semibold tabular-nums whitespace-nowrap',
                  current.type === 'income'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-[var(--foreground)]',
                )}
              >
                {current.type === 'income' ? '+' : '−'}
                {money(current.amount)}
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {current.date} · {where(current)} ·{' '}
              {current.type === 'income'
                ? t('categorize.income')
                : t('categorize.expense')}
            </p>
          </div>

          <div>
            <label
              htmlFor="categorize-search"
              className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]"
            >
              {t('categorize.pick')}
            </label>
            <input
              id="categorize-search"
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="categorize-options"
              aria-activedescendant={
                options[active]
                  ? `categorize-option-${options[active].id}`
                  : undefined
              }
              placeholder={t('categorize.searchPlaceholder')}
              autoComplete="off"
              className="mt-1.5 w-full h-11 sm:h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <ul
              id="categorize-options"
              role="listbox"
              aria-label={t('categorize.pick')}
              className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] py-1"
            >
              {options.length === 0 && (
                <li className="px-3 py-3 text-sm text-[var(--muted-foreground)]">
                  {t('categorize.noMatch')}
                </li>
              )}
              {options.map((o, i) => (
                <li
                  key={o.id}
                  id={`categorize-option-${o.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => assign(o)}
                  className={cn(
                    'flex items-center gap-2 px-3 min-h-11 sm:min-h-9 text-sm cursor-pointer text-[var(--foreground)]',
                    i === active && 'bg-[var(--muted)]',
                  )}
                >
                  <span
                    className="size-2.5 rounded-full flex-shrink-0"
                    style={{ background: o.category.color }}
                  />
                  {o.label}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {t('categorize.keysHint')}
            </p>
          </div>

          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('categorize.stop')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={skip}
              disabled={busy}
            >
              {t('categorize.skip')}
            </Button>
          </div>
        </div>
      )}
    </SheetDialog>
  );
}
