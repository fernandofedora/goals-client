import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import Input from '../../components/ui/input';
import Button from '../../components/ui/button';
import ConfirmDialog from '../../components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  Field,
  SectionCard,
  EmptyState,
  CatRow,
} from '../../components/settings/shared';

export default function SettingsCategories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);

  const [catForm, setCatForm] = useState({
    name: '',
    type: 'expense',
    color: '#3b82f6',
  });
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatForm, setEditCatForm] = useState({
    name: '',
    type: 'expense',
    color: '#3b82f6',
    monthlyBudget: '',
  });
  const [deleteCatId, setDeleteCatId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {
      toast.error(t('settings.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const addCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', catForm);
      setCatForm({ name: '', type: 'expense', color: '#3b82f6' });
      setShowCatForm(false);
      toast.success(t('settings.categories.added'));
      load();
    } catch {
      toast.error(t('settings.categories.addFailed'));
    }
  };

  const startEditCat = (cat) => {
    setEditingCatId(cat.id);
    setEditCatForm({
      name: cat.name,
      type: cat.type,
      color: cat.color,
      monthlyBudget: cat.monthlyBudget != null ? String(cat.monthlyBudget) : '',
    });
  };
  const cancelEditCat = () => setEditingCatId(null);
  const saveEditCat = async (id) => {
    try {
      const payload = {
        ...editCatForm,
        monthlyBudget:
          editCatForm.monthlyBudget !== ''
            ? Number(editCatForm.monthlyBudget)
            : null,
      };
      await api.put(`/categories/${id}`, payload);
      setEditingCatId(null);
      toast.success(t('settings.categories.updated'));
      load();
    } catch {
      toast.error(t('settings.categories.updateFailed'));
    }
  };

  const confirmDeleteCat = async () => {
    try {
      const txRes = await api.get('/transactions');
      const inUse = txRes.data.some((tx) => tx.Category?.id === deleteCatId);
      if (inUse) {
        setDeleteCatId(null);
        toast.error(t('settings.categories.inUse'));
        return;
      }
      await api.delete(`/categories/${deleteCatId}`);
      setDeleteCatId(null);
      toast.success(t('settings.categories.deleted'));
      load();
    } catch {
      toast.error(t('settings.categories.deleteFailed'));
    }
  };

  const expenseCats = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );
  const incomeCats = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  );

  return (
    <>
      <ConfirmDialog
        open={deleteCatId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteCatId(null);
        }}
        title={t('settings.categories.deleteTitle')}
        description={t('settings.categories.deleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDeleteCat}
        onCancel={() => setDeleteCatId(null)}
      />

      <SectionCard
        title={t('settings.categories.title')}
        subtitle={t('settings.categories.subtitle')}
      >
        {/* Expense sub-section */}
        <div>
          <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-[var(--border)] bg-gray-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {t('settings.categories.expense')}
              </span>
              <span className="text-xs text-gray-400 tabular-nums">
                ({expenseCats.length})
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCatForm({ name: '', type: 'expense', color: '#3b82f6' });
                setShowCatForm(
                  showCatForm && catForm.type === 'expense' ? false : true,
                );
              }}
            >
              {t('settings.categories.add')}
            </Button>
          </div>

          {showCatForm && catForm.type === 'expense' && (
            <form
              className="px-5 py-4 border-b border-[var(--border)] bg-rose-50/30 dark:bg-rose-950/10 flex flex-wrap gap-4 items-end"
              onSubmit={addCategory}
            >
              <Field label={t('settings.categories.name')}>
                <Input
                  placeholder={t('settings.categories.expenseNamePlaceholder')}
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm((v) => ({ ...v, name: e.target.value }))
                  }
                  required
                />
              </Field>
              <Field label={t('settings.categories.color')}>
                <input
                  className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]"
                  type="color"
                  value={catForm.color}
                  onChange={(e) =>
                    setCatForm((v) => ({ ...v, color: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('settings.categories.monthlyBudgetDollars')}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t('settings.categories.noLimit')}
                  className="w-32"
                  value={catForm.monthlyBudget || ''}
                  onChange={(e) =>
                    setCatForm((v) => ({ ...v, monthlyBudget: e.target.value }))
                  }
                />
              </Field>
              <div className="pb-0.5 flex gap-1.5">
                <Button type="submit" variant="primary">
                  {t('common.save')}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 font-medium"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}

          {expenseCats.length === 0 ? (
            <EmptyState message={t('settings.categories.emptyExpense')} />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {expenseCats.map((cat) => (
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
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {t('settings.categories.income')}
              </span>
              <span className="text-xs text-gray-400 tabular-nums">
                ({incomeCats.length})
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCatForm({ name: '', type: 'income', color: '#16a34a' });
                setShowCatForm(
                  showCatForm && catForm.type === 'income' ? false : true,
                );
              }}
            >
              {t('settings.categories.add')}
            </Button>
          </div>

          {showCatForm && catForm.type === 'income' && (
            <form
              className="px-5 py-4 border-b border-[var(--border)] bg-emerald-50/30 dark:bg-emerald-950/10 flex flex-wrap gap-4 items-end"
              onSubmit={addCategory}
            >
              <Field label={t('settings.categories.name')}>
                <Input
                  placeholder={t('settings.categories.incomeNamePlaceholder')}
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm((v) => ({ ...v, name: e.target.value }))
                  }
                  required
                />
              </Field>
              <Field label={t('settings.categories.color')}>
                <input
                  className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]"
                  type="color"
                  value={catForm.color}
                  onChange={(e) =>
                    setCatForm((v) => ({ ...v, color: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('settings.categories.monthlyBudgetDollars')}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t('settings.categories.noLimit')}
                  className="w-32"
                  value={catForm.monthlyBudget || ''}
                  onChange={(e) =>
                    setCatForm((v) => ({ ...v, monthlyBudget: e.target.value }))
                  }
                />
              </Field>
              <div className="pb-0.5 flex gap-1.5">
                <Button type="submit" variant="primary">
                  {t('common.save')}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 font-medium"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}

          {incomeCats.length === 0 ? (
            <EmptyState message={t('settings.categories.emptyIncome')} />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {incomeCats.map((cat) => (
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
    </>
  );
}
