import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../api';
import { cn } from '../../lib/utils';
import { compactNumber } from '../../utils/format';
import { intlLocale } from '../../utils/dateLocale';
import { isPrivacyOn } from '../../utils/privacy';
import {
  formatDate,
  formatMoney,
  formatSignedMoney,
  gainClass,
  todayStr,
} from './format';

const RANGES = ['1m', '3m', '6m', '1y', 'all'];

// The first two slots of the allocation bar's palette (index.css), already
// validated for CVD and contrast in light and dark. Invested is also dashed,
// so the two never rely on color alone.
const SERIES_VARS = '[--inv-value:var(--alloc-1)] [--inv-cost:var(--alloc-2)]';

const shortDate = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
  });
};

function PointTooltip({ active, payload, currency, t }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const gain = p.value - p.cost;
  const row = (label, value, swatch, valueClass) => (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
        {swatch}
        {label}
      </span>
      <span className={cn('tabular-nums text-[var(--foreground)]', valueClass)}>
        {value}
      </span>
    </div>
  );
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-medium text-[var(--foreground)]">
        {formatDate(p.date)}
      </p>
      {row(
        t('investments.history.value'),
        formatMoney(p.value, currency),
        <span className="h-0.5 w-3 rounded-full bg-[var(--inv-value)]" />,
      )}
      {row(
        t('investments.history.invested'),
        formatMoney(p.cost, currency),
        <span className="w-3 border-t-2 border-dashed border-[var(--inv-cost)]" />,
      )}
      <div className="border-t border-[var(--border)] pt-1">
        {row(
          t('investments.history.gain'),
          formatSignedMoney(gain, currency),
          null,
          cn('font-semibold', gainClass(gain)),
        )}
      </div>
    </div>
  );
}

/**
 * Portfolio value vs. what was invested, one point per day (saved by the
 * server's daily job and on each visit). Today's point follows the live
 * totals of the page.
 */
export default function PortfolioHistoryChart({ currency, live }) {
  const { t } = useTranslation();
  const [range, setRange] = useState('3m');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    api
      .get('/investments/history', { params: { range } })
      .then((res) => {
        if (!alive) return;
        setData(res.data);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [range, currency]);

  const points = useMemo(() => {
    // Points loaded before a currency change would not compare.
    const saved = data?.currency === currency ? data.points : [];
    if (!live) return saved;
    const today = todayStr();
    return [
      ...saved.filter((p) => p.date !== today),
      { date: today, value: live.value, cost: live.cost },
    ];
  }, [data, live, currency]);

  const privacy = isPrivacyOn();
  const enough = points.length >= 2;

  return (
    <section
      className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5',
        SERIES_VARS,
      )}
      aria-labelledby="inv-history-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="inv-history-title"
          className="text-base font-semibold text-[var(--foreground)]"
        >
          {t('investments.history.title')}
        </h2>
        <div
          role="group"
          aria-label={t('investments.history.rangeLabel')}
          className="inline-flex rounded-lg border border-[var(--border)] p-0.5"
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={cn(
                'min-w-10 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                range === r
                  ? 'bg-[var(--muted)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
              )}
            >
              {t(`investments.history.ranges.${r}`)}
            </button>
          ))}
        </div>
      </div>

      {status === 'error' && (
        <p className="mt-4 text-sm text-rose-700 dark:text-rose-400">
          {t('investments.history.loadFailed')}
        </p>
      )}
      {status === 'loading' && !data && (
        <div className="mt-4 h-56 rounded-xl bg-[var(--muted)] animate-pulse motion-reduce:animate-none" />
      )}
      {data && status !== 'error' && !enough && (
        <p className="mt-4 rounded-xl bg-[var(--muted)] px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
          {t('investments.history.empty')}
        </p>
      )}
      {data && status !== 'error' && enough && (
        <>
          <div className="mt-4 h-56">
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 640, height: 224 }}
            >
              <ComposedChart
                data={points}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id="inv-value-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--inv-value)"
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--inv-value)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
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
                  width={privacy ? 8 : 52}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tick={
                    privacy
                      ? false
                      : { fontSize: 12, fill: 'var(--muted-foreground)' }
                  }
                  tickFormatter={compactNumber}
                />
                <Tooltip
                  cursor={{
                    stroke: 'var(--muted-foreground)',
                    strokeWidth: 1,
                    strokeDasharray: '3 3',
                  }}
                  content={<PointTooltip currency={currency} t={t} />}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--inv-value)"
                  strokeWidth={2}
                  fill="url(#inv-value-fill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                  isAnimationActive={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="cost"
                  stroke="var(--inv-cost)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--muted-foreground)]">
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-[var(--inv-value)]" />
              {t('investments.history.value')}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-[var(--inv-cost)]" />
              {t('investments.history.invested')}
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
