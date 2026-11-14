import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api';
import { useCurrency } from '../context/CurrencyContext';
import { compactNumber, signedMoney } from '../utils/format';
import { intlLocale } from '../utils/dateLocale';
import { monthFromPeriod } from '../utils/months';
import { onTransactionsChanged } from '../utils/transactionEvents';
import { cn } from '../lib/utils';

// Accounts are the brand green; investments a blue far enough from it to tell
// apart, and both carry a legend label.
const ACCOUNTS_COLOR = '#059669';
const INVESTMENTS_COLOR = '#0284c7';

const shortMonth = (key) =>
  monthFromPeriod(key).toLocaleDateString(intlLocale(), { month: 'short' });

function Change({ label, change, money }) {
  if (!change) return null;
  const up = change.amount >= 0;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          'font-semibold tabular-nums',
          up
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-rose-700 dark:text-rose-400',
        )}
      >
        {change.percent != null
          ? `${up ? '+' : '−'}${Math.abs(change.percent)}%`
          : signedMoney(change.amount, money)}
      </span>
      <span className="text-[var(--muted-foreground)]">{label}</span>
    </span>
  );
}

function MonthTooltip({ active, payload, money, t, withInvestments }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-medium text-[var(--foreground)] capitalize">
        {monthFromPeriod(p.month).toLocaleDateString(intlLocale(), {
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <div className="flex justify-between gap-6">
        <span className="text-[var(--muted-foreground)]">
          {t('netWorth.accounts')}
        </span>
        <span className="tabular-nums text-[var(--foreground)]">
          {money(p.accounts)}
        </span>
      </div>
      {withInvestments && (
        <div className="flex justify-between gap-6">
          <span className="text-[var(--muted-foreground)]">
            {t('netWorth.investments')}
          </span>
          <span className="tabular-nums text-[var(--foreground)]">
            {money(p.investments)}
          </span>
        </div>
      )}
      <div className="flex justify-between gap-6 border-t border-[var(--border)] pt-1">
        <span className="text-[var(--muted-foreground)]">
          {t('netWorth.total')}
        </span>
        <span className="font-semibold tabular-nums text-[var(--foreground)]">
          {money(p.total)}
        </span>
      </div>
    </div>
  );
}

/** Accounts (and investments, for those with access) month by month. */
export default function NetWorthCard() {
  const { t } = useTranslation();
  const { money, privacyMode } = useCurrency();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [tick, setTick] = useState(0);

  useEffect(() => onTransactionsChanged(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    let alive = true;
    api
      .get('/stats/net-worth')
      .then((res) => {
        if (!alive) return;
        setData(res.data);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [tick]);

  const withInvestments = Boolean(data?.includesInvestments);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {t('netWorth.title')}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {withInvestments
              ? t('netWorth.subtitleWithInvestments')
              : t('netWorth.subtitle')}
          </p>
        </div>
        {status === 'ready' && (
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-[var(--foreground)]">
              {money(data.current.total)}
            </p>
            <div className="mt-1 flex flex-wrap justify-end gap-x-4 gap-y-1">
              <Change
                label={t('netWorth.thisMonth')}
                change={data.changeMonth}
                money={money}
              />
              <Change
                label={t('netWorth.last12')}
                change={data.changeYear}
                money={money}
              />
            </div>
          </div>
        )}
      </div>

      {status === 'error' && (
        <p className="mt-4 text-sm text-rose-700 dark:text-rose-400">
          {t('netWorth.loadFailed')}
        </p>
      )}
      {status === 'loading' && (
        <div className="mt-4 h-56 rounded-xl bg-[var(--muted)] animate-pulse motion-reduce:animate-none" />
      )}
      {status === 'ready' && (
        <>
          <div className="mt-4 h-56">
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 640, height: 224 }}
            >
              <BarChart
                data={data.history}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tickFormatter={shortMonth}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={8}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  width={privacyMode ? 8 : 48}
                  tickLine={false}
                  axisLine={false}
                  tick={
                    privacyMode
                      ? false
                      : { fontSize: 12, fill: 'var(--muted-foreground)' }
                  }
                  tickFormatter={compactNumber}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                  content={
                    <MonthTooltip
                      money={money}
                      t={t}
                      withInvestments={withInvestments}
                    />
                  }
                />
                <Bar
                  dataKey="accounts"
                  stackId="nw"
                  fill={ACCOUNTS_COLOR}
                  stroke="var(--card)"
                  strokeWidth={withInvestments ? 1 : 0}
                  radius={withInvestments ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                {withInvestments && (
                  <Bar
                    dataKey="investments"
                    stackId="nw"
                    fill={INVESTMENTS_COLOR}
                    stroke="var(--card)"
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--muted-foreground)]">
            <li className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm"
                style={{ background: ACCOUNTS_COLOR }}
              />
              {t('netWorth.accounts')}
              <span className="tabular-nums text-[var(--foreground)]">
                {money(data.current.accounts)}
              </span>
            </li>
            {withInvestments && (
              <li className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: INVESTMENTS_COLOR }}
                />
                {t('netWorth.investments')}
                <span className="tabular-nums text-[var(--foreground)]">
                  {money(data.current.investments)}
                </span>
              </li>
            )}
          </ul>
          {withInvestments && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {t('netWorth.costNote')}
            </p>
          )}
        </>
      )}
    </section>
  );
}
