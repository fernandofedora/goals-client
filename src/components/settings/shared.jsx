import { useTranslation } from 'react-i18next';
import Input from '../ui/input';
import Select from '../ui/select';
import { cn } from '../../lib/utils';
import { useCurrency } from '../../context/CurrencyContext';

// ── Field wrapper ─────────────────────────────────────────────────────────────
export function Field({ label, children }) {
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
export function IconButton({ onClick, title, danger, children }) {
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
          : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700',
      )}
    >
      {children}
    </button>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
export const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
  </svg>
);

export const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M15 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2" />
  </svg>
);

// ── Section card shell ────────────────────────────────────────────────────────
export function SectionCard({
  title,
  subtitle,
  action,
  overflowVisible,
  children,
}) {
  return (
    <section
      className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm',
        !overflowVisible && 'overflow-hidden',
      )}
    >
      <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <span className="text-3xl opacity-30">📭</span>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

// ── Category list row (must be defined OUTSIDE the page to avoid focus loss) ───
export function CatRow({
  cat,
  editingCatId,
  editCatForm,
  setEditCatForm,
  saveEditCat,
  cancelEditCat,
  startEditCat,
  setDeleteCatId,
}) {
  const { t } = useTranslation();
  const { symbol: cs } = useCurrency();
  return (
    <li className="px-5 py-3 flex items-center justify-between gap-3">
      {editingCatId === cat.id ? (
        <div className="flex-1 flex flex-wrap items-end gap-3">
          <Field label={t('settings.categories.name')}>
            <Input
              className="w-44"
              value={editCatForm.name}
              onChange={(e) =>
                setEditCatForm((v) => ({ ...v, name: e.target.value }))
              }
            />
          </Field>
          <Field label={t('settings.categories.type')}>
            <Select
              value={editCatForm.type}
              onChange={(e) =>
                setEditCatForm((v) => ({ ...v, type: e.target.value }))
              }
            >
              <option value="expense">
                {t('settings.categories.expense')}
              </option>
              <option value="income">{t('settings.categories.income')}</option>
            </Select>
          </Field>
          <Field label={t('settings.categories.color')}>
            <input
              className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]"
              type="color"
              value={editCatForm.color}
              onChange={(e) =>
                setEditCatForm((v) => ({ ...v, color: e.target.value }))
              }
            />
          </Field>
          <Field label={t('settings.categories.monthlyBudget')}>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={t('settings.categories.noLimit')}
              className="w-32"
              value={editCatForm.monthlyBudget}
              onChange={(e) =>
                setEditCatForm((v) => ({ ...v, monthlyBudget: e.target.value }))
              }
            />
          </Field>
          <div className="flex gap-1.5 pb-0.5">
            <button
              type="button"
              onClick={() => saveEditCat(cat.id)}
              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              onClick={cancelEditCat}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: cat.color }}
            />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {cat.name}
            </span>
            {cat.monthlyBudget != null && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                {cs}
                {Number(cat.monthlyBudget).toFixed(0)}
                {t('settings.categories.perMonth')}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <IconButton
              onClick={() => startEditCat(cat)}
              title={t('settings.categories.editCategory')}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={() => setDeleteCatId(cat.id)}
              title={t('settings.categories.deleteCategory')}
              danger
            >
              <TrashIcon />
            </IconButton>
          </div>
        </>
      )}
    </li>
  );
}
