import { useEffect, useMemo, useState, useCallback } from 'react';
import api from '../api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Select from '../components/ui/select';
import Alert from '../components/ui/alert';
import ConfirmDialog from '../components/ui/confirm-dialog';
import { cn } from '../lib/utils';

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
function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
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

// ─────────────────────────────────────────────────────────────────────────────
export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // ── Add forms ──────────────────────────────────────────────────────────────
  const [catForm, setCatForm] = useState({ name: '', type: 'expense', color: '#3b82f6' });
  const [cardForm, setCardForm] = useState({ name: '', color: '#0ea5e9', last4: '' });
  const [accountForm, setAccountForm] = useState({ name: '', color: '#a3e635', initialBalance: '' });

  const [showCatForm, setShowCatForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);

  // ── Category edit ──────────────────────────────────────────────────────────
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatForm, setEditCatForm] = useState({ name: '', type: 'expense', color: '#3b82f6' });

  // ── Card edit ──────────────────────────────────────────────────────────────
  const [editingCardId, setEditingCardId] = useState(null);
  const [editCardForm, setEditCardForm] = useState({ name: '', color: '#0ea5e9', last4: '' });

  // ── Confirm delete ─────────────────────────────────────────────────────────
  const [deleteCatId, setDeleteCatId] = useState(null);
  const [deleteCardId, setDeleteCardId] = useState(null);
  const [deleteAccountId, setDeleteAccountId] = useState(null);

  // ── Feedback ───────────────────────────────────────────────────────────────
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }, [error]);

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
      setError('Failed to load data');
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
      setSuccess('Category added'); load();
    } catch { setError('Failed to add category'); }
  };

  const startEditCat = (cat) => { setEditingCatId(cat.id); setEditCatForm({ name: cat.name, type: cat.type, color: cat.color }); };
  const cancelEditCat = () => setEditingCatId(null);
  const saveEditCat = async (id) => {
    try {
      await api.put(`/categories/${id}`, editCatForm);
      setEditingCatId(null); setSuccess('Category updated'); load();
    } catch { setError('Failed to update category'); }
  };

  const confirmDeleteCat = async () => {
    try {
      const txRes = await api.get('/transactions');
      const inUse = txRes.data.some(t => t.Category?.id === deleteCatId);
      if (inUse) { setDeleteCatId(null); setError('Cannot delete: category is used in transactions'); return; }
      await api.delete(`/categories/${deleteCatId}`);
      setDeleteCatId(null); setSuccess('Category deleted'); load();
    } catch { setError('Failed to delete category'); }
  };

  // ── CRUD: cards ────────────────────────────────────────────────────────────
  const addCard = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cards', cardForm);
      setCardForm({ name: '', color: '#0ea5e9', last4: '' });
      setShowCardForm(false);
      setSuccess('Card added'); load();
    } catch { setError('Failed to add card'); }
  };

  const startEditCard = (card) => { setEditingCardId(card.id); setEditCardForm({ name: card.name, color: card.color, last4: card.last4 }); };
  const cancelEditCard = () => setEditingCardId(null);
  const saveEditCard = async (id) => {
    try {
      await api.put(`/cards/${id}`, editCardForm);
      setEditingCardId(null); setSuccess('Card updated'); load();
    } catch { setError('Failed to update card'); }
  };

  const confirmDeleteCard = async () => {
    try {
      await api.delete(`/cards/${deleteCardId}`);
      setDeleteCardId(null); setSuccess('Card deleted'); load();
    } catch { setError('Failed to delete card'); }
  };

  // ── CRUD: accounts ─────────────────────────────────────────────────────────
  const addAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts', accountForm);
      setAccountForm({ name: '', color: '#a3e635', initialBalance: '' });
      setShowAccountForm(false);
      setSuccess('Account added'); load();
    } catch { setError('Failed to add account'); }
  };

  const confirmDeleteAccount = async () => {
    try {
      await api.delete(`/accounts/${deleteAccountId}`);
      setDeleteAccountId(null); setSuccess('Account deleted'); load();
    } catch { setError('Failed to delete account'); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const expenseCats = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCats = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  // ── Category list row ─────────────────────────────────────────────────────
  const CatRow = ({ cat }) => (
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
          <div className="flex gap-1.5 pb-0.5">
            <button type="button" onClick={() => saveEditCat(cat.id)} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium">Save</button>
            <button type="button" onClick={cancelEditCat} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{cat.name}</span>
          </div>
          <div className="flex gap-1">
            <IconButton onClick={() => startEditCat(cat)} title="Edit category"><EditIcon /></IconButton>
            <IconButton onClick={() => setDeleteCatId(cat.id)} title="Delete category" danger><TrashIcon /></IconButton>
          </div>
        </>
      )}
    </li>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5">

      {/* Toasts */}
      {error && <Alert variant="error" message={error} onClose={() => setError('')} />}
      {success && <Alert variant="success" message={success} onClose={() => setSuccess('')} />}

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

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your accounts, categories and credit cards</p>
      </div>

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
                style={{ background: account.color }}
              >
                {/* subtle inner overlay for depth */}
                <div className="absolute inset-0 bg-black/10 pointer-events-none" aria-hidden />
                <div className="relative flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏦</span>
                      <span className="font-semibold text-base leading-tight">{account.name}</span>
                    </div>
                    <p className="text-[13px] text-white/80 mt-0.5">
                      Initial: ${parseFloat(account.initialBalance ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <IconButton
                    onClick={() => setDeleteAccountId(account.id)}
                    title="Delete account"
                    danger
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
                    </svg>
                  </IconButton>
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
              {expenseCats.map(cat => <CatRow key={cat.id} cat={cat} />)}
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
              {incomeCats.map(cat => <CatRow key={cat.id} cat={cat} />)}
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
