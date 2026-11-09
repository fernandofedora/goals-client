import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../api';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Select from '../components/ui/select';
import IconButton from '../components/ui/icon-button';
import ConfirmDialog from '../components/ui/confirm-dialog';
import EditTransactionDialog from '../components/ui/edit-transaction-dialog';
import { EditAccountDialog } from '../components/accounts/AccountDialogs';
import {
  AccountDelta,
  AccountTrend,
} from '../components/accounts/AccountCharts';
import { signedMoney } from '../utils/format';
import { cn } from '../lib/utils';
import { useCurrency } from '../context/CurrencyContext';
import { setAccountHidden } from '../utils/hiddenAccounts';
import { onTransactionsChanged } from '../utils/transactionEvents';

const EditIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6h18" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
  </svg>
);

const CARD_CLASS =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm';

function BackLink() {
  const { t } = useTranslation();
  return (
    <Link
      to="/plans/accounts"
      className="inline-flex items-center gap-1 min-h-11 sm:min-h-0 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <svg
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
        <path d="m15 18-6-6 6-6" />
      </svg>
      {t('accountsPage.title')}
    </Link>
  );
}

export default function AccountDetail() {
  const { kind, id: idParam } = useParams();
  const id = Number(idParam);
  const isCard = kind === 'card';
  const filter = isCard ? 'cardId' : 'accountId';
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { money } = useCurrency();

  const [item, setItem] = useState(undefined); // undefined = loading, null = missing
  const [row, setRow] = useState(null);
  const [categories, setCategories] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [failed, setFailed] = useState(false);

  const [txItems, setTxItems] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState(null);
  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxData, setEditTxData] = useState({
    type: 'expense',
    description: '',
    categoryId: '',
    amount: '',
    date: '',
    paymentMethod: 'cash',
  });
  const [editError, setEditError] = useState('');

  const loadAccount = useCallback(async () => {
    setFailed(false);
    try {
      const base = isCard ? '/cards' : '/accounts';
      const [listRes, histRes, catRes, allTx] = await Promise.all([
        api.get(base),
        api.get(`${base}/history`, { params: { months: 12 } }),
        api.get('/categories'),
        api.get('/transactions', { params: { [filter]: id } }),
      ]);
      setItem(listRes.data.find((x) => x.id === id) ?? null);
      setRow(
        histRes.data.find((r) => (isCard ? r.cardId : r.accountId) === id) ??
          null,
      );
      setCategories(catRes.data);
      const sum = (type) =>
        allTx.data
          .filter((x) => x.type === type)
          .reduce((a, b) => a + Number(b.amount), 0);
      setTotals({ income: sum('income'), expense: sum('expense') });
    } catch {
      setFailed(true);
    }
  }, [isCard, filter, id]);

  const loadPage = useCallback(async () => {
    try {
      const res = await api.get('/transactions', {
        params: { [filter]: id, page, limit, ...(query ? { q: query } : {}) },
      });
      setTxItems(res.data.items || []);
      setTxTotal(res.data.total || 0);
    } catch {
      setFailed(true);
    }
  }, [filter, id, page, limit, query]);

  const refresh = useCallback(() => {
    loadAccount();
    loadPage();
  }, [loadAccount, loadPage]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);
  useEffect(() => {
    loadPage();
  }, [loadPage]);
  useEffect(() => onTransactionsChanged(refresh), [refresh]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(txTotal / limit));
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const incomeCats = categories.filter((c) => c.type === 'income');

  const startEditTx = (tx) => {
    setEditingTxId(tx.id);
    setEditTxData({
      type: tx.type,
      description: tx.description || '',
      categoryId: tx.CategoryId || tx.Category?.id || '',
      amount: (tx.amount ?? '').toString(),
      date: tx.date,
      paymentMethod: tx.paymentMethod || 'cash',
    });
    setEditError('');
  };

  const saveEditTx = async (data, patchOnly) => {
    if (patchOnly) {
      setEditTxData(data);
      return;
    }
    const amount = parseFloat(data.amount || 0);
    if (!data.description.trim()) {
      setEditError(t('accountsPage.descriptionRequired'));
      return;
    }
    if (!(amount > 0)) {
      setEditError(t('accountsPage.amountPositive'));
      return;
    }
    try {
      await api.put(`/transactions/${editingTxId}`, {
        ...data,
        amount,
        paymentMethod: data.type === 'income' ? 'cash' : data.paymentMethod,
        [filter]: id,
      });
      setEditingTxId(null);
      refresh();
      toast.success(t('accountsPage.changesSaved'));
    } catch {
      toast.error(t('accountsPage.txSaveFailed'));
    }
  };

  const confirmDeleteTx = async () => {
    const target = deleteTxId;
    setDeleteTxId(null);
    try {
      await api.delete(`/transactions/${target}`);
      refresh();
      toast.success(t('accountsPage.txDeleted'));
    } catch {
      toast.error(t('accountsPage.txDeleteFailed'));
    }
  };

  const confirmHide = async () => {
    setHideOpen(false);
    try {
      await setAccountHidden(kind, id, true);
      navigate('/plans/accounts');
    } catch {
      toast.error(
        isCard
          ? t('accountsPage.cardUpdateFailed')
          : t('accountsPage.accountUpdateFailed'),
      );
    }
  };

  if (failed && item === undefined) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <BackLink />
        <div
          className={cn(
            CARD_CLASS,
            'p-5 flex items-center justify-between gap-3 flex-wrap',
          )}
        >
          <p className="text-sm text-[var(--muted-foreground)]">
            {t('accountsPage.historyFailed')}
          </p>
          <Button variant="outline" onClick={refresh}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (item === undefined) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <BackLink />
        <div className="h-80 rounded-2xl bg-[var(--muted)] animate-pulse" />
      </div>
    );
  }

  if (item === null || item.isHidden) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <BackLink />
        <div className={cn(CARD_CLASS, 'p-10 text-center')}>
          <p className="text-sm font-medium text-[var(--foreground)]">
            {t('accountsPage.notInList')}
          </p>
        </div>
      </div>
    );
  }

  const opening = isCard ? 0 : Number(item.initialBalance || 0);
  const balance = opening + totals.income - totals.expense;
  const summaryRows = [
    ...(isCard ? [] : [[t('accountsPage.opening'), opening]]),
    [t('accountsPage.income'), totals.income],
    [t('accountsPage.expenses'), totals.expense],
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      <BackLink />

      <header className="flex items-start justify-between gap-x-4 gap-y-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="size-3.5 rounded-full flex-shrink-0"
            style={{ background: item.color }}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] flex items-center gap-2 flex-wrap">
              {item.name}
              {item.isExcludedFromTotals && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                  {t('accountsPage.isolated')}
                </span>
              )}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {isCard
                ? `${t('accountsPage.typeCard')} · •••• ${item.last4}`
                : t('accountsPage.typeBank')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            {t('accountsPage.edit')}
          </Button>
          <Button variant="outline" onClick={() => setHideOpen(true)}>
            {t('accountsPage.hide')}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <section
          className={cn(CARD_CLASS, 'p-5 flex flex-col gap-1.5 min-w-0')}
        >
          <p className="text-[13px] font-medium text-[var(--muted-foreground)]">
            {isCard
              ? t('accountsPage.spentThisMonth')
              : t('accountsPage.currentBalance')}
          </p>
          <p className="text-3xl sm:text-4xl font-bold tabular-nums text-[var(--foreground)]">
            {isCard
              ? money(row?.spentThisMonth ?? 0)
              : signedMoney(row?.balance ?? balance, money)}
          </p>
          {row && <AccountDelta value={row.delta} spending={isCard} />}
          {row && (
            <div className="mt-2">
              <AccountTrend
                kind={kind}
                name={item.name}
                history={row.history}
                large
              />
            </div>
          )}
        </section>

        <section className={cn(CARD_CLASS, 'p-5')}>
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-1">
            {t('accountsPage.summaryTitle')}
          </h2>
          <dl className="text-sm">
            {summaryRows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between h-11 border-b border-[var(--border)]"
              >
                <dt className="text-[var(--muted-foreground)]">{label}</dt>
                <dd className="font-medium tabular-nums text-[var(--foreground)]">
                  {money(value)}
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between h-12">
              <dt className="font-semibold text-[var(--foreground)]">
                {t('accountsPage.balance')}
              </dt>
              <dd className="text-base font-bold tabular-nums text-[var(--foreground)]">
                {signedMoney(balance, money)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={cn(CARD_CLASS, 'overflow-hidden')}>
        <div className="px-4 sm:px-5 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {t('accountsPage.movements')}{' '}
            <span className="text-[13px] font-normal text-[var(--muted-foreground)]">
              {txTotal}
            </span>
          </h2>
          <div className="w-full sm:w-64">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('accountsPage.searchMovements')}
              aria-label={t('accountsPage.searchMovements')}
            />
          </div>
        </div>

        {txItems.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {query
                ? t('accountsPage.noSearchResults')
                : t('accountsPage.noMovements')}
            </p>
            {!query && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('accountsPage.noMovementsHint')}
              </p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {txItems.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center gap-3 sm:gap-4 pl-4 sm:pl-5 pr-2 sm:pr-3 py-2 min-h-14"
              >
                <span className="hidden sm:block w-24 flex-shrink-0 text-[13px] tabular-nums text-[var(--muted-foreground)]">
                  {tx.date}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {tx.description}
                  </p>
                  <p className="sm:hidden text-xs text-[var(--muted-foreground)] truncate">
                    {tx.date}
                    {tx.Category?.name ? ` · ${tx.Category.name}` : ''}
                  </p>
                </div>
                <span className="hidden sm:block w-36 flex-shrink-0 text-[13px] text-[var(--muted-foreground)] truncate">
                  {tx.Category?.name || ''}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold tabular-nums whitespace-nowrap sm:w-28 sm:text-right',
                    tx.type === 'income'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-[var(--foreground)]',
                  )}
                >
                  {tx.type === 'expense' ? '−' : '+'}
                  {money(tx.amount)}
                </span>
                <div className="flex flex-shrink-0">
                  <IconButton
                    onClick={() => startEditTx(tx)}
                    title={t('accountsPage.edit')}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => setDeleteTxId(tx.id)}
                    title={t('common.delete')}
                    danger
                  >
                    <TrashIcon />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        {txTotal > 0 && (
          <div className="px-4 sm:px-5 py-3 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <Select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {t('accountsPage.perPage', { n })}
                  </option>
                ))}
              </Select>
              <span className="text-[var(--muted-foreground)]">
                {t('accountsPage.page', { page, total: totalPages })}
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t('savings.prev')}
              >
                ‹
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t('savings.next')}
              >
                ›
              </Button>
            </div>
          </div>
        )}
      </section>

      <EditAccountDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        kind={kind}
        item={item}
        onSaved={refresh}
      />
      <ConfirmDialog
        open={hideOpen}
        onOpenChange={setHideOpen}
        title={t('accountsPage.hide')}
        description={
          isCard
            ? t('accountsPage.confirmHideCard')
            : t('accountsPage.confirmHideBank')
        }
        confirmText={t('accountsPage.hide')}
        cancelText={t('accountsPage.cancel')}
        onConfirm={confirmHide}
        onCancel={() => setHideOpen(false)}
      />
      <ConfirmDialog
        open={deleteTxId !== null}
        onOpenChange={(o) => !o && setDeleteTxId(null)}
        title={t('addTransaction.deleteTitle')}
        description={t('addTransaction.deleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('accountsPage.cancel')}
        onConfirm={confirmDeleteTx}
        onCancel={() => setDeleteTxId(null)}
      />
      <EditTransactionDialog
        open={editingTxId !== null}
        onOpenChange={(o) => !o && setEditingTxId(null)}
        initial={editTxData}
        expenseCats={expenseCats}
        incomeCats={incomeCats}
        cards={[]}
        onSave={saveEditTx}
        onCancel={() => setEditingTxId(null)}
        error={editError}
      />
    </div>
  );
}
