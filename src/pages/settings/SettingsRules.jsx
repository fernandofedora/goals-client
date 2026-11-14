import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../api';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Select from '../../components/ui/select';
import Switch from '../../components/ui/switch';
import ConfirmDialog from '../../components/ui/confirm-dialog';
import SheetDialog from '../../components/ui/sheet-dialog';
import RowMenu from '../../components/ui/row-menu';
import {
  EditIcon,
  EmptyState,
  Field,
  IconButton,
  SectionCard,
  TrashIcon,
} from '../../components/settings/shared';
import { useCurrency } from '../../context/CurrencyContext';
import { categoryOptions } from '../../utils/categories';

const OPERATORS = {
  description: ['contains', 'startsWith', 'equals', 'notContains'],
  amount: ['gt', 'lt', 'equals'],
};

const EMPTY_FORM = {
  name: '',
  field: 'description',
  operator: 'contains',
  value: '',
  categoryId: '',
  isActive: true,
};

// Server error codes (routes/rules.js) → messages under settings.rules.errors.
const errorMessage = (err, t, fallback) => {
  const code = err?.response?.data?.code;
  return code
    ? t(`settings.rules.errors.${code}`, { defaultValue: t(fallback) })
    : t(fallback);
};

const ArrowIcon = ({ dir }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={dir === 'up' ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} />
  </svg>
);

function RuleForm({
  form,
  setForm,
  categories,
  onSubmit,
  onCancel,
  saving,
  editing,
}) {
  const { t } = useTranslation();
  const { symbol } = useCurrency();
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  return (
    <form
      onSubmit={onSubmit}
      className="px-5 py-4 border-b border-[var(--border)] bg-[var(--muted)]/40 grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <Field label={t('settings.rules.name')}>
        <Input
          value={form.name}
          maxLength={80}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={t('settings.rules.namePlaceholder')}
          required
          autoFocus
        />
      </Field>
      <Field label={t('settings.rules.category')}>
        <Select
          value={String(form.categoryId)}
          onChange={(e) => set({ categoryId: e.target.value })}
          required
        >
          <option value="">{t('settings.rules.pickCategory')}</option>
          {categoryOptions(categories).map((o) => (
            <option key={o.id} value={String(o.id)}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('settings.rules.when')}>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={form.field}
            onChange={(e) =>
              set({
                field: e.target.value,
                operator: OPERATORS[e.target.value][0],
                value: '',
              })
            }
          >
            <option value="description">
              {t('settings.rules.fields.description')}
            </option>
            <option value="amount">{t('settings.rules.fields.amount')}</option>
          </Select>
          <Select
            value={form.operator}
            onChange={(e) => set({ operator: e.target.value })}
          >
            {OPERATORS[form.field].map((op) => (
              <option key={op} value={op}>
                {t(`settings.rules.operators.${op}`)}
              </option>
            ))}
          </Select>
        </div>
      </Field>
      <Field
        label={
          form.field === 'amount'
            ? t('settings.rules.amountValue', { symbol })
            : t('settings.rules.textValue')
        }
      >
        {form.field === 'amount' ? (
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max="999999999.99"
            value={form.value}
            onChange={(e) => set({ value: e.target.value })}
            required
          />
        ) : (
          <Input
            value={form.value}
            maxLength={100}
            onChange={(e) => set({ value: e.target.value })}
            placeholder={t('settings.rules.textPlaceholder')}
            required
          />
        )}
      </Field>
      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
          <Switch
            checked={form.isActive}
            onCheckedChange={(v) => set({ isActive: v })}
            aria-label={t('settings.rules.active')}
          />
          {t('settings.rules.active')}
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {editing ? t('common.save') : t('settings.rules.create')}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ApplyDialog({ rule, onClose, onApplied }) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const [preview, setPreview] = useState(null);
  const [includeCategorized, setIncludeCategorized] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rule) return;
    setPreview(null);
    setIncludeCategorized(false);
    api
      .post(`/rules/${rule.id}/apply-existing`, { dryRun: true })
      .then((res) => setPreview(res.data))
      .catch(() => {
        toast.error(t('settings.rules.previewFailed'));
        onClose();
      });
  }, [rule, t, onClose]);

  const total = preview
    ? preview.uncategorized + (includeCategorized ? preview.categorized : 0)
    : 0;

  const apply = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/rules/${rule.id}/apply-existing`, {
        dryRun: false,
        includeCategorized,
      });
      toast.success(t('settings.rules.applied', { count: data.updated }));
      onApplied();
      onClose();
    } catch {
      toast.error(t('settings.rules.applyFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetDialog
      open={Boolean(rule)}
      onOpenChange={(open) => !open && onClose()}
      title={t('settings.rules.applyTitle', { name: rule?.name ?? '' })}
      description={t('settings.rules.applyDescription')}
    >
      {!preview ? (
        <div className="h-24 rounded-lg bg-[var(--muted)] animate-pulse motion-reduce:animate-none" />
      ) : (
        <div className="space-y-4 text-sm">
          <p className="text-[var(--foreground)]">
            {t('settings.rules.uncategorizedMatches', {
              count: preview.uncategorized,
            })}
          </p>
          {preview.categorized > 0 && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 size-4 cursor-pointer accent-emerald-600"
                checked={includeCategorized}
                onChange={(e) => setIncludeCategorized(e.target.checked)}
              />
              <span className="text-[var(--foreground)]">
                {t('settings.rules.alsoCategorized', {
                  count: preview.categorized,
                })}
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {t('settings.rules.alsoCategorizedHint')}
                </span>
              </span>
            </label>
          )}
          {preview.sample.length > 0 &&
            !includeCategorized &&
            preview.uncategorized > 0 && (
              <ul className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
                {preview.sample.map((tx) => (
                  <li
                    key={tx.id}
                    className="px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[var(--foreground)]">
                        {tx.description}
                      </span>
                      <span className="block text-xs text-[var(--muted-foreground)]">
                        {tx.date}
                      </span>
                    </span>
                    <span className="tabular-nums text-[var(--foreground)]">
                      {money(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy || total === 0}
              onClick={apply}
            >
              {t('settings.rules.applyCount', { count: total })}
            </Button>
          </div>
        </div>
      )}
    </SheetDialog>
  );
}

export default function SettingsRules() {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [applyRule, setApplyRule] = useState(null);
  const closeApply = useCallback(() => setApplyRule(null), []);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([
        api.get('/rules'),
        api.get('/categories'),
      ]);
      setRules(r.data);
      setCategories(c.data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // "Crear regla desde esta transacción" lands here with the form filled in.
  useEffect(() => {
    const description = searchParams.get('description');
    if (!description) return;
    const categoryId = /^\d+$/.test(searchParams.get('categoryId') || '')
      ? searchParams.get('categoryId')
      : '';
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      name: description.slice(0, 80),
      value: description.slice(0, 100),
      categoryId,
    });
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      categoryId: String(rule.CategoryId),
      isActive: rule.isActive,
    });
  };

  const closeForm = () => {
    setForm(null);
    setEditingId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, categoryId: Number(form.categoryId) };
    try {
      if (editingId) await api.put(`/rules/${editingId}`, body);
      else await api.post('/rules', body);
      toast.success(
        editingId ? t('settings.rules.updated') : t('settings.rules.created'),
      );
      closeForm();
      load();
    } catch (err) {
      toast.error(errorMessage(err, t, 'settings.rules.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule, isActive) => {
    setRules((list) =>
      list.map((r) => (r.id === rule.id ? { ...r, isActive } : r)),
    );
    try {
      await api.put(`/rules/${rule.id}`, { isActive });
    } catch {
      toast.error(t('settings.rules.saveFailed'));
      load();
    }
  };

  const move = async (index, delta) => {
    const next = [...rules];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setRules(next);
    try {
      await api.put('/rules/order', { ids: next.map((r) => r.id) });
    } catch {
      toast.error(t('settings.rules.orderFailed'));
      load();
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/rules/${deleteId}`);
      toast.success(t('settings.rules.deleted'));
      load();
    } catch {
      toast.error(t('settings.rules.deleteFailed'));
    } finally {
      setDeleteId(null);
    }
  };

  const conditionText = (rule) =>
    t(`settings.rules.conditions.${rule.field}`, {
      operator: t(`settings.rules.operators.${rule.operator}`).toLowerCase(),
      value:
        rule.field === 'amount' ? money(Number(rule.value)) : `«${rule.value}»`,
    });

  return (
    <>
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title={t('settings.rules.deleteTitle')}
        description={t('settings.rules.deleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
      <ApplyDialog
        rule={applyRule}
        onClose={closeApply}
        onApplied={load}
      />

      <SectionCard
        title={t('settings.rules.title')}
        subtitle={t('settings.rules.subtitle')}
        action={
          !form && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              {t('settings.rules.add')}
            </Button>
          )
        }
      >
        {form && !editingId && (
          <RuleForm
            form={form}
            setForm={setForm}
            categories={categories}
            onSubmit={submit}
            onCancel={closeForm}
            saving={saving}
          />
        )}

        {status === 'loading' && (
          <div className="p-5 space-y-3" aria-busy="true">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-[var(--muted)] animate-pulse motion-reduce:animate-none"
              />
            ))}
          </div>
        )}
        {status === 'error' && (
          <p className="p-5 text-sm text-rose-700 dark:text-rose-400">
            {t('settings.rules.loadFailed')}
          </p>
        )}
        {status === 'ready' && rules.length === 0 && !form && (
          <EmptyState message={t('settings.rules.empty')} />
        )}
        {status === 'ready' && rules.length > 0 && (
          <ol className="divide-y divide-[var(--border)]">
            {rules.map((rule, index) =>
              editingId === rule.id && form ? (
                <li key={rule.id}>
                  <RuleForm
                    form={form}
                    setForm={setForm}
                    categories={categories}
                    onSubmit={submit}
                    onCancel={closeForm}
                    saving={saving}
                    editing
                  />
                </li>
              ) : (
                <li key={rule.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-6 flex-shrink-0 text-center text-xs font-semibold tabular-nums text-[var(--muted-foreground)]">
                    {index + 1}
                  </span>
                  <div
                    className={`flex-1 min-w-0 ${rule.isActive ? '' : 'opacity-60'}`}
                  >
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {rule.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {conditionText(rule)} →{' '}
                      <span className="inline-flex items-center gap-1 text-[var(--foreground)]">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            background:
                              categoryById.get(rule.CategoryId)?.color ??
                              rule.Category?.color,
                          }}
                        />
                        {rule.Category?.name}
                      </span>
                    </p>
                  </div>
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={(v) => toggleActive(rule, v)}
                    aria-label={t('settings.rules.activeFor', {
                      name: rule.name,
                    })}
                  />
                  <RowMenu
                    label={t('settings.rules.actionsFor', { name: rule.name })}
                    items={[
                      ...(index > 0 ? [{ label: t('settings.rules.moveUp'), onClick: () => move(index, -1) }] : []),
                      ...(index < rules.length - 1 ? [{ label: t('settings.rules.moveDown'), onClick: () => move(index, 1) }] : []),
                      { label: t('settings.rules.applyExisting'), onClick: () => setApplyRule(rule) },
                      { label: t('settings.rules.edit'), onClick: () => startEdit(rule) },
                      { label: t('settings.rules.delete'), danger: true, onClick: () => setDeleteId(rule.id) },
                    ]}
                    className="sm:hidden"
                  />
                  <div className="hidden sm:flex flex-shrink-0">
                    <IconButton
                      onClick={() => move(index, -1)}
                      title={t('settings.rules.moveUp')}
                      className={index === 0 ? 'invisible' : ''}
                    >
                      <ArrowIcon dir="up" />
                    </IconButton>
                    <IconButton
                      onClick={() => move(index, 1)}
                      title={t('settings.rules.moveDown')}
                      className={index === rules.length - 1 ? 'invisible' : ''}
                    >
                      <ArrowIcon dir="down" />
                    </IconButton>
                    <IconButton
                      onClick={() => setApplyRule(rule)}
                      title={t('settings.rules.applyExisting')}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {/* Run again over what is already saved. */}
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                        <path d="M8 16H3v5" />
                      </svg>
                    </IconButton>
                    <IconButton
                      onClick={() => startEdit(rule)}
                      title={t('settings.rules.edit')}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => setDeleteId(rule.id)}
                      title={t('settings.rules.delete')}
                      danger
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                </li>
              ),
            )}
          </ol>
        )}
        {status === 'ready' && rules.length > 1 && (
          <p className="px-5 py-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            {t('settings.rules.priorityHint')}
          </p>
        )}
      </SectionCard>
    </>
  );
}
