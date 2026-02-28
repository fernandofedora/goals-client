import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api';
import DateInput from '../components/DateInput';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Select from '../components/ui/select';
import EditTransactionDialog from '../components/ui/edit-transaction-dialog';
import Alert from '../components/ui/alert';
import ConfirmDialog from '../components/ui/confirm-dialog';
import { cn } from '../lib/utils';

// ── Inline Field wrapper for consistent label+input spacing ──────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</label>
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

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ type }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
      type === 'expense'
        ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
    )}>
      {type}
    </span>
  );
}

export default function Transactions() {
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [txMode, setTxMode] = useState('expense');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');

  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [yearFilter, setYearFilter] = useState(String(now.getFullYear()));
  const [showYearAll, setShowYearAll] = useState(false);
  const monthNameEs = new Date(0, Number(monthFilter) - 1).toLocaleString('es', { month: 'long' });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [expense, setExpense] = useState({ description: '', categoryId: '', amount: '', date: '', method: 'cash', cardId: '', accountId: '' });
  const [income, setIncome] = useState({ description: '', categoryId: '', amount: '', date: '', incomeMethod: 'cash', accountId: '' });

  const [budget, setBudget] = useState({ month: '', year: '', amount: '' });
  const [budgets, setBudgets] = useState([]);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editBudgetData, setEditBudgetData] = useState({ month: '', year: '', amount: '' });
  const [deleteBudgetId, setDeleteBudgetId] = useState(null);

  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxData, setEditTxData] = useState({ type: 'expense', description: '', categoryId: '', amount: '', date: '', paymentMethod: 'cash', cardId: '', accountId: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState('');

  const expenseCats = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCats = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  // ── async-parallel: load all data in parallel ─────────────────────────────
  const load = useCallback(async () => {
    try {
      const [catRes, cardRes, trxRes, budRes, accRes] = await Promise.all([
        api.get('/categories'), api.get('/cards'), api.get('/transactions'), api.get('/budgets'), api.get('/accounts')
      ]);
      setCategories(catRes.data);
      setCards(cardRes.data);
      setTransactions(trxRes.data);
      setBudgets(budRes.data);
      setAccounts(accRes.data);
      setError('');
    } catch { setError('Failed to load data'); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(''), 6000); return () => clearTimeout(t); }, [error]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const addExpense = async (e) => {
    e.preventDefault();
    try {
      const expPayload = {
        ...expense,
        type: 'expense',
        paymentMethod: expense.method === 'account' ? 'cash' : expense.method,
        amount: parseFloat(expense.amount || 0),
        accountId: expense.method === 'account' ? expense.accountId || null : null,
        cardId: expense.method === 'card' ? expense.cardId || null : null,
      };
      await api.post('/transactions', expPayload);
      setExpense({ description: '', categoryId: '', amount: '', date: '', method: 'cash', cardId: '', accountId: '' });
      setSuccess('Expense added'); setError(''); load();
    } catch { setError('Failed to add expense'); setSuccess(''); }
  };

  const addIncome = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...income, type: 'income', amount: parseFloat(income.amount || 0), paymentMethod: 'cash' };
      if (income.incomeMethod === 'cash') payload.accountId = null;
      await api.post('/transactions', payload);
      setIncome({ description: '', categoryId: '', amount: '', date: '', incomeMethod: 'cash', accountId: '' });
      setSuccess('Income added'); setError(''); load();
    } catch { setError('Failed to add income'); setSuccess(''); }
  };

  const setMonthlyBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', { month: budget.month, year: budget.year, amount: parseFloat(budget.amount || 0) });
      setBudget({ month: '', year: '', amount: '' });
      setSuccess('Budget set'); setError(''); load();
    } catch { setError('Failed to set budget'); setSuccess(''); }
  };

  const startEditBudget = (b) => { setEditingBudgetId(b.id); setEditBudgetData({ month: b.month, year: b.year, amount: b.amount.toString() }); };
  const cancelEditBudget = () => { setEditingBudgetId(null); setEditBudgetData({ month: '', year: '', amount: '' }); };

  const saveEditBudget = async () => {
    try {
      await api.put(`/budgets/${editingBudgetId}`, { month: editBudgetData.month, year: editBudgetData.year, amount: parseFloat(editBudgetData.amount || 0) });
      cancelEditBudget(); setSuccess('Budget updated'); setError(''); load();
    } catch { setError('Failed to update budget'); setSuccess(''); }
  };

  const deleteBudget = async () => {
    try {
      await api.delete(`/budgets/${deleteBudgetId}`);
      setDeleteBudgetId(null); setSuccess('Budget deleted'); setError(''); load();
    } catch { setError('Failed to delete budget'); setSuccess(''); }
  };

  const startEditTx = (t) => {
    setEditingTxId(t.id);
    // For expenses paid from an account (AccountId set, paymentMethod='cash'), show 'account' method in the edit dialog
    const resolvedMethod = (t.type === 'expense' && t.AccountId) ? 'account' : (t.paymentMethod || 'cash');
    setEditTxData({
      type: t.type, description: t.description || '',
      categoryId: t.CategoryId || t.Category?.id || '',
      amount: (t.amount ?? '').toString(),
      date: t.date || new Date().toISOString().slice(0, 10),
      paymentMethod: resolvedMethod,
      cardId: t.CardId || t.Card?.id || '',
      accountId: t.AccountId || ''
    });
    setEditOpen(true); setEditError('');
  };

  const cancelEditTx = () => { setEditOpen(false); setEditingTxId(null); };

  const saveEditTx = async (data, patchOnly) => {
    if (patchOnly) { setEditTxData(data); return; }
    try {
      const amt = parseFloat(data.amount || 0);
      if (!data.description.trim()) { setEditError('Description is required'); return; }
      if (!(amt > 0)) { setEditError('Amount must be greater than 0'); return; }
      const payload = { ...data, amount: amt };
      if (payload.type === 'income') { payload.paymentMethod = 'cash'; payload.cardId = null; }
      // Resolve expense payment method: 'account' → paymentMethod='cash' + accountId
      if (payload.type === 'expense') {
        if (payload.paymentMethod === 'account') {
          if (!payload.accountId) { setEditError('Please select an account'); return; }
          payload.paymentMethod = 'cash';
          payload.cardId = null;
        } else if (payload.paymentMethod === 'card') {
          if (!payload.cardId) { setEditError('Please select a card for card payments'); return; }
          payload.accountId = null;
        } else {
          payload.cardId = null; payload.accountId = null;
        }
      }
      await api.put(`/transactions/${editingTxId}`, payload);
      cancelEditTx(); setSuccess('Changes saved'); setError(''); load();
    } catch { setEditError('Failed to save changes'); }
  };

  const confirmDelete = async () => {
    if (deleteTargetId === null) return;
    try {
      await api.delete(`/transactions/${deleteTargetId}`);
      setDeleteTargetId(null); setSuccess('Transaction deleted'); setError(''); load();
    } catch { setError('Failed to delete transaction'); setSuccess(''); }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const extractMonthYear = (dateStr) => {
    if (!dateStr) return { month: '', year: '' };
    const isoMatch = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateStr);
    if (isoMatch) return { year: isoMatch[1], month: isoMatch[2] };
    const usMatch = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/.exec(dateStr);
    if (usMatch) return { year: usMatch[3], month: String(usMatch[1]).padStart(2, '0') };
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return { year: String(d.getFullYear()), month: String(d.getMonth() + 1).padStart(2, '0') };
    return { month: '', year: '' };
  };

  const filtered = useMemo(() => transactions
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => paymentFilter === 'all' || (t.paymentMethod || 'cash') === paymentFilter)
    .filter(t => categoryFilter === '' || String(t.CategoryId || t.Category?.id || '') === String(categoryFilter))
    .filter(t => {
      const { month, year } = extractMonthYear(t.date);
      if (!year) return false;
      if (showYearAll) return year === yearFilter;
      return year === yearFilter && month === monthFilter;
    }),
    [transactions, typeFilter, paymentFilter, categoryFilter, showYearAll, yearFilter, monthFilter]
  );

  // ── Derived totals for summary bar ────────────────────────────────────────
  const summaryTotals = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">

      {/* Toasts */}
      {error && <Alert variant="error" message={error} onClose={() => setError('')} />}
      {success && <Alert variant="success" message={success} onClose={() => setSuccess('')} />}

      {/* Dialogs */}
      <ConfirmDialog open={deleteTargetId !== null} onOpenChange={(o) => { if (!o) setDeleteTargetId(null); }}
        title="Delete transaction" description="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel" onConfirm={confirmDelete} onCancel={() => setDeleteTargetId(null)} />
      <ConfirmDialog open={deleteBudgetId !== null} onOpenChange={(o) => { if (!o) setDeleteBudgetId(null); }}
        title="Delete budget" description="Are you sure? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel" onConfirm={deleteBudget} onCancel={() => setDeleteBudgetId(null)} />

      {/* ── Add Transaction Card ─────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold tracking-tight">Add Transaction</h2>
          <p className="text-xs text-gray-400 mt-0.5">Record a new expense or income</p>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-4">
          <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--muted)] p-1 gap-1">
            {['expense', 'income'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTxMode(mode)}
                className={cn(
                  'px-5 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 capitalize',
                  txMode === mode
                    ? mode === 'expense'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                )}
              >
                {mode === 'expense' ? '↑ Expense' : '↓ Income'}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form
          className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          onSubmit={(e) => txMode === 'expense' ? addExpense(e) : addIncome(e)}
        >
          {/* Description – full width */}
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Description">
              <Input
                className="w-full"
                placeholder={txMode === 'expense' ? 'e.g. Groceries, Rent…' : 'e.g. Salary, Freelance…'}
                value={txMode === 'expense' ? expense.description : income.description}
                onChange={(e) => txMode === 'expense'
                  ? setExpense(v => ({ ...v, description: e.target.value }))
                  : setIncome(v => ({ ...v, description: e.target.value }))}
                required
              />
            </Field>
          </div>

          {/* Amount */}
          <Field label="Amount ($)">
            <Input
              type="number" step="0.01" placeholder="0.00"
              value={txMode === 'expense' ? expense.amount : income.amount}
              onChange={(e) => txMode === 'expense'
                ? setExpense(v => ({ ...v, amount: e.target.value }))
                : setIncome(v => ({ ...v, amount: e.target.value }))}
              required
            />
          </Field>

          {/* Date */}
          <Field label="Date">
            <DateInput
              value={txMode === 'expense' ? expense.date : income.date}
              onChange={(e) => txMode === 'expense'
                ? setExpense(v => ({ ...v, date: e.target.value }))
                : setIncome(v => ({ ...v, date: e.target.value }))}
              required placeholder="Pick a date"
            />
          </Field>

          {/* Category */}
          <Field label="Category">
            <Select
              value={txMode === 'expense' ? expense.categoryId : income.categoryId}
              onChange={(e) => txMode === 'expense'
                ? setExpense(v => ({ ...v, categoryId: e.target.value }))
                : setIncome(v => ({ ...v, categoryId: e.target.value }))}
              required
            >
              <option value="">Select category</option>
              {(txMode === 'expense' ? expenseCats : incomeCats).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>

          {/* Expense-only: 3-way payment picker + conditional card or account picker */}
          {txMode === 'expense' && (
            <>
              <Field label="Payment method">
                {/* 3-way segmented control: Cash / Card / Account */}
                <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--muted)] p-0.5 gap-0.5">
                  {[{ val: 'cash', icon: '💵', label: 'Cash' }, { val: 'card', icon: '💳', label: 'Card' }, { val: 'account', icon: '🏦', label: 'Account' }].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setExpense(v => ({ ...v, method: opt.val, cardId: '', accountId: '' }))}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 whitespace-nowrap',
                        expense.method === opt.val
                          ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      )}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </Field>
              {expense.method === 'card' && (
                <Field label="Credit card">
                  <Select value={expense.cardId} onChange={(e) => setExpense(v => ({ ...v, cardId: e.target.value }))} required>
                    <option value="">Select card</option>
                    {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                  </Select>
                </Field>
              )}
              {expense.method === 'account' && (
                <Field label="Bank account">
                  <Select value={expense.accountId} onChange={(e) => setExpense(v => ({ ...v, accountId: e.target.value }))} required>
                    <option value="">Select account</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </Select>
                </Field>
              )}
            </>
          )}

          {/* Income-only: method + account */}
          {txMode === 'income' && (
            <>
              <Field label="Income method">
                <Select value={income.incomeMethod} onChange={(e) => setIncome(v => ({ ...v, incomeMethod: e.target.value }))}>
                  <option value="cash">💵 Cash</option>
                  <option value="account">🏦 Account</option>
                </Select>
              </Field>
              {income.incomeMethod === 'account' && (
                <Field label="Account">
                  <Select value={income.accountId} onChange={(e) => setIncome(v => ({ ...v, accountId: e.target.value }))} required>
                    <option value="">Select account</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </Select>
                </Field>
              )}
            </>
          )}

          {/* Submit – full width */}
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-1">
            <Button
              type="submit"
              className={cn(
                'w-full sm:w-auto px-8 font-semibold',
                txMode === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              {txMode === 'expense' ? '+ Add Expense' : '+ Add Income'}
            </Button>
          </div>
        </form>
      </section>

      {/* ── Budget Card ──────────────────────────────────────────────────── */}
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
                <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
              )}
            </Select>
          </Field>
          <Field label="Year">
            <Input type="number" placeholder="2026" value={budget.year} onChange={(e) => setBudget(v => ({ ...v, year: e.target.value }))} required />
          </Field>
          <Field label="Limit ($)">
            <Input type="number" step="0.01" placeholder="0.00" value={budget.amount} onChange={(e) => setBudget(v => ({ ...v, amount: e.target.value }))} required />
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
                          <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                        )}
                      </select>
                      <input className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm w-20 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        type="number" placeholder="Year" value={editBudgetData.year}
                        onChange={(e) => setEditBudgetData(v => ({ ...v, year: e.target.value }))} required />
                      <input className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm w-24 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        type="number" step="0.01" placeholder="Amount" value={editBudgetData.amount}
                        onChange={(e) => setEditBudgetData(v => ({ ...v, amount: e.target.value }))} required />
                      <div className="flex gap-1.5">
                        <button type="button" onClick={saveEditBudget} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium">Save</button>
                        <button type="button" onClick={cancelEditBudget} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium">Cancel</button>
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
                        <span className="text-base font-semibold tabular-nums text-gray-800 dark:text-gray-100">${Number(b.amount).toFixed(2)}</span>
                        <div className="flex gap-1">
                          <IconButton onClick={() => startEditBudget(b)} title="Edit budget">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" /></svg>
                          </IconButton>
                          <IconButton onClick={() => setDeleteBudgetId(b.id)} title="Delete budget" danger>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" /></svg>
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
      </section>

      {/* ── Transaction History ───────────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Transaction History</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''} shown</p>
            </div>
            {/* Summary mini-pills */}
            <div className="flex gap-2 flex-wrap text-xs font-semibold">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                ↑ ${summaryTotals.income.toFixed(2)}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                ↓ ${summaryTotals.expense.toFixed(2)}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold',
                summaryTotals.net >= 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
              )}>
                = ${summaryTotals.net.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-[var(--border)] bg-gray-50/50 dark:bg-slate-800/30 flex flex-wrap gap-3 items-end">
          <Field label="Type">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </Field>
          <Field label="Payment">
            <Select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="all">All methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </Select>
          </Field>
          <Field label="Category">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {categories.filter(c => typeFilter === 'all' || c.type === typeFilter).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Month">
            <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} disabled={showYearAll}>
              {Array.from({ length: 12 }, (_, i) => {
                const val = String(i + 1).padStart(2, '0');
                return <option key={val} value={val}>{new Date(0, i).toLocaleString('es', { month: 'long' })}</option>;
              })}
            </Select>
          </Field>
          <Field label="Year">
            <Input
              type="number" value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-24"
            />
          </Field>
          <div className="flex items-center gap-2 pb-0.5">
            <input
              id="showAll"
              type="checkbox"
              className="rounded border-gray-300 dark:border-slate-600 text-indigo-600"
              checked={showYearAll}
              onChange={(e) => setShowYearAll(e.target.checked)}
            />
            <label htmlFor="showAll" className="text-sm text-gray-600 dark:text-gray-300 select-none cursor-pointer whitespace-nowrap">
              Full year
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <span className="text-4xl opacity-30">📭</span>
              <p className="text-sm text-gray-400">
                No transactions for {showYearAll ? yearFilter : `${monthNameEs} ${yearFilter}`}
              </p>
              <p className="text-xs text-gray-300 dark:text-gray-600">Add your first transaction using the form above.</p>
            </div>
          ) : (
            <table className="min-w-[700px] w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-[var(--border)]">
                  {['Type', 'Description', 'Category', 'Amount', 'Date', 'Method', ''].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        'px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap',
                        i === 6 && 'text-right'
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(t => (
                  <tr key={t.id} className="group hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Badge type={t.type} />
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="truncate block font-medium text-gray-800 dark:text-gray-100" title={t.description}>
                        {t.description}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.Category ? (
                        <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                          {t.Category.color && (
                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: t.Category.color }} />
                          )}
                          {t.Category.name}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={cn(
                      'px-4 py-3 font-semibold tabular-nums whitespace-nowrap',
                      t.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    )}>
                      {t.type === 'expense' ? '−' : '+'}${parseFloat(t.amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">{t.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {/* Resolve method display for both income and expense */}
                      {(() => {
                        if (t.Account) return (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400">
                            🏦 {t.Account.name}
                          </span>
                        );
                        if (t.paymentMethod === 'card') return (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400">
                            💳 {t.Card?.name || 'Card'}
                          </span>
                        );
                        return (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                            💵 Cash
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <IconButton onClick={() => startEditTx(t)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
                          </svg>
                        </IconButton>
                        <IconButton onClick={() => setDeleteTargetId(t.id)} title="Delete" danger>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
                          </svg>
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Edit Dialog */}
      <EditTransactionDialog
        open={editOpen}
        onOpenChange={(o) => { if (!o) cancelEditTx(); }}
        initial={editTxData}
        expenseCats={expenseCats}
        incomeCats={incomeCats}
        cards={cards}
        onSave={saveEditTx}
        onCancel={cancelEditTx}
        error={editError}
      />
    </div>
  );
}
