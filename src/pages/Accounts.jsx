import { useEffect, useMemo, useState, useCallback } from 'react';
import api from '../api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Select from '../components/ui/select';
import DateInput from '../components/DateInput';
import Alert from '../components/ui/alert';
import EditTransactionDialog from '../components/ui/edit-transaction-dialog';
import { cn } from '../lib/utils';

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function IconButton({ onClick, title, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0',
        danger
          ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
      )}
    >
      {children}
    </button>
  );
}

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

// Account types to unify cards + bank accounts in one list
const ACCOUNT_CARD = 'card';
const ACCOUNT_BANK = 'bank';

export default function Accounts() {
  // ── Data ─────────────────────────────────────────────────────────────────
  const [cards, setCards] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  // ── Hidden cards & bank accounts (persisted locally) ──────────────────────
  const [hiddenCardIds, setHiddenCardIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('accounts.hiddenCardIds') || '[]'); }
    catch { return []; }
  });
  const [hiddenBankIds, setHiddenBankIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('accounts.hiddenBankIds') || '[]'); }
    catch { return []; }
  });

  // ── Selected account (unified: {kind, id}) ────────────────────────────────
  const [selectedItem, setSelectedItem] = useState(() => {
    try { return JSON.parse(localStorage.getItem('accounts.selectedItem') || 'null'); }
    catch { return null; }
  });

  const visibleCards = useMemo(() => cards.filter(c => !hiddenCardIds.includes(c.id)), [cards, hiddenCardIds]);
  const hiddenCards = useMemo(() => cards.filter(c => hiddenCardIds.includes(c.id)), [cards, hiddenCardIds]);
  const visibleBankAccounts = useMemo(() => bankAccounts.filter(a => !hiddenBankIds.includes(a.id)), [bankAccounts, hiddenBankIds]);
  const hiddenBankAccounts = useMemo(() => bankAccounts.filter(a => hiddenBankIds.includes(a.id)), [bankAccounts, hiddenBankIds]);

  useEffect(() => {
    localStorage.setItem('accounts.hiddenCardIds', JSON.stringify(hiddenCardIds));
  }, [hiddenCardIds]);
  useEffect(() => {
    localStorage.setItem('accounts.hiddenBankIds', JSON.stringify(hiddenBankIds));
  }, [hiddenBankIds]);

  useEffect(() => {
    localStorage.setItem('accounts.selectedItem', JSON.stringify(selectedItem));
  }, [selectedItem]);

  // ── Transactions ──────────────────────────────────────────────────────────
  const [txItems, setTxItems] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(10);
  const [txTotal, setTxTotal] = useState(0);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });

  // ── Add-transaction form ──────────────────────────────────────────────────
  const [txMode, setTxMode] = useState('expense');
  const [txForm, setTxForm] = useState({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), categoryId: '', paymentMethod: 'cash' });
  const [addError, setAddError] = useState('');

  // ── Add Account panel ─────────────────────────────────────────────────────
  const [showAddPanel, setShowAddPanel] = useState(false);
  // addTab: 'newCard' | 'newBank' | 'linkCard' | 'linkBank'
  const [addTab, setAddTab] = useState('newCard');

  // New card form
  const [cardForm, setCardForm] = useState({ name: '', color: '#0ea5e9', last4: '' });
  const [editingCardId, setEditingCardId] = useState(null);
  const [editCardForm, setEditCardForm] = useState({ name: '', color: '#0ea5e9', last4: '' });

  // New bank account form
  const [bankForm, setBankForm] = useState({ name: '', color: '#10b981', initialBalance: '' });
  const [editingBankId, setEditingBankId] = useState(null);
  const [editBankForm, setEditBankForm] = useState({ name: '', color: '#10b981' });

  // Link existing
  const [cardToLink, setCardToLink] = useState('');
  const [bankToLink, setBankToLink] = useState('');

  // ── Edit transaction dialog ───────────────────────────────────────────────
  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxData, setEditTxData] = useState({ type: 'expense', description: '', categoryId: '', amount: '', date: '', paymentMethod: 'cash' });
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState('');

  const expenseCats = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCats = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadBase = useCallback(async () => {
    const [cardsRes, catsRes, accRes] = await Promise.all([
      api.get('/cards'), api.get('/categories'), api.get('/accounts')
    ]);
    setCards(cardsRes.data);
    setCategories(catsRes.data);
    setBankAccounts(accRes.data);

    // Auto-select first visible item if nothing selected
    const currentHidden = JSON.parse(localStorage.getItem('accounts.hiddenCardIds') || '[]');
    const currentHiddenBanks = JSON.parse(localStorage.getItem('accounts.hiddenBankIds') || '[]');
    const visible = cardsRes.data.filter(c => !currentHidden.includes(c.id));
    const visibleBanks = accRes.data.filter(a => !currentHiddenBanks.includes(a.id));
    const current = JSON.parse(localStorage.getItem('accounts.selectedItem') || 'null');

    if (!current) {
      if (visible.length > 0) {
        const item = { kind: ACCOUNT_CARD, id: visible[0].id };
        setSelectedItem(item);
      } else if (visibleBanks.length > 0) {
        const item = { kind: ACCOUNT_BANK, id: visibleBanks[0].id };
        setSelectedItem(item);
      }
    }
  }, []);

  const loadTransactionsPage = useCallback(async (item, page, limit) => {
    if (!item) { setTxItems([]); setTxTotal(0); return; }
    const params = item.kind === ACCOUNT_CARD
      ? { cardId: item.id, page, limit }
      : { accountId: item.id, page, limit };
    const res = await api.get('/transactions', { params });
    setTxItems(res.data.items || []);
    setTxTotal(res.data.total || 0);
  }, []);

  const loadSummary = useCallback(async (item) => {
    if (!item) { setSummary({ income: 0, expense: 0 }); return; }
    const params = item.kind === ACCOUNT_CARD
      ? { cardId: item.id }
      : { accountId: item.id };
    const res = await api.get('/transactions', { params });
    const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
    const income = items.filter(i => i.type === 'income').reduce((a, b) => a + Number(b.amount), 0);
    const expense = items.filter(i => i.type === 'expense').reduce((a, b) => a + Number(b.amount), 0);
    setSummary({ income, expense });
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    setTxPage(1);
    setTxForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), categoryId: '', paymentMethod: 'cash' });
    loadTransactionsPage(selectedItem, 1, txLimit);
    loadSummary(selectedItem);
  }, [selectedItem]);

  useEffect(() => {
    loadTransactionsPage(selectedItem, txPage, txLimit);
  }, [txPage, txLimit]);

  const totalPages = Math.max(1, Math.ceil(txTotal / txLimit));

  // ── Card CRUD ─────────────────────────────────────────────────────────────
  const addCard = async (e) => {
    e.preventDefault();
    await api.post('/cards', cardForm);
    setCardForm({ name: '', color: '#0ea5e9', last4: '' });
    setShowAddPanel(false);
    await loadBase();
  };

  const saveEditCard = async (id) => {
    await api.put(`/cards/${id}`, editCardForm);
    setEditingCardId(null);
    loadBase();
    loadTransactionsPage(selectedItem, txPage, txLimit);
    loadSummary(selectedItem);
  };

  const hideCard = (id) => {
    if (!confirm('Remove from this list? (Data is preserved)')) return;
    setHiddenCardIds(prev => [...prev, id]);
    if (selectedItem?.kind === ACCOUNT_CARD && selectedItem?.id === id) {
      const remaining = visibleCards.filter(c => c.id !== id);
      const next = remaining[0] ? { kind: ACCOUNT_CARD, id: remaining[0].id }
        : visibleBankAccounts[0] ? { kind: ACCOUNT_BANK, id: visibleBankAccounts[0].id } : null;
      setSelectedItem(next);
    }
  };

  const linkCard = () => {
    if (!cardToLink) return;
    setHiddenCardIds(prev => prev.filter(hid => hid !== parseInt(cardToLink, 10)));
    setCardToLink('');
    setShowAddPanel(false);
  };

  // ── Bank Account CRUD ─────────────────────────────────────────────────────
  const addBankAccount = async (e) => {
    e.preventDefault();
    const res = await api.post('/accounts', {
      name: bankForm.name,
      color: bankForm.color,
      initialBalance: parseFloat(bankForm.initialBalance || '0'),
    });
    setBankForm({ name: '', color: '#10b981', initialBalance: '' });
    setShowAddPanel(false);
    await loadBase();
    setSelectedItem({ kind: ACCOUNT_BANK, id: res.data.id });
  };

  const saveEditBank = async (id) => {
    await api.put(`/accounts/${id}`, editBankForm);
    setEditingBankId(null);
    loadBase();
  };

  // Hide bank account (same pattern as cards — data preserved)
  const hideBank = (id) => {
    if (!confirm('Remove from list? Data and transactions are preserved.')) return;
    setHiddenBankIds(prev => [...prev, id]);
    if (selectedItem?.kind === ACCOUNT_BANK && selectedItem?.id === id) {
      const remaining = visibleBankAccounts.filter(a => a.id !== id);
      const next = remaining[0] ? { kind: ACCOUNT_BANK, id: remaining[0].id }
        : visibleCards[0] ? { kind: ACCOUNT_CARD, id: visibleCards[0].id } : null;
      setSelectedItem(next);
    }
  };

  // Restore a hidden bank account
  const linkBank = () => {
    if (!bankToLink) return;
    setHiddenBankIds(prev => prev.filter(hid => hid !== parseInt(bankToLink, 10)));
    setBankToLink('');
    setShowAddPanel(false);
  };

  // ── Transaction CRUD ──────────────────────────────────────────────────────
  const addTransaction = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    const amt = Number(txForm.amount);
    if (!txForm.description.trim()) { setAddError('Description is required'); return; }
    if (!(amt > 0)) { setAddError('Amount must be > 0'); return; }
    const payload = {
      type: txMode,
      description: txForm.description,
      amount: amt,
      date: txForm.date,
      categoryId: txForm.categoryId || null,
      paymentMethod: txMode === 'income' ? 'cash' : txForm.paymentMethod,
    };
    if (selectedItem.kind === ACCOUNT_CARD) payload.cardId = selectedItem.id;
    else payload.accountId = selectedItem.id;

    await api.post('/transactions', payload);
    setTxForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), categoryId: '', paymentMethod: 'cash' });
    setAddError('');
    loadTransactionsPage(selectedItem, 1, txLimit);
    loadSummary(selectedItem);
    setTxPage(1);
  };

  const deleteTransaction = async (id) => {
    await api.delete(`/transactions/${id}`);
    loadTransactionsPage(selectedItem, txPage, txLimit);
    loadSummary(selectedItem);
  };

  const startEditTx = (t) => {
    setEditingTxId(t.id);
    setEditTxData({
      type: t.type, description: t.description || '',
      categoryId: t.CategoryId || t.Category?.id || '',
      amount: (t.amount ?? '').toString(),
      date: t.date || new Date().toISOString().slice(0, 10),
      paymentMethod: t.paymentMethod || 'cash',
    });
    setEditOpen(true); setEditError('');
  };

  const cancelEditTx = () => { setEditOpen(false); setEditingTxId(null); };

  const saveEditTx = async (data, patchOnly) => {
    if (patchOnly) { setEditTxData(data); return; }
    const amt = parseFloat(data.amount || 0);
    if (!data.description.trim()) { setEditError('Description is required'); return; }
    if (!(amt > 0)) { setEditError('Amount must be > 0'); return; }
    const payload = { ...data, amount: amt, paymentMethod: data.type === 'income' ? 'cash' : data.paymentMethod };
    if (selectedItem?.kind === ACCOUNT_CARD) payload.cardId = selectedItem.id;
    await api.put(`/transactions/${editingTxId}`, payload);
    cancelEditTx();
    loadTransactionsPage(selectedItem, txPage, txLimit);
    loadSummary(selectedItem);
  };

  // ── Unified account list for the left sidebar ─────────────────────────────
  const allItems = [
    ...visibleCards.map(c => ({ kind: ACCOUNT_CARD, ...c, emoji: '💳' })),
    ...visibleBankAccounts.map(a => ({ kind: ACCOUNT_BANK, ...a, emoji: '🏦' })),
  ];

  const selectedData = selectedItem
    ? (selectedItem.kind === ACCOUNT_CARD
      ? visibleCards.find(c => c.id === selectedItem.id)
      : visibleBankAccounts.find(a => a.id === selectedItem.id))
    : null;

  const isSelected = (kind, id) => selectedItem?.kind === kind && selectedItem?.id === id;

  // ── Tab config for Add Account panel ─────────────────────────────────────
  const addTabs = [
    { id: 'newCard', label: '💳 New Card' },
    { id: 'newBank', label: '🏦 Bank Account' },
    ...(hiddenCards.length > 0 ? [{ id: 'linkCard', label: '🔗 Link Card' }] : []),
    ...(hiddenBankAccounts.length > 0 ? [{ id: 'linkBank', label: '🏦 Link Bank' }] : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-5 space-y-5">

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Accounts</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage credit cards and bank accounts</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => { setShowAddPanel(v => !v); setAddTab('newCard'); }}
        >
          {showAddPanel ? '✕ Close' : '+ Add Account'}
        </Button>
      </div>

      {/* ── Add Account panel ─────────────────────────────────────────────── */}
      {showAddPanel && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex gap-0 border-b border-[var(--border)] px-1 pt-1 bg-gray-50/50 dark:bg-slate-800/30">
            {addTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAddTab(tab.id)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg border-b-2 -mb-px',
                  addTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── New Card ── */}
            {addTab === 'newCard' && (
              <form onSubmit={addCard} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Card Name</label>
                  <Input placeholder="e.g. Visa Platinum" value={cardForm.name} onChange={e => setCardForm(v => ({ ...v, name: e.target.value }))} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Color</label>
                  <input
                    className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                    type="color" value={cardForm.color}
                    onChange={e => setCardForm(v => ({ ...v, color: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Last 4</label>
                  <Input
                    className="w-24" placeholder="0000"
                    value={cardForm.last4}
                    onChange={e => setCardForm(v => ({ ...v, last4: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
                    required
                  />
                </div>
                <Button type="submit" variant="primary">Add Card</Button>
              </form>
            )}

            {/* ── New Bank Account ── */}
            {addTab === 'newBank' && (
              <form onSubmit={addBankAccount} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Account Name</label>
                  <Input placeholder="e.g. Chase Checking" value={bankForm.name} onChange={e => setBankForm(v => ({ ...v, name: e.target.value }))} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Color</label>
                  <input
                    className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                    type="color" value={bankForm.color}
                    onChange={e => setBankForm(v => ({ ...v, color: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Starting Balance</label>
                  <Input
                    type="number" step="0.01" className="w-32" placeholder="0.00"
                    value={bankForm.initialBalance}
                    onChange={e => setBankForm(v => ({ ...v, initialBalance: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Account</Button>
              </form>
            )}

            {/* ── Link Existing Card ── */}
            {addTab === 'linkCard' && (
              <div className="flex gap-3 items-end">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Hidden Cards</label>
                  <Select value={cardToLink} onChange={e => setCardToLink(e.target.value)}>
                    <option value="">Select a card to restore…</option>
                    {hiddenCards.map(c => <option key={c.id} value={c.id}>{c.name} (•••• {c.last4})</option>)}
                  </Select>
                </div>
                <Button onClick={linkCard} disabled={!cardToLink} variant="primary">Restore</Button>
              </div>
            )}

            {/* ── Link Existing Bank Account ── */}
            {addTab === 'linkBank' && (
              <div className="flex gap-3 items-end">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Hidden Bank Accounts</label>
                  <Select value={bankToLink} onChange={e => setBankToLink(e.target.value)}>
                    <option value="">Select an account to restore…</option>
                    {hiddenBankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </div>
                <Button onClick={linkBank} disabled={!bankToLink} className="bg-emerald-600 hover:bg-emerald-700 text-white">Restore</Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Left: unified account list */}
        <div className="md:col-span-1 space-y-4">

          {/* Account list card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Your Accounts</h3>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {allItems.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-gray-400">
                  No accounts yet.<br /><span className="text-xs">Use "+ Add Account" to get started.</span>
                </li>
              )}
              {allItems.map(item => {
                const sel = isSelected(item.kind, item.id);
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    {/* Edit state */}
                    {(item.kind === ACCOUNT_CARD && editingCardId === item.id) && (
                      <div className="px-4 py-3 space-y-2">
                        <Input value={editCardForm.name} onChange={e => setEditCardForm(v => ({ ...v, name: e.target.value }))} placeholder="Name" />
                        <div className="flex gap-2 items-center">
                          <input className="w-8 h-8 rounded cursor-pointer border border-[var(--border)] p-0.5" type="color"
                            value={editCardForm.color} onChange={e => setEditCardForm(v => ({ ...v, color: e.target.value }))} />
                          <Input className="w-24" value={editCardForm.last4}
                            onChange={e => setEditCardForm(v => ({ ...v, last4: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))} placeholder="Last 4" />
                        </div>
                        <div className="flex gap-2">
                          <Button className="text-xs px-3 py-1.5" onClick={() => saveEditCard(item.id)}>Save</Button>
                          <Button className="text-xs px-3 py-1.5" variant="outline" onClick={() => setEditingCardId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                    {(item.kind === ACCOUNT_BANK && editingBankId === item.id) && (
                      <div className="px-4 py-3 space-y-2">
                        <Input value={editBankForm.name} onChange={e => setEditBankForm(v => ({ ...v, name: e.target.value }))} placeholder="Name" />
                        <input className="w-8 h-8 rounded cursor-pointer border border-[var(--border)] p-0.5" type="color"
                          value={editBankForm.color} onChange={e => setEditBankForm(v => ({ ...v, color: e.target.value }))} />
                        <div className="flex gap-2">
                          <Button className="text-xs px-3 py-1.5" onClick={() => saveEditBank(item.id)}>Save</Button>
                          <Button className="text-xs px-3 py-1.5" variant="outline" onClick={() => setEditingBankId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                    {/* Normal state */}
                    {(item.kind === ACCOUNT_CARD ? editingCardId !== item.id : editingBankId !== item.id) && (
                      <button
                        type="button"
                        onClick={() => setSelectedItem({ kind: item.kind, id: item.id })}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 text-left transition-colors group',
                          sel
                            ? 'bg-indigo-50 dark:bg-indigo-950/30'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800/40',
                        )}
                        style={sel ? { borderLeft: `3px solid ${item.color}` } : { borderLeft: '3px solid transparent' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-base leading-none flex-shrink-0">{item.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.name}</p>
                            <p className="text-[11px] text-gray-400 tracking-widest">
                              {item.kind === ACCOUNT_CARD
                                ? `•••• ${item.last4}`
                                : item.initialBalance > 0 ? `Opens $${Number(item.initialBalance).toFixed(2)}` : 'Bank account'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <IconButton
                            title="Edit"
                            onClick={e => {
                              e.stopPropagation();
                              if (item.kind === ACCOUNT_CARD) { setEditingCardId(item.id); setEditCardForm({ name: item.name, color: item.color, last4: item.last4 }); }
                              else { setEditingBankId(item.id); setEditBankForm({ name: item.name, color: item.color }); }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" /></svg>
                          </IconButton>
                          <IconButton
                            title={item.kind === ACCOUNT_CARD ? 'Hide' : 'Hide'}
                            danger
                            onClick={e => {
                              e.stopPropagation();
                              if (item.kind === ACCOUNT_CARD) hideCard(item.id);
                              else hideBank(item.id);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" /></svg>
                          </IconButton>
                        </div>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Summary card */}
          {selectedData && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: selectedData.color }} />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">{selectedData.name}</h3>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Income', value: summary.income, color: 'text-emerald-600' },
                  { label: 'Expenses', value: summary.expense, color: 'text-rose-500' },
                  { label: 'Balance', value: summary.income - summary.expense, color: null, bold: true, border: true },
                ].map(({ label, value, color, bold, border }) => (
                  <div key={label} className={cn('flex items-center justify-between', border && 'border-t border-[var(--border)] pt-2 mt-2')}>
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={cn('tabular-nums', bold && 'font-bold', color)}>${value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: transactions */}
        <div className="md:col-span-2 space-y-4">

          {/* Add transaction */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-tight">
                Add {txMode === 'expense' ? 'Expense' : 'Income'}
                {selectedData && <span className="ml-1 font-normal text-gray-400">· {selectedData.name}</span>}
              </h3>
              <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--muted)] p-0.5 gap-0.5">
                {['expense', 'income'].map(m => (
                  <button key={m} type="button" onClick={() => setTxMode(m)}
                    className={cn(
                      'px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all duration-150',
                      txMode === m
                        ? m === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    )}
                  >
                    {m === 'expense' ? '↑ Expense' : '↓ Income'}
                  </button>
                ))}
              </div>
            </div>
            {addError && <Alert variant="error" message={addError} onClose={() => setAddError('')} className="mx-5 mt-3" />}
            <form onSubmit={addTransaction} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input placeholder="Description" value={txForm.description} onChange={e => setTxForm(v => ({ ...v, description: e.target.value }))} required />
              </div>
              <Input type="number" step="0.01" placeholder="Amount (0.00)" value={txForm.amount} onChange={e => setTxForm(v => ({ ...v, amount: e.target.value }))} required />
              <DateInput value={txForm.date} onChange={e => setTxForm(v => ({ ...v, date: e.target.value }))} />
              <Select value={txForm.categoryId} onChange={e => setTxForm(v => ({ ...v, categoryId: e.target.value }))}>
                <option value="">No category</option>
                {(txMode === 'expense' ? expenseCats : incomeCats).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {txMode === 'expense' && (
                <Select value={txForm.paymentMethod} onChange={e => setTxForm(v => ({ ...v, paymentMethod: e.target.value }))}>
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                </Select>
              )}
              <div className="sm:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={!selectedItem}
                  className={cn(
                    'px-6 font-semibold',
                    txMode === 'expense' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  )}
                >
                  {!selectedItem ? 'Select an account first' : `+ ${txMode === 'expense' ? 'Add Expense' : 'Add Income'}`}
                </Button>
              </div>
            </form>
          </div>

          {/* Transaction history */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-tight">Transactions</h3>
              <div className="flex items-center gap-2 text-xs">
                <Select value={txLimit} onChange={e => setTxLimit(parseInt(e.target.value, 10))}>
                  {[10, 20, 50].map(n => <option key={n} value={n}>{n} per page</option>)}
                </Select>
                <span className="text-gray-400">{txTotal} total</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-[var(--border)]">
                    {['Date', 'Type', 'Description', 'Category', 'Amount', ''].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {txItems.map(t => (
                    <tr key={t.id} className="group hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-3"><Badge type={t.type} /></td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100 max-w-[180px] truncate">{t.description}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{t.Category?.name || '—'}</td>
                      <td className={cn(
                        'px-4 py-3 font-semibold tabular-nums whitespace-nowrap',
                        t.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      )}>
                        {t.type === 'expense' ? '−' : '+'}${Number(t.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconButton onClick={() => startEditTx(t)} title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" /></svg>
                          </IconButton>
                          <IconButton onClick={() => deleteTransaction(t.id)} title="Delete" danger>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" /></svg>
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {txItems.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                      <p>No transactions yet</p>
                      <p className="text-xs mt-1">{selectedItem ? 'Add your first one above.' : 'Select an account from the left panel.'}</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
              <span className="text-gray-400">Page {txPage} of {totalPages}</span>
              <div className="flex gap-1">
                {[{ label: '«', action: () => setTxPage(1), disabled: txPage === 1 },
                { label: '‹', action: () => setTxPage(p => Math.max(1, p - 1)), disabled: txPage === 1 },
                { label: '›', action: () => setTxPage(p => Math.min(totalPages, p + 1)), disabled: txPage >= totalPages },
                { label: '»', action: () => setTxPage(totalPages), disabled: txPage >= totalPages },
                ].map(({ label, action, disabled }) => (
                  <button key={label} onClick={action} disabled={disabled}
                    className="w-7 h-7 rounded-lg border border-[var(--border)] text-sm font-medium transition-colors disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-800">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit tx dialog */}
      <EditTransactionDialog
        open={editOpen}
        onOpenChange={o => { if (!o) cancelEditTx(); }}
        initial={editTxData}
        expenseCats={expenseCats}
        incomeCats={incomeCats}
        cards={[]}
        onSave={saveEditTx}
        onCancel={cancelEditTx}
        error={editError}
      />
    </div>
  );
}
