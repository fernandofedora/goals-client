import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import Button from '../components/ui/button';
import PageHeader from '../components/ui/page-header';
import NavIcon from '../components/NavIcon';
import { AddAccountDialog } from '../components/accounts/AccountDialogs';
import {
  AccountDelta,
  AccountTrend,
} from '../components/accounts/AccountCharts';
import { signedMoney } from '../utils/format';
import { useCurrency } from '../context/CurrencyContext';
import useHiddenAccounts from '../hooks/useHiddenAccounts';
import { onTransactionsChanged } from '../utils/transactionEvents';

function OverviewCard({ kind, item, row }) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const isCard = kind === 'card';
  return (
    <Link
      to={`/plans/accounts/${kind}/${item.id}`}
      className="group flex flex-col gap-2 p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm hover:border-[var(--ring)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="size-2.5 rounded-full flex-shrink-0"
          style={{ background: item.color }}
        />
        <h3 className="flex-1 min-w-0 text-sm font-semibold text-[var(--foreground)] truncate">
          {item.name}
        </h3>
        {item.isExcludedFromTotals && (
          <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
            {t('accountsPage.isolated')}
          </span>
        )}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-shrink-0 text-[var(--muted-foreground)] group-hover:translate-x-0.5 transition-transform"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
      {isCard && (
        <p className="text-xs text-[var(--muted-foreground)]">
          •••• {item.last4} · {t('accountsPage.spentThisMonth')}
        </p>
      )}
      {row ? (
        <>
          <p className="text-2xl font-bold tabular-nums text-[var(--foreground)]">
            {isCard
              ? money(row.spentThisMonth)
              : signedMoney(row.balance, money)}
          </p>
          <AccountDelta value={row.delta} spending={isCard} />
          <AccountTrend kind={kind} name={item.name} history={row.history} />
        </>
      ) : (
        <div className="h-[104px] rounded-lg bg-[var(--muted)] animate-pulse" />
      )}
    </Link>
  );
}

function Section({ title, kind, items, rows }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-[var(--foreground)]">
        {title}{' '}
        <span className="text-[13px] font-normal text-[var(--muted-foreground)]">
          {items.length}
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <OverviewCard
            key={item.id}
            kind={kind}
            item={item}
            row={rows?.get(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

export default function Accounts() {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const { isHidden, restore } = useHiddenAccounts();

  const [cards, setCards] = useState(null);
  const [bankAccounts, setBankAccounts] = useState(null);
  const [bankRows, setBankRows] = useState(null);
  const [cardRows, setCardRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [dialog, setDialog] = useState(null); // null | 'bank' | 'link'

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [cardsRes, accRes, bankHist, cardHist] = await Promise.all([
        api.get('/cards'),
        api.get('/accounts'),
        api.get('/accounts/history', { params: { months: 12 } }),
        api.get('/cards/history', { params: { months: 12 } }),
      ]);
      setCards(cardsRes.data);
      setBankAccounts(accRes.data);
      setBankRows(new Map(bankHist.data.map((r) => [r.accountId, r])));
      setCardRows(new Map(cardHist.data.map((r) => [r.cardId, r])));
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => onTransactionsChanged(load), [load]);

  const visibleBanks = useMemo(
    () => (bankAccounts || []).filter((a) => !isHidden('bank', a.id)),
    [bankAccounts, isHidden],
  );
  const visibleCards = useMemo(
    () => (cards || []).filter((c) => !isHidden('card', c.id)),
    [cards, isHidden],
  );
  const hiddenItems = useMemo(
    () => [
      ...(bankAccounts || [])
        .filter((a) => isHidden('bank', a.id))
        .map((a) => ({ ...a, kind: 'bank' })),
      ...(cards || [])
        .filter((c) => isHidden('card', c.id))
        .map((c) => ({ ...c, kind: 'card' })),
    ],
    [bankAccounts, cards, isHidden],
  );

  // Same rule as the Dashboard's net worth: every integrated account counts.
  const integrated = (bankAccounts || []).filter(
    (a) => !a.isExcludedFromTotals,
  );
  const isolatedCount = (bankAccounts || []).length - integrated.length;
  const total = integrated.reduce(
    (sum, a) => sum + (bankRows?.get(a.id)?.balance || 0),
    0,
  );

  const loaded = cards !== null && bankAccounts !== null;
  const isEmpty = loaded && visibleBanks.length + visibleCards.length === 0;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <PageHeader
        title={t('accountsPage.title')}
        subtitle={t('accountsPage.overviewSubtitle')}
        actions={
          <Button variant="outline" onClick={() => setDialog('bank')}>
            {t('accountsPage.addAccount')}
          </Button>
        }
      />

      {failed && !loaded && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t('accountsPage.historyFailed')}
          </p>
          <Button variant="outline" onClick={load}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!loaded && !failed && (
        <div className="h-40 rounded-2xl bg-[var(--muted)] animate-pulse" />
      )}

      {isEmpty && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {t('accountsPage.noAccounts1')}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {t('accountsPage.noAccounts2')}
          </p>
        </div>
      )}

      {loaded && integrated.length > 0 && (
        <div>
          <p className="text-[13px] font-medium text-[var(--muted-foreground)]">
            {t('accountsPage.totalBalance')}
          </p>
          <p className="text-4xl font-bold tabular-nums text-[var(--foreground)]">
            {signedMoney(total, money)}
          </p>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            {t('accountsPage.totalNote', { count: integrated.length })}
            {isolatedCount > 0 &&
              ` · ${t('accountsPage.isolatedNote', { count: isolatedCount })}`}
          </p>
        </div>
      )}

      <Section
        title={t('accountsPage.banksSection')}
        kind="bank"
        items={visibleBanks}
        rows={bankRows}
      />
      <Section
        title={t('accountsPage.cardsSection')}
        kind="card"
        items={visibleCards}
        rows={cardRows}
      />

      {hiddenItems.length > 0 && (
        <button
          type="button"
          onClick={() => setDialog('link')}
          className="inline-flex items-center gap-1.5 min-h-11 text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <NavIcon name="eyeOff" size={16} />
          {t('accountsPage.hiddenLink', { count: hiddenItems.length })}
        </button>
      )}

      <AddAccountDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        initialTab={dialog || 'bank'}
        hiddenItems={hiddenItems}
        onRestore={(kind, id) => {
          restore(kind, id);
          if (hiddenItems.length === 1) setDialog(null);
        }}
        onCreated={load}
      />
    </div>
  );
}
