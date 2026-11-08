import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Line, LineChart, YAxis } from 'recharts';
import api from '../api';
import Button from './ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { useCurrency } from '../context/CurrencyContext';
import { intlLocale } from '../utils/dateLocale';

const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(intlLocale(), {
    month: 'short',
    year: 'numeric',
  });
};

const signed = (value, money) =>
  `${value < 0 ? '−' : ''}${money(Math.abs(value))}`;

function Sparkline({ name, history, money }) {
  const { t } = useTranslation();
  return (
    <div role="img" aria-label={t('accountsPage.sparklineLabel', { name })}>
      <ChartContainer config={{}} style={{ height: 48 }}>
        <LineChart
          data={history}
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        >
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel={false}
                indicator="line"
                formatter={(v) => signed(v, money)}
                labelFormatter={(_, payload) =>
                  payload?.[0] ? monthLabel(payload[0].payload.month) : ''
                }
              />
            }
          />
          <Line
            dataKey="balance"
            name={t('accountsPage.balance')}
            type="monotone"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function Delta({ value, money }) {
  const { t } = useTranslation();
  if (value === 0) {
    return (
      <p className="text-xs text-[var(--muted-foreground)]">
        {t('accountsPage.noChangeVsLastMonth')}
      </p>
    );
  }
  const up = value > 0;
  return (
    <p
      className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${
        up
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-rose-700 dark:text-rose-400'
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={up ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'} />
      </svg>
      {t('accountsPage.vsLastMonth', {
        amount: `${up ? '+' : '−'}${money(Math.abs(value))}`,
      })}
    </p>
  );
}

/**
 * One card per bank account: balance, change this month and a 12-month trend.
 * refreshKey re-fetches after the page changes a transaction or an account.
 */
export default function AccountBalanceCards({
  accounts,
  refreshKey,
  onDetails,
}) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const [byId, setById] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await api.get('/accounts/history', {
        params: { months: 12 },
      });
      setById(new Map(res.data.map((row) => [row.accountId, row])));
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (accounts.length === 0) return null;

  if (failed && !byId) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-white dark:bg-slate-900 p-5 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t('accountsPage.historyFailed')}
        </p>
        <Button variant="outline" onClick={load}>
          {t('common.retry')}
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-label={t('accountsPage.balanceCards')}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {accounts.map((account) => {
        const row = byId?.get(account.id);
        if (!row) {
          return (
            <div
              key={account.id}
              className="h-[188px] rounded-2xl border border-[var(--border)] bg-white dark:bg-slate-900 animate-pulse"
              aria-hidden="true"
            />
          );
        }
        return (
          <article
            key={account.id}
            className="rounded-2xl border border-[var(--border)] bg-white dark:bg-slate-900 shadow-sm p-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-medium text-[var(--muted-foreground)] truncate">
                {account.name}
              </h3>
              {account.isExcludedFromTotals && (
                <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                  {t('accountsPage.isolated')}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold tabular-nums text-[var(--foreground)]">
              {signed(row.balance, money)}
            </p>
            <Delta value={row.delta} money={money} />
            <Sparkline
              name={account.name}
              history={row.history}
              money={money}
            />
            <div className="flex justify-end">
              <Button variant="subtle" onClick={() => onDetails(account)}>
                {t('accountsPage.details')}
              </Button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
