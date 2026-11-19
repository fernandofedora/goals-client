import { useEffect, useMemo, useState } from 'react';
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
import { ScopeLine } from '../components/budgets/BudgetRow';
import { useCurrency } from '../context/CurrencyContext';
import { compactNumber } from '../utils/format';
import { intlLocale } from '../utils/dateLocale';
import { budgetColor, periodRange } from '../utils/budgets';
import { cn } from '../lib/utils';

// Rounds the axis top up to 1, 2, 2.5 or 5 times a power of ten, so the
// ticks land on readable amounts.
function niceCeil(value) {
  if (!(value > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= value);
  return step * magnitude;
}

const shortDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
  });
};

const MIN_OFFSET = -60;

function Chevron({ dir }) {
  return (
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
      <path d={dir === 'prev' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

const stepClass =
  'inline-flex items-center justify-center size-11 sm:size-9 rounded-lg cursor-pointer text-[var(--foreground)] hover:bg-[var(--muted)] active:bg-[var(--muted)] disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]';

/** `‹ 1 – 31 mar ›`: steps one budget period at a time, never past today's. */
function PeriodStepper({ offset, period, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-white dark:bg-slate-900 p-1">
      <button
        type="button"
        onClick={() => onChange(offset - 1)}
        disabled={offset <= MIN_OFFSET}
        aria-label={t('budgetDetail.prevPeriod')}
        className={stepClass}
      >
        <Chevron dir="prev" />
      </button>
      <span
        className="min-w-36 text-center text-sm font-semibold text-[var(--foreground)]"
        aria-live="polite"
      >
        {period ? periodRange(period) : '…'}
      </span>
      <button
        type="button"
        onClick={() => onChange(offset + 1)}
        disabled={offset >= 0}
        aria-label={t('budgetDetail.nextPeriod')}
        className={stepClass}
      >
        <Chevron dir="next" />
      </button>
    </div>
  );
}

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

// Available, spent, previous period and what is left for the hovered day.
function DayTooltip({ active, payload, available, money, t }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const spent = point.spent;
  const left = spent != null ? available - spent : null;
  const row = (name, value, strong) => (
    <div className="flex justify-between gap-6">
      <span className="text-[var(--muted-foreground)]">{name}</span>
      <span
        className={cn(
          'tabular-nums text-[var(--foreground)]',
          strong && 'font-semibold',
        )}
      >
        {value}
      </span>
    </div>
  );
  return (
    <div className="min-w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-medium text-[var(--foreground)]">
        {shortDate(point.date)}
      </p>
      {row(t('budgetDetail.assigned'), money(available))}
      {row(t('budgetDetail.spent'), spent == null ? '—' : money(spent), true)}
      {row(t('budgetDetail.previousPeriod'), money(point.previous))}
      {left != null &&
        row(
          left >= 0 ? t('budgetDetail.available') : t('budgetDetail.over'),
          money(Math.abs(left)),
        )}
    </div>
  );
}

export default function BudgetDetail() {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const { budgetId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = Number(searchParams.get('offset') || 0);
  const offset =
    Number.isInteger(raw) && raw <= 0 && raw >= MIN_OFFSET ? raw : 0;

  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    api
      .get(`/spending-budgets/${budgetId}/detail`, { params: { offset } })
      .then((res) => {
        if (!alive) return;
        setData(res.data);
        setStatus('ready');
      })
      .catch((err) => {
        if (!alive) return;
        setStatus(err?.response?.status === 404 ? 'missing' : 'error');
      });
    return () => {
      alive = false;
    };
  }, [budgetId, offset]);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const setOffset = (next) =>
    setSearchParams(next === 0 ? {} : { offset: String(next) });

  const budget = data?.budget;
  const available = budget?.available ?? 0;
  const spent = budget?.spent ?? 0;
  const left = available - spent;
  const color = budget ? budgetColor(budget) : '#059669';
  const yMax = niceCeil(
    Math.max(
      available,
      ...(data?.series ?? []).flatMap((p) => [p.spent ?? 0, p.previous]),
    ) * 1.05,
  );
  const loading = status === 'loading';

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
              {budget?.name ?? t('budgetDetail.title')}
            </span>
          </h1>
          {budget ? (
            <ScopeLine budget={budget} className="mt-1 text-sm" />
          ) : (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {t('budgetDetail.subtitle')}
            </p>
          )}
        </div>
        {status !== 'missing' && (
          <PeriodStepper
            offset={offset}
            period={budget?.period}
            onChange={setOffset}
          />
        )}
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

      {(loading || status === 'ready') && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile
              label={t('budgetDetail.assigned')}
              value={loading ? '…' : money(available)}
              detail={
                !loading && budget.carry !== 0
                  ? t(
                      budget.carry > 0
                        ? 'budgetDetail.withCarryIn'
                        : 'budgetDetail.withCarryOut',
                      {
                        amount: money(budget.amount),
                        carry: money(Math.abs(budget.carry)),
                      },
                    )
                  : null
              }
            />
            <Tile
              label={t('budgetDetail.spent')}
              value={loading ? '…' : money(spent)}
              detail={
                !loading
                  ? t('budgetDetail.ofBudget', {
                      pct: Math.round(budget.percent),
                    })
                  : null
              }
            />
            <Tile
              label={
                left < 0 ? t('budgetDetail.over') : t('budgetDetail.available')
              }
              value={loading ? '…' : money(Math.abs(left))}
              tone={!loading && left < 0 ? 'bad' : null}
            />
            <Tile
              label={t('budgetDetail.previousPeriod')}
              value={loading ? '…' : money(data.previousPeriod.spent)}
              detail={loading ? null : periodRange(data.previousPeriod)}
            />
          </div>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {t('budgetDetail.chartTitle')}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {t('budgetDetail.chartSub')}
            </p>
            <div className="mt-4 h-72">
              {loading ? (
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
                      dataKey="date"
                      tickFormatter={shortDate}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={24}
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
                        <DayTooltip available={available} money={money} t={t} />
                      }
                      cursor={{
                        stroke: 'var(--muted-foreground)',
                        strokeDasharray: '3 3',
                      }}
                    />
                    {available > 0 && (
                      <ReferenceLine
                        y={available}
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
                      name={t('budgetDetail.previousPeriod')}
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
                {t('budgetDetail.legendThisPeriod')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dashed border-[var(--muted-foreground)]" />
                {t('budgetDetail.previousPeriod')}
              </li>
              {available > 0 && (
                <li className="flex items-center gap-1.5">
                  <span className="w-5 border-t-2 border-dashed border-rose-600" />
                  {t('budgetDetail.limit')}
                </li>
              )}
            </ul>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                {t('budgetDetail.transactions')}
              </h2>
            </div>
            {!loading && data.transactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">
                {t('budgetDetail.noTransactions')}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {(data?.transactions ?? []).map((tx) => {
                  const cat = categoryById.get(tx.CategoryId);
                  return (
                    <li
                      key={tx.id}
                      className="px-5 py-3 flex items-center gap-3"
                    >
                      <span className="w-16 sm:w-20 flex-shrink-0 text-[13px] tabular-nums text-[var(--muted-foreground)]">
                        {shortDate(tx.date)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                          {tx.description}
                        </span>
                        {cat && (
                          <span className="block truncate text-xs text-[var(--muted-foreground)]">
                            {cat.name}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                        {money(tx.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
