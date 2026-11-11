import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../api';
import Button from './ui/button';
import Input from './ui/input';
import Select from './ui/select';
import ConfirmDialog from './ui/confirm-dialog';
import EditTransactionDialog from './ui/edit-transaction-dialog';
import DateInput from './DateInput';
import { Field } from './TransactionForm';
import { cn } from '../lib/utils';
import { useCurrency } from '../context/CurrencyContext';
import { downloadCsv } from '../utils/csv';
import { intlLocale } from '../utils/dateLocale';
import { signedMoney } from '../utils/format';
import { onTransactionsChanged } from '../utils/transactionEvents';
import { getPref, setPref } from '../utils/userStorage';
import { categoryOptions } from '../utils/categories';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const YEAR_VALUE = 'year';

const EMPTY_FILTERS = {
  q: '',
  type: '',
  paymentMethod: '',
  categoryId: '',
  accountId: '',
  cardId: '',
  from: '',
  to: '',
  minAmount: '',
  maxAmount: '',
};

const EMPTY_EDIT = {
  type: 'expense',
  description: '',
  categoryId: '',
  amount: '',
  date: '',
  paymentMethod: 'cash',
  cardId: '',
  accountId: '',
};

const periodRange = (month, year) => {
  if (month === YEAR_VALUE)
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  const last = new Date(Number(year), Number(month), 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(last).padStart(2, '0')}`,
  };
};

const dayLabel = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(intlLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const methodLabel = (tx, t) =>
  tx.Account?.name ||
  tx.Card?.name ||
  (tx.paymentMethod === 'card'
    ? t('addTransaction.cardFallback')
    : t('transactions.cash'));

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]';

/** "…" button with a small popover; fixed position so the list never clips it. */
function RowMenu({ label, items }) {
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!pos) return undefined;
    menuRef.current?.querySelector('button')?.focus();
    const close = () => setPos(null);
    const onDown = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        close();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) {
      setPos(null);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const height = items.length * 44 + 12;
    const fitsBelow = rect.bottom + height < window.innerHeight;
    setPos({
      top: fitsBelow ? rect.bottom + 4 : rect.top - height - 4,
      right: window.innerWidth - rect.right,
    });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={Boolean(pos)}
        className={cn(
          'size-11 sm:size-8 flex-shrink-0 inline-flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors',
          FOCUS_RING,
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {pos && (
        <div
          ref={menuRef}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-40 w-40 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setPos(null);
                item.onClick();
              }}
              className={cn(
                'flex items-center w-[calc(100%-8px)] mx-1 min-h-11 sm:min-h-9 px-3 rounded-md text-sm text-left hover:bg-[var(--muted)]',
                FOCUS_RING,
                item.danger
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-[var(--foreground)]',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function TransactionHistory({
  categories,
  cards,
  accounts,
  refreshKey,
}) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const now = new Date();

  const [month, setMonth] = useState(
    String(now.getMonth() + 1).padStart(2, '0'),
  );
  const [year, setYear] = useState(String(now.getFullYear()));
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = Number(getPref('tx_page_size'));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
  });

  const [selected, setSelected] = useState(() => new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxData, setEditTxData] = useState(EMPTY_EDIT);
  const [editError, setEditError] = useState('');

  const period = useMemo(() => periodRange(month, year), [month, year]);
  const params = useMemo(() => {
    const active = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== ''),
    );
    // Explicit dates replace the month selector.
    const range =
      filters.from || filters.to ? {} : { from: period.from, to: period.to };
    return { ...active, ...range };
  }, [filters, period]);

  const requestId = useRef(0);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setFailed(false);
    try {
      const res = await api.get('/transactions', {
        params: { ...params, page, limit: pageSize },
      });
      if (id === requestId.current) setData(res.data);
    } catch {
      if (id === requestId.current) setFailed(true);
    }
  }, [params, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load, refreshKey]);
  useEffect(() => onTransactionsChanged(load), [load]);

  const resetView = () => {
    setPage(1);
    setSelected(new Set());
  };
  const patchFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    resetView();
  };
  const onField = (key) => (e) => patchFilters({ [key]: e.target.value });

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totals = data?.totals ?? { income: 0, expense: 0 };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const days = useMemo(() => {
    const groups = [];
    for (const tx of items) {
      const last = groups[groups.length - 1];
      if (last?.date === tx.date) last.rows.push(tx);
      else groups.push({ date: tx.date, rows: [tx] });
    }
    return groups;
  }, [items]);

  const nameOf = (list, id) =>
    list.find((x) => String(x.id) === String(id))?.name ?? '';
  const methodNames = {
    cash: t('transactions.cash'),
    card: t('transactions.card'),
    account: t('transactions.account'),
  };
  const typeNames = {
    expense: t('transactions.expense'),
    income: t('transactions.income'),
  };
  const chips = [
    ['q', filters.q],
    ['type', typeNames[filters.type]],
    ['paymentMethod', methodNames[filters.paymentMethod]],
    ['categoryId', nameOf(categories, filters.categoryId)],
    ['accountId', nameOf(accounts, filters.accountId)],
    ['cardId', nameOf(cards, filters.cardId)],
    ['from', filters.from && `${t('addTransaction.from')}: ${filters.from}`],
    ['to', filters.to && `${t('addTransaction.to')}: ${filters.to}`],
    [
      'minAmount',
      filters.minAmount &&
        `${t('addTransaction.minAmount')}: ${filters.minAmount}`,
    ],
    [
      'maxAmount',
      filters.maxAmount &&
        `${t('addTransaction.maxAmount')}: ${filters.maxAmount}`,
    ],
  ].filter(([key, label]) => filters[key] !== '' && label);

  const selectedRows = items.filter((tx) => selected.has(tx.id));
  const selectedTypes = new Set(selectedRows.map((tx) => tx.type));
  const bulkCategories =
    selectedTypes.size === 1
      ? categories.filter((c) => selectedTypes.has(c.type))
      : categories;
  const allOnPage =
    items.length > 0 && items.every((tx) => selected.has(tx.id));

  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected(allOnPage ? new Set() : new Set(items.map((tx) => tx.id)));

  const startEditTx = (tx) => {
    setEditingTxId(tx.id);
    setEditTxData({
      type: tx.type,
      description: tx.description || '',
      categoryId: tx.CategoryId || tx.Category?.id || '',
      amount: (tx.amount ?? '').toString(),
      date: tx.date,
      paymentMethod:
        tx.type === 'expense' && tx.AccountId
          ? 'account'
          : tx.paymentMethod || 'cash',
      cardId: tx.CardId || tx.Card?.id || '',
      accountId: tx.AccountId || '',
    });
    setEditError('');
  };

  const saveEditTx = async (draft, patchOnly) => {
    if (patchOnly) {
      setEditTxData(draft);
      return;
    }
    const amount = parseFloat(draft.amount || 0);
    if (!draft.description.trim()) {
      setEditError(t('addTransaction.descriptionRequired'));
      return;
    }
    if (!(amount > 0)) {
      setEditError(t('addTransaction.amountPositive'));
      return;
    }
    const payload = { ...draft, amount };
    if (payload.type === 'income') {
      payload.paymentMethod =
        payload.paymentMethod === 'account' ? 'account' : 'cash';
      payload.cardId = null;
    } else if (payload.paymentMethod === 'account') {
      if (!payload.accountId) {
        setEditError(t('addTransaction.selectAccountError'));
        return;
      }
      payload.cardId = null;
    } else if (payload.paymentMethod === 'card') {
      if (!payload.cardId) {
        setEditError(t('addTransaction.selectCardError'));
        return;
      }
      payload.accountId = null;
    } else {
      payload.cardId = null;
      payload.accountId = null;
    }
    try {
      await api.put(`/transactions/${editingTxId}`, payload);
      setEditingTxId(null);
      toast.success(t('addTransaction.changesSaved'));
      load();
    } catch {
      setEditError(t('addTransaction.saveFailed'));
    }
  };

  const duplicate = async (tx) => {
    try {
      await api.post('/transactions', {
        type: tx.type,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        paymentMethod: tx.paymentMethod,
        categoryId: tx.CategoryId || null,
        cardId: tx.CardId || null,
        accountId: tx.AccountId || null,
      });
      toast.success(t('addTransaction.duplicated'));
      load();
    } catch {
      toast.error(t('addTransaction.duplicateFailed'));
    }
  };

  const confirmDelete = async () => {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await api.delete(`/transactions/${id}`);
      toast.success(t('addTransaction.transactionDeleted'));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      load();
    } catch {
      toast.error(t('addTransaction.deleteFailed'));
    }
  };

  const applyBulkCategory = async () => {
    try {
      const res = await api.patch('/transactions/bulk', {
        ids: [...selected],
        categoryId: Number(bulkCategory),
      });
      toast.success(
        t('addTransaction.bulkUpdated', { count: res.data.updated }),
      );
      setBulkCategory('');
      setSelected(new Set());
      load();
    } catch {
      toast.error(t('addTransaction.bulkFailed'));
    }
  };

  const confirmBulkDelete = async () => {
    setBulkDeleteOpen(false);
    try {
      const res = await api.post('/transactions/bulk-delete', {
        ids: [...selected],
      });
      toast.success(
        t('addTransaction.bulkDeleted', { count: res.data.deleted }),
      );
      setSelected(new Set());
      if (page > 1 && selectedRows.length === items.length) {
        setPage((p) => p - 1);
      } else {
        load();
      }
    } catch {
      toast.error(t('addTransaction.bulkFailed'));
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get('/transactions', { params });
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`transacciones-${stamp}.csv`, [
        [
          t('addTransaction.colDate'),
          t('addTransaction.colType'),
          t('addTransaction.colDescription'),
          t('addTransaction.colCategory'),
          t('addTransaction.colAccount'),
          t('addTransaction.colAmount'),
        ],
        ...res.data.map((tx) => [
          tx.date,
          typeNames[tx.type],
          tx.description,
          tx.Category?.name ?? '',
          methodLabel(tx, t),
          Number(tx.amount).toFixed(2),
        ]),
      ]);
    } catch {
      toast.error(t('addTransaction.exportFailed'));
    }
  };

  const currentYear = now.getFullYear();
  const usesCustomDates = Boolean(filters.from || filters.to);

  return (
    <section className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="px-4 sm:px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            {t('addTransaction.history')}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {t('addTransaction.shown', { count: total })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold tabular-nums">
          <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400">
            {t('transactions.income')} {money(totals.income)}
          </span>
          <span className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
            {t('transactions.expense')} {money(totals.expense)}
          </span>
          <span className="px-2.5 py-1.5 rounded-lg bg-[var(--muted)] text-[var(--foreground)] font-bold">
            = {signedMoney(totals.income - totals.expense, money)}
          </span>
          <Button variant="outline" onClick={exportCsv} disabled={total === 0}>
            {t('addTransaction.exportCsv')}
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3 border-b border-[var(--border)] space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="w-full sm:w-64 sm:flex-none">
            <Input
              type="search"
              value={filters.q}
              onChange={onField('q')}
              placeholder={t('addTransaction.search')}
              aria-label={t('addTransaction.search')}
            />
          </div>
          <Select
            value={month}
            disabled={usesCustomDates}
            onChange={(e) => {
              setMonth(e.target.value);
              resetView();
            }}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const value = String(i + 1).padStart(2, '0');
              return (
                <option key={value} value={value}>
                  {new Date(0, i).toLocaleString(intlLocale(), {
                    month: 'long',
                  })}
                </option>
              );
            })}
            <option value={YEAR_VALUE}>{t('addTransaction.fullYear')}</option>
          </Select>
          <Select
            value={year}
            disabled={usesCustomDates}
            onChange={(e) => {
              setYear(e.target.value);
              resetView();
            }}
          >
            {Array.from({ length: 7 }, (_, i) => String(currentYear - i)).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ),
            )}
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            {t('addTransaction.filters')}
            {chips.length > 0 ? ` (${chips.length})` : ''}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label={t('addTransaction.typeFilter')}>
              <Select
                className="w-full"
                value={filters.type}
                onChange={onField('type')}
              >
                <option value="">{t('addTransaction.allTypes')}</option>
                <option value="expense">{typeNames.expense}</option>
                <option value="income">{typeNames.income}</option>
              </Select>
            </Field>
            <Field label={t('addTransaction.paymentFilter')}>
              <Select
                className="w-full"
                value={filters.paymentMethod}
                onChange={onField('paymentMethod')}
              >
                <option value="">{t('addTransaction.allMethods')}</option>
                {Object.entries(methodNames).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('addTransaction.categoryFilter')}>
              <Select
                className="w-full"
                value={filters.categoryId}
                onChange={onField('categoryId')}
              >
                <option value="">{t('addTransaction.allCategories')}</option>
                {categoryOptions(categories).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('addTransaction.accountFilter')}>
              <Select
                className="w-full"
                value={filters.accountId}
                onChange={onField('accountId')}
              >
                <option value="">{t('addTransaction.allAccounts')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('addTransaction.cardFilter')}>
              <Select
                className="w-full"
                value={filters.cardId}
                onChange={onField('cardId')}
              >
                <option value="">{t('addTransaction.allCards')}</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('addTransaction.from')} htmlFor="tx-from">
              <DateInput
                id="tx-from"
                value={filters.from}
                onChange={onField('from')}
              />
            </Field>
            <Field label={t('addTransaction.to')} htmlFor="tx-to">
              <DateInput
                id="tx-to"
                value={filters.to}
                onChange={onField('to')}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('addTransaction.minAmount')} htmlFor="tx-min">
                <Input
                  id="tx-min"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={filters.minAmount}
                  onChange={onField('minAmount')}
                />
              </Field>
              <Field label={t('addTransaction.maxAmount')} htmlFor="tx-max">
                <Input
                  id="tx-max"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={filters.maxAmount}
                  onChange={onField('maxAmount')}
                />
              </Field>
            </div>
          </div>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => patchFilters({ [key]: '' })}
                aria-label={t('addTransaction.removeFilter', { label })}
                className={cn(
                  'inline-flex items-center gap-1.5 min-h-11 sm:min-h-7 px-2.5 rounded-full text-xs font-medium bg-[var(--nav-active)] text-[var(--nav-active-foreground)]',
                  FOCUS_RING,
                )}
              >
                {label}
                <span aria-hidden="true">×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => patchFilters(EMPTY_FILTERS)}
              className={cn(
                'min-h-11 sm:min-h-7 px-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded',
                FOCUS_RING,
              )}
            >
              {t('addTransaction.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-14 z-20 px-4 sm:px-5 py-2.5 border-b border-[var(--border)] bg-[var(--nav-active)] flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[var(--nav-active-foreground)] mr-1">
            {t('addTransaction.selected', { count: selected.size })}
          </span>
          <Select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
          >
            <option value="">{t('addTransaction.changeCategory')}</option>
            {categoryOptions(bulkCategories).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            disabled={!bulkCategory}
            onClick={applyBulkCategory}
          >
            {t('addTransaction.apply')}
          </Button>
          <Button variant="outline" onClick={() => setBulkDeleteOpen(true)}>
            {t('common.delete')}
          </Button>
          <Button variant="subtle" onClick={() => setSelected(new Set())}>
            {t('addTransaction.clearSelection')}
          </Button>
        </div>
      )}

      {failed && !data ? (
        <div className="py-12 px-4 text-center space-y-3">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {t('addTransaction.listFailed')}
          </p>
          <Button variant="outline" onClick={load}>
            {t('common.retry')}
          </Button>
        </div>
      ) : !data ? (
        <div className="p-5 space-y-3" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-[var(--muted)] animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {chips.length > 0
              ? t('addTransaction.noMatches')
              : t('addTransaction.emptyFor', {
                  period:
                    month === YEAR_VALUE
                      ? year
                      : `${new Date(0, Number(month) - 1).toLocaleString(
                          intlLocale(),
                          { month: 'long' },
                        )} ${year}`,
                })}
          </p>
          {chips.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {t('addTransaction.emptyHint')}
            </p>
          )}
        </div>
      ) : (
        <>
          <label className="flex items-center gap-3 px-4 sm:px-5 min-h-11 sm:min-h-9 text-xs font-medium text-[var(--muted-foreground)] border-b border-[var(--border)] cursor-pointer">
            <input
              type="checkbox"
              checked={allOnPage}
              onChange={togglePage}
              className="size-4 accent-[var(--primary)]"
            />
            {t('addTransaction.selectPage')}
          </label>
          {days.map((day) => {
            const net = data.dayTotals?.[day.date] ?? 0;
            return (
              <div key={day.date}>
                <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-1.5 bg-[var(--muted)] text-xs font-semibold text-[var(--muted-foreground)]">
                  <span className="capitalize">{dayLabel(day.date)}</span>
                  <span className="tabular-nums">
                    {net > 0 ? '+' : ''}
                    {signedMoney(net, money)}
                  </span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {day.rows.map((tx) => (
                    <li
                      key={tx.id}
                      className={cn(
                        'flex items-center gap-2 sm:gap-3 pl-1.5 sm:pl-5 pr-1 sm:pr-3 min-h-14',
                        selected.has(tx.id) && 'bg-[var(--nav-active)]/40',
                      )}
                    >
                      <label className="size-11 sm:size-auto flex-shrink-0 flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.has(tx.id)}
                          onChange={() => toggleRow(tx.id)}
                          aria-label={t('addTransaction.selectRow', {
                            name: tx.description,
                          })}
                          className="size-4 accent-[var(--primary)]"
                        />
                      </label>
                      <div className="flex-1 min-w-0 py-2">
                        <p
                          className="text-sm font-medium text-[var(--foreground)] truncate"
                          title={tx.description}
                        >
                          {tx.description}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] min-w-0">
                          {tx.Category && (
                            <>
                              <span
                                className="size-2 rounded-full flex-shrink-0"
                                style={{ background: tx.Category.color }}
                              />
                              <span className="truncate flex-shrink-0 max-w-[55%]">
                                {tx.Category.name}
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span className="truncate">{methodLabel(tx, t)}</span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums whitespace-nowrap',
                          tx.type === 'income'
                            ? 'px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'text-[var(--foreground)]',
                        )}
                      >
                        {tx.type === 'expense' ? '−' : '+'}
                        {money(tx.amount)}
                      </span>
                      <RowMenu
                        label={t('addTransaction.rowActions', {
                          name: tx.description,
                        })}
                        items={[
                          {
                            label: t('addTransaction.editRow'),
                            onClick: () => startEditTx(tx),
                          },
                          {
                            label: t('addTransaction.duplicate'),
                            onClick: () => duplicate(tx),
                          },
                          {
                            label: t('addTransaction.deleteRow'),
                            danger: true,
                            onClick: () => setDeleteTargetId(tx.id),
                          },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="px-4 sm:px-5 py-3 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap text-xs text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2">
              <span className="tabular-nums">
                {rangeStart}–{rangeEnd} {t('addTransaction.of')} {total}
              </span>
              <Select
                value={String(pageSize)}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  setPageSize(size);
                  setPref('tx_page_size', String(size));
                  resetView();
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <span>{t('addTransaction.rows')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                disabled={page <= 1}
                aria-label={t('addTransaction.previousPage')}
                onClick={() => {
                  setPage((p) => p - 1);
                  setSelected(new Set());
                }}
              >
                ‹
              </Button>
              <span className="px-2 tabular-nums">
                {t('addTransaction.page')} {page} {t('addTransaction.of')}{' '}
                {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                aria-label={t('addTransaction.nextPage')}
                onClick={() => {
                  setPage((p) => p + 1);
                  setSelected(new Set());
                }}
              >
                ›
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(o) => !o && setDeleteTargetId(null)}
        title={t('addTransaction.deleteTitle')}
        description={t('addTransaction.deleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t('addTransaction.bulkDeleteTitle', { count: selected.size })}
        description={t('addTransaction.bulkDeleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
      <EditTransactionDialog
        open={editingTxId !== null}
        onOpenChange={(o) => !o && setEditingTxId(null)}
        initial={editTxData}
        expenseCats={categories.filter((c) => c.type === 'expense')}
        incomeCats={categories.filter((c) => c.type === 'income')}
        cards={cards}
        accounts={accounts}
        onSave={saveEditTx}
        onCancel={() => setEditingTxId(null)}
        error={editError}
      />
    </section>
  );
}
