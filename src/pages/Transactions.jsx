import { useEffect, useState } from 'react';
import api from '../api';
import DateInput from '../components/DateInput';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Select from '../components/ui/select';
import Alert from '../components/ui/alert';
import ConfirmDialog from '../components/ui/confirm-dialog';
import { cn } from '../lib/utils';

export default function Transactions() {
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [txMode, setTxMode] = useState('expense');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  // Filtros de fecha (Mes/Año)
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [yearFilter, setYearFilter] = useState(String(now.getFullYear()));
  const [showYearAll, setShowYearAll] = useState(false);
  const monthNameEs = new Date(0, Number(monthFilter) - 1).toLocaleString('es', { month: 'long' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [expense, setExpense] = useState({ description:'', categoryId:'', amount:'', date:'', method:'cash', cardId:'' });
  const [income, setIncome] = useState({ description:'', categoryId:'', amount:'', date:'' });

  const [budget, setBudget] = useState({ month:'', year:'', amount:'' });
  const [budgets, setBudgets] = useState([]);

  // Budget editing state
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editBudgetData, setEditBudgetData] = useState({ month:'', year:'', amount:'' });
  const [deleteBudgetId, setDeleteBudgetId] = useState(null);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ type:'expense', description:'', categoryId:'', amount:'', date:'', paymentMethod:'cash', cardId:'' });

  const load = async () => {
    try {
      const [catRes, cardRes, trxRes, budRes] = await Promise.all([
        api.get('/categories'), api.get('/cards'), api.get('/transactions'), api.get('/budgets')
      ]);
      setCategories(catRes.data);
      setCards(cardRes.data);
      setTransactions(trxRes.data);
      setBudgets(budRes.data);
      setError(''); // clear previous error on success
    } catch { setError('Failed to load data'); }
  };

  useEffect(()=>{ load(); },[]);
  // auto-dismiss banners
  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(''), 6000); return () => clearTimeout(t); }, [error]);

  const addExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transactions', { ...expense, type:'expense', paymentMethod: expense.method, amount: parseFloat(expense.amount || 0) });
      setExpense({ description:'', categoryId:'', amount:'', date:'', method:'cash', cardId:'' });
      setError('');
      setSuccess('Expense added');
      load();
    } catch{ setSuccess(''); setError('Failed to add expense'); }
  };

  const addIncome = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transactions', { ...income, type:'income', amount: parseFloat(income.amount || 0), paymentMethod:'cash' });
      setIncome({ description:'', categoryId:'', amount:'', date:'' });
      setError('');
      setSuccess('Income added');
      load();
    } catch{ setSuccess(''); setError('Failed to add income'); }
  };

  const setMonthlyBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', { month: budget.month, year: budget.year, amount: parseFloat(budget.amount || 0) });
      setBudget({ month:'', year:'', amount:'' });
      setError('');
      setSuccess('Budget set');
      load();
    } catch{ setSuccess(''); setError('Failed to set budget'); }
  };

  // Budget editing functions
  const startEditBudget = (b) => {
    setEditingBudgetId(b.id);
    setEditBudgetData({
      month: b.month,
      year: b.year,
      amount: b.amount.toString()
    });
  };

  const cancelEditBudget = () => {
    setEditingBudgetId(null);
    setEditBudgetData({ month:'', year:'', amount:'' });
  };

  const saveEditBudget = async () => {
    try {
      await api.put(`/budgets/${editingBudgetId}`, {
        month: editBudgetData.month,
        year: editBudgetData.year,
        amount: parseFloat(editBudgetData.amount || 0)
      });
      setEditingBudgetId(null);
      setEditBudgetData({ month:'', year:'', amount:'' });
      setError('');
      setSuccess('Budget updated');
      load();
    } catch {
      setSuccess('');
      setError('Failed to update budget');
    }
  };

  const deleteBudget = async () => {
    try {
      await api.delete(`/budgets/${deleteBudgetId}`);
      setDeleteBudgetId(null);
      setError('');
      setSuccess('Budget deleted');
      load();
    } catch {
      setSuccess('');
      setError('Failed to delete budget');
    }
  };

const DELETE_TRANSACTION_LEGACY = async () => { /* replaced by modal-based delete flow */ };
  // if(!confirm('Delete transaction?')) return;
  // try {
  //   await api.delete(`/transactions/${id}`);
  //   setError('');
  //   load();
  // } catch { setError('Failed to delete transaction'); }

  // Inline edit handlers
  const startEdit = (t) => {
    setEditingId(t.id);
    setEditData({
      type: t.type,
      description: t.description || '',
      categoryId: t.CategoryId || t.Category?.id || '',
      amount: (t.amount ?? '').toString(),
      date: t.date || '',
      paymentMethod: t.paymentMethod || (t.type==='income' ? 'cash' : 'cash'),
      cardId: t.CardId || t.Card?.id || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    try {
      const payload = { ...editData, amount: parseFloat(editData.amount || 0) };
      if (payload.type === 'income') { payload.paymentMethod = 'cash'; payload.cardId = null; }
      if (payload.type === 'expense' && payload.paymentMethod === 'card' && !payload.cardId) {
        setError('Please select a card for card payments');
        return;
      }
      await api.put(`/transactions/${editingId}`, payload);
      setEditingId(null);
      setError('');
      setSuccess('Changes saved');
      load();
    } catch {
      setSuccess('');
      setError('Failed to save changes');
    }
  };

  // Confirm deletion using modal-based flow
  const confirmDelete = async () => {
    if (deleteTargetId === null) return;
    try {
      await api.delete(`/transactions/${deleteTargetId}`);
      setDeleteTargetId(null);
      setError('');
      setSuccess('Transaction deleted');
      load();
    } catch {
      setSuccess('');
      setError('Failed to delete transaction');
    }
  };
  // Utilidad robusta para extraer mes/año desde formatos tipo 'YYYY-MM-DD' o 'MM/DD/YYYY'
  const extractMonthYear = (dateStr) => {
    if (!dateStr) return { month: '', year: '' };
    // ISO: 2025-11-09
    const isoMatch = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateStr);
    if (isoMatch) return { year: isoMatch[1], month: isoMatch[2] };
    // US: 11/09/2025
    const usMatch = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/.exec(dateStr);
    if (usMatch) return { year: usMatch[3], month: String(usMatch[1]).padStart(2, '0') };
    // Fallback a Date
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return { year: String(d.getFullYear()), month: String(d.getMonth() + 1).padStart(2, '0') };
    return { month: '', year: '' };
  };

  const filtered = transactions
    .filter(t => typeFilter==='all' || t.type===typeFilter)
    .filter(t => paymentFilter==='all' || (t.paymentMethod || 'cash')===paymentFilter)
    .filter(t => categoryFilter==='' || String(t.CategoryId || t.Category?.id || '')===String(categoryFilter))
    .filter(t => {
      const { month, year } = extractMonthYear(t.date);
      if (!year) return false;
      if (showYearAll) return year === yearFilter;
      return year === yearFilter && month === monthFilter;
    });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {error && (
        <Alert variant="error" message={error} onClose={()=>setError('')} />
      )}
      {success && (
        <Alert variant="success" message={success} onClose={()=>setSuccess('')} />
      )}
      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open)=>{ if(!open) setDeleteTargetId(null); }}
        title="Delete transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={()=>setDeleteTargetId(null)}
      />
      <ConfirmDialog
        open={deleteBudgetId !== null}
        onOpenChange={(open)=>{ if(!open) setDeleteBudgetId(null); }}
        title="Delete budget"
        description="Are you sure you want to delete this budget? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={deleteBudget}
        onCancel={()=>setDeleteBudgetId(null)}
      />
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Budget</h3>
        <form className="space-y-3" onSubmit={setMonthlyBudget}>
          <div className="flex gap-3 flex-wrap">
            <Select value={budget.month} onChange={(e)=>setBudget(v=>({ ...v, month:e.target.value }))} required>
              <option value="">Month</option>
              {Array.from({length:12},(_,i)=> <option key={i+1} value={String(i+1).padStart(2,'0')}>{new Date(0,i).toLocaleString('en',{ month:'long'})}</option>)}
            </Select>
            <Input type="number" placeholder="Year" value={budget.year} onChange={(e)=>setBudget(v=>({ ...v, year:e.target.value }))} required />
            <Input type="number" step="0.01" placeholder="Amount" value={budget.amount} onChange={(e)=>setBudget(v=>({ ...v, amount:e.target.value }))} required />
            <Button type="submit">Set</Button>
          </div>
        </form>
        <ul className="divide-y divide-gray-100 mt-3">
          {budgets.map(b => (
            <li key={b.id} className="flex items-center justify-between py-2">
              {editingBudgetId === b.id ? (
                <div className="flex gap-2 flex-wrap items-center flex-1">
                  <select 
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={editBudgetData.month} 
                    onChange={(e)=>setEditBudgetData(v=>({ ...v, month:e.target.value }))} 
                    required
                  >
                    <option value="">Month</option>
                    {Array.from({length:12},(_,i)=> <option key={i+1} value={String(i+1).padStart(2,'0')}>{new Date(0,i).toLocaleString('en',{ month:'long'})}</option>)}
                  </select>
                  <input 
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-20" 
                    type="number" 
                    placeholder="Year" 
                    value={editBudgetData.year} 
                    onChange={(e)=>setEditBudgetData(v=>({ ...v, year:e.target.value }))} 
                    required 
                  />
                  <input 
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24" 
                    type="number" 
                    step="0.01" 
                    placeholder="Amount" 
                    value={editBudgetData.amount} 
                    onChange={(e)=>setEditBudgetData(v=>({ ...v, amount:e.target.value }))} 
                    required 
                  />
                  <div className="flex gap-1">
                    <button 
                      className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700" 
                      onClick={saveEditBudget}
                    >
                      Save
                    </button>
                    <button 
                      className="px-2 py-1 text-xs rounded bg-gray-600 text-white hover:bg-gray-700" 
                      onClick={cancelEditBudget}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span>{b.month}/{b.year}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${Number(b.amount).toFixed(2)}</span>
                    <div className="flex gap-1">
                      <button 
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" 
                        onClick={() => startEditBudget(b)}
                      >
                        Edit
                      </button>
                      <button 
                        className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700" 
                        onClick={() => setDeleteBudgetId(b.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-1">Add Transaction</h3>
        <p className="text-sm text-gray-500 mb-3">Record a new expense or income</p>
        <div className="inline-flex w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-1">
          <button
            type="button"
            onClick={()=>setTxMode('expense')}
            className={cn(
              'flex-1 rounded-xl px-4 py-2 text-sm transition-colors',
              txMode==='expense'
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm border border-[var(--border)]'
                : 'bg-transparent text-[var(--foreground)] hover:bg-white/60'
            )}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={()=>setTxMode('income')}
            className={cn(
              'flex-1 rounded-xl px-4 py-2 text-sm transition-colors',
              txMode==='income'
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm border border-[var(--border)]'
                : 'bg-transparent text-[var(--foreground)] hover:bg-white/60'
            )}
          >
            Income
          </button>
        </div>
        <form className="space-y-3 mt-4" onSubmit={(e)=>{ if(txMode==='expense') { addExpense(e); } else { addIncome(e); } }}>
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">Description</label>
            <Input className="w-full" placeholder="Enter description" value={txMode==='expense' ? expense.description : income.description} onChange={(e)=> txMode==='expense' ? setExpense(v=>({ ...v, description:e.target.value })) : setIncome(v=>({ ...v, description:e.target.value }))} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Amount</label>
              <Input type="number" step="0.01" placeholder="0.00" value={txMode==='expense' ? expense.amount : income.amount} onChange={(e)=> txMode==='expense' ? setExpense(v=>({ ...v, amount:e.target.value })) : setIncome(v=>({ ...v, amount:e.target.value }))} required />
            </div>
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Date</label>
              <DateInput value={txMode==='expense' ? expense.date : income.date} onChange={(e)=> txMode==='expense' ? setExpense(v=>({ ...v, date:e.target.value })) : setIncome(v=>({ ...v, date:e.target.value }))} required placeholder="Date" />
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">Category</label>
            <Select value={txMode==='expense' ? expense.categoryId : income.categoryId} onChange={(e)=> txMode==='expense' ? setExpense(v=>({ ...v, categoryId:e.target.value })) : setIncome(v=>({ ...v, categoryId:e.target.value }))} required>
              <option value="">Select category</option>
              {(txMode==='expense' ? categories.filter(c=>c.type==='expense') : categories.filter(c=>c.type==='income')).map(c=> (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          {txMode==='expense' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">Payment</label>
                <Select value={expense.method} onChange={(e)=>setExpense(v=>({ ...v, method:e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="card">Credit Card</option>
                </Select>
              </div>
              {expense.method==='card' && (
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Card</label>
                  <Select value={expense.cardId} onChange={(e)=>setExpense(v=>({ ...v, cardId:e.target.value }))} required>
                    <option value="">Select Card</option>
                    {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                  </Select>
                </div>
              )}
            </div>
          )}
          <Button type="submit" variant="secondary" className="w-full">{txMode==='expense' ? 'Add Expense' : 'Add Income'}</Button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-sm text-gray-600">Tipo:</label>
              <Select value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
              </Select>
              <label className="text-sm text-gray-600">Payment:</label>
              <Select value={paymentFilter} onChange={(e)=>setPaymentFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="cash">Cash</option>
                <option value="card">Credit Card</option>
              </Select>
              <label className="text-sm text-gray-600">Category:</label>
              <Select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
                <option value="">All</option>
                {categories.filter(c=> typeFilter==='all' || c.type===typeFilter).map(c=> (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Month</span>
              <select className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={monthFilter}
                onChange={(e)=>setMonthFilter(e.target.value)}
                disabled={showYearAll}
              >
                {Array.from({length:12},(_,i)=> {
                  const val = String(i+1).padStart(2,'0');
                  const label = new Date(0,i).toLocaleString('es', { month: 'long' });
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Year</span>
              <input className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28" type="number" value={yearFilter} onChange={(e)=>setYearFilter(e.target.value)} />
            </div>
            <label className="inline-flex items-center gap-2 mt-5 sm:mt-0">
              <input type="checkbox" className="rounded" checked={showYearAll} onChange={(e)=>setShowYearAll(e.target.checked)} />
              <span className="text-sm text-gray-700">Mostrar todo el año</span>
            </label>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              {`No transactions for ${showYearAll ? yearFilter : `${monthNameEs} ${yearFilter}`}. Add your first transaction above.`}
            </div>
          ) : (
            <table className="min-w-[760px] w-full table-auto">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Type</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Description</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Category</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Amount</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Date</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Method</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 w-40 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                {editingId === t.id ? (
                  <>
                    <td>
                      <select className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.type} onChange={(e)=>setEditData(v=>({ ...v, type:e.target.value, paymentMethod: e.target.value==='income' ? 'cash' : v.paymentMethod }))}>
                        <option value="expense">expense</option>
                        <option value="income">income</option>
                      </select>
                    </td>
                    <td>
                      <input className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.description} onChange={(e)=>setEditData(v=>({ ...v, description:e.target.value }))} />
                    </td>
                    <td>
                      <select className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.categoryId} onChange={(e)=>setEditData(v=>({ ...v, categoryId:e.target.value }))}>
                        <option value="">Category</option>
                        {categories.filter(c=>c.type===editData.type).map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="number" step="0.01" value={editData.amount} onChange={(e)=>setEditData(v=>({ ...v, amount:e.target.value }))} />
                    </td>
                    <td>
                      <input type="date" value={editData.date} onChange={(e)=>setEditData(v=>({ ...v, date:e.target.value }))} />
                    </td>
                    <td>
                      {editData.type==='expense' ? (
                        <div className="flex gap-2">
                          <select className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.paymentMethod} onChange={(e)=>setEditData(v=>({ ...v, paymentMethod:e.target.value }))}>
                            <option value="cash">Cash</option>
                            <option value="card">Credit Card</option>
                          </select>
                          {editData.paymentMethod==='card' && (
                            <select className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.cardId || ''} onChange={(e)=>setEditData(v=>({ ...v, cardId:e.target.value }))}>
                              <option value="">Select Card</option>
                              {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                            </select>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Cash</span>
                      )}
                    </td>
                    <td className="w-40">
                       <div className="flex items-center gap-3">
                         <button
                           className="p-2 rounded-md hover:bg-emerald-100 text-emerald-600"
                           aria-label="Save"
                           title="Save"
                           onClick={saveEdit}
                         >
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M20 6L9 17l-5-5" />
                           </svg>
                         </button>
                         <button
                           className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
                           aria-label="Cancel"
                           title="Cancel"
                           onClick={cancelEdit}
                         >
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M18 6L6 18" />
                             <path d="M6 6l12 12" />
                           </svg>
                         </button>
                       </div>
                     </td>
                  </>
                ) : (
                  <>
                    <td className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${t.type==='expense' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.type}</td>
                    <td className="max-w-[180px] truncate" title={t.description}>{t.description}</td>
                    <td className="whitespace-nowrap">{t.Category?.name || ''}</td>
                    <td className={`text-sm ${t.type==='expense' ? 'text-rose-600' : 'text-emerald-600'} whitespace-nowrap`}>${parseFloat(t.amount ?? 0).toFixed(2)}</td>
                    <td className="whitespace-nowrap">{t.date}</td>
                    <td className="whitespace-nowrap">{t.paymentMethod==='card' ? (t.Card?.name || 'Card') : 'Cash'}</td>
                    <td className="w-40">
                       <div className="flex items-center gap-3">
                         <button
                            className="p-2 rounded-md hover:bg-gray-100 text-gray-800"
                            aria-label="Edit"
                            title="Edit"
                            onClick={()=>startEdit(t)}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
                            </svg>
                          </button>
                          <button
                            className="p-2 rounded-md hover:bg-rose-50 text-rose-600"
                            aria-label="Delete"
                            title="Delete"
                            onClick={()=>setDeleteTargetId(t.id)}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
                            </svg>
                          </button>
                       </div>
                     </td>
                  </>
                )}
                </tr>
              ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// unified with Alert and ConfirmDialog components
