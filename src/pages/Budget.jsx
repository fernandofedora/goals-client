import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Select from '../components/ui/select';
import ConfirmDialog from '../components/ui/confirm-dialog';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// ── Inline Field wrapper ──────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Small icon buttons ────────────────────────────────────────────────────────
function IconButton({ onClick, title, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
        danger
          ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
      )}
    >
      {children}
    </button>
  );
}

export default function Budget() {
  const [budget, setBudget] = useState({ month: '', year: '', amount: '' });
  const [budgets, setBudgets] = useState([]);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editBudgetData, setEditBudgetData] = useState({ month: '', year: '', amount: '' });
  const [deleteBudgetId, setDeleteBudgetId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/budgets');
      setBudgets(res.data);
    } catch { toast.error('Failed to load budgets'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setMonthlyBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', { month: budget.month, year: budget.year, amount: parseFloat(budget.amount || 0) });
      setBudget({ month: '', year: '', amount: '' });
      toast.success('Budget set'); load();
    } catch { toast.error('Failed to set budget'); }
  };

  const startEditBudget = (b) => {
    setEditingBudgetId(b.id);
    setEditBudgetData({ month: b.month, year: b.year, amount: b.amount.toString() });
  };
  const cancelEditBudget = () => {
    setEditingBudgetId(null);
    setEditBudgetData({ month: '', year: '', amount: '' });
  };

  const saveEditBudget = async () => {
    try {
      await api.put(`/budgets/${editingBudgetId}`, {
        month: editBudgetData.month,
        year: editBudgetData.year,
        amount: parseFloat(editBudgetData.amount || 0),
      });
      cancelEditBudget(); toast.success('Budget updated'); load();
    } catch { toast.error('Failed to update budget'); }
  };

  const deleteBudget = async () => {
    try {
      await api.delete(`/budgets/${deleteBudgetId}`);
      setDeleteBudgetId(null); toast.success('Budget deleted'); load();
    } catch { toast.error('Failed to delete budget'); }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">

      <ConfirmDialog
        open={deleteBudgetId !== null}
        onOpenChange={(o) => { if (!o) setDeleteBudgetId(null); }}
        title="Delete budget"
        description="Are you sure? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={deleteBudget}
        onCancel={() => setDeleteBudgetId(null)}
      />

      {/* ── Budget Card ───────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold tracking-tight">Monthly Budget</h2>
          <p className="text-xs text-gray-400 mt-0.5">Set spending limits for each month</p>
        </div>

        <form className="px-5 pt-4 pb-5 flex flex-wrap gap-3 items-end" onSubmit={setMonthlyBudget}>
          <Field label="Month">
            <Select value={budget.month} onChange={(e) => setBudget(v => ({ ...v, month: e.target.value }))} required>
              <option value="">Month</option>
              {Array.from({ length: 12 }, (_, i) =>
                <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                  {new Date(0, i).toLocaleString('en', { month: 'long' })}
                </option>
              )}
            </Select>
          </Field>
          <Field label="Year">
            <Input
              type="number"
              placeholder="2026"
              value={budget.year}
              onChange={(e) => setBudget(v => ({ ...v, year: e.target.value }))}
              required
            />
          </Field>
          <Field label="Limit ($)">
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={budget.amount}
              onChange={(e) => setBudget(v => ({ ...v, amount: e.target.value }))}
              required
            />
          </Field>
          <div className="pb-0.5">
            <Button type="submit" variant="primary">Set Budget</Button>
          </div>
        </form>

        {budgets.length > 0 && (
          <div className="border-t border-[var(--border)]">
            <ul className="divide-y divide-[var(--border)]">
              {budgets.map(b => (
                <li key={b.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  {editingBudgetId === b.id ? (
                    <div className="flex gap-2 flex-wrap items-end flex-1">
                      <select
                        className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editBudgetData.month}
                        onChange={(e) => setEditBudgetData(v => ({ ...v, month: e.target.value }))}
                        required
                      >
                        <option value="">Month</option>
                        {Array.from({ length: 12 }, (_, i) =>
                          <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                            {new Date(0, i).toLocaleString('en', { month: 'long' })}
                          </option>
                        )}
                      </select>
                      <input
                        className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm w-20 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        type="number" placeholder="Year" value={editBudgetData.year}
                        onChange={(e) => setEditBudgetData(v => ({ ...v, year: e.target.value }))} required
                      />
                      <input
                        className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm w-24 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        type="number" step="0.01" placeholder="Amount" value={editBudgetData.amount}
                        onChange={(e) => setEditBudgetData(v => ({ ...v, amount: e.target.value }))} required
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={saveEditBudget}
                          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditBudget}
                          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-lg leading-none">📅</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {new Date(0, b.month - 1).toLocaleString('en', { month: 'long' })} {b.year}
                          </p>
                          <p className="text-xs text-gray-400">Monthly limit</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                          ${Number(b.amount).toFixed(2)}
                        </span>
                        <div className="flex gap-1">
                          <IconButton onClick={() => startEditBudget(b)} title="Edit budget">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
                            </svg>
                          </IconButton>
                          <IconButton onClick={() => setDeleteBudgetId(b.id)} title="Delete budget" danger>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
                            </svg>
                          </IconButton>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {budgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <span className="text-4xl opacity-30">📅</span>
            <p className="text-sm text-gray-400">No budgets set yet</p>
            <p className="text-xs text-gray-300 dark:text-gray-600">Use the form above to add your first monthly budget.</p>
          </div>
        )}
      </section>
    </div>
  );
}
