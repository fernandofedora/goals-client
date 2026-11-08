import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import Input from '../components/ui/input';
import Select from '../components/ui/select';
import EditTransactionDialog from '../components/ui/edit-transaction-dialog';
import ConfirmDialog from '../components/ui/confirm-dialog';
import IconButton from '../components/ui/icon-button';
import PageHeader from '../components/ui/page-header';
import TransactionForm, { Field } from '../components/TransactionForm';
import { onTransactionsChanged } from '../utils/transactionEvents';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useCurrency } from '../context/CurrencyContext';
import { getPref, setPref } from '../utils/userStorage';
import { intlLocale } from '../utils/dateLocale';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ type }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
        type === 'expense'
          ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
      )}
    >
      {type === 'expense'
        ? t('transactions.expense')
        : t('transactions.income')}
    </span>
  );
}

export default function AddTransaction() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { money } = useCurrency();

  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(
    String(now.getMonth() + 1).padStart(2, '0'),
  );
  const [yearFilter, setYearFilter] = useState(String(now.getFullYear()));
  const [showYearAll, setShowYearAll] = useState(false);
  const monthName = new Date(0, Number(monthFilter) - 1).toLocaleString(
    intlLocale(),
    { month: 'long' },
  );

  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxData, setEditTxData] = useState({
    type: 'expense',
    description: '',
    categoryId: '',
    amount: '',
    date: '',
    paymentMethod: 'cash',
    cardId: '',
    accountId: '',
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState('');

  const expenseCats = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );
  const incomeCats = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  );

  // ── async-parallel: load all data in parallel ─────────────────────────────
  const load = useCallback(async () => {
    try {
      const [catRes, cardRes, trxRes, accRes] = await Promise.all([
        api.get('/categories'),
        api.get('/cards'),
        api.get('/transactions'),
        api.get('/accounts'),
      ]);
      setCategories(catRes.data);
      setCards(cardRes.data);
      setTransactions(trxRes.data);
      setAccounts(accRes.data);
    } catch {
      toast.error(t('addTransaction.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Rows added from the global quick-add dialog show up without a reload.
  useEffect(() => onTransactionsChanged(load), [load]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const startEditTx = (tx) => {
    setEditingTxId(tx.id);
    const resolvedMethod =
      tx.type === 'expense' && tx.AccountId
        ? 'account'
        : tx.paymentMethod || 'cash';
    setEditTxData({
      type: tx.type,
      description: tx.description || '',
      categoryId: tx.CategoryId || tx.Category?.id || '',
      amount: (tx.amount ?? '').toString(),
      date: tx.date || new Date().toISOString().slice(0, 10),
      paymentMethod: resolvedMethod,
      cardId: tx.CardId || tx.Card?.id || '',
      accountId: tx.AccountId || '',
    });
    setEditOpen(true);
    setEditError('');
  };

  const cancelEditTx = () => {
    setEditOpen(false);
    setEditingTxId(null);
  };

  const saveEditTx = async (data, patchOnly) => {
    if (patchOnly) {
      setEditTxData(data);
      return;
    }
    try {
      const amt = parseFloat(data.amount || 0);
      if (!data.description.trim()) {
        setEditError(t('addTransaction.descriptionRequired'));
        return;
      }
      if (!(amt > 0)) {
        setEditError(t('addTransaction.amountPositive'));
        return;
      }
      const payload = { ...data, amount: amt };
      if (payload.type === 'income') {
        payload.paymentMethod =
          payload.paymentMethod === 'account' ? 'account' : 'cash';
        payload.cardId = null;
      }
      if (payload.type === 'expense') {
        if (payload.paymentMethod === 'account') {
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
      }
      await api.put(`/transactions/${editingTxId}`, payload);
      cancelEditTx();
      toast.success(t('addTransaction.changesSaved'));
      load();
    } catch {
      setEditError(t('addTransaction.saveFailed'));
    }
  };

  const confirmDelete = async () => {
    if (deleteTargetId === null) return;
    try {
      await api.delete(`/transactions/${deleteTargetId}`);
      setDeleteTargetId(null);
      toast.success(t('addTransaction.transactionDeleted'));
      load();
    } catch {
      toast.error(t('addTransaction.deleteFailed'));
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const extractMonthYear = (dateStr) => {
    if (!dateStr) return { month: '', year: '' };
    const isoMatch = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateStr);
    if (isoMatch) return { year: isoMatch[1], month: isoMatch[2] };
    const usMatch = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/.exec(dateStr);
    if (usMatch)
      return { year: usMatch[3], month: String(usMatch[1]).padStart(2, '0') };
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()))
      return {
        year: String(d.getFullYear()),
        month: String(d.getMonth() + 1).padStart(2, '0'),
      };
    return { month: '', year: '' };
  };

  const filtered = useMemo(
    () =>
      transactions
        .filter((tx) => typeFilter === 'all' || tx.type === typeFilter)
        .filter(
          (tx) =>
            paymentFilter === 'all' ||
            (tx.paymentMethod || 'cash') === paymentFilter,
        )
        .filter(
          (tx) =>
            categoryFilter === '' ||
            String(tx.CategoryId || tx.Category?.id || '') ===
              String(categoryFilter),
        )
        .filter((tx) => {
          const { month, year } = extractMonthYear(tx.date);
          if (!year) return false;
          if (showYearAll) return year === yearFilter;
          return year === yearFilter && month === monthFilter;
        }),
    [
      transactions,
      typeFilter,
      paymentFilter,
      categoryFilter,
      showYearAll,
      yearFilter,
      monthFilter,
    ],
  );

  // ── Derived totals ────────────────────────────────────────────────────────
  const summaryTotals = useMemo(() => {
    const income = filtered
      .filter((tx) => tx.type === 'income')
      .reduce((a, tx) => a + Number(tx.amount), 0);
    const expense = filtered
      .filter((tx) => tx.type === 'expense')
      .reduce((a, tx) => a + Number(tx.amount), 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [pageSize, setPageSize] = useState(() => {
    const saved = Number(getPref('tx_page_size'));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
  });
  const [page, setPage] = useState(1);
  // Reset page to 1 when filters/pageSize change — derived during render (no useEffect).
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const filterKey = `${typeFilter}|${paymentFilter}|${categoryFilter}|${monthFilter}|${yearFilter}|${showYearAll}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }
  useEffect(() => {
    setPref('tx_page_size', String(pageSize));
  }, [pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      {/* Dialogs */}
      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTargetId(null);
        }}
        title={t('addTransaction.deleteTitle')}
        description={t('addTransaction.deleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      <PageHeader
        title={t('nav.transactions')}
        subtitle={t('addTransaction.pageSubtitle')}
      />

      {/* ── Add Transaction Card ──────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold tracking-tight">
            {t('addTransaction.title')}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('addTransaction.subtitle')}
          </p>
        </div>

        <TransactionForm
          categories={categories}
          cards={cards}
          accounts={accounts}
          onCreated={load}
        />
      </section>

      {/* ── Transaction History ───────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                {t('addTransaction.history')}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {t('addTransaction.shown', { count: filtered.length })}
              </p>
            </div>
            {/* Summary mini-pills */}
            <div className="flex gap-2 flex-wrap text-xs font-semibold">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                {money(summaryTotals.income)}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                {money(summaryTotals.expense)}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold',
                  summaryTotals.net >= 0
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
                )}
              >
                = {money(summaryTotals.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-[var(--border)] bg-gray-50/50 dark:bg-slate-800/30 flex flex-wrap gap-3 items-end">
          <Field label={t('addTransaction.typeFilter')}>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">{t('addTransaction.allTypes')}</option>
              <option value="expense">{t('transactions.expense')}</option>
              <option value="income">{t('transactions.income')}</option>
            </Select>
          </Field>
          <Field label={t('addTransaction.paymentFilter')}>
            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">{t('addTransaction.allMethods')}</option>
              <option value="cash">{t('transactions.cash')}</option>
              <option value="card">{t('transactions.card')}</option>
              <option value="account">{t('transactions.account')}</option>
            </Select>
          </Field>
          <Field label={t('addTransaction.categoryFilter')}>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">{t('addTransaction.allCategories')}</option>
              {categories
                .filter((c) => typeFilter === 'all' || c.type === typeFilter)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label={t('addTransaction.monthFilter')}>
            <Select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              disabled={showYearAll}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const val = String(i + 1).padStart(2, '0');
                return (
                  <option key={val} value={val}>
                    {new Date(0, i).toLocaleString(intlLocale(), {
                      month: 'long',
                    })}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label={t('addTransaction.yearFilter')}>
            <Input
              type="number"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-24"
            />
          </Field>
          <div className="flex items-center gap-2 pb-0.5">
            <input
              id="showAll"
              type="checkbox"
              className="rounded border-gray-300 dark:border-slate-600 text-indigo-600"
              checked={showYearAll}
              onChange={(e) => setShowYearAll(e.target.checked)}
            />
            <label
              htmlFor="showAll"
              className="text-sm text-gray-600 dark:text-gray-300 select-none cursor-pointer whitespace-nowrap"
            >
              {t('addTransaction.fullYear')}
            </label>
          </div>
        </div>

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <span className="text-4xl opacity-30">📭</span>
            <p className="text-sm text-gray-400">
              {t('addTransaction.emptyFor', {
                period: showYearAll ? yearFilter : `${monthName} ${yearFilter}`,
              })}
            </p>
            <p className="text-xs text-gray-300 dark:text-gray-600">
              {t('addTransaction.emptyHint')}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile card list (< sm) ─────────────────────────────── */}
            <ul className="sm:hidden divide-y divide-[var(--border)]">
              {paginated.map((tx) => {
                const methodPill = tx.Account ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400">
                    🏦 {tx.Account.name}
                  </span>
                ) : tx.paymentMethod === 'card' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400">
                    💳 {tx.Card?.name || t('addTransaction.cardFallback')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                    💵 {t('transactions.cash')}
                  </span>
                );

                return (
                  <li key={tx.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge type={tx.type} />
                        <span
                          className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate"
                          title={tx.description}
                        >
                          {tx.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                        {tx.Category && (
                          <span className="inline-flex items-center gap-1">
                            {tx.Category.color && (
                              <span
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ background: tx.Category.color }}
                              />
                            )}
                            {tx.Category.name}
                          </span>
                        )}
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            tx.type === 'expense'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400',
                          )}
                        >
                          {tx.type === 'expense' ? '−' : '+'}
                          {money(tx.amount)}
                        </span>
                        <span>{tx.date}</span>
                        {methodPill}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <IconButton
                        onClick={() => startEditTx(tx)}
                        title={t('addTransaction.editRow')}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
                        </svg>
                      </IconButton>
                      <IconButton
                        onClick={() => setDeleteTargetId(tx.id)}
                        title={t('addTransaction.deleteRow')}
                        danger
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
                        </svg>
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* ── Desktop table (≥ sm) ─────────────────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-[700px] w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-[var(--border)]">
                    {[
                      t('addTransaction.colType'),
                      t('addTransaction.colDescription'),
                      t('addTransaction.colCategory'),
                      t('addTransaction.colAmount'),
                      t('addTransaction.colDate'),
                      t('addTransaction.colMethod'),
                      '',
                    ].map((h, i) => (
                      <th
                        key={i}
                        className={cn(
                          'px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap',
                          i === 6 && 'text-right',
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginated.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Badge type={tx.type} />
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <span
                          className="truncate block font-medium text-gray-800 dark:text-gray-100"
                          title={tx.description}
                        >
                          {tx.description}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tx.Category ? (
                          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                            {tx.Category.color && (
                              <span
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ background: tx.Category.color }}
                              />
                            )}
                            {tx.Category.name}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 font-semibold tabular-nums whitespace-nowrap',
                          tx.type === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {tx.type === 'expense' ? '−' : '+'}
                        {money(tx.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">
                        {tx.date}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          if (tx.Account)
                            return (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400">
                                🏦 {tx.Account.name}
                              </span>
                            );
                          if (tx.paymentMethod === 'card')
                            return (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400">
                                💳{' '}
                                {tx.Card?.name ||
                                  t('addTransaction.cardFallback')}
                              </span>
                            );
                          return (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                              💵 {t('transactions.cash')}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            onClick={() => startEditTx(tx)}
                            title={t('addTransaction.editRow')}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
                            </svg>
                          </IconButton>
                          <IconButton
                            onClick={() => setDeleteTargetId(tx.id)}
                            title={t('addTransaction.deleteRow')}
                            danger
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
                            </svg>
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination footer ───────────────────────────────────── */}
            <div className="px-5 py-3 border-t border-[var(--border)] bg-gray-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('addTransaction.showing')}{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                  {rangeStart}–{rangeEnd}
                </span>{' '}
                {t('addTransaction.of')}{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                  {filtered.length}
                </span>
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="pageSize"
                    className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
                  >
                    {t('addTransaction.rows')}
                  </label>
                  <Select
                    id="pageSize"
                    value={String(pageSize)}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="w-20"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    aria-label={t('addTransaction.previousPage')}
                    className="inline-flex items-center justify-center size-11 sm:size-8 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <span className="px-3 text-xs tabular-nums text-gray-600 dark:text-gray-300 select-none">
                    {t('addTransaction.page')}{' '}
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {safePage}
                    </span>{' '}
                    {t('addTransaction.of')}{' '}
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {totalPages}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    aria-label={t('addTransaction.nextPage')}
                    className="inline-flex items-center justify-center size-11 sm:size-8 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Edit Dialog */}
      <EditTransactionDialog
        open={editOpen}
        onOpenChange={(o) => {
          if (!o) cancelEditTx();
        }}
        initial={editTxData}
        expenseCats={expenseCats}
        incomeCats={incomeCats}
        cards={cards}
        accounts={accounts}
        onSave={saveEditTx}
        onCancel={cancelEditTx}
        error={editError}
      />
    </div>
  );
}
