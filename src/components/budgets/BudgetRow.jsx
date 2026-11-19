import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useCurrency } from '../../context/CurrencyContext';
import {
  budgetColor,
  daysLeft,
  meterColor,
  periodRange,
} from '../../utils/budgets';
import { cn } from '../../lib/utils';

/** Scope line: "Hogar, Comida · #viaje", or "Todo lo demás" for the catch-all. */
export function ScopeLine({ budget, className }) {
  const { t } = useTranslation();
  const parts = budget.isCatchAll
    ? [t('budgets.catchAllScope')]
    : [
        ...budget.categories.map((c) => c.name),
        ...budget.tags.map((tag) => `#${tag.name}`),
      ];
  // A budget named after its only category would just repeat its title.
  if (
    parts.length === 1 &&
    parts[0].toLowerCase() === budget.name.toLowerCase()
  )
    return null;
  return (
    <p
      className={cn(
        'truncate text-xs text-[var(--muted-foreground)]',
        className,
      )}
    >
      {parts.join(' · ')}
    </p>
  );
}

/**
 * One budget in its running period: spent of available, a meter and what is
 * left. The whole row opens the detail; `actions` sits beside the link.
 */
export default function BudgetRow({ budget, actions }) {
  const { t } = useTranslation();
  const { money } = useCurrency();
  const color = budgetColor(budget);
  const over = budget.remaining < 0;
  const pct = Math.round(budget.percent);
  return (
    <div className="flex items-start gap-1 pr-2">
      <Link
        to={`/transactions/budget/${budget.id}`}
        className="flex-1 min-w-0 block py-3 pl-5 pr-3 rounded-md cursor-pointer hover:bg-[var(--muted)] active:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
      >
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="size-2.5 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            <span className="truncate font-medium text-[var(--foreground)]">
              {budget.name}
            </span>
          </span>
          <span className="flex-shrink-0 tabular-nums text-[var(--muted-foreground)]">
            {money(budget.spent)} / {money(budget.available)}
          </span>
        </div>
        <ScopeLine budget={budget} className="mt-0.5 pl-[18px]" />
        <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(Math.max(pct, 0), 100)}%`,
              background: meterColor(budget, color),
            }}
          />
        </div>
        <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs tabular-nums">
          <span
            className={
              over
                ? 'font-semibold text-rose-700 dark:text-rose-400'
                : 'text-[var(--muted-foreground)]'
            }
          >
            {over
              ? t('budgets.over', { amount: money(-budget.remaining) })
              : t('budgets.left', { amount: money(budget.remaining) })}
          </span>
          <span className="text-[var(--muted-foreground)]">
            {periodRange(budget.period)} ·{' '}
            {t('budgets.daysLeft', { count: daysLeft(budget.period) })}
          </span>
        </p>
        {budget.rollover && budget.carry !== 0 && (
          <p className="mt-0.5 text-xs tabular-nums text-[var(--muted-foreground)]">
            {budget.carry > 0
              ? t('budgets.carryIn', { amount: money(budget.carry) })
              : t('budgets.carryOut', { amount: money(-budget.carry) })}
          </p>
        )}
      </Link>
      {actions && <div className="pt-2.5 flex-shrink-0">{actions}</div>}
    </div>
  );
}
