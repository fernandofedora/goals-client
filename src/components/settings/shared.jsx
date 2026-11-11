import { useTranslation } from "react-i18next";
import Input from "../ui/input";
import Select from "../ui/select";
import IconButton from "../ui/icon-button";
import { cn } from "../../lib/utils";
import { useCurrency } from "../../context/CurrencyContext";

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
export { IconButton };

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
        "bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm",
        !overflowVisible && "overflow-hidden",
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
export const PlusIcon = () => (
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
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export function CatRow({
  cat,
  isChild = false,
  hasChildren = false,
  parentChoices = [],
  onAddSub,
  editingCatId,
  editCatForm,
  setEditCatForm,
  saveEditCat,
  cancelEditCat,
  startEditCat,
  setDeleteCatId,
}) {
  const { t } = useTranslation();
  const { symbol: cs, money, privacyMode } = useCurrency();
  // A subcategory takes its parent's type, so the type picker only shows for
  // top-level categories. A parent with children cannot be moved under another.
  const inheritsType = Boolean(editCatForm.parentId);
  return (
    <li
      className={cn(
        "pr-5 py-3 flex items-center justify-between gap-3",
        isChild ? "pl-10 sm:pl-12" : "pl-5",
      )}
    >
      {editingCatId === cat.id ? (
        <div className="flex-1 flex flex-wrap items-end gap-3">
          <Field label={t("settings.categories.name")}>
            <Input
              className="w-44"
              value={editCatForm.name}
              onChange={(e) =>
                setEditCatForm((v) => ({ ...v, name: e.target.value }))
              }
            />
          </Field>
          {!hasChildren && (
            <Field label={t("settings.categories.parent")}>
              <Select
                value={editCatForm.parentId}
                onChange={(e) =>
                  setEditCatForm((v) => ({ ...v, parentId: e.target.value }))
                }
              >
                <option value="">{t("settings.categories.noParent")}</option>
                {parentChoices.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {!inheritsType && (
            <Field label={t("settings.categories.type")}>
              <Select
                value={editCatForm.type}
                onChange={(e) =>
                  setEditCatForm((v) => ({ ...v, type: e.target.value }))
                }
              >
                <option value="expense">
                  {t("settings.categories.expense")}
                </option>
                <option value="income">
                  {t("settings.categories.income")}
                </option>
              </Select>
            </Field>
          )}
          <Field label={t("settings.categories.color")}>
            <input
              aria-label={t("settings.categories.color")}
              className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent [appearance:auto]"
              type="color"
              value={editCatForm.color}
              onChange={(e) =>
                setEditCatForm((v) => ({ ...v, color: e.target.value }))
              }
            />
          </Field>
          <Field label={t("settings.categories.monthlyBudget")}>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={t("settings.categories.noLimit")}
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
              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium cursor-pointer"
            >
              {t("common.save")}
            </button>
            <button
              type="button"
              onClick={cancelEditCat}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* On phones the badge drops under the name so three actions fit. */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              className={cn(
                "rounded-full flex-shrink-0",
                isChild ? "w-2 h-2" : "w-3 h-3",
              )}
              style={{ background: cat.color }}
            />
            <div className="min-w-0 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span
                className={cn(
                  "text-sm break-words",
                  isChild
                    ? "text-gray-700 dark:text-gray-200"
                    : "font-medium text-gray-800 dark:text-gray-100",
                )}
              >
                {cat.name}
              </span>
              {cat.monthlyBudget != null && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                  {privacyMode
                    ? money(cat.monthlyBudget)
                    : `${cs}${Number(cat.monthlyBudget).toFixed(0)}`}
                  {t("settings.categories.perMonth")}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {onAddSub && (
              <IconButton
                onClick={onAddSub}
                title={t("settings.categories.addSub", { name: cat.name })}
              >
                <PlusIcon />
              </IconButton>
            )}
            <IconButton
              onClick={() => startEditCat(cat)}
              title={t("settings.categories.editCategory")}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={() => setDeleteCatId(cat.id)}
              title={t("settings.categories.deleteCategory")}
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
