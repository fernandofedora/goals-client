import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/button';
import api from '../api';
import Select from '../components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, Sector, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, ChartTooltip, ChartLegend } from '../components/ui/chart';

const monthOptions = [
  { label: 'All Time', value: 'all' },
  ...Array.from({ length: 12 }, (_, i) => ({ label: new Date(0, i).toLocaleString('en', { month: 'long' }), value: String(i + 1).padStart(2, '0') }))
];

const barChartConfig = {
  income: { label: 'Income', color: '#10b981' },
  expense: { label: 'Expenses', color: '#f43f5e' },
};

const incomeMethodConfig = {
  cash: { label: 'Cash', color: '#10b981' },
  account: { label: 'Account', color: '#38bdf8' },
};

const currencyFormatter = (v) => `$${Number(v ?? 0).toFixed(2)}`;

// Custom active-sector Pie shape (shadcn donut style)
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="currentColor" className="text-sm font-semibold" style={{ fill: fill }}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#6b7280" style={{ fontSize: 12 }}>
        {currencyFormatter(value)} · {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.4} />
    </g>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(() => localStorage.getItem('dashboard_period') || 'all');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);
  // ── Bank accounts: current balance per account ────────────────────────────
  const [bankBalances, setBankBalances] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [initialBalance, setInitialBalance] = useState(null);
  const [finalBalance, setFinalBalance] = useState(null);
  const [allTimeSummary, setAllTimeSummary] = useState(null);
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('dashboard_year');
    return saved ? Number(saved) : new Date().getFullYear();
  });
  const [yearLoadError, setYearLoadError] = useState('');

  // Active pie slices
  const [activeCatIdx, setActiveCatIdx] = useState(0);
  const [activeIncomeIdx, setActiveIncomeIdx] = useState(0);

  useEffect(() => { localStorage.setItem('dashboard_period', period); }, [period]);
  useEffect(() => { localStorage.setItem('dashboard_year', String(selectedYear)); }, [selectedYear]);

  const formatCurrency = (value) => {
    try { return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(Number(value || 0)); }
    catch { return `$${Number(value || 0).toFixed(2)}`; }
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (period === 'all' && summary?.incomeVsExpense?.length) {
      const years = Array.from(new Set(summary.incomeVsExpense.map(i => Number(String(i.date).slice(0, 4))))).filter(Boolean).sort((a, b) => b - a);
      return years.length ? years : Array.from({ length: 7 }, (_, i) => currentYear - i);
    }
    return Array.from({ length: 7 }, (_, i) => currentYear - i);
  }, [summary, period]);

  const fetchSummary = async () => {
    setLoading(true); setError('');
    try {
      const params = period === 'all' ? { period } : { period: `${selectedYear}-${period}` };
      const { data } = await api.get('/stats/summary', { params });
      setSummary(data);

      if (period !== 'all') {
        const allTime = await api.get('/stats/summary', { params: { period: 'all' } });
        setAllTimeSummary(allTime.data);
        const curIncome = Number(data?.totals?.income || 0);
        const curExpense = Number(data?.totals?.expense || 0);
        const monthNet = curIncome - curExpense;
        const curMonth = Number(period);
        const prevMonth = String(curMonth === 1 ? 12 : curMonth - 1).padStart(2, '0');
        const prevYear = curMonth === 1 ? selectedYear - 1 : selectedYear;
        try {
          const prev = await api.get('/stats/summary', { params: { period: `${prevYear}-${prevMonth}` } });
          const prevBalance = Number(prev?.data?.totals?.income || 0) - Number(prev?.data?.totals?.expense || 0);
          setInitialBalance(prevBalance);
          setFinalBalance(prevBalance + monthNet);
        } catch {
          setInitialBalance(0); setFinalBalance(monthNet);
        }
      } else {
        setInitialBalance(null); setFinalBalance(null); setAllTimeSummary(null);
      }
    } catch (err) { setError(err.response?.data?.message || 'Failed to load summary'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSummary(); }, [period, selectedYear]);

  // async-parallel: fetch accounts then all their tx sums concurrently
  const fetchBankBalances = async () => {
    setBankLoading(true);
    try {
      const { data: accounts } = await api.get('/accounts');
      if (!accounts.length) { setBankBalances([]); return; }

      // Fetch all accounts' transactions in parallel (no waterfall)
      const txResults = await Promise.all(
        accounts.map(acc => api.get('/transactions', { params: { accountId: acc.id } }))
      );

      const balances = accounts.map((acc, i) => {
        const txList = Array.isArray(txResults[i].data) ? txResults[i].data : (txResults[i].data.items || []);
        const income = txList.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expense = txList.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const current = Number(acc.initialBalance || 0) + income - expense;
        return { ...acc, income, expense, current };
      });
      setBankBalances(balances);
    } catch { /* non-blocking: leave stale data */ }
    finally { setBankLoading(false); }
  };

  useEffect(() => { fetchBankBalances(); }, []);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/cards'); setCards(data || []); } catch { }
    })();
  }, []);

  const [barData, setBarData] = useState([]);
  useEffect(() => {
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = Array.from({ length: 12 }, (_, i) => ({
      key: `${selectedYear}-${String(i + 1).padStart(2, '0')}`, label: monthLabels[i]
    }));
    setYearLoadError('');

    const buildFromSummaryAll = () => {
      const agg = (summary?.incomeVsExpense || []).reduce((acc, item) => {
        const key = String(item.date).slice(0, 7);
        const yr = Number(String(item.date).slice(0, 4));
        if (yr !== selectedYear) return acc;
        if (!acc[key]) acc[key] = { income: 0, expense: 0 };
        acc[key].income += Number(item.income || 0);
        acc[key].expense += Number(item.expense || 0);
        return acc;
      }, {});
      setBarData(months.map(m => ({ month: m.label, income: agg[m.key]?.income || 0, expense: agg[m.key]?.expense || 0 })));
    };

    const buildByFetchingYear = async () => {
      try {
        const results = await Promise.all(months.map(async (m, i) => {
          const { data } = await api.get('/stats/summary', { params: { period: `${selectedYear}-${String(i + 1).padStart(2, '0')}` } });
          return { month: monthLabels[i], income: Number(data?.totals?.income || 0), expense: Number(data?.totals?.expense || 0) };
        }));
        setBarData(results); setYearLoadError('');
      } catch (e) {
        setYearLoadError('Could not load year data.');
        setBarData(months.map(m => ({ month: m.label, income: 0, expense: 0 })));
      }
    };

    if (period === 'all') buildFromSummaryAll();
    else buildByFetchingYear();
  }, [selectedYear, period, summary]);

  const paymentTotals = useMemo(() => {
    const cash = Number(summary?.paymentMethods?.cash || 0);
    const card = Number(summary?.paymentMethods?.card || 0);
    const total = cash + card;
    const pct = (v) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);
    return { cash, card, total, cashPct: pct(cash), cardPct: pct(card) };
  }, [summary]);

  const perCardUsage = useMemo(() => {
    const map = summary?.perCard || {};
    return Object.keys(map).map((name) => {
      const info = cards.find((c) => c.name === name) || {};
      return { name, amount: Number(map[name] || 0), color: info.color || '#0ea5e9', last4: info.last4 || '' };
    });
  }, [summary, cards]);

  const budgetProgress = useMemo(() => {
    if (!summary) return { budget: 0, actual: 0, remaining: 0, consumedPercent: 0 };
    const budget = Number(summary.budgetAmount || 0);
    const actual = Number(summary.totals?.expense || 0);
    const remaining = budget - actual;
    const consumedPercent = budget > 0 ? Math.round((actual / budget) * 100) : 0;
    return { budget, actual, remaining, consumedPercent };
  }, [summary]);

  const barColorClass = useMemo(() => {
    const cp = budgetProgress.consumedPercent;
    if (budgetProgress.remaining < 0) return 'bg-rose-500';
    if (budgetProgress.budget > 0) {
      const remainingPct = 100 - cp;
      if (remainingPct <= 10) return 'bg-rose-500';
      if (remainingPct <= 30) return 'bg-amber-500';
    }
    return 'bg-emerald-500';
  }, [budgetProgress]);

  const incomeMethodData = useMemo(() =>
    Object.entries(summary?.incomeMethods || {}).map(([name, amount]) => ({ name, amount: Number(amount) })),
    [summary]
  );

  const categoryColors = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

  const onExport = async () => {
    try {
      const params = period === 'all' ? { period } : { period: `${selectedYear}-${period}` };
      const res = await api.get('/stats/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `transactions_${params.period || 'all'}.xlsx`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
  };

  // rerender-derived-state-no-effect: derive net worth during render
  const bankNetWorth = bankBalances.reduce((s, a) => s + a.current, 0);
  const bankMaxBalance = bankBalances.reduce((m, a) => Math.max(m, Math.abs(a.current)), 0);

  const catData = (summary?.categories || []).map((c, i) => ({
    ...c, color: c.color || categoryColors[i % categoryColors.length]
  }));

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">

      {/* ── Header / Overview ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
        <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
          <h2 className="text-xl font-bold tracking-tight">Overview</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => navigate('/transactions')} variant="primary">+ New Transaction</Button>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
            <Select value={String(selectedYear)} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
            <button
              onClick={onExport}
              className="px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors"
            >
              Export XLSX
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-400 animate-pulse">Loading…</p>}
        {error && <div className="px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm">{error}</div>}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Income', value: summary.totals.income, color: 'emerald' },
              { label: 'Expenses', value: summary.totals.expense, color: 'rose' },
              { label: 'Balance', value: summary.totals.income - summary.totals.expense, color: 'indigo' },
              { label: 'Transactions', value: summary.totals.transactions, color: 'amber', isCount: true },
            ].map(({ label, value, color, isCount }) => (
              <div key={label} className={`rounded-xl p-4 bg-${color}-50 dark:bg-${color}-950/30 border border-${color}-100 dark:border-${color}-900/40`}>
                <p className={`text-xs font-medium text-${color}-600 dark:text-${color}-400 uppercase tracking-widest mb-1`}>{label}</p>
                <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-300 tabular-nums`}>
                  {isCount ? value : `$${Number(value).toFixed(2)}`}
                </p>
              </div>
            ))}
            {period !== 'all' && allTimeSummary && (
              <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">All-Time Balance</p>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                  ${(allTimeSummary.totals.income - allTimeSummary.totals.expense).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>


      {/* ── Income vs Expenses Bar Chart ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-semibold">Income vs Expenses</h3>
            <p className="text-xs text-gray-400">Monthly breakdown for {selectedYear}</p>
          </div>
        </div>
        {yearLoadError && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs">{yearLoadError}</div>
        )}
        <ChartContainer config={barChartConfig} style={{ height: 280 }}>
          <BarChart data={barData} barGap={3} barCategoryGap="30%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-slate-800" opacity={0.6} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <ChartTooltip
              cursor={{ fill: 'currentColor', className: 'text-gray-100 dark:text-slate-800', opacity: 0.5 }}
              content={<ChartTooltipContent formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name]} indicator="square" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="expense" name="Expenses" fill={barChartConfig.expense.color} radius={[6, 6, 0, 0]} />
            <Bar dataKey="income" name="Income" fill={barChartConfig.income.color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* ── Two pie charts row ── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Categories Donut */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
          <h3 className="text-base font-semibold mb-1">Expense Categories</h3>
          <p className="text-xs text-gray-400 mb-4">Share of total expenses by category</p>
          {catData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No expense data</div>
          ) : (
            <>
              <ChartContainer config={{}} style={{ height: 220 }}>
                <PieChart>
                  <Pie
                    activeIndex={activeCatIdx}
                    activeShape={renderActiveShape}
                    data={catData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    onMouseEnter={(_, idx) => setActiveCatIdx(idx)}
                  >
                    {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              {/* Legend list */}
              <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800">
                {catData.map((c) => {
                  const totalExp = summary?.totals?.expense || 0;
                  const pct = totalExp > 0 ? ((c.amount / totalExp) * 100).toFixed(1) : 0;
                  return (
                    <li key={c.name} className="flex items-center justify-between py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[160px]">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-gray-400 text-xs">{pct}%</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-100 tabular-nums">${c.amount.toFixed(2)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Income Methods Donut */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
          <h3 className="text-base font-semibold mb-1">Income Methods</h3>
          <p className="text-xs text-gray-400 mb-4">Cash vs. Account deposits</p>
          {incomeMethodData.every(d => d.amount === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No income data</div>
          ) : (
            <>
              <ChartContainer config={incomeMethodConfig} style={{ height: 220 }}>
                <PieChart>
                  <Pie
                    activeIndex={activeIncomeIdx}
                    activeShape={renderActiveShape}
                    data={incomeMethodData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    onMouseEnter={(_, idx) => setActiveIncomeIdx(idx)}
                  >
                    {incomeMethodData.map((d, i) => (
                      <Cell key={i} fill={incomeMethodConfig[d.name]?.color || categoryColors[i]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => currencyFormatter(v)} />} />
                </PieChart>
              </ChartContainer>
              <div className="mt-3 flex gap-4 justify-center">
                {incomeMethodData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: incomeMethodConfig[d.name]?.color || categoryColors[i] }} />
                    <span className="capitalize text-gray-600 dark:text-gray-300">{d.name}</span>
                    <span className="font-semibold tabular-nums">{currencyFormatter(d.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Budget vs Actual ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
        <h3 className="text-base font-semibold mb-1">Budget vs Actual</h3>
        <p className="text-xs text-gray-400 mb-4">{period === 'all' ? 'Select a specific month to compare against budget.' : 'Expense tracking vs. your monthly budget.'}</p>
        {period === 'all' ? null : summary?.budgetAmount == null ? (
          <p className="text-sm text-gray-400">No budget set for this month.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Budget <span className="font-semibold text-gray-800 dark:text-white">${budgetProgress.budget.toFixed(2)}</span></span>
              <span className="text-gray-500 dark:text-gray-400">Spent <span className="font-semibold text-rose-600">${budgetProgress.actual.toFixed(2)}</span></span>
              <span className="text-gray-500 dark:text-gray-400">
                Remaining <span className={`font-semibold ${budgetProgress.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>${budgetProgress.remaining.toFixed(2)}</span>
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-3 ${barColorClass} rounded-full transition-all duration-700`}
                style={{ width: `${Math.min(budgetProgress.consumedPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {budgetProgress.consumedPercent}% consumed{budgetProgress.consumedPercent > 100 ? ' — over budget!' : ''}
            </p>
          </div>
        )}
      </div>

      {/* ── Saldo + Payment Methods + Card Usage ── */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* Saldo Inicial vs Final */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
          <h3 className="text-base font-semibold mb-1">Monthly Balance</h3>
          <p className="text-xs text-gray-400 mb-4">Opening vs. closing balance</p>
          {period === 'all' ? (
            <p className="text-sm text-gray-400">Select a specific month to view.</p>
          ) : initialBalance == null || finalBalance == null ? (
            <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
          ) : (
            <div className="flex flex-col gap-4">
              {[
                { label: 'Opening', value: initialBalance, color: '#6366f1' },
                { label: 'Closing', value: finalBalance, color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between rounded-xl p-4" style={{ background: color + '18', border: `1px solid ${color}33` }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color }}>{formatCurrency(value)}</p>
                  </div>
                  <span className="text-3xl opacity-20">{label === 'Opening' ? '⬆' : '⬇'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
          <h3 className="text-base font-semibold mb-1">Payment Methods</h3>
          <p className="text-xs text-gray-400 mb-4">Expense split by method</p>
          <div className="space-y-3">
            {[
              { label: 'Cash', amount: paymentTotals.cash, pct: paymentTotals.cashPct, color: '#10b981', icon: '💵' },
              { label: 'Credit Cards', amount: paymentTotals.card, pct: paymentTotals.cardPct, color: '#0ea5e9', icon: '💳' },
            ].map(({ label, amount, pct, color, icon }) => (
              <div key={label} className="rounded-xl p-4 flex items-center justify-between" style={{ background: color + '12', border: `1px solid ${color}30` }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color }}>${amount.toFixed(2)}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold" style={{ color }}>{pct}%</span>
              </div>
            ))}
            <div className="text-right text-xs text-gray-400 pt-1">
              Total spent: <span className="font-semibold text-gray-700 dark:text-gray-200">${paymentTotals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Credit Card Usage */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5">
          <h3 className="text-base font-semibold mb-1">Card Usage</h3>
          <p className="text-xs text-gray-400 mb-4">Spending per credit card</p>
          {perCardUsage.length === 0 ? (
            <p className="text-sm text-gray-400">No card expenses yet.</p>
          ) : (
            <div className="space-y-3">
              {perCardUsage.map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-xl p-4" style={{ background: c.color + '12', border: `1px solid ${c.color}30` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💳</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{c.name}</p>
                      {c.last4 && <p className="text-xs text-gray-400">•••• {c.last4}</p>}
                    </div>
                  </div>
                  <p className="text-lg font-bold tabular-nums" style={{ color: c.color }}>${c.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bank Accounts overview ── */}
      {(bankBalances.length > 0 || bankLoading) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Bank Accounts</h2>
              <p className="text-xs text-gray-400 mt-0.5">Current balance across all accounts</p>
            </div>
            {bankBalances.length > 0 && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Net Worth</span>
                <span className={`text-xl font-bold tabular-nums ${bankNetWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                  }`}>
                  ${bankNetWorth.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {bankLoading ? (
            <div className="px-5 py-8 flex items-center gap-2 text-sm text-gray-400 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-current inline-block" />
              Loading balances…
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {bankBalances.map((acc) => {
                const pct = bankMaxBalance > 0 ? Math.abs(acc.current) / bankMaxBalance : 0;
                const isNeg = acc.current < 0;
                return (
                  <li key={acc.id} className="px-5 py-4 hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                          style={{ background: acc.color || '#10b981' }}
                        >
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{acc.name}</p>
                          <p className="text-[11px] text-gray-400">
                            Opens ${Number(acc.initialBalance || 0).toFixed(2)}
                            &ensp;·&ensp;+${acc.income.toFixed(2)} income
                            &ensp;·&ensp;−${acc.expense.toFixed(2)} expenses
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={`text-base font-bold tabular-nums ${isNeg ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                          {isNeg ? '−' : '+'}${Math.abs(acc.current).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isNeg ? 'bg-rose-400' : 'bg-emerald-500'
                          }`}
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
