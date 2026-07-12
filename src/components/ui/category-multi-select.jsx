import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

function ChevronDown({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('transition-transform duration-150', open && 'rotate-180')}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function CategoryMultiSelect({
  categories = [],
  selectedIds = [],
  onChange,
  placeholder,
  className,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const placeholderText =
    placeholder ?? t('ui.categoryMultiSelect.placeholder');

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedSet = new Set(selectedIds);
  const toggle = (id) => {
    const next = selectedSet.has(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    onChange(next);
  };
  const selectAll = () => onChange(categories.map((c) => c.id));
  const clear = () => onChange([]);

  const triggerLabel =
    selectedIds.length === 0
      ? placeholderText
      : selectedIds.length === categories.length
        ? t('ui.categoryMultiSelect.allCategories', {
            count: categories.length,
          })
        : t('ui.categoryMultiSelect.selectedCount', {
            count: selectedIds.length,
            total: categories.length,
          });

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center justify-between gap-2 min-w-[220px] px-3 py-2 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors',
          open
            ? 'ring-2 ring-indigo-500'
            : 'hover:bg-gray-50 dark:hover:bg-slate-700',
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            <span>{t('ui.categoryMultiSelect.title')}</span>
            <div className="flex gap-2 normal-case tracking-normal">
              <button
                type="button"
                onClick={selectAll}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {t('ui.categoryMultiSelect.selectAll')}
              </button>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <button
                type="button"
                onClick={clear}
                className="text-gray-500 dark:text-gray-400 hover:underline font-medium"
              >
                {t('ui.categoryMultiSelect.clear')}
              </button>
            </div>
          </div>

          <ul className="max-h-72 overflow-y-auto py-1">
            {categories.length === 0 && (
              <li className="px-3 py-4 text-xs text-gray-400 text-center">
                {t('ui.categoryMultiSelect.empty')}
              </li>
            )}
            {categories.map((c) => {
              const checked = selectedSet.has(c.id);
              return (
                <li key={c.id}>
                  <label
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors',
                      'hover:bg-[var(--muted)]',
                      checked && 'bg-[var(--muted)]/50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.id)}
                      className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    {c.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: c.color }}
                      />
                    )}
                    <span className="text-sm text-gray-800 dark:text-gray-100 truncate flex-1">
                      {c.name}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
