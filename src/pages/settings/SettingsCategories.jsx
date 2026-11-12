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
import { categoryTree } from '../../utils/categories';

const DEFAULT_COLOR = {
  expense: '#3b82f6',
  income: '#16a34a',
  transfer: '#64748b',
};

// Per-type look and copy of each section (and of its inline "new" form).
const SECTIONS = {
  expense: {
    dot: 'bg-rose-500',
    tint: 'bg-rose-50/30 dark:bg-rose-950/10',
    label: 'settings.categories.expense',
    empty: 'settings.categories.emptyExpense',
    placeholder: 'settings.categories.expenseNamePlaceholder',
  },
  income: {
    dot: 'bg-emerald-500',
    tint: 'bg-emerald-50/30 dark:bg-emerald-950/10',
    label: 'settings.categories.income',
    empty: 'settings.categories.emptyIncome',
    placeholder: 'settings.categories.incomeNamePlaceholder',
  },
  transfer: {
    dot: 'bg-slate-500',
    tint: 'bg-slate-50/60 dark:bg-slate-800/30',
    label: 'settings.categories.transfer',
    empty: 'settings.categories.emptyTransfer',
    placeholder: 'settings.categories.transferNamePlaceholder',
  },
};

// Server error codes from /api/categories → messages under settings.categories.
const ERROR_KEYS = {
  CATEGORY_HAS_CHILDREN: 'settings.categories.hasChildren',
  CATEGORY_IN_USE: 'settings.categories.inUse',
  CATEGORY_TOO_DEEP: 'settings.categories.tooDeep',
  CATEGORY_INVALID_PARENT: 'settings.categories.invalidParent',
};
const errorKey = (err, fallback) =>
  ERROR_KEYS[err?.response?.data?.code] || fallback;

// Inline form shared by "+ Agregar" (top level) and "+ Subcategoría".
function NewCategoryForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  placeholder,
  tone,
}) {
  const { t } = useTranslation();
  return (
    <form
      className={`px-5 py-4 border-b border-[var(--border)] flex flex-wrap gap-4 items-end ${
        SECTIONS[tone].tint
      } ${form.parentId ? 'sm:pl-12' : ''}`}
      onSubmit={onSubmit}
    >
      <Field
        label={
          form.parentName
            ? t('settings.categories.subOf', { name: form.parentName })
            : t('settings.categories.name')
        }
      >
        <Input
          placeholder={placeholder}
          value={form.name}
          onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
          required
          autoFocus
        />
      </Field>
      <Field label={t('settings.categories.color')}>
        <input
          aria-label={t('settings.categories.color')}
          className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]"
          type="color"
          value={form.color}
          onChange={(e) => setForm((v) => ({ ...v, color: e.target.value }))}
        />
      </Field>
      <Field label={t('settings.categories.monthlyBudgetDollars')}>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder={t('settings.categories.noLimit')}
          className="w-32"
          value={form.monthlyBudget || ''}
          onChange={(e) =>
            setForm((v) => ({ ...v, monthlyBudget: e.target.value }))
          }
        />
      </Field>
      <div className="pb-0.5 flex gap-1.5">
        <Button type="submit" variant="primary">
          {t('common.save')}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 font-medium cursor-pointer"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

export default function SettingsCategories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);

  // One open "new" form at a time: top level of a type, or under a parent.
  const [newForm, setNewForm] = useState(null);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatForm, setEditCatForm] = useState({
    name: '',
    type: 'expense',
    color: DEFAULT_COLOR.expense,
    monthlyBudget: '',
    parentId: '',
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

  const openNew = (type, parent = null) => {
    const sameForm =
      newForm &&
      newForm.type === type &&
      (newForm.parentId || null) === (parent?.id || null);
    setNewForm(
      sameForm
        ? null
        : {
            name: '',
            type,
            color: parent?.color || DEFAULT_COLOR[type],
            monthlyBudget: '',
            parentId: parent?.id || null,
            parentName: parent?.name || null,
          },
    );
  };

  const addCategory = async (e) => {
    e.preventDefault();
    try {
      const { name, type, color, monthlyBudget, parentId } = newForm;
      await api.post('/categories', {
        name,
        type,
        color,
        monthlyBudget,
        parentId,
      });
      setNewForm(null);
      toast.success(t('settings.categories.added'));
      load();
    } catch (err) {
      toast.error(t(errorKey(err, 'settings.categories.addFailed')));
    }
  };

  const startEditCat = (cat) => {
    setEditingCatId(cat.id);
    setEditCatForm({
      name: cat.name,
      type: cat.type,
      color: cat.color,
      monthlyBudget: cat.monthlyBudget != null ? String(cat.monthlyBudget) : '',
      parentId: cat.parentId ? String(cat.parentId) : '',
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
        parentId: editCatForm.parentId ? Number(editCatForm.parentId) : null,
      };
      await api.put(`/categories/${id}`, payload);
      setEditingCatId(null);
      toast.success(t('settings.categories.updated'));
      load();
    } catch (err) {
      toast.error(t(errorKey(err, 'settings.categories.updateFailed')));
    }
  };

  // The server refuses parents with subcategories and categories in use.
  const confirmDeleteCat = async () => {
    try {
      await api.delete(`/categories/${deleteCatId}`);
      setDeleteCatId(null);
      toast.success(t('settings.categories.deleted'));
      load();
    } catch (err) {
      setDeleteCatId(null);
      toast.error(t(errorKey(err, 'settings.categories.deleteFailed')));
    }
  };

  const tree = useMemo(() => categoryTree(categories), [categories]);

  const rowProps = {
    editingCatId,
    editCatForm,
    setEditCatForm,
    saveEditCat,
    cancelEditCat,
    startEditCat,
    setDeleteCatId,
  };

  const renderSection = (type) => {
    const groups = tree.filter((c) => c.type === type);
    const count = categories.filter((c) => c.type === type).length;
    const section = SECTIONS[type];
    const placeholder = t(section.placeholder);
    // Where an edited category could move: top-level categories of the
    // edited type, never itself.
    const parentChoices = (cat) =>
      tree.filter((p) => p.type === editCatForm.type && p.id !== cat.id);
    const formOpen = (parentId) =>
      newForm &&
      newForm.type === type &&
      (newForm.parentId || null) === parentId;

    return (
      <div
        className={type !== 'expense' ? 'border-t border-[var(--border)]' : ''}
      >
        <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-[var(--border)] bg-gray-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${section.dot}`} />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              {t(section.label)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              ({count})
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => openNew(type)}>
            {t('settings.categories.add')}
          </Button>
        </div>

        {formOpen(null) && (
          <NewCategoryForm
            form={newForm}
            setForm={setNewForm}
            onSubmit={addCategory}
            onCancel={() => setNewForm(null)}
            placeholder={placeholder}
            tone={type}
          />
        )}

        {groups.length === 0 ? (
          <EmptyState message={t(section.empty)} />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {groups.map((group) => (
              <li key={group.id}>
                <ul className="divide-y divide-[var(--border)]">
                  <CatRow
                    {...rowProps}
                    cat={group}
                    hasChildren={group.children.length > 0}
                    parentChoices={parentChoices(group)}
                    onAddSub={() => openNew(type, group)}
                  />
                  {formOpen(group.id) && (
                    <li>
                      <NewCategoryForm
                        form={newForm}
                        setForm={setNewForm}
                        onSubmit={addCategory}
                        onCancel={() => setNewForm(null)}
                        placeholder={t('settings.categories.subPlaceholder')}
                        tone={type}
                      />
                    </li>
                  )}
                  {group.children.map((child) => (
                    <CatRow
                      key={child.id}
                      {...rowProps}
                      cat={child}
                      isChild
                      parentChoices={parentChoices(child)}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

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
        {renderSection('expense')}
        {renderSection('income')}
        {renderSection('transfer')}
      </SectionCard>
    </>
  );
}
