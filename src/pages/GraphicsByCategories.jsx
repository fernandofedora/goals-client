import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, XAxis,
} from 'recharts';
import api from '../api';
import Select from '../components/ui/select';
import DateRangePicker from '../components/ui/date-range-picker';
import CategoryMultiSelect from '../components/ui/category-multi-select';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent,
} from '../components/ui/chart';
import { useCurrency } from '../context/CurrencyContext';

const PERIOD_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'Full Year', value: 'year' },
  ...Array.from({ length: 12 }, (_, i) => ({
    label: new Date(0, i).toLocaleString('en', { month: 'long' }),
    value: String(i + 1).padStart(2, '0'),
  })),
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toISODate = (d) => (d ? d.toISOString().slice(0, 10) : null);

function formatTick(value, granularity) {
  if (!value) return '';
  if (granularity === 'day') return value.slice(8, 10); // DD
  // monthly: YYYY-MM → "Jan" / "Jan 25" depending on span
  const [, mStr] = value.split('-');
  return MONTH_LABELS[Number(mStr) - 1] || value;
}

function readJSONArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

export default function GraphicsByCategories() {
  const { symbol: cs } = useCurrency();

  // ── Period state (mirrors Dashboard pattern, independent localStorage keys) ──
  const [filterMode, setFilterMode] = useState(() => localStorage.getItem('graphics_filter_mode') || 'period');
  const [period, setPeriod] = useState(() => localStorage.getItem('graphics_period') || 'year');
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('graphics_year');
    return saved ? Number(saved) : new Date().getFullYear();
  });
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [txType, setTxType] = useState(() => localStorage.getItem('graphics_tx_type') || 'expense');

  // ── Selected category IDs ──
  const [selectedIds, setSelectedIds] = useState(() => readJSONArray('graphics_selected_cats') || []);
  const [didInitDefaults, setDidInitDefaults] = useState(() => readJSONArray('graphics_selected_cats') !== null);

  // ── Data ──
  const [allCategories, setAllCategories] = useState([]); // for the multi-select trigger UI
  const [data, setData] = useState({ granularity: 'month', series: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Persist filters ──
  useEffect(() => { localStorage.setItem('graphics_filter_mode', filterMode); }, [filterMode]);
  useEffect(() => { localStorage.setItem('graphics_period', period); }, [period]);
  useEffect(() => { localStorage.setItem('graphics_year', String(selectedYear)); }, [selectedYear]);
  useEffect(() => { localStorage.setItem('graphics_tx_type', txType); }, [txType]);
  useEffect(() => {
    localStorage.setItem('graphics_selected_cats', JSON.stringify(selectedIds));
  }, [selectedIds]);

  // ── Load all categories once (for the multi-select dropdown options) ──
  useEffect(() => {
    let alive = true;
    api.get('/categories')
      .then(res => { if (alive) setAllCategories(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // ── First-time default: pre-select all categories of the current type ──
  useEffect(() => {
    if (didInitDefaults) return;
    if (allCategories.length === 0) return;
    const defaults = allCategories.filter(c => c.type === txType).map(c => c.id);
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
    const isRangeMode = filterMode === 'range' && dateRange?.from && dateRange?.to;
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
    api.get('/stats/categories-timeline', { params })
      .then(res => {
        if (!alive) return;
        setData({
          granularity: res.data?.granularity || 'month',
          series: Array.isArray(res.data?.series) ? res.data.series : [],
          categories: Array.isArray(res.data?.categories) ? res.data.categories : [],
        });
      })
      .catch(err => {
        if (!alive) return;
        setError(err.response?.data?.message || 'Failed to load timeline');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedIds, filterMode, period, selectedYear, dateRange, txType]);

  // ── Filter the multi-select pool by current txType so user only sees relevant ones ──
  const filteredCategories = useMemo(
    () => allCategories.filter(c => c.type === txType),
    [allCategories, txType]
  );

  // ── Year dropdown options (7 most recent years) ──
  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => cur - i);
  }, []);

  // ── Per-category color map (uses Category.color or a fallback palette) ──
  const colorByCatId = useMemo(() => {
    const fallback = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];
    return Object.fromEntries(
      data.categories.map((c, i) => [c.id, c.color || fallback[i % fallback.length]])
    );
  }, [data.categories]);

  // ── Chart config (kept for ChartContainer's potential CSS var injection) ──
  const chartConfig = useMemo(
    () => Object.fromEntries(
      data.categories.map(c => [`cat_${c.id}`, { label: c.name, color: colorByCatId[c.id] }])
    ),
    [data.categories, colorByCatId]
  );

  const subtitle = useMemo(() => {
    if (filterMode === 'range' && dateRange?.from && dateRange?.to) {
      return `${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (period === 'all') return 'All time';
    if (period === 'year') return `Full year ${selectedYear}`;
    const monthLabel = new Date(0, Number(period) - 1).toLocaleString('en', { month: 'long' });
    return `${monthLabel} ${selectedYear}`;
  }, [filterMode, dateRange, period, selectedYear]);

  const hasAnyValue = useMemo(() => {
    if (data.series.length === 0) return false;
    return data.series.some(p =>
      Object.keys(p).some(k => k !== 'period' && Number(p[k]) > 0)
    );
  }, [data.series]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Graphics by Categories</h2>
            <p className="text-xs text-gray-400 mt-0.5">Monthly spending evolution per category.</p>
          </div>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5 space-y-4">
        {/* Row 1: category multi-select + type */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Categories
            </label>
            <CategoryMultiSelect
              categories={filteredCategories}
              selectedIds={selectedIds.filter(id => filteredCategories.some(c => c.id === id))}
              onChange={setSelectedIds}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Type
            </label>
            <Select
              value={txType}
              onChange={(e) => {
                const next = e.target.value;
                setTxType(next);
                // Reset selection to all of the new type so user isn't stuck with mismatched IDs
                const matching = allCategories.filter(c => c.type === next).map(c => c.id);
                setSelectedIds(matching);
              }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
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
              Month
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-2 transition-colors border-l border-[var(--border)] ${
                filterMode === 'range'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              Range
            </button>
          </div>

          {filterMode === 'period' ? (
            <>
              <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              <Select value={String(selectedYear)} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
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
            <h3 className="text-base font-semibold">Spending evolution</h3>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
          {data.series.length > 0 && (
            <span className="text-xs text-gray-400 tabular-nums">
              {data.series.length} {data.granularity === 'day' ? 'days' : 'months'} · {data.categories.length} categor{data.categories.length === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>

        {loading && (
          <div className="h-[360px] flex items-center justify-center text-sm text-gray-400 animate-pulse">
            Loading chart…
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
            <p className="text-sm text-gray-400">Select at least one category to see its evolution.</p>
          </div>
        )}

        {!loading && !error && selectedIds.length > 0 && !hasAnyValue && (
          <div className="h-[360px] flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl opacity-30">📭</span>
            <p className="text-sm text-gray-400">No transactions for the selected period.</p>
          </div>
        )}

        {!loading && !error && selectedIds.length > 0 && hasAnyValue && (
          <ChartContainer config={chartConfig} style={{ height: 360 }}>
            <LineChart data={data.series} margin={{ top: 20, left: 12, right: 12 }}>
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
                        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                      }
                      const [y, m] = String(label).split('-');
                      return `${new Date(0, Number(m) - 1).toLocaleString('en', { month: 'long' })} ${y}`;
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {data.categories.map(c => {
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
