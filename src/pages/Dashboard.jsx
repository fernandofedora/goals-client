import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Select from '../components/ui/select';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend, CartesianGrid } from 'recharts';

const monthOptions = [
  { label: 'All Time', value: 'all' },
  ...Array.from({ length: 12 }, (_, i) => ({ label: new Date(0, i).toLocaleString('en', { month: 'long' }), value: String(i+1).padStart(2, '0') }))
];

export default function Dashboard() {
  const [period, setPeriod] = useState(() => localStorage.getItem('dashboard_period') || 'all');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);
  const [initialBalance, setInitialBalance] = useState(null);
  const [finalBalance, setFinalBalance] = useState(null);
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('dashboard_year');
    return saved ? Number(saved) : new Date().getFullYear();
  });
  const [yearLoadError, setYearLoadError] = useState('');

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('dashboard_period', period);
  }, [period]);

  useEffect(() => {
    localStorage.setItem('dashboard_year', String(selectedYear));
  }, [selectedYear]);

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
    } catch {
      return `$${Number(value || 0).toFixed(2)}`;
    }
  };

  // Build year options from available data when possible, else fallback to recent years
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

      // Calcular saldo inicial/final solo si es un mes específico
      if (period !== 'all') {
        const curIncome = Number(data?.totals?.income || 0);
        const curExpense = Number(data?.totals?.expense || 0);
        const monthNet = curIncome - curExpense; // variación del mes

        // Mes previo y posible cambio de año
        const curMonth = Number(period);
        const prevMonth = String(curMonth === 1 ? 12 : curMonth - 1).padStart(2, '0');
        const prevYear = curMonth === 1 ? selectedYear - 1 : selectedYear;
        const prevParams = { period: `${prevYear}-${prevMonth}` };
        try {
          const prev = await api.get('/stats/summary', { params: prevParams });
          const prevIncome = Number(prev?.data?.totals?.income || 0);
          const prevExpense = Number(prev?.data?.totals?.expense || 0);
          const prevBalance = prevIncome - prevExpense;
          setInitialBalance(prevBalance);
          setFinalBalance(prevBalance + monthNet);
        } catch {
          // Si falla el mes previo, asumimos saldo inicial 0 para no romper la vista
          setInitialBalance(0);
          setFinalBalance(monthNet);
        }
      } else {
        setInitialBalance(null);
        setFinalBalance(null);
      }
    } catch (err) { setError(err.response?.data?.message || 'Failed to load summary'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSummary(); }, [period, selectedYear]);

  // Cargar tarjetas para uso en Credit Card Usage
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/cards');
        setCards(data || []);
      } catch {
        // omitimos el error aquí para no bloquear el dashboard
      }
    })();
  }, []);

  // Datos mensuales para el gráfico de Ingresos vs Gastos (enero–diciembre del año seleccionado)
  const [barData, setBarData] = useState([]);
  useEffect(() => {
    const monthLabels = ['ene','feb','mar','abr','may','jun','jul','ago','sept','oct','nov','dic'];
    const months = Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, '0');
      return { key: `${selectedYear}-${mm}`, label: monthLabels[i] };
    });
    setYearLoadError('');

    const buildFromSummaryAll = () => {
      const agg = (summary?.incomeVsExpense || []).reduce((acc, item) => {
        const key = String(item.date).slice(0, 7); // YYYY-MM
        const yr = Number(String(item.date).slice(0, 4));
        if (yr !== selectedYear) return acc; // filtrar al año seleccionado
        if (!acc[key]) acc[key] = { income: 0, expense: 0 };
        acc[key].income += Number(item.income || 0);
        acc[key].expense += Number(item.expense || 0);
        return acc;
      }, {});
      setBarData(months.map(m => ({ month: m.label, income: agg[m.key]?.income || 0, expense: agg[m.key]?.expense || 0 })));
      setYearLoadError('');
    };

    const buildByFetchingYear = async () => {
      try {
        const results = await Promise.all(
          months.map(async (m, i) => {
            const mm = String(i + 1).padStart(2, '0');
            const { data } = await api.get('/stats/summary', { params: { period: `${selectedYear}-${mm}` } });
            const income = Number(data?.totals?.income || 0);
            const expense = Number(data?.totals?.expense || 0);
            return { month: monthLabels[i], income, expense };
          })
        );
        setBarData(results);
        setYearLoadError('');
      } catch (e) {
        console.error('Error al cargar resúmenes mensuales del año', { year: selectedYear, error: e });
        setYearLoadError('No se pudo cargar los datos del año seleccionado.');
        // Si algo falla, dejamos datos vacíos para no romper la vista
        setBarData(months.map(m => ({ month: m.label, income: 0, expense: 0 })));
      }
    };

    if (period === 'all') buildFromSummaryAll();
    else buildByFetchingYear();
  }, [selectedYear, period, summary]);

  // Totales y porcentajes de métodos de pago
  const paymentTotals = useMemo(() => {
    const cash = Number(summary?.paymentMethods?.cash || 0);
    const card = Number(summary?.paymentMethods?.card || 0);
    const total = cash + card;
    const pct = (v) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);
    return { cash, card, total, cashPct: pct(cash), cardPct: pct(card) };
  }, [summary]);

  // Uso por tarjeta, enriquecido con color y last4
  const perCardUsage = useMemo(() => {
    const map = summary?.perCard || {};
    return Object.keys(map).map((name) => {
      const info = cards.find((c) => c.name === name) || {};
      return {
        name,
        amount: Number(map[name] || 0),
        color: info.color || '#0ea5e9',
        last4: info.last4 || '',
      };
    });
  }, [summary, cards]);

  // Budget vs Actual progress (only meaningful for a specific month)
  const budgetProgress = useMemo(() => {
    if (!summary) return { budget: 0, actual: 0, remaining: 0, consumedPercent: 0 };
    const budget = Number(summary.budgetAmount || 0);
    const actual = Number(summary.totals?.expense || 0);
    const remaining = budget - actual;
    const consumedPercent = budget > 0 ? Math.round((actual / budget) * 100) : 0;
    return { budget, actual, remaining, consumedPercent };
  }, [summary]);

  // Color de barra con umbrales (30% restante -> naranja, 10% restante -> rojo)
  const barColorClass = useMemo(() => {
    const cp = budgetProgress.consumedPercent;
    if (budgetProgress.remaining < 0) return 'bg-rose-500'; // sobre presupuesto
    if (budgetProgress.budget > 0) {
      const remainingPct = 100 - cp; // porcentaje restante del presupuesto
      if (remainingPct <= 10) return 'bg-rose-500'; // rojo si falta 10% o menos
      if (remainingPct <= 30) return 'bg-orange-500'; // naranja si falta 30% o menos
    }
    return 'bg-emerald-500';
  }, [budgetProgress]);

  const onExport = async () => {
    try {
      const params = period === 'all' ? { period } : { period: `${selectedYear}-${period}` };
      const res = await api.get('/stats/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `transactions_${params.period || 'all'}.xlsx`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch {
      alert('Export failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Overview</h3>
          <div className="flex items-center gap-2">
            <Select value={period} onChange={(e)=>setPeriod(e.target.value)}>
              {monthOptions.map(m=> <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
            <Select value={String(selectedYear)} onChange={(e)=>setSelectedYear(Number(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        </div>
        {loading && <p className="text-gray-500 dark:text-gray-400">Loading...</p>}
        {error && <div className="px-3 py-2 rounded-md bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">{error}</div>}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">Income</div>
              <div className="text-2xl font-semibold text-emerald-600">${summary.totals.income.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">Expenses</div>
              <div className="text-2xl font-semibold text-rose-600">${summary.totals.expense.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">Balance</div>
              <div className="text-2xl font-semibold">${(summary.totals.income - summary.totals.expense).toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">Transactions</div>
              <div className="text-2xl font-semibold">{summary.totals.transactions}</div>
            </div>
          </div>
        )}
      </div>

      {/* Saldo Inicial vs Saldo Final */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Saldo inicial vs. saldo final</h3>
        {period === 'all' ? (
          <p className="text-gray-500 dark:text-gray-400">Selecciona un mes específico para ver el saldo inicial y final.</p>
        ) : initialBalance == null || finalBalance == null ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
        ) : (
          <div className="flex items-end justify-center gap-6" style={{ height: 220 }}>
            {/* Barra saldo inicial */}
            {(() => {
              const maxVal = Math.max(Math.abs(initialBalance), Math.abs(finalBalance));
              const base = 40; // altura mínima
              const scale = maxVal > 0 ? Math.round((Math.abs(initialBalance) / maxVal) * 150) : 0;
              const height = base + scale;
              return (
                <div className="flex flex-col items-center">
                  <div className="w-16" style={{ height }}>
                    <div className="h-full w-full rounded bg-slate-700" />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-700">SALDO INICIAL</div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">{formatCurrency(initialBalance)}</div>
                </div>
              );
            })()}

            {/* separador */}
            <div className="h-full border-l border-dashed border-gray-300 dark:border-slate-600" />

            {/* Barra saldo final */}
            {(() => {
              const maxVal = Math.max(Math.abs(initialBalance), Math.abs(finalBalance));
              const base = 40;
              const scale = maxVal > 0 ? Math.round((Math.abs(finalBalance) / maxVal) * 150) : 0;
              const height = base + scale;
              return (
                <div className="flex flex-col items-center">
                  <div className="w-16" style={{ height }}>
                    <div className="h-full w-full rounded bg-orange-500" />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-orange-600">SALDO FINAL</div>
                  <div className="text-sm text-orange-600">{formatCurrency(finalBalance)}</div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Income vs Expenses</h3>
          <button className="px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-700" onClick={onExport}>Export XLSX</button>
        </div>
        {yearLoadError && (
          <div className="mb-2 px-3 py-2 rounded-md bg-amber-50 text-amber-700 text-sm">
            {yearLoadError}
          </div>
        )}
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="expense" name="expenses" fill="#ef4444" />
              <Bar dataKey="income" name="income" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Budget vs Actual - Progress bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Budget vs Actual</h3>
        {period === 'all' ? (
          <p className="text-gray-500 dark:text-gray-400">Select a specific month to compare against the monthly budget.</p>
        ) : summary?.budgetAmount == null ? (
          <p className="text-gray-500 dark:text-gray-400">No budget set for this month.</p>
        ) : (
          <div>
            {/* Progress bar */}
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Budget: <span className="font-medium">${budgetProgress.budget.toFixed(2)}</span></span>
              <span className="text-gray-600 dark:text-gray-300">Actual: <span className="font-medium text-rose-600">${budgetProgress.actual.toFixed(2)}</span></span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded overflow-hidden">
              <div
                className={`h-3 ${barColorClass} rounded`}
                style={{ width: `${Math.min(budgetProgress.consumedPercent, 100)}%` }}
              />
            </div>
            <div className="mt-2 text-sm">
              <span className="text-gray-600 dark:text-gray-300">Consumo:</span> <span className={`font-medium ${budgetProgress.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{budgetProgress.consumedPercent}%{budgetProgress.consumedPercent > 100 ? ' (sobre presupuesto)' : ''}</span>
            </div>
            <div className="mt-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300">Estado restante:</span> <span className={`font-medium ${budgetProgress.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>${budgetProgress.remaining.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Categories</h3>
        <div className="flex gap-6 flex-wrap items-start">
          <div style={{ width: 280, height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary?.categories || []} dataKey="amount" nameKey="name" outerRadius={100}>
                  {(summary?.categories || []).map((c, i) => <Cell key={i} fill={c.color || '#3b82f6'} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-slate-700 flex-1">
            {(summary?.categories || []).map(c => {
              const totalExp = summary?.totals?.expense || 0;
              const pct = totalExp > 0 ? Math.round((c.amount / totalExp) * 100) : 0;
              return (
                <li key={c.name} className="grid grid-cols-12 items-center py-2 gap-2">
                  <div className="col-span-5 flex items-center gap-2 overflow-hidden">
                    <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ background:c.color || '#3b82f6' }}></span>
                    <span className="truncate" title={c.name}>{c.name}</span>
                  </div>
                  <div className="col-span-3 text-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{pct} %</span>
                  </div>
                  <div className="col-span-4 text-right">
                    <span className="font-medium">${c.amount.toFixed(2)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Payment Methods & Credit Card Usage */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Payment Methods</h3>
          <div className="space-y-3">
            {/* Cash card */}
            <div className="flex items-center justify-between rounded-lg border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  {/* cash icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 7.5h19.5v9H2.25zM5.25 9.75h.75m12 0h.75M12 12.75a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>
                </span>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Cash</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">${paymentTotals.cash.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{paymentTotals.cashPct}%</div>
            </div>

            {/* Credit cards */}
            <div className="flex items-center justify-between rounded-lg border border-sky-100 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">
                  {/* card icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 7.5h19.5v9H2.25zM3 10.5h18M6 13.5h4"/></svg>
                </span>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Credit Cards</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">${paymentTotals.card.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{paymentTotals.cardPct}%</div>
            </div>
          </div>
          <div className="mt-3 text-right text-sm">
            <span className="text-gray-600 dark:text-gray-300">Total Spent</span>{' '}
            <span className="font-semibold">${paymentTotals.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Credit Card Usage */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Credit Card Usage</h3>
            {/* futuro: filtros o acciones */}
            <button className="p-2 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200" title="Options" aria-label="options">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12a1 1 0 102 0 1 1 0 10-2 0zm6 0a1 1 0 102 0 1 1 0 10-2 0zm6 0a1 1 0 102 0 1 1 0 10-2 0z"/></svg>
            </button>
          </div>
          <div className="space-y-3">
            {perCardUsage.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No hay gastos con tarjetas.</p>
            ) : (
              perCardUsage.map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-lg p-4 border" style={{ borderColor: c.color + '33' }}>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: c.color + '22', color: c.color }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 7.5h19.5v9H2.25zM3 10.5h18"/></svg>
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</div>
                      {c.last4 && <div className="text-xs text-gray-500 dark:text-gray-400">•••• {c.last4}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">${c.amount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total spent</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
