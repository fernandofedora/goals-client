import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import Select from '../components/ui/select';
import { formatAmount } from '../utils/format';
import Alert from '../components/ui/alert';
import ConfirmDialog from '../components/ui/confirm-dialog';

export default function SavingPlan() {
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planForm, setPlanForm] = useState({ name: '', targetAmount: '', linkedCategoryId: '' });
  const [summary, setSummary] = useState(null);
  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const [contrForm, setContrForm] = useState({ amount: '', date: isoToday, note: '' });
  const [editingContrId, setEditingContrId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [confirmPlan, setConfirmPlan] = useState({ open: false });
  const [autoSaving, setAutoSaving] = useState(false);
  const [prevLinkedId, setPrevLinkedId] = useState('');
  const currentPlan = useMemo(() => plans.find(p => String(p.id) === String(selectedPlanId)), [plans, selectedPlanId]);

  useEffect(() => {
    (async () => {
      const [catsRes, plansRes] = await Promise.all([
        api.get('/categories'),
        api.get('/savings/plans')
      ]);
      setCategories(catsRes.data || []);
      setPlans(plansRes.data || []);
      if (plansRes.data && plansRes.data.length > 0) {
        const savedId = localStorage.getItem('savingPlan.selectedPlanId');
        const chosen = plansRes.data.find(p => String(p.id) === String(savedId)) || plansRes.data[0];
        setSelectedPlanId(String(chosen.id));
        setPlanForm({
          name: chosen.name || '',
          targetAmount: String(chosen.targetAmount || ''),
          linkedCategoryId: String(chosen.linkedCategoryId || '')
        });
        setPrevLinkedId(String(chosen.linkedCategoryId || ''));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedPlanId) { setSummary(null); return; }
      const res = await api.get(`/savings/plans/${selectedPlanId}/summary`);
      setSummary(res.data);
    })();
  }, [selectedPlanId]);

  useEffect(() => {
    if (selectedPlanId) localStorage.setItem('savingPlan.selectedPlanId', String(selectedPlanId));
  }, [selectedPlanId]);

  useEffect(() => {
    if (!currentPlan) return;
    setPlanForm({
      name: currentPlan.name || '',
      targetAmount: String(currentPlan.targetAmount || ''),
      linkedCategoryId: String(currentPlan.linkedCategoryId || '')
    });
    setPrevLinkedId(String(currentPlan.linkedCategoryId || ''));
  }, [currentPlan]);


  const onPlanField = (e) => setPlanForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const onContrField = (e) => setContrForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const createPlan = async () => {
    try {
      setLoading(true);
      const body = {
        name: planForm.name.trim(),
        targetAmount: Number(planForm.targetAmount),
        linkedCategoryId: planForm.linkedCategoryId ? Number(planForm.linkedCategoryId) : null
      };
      const res = await api.post('/savings/plans', body);
      const newPlan = res.data;
      setPlans([newPlan, ...plans]);
      setSelectedPlanId(String(newPlan.id));
      setMessage({ type: 'success', text: 'Plan creado correctamente' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al crear el plan' });
    } finally { setLoading(false); }
  };

  const updatePlan = async () => {
    if (!selectedPlanId) return;
    try {
      setLoading(true);
      const body = {
        name: planForm.name.trim(),
        targetAmount: Number(planForm.targetAmount),
        linkedCategoryId: planForm.linkedCategoryId ? Number(planForm.linkedCategoryId) : null
      };
      const res = await api.put(`/savings/plans/${selectedPlanId}`, body);
      const upd = res.data;
      setPlans(plans.map(p => String(p.id) === String(selectedPlanId) ? upd : p));
      setMessage({ type: 'success', text: 'Plan actualizado' });
      const sum = await api.get(`/savings/plans/${selectedPlanId}/summary`);
      setSummary(sum.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al actualizar el plan' });
    } finally { setLoading(false); }
  };

  const addContribution = async () => {
    if (!selectedPlanId) return;
    try {
      setLoading(true);
      const body = {
        planId: Number(selectedPlanId),
        amount: Number(contrForm.amount),
        date: contrForm.date,
        note: contrForm.note?.trim() || null
      };
      await api.post('/savings/contributions', body);
      setContrForm({ amount: '', date: '', note: '' });
      setEditingContrId(null);
      const sum = await api.get(`/savings/plans/${selectedPlanId}/summary`);
      setSummary(sum.data);
      setMessage({ type: 'success', text: 'Contribución agregada' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al agregar contribución' });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const run = async () => {
      if (!selectedPlanId) return;
      const cur = String(planForm.linkedCategoryId || '');
      if (cur === String(prevLinkedId || '')) return;
      try {
        setAutoSaving(true);
        const body = {
          name: planForm.name.trim(),
          targetAmount: Number(planForm.targetAmount),
          linkedCategoryId: cur ? Number(cur) : null
        };
        const res = await api.put(`/savings/plans/${selectedPlanId}`, body);
        const upd = res.data;
        setPlans(plans.map(p => String(p.id) === String(selectedPlanId) ? upd : p));
        setPrevLinkedId(cur);
      } catch {}
      finally { setAutoSaving(false); }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planForm.linkedCategoryId, selectedPlanId]);

  const updateContribution = async () => {
    if (!editingContrId) return;
    try {
      setLoading(true);
      const body = {
        amount: Number(contrForm.amount),
        date: contrForm.date,
        note: contrForm.note?.trim() || null
      };
      await api.put(`/savings/contributions/${editingContrId}`, body);
      setContrForm({ amount: '', date: '', note: '' });
      setEditingContrId(null);
      const sum = await api.get(`/savings/plans/${selectedPlanId}/summary`);
      setSummary(sum.data);
      setMessage({ type: 'success', text: 'Contribución actualizada' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al actualizar contribución' });
    } finally { setLoading(false); }
  };

  const onDeleteContribution = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/savings/contributions/${id}`);
      const sum = await api.get(`/savings/plans/${selectedPlanId}/summary`);
      setSummary(sum.data);
      setMessage({ type: 'success', text: 'Contribución eliminada' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al eliminar contribución' });
    } finally { setLoading(false); setConfirm({ open: false, id: null }); }
  };

  const progressPct = summary ? Math.round(summary.progressPercent) : 0;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const rows = useMemo(() => {
    if (!summary) return [];
    const manual = (summary.contributions || []).map(c => ({ key:`c-${c.id}`, date:c.date, desc:c.note || 'Contribución', amount:c.amount, type:'manual', c }));
    const auto = (summary.autoTransactions || []).map(t => ({ key:`t-${t.id}`, date:t.date, desc:t.description, amount:t.amount, type:'auto', t }));
    return [...manual, ...auto];
  }, [summary]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginated = rows.slice((page-1)*pageSize, (page-1)*pageSize + pageSize);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [rows.length, pageSize, totalPages, page]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Saving Plan</h1>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} title={message.type === 'error' ? 'Error' : 'Éxito'} description={message.text} />
      )}

      <section className="space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-medium text-[var(--foreground)] mb-3">Gestión de Planes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm text-[var(--muted-foreground)]">Nombre del plan</label>
            <Input name="name" value={planForm.name} onChange={onPlanField} placeholder="Ej. Fondo de emergencia" />
          </div>
          <div>
            <label className="block mb-2 text-sm text-[var(--muted-foreground)]">Meta a ahorrar</label>
            <Input name="targetAmount" type="number" step="0.01" value={planForm.targetAmount} onChange={onPlanField} placeholder="Ej. 1000.00" />
          </div>
          <div>
            <label className="block mb-2 text-sm text-[var(--muted-foreground)]">Vincular categoría (opcional)</label>
            <Select value={planForm.linkedCategoryId} onChange={onPlanField} name="linkedCategoryId">
              <option value="">Sin categoría</option>
              {categories.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex gap-3 mt-4 items-center">
          <Select className="w-64" value={selectedPlanId || '__new__'} onChange={(e) => {
            const v = e.target.value;
            if (v === '__new__') {
              setSelectedPlanId('');
              setPlanForm({ name:'', targetAmount:'', linkedCategoryId:'' });
              setPrevLinkedId('');
              return;
            }
            setSelectedPlanId(v);
          }} name="planSelector">
            <option value="__new__">Crear nuevo plan</option>
            {plans.map(p => (<option key={p.id} value={String(p.id)}>{p.name}</option>))}
          </Select>
          <div className="flex gap-2 ml-auto">
            <Button onClick={createPlan} disabled={loading || !planForm.name || !planForm.targetAmount || !!selectedPlanId}>Crear plan</Button>
            <Button variant="secondary" onClick={updatePlan} disabled={loading || !selectedPlanId}>Actualizar plan</Button>
            <Button variant="destructive" onClick={() => setConfirmPlan({ open: true })} disabled={!selectedPlanId}>Eliminar plan</Button>
          </div>
        </div>
        </div>
      </section>

      {selectedPlanId && (
        <section className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-3">Contribuir al ahorro</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 text-sm text-[var(--muted-foreground)]">Monto</label>
              <Input name="amount" type="number" step="0.01" value={contrForm.amount} onChange={onContrField} placeholder="Ej. 50.00" />
            </div>
            <div>
              <label className="block mb-2 text-sm text-[var(--muted-foreground)]">Fecha</label>
              <Input name="date" type="date" value={contrForm.date} onChange={onContrField} />
            </div>
            <div>
              <label className="block mb-2 text-sm text-[var(--muted-foreground)]">Nota (opcional)</label>
              <Input name="note" value={contrForm.note} onChange={onContrField} placeholder="Comentario" />
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <Button onClick={addContribution} disabled={loading || !contrForm.amount || !contrForm.date || !!editingContrId}>Agregar contribución</Button>
            <Button variant="secondary" onClick={updateContribution} disabled={loading || !editingContrId}>Actualizar contribución</Button>
            {editingContrId && (
              <Button variant="ghost" onClick={() => { setContrForm({ amount: '', date: isoToday, note: '' }); setEditingContrId(null); }}>Cancelar edición</Button>
            )}
          </div>
          </div>
        </section>
      )}

      {currentPlan && summary && (
        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow">
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">Progreso</h2>
            <div className="flex justify-between text-sm mb-2 text-[var(--muted-foreground)]">
              <span>Ahorrado: {formatAmount(summary.totalManual + summary.totalAuto)}</span>
              <span>Meta: {formatAmount(currentPlan.targetAmount)}</span>
            </div>
            <div className="h-4 bg-[var(--muted)] rounded relative">
              <div className="h-4 rounded bg-[var(--primary)]" style={{ width: `${progressPct}%` }} />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[var(--foreground)]">{progressPct}%</div>
            </div>
            <div className="text-sm mt-2 text-[var(--muted-foreground)]">Restante: {formatAmount(summary.remaining)} • {progressPct}% completado</div>
            {progressPct >= 90 && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-50 text-amber-700 px-3 py-1 text-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8l2-7-6-6-6 6 2 7z"/></svg>
                ¡Casi llegas a tu meta!
              </div>
            )}
          </div>
        </section>
      )}

      {summary && (
        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-medium text-[var(--foreground)]">Histórico de contribuciones</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Descripción</th>
                  <th className="text-right p-2">Monto</th>
                  <th className="text-right p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-gray-600 dark:text-gray-300">No hay contribuciones aún. ¡Empieza agregando una!</td>
                  </tr>
                ) : paginated.map(r => (
                  <tr key={r.key} className="border-t border-[var(--border)]">
                    <td className="p-2">{r.date}</td>
                    <td className="p-2">{r.type==='auto' ? (<><span>{r.desc}</span> <span className="ml-2 inline-flex items-center text-xs px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">Auto</span></>) : (r.desc)}</td>
                    <td className="p-2 text-right">{formatAmount(r.amount)}</td>
                    <td className="p-2 text-right">
                      {r.type==='manual' ? (
                        <>
                          <Button variant="secondary" className="mr-2" onClick={() => { setEditingContrId(r.c.id); setContrForm({ amount: String(r.c.amount), date: r.c.date, note: r.c.note || '' }); }}>Editar</Button>
                          <Button variant="destructive" onClick={() => setConfirm({ open: true, id: r.c.id })}>Eliminar</Button>
                        </>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Mostrar</span>
              <select className="border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm dark:bg-slate-700 dark:text-white" value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-300">por página</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded-md border" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
              <span className="text-sm text-gray-700 dark:text-gray-200">Página {page} de {totalPages}</span>
              <button className="px-3 py-1 rounded-md border" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Siguiente</button>
            </div>
          </div>
          </div>
        </section>
      )}

      <ConfirmDialog open={confirm.open} title="Eliminar contribución" description="Esta acción no se puede deshacer" onCancel={() => setConfirm({ open: false, id: null })} onConfirm={() => onDeleteContribution(confirm.id)} />
      <ConfirmDialog open={confirmPlan.open} title="Eliminar plan" description="¿Seguro que deseas eliminar este plan?" onCancel={() => setConfirmPlan({ open: false })} onConfirm={async () => { try { setConfirmPlan({ open: false }); await api.delete(`/savings/plans/${selectedPlanId}`); setPlans(plans.filter(p => String(p.id)!==String(selectedPlanId))); setSelectedPlanId(''); setPlanForm({ name:'', targetAmount:'', linkedCategoryId:'' }); setSummary(null); setMessage({ type:'default', text:'Plan eliminado' }); } catch { setMessage({ type:'error', text:'No se pudo eliminar el plan' }); } }} />
    </div>
  );
}
