import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';
import api from '../api';
import Select from '../components/ui/select';
import DateRangePicker from '../components/ui/date-range-picker';
import CategoryMultiSelect from '../components/ui/category-multi-select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../components/ui/chart';
import { useCurrency } from '../context/CurrencyContext';
import {
  getPref,
  setPref,
  getPrefJSON,
  setPrefJSON,
} from '../utils/userStorage';
import { intlLocale } from '../utils/dateLocale';
import { translateServerError } from '../utils/serverError';

const toISODate = (d) => (d ? d.toISOString().slice(0, 10) : null);

function formatTick(value, granularity) {
  if (!value) return '';
  if (granularity === 'day') return value.slice(8, 10); // DD
  // monthly: YYYY-MM → localized short month
  const [, mStr] = value.split('-');
  return (
    new Date(0, Number(mStr) - 1).toLocaleString(intlLocale(), {
      month: 'short',
    }) || value
  );
}

function readJSONArray(key) {
  const parsed = getPrefJSON(key, null);
  return Array.isArray(parsed) ? parsed : null;
}

export default function GraphicsByCategories() {
  const { t } = useTranslation();
  const { symbol: cs } = useCurrency();

  const PERIOD_OPTIONS = useMemo(
    () => [
      { label: t('graphics.allTime'), value: 'all' },
      { label: t('graphics.fullYear'), value: 'year' },
      ...Array.from({ length: 12 }, (_, i) => ({
        label: new Date(0, i).toLocaleString(intlLocale(), { month: 'long' }),
        value: String(i + 1).padStart(2, '0'),
      })),
    ],
    [t],
  );

  // ── Period state (mirrors Dashboard pattern, independent localStorage keys) ──
  const [filterMode, setFilterMode] = useState(() =>
    getPref('graphics_filter_mode', 'period'),
  );
  const [period, setPeriod] = useState(() =>
    getPref('graphics_period', 'year'),
  );
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = getPref('graphics_year');
    return saved ? Number(saved) : new Date().getFullYear();
  });
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });
  const [txType, setTxType] = useState(() =>
    getPref('graphics_tx_type', 'expense'),
  );

  // ── Selected category IDs ──
  const [selectedIds, setSelectedIds] = useState(
    () => readJSONArray('graphics_selected_cats') || [],
  );
  const [didInitDefaults, setDidInitDefaults] = useState(
    () => readJSONArray('graphics_selected_cats') !== null,
  );

  // ── Data ──
  const [allCategories, setAllCategories] = useState([]); // for the multi-select trigger UI
  const [data, setData] = useState({
    granularity: 'month',
    series: [],
    categories: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Persist filters ──
  useEffect(() => {
    setPref('graphics_filter_mode', filterMode);
  }, [filterMode]);
  useEffect(() => {
    setPref('graphics_period', period);
  }, [period]);
  useEffect(() => {
    setPref('graphics_year', String(selectedYear));
  }, [selectedYear]);
  useEffect(() => {
    setPref('graphics_tx_type', txType);
  }, [txType]);
  useEffect(() => {
    setPrefJSON('graphics_selected_cats', selectedIds);
  }, [selectedIds]);

  // ── Load all categories once (for the multi-select dropdown options) ──
  useEffect(() => {
    let alive = true;
    api
      .get('/categories')
      .then((res) => {
        if (alive) setAllCategories(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // ── First-time default: pre-select all categories of the current type ──
  useEffect(() => {
    if (didInitDefaults) return;
    if (allCategories.length === 0) return;
    const defaults = allCategories
      .filter((c) => c.type === txType)
      .map((c) => c.id);
    setSelectedIds(defaults);
    setDidInitDefaults(true);
  }, [allCategories, txType, didInitDefaults]);

  // ── Build query params + fetch timeline ──
  useEffect(() => {
    if (selectedIds.length === 0) {
      setData({ granularity: 'month', series: [], categories: [] });
      return;
    }
    const params = { categoryIds: selectedIds.join(',') };
    const isRangeMode =
      filterMode === 'range' && dateRange?.from && dateRange?.to;
    if (isRangeMode) {
      params.from = toISODate(dateRange.from);
      params.to = toISODate(dateRange.to);
    } else if (period === 'all') {
      params.period = 'all';
    } else if (period === 'year') {
      params.period = String(selectedYear);
    } else {
      params.period = `${selectedYear}-${period}`;
    }

    let alive = true;
    setLoading(true);
    setError('');
    api
      .get('/stats/categories-timeline', { params })
      .then((res) => {
        if (!alive) return;
        setData({
          granularity: res.data?.granularity || 'month',
          series: Array.isArray(res.data?.series) ? res.data.series : [],
          categories: Array.isArray(res.data?.categories)
            ? res.data.categories
            : [],
        });
      })
      .catch((err) => {
        if (!alive) return;
        setError(translateServerError(err, t, 'graphics.loadFailed'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedIds, filterMode, period, selectedYear, dateRange, txType, t]);

  // ── Filter the multi-select pool by current txType so user only sees relevant ones ──
  const filteredCategories = useMemo(
    () => allCategories.filter((c) => c.type === txType),
    [allCategories, txType],
  );

  // ── Year dropdown options (7 most recent years) ──
  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => cur - i);
  }, []);

  // ── Per-category color map (uses Category.color or a fallback palette) ──
  const colorByCatId = useMemo(() => {
    const fallback = [
      '#6366f1',
      '#10b981',
      '#f59e0b',
      '#f43f5e',
      '#0ea5e9',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
      '#f97316',
      '#84cc16',
    ];
    return Object.fromEntries(
      data.categories.map((c, i) => [
        c.id,
        c.color || fallback[i % fallback.length],
      ]),
    );
  }, [data.categories]);

  // ── Chart config (kept for ChartContainer's potential CSS var injection) ──
  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        data.categories.map((c) => [
          `cat_${c.id}`,
          { label: c.name, color: colorByCatId[c.id] },
        ]),
      ),
    [data.categories, colorByCatId],
  );

  const subtitle = useMemo(() => {
    if (filterMode === 'range' && dateRange?.from && dateRange?.to) {
      return `${dateRange.from.toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric', year: 'numeric' })} → ${dateRange.to.toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (period === 'all') return t('graphics.subtitleAllTime');
    if (period === 'year')
      return t('graphics.subtitleFullYear', { year: selectedYear });
    const monthLabel = new Date(0, Number(period) - 1).toLocaleString(
      intlLocale(),
      { month: 'long' },
    );
    return `${monthLabel} ${selectedYear}`;
  }, [filterMode, dateRange, period, selectedYear, t]);

  const hasAnyValue = useMemo(() => {
    if (data.series.length === 0) return false;
    return data.series.some((p) =>
      Object.keys(p).some((k) => k !== 'period' && Number(p[k]) > 0),
    );
  }, [data.series]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {t('graphics.title')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('graphics.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5 space-y-4">
        {/* Row 1: category multi-select + type */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {t('graphics.categories')}
            </label>
            <CategoryMultiSelect
              categories={filteredCategories}
              selectedIds={selectedIds.filter((id) =>
                filteredCategories.some((c) => c.id === id),
              )}
              onChange={setSelectedIds}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {t('graphics.type')}
            </label>
            <Select
              value={txType}
              onChange={(e) => {
                const next = e.target.value;
                setTxType(next);
                // Reset selection to all of the new type so user isn't stuck with mismatched IDs
                const matching = allCategories
                  .filter((c) => c.type === next)
                  .map((c) => c.id);
                setSelectedIds(matching);
              }}
            >
              <option value="expense">{t('graphics.expense')}</option>
              <option value="income">{t('graphics.income')}</option>
            </Select>
          </div>
        </div>

        {/* Row 2: period selector */}
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm font-medium">
            <button
              onClick={() => setFilterMode('period')}
              className={`px-3 py-2 transition-colors ${
                filterMode === 'period'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('graphics.month')}
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-2 transition-colors border-l border-[var(--border)] ${
                filterMode === 'range'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {t('graphics.range')}
            </button>
          </div>

          {filterMode === 'period' ? (
            <>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Select
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </>
          ) : (
            <DateRangePicker range={dateRange} onChange={setDateRange} />
          )}
        </div>
      </div>

      {/* ── Chart ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold">
              {t('graphics.spendingEvolution')}
            </h3>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
          {data.series.length > 0 && (
            <span className="text-xs text-gray-400 tabular-nums">
              {t('graphics.rangeCount', {
                count: data.series.length,
                unit:
                  data.granularity === 'day'
                    ? t('graphics.days')
                    : t('graphics.months'),
              })}{' '}
              · {t('graphics.categoryCount', { count: data.categories.length })}
            </span>
          )}
        </div>

        {loading && (
          <div className="h-[360px] flex items-center justify-center text-sm text-gray-400 animate-pulse">
            {t('graphics.loadingChart')}
          </div>
        )}

        {!loading && error && (
          <div className="h-[360px] flex items-center justify-center text-sm text-rose-500">
            {error}
          </div>
        )}

        {!loading && !error && selectedIds.length === 0 && (
          <div className="h-[360px] flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl opacity-30">📈</span>
            <p className="text-sm text-gray-400">
              {t('graphics.selectAtLeastOne')}
            </p>
          </div>
        )}

        {!loading && !error && selectedIds.length > 0 && !hasAnyValue && (
          <div className="h-[360px] flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl opacity-30">📭</span>
            <p className="text-sm text-gray-400">
              {t('graphics.noTransactionsPeriod')}
            </p>
          </div>
        )}

        {!loading && !error && selectedIds.length > 0 && hasAnyValue && (
          <ChartContainer config={chartConfig} style={{ height: 360 }}>
            <LineChart
              data={data.series}
              margin={{ top: 20, left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} strokeOpacity={0.3} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => formatTick(v, data.granularity)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(v) => `${cs}${Number(v ?? 0).toFixed(2)}`}
                    labelFormatter={(label) => {
                      if (!label) return '';
                      if (data.granularity === 'day') {
                        const d = new Date(`${label}T00:00:00`);
                        return d.toLocaleDateString(intlLocale(), {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      }
                      const [y, m] = String(label).split('-');
                      return `${new Date(0, Number(m) - 1).toLocaleString(intlLocale(), { month: 'long' })} ${y}`;
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {data.categories.map((c) => {
                const color = colorByCatId[c.id];
                return (
                  <Line
                    key={c.id}
                    dataKey={`cat_${c.id}`}
                    name={c.name}
                    type="natural"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, stroke: color, r: 3 }}
                    activeDot={{ r: 6, fill: color, stroke: color }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
