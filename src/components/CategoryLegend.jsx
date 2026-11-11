import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { cn } from '../lib/utils';

const pctOf = (amount, total) =>
  total > 0 ? ((amount / total) * 100).toFixed(1) : 0;

const Chevron = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn(
      'flex-shrink-0 transition-transform motion-reduce:transition-none',
      open && 'rotate-90',
    )}
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

function Amounts({ amount, total, strong }) {
  const { money } = useCurrency();
  return (
    <div className="flex items-center gap-3 text-right">
      <span className="text-gray-500 dark:text-gray-400 text-xs">
        {pctOf(amount, total)}%
      </span>
      <span
        className={cn(
          'tabular-nums',
          strong
            ? 'font-semibold text-gray-800 dark:text-gray-100'
            : 'text-gray-700 dark:text-gray-200',
        )}
      >
        {money(amount)}
      </span>
    </div>
  );
}

/**
 * Category totals under the donut. A category with subcategories opens to
 * show how its total splits, plus whatever was booked on the parent itself.
 */
export default function CategoryLegend({ items, total }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => new Set());
  const toggle = (key) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800">
      {items.map((c) => {
        const key = c.id ?? `none-${c.name}`;
        const children = [...(c.children || [])].sort(
          (a, b) => b.amount - a.amount,
        );
        const isOpen = open.has(key);
        const direct =
          c.amount - children.reduce((s, child) => s + child.amount, 0);
        const label = (
          <>
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ background: c.color }}
            />
            <span className="text-gray-700 dark:text-gray-300 truncate max-w-[160px]">
              {c.name}
            </span>
          </>
        );
        return (
          <li key={key} className="text-sm">
            <div className="flex items-center justify-between gap-3 py-1.5">
              {children.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(key)}
                  className="flex items-center gap-2 min-h-11 sm:min-h-0 -ml-1 pl-1 pr-2 rounded-md text-left cursor-pointer text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700"
                >
                  <Chevron open={isOpen} />
                  {label}
                </button>
              ) : (
                <div className="flex items-center gap-2 pl-5">{label}</div>
              )}
              <Amounts amount={c.amount} total={total} strong />
            </div>
            {isOpen && (
              <ul className="pl-9 pb-1.5 space-y-1 text-xs">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-gray-600 dark:text-gray-300 truncate">
                      {child.name}
                    </span>
                    <Amounts amount={child.amount} total={total} />
                  </li>
                ))}
                {direct > 0.005 && (
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400 italic truncate">
                      {t('dashboard.noSubcategory')}
                    </span>
                    <Amounts amount={direct} total={total} />
                  </li>
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
