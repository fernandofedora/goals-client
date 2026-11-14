import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api';
import MonthStepper from '../components/ui/month-stepper';
import { useCurrency } from '../context/CurrencyContext';
import { compactNumber } from '../utils/format';
import { intlLocale } from '../utils/dateLocale';
import { monthFromPeriod, periodOf } from '../utils/months';
import { cn } from '../lib/utils';

// Rounds the axis top up to 1, 2, 2.5 or 5 times a power of ten, so the
// ticks land on readable amounts.
function niceCeil(value) {
  if (!(value > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= value);
  return step * magnitude;
}

const monthName = (period) =>
  monthFromPeriod(period).toLocaleDateString(intlLocale(), { month: 'long' });

function Tile({ label, value, detail, tone }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-slate-900 p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-xl sm:text-2xl font-bold tabular-nums',
          tone === 'bad'
            ? 'text-rose-700 dark:text-rose-400'
            : 'text-[var(--foreground)]',
        )}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          {detail}
        </p>
      )}
    </div>
  );
}

// Assigned, spent, previous month and available for the hovered day.
function DayTooltip({ active, payload, label, budget, money, t, period }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const spent = point.spent;
  const left = budget != null && spent != null ? budget - spent : null;
  const row = (name, value, strong) => (
    <div className="flex justify-between gap-6">
      <span className="text-[var(--muted-foreground)]">{name}</span>
      <span
        className={cn(
          'tabular-nums',
          strong
            ? 'font-semibold text-[var(--foreground)]'
            : 'text-[var(--foreground)]',
        )}
      >
        {value}
      </span>
    </div>
  );
  return (
    <div className="min-w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-medium text-[var(--foreground)]">
        {t('budgetDetail.day', { day: label, month: monthName(period) })}
      </p>
      {budget != null && row(t('budgetDetail.assigned'), money(budget))}
      {row(t('budgetDetail.spent'), spent == null ? '—' : money(spent), true)}
      {row(t('budgetDetail.previousMonth'), money(point.previous))}
      {left != null &&
        row(
          left >= 0 ? t('budgetDetail.available') : t('budgetDetail.over'),
          `${money(Math.abs(left))} (${Math.round((Math.abs(left) / budget) * 100)}%)`,
        )}
    </div>
  );
}

export default function BudgetCategory() {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = monthFromPeriod(searchParams.get('period'));
  const period = periodOf(month);

  const [data, setData] = useState(null);
  const [txs, setTxs] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    const [y, m] = period.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    Promise.all([
      api.get(`/stats/category-budget/${categoryId}`, { params: { period } }),
      api.get('/transactions', {
        params: {
          categoryId,
          type: 'expense',
          from: `${period}-01`,
          to: `${period}-${String(last).padStart(2, '0')}`,
          page: 1,
          limit: 50,
        },
      }),
    ])
      .then(([detail, list]) => {
        if (!alive) return;
        setData(detail.data);
        setTxs(list.data.items || []);
        setStatus('ready');
      })
      .catch((err) => {
        if (!alive) return;
        setStatus(err?.response?.status === 404 ? 'missing' : 'error');
      });
    return () => {
      alive = false;
    };
  }, [categoryId, period]);

  const setMonth = (d) => setSearchParams({ period: periodOf(d) });
  const budget = data?.budget ?? null;
  const spent = data?.spent ?? 0;
  const left = budget != null ? budget - spent : null;
  const color = data?.category?.color || '#059669';
  const yMax = niceCeil(
    Math.max(
      budget ?? 0,
      ...(data?.series ?? []).flatMap((p) => [p.spent ?? 0, p.previous]),
    ) * 1.05,
  );

  return (
    <div className="max-w-5xl mx-auto p-4 pb-12 space-y-5">
      <Link
        to="/transactions/budget"
        className="inline-flex items-center gap-1 min-h-11 sm:min-h-0 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <span aria-hidden="true">‹</span> {t('budgetDetail.back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-[var(--foreground)]">
            <span
              className="size-3 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            <span className="truncate">
              {data?.category?.name ?? t('budgetDetail.title')}
            </span>
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {t('budgetDetail.subtitle')}
          </p>
        </div>
        <MonthStepper value={month} onChange={setMonth} />
      </div>

      {status === 'missing' && (
        <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-slate-900 p-6 text-sm text-[var(--muted-foreground)]">
          {t('budgetDetail.notFound')}
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-5 text-sm text-rose-800 dark:text-rose-300">
          {t('budgetDetail.loadFailed')}
        </div>
      )}

      {(status === 'loading' || status === 'ready') && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile
              label={t('budgetDetail.assigned')}
              value={
                status === 'loading'
                  ? '…'
                  : budget != null
                    ? money(budget)
                    : '—'
              }
              detail={
                budget == null && status === 'ready'
                  ? t('budgetDetail.noBudget')
                  : null
              }
            />
            <Tile
              label={t('budgetDetail.spent')}
              value={status === 'loading' ? '…' : money(spent)}
              detail={
                budget && status === 'ready'
                  ? t('budgetDetail.ofBudget', {
                      pct: Math.round((spent / budget) * 100),
                    })
                  : null
              }
            />
            <Tile
              label={
                left != null && left < 0
                  ? t('budgetDetail.over')
                  : t('budgetDetail.available')
              }
              value={
                status === 'loading'
                  ? '…'
                  : left != null
                    ? money(Math.abs(left))
                    : '—'
              }
              tone={left != null && left < 0 ? 'bad' : null}
            />
            <Tile
              label={t('budgetDetail.previousMonth')}
              value={
                status === 'loading' ? '…' : money(data?.previousSpent ?? 0)
              }
              detail={data ? monthName(data.previousPeriod) : null}
            />
          </div>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {t('budgetDetail.chartTitle')}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {t('budgetDetail.chartSub', {
                previous: data ? monthName(data.previousPeriod) : '',
              })}
            </p>
            <div className="mt-4 h-72">
              {status === 'loading' ? (
                <div className="h-full animate-pulse motion-reduce:animate-none rounded-xl bg-[var(--muted)]" />
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  initialDimension={{ width: 640, height: 288 }}
                >
                  <ComposedChart
                    data={data.series}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={16}
                      tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    />
                    <YAxis
                      width={48}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={compactNumber}
                      tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                      domain={[0, yMax]}
                      ticks={[0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax)}
                    />
                    <Tooltip
                      content={
                        <DayTooltip
                          budget={budget}
                          money={money}
                          t={t}
                          period={period}
                        />
                      }
                      cursor={{
                        stroke: 'var(--muted-foreground)',
                        strokeDasharray: '3 3',
                      }}
                    />
                    {budget != null && (
                      <ReferenceLine
                        y={budget}
                        stroke="#e11d48"
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        label={{
                          value: t('budgetDetail.limit'),
                          position: 'insideTopRight',
                          fontSize: 12,
                          fill: 'var(--muted-foreground)',
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="previous"
                      name={t('budgetDetail.previousMonth')}
                      stroke="var(--muted-foreground)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="spent"
                      name={t('budgetDetail.spent')}
                      stroke={color}
                      strokeWidth={2}
                      fill={color}
                      fillOpacity={0.15}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Legend: identity is never color alone. */}
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--muted-foreground)]">
              <li className="flex items-center gap-1.5">
                <span
                  className="h-0.5 w-5 rounded"
                  style={{ background: color }}
                />
                {t('budgetDetail.legendThisMonth')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dashed border-[var(--muted-foreground)]" />
                {t('budgetDetail.legendPrevious')}
              </li>
              {budget != null && (
                <li className="flex items-center gap-1.5">
                  <span className="w-5 border-t-2 border-dashed border-rose-600" />
                  {t('budgetDetail.limit')}
                </li>
              )}
            </ul>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                {t('budgetDetail.transactions')}
              </h2>
              <Link
                to={`/transactions/add?categoryId=${categoryId}&period=${period}`}
                className="inline-flex items-center min-h-11 sm:min-h-0 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {t('budgetDetail.openHistory')}
              </Link>
            </div>
            {status === 'ready' && txs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">
                {t('budgetDetail.noTransactions')}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {txs.map((tx) => (
                  <li key={tx.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="w-20 sm:w-24 flex-shrink-0 text-[13px] tabular-nums text-[var(--muted-foreground)]">
                      {tx.date}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                        {tx.description}
                      </span>
                      {tx.Category &&
                        String(tx.Category.id) !== String(categoryId) && (
                          <span className="block truncate text-xs text-[var(--muted-foreground)]">
                            {tx.Category.name}
                          </span>
                        )}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                      {money(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
