import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '../../api';
import Button from '../ui/button';
import Input from '../ui/input';
import Select from '../ui/select';
import Switch from '../ui/switch';
import SheetDialog from '../ui/sheet-dialog';
import TagPicker from '../ui/tag-picker';
import { useCurrency } from '../../context/CurrencyContext';
import { PERIOD_TYPES } from '../../utils/budgets';
import { intlLocale } from '../../utils/dateLocale';
import { cn } from '../../lib/utils';

const EMPTY = {
  name: '',
  amount: '',
  periodType: 'monthly',
  startDay: 1,
  categoryIds: [],
  tagIds: [],
  rollover: false,
  isCatchAll: false,
};

function FormField({ id, label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const toForm = (budget) =>
  budget
    ? {
        name: budget.name,
        amount: String(budget.amount),
        periodType: budget.periodType,
        startDay: budget.startDay,
        categoryIds: budget.categories.map((c) => c.id),
        tagIds: budget.tags.map((tag) => tag.id),
        rollover: budget.rollover,
        isCatchAll: budget.isCatchAll,
      }
    : EMPTY;

/** Expense categories as parents followed by their subcategories. */
function useExpenseCategories(open) {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    if (!open) return;
    api
      .get('/categories')
      .then((res) =>
        setCategories(res.data.filter((c) => c.type === 'expense')),
      )
      .catch(() => setCategories([]));
  }, [open]);
  return useMemo(() => {
    const parents = categories
      .filter((c) => !c.parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    return parents.flatMap((p) => [
      { ...p, depth: 0 },
      ...categories
        .filter((c) => c.parentId === p.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ ...c, depth: 1 })),
    ]);
  }, [categories]);
}

/** Create or edit a flexible budget. `budget` null means a new one. */
export default function BudgetFormDialog({
  open,
  budget,
  hasCatchAll,
  onClose,
  onSaved,
}) {
  const { t } = useTranslation();
  const { symbol } = useCurrency();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const categories = useExpenseCategories(open);
  const uid = useId();
  const fieldId = (name) => `${uid}-${name}`;
  const set = (patch) => {
    setError('');
    setForm((f) => ({ ...f, ...patch }));
  };

  useEffect(() => {
    if (open) {
      setForm(toForm(budget));
      setError('');
    }
  }, [open, budget]);

  const chosen = new Set(form.categoryIds);
  const coveredByParent = (cat) => cat.depth === 1 && chosen.has(cat.parentId);
  const toggleCategory = (id) =>
    set({
      categoryIds: chosen.has(id)
        ? form.categoryIds.filter((c) => c !== id)
        : [...form.categoryIds, id],
    });

  const weekdays = useMemo(() => {
    // 2024-01-01 was a Monday.
    const fmt = new Intl.DateTimeFormat(intlLocale(), { weekday: 'long' });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 0, 1 + i)),
    );
  }, []);

  const changePeriod = (periodType) =>
    set({
      periodType,
      startDay:
        periodType === 'weekly' ? Math.min(form.startDay, 7) : form.startDay,
    });

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim())
      return setError(t('budgets.errors.BUDGET_INVALID_NAME'));
    if (!(amount > 0) || !/^\d+(\.\d{1,2})?$/.test(String(form.amount).trim()))
      return setError(t('budgets.errors.BUDGET_INVALID_AMOUNT'));
    if (!form.isCatchAll && !form.categoryIds.length && !form.tagIds.length)
      return setError(t('budgets.errors.BUDGET_EMPTY_SCOPE'));

    setSaving(true);
    setError('');
    // A subcategory under a chosen parent is already counted by the parent.
    const categoryIds = form.categoryIds.filter((id) => {
      const cat = categories.find((c) => c.id === id);
      return !cat || !coveredByParent(cat);
    });
    const body = {
      name: form.name.trim(),
      amount,
      periodType: form.periodType,
      startDay: Number(form.startDay),
      rollover: form.rollover,
      isCatchAll: form.isCatchAll,
      categoryIds: form.isCatchAll ? [] : categoryIds,
      tagIds: form.isCatchAll ? [] : form.tagIds,
    };
    try {
      if (budget) await api.put(`/spending-budgets/${budget.id}`, body);
      else await api.post('/spending-budgets', body);
      toast.success(budget ? t('budgets.updated') : t('budgets.created'));
      onSaved();
      onClose();
    } catch (err) {
      const code = err?.response?.data?.code;
      setError(
        code
          ? t(`budgets.errors.${code}`, {
              defaultValue: err.response.data.message,
            })
          : t('budgets.saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={budget ? t('budgets.editTitle') : t('budgets.newTitle')}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField id={fieldId('name')} label={t('budgets.name')}>
            <Input
              id={fieldId('name')}
              value={form.name}
              maxLength={60}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={t('budgets.namePlaceholder')}
              autoFocus
            />
          </FormField>
          <FormField
            id={fieldId('amount')}
            label={t('budgets.amount', { symbol })}
          >
            <Input
              id={fieldId('amount')}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max="999999999.99"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
            />
          </FormField>
          <FormField id={fieldId('period')} label={t('budgets.period')}>
            <Select
              id={fieldId('period')}
              value={form.periodType}
              onChange={(e) => changePeriod(e.target.value)}
            >
              {PERIOD_TYPES.map((p) => (
                <option key={p} value={p}>
                  {t(`budgets.periods.${p}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            id={fieldId('start')}
            label={
              form.periodType === 'weekly'
                ? t('budgets.startWeekday')
                : t('budgets.startDay')
            }
          >
            <Select
              id={fieldId('start')}
              value={String(form.startDay)}
              onChange={(e) => set({ startDay: Number(e.target.value) })}
            >
              {form.periodType === 'weekly'
                ? weekdays.map((name, i) => (
                    <option key={name} value={String(i + 1)}>
                      {name}
                    </option>
                  ))
                : Array.from({ length: 31 }, (_, i) => (
                    <option key={i} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
            </Select>
          </FormField>
        </div>
        {form.periodType !== 'weekly' && form.startDay > 28 && (
          <p className="-mt-2 text-xs text-[var(--muted-foreground)]">
            {t('budgets.shortMonthHint', { day: form.startDay })}
          </p>
        )}
        {form.periodType === 'quarterly' && (
          <p className="-mt-2 text-xs text-[var(--muted-foreground)]">
            {t('budgets.quarterHint')}
          </p>
        )}

        <label
          className={cn(
            'flex items-start gap-3 rounded-lg border border-[var(--border)] p-3',
            !form.isCatchAll && hasCatchAll
              ? 'opacity-60 cursor-not-allowed'
              : 'cursor-pointer',
          )}
        >
          <Switch
            checked={form.isCatchAll}
            disabled={!form.isCatchAll && hasCatchAll}
            onCheckedChange={(v) => set({ isCatchAll: v })}
            aria-label={t('budgets.catchAll')}
          />
          <span className="text-sm">
            <span className="block font-medium text-[var(--foreground)]">
              {t('budgets.catchAll')}
            </span>
            <span className="block text-xs text-[var(--muted-foreground)]">
              {!form.isCatchAll && hasCatchAll
                ? t('budgets.catchAllTaken')
                : t('budgets.catchAllHint')}
            </span>
          </span>
        </label>

        {!form.isCatchAll && (
          <>
            <fieldset>
              <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {t('budgets.categories')}
              </legend>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {t('budgets.categoriesHint')}
              </p>
              {categories.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {t('budgets.noCategories')}
                </p>
              ) : (
                <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
                  {categories.map((cat) => {
                    const implied = coveredByParent(cat);
                    return (
                      <li key={cat.id}>
                        <label
                          className={cn(
                            'flex items-center gap-2.5 min-h-11 px-3 py-2 text-sm',
                            cat.depth === 1 && 'pl-8',
                            implied
                              ? 'cursor-default'
                              : 'cursor-pointer hover:bg-[var(--muted)]',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer accent-emerald-600 disabled:cursor-default"
                            checked={implied || chosen.has(cat.id)}
                            disabled={implied}
                            onChange={() => toggleCategory(cat.id)}
                          />
                          <span
                            className="size-2.5 rounded-full flex-shrink-0"
                            style={{ background: cat.color }}
                          />
                          <span className="truncate text-[var(--foreground)]">
                            {cat.name}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
            <FormField id={fieldId('tags')} label={t('budgets.tags')}>
              <TagPicker
                id={fieldId('tags')}
                value={form.tagIds}
                onChange={(tagIds) => set({ tagIds })}
              />
            </FormField>
          </>
        )}

        <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer">
          <Switch
            checked={form.rollover}
            onCheckedChange={(v) => set({ rollover: v })}
            aria-label={t('budgets.rollover')}
          />
          <span className="text-sm">
            <span className="block font-medium text-[var(--foreground)]">
              {t('budgets.rollover')}
            </span>
            <span className="block text-xs text-[var(--muted-foreground)]">
              {t('budgets.rolloverHint')}
            </span>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {budget ? t('common.save') : t('budgets.create')}
          </Button>
        </div>
      </form>
    </SheetDialog>
  );
}
