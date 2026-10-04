import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../api';
import ConfirmDialog from '../components/ui/confirm-dialog';
import SymbolSearch from '../components/investments/SymbolSearch';
import PurchaseDialog from '../components/investments/PurchaseDialog';
import PurchasesDialog from '../components/investments/PurchasesDialog';
import {
  formatDate,
  formatMoney,
  formatPercent,
  formatRelative,
  formatShares,
  formatSignedMoney,
  gainClass,
} from '../components/investments/format';
import { cn } from '../lib/utils';
import { getPref, setPref } from '../utils/userStorage';
import { translateServerError } from '../utils/serverError';

// Experimental module: independent from transactions/accounts. Prices are
// refreshed every minute while the tab is visible; the server caches quotes,
// so polling never spends extra market-data quota.
const REFRESH_MS = 60 * 1000;
const BANNER_PREF = 'investments.betaBannerDismissed';

function SummaryTile({ label, value, sub, valueClass }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm px-4 py-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        {label}
      </p>
      <p className={cn('text-xl font-bold mt-1 tabular-nums', valueClass)}>
        {value}
      </p>
      {sub && (
        <p className={cn('text-xs mt-0.5 tabular-nums', valueClass)}>{sub}</p>
      )}
    </div>
  );
}

function RowActions({ onAdd, onHistory, onDelete }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1 justify-end">
      <button
        type="button"
        onClick={onAdd}
        className="px-2.5 py-1 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-semibold"
      >
        {t('investments.table.addPurchase')}
      </button>
      <button
        type="button"
        onClick={onHistory}
        className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] font-medium"
      >
        {t('investments.table.history')}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t('common.delete')}
        title={t('common.delete')}
        className="px-2 py-1 text-xs rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
          aria-hidden="true"
        >
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      </button>
    </div>
  );
}

export default function Investments() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => getPref(BANNER_PREF) === '1',
  );
  // { mode: 'new'|'add'|'edit', asset, purchase?, returnTo? }
  const [purchaseDialog, setPurchaseDialog] = useState(null);
  const [historyHolding, setHistoryHolding] = useState(null);
  const [deleteHolding, setDeleteHolding] = useState(null);
  const lastLoadRef = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setRefreshing(true);
      try {
        const res = await api.get('/investments');
        setData(res.data);
        setLoadError(false);
        lastLoadRef.current = Date.now();
      } catch (err) {
        console.error(err);
        setLoadError(true);
        if (!silent)
          toast.error(translateServerError(err, t, 'investments.loadFailed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    load({ silent: true });
  }, [load]);

  // Auto-refresh while visible; catch up right away when the tab comes back.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') load({ silent: true });
    };
    const id = setInterval(tick, REFRESH_MS);
    const onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastLoadRef.current > REFRESH_MS
      ) {
        load({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  const dismissBanner = () => {
    setBannerDismissed(true);
    setPref(BANNER_PREF, '1');
  };

  const handleDeleteHolding = async () => {
    const target = deleteHolding;
    setDeleteHolding(null);
    try {
      await api.delete(`/investments/${target.id}`);
      toast.success(t('investments.deleted'));
      load({ silent: true });
    } catch (err) {
      toast.error(translateServerError(err, t, 'investments.deleteFailed'));
    }
  };

  // Editing from the history closes it while the form is open, then returns.
  const closePurchaseDialog = () => {
    const returnTo = purchaseDialog?.returnTo;
    setPurchaseDialog(null);
    if (returnTo) setHistoryHolding(returnTo);
  };

  const holdings = data?.holdings || [];
  const totals = data?.totals;
  const currency = data?.currency;
  const showsFx = holdings.some((h) => h.displayCurrency !== h.quoteCurrency);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      {/* Beta banner */}
      {!bannerDismissed && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <span aria-hidden="true">ⓘ</span>
          <p className="flex-1">{t('investments.beta.message')}</p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label={t('common.close')}
            className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Header + search */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-semibold tracking-tight flex items-center gap-2">
              {t('investments.title')}
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                {t('nav.beta')}
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('investments.subtitle')}
            </p>
          </div>
          <div className="text-xs text-[var(--muted-foreground)] sm:text-right space-y-0.5">
            <div className="flex items-center gap-2 sm:justify-end">
              {data?.quotedAt && (
                <span>
                  {t('investments.header.pricesAsOf', {
                    time: formatRelative(data.quotedAt),
                  })}
                </span>
              )}
              {data?.stale && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold">
                  {t('investments.header.stale')}
                </span>
              )}
              <button
                type="button"
                onClick={() => load()}
                disabled={refreshing}
                aria-label={t('investments.header.refresh')}
                title={t('investments.header.refresh')}
                className="p-1 rounded-md hover:bg-[var(--muted)] disabled:opacity-50"
              >
                <svg
                  className={cn(refreshing && 'animate-spin')}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </button>
            </div>
            {showsFx && data?.fxDate && (
              <p>
                {t('investments.header.fxAsOf', {
                  date: formatDate(data.fxDate),
                })}
              </p>
            )}
          </div>
        </div>
        <div className="px-5 py-4">
          <SymbolSearch
            onSelect={(sym) => setPurchaseDialog({ mode: 'new', asset: sym })}
          />
        </div>
      </section>

      {/* Summary */}
      {totals && holdings.length > 0 && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryTile
            label={t('investments.summary.value')}
            value={formatMoney(totals.value, currency)}
          />
          <SummaryTile
            label={t('investments.summary.invested')}
            value={formatMoney(totals.cost, currency)}
          />
          <SummaryTile
            label={t('investments.summary.gain')}
            value={formatSignedMoney(totals.gain, currency)}
            sub={formatPercent(totals.gainPercent)}
            valueClass={gainClass(totals.gain)}
          />
          <SummaryTile
            label={t('investments.summary.today')}
            value={formatSignedMoney(totals.dayChange, currency)}
            sub={formatPercent(totals.dayChangePercent)}
            valueClass={gainClass(totals.dayChange)}
          />
        </section>
      )}

      {/* Holdings */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg"
              />
            ))}
          </div>
        ) : loadError && !data ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-rose-600">
              {t('investments.loadFailed')}
            </p>
            <button
              type="button"
              onClick={() => load()}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              {t('investments.retry')}
            </button>
          </div>
        ) : holdings.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-3xl mb-2" aria-hidden="true">
              📈
            </p>
            <p className="font-semibold">{t('investments.empty.title')}</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {t('investments.empty.hint')}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-[var(--border)]">
                  <th className="text-left font-semibold px-5 py-3">
                    {t('investments.table.asset')}
                  </th>
                  <th className="text-right font-semibold px-3 py-3">
                    {t('investments.table.shares')}
                  </th>
                  <th className="text-right font-semibold px-3 py-3">
                    {t('investments.table.price')}
                  </th>
                  <th className="text-right font-semibold px-3 py-3">
                    {t('investments.table.value')}
                  </th>
                  <th className="text-right font-semibold px-3 py-3">
                    {t('investments.table.gain')}
                  </th>
                  <th className="text-right font-semibold px-3 py-3">
                    {t('investments.table.weight')}
                  </th>
                  <th className="px-5 py-3">
                    <span className="sr-only">{t('common.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {holdings.map((h) => (
                  <tr key={h.id} className="align-middle">
                    <td className="px-5 py-3">
                      <p className="font-semibold">{h.symbol}</p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate max-w-[16rem]">
                        {h.name}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {h.purchasesCount === 0 ? (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {t('investments.table.noPurchases')}
                        </span>
                      ) : (
                        formatShares(h.shares)
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {h.priceUnavailable ? (
                        <span className="text-xs text-amber-600">
                          {t('investments.table.noPrice')}
                        </span>
                      ) : (
                        <>
                          <p>{formatMoney(h.price, h.quoteCurrency)}</p>
                          <p
                            className={cn(
                              'text-xs',
                              gainClass(h.changePercent),
                            )}
                          >
                            {formatPercent(h.changePercent)}
                          </p>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <p className="font-semibold">
                        {formatMoney(h.valueUser, h.displayCurrency)}
                      </p>
                      {h.displayCurrency !== h.quoteCurrency &&
                        h.valueQuote != null && (
                          <p className="text-xs text-[var(--muted-foreground)]">
                            ≈ {formatMoney(h.valueQuote, h.quoteCurrency)}
                          </p>
                        )}
                      {h.fxUnavailable && (
                        <p className="text-xs text-amber-600">
                          {t('investments.table.fxUnavailable')}
                        </p>
                      )}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-3 text-right tabular-nums',
                        gainClass(h.gainUser),
                      )}
                    >
                      <p className="font-semibold">
                        {formatSignedMoney(h.gainUser, h.displayCurrency)}
                      </p>
                      <p className="text-xs">{formatPercent(h.gainPercent)}</p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[var(--muted-foreground)]">
                      {h.weight != null ? `${h.weight}%` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <RowActions
                        onAdd={() =>
                          setPurchaseDialog({ mode: 'add', asset: h })
                        }
                        onHistory={() => setHistoryHolding(h)}
                        onDelete={() => setDeleteHolding(h)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-[var(--border)]">
              {holdings.map((h) => (
                <li key={h.id} className="px-4 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{h.symbol}</p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        {h.name}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="font-semibold">
                        {formatMoney(h.valueUser, h.displayCurrency)}
                      </p>
                      <p className={cn('text-xs', gainClass(h.gainUser))}>
                        {formatSignedMoney(h.gainUser, h.displayCurrency)} (
                        {formatPercent(h.gainPercent)})
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--muted-foreground)] tabular-nums">
                    <span>
                      {h.purchasesCount === 0
                        ? t('investments.table.noPurchases')
                        : `${formatShares(h.shares)} ${t('investments.table.sharesShort')}`}
                    </span>
                    <span>
                      {h.priceUnavailable
                        ? t('investments.table.noPrice')
                        : formatMoney(h.price, h.quoteCurrency)}
                      {h.weight != null && ` · ${h.weight}%`}
                    </span>
                  </div>
                  <RowActions
                    onAdd={() => setPurchaseDialog({ mode: 'add', asset: h })}
                    onHistory={() => setHistoryHolding(h)}
                    onDelete={() => setDeleteHolding(h)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Data attribution (required by the FX source's terms) */}
      <p className="text-[11px] text-center text-[var(--muted-foreground)]">
        {t('investments.attribution.prices')}{' '}
        <a
          href="https://finnhub.io"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Finnhub
        </a>
        {' · '}
        {t('investments.attribution.fx')}{' '}
        <a
          href="https://www.exchangerate-api.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ExchangeRate-API
        </a>
        {' · '}
        {t('investments.attribution.disclaimer')}
      </p>

      <PurchaseDialog
        open={!!purchaseDialog}
        onOpenChange={(o) => !o && closePurchaseDialog()}
        mode={purchaseDialog?.mode}
        asset={purchaseDialog?.asset}
        purchase={purchaseDialog?.purchase}
        onSaved={() => load({ silent: true })}
      />

      <PurchasesDialog
        open={!!historyHolding}
        onOpenChange={(o) => !o && setHistoryHolding(null)}
        holding={historyHolding}
        onEdit={(p) => {
          setPurchaseDialog({
            mode: 'edit',
            asset: historyHolding,
            purchase: p,
            returnTo: historyHolding,
          });
          setHistoryHolding(null);
        }}
        onChanged={() => load({ silent: true })}
      />

      <ConfirmDialog
        open={!!deleteHolding}
        onOpenChange={(o) => !o && setDeleteHolding(null)}
        title={t('investments.deleteTitle', { symbol: deleteHolding?.symbol })}
        description={t('investments.deleteHint')}
        confirmText={t('common.delete')}
        onConfirm={handleDeleteHolding}
        onCancel={() => setDeleteHolding(null)}
      />
    </div>
  );
}
