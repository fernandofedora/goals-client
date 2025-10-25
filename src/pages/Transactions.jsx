import { useEffect, useState } from 'react';
import api from '../api';

export default function Transactions() {
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
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
  const filtered = transactions.filter(t => typeFilter==='all' || t.type===typeFilter);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {error && (
        <Banner kind="error" message={error} onClose={()=>setError('')} />
      )}
      {success && (
        <Banner kind="success" message={success} onClose={()=>setSuccess('')} />
      )}
      <ConfirmModal
        open={deleteTargetId !== null}
        title="Delete transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={()=>setDeleteTargetId(null)}
      />
      <ConfirmModal
        open={deleteBudgetId !== null}
        title="Delete budget"
        message="Are you sure you want to delete this budget? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={deleteBudget}
        onCancel={()=>setDeleteBudgetId(null)}
      />
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h4 className="text-lg font-semibold mb-2">Delete transaction</h4>
            <p className="text-gray-600 mb-4">Are you sure you want to delete this transaction? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={()=>setDeleteTargetId(null)}>Cancel</button>
              <button className="px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Budget</h3>
        <form className="space-y-3" onSubmit={setMonthlyBudget}>
          <div className="flex gap-3 flex-wrap">
            <select className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={budget.month} onChange={(e)=>setBudget(v=>({ ...v, month:e.target.value }))} required>
              <option value="">Month</option>
              {Array.from({length:12},(_,i)=> <option key={i+1} value={String(i+1).padStart(2,'0')}>{new Date(0,i).toLocaleString('en',{ month:'long'})}</option>)}
            </select>
            <input className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="number" placeholder="Year" value={budget.year} onChange={(e)=>setBudget(v=>({ ...v, year:e.target.value }))} required />
            <input className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="number" step="0.01" placeholder="Amount" value={budget.amount} onChange={(e)=>setBudget(v=>({ ...v, amount:e.target.value }))} required />
            <button className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700" type="submit">Set</button>
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
        <h3 className="text-lg font-semibold mb-3">Add Expense</h3>
        <form className="space-y-3" onSubmit={addExpense}>
          <input className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Description" value={expense.description} onChange={(e)=>setExpense(v=>({ ...v, description:e.target.value }))} required />
          <div className="flex gap-3 flex-wrap">
            <select className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={expense.categoryId} onChange={(e)=>setExpense(v=>({ ...v, categoryId:e.target.value }))} required>
              <option value="">Category</option>
              {categories.filter(c=>c.type==='expense').map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="number" step="0.01" placeholder="Amount" value={expense.amount} onChange={(e)=>setExpense(v=>({ ...v, amount:e.target.value }))} required />
            <input className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="date" value={expense.date} onChange={(e)=>setExpense(v=>({ ...v, date:e.target.value }))} required />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={expense.method} onChange={(e)=>setExpense(v=>({ ...v, method:e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="card">Credit Card</option>
            </select>
            {expense.method==='card' && (
              <select className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={expense.cardId} onChange={(e)=>setExpense(v=>({ ...v, cardId:e.target.value }))} required>
                <option value="">Select Card</option>
                {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
              </select>
            )}
          </div>
          <button className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700" type="submit">Add Expense</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Add Income</h3>
        <form className="space-y-3" onSubmit={addIncome}>
          <input className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Description" value={income.description} onChange={(e)=>setIncome(v=>({ ...v, description:e.target.value }))} required />
          <div className="flex gap-3 flex-wrap">
            <select className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={income.categoryId} onChange={(e)=>setIncome(v=>({ ...v, categoryId:e.target.value }))} required>
              <option value="">Category</option>
              {categories.filter(c=>c.type==='income').map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="date" value={income.date} onChange={(e)=>setIncome(v=>({ ...v, date:e.target.value }))} required />
            <input className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="number" step="0.01" placeholder="Amount" value={income.amount} onChange={(e)=>setIncome(v=>({ ...v, amount:e.target.value }))} required />
          </div>
          <button className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700" type="submit">Add Income</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Transactions</h3>
          <select className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
        </div>
        <table className="min-w-full border border-gray-200 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Description</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Category</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Amount</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Method</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
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
                    <td>
                      <div className="flex gap-2">
                        <button className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" onClick={saveEdit}>Save</button>
                        <button className="px-3 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${t.type==='expense' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.type}</td>
                    <td>{t.description}</td>
                    <td>{t.Category?.name || ''}</td>
                    <td className={`text-sm ${t.type==='expense' ? 'text-rose-600' : 'text-emerald-600'}`}>${parseFloat(t.amount ?? 0).toFixed(2)}</td>
                    <td>{t.date}</td>
                    <td>{t.paymentMethod==='card' ? (t.Card?.name || 'Card') : 'Cash'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700" onClick={()=>startEdit(t)}>Edit</button>
                        <button className="px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={()=>setDeleteTargetId(t.id)}>Delete</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Banner({ kind, message, onClose }) {
  const base = 'relative rounded-md p-4 border';
  const theme = kind === 'error'
    ? 'bg-rose-50 border-rose-200 text-rose-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return (
    <div className={`${base} ${theme}`}>
      <div className="pr-8">{message}</div>
      <button type="button" aria-label="Close" className="absolute top-2 right-2 hover:opacity-80" onClick={onClose}>×</button>
    </div>
  );
}
function ConfirmModal({ open, title, message, confirmText = 'Delete', cancelText = 'Cancel', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
        <h4 className="text-lg font-semibold mb-2">{title}</h4>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={onCancel}>{cancelText}</button>
          <button className="px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}