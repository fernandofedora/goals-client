import React, { useEffect, useMemo, useState, useCallback } from 'react';
import api from '../api';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Select from '../components/ui/select';
import Alert from '../components/ui/alert';
import ConfirmDialog from '../components/ui/confirm-dialog';
import DateInput from '../components/DateInput';
import { formatAmount } from '../utils/format';
import { cn } from '../lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Circular progress ring ────────────────────────────────────────────────────
function ProgressRing({ pct, size = 120, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(pct, 100) / 100;
  const color = pct >= 100 ? '#10b981' : pct >= 75 ? '#6366f1' : pct >= 40 ? '#6366f1' : '#6366f1';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        className="text-gray-200 dark:text-slate-700" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ title, subtitle, action, children, noPad }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
      {(title || action) && (
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPad ? '' : 'px-5 py-5'}>{children}</div>
    </section>
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

// ─────────────────────────────────────────────────────────────────────────────
export default function SavingPlan() {
  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planForm, setPlanForm] = useState({ name: '', targetAmount: '', linkedCategoryId: '' });
  const [summary, setSummary] = useState(null);
  const [contrForm, setContrForm] = useState({ amount: '', date: isoToday, note: '' });
  const [editingContrId, setEditingContrId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [confirmPlan, setConfirmPlan] = useState({ open: false });
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [initialLoad, setInitialLoad] = useState(true);

  const currentPlan = useMemo(() => plans.find(p => String(p.id) === String(selectedPlanId)), [plans, selectedPlanId]);

  // auto-dismiss message
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  // ── async-parallel: load categories + plans together ─────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [catsRes, plansRes] = await Promise.all([
          api.get('/categories'),
          api.get('/savings/plans'),
        ]);
        setCategories(catsRes.data || []);
        const p = plansRes.data || [];
        setPlans(p);
        if (p.length > 0) {
          const savedId = localStorage.getItem('savingPlan.selectedPlanId');
          const chosen = p.find(x => String(x.id) === String(savedId)) || p[0];
          setSelectedPlanId(String(chosen.id));
          setPlanForm({ name: chosen.name || '', targetAmount: String(chosen.targetAmount || ''), linkedCategoryId: String(chosen.linkedCategoryId || '') });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoad(false);
      }
    })();
  }, []);

  // load summary when plan changes
  useEffect(() => {
    if (!selectedPlanId) { setSummary(null); return; }
    api.get(`/savings/plans/${selectedPlanId}/summary`).then(r => setSummary(r.data)).catch(() => { });
  }, [selectedPlanId]);

  useEffect(() => {
    if (selectedPlanId) localStorage.setItem('savingPlan.selectedPlanId', String(selectedPlanId));
  }, [selectedPlanId]);

  // sync planForm when switching plans
  useEffect(() => {
    if (!currentPlan) return;
    setPlanForm({ name: currentPlan.name || '', targetAmount: String(currentPlan.targetAmount || ''), linkedCategoryId: String(currentPlan.linkedCategoryId || '') });
  }, [currentPlan]);



  const onPlanField = useCallback(e => setPlanForm(prev => ({ ...prev, [e.target.name]: e.target.value })), []);
  const onContrField = useCallback(e => setContrForm(prev => ({ ...prev, [e.target.name]: e.target.value })), []);

  const reloadSummary = useCallback(async () => {
    if (!selectedPlanId) return;
    const res = await api.get(`/savings/plans/${selectedPlanId}/summary`);
    setSummary(res.data);
  }, [selectedPlanId]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const createPlan = async () => {
    try {
      setLoading(true);
      const body = { name: planForm.name.trim(), targetAmount: Number(planForm.targetAmount), linkedCategoryId: planForm.linkedCategoryId ? Number(planForm.linkedCategoryId) : null };
      const res = await api.post('/savings/plans', body);
      setPlans(prev => [res.data, ...prev]);
      setSelectedPlanId(String(res.data.id));
      setShowNewPlan(false);
      setMessage({ type: 'success', text: 'Plan creado correctamente ✓' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al crear el plan' });
    } finally { setLoading(false); }
  };

  const updatePlan = async () => {
    if (!selectedPlanId) return;
    try {
      setLoading(true);
      const body = { name: planForm.name.trim(), targetAmount: Number(planForm.targetAmount), linkedCategoryId: planForm.linkedCategoryId ? Number(planForm.linkedCategoryId) : null };
      const res = await api.put(`/savings/plans/${selectedPlanId}`, body);
      setPlans(prev => prev.map(p => String(p.id) === String(selectedPlanId) ? res.data : p));
      await reloadSummary();
      setMessage({ type: 'success', text: 'Plan actualizado ✓' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al actualizar el plan' });
    } finally { setLoading(false); }
  };

  const deletePlan = async () => {
    try {
      setConfirmPlan({ open: false });
      await api.delete(`/savings/plans/${selectedPlanId}`);
      const updatedPlans = plans.filter(p => String(p.id) !== String(selectedPlanId));
      setPlans(updatedPlans);
      if (updatedPlans.length > 0) {
        setSelectedPlanId(String(updatedPlans[0].id));
      } else {
        setSelectedPlanId('');
        setPlanForm({ name: '', targetAmount: '', linkedCategoryId: '' });
      }
      setSummary(null);
      setMessage({ type: 'success', text: 'Plan eliminado' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar el plan' });
    }
  };

  const addContribution = async () => {
    if (!selectedPlanId) return;
    try {
      setLoading(true);
      await api.post('/savings/contributions', { planId: Number(selectedPlanId), amount: Number(contrForm.amount), date: contrForm.date, note: contrForm.note?.trim() || null });
      setContrForm({ amount: '', date: isoToday, note: '' });
      await reloadSummary();
      setMessage({ type: 'success', text: 'Contribución agregada ✓' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al agregar contribución' });
    } finally { setLoading(false); }
  };

  const updateContribution = async () => {
    if (!editingContrId) return;
    try {
      setLoading(true);
      await api.put(`/savings/contributions/${editingContrId}`, { amount: Number(contrForm.amount), date: contrForm.date, note: contrForm.note?.trim() || null });
      setContrForm({ amount: '', date: isoToday, note: '' });
      setEditingContrId(null);
      await reloadSummary();
      setMessage({ type: 'success', text: 'Contribución actualizada ✓' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al actualizar contribución' });
    } finally { setLoading(false); }
  };

  const deleteContribution = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/savings/contributions/${id}`);
      await reloadSummary();
      setMessage({ type: 'success', text: 'Contribución eliminada' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al eliminar' });
    } finally { setLoading(false); setConfirm({ open: false, id: null }); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const progressPct = summary ? Math.min(Math.round(summary.progressPercent), 100) : 0;
  const totalSaved = summary ? summary.totalManual + summary.totalAuto : 0;

  const rows = useMemo(() => {
    if (!summary) return [];
    const manual = (summary.contributions || []).map(c => ({ key: `c-${c.id}`, date: c.date, desc: c.note || 'Contribución manual', amount: c.amount, type: 'manual', c }));
    const auto = (summary.autoTransactions || []).map(t => ({ key: `t-${t.id}`, date: t.date, desc: t.description, amount: t.amount, type: 'auto', t }));
    return [...manual, ...auto].sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [summary]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginated = rows.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [rows.length, pageSize, totalPages, page]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-4 pb-12 space-y-5">

      {/* Toasts */}
      {message && (
        <Alert
          variant={message.type === 'error' ? 'error' : 'success'}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog open={confirm.open} title="Eliminar contribución" description="Esta acción no se puede deshacer."
        confirmText="Eliminar" cancelText="Cancelar"
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={() => deleteContribution(confirm.id)}
      />
      <ConfirmDialog open={confirmPlan.open} title="Eliminar plan" description="¿Seguro que deseas eliminar este plan y todas sus contribuciones?"
        confirmText="Eliminar" cancelText="Cancelar"
        onCancel={() => setConfirmPlan({ open: false })}
        onConfirm={deletePlan}
      />

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Savings Plans</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track your savings goals and contributions</p>
        </div>
        <Button
          variant={showNewPlan ? 'outline' : 'secondary'}
          onClick={() => {
            if (showNewPlan) {
              setShowNewPlan(false);
              const savedId = localStorage.getItem('savingPlan.selectedPlanId');
              const chosen = plans.find(x => String(x.id) === String(savedId)) || plans[0];
              if (chosen) setSelectedPlanId(String(chosen.id));
            } else {
              setShowNewPlan(true);
              setSelectedPlanId('');
              setPlanForm({ name: '', targetAmount: '', linkedCategoryId: '' });
            }
          }}
        >
          {showNewPlan ? 'Cancel' : '+ New Plan'}
        </Button>
      </div>

      {/* ── New plan form ─────────────────────────────────────────────────── */}
      {showNewPlan && (
        <Card title="New Savings Plan" subtitle="Define your goal and start saving">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Plan Name">
              <Input name="name" value={planForm.name} onChange={onPlanField} placeholder="e.g. Emergency Fund" />
            </Field>
            <Field label="Target Amount ($)">
              <Input name="targetAmount" type="number" step="0.01" value={planForm.targetAmount} onChange={onPlanField} placeholder="1000.00" />
            </Field>
            <Field label="Linked Category (optional)">
              <Select value={planForm.linkedCategoryId} onChange={onPlanField} name="linkedCategoryId">
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={createPlan}
              disabled={loading || !planForm.name || !planForm.targetAmount}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6"
            >
              {loading ? 'Creating…' : 'Create Plan'}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Plan tabs ─────────────────────────────────────────────────────── */}
      {!initialLoad && plans.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {plans.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPlanId(String(p.id));
                setShowNewPlan(false);
              }}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                String(p.id) === selectedPlanId
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-[var(--border)] hover:border-indigo-400'
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading state ───────────────────────────────────────────────────── */}
      {initialLoad && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-8 h-8 rounded-full border-[3px] border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500 animate-pulse">Cargando planes de ahorro...</p>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!initialLoad && plans.length === 0 && !showNewPlan && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <span className="text-5xl opacity-40">🎯</span>
          <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">No savings plans yet</h3>
          <p className="text-sm text-gray-400">Create your first plan to start tracking your savings goals.</p>
          <Button onClick={() => setShowNewPlan(true)} className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white">+ New Plan</Button>
        </div>
      )}

      {/* ── Selected plan content ─────────────────────────────────────────── */}
      {!initialLoad && currentPlan && (
        <>
          {/* Progress hero */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            {/* Gradient band */}
            <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* Ring */}
                <div className="relative flex-shrink-0">
                  <ProgressRing pct={progressPct} size={130} stroke={11} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{progressPct}%</span>
                    <span className="text-[11px] text-gray-400 uppercase tracking-widest">saved</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{currentPlan.name}</h3>
                    {currentPlan.linkedCategoryId && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-medium">
                        🔗 {categories.find(c => String(c.id) === String(currentPlan.linkedCategoryId))?.name || 'Categoría vinculada'}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">{formatAmount(totalSaved)}</span>
                      <span>Goal: {formatAmount(currentPlan.targetAmount)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', progressPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-600')}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                      <span>{formatAmount(summary?.remaining ?? 0)} remaining</span>
                      {progressPct >= 100 && <span className="text-emerald-600 font-bold">🎉 Goal reached!</span>}
                      {progressPct >= 90 && progressPct < 100 && <span className="text-amber-500 font-semibold">🔥 Almost there!</span>}
                    </div>
                  </div>

                  {/* Mini stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Manual', value: formatAmount(summary?.totalManual ?? 0), color: 'text-indigo-600 dark:text-indigo-400' },
                      { label: 'Auto', value: formatAmount(summary?.totalAuto ?? 0), color: 'text-violet-600 dark:text-violet-400' },
                      { label: 'Contributions', value: (summary?.contributions?.length ?? 0) + (summary?.autoTransactions?.length ?? 0), color: 'text-gray-700 dark:text-gray-200' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                        <p className={cn('text-base font-bold tabular-nums', s.color)}>{s.value}</p>
                        <p className="text-[11px] text-gray-400 uppercase tracking-widest">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Edit plan + contribute (two columns on md+) ─────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Edit plan */}
            <Card title="Edit Plan" subtitle="Update goal or linked category">
              <div className="space-y-4">
                <Field label="Plan Name">
                  <Input name="name" value={planForm.name} onChange={onPlanField} placeholder="Plan name" />
                </Field>
                <Field label="Target Amount ($)">
                  <Input name="targetAmount" type="number" step="0.01" value={planForm.targetAmount} onChange={onPlanField} placeholder="0.00" />
                </Field>
                <Field label="Linked Category (optional)">
                  <Select value={planForm.linkedCategoryId} onChange={onPlanField} name="linkedCategoryId">
                    <option value="">No category</option>
                    {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </Select>
                </Field>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={updatePlan}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {loading ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmPlan({ open: true })}
                    className="px-4"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>

            {/* Add/edit contribution */}
            <Card
              title={editingContrId ? 'Edit Contribution' : 'Add Contribution'}
              subtitle={editingContrId ? 'Modify the selected contribution' : 'Record a new savings deposit'}
            >
              <div className="space-y-4">
                <Field label="Amount ($)">
                  <Input name="amount" type="number" step="0.01" value={contrForm.amount} onChange={onContrField} placeholder="0.00" />
                </Field>
                <Field label="Date">
                  <DateInput
                    value={contrForm.date}
                    onChange={e => setContrForm(v => ({ ...v, date: e.target.value }))}
                    required
                    placeholder="Pick a date"
                  />
                </Field>
                <Field label="Note (optional)">
                  <Input name="note" value={contrForm.note} onChange={onContrField} placeholder="e.g. Monthly deposit" />
                </Field>
                <div className="flex gap-2 pt-1">
                  {editingContrId ? (
                    <>
                      <Button onClick={updateContribution} disabled={loading || !contrForm.amount} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                        {loading ? 'Updating…' : 'Update'}
                      </Button>
                      <Button variant="outline" onClick={() => { setContrForm({ amount: '', date: isoToday, note: '' }); setEditingContrId(null); }} className="px-4">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={addContribution} disabled={loading || !contrForm.amount || !contrForm.date} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                      {loading ? 'Adding…' : '+ Add Contribution'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* ── History table ─────────────────────────────────────────────── */}
          {summary && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Contribution History</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{rows.length} record{rows.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Show</span>
                  <Select value={String(pageSize)} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                  </Select>
                  <span className="text-gray-400">per page</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                {rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
                    <span className="text-3xl opacity-30">📭</span>
                    <p className="text-sm text-gray-400">No contributions yet.</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600">Use the form above to record your first deposit.</p>
                  </div>
                ) : (
                  <table className="min-w-[560px] w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-[var(--border)]">
                        {['Date', 'Description', 'Type', 'Amount', ''].map((h, i) => (
                          <th key={i} className={cn('px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400', i === 4 && 'text-right')}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {paginated.map(r => (
                        <tr key={r.key} className="group hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 tabular-nums">{r.date}</td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <span className="truncate block font-medium text-gray-800 dark:text-gray-100" title={r.desc}>{r.desc}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.type === 'auto' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">Auto</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Manual</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{formatAmount(r.amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {r.type === 'manual' ? (
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <IconButton
                                  onClick={() => { setEditingContrId(r.c.id); setContrForm({ amount: String(r.c.amount), date: r.c.date, note: r.c.note || '' }); }}
                                  title="Edit contribution"
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton onClick={() => setConfirm({ open: true, id: r.c.id })} title="Delete contribution" danger>
                                  <TrashIcon />
                                </IconButton>
                              </div>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {rows.length > 0 && (
                <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 font-medium"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 font-medium"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
