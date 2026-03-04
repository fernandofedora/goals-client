import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import { cn } from '../lib/utils';

// ── Simple modal overlay ───────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-[var(--border)] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-sm"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}

const selectClass =
  'w-full rounded-lg border border-[var(--border)] bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[var(--foreground)]';

// ── Payment method options (card, cash, account) ───────────────────────────────
const PAYMENT_METHODS = [
  { value: 'card', label: '💳 Tarjeta' },
  { value: 'cash', label: '💵 Efectivo' },
  { value: 'account', label: '🏦 Cuenta bancaria' },
];

const INITIAL_FORM = {
  name: '',
  type: 'expense',
  amount: '',
  period: 'monthly',
  CardId: '',
  CategoryId: '',
  paymentMethod: 'card',
  description: '',
  startDate: '',
  endDate: '',
  specificDay: '',
};

// ── Type badge ─────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
      type === 'income'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
        : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
    )}>
      {type === 'income' ? '↓ Ingreso' : '↑ Gasto'}
    </span>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
      status === 'active'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
    )}>
      {status === 'active' ? '● Activo' : '⏸ Pausado'}
    </span>
  );
}

const PERIOD_LABELS = {
  daily: 'Diario', weekly: 'Semanal', 'bi-weekly': 'Quincenal',
  monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual',
};

// ── Icon helpers ───────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export default function ScheduledPayments() {
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formState, setFormState] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [payRes, catRes, cardRes] = await Promise.all([
        api.get('/scheduled-payments'),
        api.get('/categories'),
        api.get('/cards'),
      ]);
      setPayments(payRes.data);
      setCategories(catRes.data);
      setCards(cardRes.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Form handlers ───────────────────────────────────────────────────────────
  const handleField = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditingPayment(null);
    setFormState(INITIAL_FORM);
    setError('');
    setIsFormOpen(true);
  };

  const openEdit = (payment) => {
    setEditingPayment(payment);
    setFormState({
      name: payment.name ?? '',
      type: payment.type ?? 'expense',
      amount: payment.amount ?? '',
      period: payment.period ?? 'monthly',
      // Sequelize returns CardId / CategoryId as integers on the parent model
      CardId: String(payment.CardId ?? payment.Card?.id ?? ''),
      CategoryId: String(payment.CategoryId ?? payment.Category?.id ?? ''),
      paymentMethod: payment.paymentMethod ?? 'card',
      description: payment.description ?? '',
      startDate: payment.startDate ? String(payment.startDate).slice(0, 10) : '',
      endDate: payment.endDate ? String(payment.endDate).slice(0, 10) : '',
      specificDay: payment.specificDay ?? '',
    });
    setError('');
    setIsFormOpen(true);
  };

  const closeForm = () => { setIsFormOpen(false); setEditingPayment(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const payload = {
        name: formState.name,
        type: formState.type,
        amount: Number(formState.amount),
        period: formState.period,
        CardId: formState.CardId ? Number(formState.CardId) : null,
        CategoryId: formState.CategoryId ? Number(formState.CategoryId) : null,
        paymentMethod: formState.paymentMethod,
        description: formState.description || null,
        startDate: formState.startDate,
        endDate: formState.endDate || null,
        specificDay: formState.specificDay ? Number(formState.specificDay) : null,
      };

      if (editingPayment) {
        await api.put(`/scheduled-payments/${editingPayment.id}`, payload);
      } else {
        await api.post('/scheduled-payments', payload);
      }
      await loadAll();
      closeForm();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.msg || 'Error al guardar. Revisa los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/scheduled-payments/${id}`);
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusToggle = async (payment) => {
    try {
      const newStatus = payment.status === 'active' ? 'paused' : 'active';
      await api.put(`/scheduled-payments/${payment.id}`, { status: newStatus });
      setPayments((prev) =>
        prev.map((p) => (p.id === payment.id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-4 pb-12 space-y-5">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos Programados</h1>
          <p className="text-sm text-gray-400 mt-0.5">Administra tus ingresos y gastos recurrentes</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
        >
          + Nuevo Pago
        </Button>
      </div>

      {/* ── Summary strip ───────────────────────────────────────────────────── */}
      {payments.length > 0 && (() => {
        const active = payments.filter(p => p.status === 'active');
        const totalExpense = active.filter(p => p.type === 'expense').reduce((s, p) => s + Number(p.amount), 0);
        const totalIncome = active.filter(p => p.type === 'income').reduce((s, p) => s + Number(p.amount), 0);
        return (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pagos activos', value: active.length, suffix: '', color: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Gastos mensuales', value: totalExpense, prefix: '-$', color: 'text-rose-600 dark:text-rose-400' },
              { label: 'Ingresos mensuales', value: totalIncome, prefix: '+$', color: 'text-emerald-600 dark:text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm px-4 py-3">
                <p className={cn('text-xl font-bold tabular-nums', s.color)}>
                  {s.prefix ?? ''}{typeof s.value === 'number' && s.prefix ? s.value.toFixed(2) : s.value}{s.suffix ?? ''}
                </p>
                <p className="text-[11px] text-gray-400 uppercase tracking-widest mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {payments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm">
          <span className="text-5xl opacity-40">🔄</span>
          <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">Sin pagos programados</h3>
          <p className="text-sm text-gray-400">Crea tu primer pago recurrente para empezar a rastrearlo.</p>
        </div>
      )}

      {/* ── Cards grid ──────────────────────────────────────────────────────── */}
      {payments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm p-5 flex flex-col gap-3 group"
            >
              {/* Card top row */}
              <div className="flex justify-between items-start gap-2">
                <h2 className="font-semibold text-base leading-tight text-gray-900 dark:text-white">{payment.name}</h2>
                <StatusBadge status={payment.status} />
              </div>

              {/* Type + amount */}
              <div className="flex items-end justify-between">
                <TypeBadge type={payment.type} />
                <p className={cn(
                  'text-2xl font-bold tabular-nums',
                  payment.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}>
                  {payment.type === 'income' ? '+' : '-'}${Number(payment.amount).toFixed(2)}
                </p>
              </div>

              {/* Meta info */}
              <div className="text-xs space-y-1 text-gray-500 dark:text-gray-400 border-t border-[var(--border)] pt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600 dark:text-gray-300">Período</span>
                  <span>{PERIOD_LABELS[payment.period] ?? payment.period}</span>
                </div>
                {payment.Category?.name && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Categoría</span>
                    <span>{payment.Category.name}</span>
                  </div>
                )}
                {payment.Card?.name && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Tarjeta</span>
                    <span>💳 {payment.Card.name}</span>
                  </div>
                )}
                {payment.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Método</span>
                    <span>
                      {payment.paymentMethod === 'card' ? '💳 Tarjeta' : payment.paymentMethod === 'cash' ? '💵 Efectivo' : '🏦 Cuenta'}
                    </span>
                  </div>
                )}
                {payment.nextDueDate && (() => {
                  // Parse YYYY-MM-DD as local time noon to avoid UTC timezone shifts backwards
                  const [y, m, d] = payment.nextDueDate.split('-');
                  const due = new Date(y, m - 1, d, 12, 0, 0);
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const isOverdue = due < today && payment.status === 'active';
                  return (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600 dark:text-gray-300">Próximo pago</span>
                      <span className={cn('flex items-center gap-1', isOverdue ? 'text-amber-600 dark:text-amber-400 font-semibold' : '')}>
                        {isOverdue && <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">⚠ Vencido</span>}
                        {due.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  );
                })()}

              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleStatusToggle(payment)}
                  className={cn(
                    'flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-colors',
                    payment.status === 'active'
                      ? 'border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      : 'border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  )}
                >
                  {payment.status === 'active' ? '⏸ Pausar' : '▶ Reanudar'}
                </button>
                <IconButton onClick={() => openEdit(payment)} title="Editar">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(payment.id)} title="Eliminar" danger>
                  <TrashIcon />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal form ──────────────────────────────────────────────────────── */}
      <Modal
        open={isFormOpen}
        onClose={closeForm}
        title={editingPayment ? 'Editar Pago Programado' : 'Nuevo Pago Programado'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-sm px-4 py-2.5">
              {error}
            </div>
          )}

          <Field label="Nombre">
            <Input name="name" value={formState.name} onChange={handleField} placeholder="Ej. Netflix, Renta, Salario…" required />
          </Field>

          {/* Type toggle */}
          <Field label="Tipo">
            <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--muted)] p-0.5 gap-0.5 w-full">
              {[{ v: 'expense', label: '↑ Gasto' }, { v: 'income', label: '↓ Ingreso' }].map(({ v, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFormState(prev => ({ ...prev, type: v }))}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150',
                    formState.type === v
                      ? v === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Monto ($)">
              <Input name="amount" type="number" step="0.01" value={formState.amount} onChange={handleField} placeholder="0.00" required />
            </Field>
            <Field label="Período">
              <select name="period" value={formState.period} onChange={handleField} className={selectClass}>
                <option key="daily" value="daily">Diario</option>
                <option key="weekly" value="weekly">Semanal</option>
                <option key="biweekly" value="bi-weekly">Quincenal</option>
                <option key="monthly" value="monthly">Mensual</option>
                <option key="quarterly" value="quarterly">Trimestral</option>
                <option key="yearly" value="yearly">Anual</option>
              </select>
            </Field>
          </div>

          {/* Payment method select */}
          <Field label="Método de pago">
            <select name="paymentMethod" value={formState.paymentMethod} onChange={handleField} className={selectClass}>
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Field>

          {/* Card select — only shown when method is 'card' */}
          {formState.paymentMethod === 'card' && (
            <Field label="Tarjeta">
              <select name="CardId" value={formState.CardId} onChange={handleField} className={selectClass} required>
                <option value="">Selecciona una tarjeta</option>
                {cards.map(card => (
                  <option key={card.id} value={String(card.id)}>{card.name}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Categoría">
            <select name="CategoryId" value={formState.CategoryId} onChange={handleField} className={selectClass} required>
              <option value="">Selecciona una categoría</option>
              {categories
                .filter(cat => cat.type === formState.type)
                .map(cat => (
                  <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                ))}
            </select>
          </Field>

          <Field label="Descripción (opcional)">
            <Input name="description" value={formState.description} onChange={handleField} placeholder="Nota adicional" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de inicio">
              <Input name="startDate" type="date" value={formState.startDate} onChange={handleField} required />
            </Field>
            <Field label="Fecha de fin (opcional)">
              <Input name="endDate" type="date" value={formState.endDate} onChange={handleField} />
            </Field>
          </div>

          <Field label="Día específico (opcional)">
            <Input name="specificDay" type="number" min="1" max="31" value={formState.specificDay} onChange={handleField} placeholder="Ej. 15 para el día 15 de cada mes" />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {loading
                ? (editingPayment ? 'Guardando…' : 'Creando…')
                : (editingPayment ? 'Guardar Cambios' : 'Crear Pago')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
