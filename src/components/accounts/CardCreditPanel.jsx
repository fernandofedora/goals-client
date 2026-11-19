import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import Button from '../ui/button';
import { useCurrency } from '../../context/CurrencyContext';
import { intlLocale } from '../../utils/dateLocale';
import { onTransactionsChanged } from '../../utils/transactionEvents';
import { cn } from '../../lib/utils';

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
  });

// Same thresholds as the budgets: amber from 70%, rose from 90%.
const usageTone = (pct) =>
  pct >= 90 ? 'bg-rose-600' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-600';

/** Limit use, running cycle and the statement to pay of one card. */
export default function CardCreditPanel({
  cardId,
  refreshKey,
  onEdit,
  className,
}) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const [status, setStatus] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => onTransactionsChanged(() => setTick((n) => n + 1)), []);
  useEffect(() => {
    let alive = true;
    api
      .get('/cards/status')
      .then((res) => {
        if (!alive) return;
        setStatus(res.data.find((s) => s.cardId === cardId) ?? null);
        setFailed(false);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [cardId, refreshKey, tick]);

  if (failed) {
    return (
      <p className={cn('text-sm text-rose-700 dark:text-rose-400', className)}>
        {t('cardCredit.loadFailed')}
      </p>
    );
  }
  if (!status) return null;

  const hasLimit = status.creditLimit != null;
  if (!hasLimit && !status.statement) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-dashed border-[var(--border)] p-5 flex flex-wrap items-center justify-between gap-3',
          className,
        )}
      >
        <p className="text-sm text-[var(--muted-foreground)] max-w-prose">
          {t('cardCredit.setupHint')}
        </p>
        <Button variant="outline" onClick={onEdit}>
          {t('cardCredit.setup')}
        </Button>
      </section>
    );
  }

  const owed = Math.max(0, status.balance);
  const pct = status.usedPercent ?? 0;
  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-white dark:bg-slate-900 shadow-sm p-5 grid gap-5 sm:grid-cols-3',
        className,
      )}
    >
      {hasLimit && (
        <div className="sm:col-span-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-[var(--foreground)]">
              {t('cardCredit.used', {
                owed: money(owed),
                limit: money(status.creditLimit),
              })}
            </p>
            <p className="text-sm tabular-nums text-[var(--muted-foreground)]">
              {t('cardCredit.available', {
                amount: money(Math.max(0, status.available)),
              })}
            </p>
          </div>
          <div
            className="mt-2 h-2.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(pct))}
            aria-label={t('cardCredit.usageLabel')}
          >
            <div
              className={cn('h-full rounded-full', usageTone(pct))}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p
            className={cn(
              'mt-1 text-xs',
              pct >= 80
                ? 'font-semibold text-rose-700 dark:text-rose-400'
                : 'text-[var(--muted-foreground)]',
            )}
          >
            {pct >= 80
              ? t('cardCredit.highUsage', { pct: Math.round(pct) })
              : t('cardCredit.usage', { pct: Math.round(pct) })}
          </p>
        </div>
      )}

      {status.cycle && (
        <div>
          <p className="text-[13px] font-medium text-[var(--muted-foreground)]">
            {t('cardCredit.cycle', {
              start: shortDate(status.cycle.start),
              end: shortDate(status.cycle.end),
            })}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[var(--foreground)]">
            {money(Math.max(0, status.cycle.spent))}
          </p>
        </div>
      )}

      {status.statement && (
        <>
          <div>
            <p className="text-[13px] font-medium text-[var(--muted-foreground)]">
              {t('cardCredit.statement', {
                date: shortDate(status.statement.date),
              })}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[var(--foreground)]">
              {money(status.statement.amount)}
            </p>
            {status.statement.paid > 0 && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {t('cardCredit.paid', { amount: money(status.statement.paid) })}
              </p>
            )}
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--muted-foreground)]">
              {status.statement.dueDate
                ? t('cardCredit.dueOn', {
                    date: shortDate(status.statement.dueDate),
                  })
                : t('cardCredit.toPay')}
            </p>
            {status.statement.remaining > 0 ? (
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--foreground)]">
                {money(status.statement.remaining)}
              </p>
            ) : (
              <p className="mt-1 text-base font-semibold text-emerald-700 dark:text-emerald-400">
                {t('cardCredit.paidOff')}
              </p>
            )}
          </div>
        </>
      )}

      <p className="sm:col-span-3 text-xs text-[var(--muted-foreground)]">
        {t('cardCredit.paymentsHint')}
      </p>
    </section>
  );
}
