import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import api from '../api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Select from '../components/ui/select';
import ConfirmDialog from '../components/ui/confirm-dialog';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useCurrency, ALL_CURRENCIES, POPULAR_CURRENCIES } from '../context/CurrencyContext';

// ── Field wrapper ─────────────────────────────────────────────────────────────
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

// ── Icon button ───────────────────────────────────────────────────────────────
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

// ── SVG icons ─────────────────────────────────────────────────────────────────
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
  </svg>
);

// ── Section card shell ────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, action, overflowVisible, children }) {
  return (
    <section className={cn(
      "bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm",
      !overflowVisible && "overflow-hidden"
    )}>
      <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <span className="text-3xl opacity-30">📭</span>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

// ── Category list row (must be defined OUTSIDE Settings to avoid focus loss) ───
function CatRow({ cat, editingCatId, editCatForm, setEditCatForm, saveEditCat, cancelEditCat, startEditCat, setDeleteCatId }) {
  const { symbol: cs } = useCurrency();
  return (
    <li className="px-5 py-3 flex items-center justify-between gap-3">
      {editingCatId === cat.id ? (
        <div className="flex-1 flex flex-wrap items-end gap-3">
          <Field label="Name">
            <Input className="w-44" value={editCatForm.name} onChange={e => setEditCatForm(v => ({ ...v, name: e.target.value }))} />
          </Field>
          <Field label="Type">
            <Select value={editCatForm.type} onChange={e => setEditCatForm(v => ({ ...v, type: e.target.value }))}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </Field>
          <Field label="Color">
            <input className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]" type="color" value={editCatForm.color} onChange={e => setEditCatForm(v => ({ ...v, color: e.target.value }))} />
          </Field>
          <Field label="Monthly Budget">
            <Input
              type="number" step="0.01" min="0" placeholder="No limit"
              className="w-32"
              value={editCatForm.monthlyBudget}
              onChange={e => setEditCatForm(v => ({ ...v, monthlyBudget: e.target.value }))}
            />
          </Field>
          <div className="flex gap-1.5 pb-0.5">
            <button type="button" onClick={() => saveEditCat(cat.id)} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium">Save</button>
            <button type="button" onClick={cancelEditCat} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{cat.name}</span>
            {cat.monthlyBudget != null && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                {cs}{Number(cat.monthlyBudget).toFixed(0)}/mo
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <IconButton onClick={() => startEditCat(cat)} title="Edit category"><EditIcon /></IconButton>
            <IconButton onClick={() => setDeleteCatId(cat.id)} title="Delete category" danger><TrashIcon /></IconButton>
          </div>
        </>
      )}
    </li>
  );
}

// ── Currency Selector — premium combobox w/ popular quick-picks ───────────────
function CurrencySelector() {
  const { code, setCurrency, symbol } = useCurrency();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside (client-event-listeners)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Filtered results — memoized, case-insensitive across code + name + symbol
  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_CURRENCIES;
    const q = query.toLowerCase().trim();
    return ALL_CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  }, [query]);

  const select = useCallback((c) => {
    setCurrency(c.code);
    setOpen(false);
    setQuery('');
  }, [setCurrency]);

  // Find the current active currency object for display
  const activeCurrency = ALL_CURRENCIES.find(c => c.code === code) || ALL_CURRENCIES.find(c => c.code === 'USD');

  return (
    <SectionCard
      title="Currency"
      subtitle="Choose the currency symbol displayed across the app — no conversion is applied."
      overflowVisible
    >
      <div className="px-5 py-5 space-y-4">

        {/* ── Currently selected ─────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white text-lg font-bold shadow-sm">
            {activeCurrency.symbol}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{activeCurrency.code}</p>
            <p className="text-[11px] text-indigo-500 dark:text-indigo-400">{activeCurrency.name}</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500">Active</span>
        </div>

        {/* ── Popular quick-picks ────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Popular</p>
          <div className="flex gap-2 flex-wrap">
            {POPULAR_CURRENCIES.map(c => {
              const active = c.code === code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => select(c)}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border',
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-[1.02]'
                      : 'bg-white dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 border-[var(--border)] hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm'
                  )}
                >
                  <span className={cn(
                    'flex items-center justify-center w-6 h-6 rounded text-xs font-bold tabular-nums',
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                  )}>
                    {c.symbol}
                  </span>
                  {c.code}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Search combobox ────────────────────────────────────── */}
        <div ref={wrapperRef} className="relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">All currencies</p>
          <div className="relative">
            {/* Search icon */}
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Search by name, code, or symbol…"
              className={cn(
                'w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-800 dark:text-white placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-600',
                'border-[var(--border)] transition-colors'
              )}
              id="currency-search"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
                aria-label="Clear search"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* ── Dropdown results ─────────────────────────────────── */}
          {open && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-1">
                  <span className="text-2xl opacity-30">🔍</span>
                  <p className="text-sm text-gray-400">No currencies match "{query}"</p>
                </div>
              ) : (
                <ul className="py-1" role="listbox">
                  {filtered.map(c => {
                    const active = c.code === code;
                    return (
                      <li key={c.code} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onClick={() => select(c)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            active
                              ? 'bg-indigo-50 dark:bg-indigo-950/30'
                              : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'
                          )}
                        >
                          <span className={cn(
                            'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold tabular-nums',
                            active
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                          )}>
                            {c.symbol}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              'text-sm font-semibold truncate',
                              active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'
                            )}>
                              {c.code}
                              <span className="ml-2 font-normal text-gray-400 text-xs">{c.name}</span>
                            </p>
                          </div>
                          {active && (
                            <svg className="flex-shrink-0 w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const { symbol: cs } = useCurrency();

  // ── Add forms ──────────────────────────────────────────────────────────────
  const [catForm, setCatForm] = useState({ name: '', type: 'expense', color: '#3b82f6' });
  const [cardForm, setCardForm] = useState({ name: '', color: '#0ea5e9', last4: '' });
  const [accountForm, setAccountForm] = useState({ name: '', color: '#a3e635', initialBalance: '' });

  const [showCatForm, setShowCatForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);

  // ── Category edit ──────────────────────────────────────────────────────────
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatForm, setEditCatForm] = useState({ name: '', type: 'expense', color: '#3b82f6', monthlyBudget: '' });

  // ── Card edit ──────────────────────────────────────────────────────────────
  const [editingCardId, setEditingCardId] = useState(null);
  const [editCardForm, setEditCardForm] = useState({ name: '', color: '#0ea5e9', last4: '' });

  // ── Account edit ───────────────────────────────────────────────────────────
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editAccountForm, setEditAccountForm] = useState({ name: '', color: '#a3e635', initialBalance: '' });

  // ── Confirm delete ─────────────────────────────────────────────────────────
  const [deleteCatId, setDeleteCatId] = useState(null);
  const [deleteCardId, setDeleteCardId] = useState(null);
  const [deleteAccountId, setDeleteAccountId] = useState(null);

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [catRes, cardRes, accRes] = await Promise.all([
        api.get('/categories'), api.get('/cards'), api.get('/accounts'),
      ]);
      setCategories(catRes.data);
      setCards(cardRes.data);
      setAccounts(accRes.data);
    } catch {
      toast.error('Failed to load data');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── CRUD: categories ───────────────────────────────────────────────────────
  const addCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', catForm);
      setCatForm({ name: '', type: 'expense', color: '#3b82f6' });
      setShowCatForm(false);
      toast.success('Category added'); load();
    } catch { toast.error('Failed to add category'); }
  };

  const startEditCat = (cat) => { setEditingCatId(cat.id); setEditCatForm({ name: cat.name, type: cat.type, color: cat.color, monthlyBudget: cat.monthlyBudget != null ? String(cat.monthlyBudget) : '' }); };
  const cancelEditCat = () => setEditingCatId(null);
  const saveEditCat = async (id) => {
    try {
      const payload = { ...editCatForm, monthlyBudget: editCatForm.monthlyBudget !== '' ? Number(editCatForm.monthlyBudget) : null };
      await api.put(`/categories/${id}`, payload);
      setEditingCatId(null); toast.success('Category updated'); load();
    } catch { toast.error('Failed to update category'); }
  };

  const confirmDeleteCat = async () => {
    try {
      const txRes = await api.get('/transactions');
      const inUse = txRes.data.some(t => t.Category?.id === deleteCatId);
      if (inUse) { setDeleteCatId(null); toast.error('Cannot delete: category is used in transactions'); return; }
      await api.delete(`/categories/${deleteCatId}`);
      setDeleteCatId(null); toast.success('Category deleted'); load();
    } catch { toast.error('Failed to delete category'); }
  };

  // ── CRUD: cards ────────────────────────────────────────────────────────────
  const addCard = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cards', cardForm);
      setCardForm({ name: '', color: '#0ea5e9', last4: '' });
      setShowCardForm(false);
      toast.success('Card added'); load();
    } catch { toast.error('Failed to add card'); }
  };

  const startEditCard = (card) => { setEditingCardId(card.id); setEditCardForm({ name: card.name, color: card.color, last4: card.last4 }); };
  const cancelEditCard = () => setEditingCardId(null);
  const saveEditCard = async (id) => {
    try {
      await api.put(`/cards/${id}`, editCardForm);
      setEditingCardId(null); toast.success('Card updated'); load();
    } catch { toast.error('Failed to update card'); }
  };

  const confirmDeleteCard = async () => {
    try {
      await api.delete(`/cards/${deleteCardId}`);
      setDeleteCardId(null); toast.success('Card deleted'); load();
    } catch { toast.error('Failed to delete card'); }
  };

  // ── CRUD: accounts ─────────────────────────────────────────────────────────
  const addAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts', accountForm);
      setAccountForm({ name: '', color: '#a3e635', initialBalance: '' });
      setShowAccountForm(false);
      toast.success('Account added'); load();
    } catch { toast.error('Failed to add account'); }
  };

  const confirmDeleteAccount = async () => {
    try {
      await api.delete(`/accounts/${deleteAccountId}`);
      setDeleteAccountId(null); toast.success('Account deleted'); load();
    } catch { toast.error('Failed to delete account'); }
  };

  const startEditAccount = (account) => {
    setEditingAccountId(account.id);
    setEditAccountForm({ name: account.name, color: account.color, initialBalance: account.initialBalance ?? '' });
  };
  const cancelEditAccount = () => setEditingAccountId(null);
  const saveEditAccount = async (id) => {
    try {
      await api.put(`/accounts/${id}`, editAccountForm);
      setEditingAccountId(null); toast.success('Account updated'); load();
    } catch { toast.error('Failed to update account'); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const expenseCats = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCats = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5">

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={deleteCatId !== null}
        onOpenChange={o => { if (!o) setDeleteCatId(null); }}
        title="Delete category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        onConfirm={confirmDeleteCat} onCancel={() => setDeleteCatId(null)}
      />
      <ConfirmDialog
        open={deleteCardId !== null}
        onOpenChange={o => { if (!o) setDeleteCardId(null); }}
        title="Delete card"
        description="Are you sure you want to delete this card? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        onConfirm={confirmDeleteCard} onCancel={() => setDeleteCardId(null)}
      />
      <ConfirmDialog
        open={deleteAccountId !== null}
        onOpenChange={o => { if (!o) setDeleteAccountId(null); }}
        title="Delete account"
        description="Are you sure you want to delete this account? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        onConfirm={confirmDeleteAccount} onCancel={() => setDeleteAccountId(null)}
      />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your accounts, categories and credit cards</p>
      </div>

      {/* ── Currency Selector ─────────────────────────────────────────────── */}
      <CurrencySelector />

      {/* ── Accounts ──────────────────────────────────────────────────────── */}
      <SectionCard
        title="Accounts"
        subtitle="Manage your bank accounts"
        action={
          <Button variant="secondary" size="sm" onClick={() => setShowAccountForm(v => !v)}>
            {showAccountForm ? 'Cancel' : '+ Add Account'}
          </Button>
        }
      >
        {showAccountForm && (
          <form className="px-5 pt-4 pb-5 border-b border-[var(--border)] flex flex-wrap gap-4 items-end" onSubmit={addAccount}>
            <Field label="Name">
              <Input placeholder="e.g. Chase Checking" value={accountForm.name} onChange={e => setAccountForm(v => ({ ...v, name: e.target.value }))} required />
            </Field>
            <Field label="Initial Balance ($)">
              <Input type="number" step="0.01" placeholder="0.00" value={accountForm.initialBalance} onChange={e => setAccountForm(v => ({ ...v, initialBalance: e.target.value }))} />
            </Field>
            <Field label="Color">
              <input className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]" type="color" value={accountForm.color} onChange={e => setAccountForm(v => ({ ...v, color: e.target.value }))} />
            </Field>
            <div className="pb-0.5">
              <Button type="submit" variant="primary">Save Account</Button>
            </div>
          </form>
        )}

        {accounts.length === 0 ? (
          <EmptyState message="No accounts yet. Add one to get started." />
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map(account => (
              <div
                key={account.id}
                className="relative rounded-xl p-4 text-white overflow-hidden"
                style={{ background: editingAccountId === account.id ? editAccountForm.color : account.color }}
              >
                {/* subtle inner overlay for depth */}
                <div className="absolute inset-0 bg-black/10 pointer-events-none" aria-hidden />
                <div className="relative flex items-center justify-between gap-2">
                  {editingAccountId === account.id ? (
                    <div className="flex flex-wrap gap-2 items-end flex-1">
                      <Field label="Name">
                        <Input
                          className="bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm"
                          value={editAccountForm.name}
                          onChange={e => setEditAccountForm(v => ({ ...v, name: e.target.value }))}
                        />
                      </Field>
                      <Field label="Initial Balance ($)">
                        <Input
                          type="number" step="0.01"
                          className="w-28 bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm"
                          value={editAccountForm.initialBalance}
                          onChange={e => setEditAccountForm(v => ({ ...v, initialBalance: e.target.value }))}
                        />
                      </Field>
                      <Field label="Color">
                        <input
                          className="w-9 h-9 rounded-lg border border-white/30 cursor-pointer bg-transparent [appearance:auto]"
                          type="color"
                          value={editAccountForm.color}
                          onChange={e => setEditAccountForm(v => ({ ...v, color: e.target.value }))}
                        />
                      </Field>
                      <div className="flex gap-1.5 pb-0.5">
                        <button type="button" onClick={() => saveEditAccount(account.id)} className="px-3 py-1.5 text-xs rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium backdrop-blur-sm">Save</button>
                        <button type="button" onClick={cancelEditAccount} className="px-3 py-1.5 text-xs rounded-lg border border-white/30 text-white font-medium">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🏦</span>
                          <span className="font-semibold text-base leading-tight">{account.name}</span>
                        </div>
                        <p className="text-[13px] text-white/80 mt-0.5">
                          Initial: {cs}{parseFloat(account.initialBalance ?? 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEditAccount(account)}
                          title="Edit account"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-white/80 hover:bg-white/20"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteAccountId(account.id)}
                          title="Delete account"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-white/80 hover:bg-white/20"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <SectionCard
        title="Categories"
        subtitle="Manage your expense and income categories"
      >
        {/* Expense sub-section */}
        <div>
          <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-[var(--border)] bg-gray-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Expense</span>
              <span className="text-xs text-gray-400 tabular-nums">({expenseCats.length})</span>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => { setCatForm({ name: '', type: 'expense', color: '#3b82f6' }); setShowCatForm(showCatForm && catForm.type === 'expense' ? false : true); }}
            >
              + Add
            </Button>
          </div>

          {showCatForm && catForm.type === 'expense' && (
            <form className="px-5 py-4 border-b border-[var(--border)] bg-rose-50/30 dark:bg-rose-950/10 flex flex-wrap gap-4 items-end" onSubmit={addCategory}>
              <Field label="Name">
                <Input placeholder="e.g. Groceries" value={catForm.name} onChange={e => setCatForm(v => ({ ...v, name: e.target.value }))} required />
              </Field>
              <Field label="Color">
                <input className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]" type="color" value={catForm.color} onChange={e => setCatForm(v => ({ ...v, color: e.target.value }))} />
              </Field>
              <Field label="Monthly Budget ($)">
                <Input
                  type="number" step="0.01" min="0" placeholder="No limit"
                  className="w-32"
                  value={catForm.monthlyBudget || ''}
                  onChange={e => setCatForm(v => ({ ...v, monthlyBudget: e.target.value }))}
                />
              </Field>
              <div className="pb-0.5 flex gap-1.5">
                <Button type="submit" variant="primary">Save</Button>
                <button type="button" onClick={() => setShowCatForm(false)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 font-medium">Cancel</button>
              </div>
            </form>
          )}

          {expenseCats.length === 0 ? (
            <EmptyState message="No expense categories yet." />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {expenseCats.map(cat => (
                <CatRow
                  key={cat.id}
                  cat={cat}
                  editingCatId={editingCatId}
                  editCatForm={editCatForm}
                  setEditCatForm={setEditCatForm}
                  saveEditCat={saveEditCat}
                  cancelEditCat={cancelEditCat}
                  startEditCat={startEditCat}
                  setDeleteCatId={setDeleteCatId}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Income sub-section */}
        <div className="border-t border-[var(--border)]">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-[var(--border)] bg-gray-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Income</span>
              <span className="text-xs text-gray-400 tabular-nums">({incomeCats.length})</span>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => { setCatForm({ name: '', type: 'income', color: '#16a34a' }); setShowCatForm(showCatForm && catForm.type === 'income' ? false : true); }}
            >
              + Add
            </Button>
          </div>

          {showCatForm && catForm.type === 'income' && (
            <form className="px-5 py-4 border-b border-[var(--border)] bg-emerald-50/30 dark:bg-emerald-950/10 flex flex-wrap gap-4 items-end" onSubmit={addCategory}>
              <Field label="Name">
                <Input placeholder="e.g. Salary" value={catForm.name} onChange={e => setCatForm(v => ({ ...v, name: e.target.value }))} required />
              </Field>
              <Field label="Color">
                <input className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]" type="color" value={catForm.color} onChange={e => setCatForm(v => ({ ...v, color: e.target.value }))} />
              </Field>
              <Field label="Monthly Budget ($)">
                <Input
                  type="number" step="0.01" min="0" placeholder="No limit"
                  className="w-32"
                  value={catForm.monthlyBudget || ''}
                  onChange={e => setCatForm(v => ({ ...v, monthlyBudget: e.target.value }))}
                />
              </Field>
              <div className="pb-0.5 flex gap-1.5">
                <Button type="submit" variant="primary">Save</Button>
                <button type="button" onClick={() => setShowCatForm(false)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 font-medium">Cancel</button>
              </div>
            </form>
          )}

          {incomeCats.length === 0 ? (
            <EmptyState message="No income categories yet." />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {incomeCats.map(cat => (
                <CatRow
                  key={cat.id}
                  cat={cat}
                  editingCatId={editingCatId}
                  editCatForm={editCatForm}
                  setEditCatForm={setEditCatForm}
                  saveEditCat={saveEditCat}
                  cancelEditCat={cancelEditCat}
                  startEditCat={startEditCat}
                  setDeleteCatId={setDeleteCatId}
                />
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      {/* ── Credit Cards ──────────────────────────────────────────────────── */}
      <SectionCard
        title="Credit Cards"
        subtitle="Manage your credit cards for expense tracking"
        action={
          <Button variant="secondary" size="sm" onClick={() => setShowCardForm(v => !v)}>
            {showCardForm ? 'Cancel' : '+ Add Card'}
          </Button>
        }
      >
        {showCardForm && (
          <form className="px-5 pt-4 pb-5 border-b border-[var(--border)] flex flex-wrap gap-4 items-end" onSubmit={addCard}>
            <Field label="Card Name">
              <Input placeholder="e.g. Visa Gold" value={cardForm.name} onChange={e => setCardForm(v => ({ ...v, name: e.target.value }))} required />
            </Field>
            <Field label="Last 4 digits">
              <Input className="w-28" placeholder="1234" value={cardForm.last4} onChange={e => setCardForm(v => ({ ...v, last4: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))} required />
            </Field>
            <Field label="Color">
              <input className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]" type="color" value={cardForm.color} onChange={e => setCardForm(v => ({ ...v, color: e.target.value }))} />
            </Field>
            <div className="pb-0.5">
              <Button type="submit" variant="primary">Save Card</Button>
            </div>
          </form>
        )}

        {cards.length === 0 ? (
          <EmptyState message="No cards yet. Add one to start tracking card expenses." />
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map(card => (
              <div
                key={card.id}
                className="relative rounded-xl p-4 text-white overflow-hidden"
                style={{ background: card.color }}
              >
                <div className="absolute inset-0 bg-black/10 pointer-events-none" aria-hidden />
                <div className="relative flex items-center justify-between gap-2">
                  {editingCardId === card.id ? (
                    <div className="flex flex-wrap gap-2 items-end flex-1">
                      <Field label="Name">
                        <Input className="bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm" value={editCardForm.name} onChange={e => setEditCardForm(v => ({ ...v, name: e.target.value }))} />
                      </Field>
                      <Field label="Last 4">
                        <Input className="w-24 bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm" value={editCardForm.last4} onChange={e => setEditCardForm(v => ({ ...v, last4: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))} />
                      </Field>
                      <Field label="Color">
                        <input className="w-9 h-9 rounded-lg border border-white/30 cursor-pointer bg-transparent [appearance:auto]" type="color" value={editCardForm.color} onChange={e => setEditCardForm(v => ({ ...v, color: e.target.value }))} />
                      </Field>
                      <div className="flex gap-1.5 pb-0.5">
                        <button type="button" onClick={() => saveEditCard(card.id)} className="px-3 py-1.5 text-xs rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium backdrop-blur-sm">Save</button>
                        <button type="button" onClick={cancelEditCard} className="px-3 py-1.5 text-xs rounded-lg border border-white/30 text-white font-medium">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-6 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 7.5h19.5m-16.5 9h13.5A2.25 2.25 0 0021 14.25v-6A2.25 2.25 0 0018.75 6H5.25A2.25 2.25 0 003 8.25v6A2.25 2.25 0 005.25 16.5z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-base leading-tight">{card.name}</div>
                          <div className="text-[13px] text-white/80 tracking-widest">**** **** **** {card.last4}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEditCard(card)}
                          title="Edit card"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-white/80 hover:bg-white/20"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCardId(card.id)}
                          title="Delete card"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-white/80 hover:bg-white/20"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
