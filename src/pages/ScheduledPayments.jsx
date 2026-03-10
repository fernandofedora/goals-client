import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Select from '../components/ui/select';
import { cn } from '../lib/utils';

// ── Period labels ─────────────────────────────────────────────────────────────
const PERIOD_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const PERIOD_ICONS = {
  daily: '☀️',
  weekly: '📅',
  'bi-weekly': '🗓️',
  monthly: '📆',
  quarterly: '📊',
  yearly: '🗃️',
};

// ── Payment method config ─────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'account', label: 'Account', icon: '🏦' },
];

const EMPTY_FORM = {
  name: '',
  type: 'expense',
  amount: '',
  period: 'monthly',
  paymentMethod: '',
  CardId: '',
  AccountId: '',
  CategoryId: '',
  description: '',
  startDate: '',
  endDate: '',
  specificDay: '',
};

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        {children}
      </div>
    </div>
  );
}

// ── Payment Method Picker ─────────────────────────────────────────────────────
function PaymentMethodPicker({ value, onChange, hasError }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        Payment Method<span className="text-rose-500 ml-0.5">*</span>
      </label>
      <div className={cn(
        'flex gap-2 p-1 rounded-xl border bg-gray-50 dark:bg-slate-800/50',
        hasError
          ? 'border-rose-400 dark:border-rose-500'
          : 'border-[var(--border)]'
      )}>
        {PAYMENT_METHODS.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-150',
              value === m.value
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
      {hasError && (
        <p className="text-xs text-rose-500 font-medium">Please select a payment method.</p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ScheduledPayments() {
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [methodError, setMethodError] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // ── Data loading (parallel) ───────────────────────────────────────────────
  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [payRes, catRes, cardRes, accRes] = await Promise.all([
        api.get('/scheduled-payments'),
        api.get('/categories'),
        api.get('/cards'),
        api.get('/accounts'),
      ]);
      setPayments(payRes.data);
      setCategories(catRes.data);
      setCards(cardRes.data);
      setAccounts(accRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);
  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(''), 6000); return () => clearTimeout(t); }, [error]);

  // ── Form ──────────────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleMethodChange = (method) => {
    setMethodError(false);
    setFormState(prev => ({ ...prev, paymentMethod: method, CardId: '', AccountId: '' }));
  };

  const openNew = () => {
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setMethodError(false);
    setIsFormOpen(true);
  };

  const openEdit = (payment) => {
    setEditingId(payment.id);
    setMethodError(false);
    setFormState({
      name: payment.name || '',
      type: payment.type || 'expense',
      amount: payment.amount || '',
      period: payment.period || 'monthly',
      paymentMethod: payment.paymentMethod || '',
      CategoryId: payment.CategoryId ?? payment.Category?.id ?? '',
      CardId: payment.CardId ?? payment.Card?.id ?? '',
      AccountId: payment.AccountId ?? payment.Account?.id ?? '',
      description: payment.description || '',
      startDate: payment.startDate ? String(payment.startDate).slice(0, 10) : '',
      endDate: payment.endDate ? String(payment.endDate).slice(0, 10) : '',
      specificDay: payment.specificDay ?? '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.paymentMethod) {
      setMethodError(true);
      return;
    }
    try {
      const payload = {
        ...formState,
        amount: parseFloat(formState.amount || 0),
        CategoryId: formState.CategoryId || null,
        CardId: formState.paymentMethod === 'card' ? (formState.CardId || null) : null,
        AccountId: formState.paymentMethod === 'account' ? (formState.AccountId || null) : null,
        specificDay: formState.specificDay ? parseInt(formState.specificDay) : null,
      };
      if (editingId) {
        await api.put(`/scheduled-payments/${editingId}`, payload);
        setSuccess('Payment updated');
      } else {
        await api.post('/scheduled-payments', payload);
        setSuccess('Payment created');
      }
      setIsFormOpen(false);
      setEditingId(null);
      load();
    } catch (err) {
      console.error(err);
      setError('Failed to save payment');
    }
  };

  const handleStatusChange = async (payment) => {
    try {
      const newStatus = payment.status === 'active' ? 'paused' : 'active';
      await api.put(`/scheduled-payments/${payment.id}`, { status: newStatus });
      setSuccess(`Payment ${newStatus === 'active' ? 'resumed' : 'paused'}`);
      load();
    } catch (err) {
      console.error(err);
      setError('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/scheduled-payments/${deleteTargetId}`);
      setDeleteTargetId(null);
      setSuccess('Payment deleted');
      load();
    } catch (err) {
      console.error(err);
      setError('Failed to delete payment');
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activeCount = payments.filter(p => p.status === 'active').length;
  const totalMonthly = payments
    .filter(p => p.status === 'active')
    .reduce((acc, p) => {
      const amt = Number(p.amount);
      if (p.period === 'monthly') return acc + amt;
      if (p.period === 'yearly') return acc + amt / 12;
      if (p.period === 'weekly') return acc + amt * 4.33;
      if (p.period === 'bi-weekly') return acc + amt * 2.17;
      if (p.period === 'daily') return acc + amt * 30;
      if (p.period === 'quarterly') return acc + amt / 3;
      return acc;
    }, 0);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getPaymentMethodBadge = (payment) => {
    if (payment.paymentMethod === 'cash') return <span className="flex items-center gap-1">💵 <span>Cash</span></span>;
    if (payment.paymentMethod === 'account' && payment.Account) return <span className="flex items-center gap-1">🏦 <span>{payment.Account.name}</span></span>;
    if (payment.paymentMethod === 'card' && payment.Card) return <span className="flex items-center gap-1">💳 <span>{payment.Card.name}</span></span>;
    if (payment.Card) return <span className="flex items-center gap-1">💳 <span>{payment.Card.name}</span></span>;
    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      {/* Toasts */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-sm">
          <span>⚠️</span> {error}
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm">
          <span>✓</span> {success}
          <button onClick={() => setSuccess('')} className="ml-auto text-emerald-400 hover:text-emerald-600">✕</button>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)} />
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-base mb-1">Delete payment?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTargetId(null)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Scheduled Payments</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage your recurring income and expenses</p>
          </div>
          {/* Summary pills */}
          <div className="flex gap-2 flex-wrap text-xs font-semibold items-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
              {activeCount} active
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
              ≈ ${totalMonthly.toFixed(2)}/mo
            </span>
            <Button
              onClick={openNew}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              + New Payment
            </Button>
          </div>
        </div>
      </section>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col animate-pulse">
              <div className="h-1 w-full bg-gray-200 dark:bg-slate-700" />
              <div className="px-4 pt-4 pb-3 flex flex-col gap-3">
                <div className="flex justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/4" />
                  </div>
                  <div className="h-5 w-14 bg-gray-100 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="h-7 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-7 bg-gray-100 dark:bg-slate-800 rounded-lg w-2/3" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded" />
                  <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="px-4 py-3 border-t border-[var(--border)] flex gap-2">
                <div className="h-7 w-14 bg-gray-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-7 w-16 bg-gray-100 dark:bg-slate-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <span className="text-5xl opacity-20">🗓️</span>
          <p className="text-sm text-gray-400 font-medium">No scheduled payments yet</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">Create your first recurring payment to get started.</p>
          <Button onClick={openNew} className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white">+ New Payment</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payments.map(payment => {
            const isExpense = payment.type === 'expense';
            const isActive = payment.status === 'active';
            const category = payment.Category;
            const methodBadge = getPaymentMethodBadge(payment);
            return (
              <div
                key={payment.id}
                className={cn(
                  'group bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                  isActive ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-70'
                )}
              >
                {/* Card top accent bar */}
                <div className={cn(
                  'h-1 w-full',
                  isExpense ? 'bg-rose-500' : 'bg-emerald-500'
                )} />

                {/* Card body */}
                <div className="px-4 pt-4 pb-3 flex flex-col gap-3 flex-1">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{payment.name}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{payment.type}</p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0',
                      isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    )}>
                      {payment.status}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className={cn(
                    'text-2xl font-bold tabular-nums',
                    isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {isExpense ? '−' : '+'}${Number(payment.amount).toFixed(2)}
                  </div>

                  {/* Next Due Date — always shown, prominent */}
                  <div className={cn(
                    'flex items-center gap-2 text-xs font-semibold rounded-lg px-2.5 py-1.5 w-fit',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                  )}>
                    <span>📅</span>
                    <span>Next due: {payment.nextDueDate
                      ? new Date(payment.nextDueDate + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                    </span>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <span>{PERIOD_ICONS[payment.period] || '🔁'}</span>
                      <span className="capitalize">{PERIOD_LABELS[payment.period] || payment.period}</span>
                    </div>
                    {category && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        {category.color && <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: category.color }} />}
                        <span className="text-gray-600 dark:text-gray-300 truncate">{category.name}</span>
                      </div>
                    )}
                    {methodBadge && (
                      <div className="flex items-center gap-1.5 col-span-2 text-gray-500 dark:text-gray-400">
                        {methodBadge}
                      </div>
                    )}
                    {payment.description && (
                      <div className="col-span-2 text-gray-400 dark:text-gray-500 truncate" title={payment.description}>
                        {payment.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions footer */}
                <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-slate-800/20">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEdit(payment)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleStatusChange(payment)}
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-lg font-medium transition-colors',
                        isActive
                          ? 'border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          : 'border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      )}
                    >
                      {isActive ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                  <button
                    onClick={() => setDeleteTargetId(payment.id)}
                    className="px-3 py-1.5 text-xs rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingId(null); }}>
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">{editingId ? 'Edit' : 'New'} Scheduled Payment</h2>
          <p className="text-xs text-gray-400 mt-0.5">Fill in the details for your recurring payment.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="sm:col-span-2">
            <Field label="Name" required>
              <Input name="name" value={formState.name} onChange={handleInputChange} placeholder="e.g. Netflix, Rent…" required />
            </Field>
          </div>

          {/* Type */}
          <Field label="Type">
            <Select name="type" value={formState.type} onChange={handleInputChange}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </Field>

          {/* Amount */}
          <Field label="Amount ($)" required>
            <Input name="amount" type="number" step="0.01" value={formState.amount} onChange={handleInputChange} placeholder="0.00" required />
          </Field>

          {/* Period */}
          <Field label="Period">
            <Select name="period" value={formState.period} onChange={handleInputChange}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </Field>

          {/* Specific Day */}
          <Field label="Specific Day (optional)">
            <Input name="specificDay" type="number" min="1" max="31" value={formState.specificDay} onChange={handleInputChange} placeholder="e.g. 15" />
          </Field>

          {/* Category */}
          <Field label="Category" required>
            <Select name="CategoryId" value={formState.CategoryId} onChange={handleInputChange} required>
              <option value="">Select category</option>
              {categories
                .filter(c => c.type === formState.type)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>

          {/* Start Date */}
          <Field label="Start Date" required>
            <Input name="startDate" type="date" value={formState.startDate} onChange={handleInputChange} required />
          </Field>

          {/* End Date */}
          <Field label="End Date" required>
            <Input name="endDate" type="date" value={formState.endDate} onChange={handleInputChange} required />
          </Field>

          {/* Description */}
          <div className="sm:col-span-2">
            <Field label="Description (optional)">
              <Input name="description" value={formState.description} onChange={handleInputChange} placeholder="Additional notes…" />
            </Field>
          </div>

          {/* ── Payment Method (mandatory) ── */}
          <div className="sm:col-span-2">
            <PaymentMethodPicker
              value={formState.paymentMethod}
              onChange={handleMethodChange}
              hasError={methodError}
            />
          </div>

          {/* Sub-field: Card (only when 'card' selected) */}
          {formState.paymentMethod === 'card' && (
            <div className="sm:col-span-2">
              <Field label="Credit Card">
                <Select name="CardId" value={formState.CardId} onChange={handleInputChange}>
                  <option value="">Select a card</option>
                  {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                </Select>
              </Field>
            </div>
          )}

          {/* Sub-field: Account (only when 'account' selected) */}
          {formState.paymentMethod === 'account' && (
            <div className="sm:col-span-2">
              <Field label="Bank Account">
                <Select name="AccountId" value={formState.AccountId} onChange={handleInputChange}>
                  <option value="">Select an account</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </Select>
              </Field>
            </div>
          )}

          {/* Actions */}
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsFormOpen(false); setEditingId(null); }}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium"
            >
              Cancel
            </button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              {editingId ? 'Save Changes' : 'Create Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
