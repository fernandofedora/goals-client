import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Select from '../components/ui/select';
import DateInput from '../components/DateInput';
import Alert from '../components/ui/alert';
import EditTransactionDialog from '../components/ui/edit-transaction-dialog';
import { cn } from '../lib/utils';

export default function Accounts() {
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    const v = localStorage.getItem('accounts.selectedAccountId');
    return v ? parseInt(v, 10) : null;
  });

  const [txItems, setTxItems] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(10);
  const [txTotal, setTxTotal] = useState(0);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });

  const [mode, setMode] = useState('expense');
  const [txForm, setTxForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0,10),
    categoryId: '',
    paymentMethod: 'cash'
  });
  const [addError, setAddError] = useState('');

  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState({ name:'', color:'#0ea5e9', last4:'' });
  const [editingCardId, setEditingCardId] = useState(null);
  const [editCardForm, setEditCardForm] = useState({ name:'', color:'#0ea5e9', last4:'' });

  const loadBase = async () => {
    const [cardsRes, catsRes] = await Promise.all([api.get('/cards'), api.get('/categories')]);
    setCards(cardsRes.data);
    setCategories(catsRes.data);
    if (!selectedId) {
      const first = cardsRes.data[0]?.id || null;
      setSelectedId(first);
      if (first) localStorage.setItem('accounts.selectedAccountId', String(first));
    } else {
      const exists = cardsRes.data.some(c => c.id === selectedId);
      if (!exists) {
        const first = cardsRes.data[0]?.id || null;
        setSelectedId(first);
        if (first) localStorage.setItem('accounts.selectedAccountId', String(first));
      }
    }
  };

  const loadTransactionsPage = async (cardId, page, limit) => {
    if (!cardId) { setTxItems([]); setTxTotal(0); return; }
    const res = await api.get('/transactions', { params: { cardId, page, limit } });
    setTxItems(res.data.items);
    setTxTotal(res.data.total);
  };

  const loadSummary = async (cardId) => {
    if (!cardId) { setSummary({ income:0, expense:0 }); return; }
    // sin paginación para sumar todos
    const res = await api.get('/transactions', { params: { cardId } });
    const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
    const income = items.filter(i => i.type === 'income').reduce((a,b)=>a + Number(b.amount), 0);
    const expense = items.filter(i => i.type === 'expense').reduce((a,b)=>a + Number(b.amount), 0);
    setSummary({ income, expense });
  };

  useEffect(() => { loadBase(); }, []);

  useEffect(() => {
    // al cambiar cuenta, refrescar todo y reiniciar estado
    setTxPage(1);
    setTxForm({ description:'', amount:'', date:new Date().toISOString().slice(0,10), categoryId:'', paymentMethod:'cash' });
    if (selectedId) localStorage.setItem('accounts.selectedAccountId', String(selectedId));
    loadTransactionsPage(selectedId, 1, txLimit);
    loadSummary(selectedId);
  }, [selectedId]);

  useEffect(() => {
    // cambiar paginación
    loadTransactionsPage(selectedId, txPage, txLimit);
  }, [txPage, txLimit]);

  const expenseCats = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCats = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    const amt = Number(txForm.amount);
    if (!txForm.description.trim()) { setAddError('Description is required'); return; }
    if (!(amt > 0)) { setAddError('Amount must be greater than 0'); return; }
    if (mode === 'income') {
      setTxForm(v=>({ ...v, paymentMethod:'cash' }));
    }
    const payload = {
      type: mode,
      description: txForm.description,
      amount: amt,
      date: txForm.date,
      paymentMethod: mode==='income' ? 'cash' : txForm.paymentMethod,
      categoryId: txForm.categoryId || null,
      cardId: selectedId
    };
    await api.post('/transactions', payload);
    setTxForm({ description:'', amount:'', date:new Date().toISOString().slice(0,10), categoryId:'', paymentMethod:'cash' });
    setAddError('');
    // recargar datos
    loadTransactionsPage(selectedId, 1, txLimit);
    loadSummary(selectedId);
    setTxPage(1);
  };

  const deleteTransaction = async (id) => {
    await api.delete(`/transactions/${id}`);
    loadTransactionsPage(selectedId, txPage, txLimit);
    loadSummary(selectedId);
  };

  const startEditCard = (card) => {
    setEditingCardId(card.id);
    setEditCardForm({ name: card.name, color: card.color, last4: card.last4 });
  };
  const saveEditCard = async (id) => {
    await api.put(`/cards/${id}`, editCardForm);
    setEditingCardId(null);
    loadBase();
    loadTransactionsPage(selectedId, txPage, txLimit);
    loadSummary(selectedId);
  };
  const addCard = async (e) => {
    e.preventDefault();
    await api.post('/cards', cardForm);
    setCardForm({ name:'', color:'#0ea5e9', last4:'' });
    setShowCardForm(false);
    await loadBase();
  };
  const deleteCard = async (id) => {
    if (!confirm('¿Eliminar la cuenta? Esto eliminará sus transacciones asociadas.')) return;
    await api.delete(`/cards/${id}`);
    await loadBase();
    // si borramos la seleccionada, selectedId se ajustará en loadBase
    if (selectedId === id) {
      setTxItems([]); setTxTotal(0); setSummary({ income:0, expense:0 });
    } else {
      loadTransactionsPage(selectedId, txPage, txLimit);
      loadSummary(selectedId);
    }
  };

  const totalPages = Math.max(1, Math.ceil(txTotal / txLimit));

  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxData, setEditTxData] = useState({
    type: 'expense',
    description: '',
    categoryId: '',
    amount: '',
    date: '',
    paymentMethod: 'cash'
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState('');

  const startEditTx = (t) => {
    setEditingTxId(t.id);
    setEditTxData({
      type: t.type,
      description: t.description || '',
      categoryId: t.CategoryId || t.Category?.id || '',
      amount: (t.amount ?? '').toString(),
      date: t.date || new Date().toISOString().slice(0,10),
      paymentMethod: t.paymentMethod || 'cash'
    });
    setEditOpen(true);
    setEditError('');
  };
  const cancelEditTx = () => { setEditOpen(false); setEditingTxId(null); };
  const saveEditTx = async (data, patchOnly) => {
    if (patchOnly) { setEditTxData(data); return; }
    const amt = parseFloat(data.amount || 0);
    if (!data.description.trim()) { setEditError('Description is required'); return; }
    if (!(amt > 0)) { setEditError('Amount must be greater than 0'); return; }
    const payload = {
      ...data,
      amount: amt,
      cardId: selectedId,
      paymentMethod: data.type==='income' ? 'cash' : data.paymentMethod
    };
    await api.put(`/transactions/${editingTxId}`, payload);
    setEditOpen(false);
    setEditingTxId(null);
    setEditError('');
    await loadTransactionsPage(selectedId, txPage, txLimit);
    await loadSummary(selectedId);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Accounts</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Manage accounts and their transactions</p>
        </div>
        <Button variant="secondary" onClick={()=>setShowCardForm(v=>!v)}>+ Add Account</Button>
      </div>

      {showCardForm && (
        <form className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4" onSubmit={addCard}>
          <div className="flex gap-3 flex-wrap items-center">
            <Input placeholder="Account Name" value={cardForm.name} onChange={(e)=>setCardForm(v=>({ ...v, name:e.target.value }))} required />
            <Input className="w-8 h-8 p-0 cursor-pointer bg-transparent [appearance:auto]" type="color" value={cardForm.color} onChange={(e)=>setCardForm(v=>({ ...v, color:e.target.value }))} />
            <Input className="w-28" placeholder="Last 4" value={cardForm.last4} onChange={(e)=>setCardForm(v=>({ ...v, last4:e.target.value.replace(/[^0-9]/g,'').slice(0,4) }))} required />
            <Button type="submit">Save</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <h3 className="text-lg font-semibold mb-2">Accounts</h3>
            <ul className="space-y-2">
              {cards.map(card => (
                <li
                  key={card.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg p-2 cursor-pointer transition-colors border border-[var(--border)]',
                    selectedId===card.id
                      ? 'bg-[var(--muted)] text-[var(--foreground)] shadow-sm border-l-4'
                      : 'hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                  style={selectedId===card.id ? { borderLeftColor: card.color } : undefined}
                  onClick={()=>setSelectedId(card.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: card.color }}></span>
                    <div>
                      <div className="font-medium">{card.name}</div>
                      <div className="text-xs tracking-widest text-[var(--muted-foreground)]">**** {card.last4}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-md hover:bg-[var(--muted)]" aria-label="Edit" onClick={(e)=>{e.stopPropagation(); startEditCard(card);}}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.862 3.487a2.25 2.25 0 013.182 3.182l-10.5 10.5a2.25 2.25 0 01-.845.53l-3.682 1.228a.75.75 0 01-.948-.948l1.228-3.682a2.25 2.25 0 01.53-.845l10.5-10.5z"/></svg>
                    </button>
                    <button className="p-2 rounded-md hover:bg-[var(--muted)]" aria-label="Delete" onClick={(e)=>{e.stopPropagation(); deleteCard(card.id);}}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 7.5h12M9.75 7.5v-1.5A1.5 1.5 0 0111.25 4.5h1.5A1.5 1.5 0 0114.25 6v1.5M8.25 9.75v7.5m7.5-7.5v7.5M5.25 7.5l.75 12a1.5 1.5 0 001.5 1.5h8.5a1.5 1.5 0 001.5-1.5l.75-12"/></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {editingCardId && (
              <div className="mt-3 flex items-center gap-2">
                <Input className="px-2 py-1" value={editCardForm.name} onChange={(e)=>setEditCardForm(v=>({ ...v, name:e.target.value }))} />
                <Input className="w-8 h-8 p-0 cursor-pointer bg-transparent [appearance:auto]" type="color" value={editCardForm.color} onChange={(e)=>setEditCardForm(v=>({ ...v, color:e.target.value }))} />
                <Input className="px-2 py-1 w-24" value={editCardForm.last4} onChange={(e)=>setEditCardForm(v=>({ ...v, last4:e.target.value.replace(/[^0-9]/g,'').slice(0,4) }))} />
                <Button className="px-2 py-1" onClick={()=>saveEditCard(editingCardId)}>Save</Button>
                <Button className="px-2 py-1" variant="outline" onClick={()=>setEditingCardId(null)}>Cancel</Button>
              </div>
            )}
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Income</span>
                <span className="font-semibold">${summary.income.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Expenses</span>
                <span className="font-semibold">${summary.expense.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 mt-2">
                <span>Balance</span>
                <span className="font-semibold">${(summary.income - summary.expense).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Add {mode === 'expense' ? 'Expense' : 'Income'}</h3>
              <div className="flex gap-2">
                <Button variant={mode==='expense'?'secondary':'outline'} onClick={()=>setMode('expense')}>Expense</Button>
                <Button variant={mode==='income'?'secondary':'outline'} onClick={()=>setMode('income')}>Income</Button>
              </div>
            </div>
            {addError && <Alert variant="error" message={addError} onClose={()=>setAddError('')} className="mb-3" />}
            <form onSubmit={addTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Description" value={txForm.description} onChange={(e)=>setTxForm(v=>({ ...v, description:e.target.value }))} required />
              <Input type="number" placeholder="Amount" value={txForm.amount} onChange={(e)=>setTxForm(v=>({ ...v, amount:e.target.value }))} required />
              <DateInput value={txForm.date} onChange={(v)=>setTxForm(s=>({ ...s, date:v }))} />
              <Select value={txForm.categoryId} onChange={(e)=>setTxForm(v=>({ ...v, categoryId:e.target.value }))}>
                <option value="">No Category</option>
                {(mode==='expense' ? expenseCats : incomeCats).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Select value={txForm.paymentMethod} onChange={(e)=>setTxForm(v=>({ ...v, paymentMethod:e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </Select>
              <div className="md:col-span-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>

          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Transactions</h3>
              <div className="flex items-center gap-2">
                <Select value={txLimit} onChange={(e)=>setTxLimit(parseInt(e.target.value,10))}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Select>
                <div className="text-sm text-[var(--muted-foreground)]">Total: {txTotal}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-[var(--border)]">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {txItems.map(t => (
                    <tr key={t.id} className="border-b border-[var(--border)]">
                      <>
                        <td className="py-2 px-3">{t.date}</td>
                        <td className="py-2 px-3">{t.type}</td>
                        <td className="py-2 px-3">{t.description}</td>
                        <td className="py-2 px-3">{t.Category?.name || '-'}</td>
                        <td className="py-2 px-3">${Number(t.amount).toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <div className="flex gap-2">
                            <button className="p-2 rounded-md hover:bg-[var(--muted)]" aria-label="Edit" onClick={()=>startEditTx(t)}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.862 3.487a2.25 2.25 0 013.182 3.182l-10.5 10.5a2.25 2.25 0 01-.845.53l-3.682 1.228a.75.75 0 01-.948-.948l1.228-3.682a2.25 2.25 0 01.53-.845l10.5-10.5z"/></svg>
                            </button>
                            <button className="p-2 rounded-md hover:bg-[var(--muted)]" aria-label="Delete" onClick={()=>deleteTransaction(t.id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 7.5h12M9.75 7.5v-1.5A1.5 1.5 0 0111.25 4.5h1.5A1.5 1.5 0 0114.25 6v1.5M8.25 9.75v7.5m7.5-7.5v7.5M5.25 7.5l.75 12a1.5 1.5 0 001.5 1.5h8.5a1.5 1.5 0 001.5-1.5l.75-12"/></svg>
                            </button>
                          </div>
                        </td>
                      </>
                    </tr>
                  ))}
                  {txItems.length === 0 && (
                    <tr><td className="py-6 text-center text-[var(--muted-foreground)]" colSpan={6}>No transactions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <EditTransactionDialog
              open={editOpen}
              onOpenChange={(o)=>{ if(!o) cancelEditTx(); }}
              initial={editTxData}
              expenseCats={expenseCats}
              incomeCats={incomeCats}
              onSave={saveEditTx}
              onCancel={cancelEditTx}
              error={editError}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm">Page {txPage} of {totalPages}</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={()=>setTxPage(1)} disabled={txPage===1}>First</Button>
                <Button variant="outline" onClick={()=>setTxPage(p=>Math.max(1,p-1))} disabled={txPage===1}>Prev</Button>
                <Button variant="outline" onClick={()=>setTxPage(p=>Math.min(totalPages,p+1))} disabled={txPage>=totalPages}>Next</Button>
                <Button variant="outline" onClick={()=>setTxPage(totalPages)} disabled={txPage>=totalPages}>Last</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
